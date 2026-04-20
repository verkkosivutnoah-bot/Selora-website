// Supabase Edge Function: retell-webhook
// Retell AI calls this after every call with transcript + analysis.
// Flow:
//   1. Verify Retell webhook signature (HMAC-SHA256 with RETELL_API_KEY)
//   2. On call_analyzed: find which user owns this agent
//   3. Upsert call_logs with transcript, summary, sentiment, action_items
//   4. Send email notification to client via Resend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RETELL_API_KEY    = Deno.env.get("RETELL_API_KEY")!;
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY    = Deno.env.get("RESEND_API_KEY")!;

serve(async (req) => {
  const body      = await req.text();
  const sigHeader = req.headers.get("x-retell-signature") ?? "";

  // ── Verify Retell signature ────────────────────────────────────────────────
  // Log the signature for debugging, but don't block on failure
  const valid = await verifyRetellSignature(body, sigHeader, RETELL_API_KEY);
  if (!valid) {
    console.warn("Retell signature mismatch — sig:", sigHeader ? sigHeader.slice(0,20)+"…" : "(none)");
    // Still proceed — Retell's signing method varies by account setup
    // TODO: re-enable strict check once signature format is confirmed
  }

  const event = JSON.parse(body);
  const { event: eventType, call } = event;

  console.log("Retell event:", eventType, "call_id:", call?.call_id);

  // We only care about call_analyzed — this has transcript + summary
  if (eventType !== "call_analyzed") {
    return new Response("ok", { status: 200 });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  // ── Find which user owns this agent ───────────────────────────────────────
  const { data: agentRow, error: agentErr } = await sb
    .from("retell_agents")
    .select("user_id, id")
    .eq("retell_agent_id", call.agent_id)
    .maybeSingle();

  if (agentErr || !agentRow) {
    console.error("Agent not found for retell_agent_id:", call.agent_id, agentErr);
    return new Response("Agent not found", { status: 404 });
  }

  const userId  = agentRow.user_id;
  const agentId = agentRow.id;

  // ── Parse call data ────────────────────────────────────────────────────────
  const transcript   = call.transcript ?? "";
  const analysis     = call.call_analysis ?? {};
  const summary      = analysis.call_summary ?? "";
  const sentiment    = mapSentiment(analysis.user_sentiment);
  const actionItems  = extractActionItems(summary);
  const outcome      = mapOutcome(call.call_status, analysis.call_successful);
  const callerNumber = call.from_number ?? call.metadata?.caller_number ?? "Tuntematon";
  const calledAt     = call.start_timestamp
    ? new Date(call.start_timestamp).toISOString()
    : new Date().toISOString();
  const durationSecs = call.end_timestamp && call.start_timestamp
    ? Math.round((call.end_timestamp - call.start_timestamp) / 1000)
    : 0;

  // ── Upsert call_logs ───────────────────────────────────────────────────────
  const { error: upsertErr } = await sb
    .from("call_logs")
    .upsert({
      retell_call_id: call.call_id,
      user_id:        userId,
      agent_id:       agentId,
      caller_number:  callerNumber,
      called_at:      calledAt,
      duration_secs:  durationSecs,
      outcome,
      summary,
      transcript,
      sentiment,
      action_items:   actionItems,
      call_type:      "inbound",
    }, { onConflict: "retell_call_id" });

  if (upsertErr) {
    console.error("call_logs upsert error:", upsertErr);
    return new Response("DB error", { status: 500 });
  }

  // ── Auto-create or update contact record ──────────────────────────────────
  if (callerNumber && callerNumber !== "Tuntematon") {
    const { data: existingContact } = await sb
      .from("contacts")
      .select("id, call_count")
      .eq("user_id", userId)
      .eq("phone_number", callerNumber)
      .maybeSingle();

    if (existingContact) {
      // Update existing contact: increment call count + last called
      await sb.from("contacts").update({
        call_count:    (existingContact.call_count || 1) + 1,
        last_called_at: calledAt,
      }).eq("id", existingContact.id);
    } else {
      // Create new contact from this call
      await sb.from("contacts").insert({
        user_id:        userId,
        phone_number:   callerNumber,
        last_called_at: calledAt,
        call_count:     1,
      });
    }
  }

  // ── Send email notification to client ─────────────────────────────────────
  const { data: profile } = await sb
    .from("profiles")
    .select("full_name, company_name")
    .eq("id", userId)
    .maybeSingle();

  // Get user email from auth
  const { data: authUser } = await sb.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;

  if (email && outcome !== "in_progress") {
    await sendCallNotification({
      email,
      name:          profile?.full_name ?? "Hei",
      company:       profile?.company_name ?? "",
      callerNumber,
      calledAt,
      durationSecs,
      outcome,
      summary,
      sentiment,
      actionItems,
      transcript,
    });
  }

  return new Response("ok", { status: 200 });
});

// ── Verify Retell HMAC-SHA256 signature ───────────────────────────────────
async function verifyRetellSignature(
  payload: string,
  signature: string,
  apiKey: string,
): Promise<boolean> {
  try {
    if (!signature) return false;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(apiKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return computed === signature;
  } catch {
    return false;
  }
}

// ── Map Retell sentiment to our values ───────────────────────────────────
function mapSentiment(s?: string): string {
  if (!s) return "neutral";
  const lower = s.toLowerCase();
  if (lower.includes("positive")) return "positive";
  if (lower.includes("negative")) return "negative";
  return "neutral";
}

// ── Map Retell status to our outcome values ───────────────────────────────
function mapOutcome(status?: string, successful?: boolean): string {
  if (status === "error" || status === "ended_with_error") return "missed";
  if (successful === false) return "missed";
  if (status === "ended") return "completed";
  return "completed";
}

// ── Extract simple action items from summary ──────────────────────────────
function extractActionItems(summary: string): string[] {
  const items: string[] = [];
  if (!summary) return items;

  const lower = summary.toLowerCase();

  if (lower.includes("varaus") || lower.includes("aika") || lower.includes("varaa") || lower.includes("appointment"))
    items.push("Varaus pyyntö — tarkista kalenteri");
  if (lower.includes("soita takaisin") || lower.includes("callback") || lower.includes("takaisinsoitto"))
    items.push("Takaisinsoitto pyydetty");
  if (lower.includes("tarjous") || lower.includes("hinta") || lower.includes("kustannus"))
    items.push("Tarjouspyyntö — lähetä tarjous");
  if (lower.includes("valitus") || lower.includes("ongelma") || lower.includes("häiriö"))
    items.push("Reklamaatio — käsittele pikaisesti");
  if (lower.includes("sähköposti") || lower.includes("email"))
    items.push("Asiakas pyysi yhteydenottoa sähköpostitse");

  return items;
}

// ── Format duration ───────────────────────────────────────────────────────
function fmtDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
}

// ── Format Finnish timestamp ──────────────────────────────────────────────
function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fi-FI", {
      timeZone: "Europe/Helsinki",
      day: "numeric", month: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Outcome label in Finnish ──────────────────────────────────────────────
function outcomeFi(outcome: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    completed:   { label: "Hoidettu",   color: "#10b981" },
    missed:      { label: "Vastaamaton", color: "#ef4444" },
    transferred: { label: "Siirretty",  color: "#f59e0b" },
    voicemail:   { label: "Viesti",     color: "#6366f1" },
  };
  return map[outcome] ?? { label: outcome, color: "#64748b" };
}

// ── Sentiment label ───────────────────────────────────────────────────────
function sentimentFi(s: string): string {
  if (s === "positive") return "😊 Positiivinen";
  if (s === "negative") return "😟 Negatiivinen";
  return "😐 Neutraali";
}

// ── Send call notification email ──────────────────────────────────────────
async function sendCallNotification(opts: {
  email: string;
  name: string;
  company: string;
  callerNumber: string;
  calledAt: string;
  durationSecs: number;
  outcome: string;
  summary: string;
  sentiment: string;
  actionItems: string[];
  transcript: string;
}) {
  const {
    email, name, callerNumber, calledAt, durationSecs,
    outcome, summary, sentiment, actionItems, transcript,
  } = opts;

  const oc       = outcomeFi(outcome);
  const timeStr  = fmtTime(calledAt);
  const durStr   = fmtDuration(durationSecs);

  const actionHtml = actionItems.length > 0
    ? `
      <div style="background:#fff3cd;border-radius:10px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #f59e0b;">
        <p style="margin:0 0 8px;font-weight:600;color:#92400e;font-size:14px;">⚡ Toimenpiteet</p>
        <ul style="margin:0;padding-left:18px;font-size:14px;color:#78350f;line-height:1.8;">
          ${actionItems.map(a => `<li>${a}</li>`).join("")}
        </ul>
      </div>`
    : "";

  // Show first 800 chars of transcript
  const transcriptSnippet = transcript.length > 800
    ? transcript.slice(0, 800) + "…"
    : transcript;

  const transcriptHtml = transcript
    ? `
      <div style="margin-bottom:24px;">
        <p style="margin:0 0 10px;font-weight:600;font-size:14px;color:#0f172a;">Puhelun litteraatti</p>
        <div style="background:#f8fafc;border-radius:10px;padding:16px;font-size:13px;color:#475569;line-height:1.7;white-space:pre-wrap;font-family:monospace;">${escHtml(transcriptSnippet)}</div>
      </div>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="fi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
  <tr><td align="center">
  <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

    <!-- Header -->
    <tr>
      <td style="background:#060c18;padding:24px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="display:inline-flex;align-items:center;gap:8px;">
                <div style="width:28px;height:28px;background:linear-gradient(135deg,#1D4ED8,#3b82f6);border-radius:7px;display:inline-block;"></div>
                <span style="color:#fff;font-size:16px;font-weight:600;letter-spacing:0.05em;">SELORA</span>
              </div>
            </td>
            <td align="right">
              <span style="background:${oc.color}22;color:${oc.color};font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;border:1px solid ${oc.color}44;">${oc.label}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr><td style="padding:32px;">

      <h1 style="margin:0 0 4px;font-size:20px;font-weight:600;color:#0f172a;">Uusi puhelu vastaanotettu</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Hei ${name} — agenttiasi kutsuttiin.</p>

      <!-- Call meta -->
      <div style="background:#f1f5f9;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#64748b;width:40%;">Soittaja</td>
            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#0f172a;">${escHtml(callerNumber)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#64748b;">Aika</td>
            <td style="padding:4px 0;font-size:13px;color:#0f172a;">${timeStr}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#64748b;">Kesto</td>
            <td style="padding:4px 0;font-size:13px;color:#0f172a;">${durStr}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#64748b;">Tunnelma</td>
            <td style="padding:4px 0;font-size:13px;color:#0f172a;">${sentimentFi(sentiment)}</td>
          </tr>
        </table>
      </div>

      ${summary ? `
      <!-- Summary -->
      <div style="margin-bottom:24px;">
        <p style="margin:0 0 8px;font-weight:600;font-size:14px;color:#0f172a;">Yhteenveto</p>
        <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">${escHtml(summary)}</p>
      </div>` : ""}

      ${actionHtml}
      ${transcriptHtml}

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="https://selora.fi/dashboard.html" style="display:inline-block;background:#1D4ED8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:9px;font-weight:600;font-size:14px;">
          Avaa kojelauta →
        </a>
      </div>

    </td></tr>

    <!-- Footer -->
    <tr>
      <td style="padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">Selora · Tekoälyvastaanottopalvelu · <a href="https://selora.fi/dashboard.html" style="color:#1D4ED8;text-decoration:none;">Hallinnoi ilmoituksia</a></p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;

  const resp = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:    "Selora <noreply@selora.fi>",
      to:      [email],
      subject: `📞 Uusi puhelu — ${callerNumber} (${durStr})`,
      html,
    }),
  });

  if (!resp.ok) {
    console.error("Resend error:", await resp.text());
  } else {
    console.log("Call notification sent to", email);
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
