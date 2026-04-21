// Supabase Edge Function: admin-delete-client
// Called from admin.html to permanently delete a client and all their data.
// Only callable by the admin account (selora.tuki@gmail.com).
// Flow:
//   1. Verify caller is admin
//   2. Read user_id from request body
//   3. Delete auth user via service role (cascades to profile + all FK tables)
//   4. Return { success: true }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON    = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAIL      = "selora.tuki@gmail.com";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // ── Verify admin ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const authResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_ANON },
    });
    if (!authResp.ok) return json({ error: "Unauthorized" }, 401);
    const adminUser = await authResp.json();
    if (adminUser?.email !== ADMIN_EMAIL) return json({ error: "Forbidden" }, 403);

    // ── Parse payload ─────────────────────────────────────────────────────────
    const { user_id } = await req.json();
    if (!user_id) return json({ error: "user_id required" }, 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // ── Delete auth user (cascades to profiles + all FK tables via DB rules) ──
    const { error } = await sb.auth.admin.deleteUser(user_id);
    if (error) throw new Error("Auth delete error: " + error.message);

    console.log("Deleted user:", user_id);
    return json({ success: true });

  } catch (err) {
    console.error("admin-delete-client error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
