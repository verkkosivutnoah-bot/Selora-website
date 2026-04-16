// Supabase Edge Function: create-checkout-session
// Called from checkout.html when user clicks a plan button.
// Flow:
//   1. Authenticates user via Supabase Auth API (ES256-safe)
//   2. Receives { price_id, plan, billing } from frontend
//   3. Creates a Stripe Checkout session (subscription mode)
//   4. Returns { url } → frontend redirects to Stripe

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON     = Deno.env.get("SUPABASE_ANON_KEY")!;

const SITE_URL = "https://selora.fi";

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

    const authResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_ANON },
    });
    if (!authResp.ok) return json({ error: "Unauthorized" }, 401);
    const user = await authResp.json();
    if (!user?.id) return json({ error: "Unauthorized" }, 401);

    // ── Payload ───────────────────────────────────────────────────────────────
    const { price_id, plan, billing } = await req.json();
    if (!price_id) return json({ error: "price_id required" }, 400);

    // ── Create Stripe Checkout session ────────────────────────────────────────
    const params = new URLSearchParams({
      mode:                          "subscription",
      "line_items[0][price]":        price_id,
      "line_items[0][quantity]":     "1",
      client_reference_id:           user.id,
      customer_email:                user.email ?? "",
      success_url:                   `${SITE_URL}/dashboard.html?payment=success`,
      cancel_url:                    `${SITE_URL}/checkout.html`,
      "metadata[plan]":              plan ?? "",
      "metadata[billing]":           billing ?? "",
      "metadata[user_id]":           user.id,
      "subscription_data[metadata][user_id]": user.id,
      "subscription_data[metadata][plan]":    plan ?? "",
    });

    const stripeResp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!stripeResp.ok) {
      const err = await stripeResp.text();
      throw new Error(`Stripe error: ${err}`);
    }

    const session = await stripeResp.json();
    return json({ url: session.url });

  } catch (err) {
    console.error("create-checkout-session error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
