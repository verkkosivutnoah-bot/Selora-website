// Supabase Edge Function: send-newsletter
// Admin-only — sends a new blog post notification to all active subscribers.
// Called from admin.html after publishing a new post.
//
// Payload: { title, excerpt, url, cover_image_url? }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON    = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY   = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL         = Deno.env.get("SITE_URL") ?? "https://selora.fi";
const ADMIN_EMAIL      = "selora.tuki@gmail.com";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // ── Auth: verify admin ────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const authResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_ANON },
    });
    if (!authResp.ok) return json({ error: "Unauthorized" }, 401);
    const user = await authResp.json();
    if (user?.email !== ADMIN_EMAIL) return json({ error: "Forbidden" }, 403);

    // ── Payload ────────────────────────────────────────────────────
    const body = await req.json();
    const { title, excerpt, url, cover_image_url } = body;
    if (!title || !excerpt || !url) {
      return json({ error: "Missing fields: title, excerpt, url" }, 400);
    }

    // ── Fetch active subscribers ──────────────────────────────────
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const { data: subs, error } = await sb
      .from("newsletter_subscribers")
      .select("email, unsub_token")
      .eq("status", "active");

    if (error) {
      console.error("Fetch subs error:", error);
      return json({ error: "DB error" }, 500);
    }

    if (!subs || subs.length === 0) {
      return json({ success: true, sent: 0, message: "No active subscribers" });
    }

    // ── Send emails in batches of 50 (Resend rate limit safety) ──
    let sent = 0;
    let failed = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < subs.length; i += BATCH_SIZE) {
      const batch = subs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(sub => sendOne({
        to:           sub.email,
        unsubToken:   sub.unsub_token,
        title, excerpt, url,
        coverImageUrl: cover_image_url,
      })));
      results.forEach(r => {
        if (r.status === "fulfilled" && r.value === true) sent++;
        else failed++;
      });
    }

    return json({ success: true, sent, failed, total: subs.length });

  } catch (err) {
    console.error("send-newsletter error:", err);
    return json({ error: String(err) }, 500);
  }
});

async function sendOne(opts: {
  to:            string;
  unsubToken:    string;
  title:         string;
  excerpt:       string;
  url:           string;
  coverImageUrl?: string;
}): Promise<boolean> {
  const unsubLink = `${SITE_URL}/unsubscribe.html?t=${opts.unsubToken}`;
  const resp = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:    "Selora <uutiskirje@selora.fi>",
      to:      [opts.to],
      subject: `📝 ${opts.title}`,
      html:    newsletterHtml({ ...opts, unsubLink }),
    }),
  });
  if (!resp.ok) {
    console.error("Resend error:", await resp.text());
    return false;
  }
  return true;
}

function newsletterHtml(opts: {
  to:            string;
  unsubLink:     string;
  title:         string;
  excerpt:       string;
  url:           string;
  coverImageUrl?: string;
}): string {
  const coverHtml = opts.coverImageUrl
    ? `<img src="${opts.coverImageUrl}" alt="" style="width:100%;height:auto;display:block;border-radius:12px;margin-bottom:24px;" />`
    : "";

  return `
<!DOCTYPE html>
<html lang="fi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);max-width:100%;">

    <tr>
      <td style="background:#060c18;padding:20px 28px;">
        <div style="display:inline-flex;align-items:center;gap:8px;">
          <div style="width:26px;height:26px;background:linear-gradient(135deg,#1D4ED8,#3b82f6);border-radius:7px;"></div>
          <span style="color:#fff;font-size:15px;font-weight:600;letter-spacing:0.05em;">SELORA</span>
          <span style="color:rgba(255,255,255,0.4);font-size:11px;margin-left:8px;">uutiskirje</span>
        </div>
      </td>
    </tr>

    <tr><td style="padding:36px 32px 24px;">
      ${coverHtml}
      <p style="margin:0 0 6px;font-size:11px;color:#1D4ED8;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;">Uusi artikkeli</p>
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:500;color:#0f172a;line-height:1.3;letter-spacing:-0.02em;">
        ${escHtml(opts.title)}
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
        ${escHtml(opts.excerpt)}
      </p>
      <div>
        <a href="${opts.url}" style="display:inline-block;background:#1D4ED8;color:#fff;text-decoration:none;padding:12px 26px;border-radius:9px;font-weight:600;font-size:14px;">
          Lue artikkeli →
        </a>
      </div>
    </td></tr>

    <tr>
      <td style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
          Kiitos kun olet Seloran lukija.
        </p>
        <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
          <a href="${SITE_URL}" style="color:#94a3b8;text-decoration:underline;">selora.fi</a> ·
          <a href="${opts.unsubLink}" style="color:#94a3b8;text-decoration:underline;">Peruuta tilaus</a>
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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
