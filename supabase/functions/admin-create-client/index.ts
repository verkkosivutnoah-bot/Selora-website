// Supabase Edge Function: admin-create-client
// Called from admin.html to manually onboard a paying client.
// Only callable by the admin account (noah@selora.fi).
// Flow:
//   1. Verify caller is admin
//   2. Create Supabase auth user
//   3. Upsert profile + onboarding rows
//   4. Generate Retell agent from industry template
//   5. Upgrade plan to active
//   6. Send welcome email with credentials via Resend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON     = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RETELL_API_KEY    = Deno.env.get("RETELL_API_KEY")!;
const RESEND_API_KEY    = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_EMAIL       = "noah@selora.fi";

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

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // ── Parse payload ─────────────────────────────────────────────────────────
    const {
      full_name, company_name, email, phone,
      industry, services, hours, tone, extra_info,
      plan_type,
    } = await req.json();

    if (!email || !full_name) return json({ error: "email and full_name required" }, 400);

    // ── Generate password ─────────────────────────────────────────────────────
    const password = "Selora-" + new Date().getFullYear() + "-" + randomStr(6);

    // ── Create Supabase auth user ─────────────────────────────────────────────
    const { data: newUser, error: createErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, company_name, phone },
    });
    if (createErr) throw new Error("Auth create error: " + createErr.message);
    const userId = newUser.user!.id;

    // ── Upsert profile ────────────────────────────────────────────────────────
    await sb.from("profiles").upsert({
      id:             userId,
      email,
      full_name,
      company_name,
      phone,
      has_active_plan: true,
      plan_type:       plan_type || "aloitus",
    });

    // ── Upsert onboarding ─────────────────────────────────────────────────────
    await sb.from("onboarding").upsert({
      user_id:       userId,
      business_name: company_name,
      industry:      industry || "muu",
      services:      services || "",
      hours:         hours || "Ma–Pe 8–17",
      tone:          tone || "ystävällinen",
      extra_info:    extra_info || "",
      tasks:         ["puheluihin vastaaminen", "ajanvaraus"],
      completed_at:  new Date().toISOString(),
      agent_generated: false,
    }, { onConflict: "user_id" });

    // ── Build agent prompt from template ──────────────────────────────────────
    const systemPrompt = buildPrompt({
      business_name: company_name, industry: industry || "muu",
      services: services || "", hours: hours || "Ma–Pe 8–17",
      tone: tone || "ystävällinen", extra_info: extra_info || "",
      tasks: ["puheluihin vastaaminen", "ajanvaraus"],
      language: "fi",
    });

    // ── Create Retell LLM ────────────────────────────────────────────────────
    const llmResp = await fetch("https://api.retellai.com/create-retell-llm", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RETELL_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        general_prompt: systemPrompt,
        general_tools: [],
      }),
    });
    if (!llmResp.ok) throw new Error("Retell LLM error: " + await llmResp.text());
    const llmData = await llmResp.json();
    const llmId = llmData.llm_id;

    // ── Create Retell agent ───────────────────────────────────────────────────
    const agentResp = await fetch("https://api.retellai.com/create-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RETELL_API_KEY}` },
      body: JSON.stringify({
        llm_websocket_url: `wss://api.retellai.com/llm-websocket/${llmId}`,
        agent_name:        `${company_name} — Tekoälyvastaanottaja`,
        voice_id:          "custom_voice_5b5439b90723dfeab0c58c448a",
        language:          "fi-FI",
        speech_to_text: { provider: "azure", language: "fi-FI" },
        enable_backchannel: true,
        backchannel_frequency: 0.7,
        responsiveness: 1,
        interruption_sensitivity: 1,
        reminder_trigger_ms: 10000,
        reminder_max_count: 2,
      }),
    });
    if (!agentResp.ok) throw new Error("Retell agent error: " + await agentResp.text());
    const agentData = await agentResp.json();
    const retellAgentId = agentData.agent_id;

    // ── Save agent to DB ─────────────────────────────────────────────────────
    await sb.from("retell_agents").insert({
      user_id:         userId,
      retell_agent_id: retellAgentId,
      retell_llm_id:   llmId,
      agent_name:      `${company_name} — Tekoälyvastaanottaja`,
      system_prompt:   systemPrompt,
      voice_id:        "custom_voice_5b5439b90723dfeab0c58c448a",
      active:          true,
      is_demo:         false,
      demo_calls_used: 0,
      demo_calls_limit: 999,
    });

    // ── Mark onboarding agent_generated ──────────────────────────────────────
    await sb.from("onboarding").update({ agent_generated: true }).eq("user_id", userId);

    // ── Send welcome email ────────────────────────────────────────────────────
    await sendWelcomeEmail({ email, full_name, company_name, password, plan_type: plan_type || "aloitus" });

    return json({
      success:    true,
      user_id:    userId,
      agent_id:   retellAgentId,
      password,
      message:    `Client ${full_name} created and agent deployed.`,
    });

  } catch (err) {
    console.error("admin-create-client error:", err);
    return json({ error: String(err) }, 500);
  }
});

// ── Random string ─────────────────────────────────────────────────────────────
function randomStr(len: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ── Send welcome email ────────────────────────────────────────────────────────
async function sendWelcomeEmail(opts: {
  email: string; full_name: string; company_name: string;
  password: string; plan_type: string;
}) {
  const { email, full_name, company_name, password, plan_type } = opts;
  const planLabel = plan_type === "kasvu" ? "Kasvupaketti" : plan_type === "yritys" ? "Yrityspaketti" : "Aloituspaketti";

  const html = `
<!DOCTYPE html>
<html lang="fi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
  <tr><td align="center">
  <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

    <tr>
      <td style="background:#060c18;padding:28px 36px;">
        <div style="display:inline-flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;background:linear-gradient(135deg,#1D4ED8,#3b82f6);border-radius:8px;display:inline-block;"></div>
          <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:0.08em;">SELORA</span>
        </div>
        <p style="color:rgba(255,255,255,0.45);margin:10px 0 0;font-size:13px;">Tekoälyvastaanottopalvelu</p>
      </td>
    </tr>

    <tr><td style="padding:36px;">

      <h1 style="margin:0 0 6px;font-size:22px;font-weight:300;color:#0f172a;letter-spacing:-0.02em;">
        Tilisi on valmis, ${full_name}! 🎉
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:#64748b;">
        Tekoälyvastaanottopalvelusi on luotu ja valmis käyttöön heti.
      </p>

      <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#1D4ED8;">TILISI TIEDOT</p>
        <p style="margin:8px 0 0;font-size:17px;font-weight:600;color:#0f172a;">${company_name}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#64748b;">${planLabel}</p>
      </div>

      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#0f172a;">Kirjautumistiedot</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td style="padding:5px 0;font-size:13px;color:#64748b;width:35%;">Osoite</td>
            <td style="padding:5px 0;font-size:13px;"><a href="https://selora.fi/kirjaudu.html" style="color:#1D4ED8;text-decoration:none;font-weight:500;">selora.fi/kirjaudu.html</a></td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-size:13px;color:#64748b;">Sähköposti</td>
            <td style="padding:5px 0;font-size:13px;font-weight:500;color:#0f172a;">${email}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-size:13px;color:#64748b;">Salasana</td>
            <td style="padding:5px 0;">
              <code style="background:#f1f5f9;padding:3px 10px;border-radius:6px;font-size:14px;font-weight:700;color:#1D4ED8;letter-spacing:0.05em;">${password}</code>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;">💡 Vaihda salasana kirjautumisen jälkeen kojelaudan asetuksista.</p>
      </div>

      <div style="border-left:3px solid #1D4ED8;padding-left:18px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-weight:600;color:#0f172a;font-size:14px;">1. Kirjaudu kojelautaan</p>
        <p style="margin:0;font-size:13px;color:#64748b;">Agenttiasi on jo luotu yrityksesi tietojen pohjalta ja odottaa sinua.</p>
      </div>

      <div style="border-left:3px solid #1D4ED8;padding-left:18px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-weight:600;color:#0f172a;font-size:14px;">2. Hanki puhelinnumero (Twilio)</p>
        <p style="margin:0;font-size:13px;color:#64748b;">Käy osoitteessa <a href="https://twilio.com" style="color:#1D4ED8;">twilio.com</a>, luo tili ja osta suomalainen numero (+358). Lisää webhook-osoite numeroon — löydät ohjeet kojelaudan asetuksista.</p>
      </div>

      <div style="border-left:3px solid #10b981;padding-left:18px;margin-bottom:32px;">
        <p style="margin:0 0 4px;font-weight:600;color:#0f172a;font-size:14px;">3. Testaa ja ota käyttöön 🚀</p>
        <p style="margin:0;font-size:13px;color:#64748b;">Soita numeroon ja kuule agenttisi toiminnassa. Muokkaa asetuksia kojelaudasta milloin tahansa.</p>
      </div>

      <div style="text-align:center;margin-bottom:8px;">
        <a href="https://selora.fi/kirjaudu.html" style="display:inline-block;background:#1D4ED8;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:600;font-size:15px;">
          Kirjaudu kojelautaan →
        </a>
      </div>

    </td></tr>

    <tr>
      <td style="padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">Kysyttävää? <a href="mailto:noah@selora.fi" style="color:#1D4ED8;text-decoration:none;">noah@selora.fi</a> · Selora</p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from:    "Selora <noreply@selora.fi>",
      to:      [email],
      subject: `Tilisi on valmis — tervetuloa Seloraan, ${full_name}! 🎉`,
      html,
    }),
  });
  if (!resp.ok) console.error("Resend error:", await resp.text());
}

// ── Prompt builder (same as generate-demo-agent) ──────────────────────────────
function buildPrompt(data: {
  business_name: string; industry: string; services: string;
  hours: string; tone: string; extra_info: string;
  tasks: string[]; language: string;
}): string {
  const { business_name, industry, services, hours, tone, extra_info, tasks } = data;
  const toneMap: Record<string,string> = {
    ystävällinen: "ystävällinen, lämmin ja ammattimainen",
    asiallinen:   "asiallinen ja suoraviivainen",
    rento:        "rento ja helposti lähestyttävä",
    virallinen:   "virallinen ja muodollinen",
  };
  const toneStr = toneMap[tone] || "ystävällinen ja ammattimainen";
  const taskStr = tasks.join(", ");

  const templates: Record<string, string> = {
    "parturi-kampaamo": `Olet ${business_name}:n tekoälyvastaanottaja. Parturi-kampaamomme tarjoaa ${services || "hiustenleikkauksia ja -hoitoja"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`,
    "ravintola": `Olet ${business_name}:n tekoälyvastaanottaja. Ravintolaamme tarjoaa ${services || "ruokaa ja juomia"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`,
    "laakariasema": `Olet ${business_name}:n tekoälyvastaanottaja. Lääkäriasemamme tarjoaa ${services || "lääkäripalveluita"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`,
    "fysioterapia": `Olet ${business_name}:n tekoälyvastaanottaja. Fysioterapiapalvelumme kattaa ${services || "fysioterapian ja kuntoutuksen"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`,
    "autokorjaamo": `Olet ${business_name}:n tekoälyvastaanottaja. Autokorjaamomme tarjoaa ${services || "autojen huolto- ja korjauspalveluita"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`,
    "kiinteistojenvalitys": `Olet ${business_name}:n tekoälyvastaanottaja. Kiinteistönvälitystoimistomme auttaa ${services || "asuntojen ostamisessa, myymisessä ja vuokraamisessa"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`,
    "tilitoimisto": `Olet ${business_name}:n tekoälyvastaanottaja. Tilitoimistomme tarjoaa ${services || "kirjanpito-, palkanlaskenta- ja veropalveluita"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`,
    "kauneudenhoito": `Olet ${business_name}:n tekoälyvastaanottaja. Kauneushoitola tarjoaa ${services || "kauneudenhoitopalveluita"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`,
    "hammaslaakarit": `Olet ${business_name}:n tekoälyvastaanottaja. Hammaslääkärivastaanottomme tarjoaa ${services || "hammashoitopalveluita"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`,
    "lakitoimisto": `Olet ${business_name}:n tekoälyvastaanottaja. Lakitoimistomme tarjoaa ${services || "juridisia palveluita"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`,
    "lvi": `Olet ${business_name}:n tekoälyvastaanottaja. LVI-yrityksemme tarjoaa ${services || "LVI-asennus- ja huoltopalveluita"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`,
    "sahkoasennus": `Olet ${business_name}:n tekoälyvastaanottaja. Sähköasennusyrityksemme tarjoaa ${services || "sähköasennuksia ja -huoltoja"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`,
    "rakennus": `Olet ${business_name}:n tekoälyvastaanottaja. Rakennusyrityksemme tarjoaa ${services || "rakennuspalveluita"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`,
  };

  const base = templates[industry] || `Olet ${business_name}:n tekoälyvastaanottaja. Tarjoamme ${services || "palveluita"}. Olet ${toneStr}. Tehtäväsi: ${taskStr}. Aukioloajat: ${hours}.`;
  const extra = extra_info ? `\n\nLisätiedot: ${extra_info}` : "";

  return base + extra + `

ÄÄNTÄMISOHJEET (ERITTÄIN TÄRKEÄÄ):
- Puhu AINA suomeksi, ellei asiakas erikseen pyydä muuta kieltä
- Ääntämisohje numeroille: "0400 123 456" → sano "nolla neljäsataa, yksi kaksi kolme, neljä viisi kuusi"
- Sähköpostiosoitteet: "info@yritys.fi" → "info ät yritys piste fi"
- Verkkosivut: "www.yritys.fi" → "www piste yritys piste fi"
- Älä käytä englanninkielisiä sanoja jos suomenkielinen vastine on olemassa
- Ole selkeä ja puhu rauhallisesti`;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
