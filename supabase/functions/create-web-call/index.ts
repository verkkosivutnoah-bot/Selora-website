// Supabase Edge Function: create-web-call
// Called from dashboard.html when the user clicks "Aloita testipuhelu".
// Flow:
//   1. Receives { agent_id } from the authenticated user
//   2. Validates the user owns an agent with that ID
//   3. Calls Retell AI to create a web call and get an access token
//   4. Increments demo_calls_used in the retell_agents table
//   5. Returns { access_token } to the frontend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RETELL_API_KEY   = Deno.env.get("RETELL_API_KEY")!;
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON    = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    // Call Auth API directly — avoids local JWT verification, works with ES256
    const authResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_ANON },
    });
    if (!authResp.ok) return json({ error: "Unauthorized" }, 401);
    const user = await authResp.json();
    if (!user?.id) return json({ error: "Unauthorized" }, 401);

    // Service role client for DB reads/writes (bypasses RLS)
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // ── Payload ───────────────────────────────────────────────────────────────
    const { agent_id } = await req.json();
    if (!agent_id) return json({ error: "agent_id required" }, 400);

    // ── Verify ownership & check demo limit ───────────────────────────────────
    const { data: agentRow, error: agentErr } = await sb
      .from("retell_agents")
      .select("*")
      .eq("user_id", user.id)
      .eq("retell_agent_id", agent_id)
      .maybeSingle();

    if (agentErr || !agentRow) {
      console.error("Agent lookup failed — user_id:", user.id, "agent_id:", agent_id, "err:", agentErr);
      return json({ error: "Agent not found", detail: agentErr?.message }, 404);
    }

    // Check if user has an active plan (no limit) or is on demo
    const { data: profile } = await sb
      .from("profiles")
      .select("has_active_plan")
      .eq("id", user.id)
      .maybeSingle();

    const isDemo = !profile?.has_active_plan;
    if (isDemo) {
      const used  = agentRow.demo_calls_used || 0;
      const limit = agentRow.demo_calls_limit || 5;
      if (used >= limit) {
        return json({ error: "Demo call limit reached" }, 429);
      }
    }

    // ── Create web call in Retell ─────────────────────────────────────────────
    console.log("Creating web call for retell_agent_id:", agentRow.retell_agent_id);

    const retellResp = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${RETELL_API_KEY}`,
      },
      body: JSON.stringify({ agent_id: agentRow.retell_agent_id }),
    });

    if (!retellResp.ok) {
      const errText = await retellResp.text();
      console.error("Retell create-web-call error:", retellResp.status, errText);
      throw new Error(`Retell error ${retellResp.status}: ${errText}`);
    }

    const callData = await retellResp.json() as Record<string, unknown>;
    console.log("Retell response keys:", Object.keys(callData));

    const accessToken = callData.access_token as string;
    if (!accessToken) throw new Error(`No access_token in Retell response: ${JSON.stringify(callData)}`);

    // ── Increment demo_calls_used ─────────────────────────────────────────────
    if (isDemo) {
      await sb
        .from("retell_agents")
        .update({ demo_calls_used: (agentRow.demo_calls_used || 0) + 1 })
        .eq("id", agentRow.id);
    }

    // ── Log the call start ────────────────────────────────────────────────────
    await sb.from("call_logs").insert({
      user_id:    user.id,
      agent_id:   agentRow.id,
      call_type:  "web",
      called_at:  new Date().toISOString(),
      outcome:    "in_progress",
    });

    return json({ access_token: accessToken });

  } catch (err) {
    console.error("create-web-call error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
