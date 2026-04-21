// Supabase Edge Function: subscribe-newsletter
// Public endpoint — saves an email to newsletter_subscribers and sends a welcome email.
// Called from blogi.html when someone submits the newsletter form.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY    = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL          = Deno.env.get("SITE_URL") ?? "https://selora.fi";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return json({ error: "Invalid email" }, 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // Upsert subscriber (reactivate if previously unsubscribed)
    const { data, error } = await sb
      .from("newsletter_subscribers")
      .upsert({
        email:           cleanEmail,
        status:          "active",
        subscribed_at:   new Date().toISOString(),
        unsubscribed_at: null,
        source:          "blogi",
      }, { onConflict: "email" })
      .select("unsub_token")
      .maybeSingle();

    if (error) {
      console.error("DB upsert error:", error);
      return json({ error: "Tallennus epäonnistui" }, 500);
    }

    // Send welcome email via Resend
    const unsubToken = data?.unsub_token ?? "";
    const unsubLink  = `${SITE_URL}/unsubscribe.html?t=${unsubToken}`;

    await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    "Selora <noreply@selora.fi>",
        to:      [cleanEmail],
        subject: "Tervetuloa Seloran uutiskirjeeseen 👋",
        html: welcomeHtml(cleanEmail, unsubLink),
      }),
    }).catch(e => console.error("Welcome email error:", e));

    return json({ success: true });

  } catch (err) {
    console.error("subscribe-newsletter error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function welcomeHtml(email: string, unsubLink: string): string {
  return `
<!DOCTYPE html>
<html lang="fi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);max-width:100%;">
    <tr>
      <td style="background:#060c18;padding:24px 32px;">
        <div style="display:inline-flex;align-items:center;gap:8px;">
          <div style="width:28px;height:28px;background:linear-gradient(135deg,#1D4ED8,#3b82f6);border-radius:7px;"></div>
          <span style="color:#fff;font-size:16px;font-weight:600;letter-spacing:0.05em;">SELORA</span>
        </div>
      </td>
    </tr>
    <tr><td style="padding:36px 32px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:500;color:#0f172a;letter-spacing:-0.02em;">Kiitos tilauksesta!</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
        Olet nyt tilannut Seloran uutiskirjeen. Saat sähköpostiisi ilmoituksen aina kun julkaisemme uuden artikkelin tekoälyn, automaation ja suomalaisen yrittäjyyden teemoista.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7;">
        Ei spämmejä — vain käytännöllistä sisältöä kerran kuussa.
      </p>
      <div style="margin:24px 0;">
        <a href="${SITE_URL}/blogi.html" style="display:inline-block;background:#1D4ED8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9px;font-weight:600;font-size:14px;">
          Selaa blogia →
        </a>
      </div>
    </td></tr>
    <tr>
      <td style="padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
          Selora · ${escHtml(email)}<br>
          <a href="${unsubLink}" style="color:#94a3b8;text-decoration:underline;">Peruuta tilaus</a>
        </p>
      </td>
    </tr>
  </table>
  </td></tr>
</table>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
