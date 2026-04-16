// Supabase Edge Function: update-agent
// Updates an existing Retell LLM prompt + begin_message and saves to DB.
// Flow:
//   1. Auth user via Supabase Auth API
//   2. Rebuild system prompt from updated onboarding fields (same template as generate-demo-agent)
//   3. PATCH Retell LLM via /update-retell-llm
//   4. Save updated system_prompt to retell_agents table
//   5. Return { success: true }

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

    default:
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

YKSI KYSYMYS KERRALLAAN:
Älä koskaan kysy useampaa asiaa kerrallaan. Keskity yhteen kysymykseen ja odota vastausta ennen seuraavan esittämistä.`;
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return json("ok", 200);

  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const authResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_ANON },
    });
    if (!authResp.ok) return json({ error: "Unauthorized" }, 401);
    const user = await authResp.json();
    if (!user?.id) return json({ error: "Unauthorized" }, 401);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // ── Payload ──────────────────────────────────────────────────────────────
    const body = await req.json();
    const {
      llm_id,
      agent_id,
      business_name  = "",
      industry       = "muu",
      city           = "",
      business_phone = "",
      services       = "",
      hours          = "",
      tasks          = [],
      tone           = "friendly",
      languages      = ["fi"],
      extra_info     = "",
      greeting       = "",
    } = body;

    if (!llm_id)   return json({ error: "llm_id is required" }, 400);
    if (!agent_id) return json({ error: "agent_id is required" }, 400);

    // ── Build updated prompt ──────────────────────────────────────────────────
    const newPrompt = buildPrompt({
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

    const beginMessage = greeting ||
      `Hei, olet soittanut ${business_name}:een. Kuinka voin auttaa sinua tänään?`;

    // ── PATCH Retell LLM ─────────────────────────────────────────────────────
    const llmResp = await fetch(`https://api.retellai.com/update-retell-llm/${llm_id}`, {
      method: "PATCH",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${RETELL_API_KEY}`,
      },
      body: JSON.stringify({
        general_prompt: newPrompt,
        begin_message:  beginMessage,
      }),
    });

    if (!llmResp.ok) {
      const err = await llmResp.text();
      throw new Error(`Retell update-retell-llm error: ${err}`);
    }

    // ── Update system_prompt in retell_agents table ───────────────────────────
    const { error: updateErr } = await sb
      .from("retell_agents")
      .update({ system_prompt: newPrompt })
      .eq("retell_agent_id", agent_id)
      .eq("user_id", user.id);

    if (updateErr) throw updateErr;

    return json({ success: true });

  } catch (err) {
    console.error("update-agent error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
