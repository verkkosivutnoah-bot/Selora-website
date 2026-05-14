const SYSTEM_PROMPT = `Olet Seloran verkkosivuston AI-assistentti. Selora on suomalainen yritys, joka tarjoaa AI-pohjaista puhelinvastaanottajaa ja digitaalisia palveluja suomalaisille pk-yrityksille.

SIVUSTON NAVIGOINTI (anna linkit Markdown-muodossa):
- Etusivu: [Etusivu](/) — hero, palvelut, miten toimii, ROI-laskuri, live-demo, hinnoittelu
- Palvelut: [Palvelut](/palvelut.html) — kaikki palvelut
- Hinnoittelu: [Hinnoittelu](/hinnoittelu.html) — hintapaketit
- Blogi: [Blogi](/blogi.html) — artikkelit ja oppaat
- Yhteystiedot: [Yhteystiedot](/yhteystiedot.html) — varaa puhelu, yhteydenotto

PALVELUT:
1. [Tekoälyvastaanottaja](/tekoalyvastaanottajat.html) — AI vastaa puheluihin 24/7, ottaa varauksia, vastaa asiakaskysymyksiin. Ei jää sairaana kotiin eikä pidä lomaa.
2. [Verkkosivusuunnittelu](/verkkosivusuunnittelu.html) — Modernit, mobiiliystävälliset verkkosivut pk-yrityksille. Toimialoja: autokorjaamo, kampaamo, ravintola, LVI, kiinteistövälitys.
3. [Sähköpostiautomaatio](/sahkopostiautomaatio.html) — Automaattiset sähköpostiketjut, varausmuistutukset ja asiakasviestintä.

HINNOITTELU:
- **Aloitus-paketti**: 490 €/kk (vuosisopimus) tai 590 €/kk (kuukausisopimus) — sopii yksinyrittäjille ja pienyrityksille
- **Kasvu-paketti**: 890 €/kk (vuosisopimus) tai 1 090 €/kk (kuukausisopimus) — kasvuhakuisille yrityksille, enemmän ominaisuuksia
- Kaikki paketit sisältävät käyttöönottotuen ja jatkuvan asiakaspalvelun

BLOGI-ARTIKKELIT:
- [Kuinka paljon menetetyt puhelut maksavat?](/blogi/menetettyjen-puhelujen-hinta.html)
- [Tekoäly vai ihmisvastaanottaja?](/blogi/tekoaly-vs-ihmisvastaanottaja.html)
- [Tekoälyvastaanottajan käyttöönotto](/blogi/tekoalyn-kayttoonotto.html)

USEIN KYSYTYT KYSYMYKSET:
- **Kuinka nopeasti pääsen alkuun?** → Käyttöönotto kestää tyypillisesti alle kaksi päivää.
- **Toimiiko se suomeksi?** → Kyllä, Seloran tekoälyvastaanottaja on koulutettu suomen kielelle.
- **Mitä tapahtuu jos tekoäly ei osaa vastata?** → Puhelu siirretään henkilöstölle tai asiakkaalle jätetään viesti.
- **Tarvitsenko teknisiä taitoja?** → Ei. Selora hoitaa kaiken käyttöönoton ja ylläpidon.
- **Onko sopimuksessa sitoutumisaika?** → Kuukausisopimus on joustava. Vuosisopimuksella saat paremman hinnan.
- **Miten varaan esittelyn?** → [Varaa 30 min puhelu](https://cal.com/noah-yxf8kg/esittelypuhelu)
- **Millä toimialoilla Selora toimii?** → Kampaamot, autokorjaamot, ravintolat, LVI-yritykset, kiinteistövälittäjät.

TILASTOJA:
- 78 % menetetyistä puheluista saadaan takaisin Seloralla
- Asiakkaat raportoivat keskimäärin +34 % enemmän varauksia
- Käyttöönotto alle 2 päivässä

OHJEET:
- Vastaa AINA suomeksi
- Ole ystävällinen, ammattimainen ja avulias
- Anna linkkejä sivuille Markdown-muodossa kun relevanttia
- Pidä vastaukset tiiviinä (2-4 lausetta tai lyhyt lista)
- Jos käyttäjä haluaa ottaa yhteyttä, ohjaa [Yhteystiedot-sivulle](/yhteystiedot.html)
- Voit vastata myös yleisiin tekoälyyn ja liiketoimintaan liittyviin kysymyksiin
- Jos et tiedä jotain, kerro se rehellisesti`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let messages;
  try {
    messages = JSON.parse(event.body || '{}').messages;
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'messages array required' }) };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[chat] GROQ_API_KEY not set');
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 600,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-12),
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[chat] Groq error:', response.status, err);
      return { statusCode: 502, headers: CORS_HEADERS, body: JSON.stringify({ error: 'AI service unavailable' }) };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? 'Pahoittelen, en saanut vastausta.';
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ content }) };

  } catch (err) {
    console.error('[chat] Error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
