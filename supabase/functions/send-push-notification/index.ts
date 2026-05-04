// Supabase Edge Function: send-push-notification
//
// Internal helper invoked by other server-side flows (retell-webhook,
// daily-summary, etc.) to deliver an Expo push notification to a single
// user — honouring their per-category opt-out preferences.
//
// Body:
//   {
//     user_id: string,
//     type:    "new_call" | "new_appointment" | "daily_summary",
//     title:   string,
//     body:    string,
//     data?:   Record<string, unknown>
//   }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PushType = "new_call" | "new_appointment" | "daily_summary";

interface PushPayload {
  user_id: string;
  type:    PushType;
  title:   string;
  body:    string;
  data?:   Record<string, unknown>;
}

// Maps the canonical type string to the JSONB key used in
// `profiles.notification_prefs`. Mobile + web both use the same
// keys: { new_calls, bookings, daily_summary }.
const PREF_KEY: Record<PushType, string> = {
  new_call:        "new_calls",
  new_appointment: "bookings",
  daily_summary:   "daily_summary",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: PushPayload;
  try {
    payload = (await req.json()) as PushPayload;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { user_id, type, title, body, data } = payload;
  if (!user_id || !type || !title || !body) {
    return json({ error: "Missing required fields" }, 400);
  }
  if (!(type in PREF_KEY)) {
    return json({ error: `Unknown type: ${type}` }, 400);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  // ── Look up token + prefs ───────────────────────────────────────────────
  const { data: profile, error: profileErr } = await sb
    .from("profiles")
    .select("expo_push_token, notification_prefs")
    .eq("id", user_id)
    .maybeSingle();

  if (profileErr) {
    console.error("[push] profile lookup failed", profileErr);
    return json({ error: "Profile lookup failed" }, 500);
  }

  if (!profile?.expo_push_token) {
    return json({ skipped: "no_token" }, 200);
  }

  const prefKey   = PREF_KEY[type];
  const prefs     = (profile.notification_prefs ?? {}) as Record<string, unknown>;
  const enabled   = prefs[prefKey];
  // Default to enabled if pref is missing/null (matches DEFAULT_NOTIFICATION_PREFS)
  if (enabled === false) {
    return json({ skipped: "category_disabled" }, 200);
  }

  // ── Send to Expo push gateway ──────────────────────────────────────────
  const message = {
    to:    profile.expo_push_token,
    title,
    body,
    sound: "default",
    data:  { type, ...(data ?? {}) },
    priority: "high",
    channelId: "default",
  };

  try {
    const resp = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept":           "application/json",
        "Accept-Encoding":  "gzip, deflate",
        "Content-Type":     "application/json",
      },
      body: JSON.stringify([message]),
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error("[push] expo error", result);
      return json({ error: "Expo push failed", details: result }, 502);
    }

    // Inspect ticket — Expo can return DeviceNotRegistered which means
    // we should clear the stored token.
    const ticket = Array.isArray(result?.data) ? result.data[0] : null;
    if (ticket?.status === "error") {
      const errType = ticket?.details?.error;
      if (errType === "DeviceNotRegistered") {
        await sb
          .from("profiles")
          .update({ expo_push_token: null })
          .eq("id", user_id);
        return json({ skipped: "device_not_registered" }, 200);
      }
      console.warn("[push] ticket error", ticket);
    }

    return json({ ok: true, ticket }, 200);
  } catch (err) {
    console.error("[push] fetch failed", err);
    return json({ error: "Network error" }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
