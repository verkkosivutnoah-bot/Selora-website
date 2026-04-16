// Supabase Edge Function: stripe-webhook
// Receives Stripe webhook events (checkout.session.completed).
// Flow:
//   1. Verifies Stripe webhook signature (STRIPE_WEBHOOK_SECRET)
//   2. On checkout.session.completed → calls upgrade_user_plan() in DB
//   3. Sends confirmation email via Resend with phone number setup instructions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const STRIPE_SECRET_KEY     = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY        = Deno.env.get("RESEND_API_KEY")!;

serve(async (req) => {
  const body      = await req.text();
  const sigHeader = req.headers.get("stripe-signature") ?? "";

  // ── Verify Stripe signature ────────────────────────────────────────────────
  const verified = await verifyStripeSignature(body, sigHeader, STRIPE_WEBHOOK_SECRET);
  if (!verified) {
    return new Response("Webhook signature invalid", { status: 401 });
  }

  const event = JSON.parse(body);
  console.log("Stripe event:", event.type);

  if (event.type === "checkout.session.completed") {
    const session  = event.data.object;
    const userId   = session.metadata?.user_id ?? session.client_reference_id;
    const plan     = session.metadata?.plan ?? "aloitus";
    const billing  = session.metadata?.billing ?? "monthly";
    const email    = session.customer_email ?? session.customer_details?.email ?? "";

    if (!userId) {
      console.error("No user_id in session metadata");
      return new Response("Missing user_id", { status: 400 });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // ── Upgrade user plan in DB ────────────────────────────────────────────
    const { error: upgradeErr } = await sb.rpc("upgrade_user_plan", {
      target_user_id: userId,
      new_plan:       plan,
    });
    if (upgradeErr) {
      console.error("upgrade_user_plan error:", upgradeErr);
    }

    // ── Fetch user name for email ──────────────────────────────────────────
    const { data: profile } = await sb
      .from("profiles")
      .select("full_name, company_name")
      .eq("id", userId)
      .maybeSingle();

    const name        = profile?.full_name ?? "Asiakas";
    const company     = profile?.company_name ?? "";
    const planLabel   = planFiName(plan);
    const billingLabel = billing === "yearly" ? "vuosittainen" : "kuukausittainen";

    // ── Send confirmation email via Resend ─────────────────────────────────
    if (email) {
      await sendConfirmationEmail({ email, name, company, planLabel, billingLabel });
    }
  }

  return new Response("ok", { status: 200 });
});

// ── Stripe signature verification (HMAC-SHA256) ────────────────────────────
async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): Promise<boolean> {
  try {
    const parts     = Object.fromEntries(header.split(",").map(p => p.split("=")));
    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
    const computed = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return computed === signature;
  } catch {
    return false;
  }
}

// ── Send confirmation email ────────────────────────────────────────────────
async function sendConfirmationEmail(opts: {
  email: string;
  name: string;
  company: string;
  planLabel: string;
  billingLabel: string;
}) {
  const { email, name, company, planLabel, billingLabel } = opts;

  const html = `
<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tervetuloa Seloraan!</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#060c18;padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;background:linear-gradient(135deg,#1D4ED8,#3b82f6);border-radius:9px;"></div>
                <span style="color:#ffffff;font-size:20px;font-weight:600;letter-spacing:0.05em;">SELORA</span>
              </div>
              <p style="color:rgba(255,255,255,0.5);margin:12px 0 0;font-size:14px;">Tekoälyvastaanottopalvelu</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:300;color:#0f172a;letter-spacing:-0.02em;">
                Tervetuloa, ${name}! 🎉
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#64748b;">
                Tilauksesi on vahvistettu. Alla ovat seuraavat askeleet, jotta tekoälyvastaanottopalvelusi on käytössä mahdollisimman nopeasti.
              </p>

              <!-- Plan box -->
              <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;margin-bottom:32px;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#1D4ED8;">TILAUS AKTIVOITU</p>
                <p style="margin:0;font-size:18px;font-weight:600;color:#0f172a;">${planLabel}${company ? ` · ${company}` : ""}</p>
                <p style="margin:4px 0 0;font-size:14px;color:#64748b;">Laskutus: ${billingLabel}</p>
              </div>

              <!-- Steps -->
              <h2 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0f172a;">Seuraavat askeleet</h2>

              <div style="border-left:3px solid #1D4ED8;padding-left:20px;margin-bottom:20px;">
                <p style="margin:0 0 4px;font-weight:600;color:#0f172a;">1. Kirjaudu sisään kojelautaasi</p>
                <p style="margin:0;font-size:14px;color:#64748b;">Agenttiasi on jo luotu onboarding-vaiheen tietojen pohjalta. Voit muokata sen asetuksia kojelaudasta.</p>
              </div>

              <div style="border-left:3px solid #1D4ED8;padding-left:20px;margin-bottom:20px;">
                <p style="margin:0 0 4px;font-weight:600;color:#0f172a;">2. Hanki puhelinnumero (Twilio)</p>
                <p style="margin:0;font-size:14px;color:#64748b;">Tekoälyvastaanottopalvelu tarvitsee oman puhelinnumeron. Alla ohjeet numeron hankkimiseen:</p>
                <ol style="margin:12px 0 0;padding-left:20px;font-size:14px;color:#64748b;line-height:1.8;">
                  <li>Mene osoitteeseen <a href="https://www.twilio.com" style="color:#1D4ED8;">twilio.com</a> ja luo ilmainen tili.</li>
                  <li>Lisää luottokorttisi ja osta suomalainen puhelinnumero (+358).</li>
                  <li>Siirry Twilio Console → Phone Numbers → Manage → Active Numbers.</li>
                  <li>Klikkaa ostettua numeroa ja aseta <strong>A CALL COMES IN</strong> -kohtaan: <em>Webhook</em> ja URL: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px;">https://api.retellai.com/twilio-voice-webhook/AgentId</code> (AgentId löytyy kojelaudastasi).</li>
                  <li>Tallenna muutokset.</li>
                </ol>
              </div>

              <div style="border-left:3px solid #1D4ED8;padding-left:20px;margin-bottom:20px;">
                <p style="margin:0 0 4px;font-weight:600;color:#0f172a;">3. Testaa puhelu</p>
                <p style="margin:0;font-size:14px;color:#64748b;">Soita uuteen numeroon omalta puhelimeltasi. Agenttisi vastaa ja voit kuulla miten se toimii. Voit muokata agentin asetuksia ja tervehdystä kojelaudasta milloin tahansa.</p>
              </div>

              <div style="border-left:3px solid #10b981;padding-left:20px;margin-bottom:32px;">
                <p style="margin:0 0 4px;font-weight:600;color:#0f172a;">4. Valmis! 🚀</p>
                <p style="margin:0;font-size:14px;color:#64748b;">Tekoälyvastaanottopalvelusi on nyt toiminnassa 24/7. Se vastaa puheluihin, ottaa viestejä ja ohjaa asiakkaasi oikeaan paikkaan — vaikket itse ole paikalla.</p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:32px;">
                <a href="https://selora.fi/dashboard.html" style="display:inline-block;background:#1D4ED8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">
                  Siirry kojelautaan →
                </a>
              </div>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

              <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
                Tarvitsetko apua? Ota yhteyttä: <a href="mailto:noah@selora.fi" style="color:#1D4ED8;text-decoration:none;">noah@selora.fi</a><br>
                Selora · Tekoälyvastaanottopalvelu suomalaisille yrityksille
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const resp = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:    "Selora <noreply@selora.fi>",
      to:      [email],
      subject: "Tervetuloa Seloraan — seuraavat askeleet 🎉",
      html,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("Resend error:", err);
  } else {
    console.log("Confirmation email sent to", email);
  }
}

function planFiName(plan: string): string {
  const map: Record<string, string> = {
    aloitus:  "Aloituspaketti",
    kasvu:    "Kasvupaketti",
    yritys:   "Yrityspaketti",
  };
  return map[plan] ?? plan;
}
