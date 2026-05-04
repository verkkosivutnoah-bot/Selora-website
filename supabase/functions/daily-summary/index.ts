// Supabase Edge Function: daily-summary
//
// Runs once a day (typically 09:00 Europe/Helsinki) — invoked by pg_cron
// or an external scheduler — and sends each opted-in user a push
// notification summarising yesterday's activity.
//
// Body (optional, for ad-hoc triggers): { date?: "YYYY-MM-DD" }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ProfileRow {
  id: string;
  expo_push_token: string | null;
  notification_prefs: Record<string, unknown> | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Compute yesterday's window in Europe/Helsinki.
  const { startISO, endISO, label } = yesterdayWindow();

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  // Fetch every profile that has a push token AND has the daily summary
  // enabled (or no preference saved → default true).
  const { data: profiles, error: profilesErr } = await sb
    .from("profiles")
    .select("id, expo_push_token, notification_prefs")
    .not("expo_push_token", "is", null);

  if (profilesErr) {
    console.error("[daily-summary] profile fetch failed", profilesErr);
    return json({ error: "Profile fetch failed" }, 500);
  }

  let processed = 0;
  let sent      = 0;

  for (const profile of (profiles ?? []) as ProfileRow[]) {
    processed++;
    const prefs = (profile.notification_prefs ?? {}) as Record<string, unknown>;
    if (prefs.daily_summary === false) continue;

    // Tally yesterday's calls
    const { data: callRows, error: callsErr } = await sb
      .from("call_logs")
      .select("outcome")
      .eq("user_id", profile.id)
      .gte("called_at", startISO)
      .lt("called_at", endISO);

    if (callsErr) {
      console.warn("[daily-summary] call_logs query failed", profile.id, callsErr);
      continue;
    }

    const callCount   = callRows?.length ?? 0;
    const missedCount =
      callRows?.filter((r) => r.outcome === "missed").length ?? 0;

    // Tally yesterday's appointments
    const { count: apptCount } = await sb
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("created_at", startISO)
      .lt("created_at", endISO);

    if (callCount === 0 && (apptCount ?? 0) === 0) continue;

    const body =
      `${callCount} puhelua` +
      (missedCount > 0 ? ` (${missedCount} vastaamatonta)` : "") +
      ` · ${apptCount ?? 0} varausta`;

    try {
      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/send-push-notification`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE}`,
            "Content-Type":  "application/json",
          },
          body: JSON.stringify({
            user_id: profile.id,
            type:    "daily_summary",
            title:   `Yhteenveto ${label}`,
            body,
            data: {
              call_count: callCount,
              missed_count: missedCount,
              appointment_count: apptCount ?? 0,
              date: label,
            },
          }),
        }
      );
      if (resp.ok) sent++;
    } catch (err) {
      console.warn("[daily-summary] send failed", profile.id, err);
    }
  }

  return json({ ok: true, processed, sent, date: label }, 200);
});

function yesterdayWindow(): { startISO: string; endISO: string; label: string } {
  // Europe/Helsinki — 24h window for "yesterday".
  // Helsinki is UTC+2 (winter) / UTC+3 (summer). For correctness without
  // pulling a tz library, use Intl to format Helsinki's "today" date,
  // then subtract one day.
  const now = new Date();
  const helsinkiToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // YYYY-MM-DD

  const [y, m, d] = helsinkiToday.split("-").map(Number);
  const today  = new Date(Date.UTC(y!, (m!) - 1, d!));
  const yest   = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  // Convert "Helsinki midnight" to a UTC instant. Helsinki offset varies
  // (+2 or +3) depending on DST. Use Intl to compute the offset for the
  // start of the yesterday day.
  const offsetMin = helsinkiOffsetMinutes(yest);
  const startISO  = new Date(yest.getTime() - offsetMin * 60 * 1000).toISOString();
  const endISO    = new Date(today.getTime() - offsetMin * 60 * 1000).toISOString();

  const label = `${String(yest.getUTCDate()).padStart(2, "0")}.${String(
    yest.getUTCMonth() + 1
  ).padStart(2, "0")}.`;

  return { startISO, endISO, label };
}

function helsinkiOffsetMinutes(d: Date): number {
  // Format the same instant in Helsinki and UTC, diff the wall-clock.
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

  const parts = (arr: Intl.DateTimeFormatPart[]) => {
    const get = (t: string) => Number(arr.find((p) => p.type === t)?.value ?? 0);
    return Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute")
    );
  };

  const helsinki = parts(fmt("Europe/Helsinki"));
  const utc      = parts(fmt("UTC"));
  return Math.round((helsinki - utc) / 60000);
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
