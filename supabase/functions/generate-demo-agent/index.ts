// Supabase Edge Function: generate-demo-agent
// Builds a personalised Finnish Retell agent prompt from onboarding data.
// No external AI API needed — uses industry-specific templates.
// Flow:
//   1. Receives onboarding payload
//   2. Builds system prompt from template (industry-specific)
//   3. Creates Retell LLM (POST /v2/create-retell-llm)
//   4. Creates Retell Agent (POST /v2/create-agent)
//   5. Saves to retell_agents table
//   6. Returns { success, agent_id, agent_name }

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

// ── TASK LABELS ──────────────────────────────────────────────────────────────
const TASK_LABELS: Record<string, string> = {
  answer_info: "vastaa yleisiin kysymyksiin yrityksestä",
  booking:     "vastaanottaa ajanvarauksia",
  pricing:     "kertoo palvelujen hinnat",
  hours:       "kertoo aukioloajat",
  transfer:    "siirtää puhelut henkilöstölle tarvittaessa",
  voicemail:   "ottaa vastaan viestejä ja välittää ne yritykselle",
  directions:  "kertoo sijainnin ja kulkuohjeet",
};

const TONE_LABELS: Record<string, string> = {
  professional: "ammattimainen ja kohteliaan virallinen",
  friendly:     "ystävällinen, lämmin ja helposti lähestyttävä",
  casual:       "rento ja vapaamuotoinen, mutta asiallinen",
};

const LANG_LABELS: Record<string, string> = {
  fi: "suomi", en: "englanti", sv: "ruotsi",
};

// ── INDUSTRY-SPECIFIC INSTRUCTIONS ──────────────────────────────────────────
function industryBlock(industry: string, businessName: string): string {
  switch (industry) {
    case "parturi-kampaamo":
      return `Olet ${businessName}:n puhelinvastaanottaja. Kun asiakas soittaa, selvitä:
- Haluavatko he varata ajan (leikkaus, värjäys, highlights, muu)?
- Onko heillä toiveita tietystä kampaajasta?
- Haluavatko he ajan naisille, miehille vai lapsille?
Tarjoa sopivia aikoja ja vahvista varaus selkeästi. Jos tietty kampaaja ei ole vapaa, tarjoa vaihtoehto.`;

    case "ravintola":
      return `Olet ${businessName}:n puhelinvastaanottaja. Kun asiakas soittaa pöytävarauksen takia, selvitä:
- Päivämäärä ja kellonaika
- Henkilömäärä
- Onko erityistoiveita (syntymäpäivä, allergia, ikkunapaikka)?
Vahvista varaus ja mainitse mahdollinen peruutuskäytäntö. Kerro myös aukioloajat ja ruokalistan pääpiirteet tarvittaessa.`;

    case "laakariasema":
      return `Olet ${businessName}:n puhelinvastaanottaja. Tärkeää:
- Jos potilas kuvaa vakavaa oiretta tai hätätilannetta, ohjaa heidät välittömästi soittamaan 112 tai menemään päivystykseen.
- Rutiiniajan varauksessa selvitä: onko potilas uusi vai vanha, vaiva lyhyesti, toivottu lääkäri.
- Puhu rauhallisesti ja selkeästi. Älä anna lääketieteellisiä neuvoja.
- Muistuta potilaita ottamaan Kela-kortti mukaan.`;

    case "kauneudenhoito":
      return `Olet ${businessName}:n puhelinvastaanottaja. Kun asiakas varaa aikaa, selvitä:
- Mikä hoito (kasvohoidot, rakennekynnet, ripset, hieronta, muu)?
- Onko ensimmäinen kerta — joissain hoidoissa tarvitaan patch-testi etukäteen.
- Toivottu aika ja tekijä.
Mainitse hoitojen kesto ja mahdollinen valmistautumisohje tarvittaessa.`;

    case "autokorjaamo":
      return `Olet ${businessName}:n puhelinvastaanottaja. Kun asiakas soittaa huolto- tai korjausasiassa, selvitä:
- Auton merkki, malli ja vuosimalli
- Mistä viasta tai huollosta on kyse?
- Milloin auto sopisi tuoda?
Jos kyseessä on kiireellinen vika (jarrut, turvallisuus), mainitse se erikseen. Vahvista tuontiajankohta selkeästi.`;

    case "kiinteistojenvalitys":
      return `Olet ${businessName}:n puhelinvastaanottaja. Asiakkaat soittavat yleensä:
- Asunnon myyntiin liittyen (arviokäynti, toimeksiantosopimus)
- Asunnon ostoon liittyen (näytöt, tarjoukset)
- Vuokrauksesta kysyen
Selvitä lyhyesti mitä he tarvitsevat ja ohjaa oikealle välittäjälle tai varaa tapaaminen. Ole asiallinen ja luottamusta herättävä.`;

    case "tilitoimisto":
      return `Olet ${businessName}:n puhelinvastaanottaja. Asiakkaat soittavat yleensä kirjanpitoon, palkanlaskentaan, veroilmoituksiin tai yrityksen perustamiseen liittyen.
Selvitä lyhyesti mitä palvelua asiakas tarvitsee ja onko hän jo asiakas. Varaa tapaaminen tai yhteydenotto sopivalle kirjanpitäjälle. Ole täsmällinen ja ammattimainen.`;

    case "lakitoimisto":
      return `Olet ${businessName}:n puhelinvastaanottaja. Tärkeää:
- Älä koskaan anna oikeudellisia neuvoja puhelimessa.
- Selvitä lyhyesti asian aihe (työsuhde, sopimus, riita, perheoikeus, muu) ja ohjaa oikealle asiantuntijalle.
- Ole erityisen luottamuksellinen ja rauhallinen — asiakkailla saattaa olla vaikea tilanne.
- Varaa aika tai pyydä yhteydenottopyyntö.`;

    case "fysioterapia":
      return `Olet ${businessName}:n puhelinvastaanottaja. Kun asiakas soittaa, selvitä:
- Onko heillä lääkärin lähete vai tulevatko omakustanteisesti?
- Mikä vaiva tai kipu heillä on (selkä, olkapää, polvi, urheilu, muu)?
- Uusi vai palaava asiakas?
Tarjoa sopiva aika ja tarvittaessa mainitse, kannattaako ottaa lähete mukaan.`;

    case "hammaslaakarit":
      return `Olet ${businessName}:n puhelinvastaanottaja. Kun asiakas soittaa:
- Jos heillä on kova kipu, särky tai tapaturma, priorisoi kiireellinen aika tai ohjaa päivystykseen.
- Muuten selvitä: uusi vai vanha potilas, mitä hoitoa tarvitaan (tarkastus, paikkaus, proteesi, valkaisu)?
- Muistuta Kela-kortin tuomisesta.
Ole rauhallinen — hammaslääkäripelko on yleistä, pidä sävy erityisen ystävällisenä.`;

    case "lvi":
      return `Olet ${businessName}:n puhelinvastaanottaja. Kun asiakas soittaa:
- Jos kyseessä on vuoto, tulviminen tai lämmityskatkos — käsittele kiireellisenä ja selvitä osoite välittömästi.
- Muuten selvitä: mikä työ tarvitaan (vesijohto, viemäri, lämmitys, ilmastointi), osoite ja milloin sopii.
- Kysy onko kyseessä uudisrakennus vai vanha kiinteistö, omakotitalo vai kerrostalo.
Vahvista käyntiajankohta tai lupaa soittaa takaisin aikataulun varmistamiseksi.`;

    case "sahkoasennus":
      return `Olet ${businessName}:n puhelinvastaanottaja. Kun asiakas soittaa:
- Jos kyseessä on sähkökatko, kipinöinti tai palovaara — ohjaa välittömästi soittamaan 112 ja katkaisemaan pääsulake.
- Muuten selvitä: mitä työtä tarvitaan (pistorasiat, valaistus, sähkötaulu, aurinkopaneelit, muu), osoite, milloin sopii.
- Mainitse että sähkötyöt vaativat aina valtuutetun sähköasentajan — tämä luo luottamusta.
Vahvista käyntiajankohta tai lupaa yhteydenotto.`;

    case "rakennus":
      return `Olet ${businessName}:n puhelinvastaanottaja. Kun asiakas soittaa remontti- tai rakennusasiassa, selvitä:
- Minkälainen työ on kyseessä (kylpyhuone, keittiö, lattia, maalaus, laajennus, muu)?
- Onko kyseessä omakotitalo, rivi- vai kerrostaloasunto?
- Millä aikataululla työ pitäisi tehdä?
Tarjoa arviokäynti tai tarjouspyyntö. Ole suoraviivainen ja käytännönläheinen.`;

    default: // "muu"
      return `Olet ${businessName}:n puhelinvastaanottaja. Auta asiakkaita ystävällisesti ja ammattimaisesti. Selvitä heidän asiansa lyhyesti ja ohjaa oikeaan suuntaan — varaa aika, ota viesti tai vastaa kysymyksiin yrityksen tietojen perusteella.`;
  }
}

// ── PROMPT BUILDER ───────────────────────────────────────────────────────────
function buildPrompt(params: {
  businessName:  string;
  industry:      string;
  city:          string;
  businessPhone: string;
  services:      string;
  hours:         string;
  tasks:         string[];
  tone:          string;
  languages:     string[];
  extraInfo:     string;
}): string {
  const {
    businessName, industry, city, businessPhone,
    services, hours, tasks, tone, languages, extraInfo,
  } = params;

  const toneDesc  = TONE_LABELS[tone]   || TONE_LABELS.friendly;
  const langList  = languages.map(l => LANG_LABELS[l] || l).join(" ja ");
  const taskList  = tasks.map(t => TASK_LABELS[t] || t).filter(Boolean).join(", ");
  const industryInstructions = industryBlock(industry, businessName);

  return `${industryInstructions}

ÄÄNENSÄVY JA TYYLI:
Puhu ${toneDesc} tavalla. Käytä luontevaa suomea, vältä liian virallisia tai jäykkiä lauseita. Pidä vastaukset lyhyinä ja selkeinä.

KIELET:
Palvele asiakkaita ensisijaisesti seuraavilla kielillä: ${langList}. Jos asiakas puhuu muuta kieltä, yritä palvella häntä englanniksi.

YRITYKSEN TIEDOT:
- Nimi: ${businessName}
- Kaupunki: ${city}
${businessPhone ? `- Puhelinnumero: ${businessPhone}` : ""}

PALVELUT JA HINNAT:
${services}

AUKIOLOAJAT:
${hours}

TEHTÄVÄSI:
${taskList || "Vastaa asiakkaiden kysymyksiin ja auta heitä eteenpäin."}

${extraInfo ? `LISÄOHJEET:\n${extraInfo}\n` : ""}
YLEISET OHJEET:
- Älä koskaan keksi tietoja — jos et tiedä vastausta, lupaa selvittää asia.
- Puhu aina ${businessName}:n edustajana, älä mainitse olevasi tekoäly ellei asiakas suoraan kysy.
- Pidä puhelu asiallisena ja lyhyenä. Asiakkaasi arvostavat aikaasi.
- Jos asiakas haluaa jättää viestin, toista se heille takaisin vahvistaaksesi oikeellisuuden.

ÄÄNTÄMISOHJEET (ERITTÄIN TÄRKEÄÄ):
Kaikki numerot, hinnat, päivämäärät, kellonajat, puhelinnumerot ja osoitteet on lausuttava kokonaisina suomenkielisinä sanoina. Älä koskaan käytä numeroita, symboleja tai lyhenteitä puheessa.

PUHELINNUMEROIDEN KÄSITTELY:
Toista puhelinnumerot numero kerrallaan ja pidä pieni tauko numeroiden välissä.
Esimerkki: "Nolla neljä neljä, seitsemän kolme kolme, yhdeksän neljä nolla nolla."

OSOITTEIDEN KÄSITTELY:
Toista osoite selkeästi ja varmista se asiakkaalta.
Esimerkki: "Eli osoite on Roomankatu viisi aa, onko tämä oikein?"

SÄHKÖPOSTIOSOITTEIDEN KÄSITTELY:
Toista sähköpostiosoite takaisin SAMALLA TAVALLA kuin asiakas sen sanoi. Käytä "ät" merkille @ ja "piste" merkille . ÄLÄ KOSKAAN tavaa sähköpostiosoitetta kirjain kirjaimelta, ellei asiakas itse sano sen kirjain kirjaimelta.
Esimerkkejä:
- Asiakas sanoo: "huolto piste fixitkodinkonehuolto ät gmail piste com" → Sinä toistat: "Eli sähköposti on huolto piste fixitkodinkonehuolto ät gmail piste com, onko oikein?"
- Asiakas sanoo kirjain kerrallaan: "m-a-t-t-i ät gmail piste com" → VAIN TÄSSÄ tapauksessa toistat kirjain kerrallaan.
Jos et ole varma sähköpostista, pyydä asiakasta toistamaan se: "Voisitko sanoa sähköpostin vielä kerran, kiitos?"

YKSI KYSYMYS KERRALLAAN:
Älä koskaan kysy useampaa asiaa kerrallaan. Keskity yhteen kysymykseen ja odota vastausta ennen seuraavan esittämistä.`;
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    // Call Auth API directly — avoids local JWT verification, works with ES256
    const authResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_ANON },
    });
    if (!authResp.ok) return json({ error: "Unauthorized" }, 401);
    const user = await authResp.json();
    if (!user?.id) return json({ error: "Unauthorized" }, 401);

    // Service role client for DB writes (bypasses RLS)
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // ── Payload ──────────────────────────────────────────────────────────────
    const body = await req.json();
    const {
      onboarding_id,
      business_name,
      industry       = "muu",
      city           = "",
      business_phone = "",
      services       = "",
      hours          = "",
      tasks          = [],
      tone           = "friendly",
      languages      = ["fi"],
      extra_info     = "",
    } = body;

    // ── Build prompt from template ────────────────────────────────────────────
    const agentPrompt = buildPrompt({
      businessName:  business_name,
      industry,
      city,
      businessPhone: business_phone,
      services,
      hours,
      tasks,
      tone,
      languages,
      extraInfo:     extra_info,
    });

    const agentName    = `${business_name} — Tekoälyvastaanottaja`;
    const beginMessage = `Hei, olet soittanut ${business_name}:een. Kuinka voin auttaa sinua tänään?`;

    // ── Create Retell LLM ────────────────────────────────────────────────────
    const llmResp = await fetch("https://api.retellai.com/create-retell-llm", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${RETELL_API_KEY}`,
      },
      body: JSON.stringify({
        general_prompt: agentPrompt,
        begin_message:  beginMessage,
        general_tools: tasks.includes("booking") ? [
          {
            type:        "end_call",
            name:        "end_call",
            description: "Lopeta puhelu asiallisesti kun asia on hoidettu",
          },
        ] : [],
      }),
    });

    if (!llmResp.ok) {
      const err = await llmResp.text();
      throw new Error(`Retell create-retell-llm error: ${err}`);
    }
    const llmData     = await llmResp.json();
    const retellLlmId = llmData.llm_id as string;
    if (!retellLlmId) throw new Error("Retell did not return an llm_id");

    // ── Create Retell Agent ──────────────────────────────────────────────────
    const agentResp = await fetch("https://api.retellai.com/create-agent", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${RETELL_API_KEY}`,
      },
      body: JSON.stringify({
        agent_name: agentName,
        voice_id:   "custom_voice_5b5439b90723dfeab0c58c448a",
        language:   "fi-FI",
        response_engine: {
          type:   "retell-llm",
          llm_id: retellLlmId,
        },
        speech_to_text: {
          provider: "azure",
          language: "fi-FI",
        },
        enable_backchannel:        true,
        backchannel_frequency:     0.8,
        backchannel_words:         ["joo", "selvä", "kyllä", "ymmärrän"],
        end_call_after_silence_ms: 30000,
        max_call_duration_ms:      600000,
        normalize_for_speech:      true,
        responsiveness:            1,
        interruption_sensitivity:  1,
        reminder_trigger_ms:       10000,
        reminder_max_count:        1,
        ambient_sound:             "coffee-shop",
        ambient_sound_volume:      0.1,
      }),
    });

    if (!agentResp.ok) {
      const err = await agentResp.text();
      throw new Error(`Retell create-agent error: ${err}`);
    }
    const agentData     = await agentResp.json();
    const retellAgentId = (agentData.agent_id || agentData.id) as string;
    if (!retellAgentId) throw new Error("Retell did not return an agent_id");

    // ── Save to Supabase ─────────────────────────────────────────────────────
    const { error: insertErr } = await sb.from("retell_agents").insert({
      user_id:          user.id,
      onboarding_id:    onboarding_id || null,
      retell_agent_id:  retellAgentId,
      retell_llm_id:    retellLlmId,
      agent_name:       agentName,
      system_prompt:    agentPrompt,
      active:           true,
      demo_calls_used:  0,
      demo_calls_limit: 5,
    });

    if (insertErr) throw insertErr;

    if (onboarding_id) {
      await sb.from("onboarding").update({ agent_generated: true }).eq("id", onboarding_id);
    }

    return json({ success: true, agent_id: retellAgentId, agent_name: agentName });

  } catch (err) {
    console.error("generate-demo-agent error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}


