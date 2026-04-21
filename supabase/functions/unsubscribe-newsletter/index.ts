// Supabase Edge Function: unsubscribe-newsletter
// Public endpoint — one-click unsubscribe via token. Called from unsubscribe.html.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return json({ error: "Invalid token" }, 400);
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    const { data, error } = await sb
      .from("newsletter_subscribers")
      .update({
        status:          "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("unsub_token", token)
      .select("email")
      .maybeSingle();

    if (error) {
      console.error("Unsub error:", error);
      return json({ error: "Virhe" }, 500);
    }

    if (!data) return json({ error: "Token not found" }, 404);

    return json({ success: true, email: data.email });

  } catch (err) {
    console.error("unsubscribe-newsletter error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
