const { SITE_KNOWLEDGE } = require('./site-knowledge');

/* The old prompt was written by hand and had gone stale: it was still selling
   the AI receptionist long after that product was archived, and it listed a
   blog that no longer exists. Nothing here restates the site's content any
   more. The facts come from site-knowledge.js, which is generated from the
   live pages by scripts/build-chatbot-knowledge.py, so re-running that script
   after a copy change is all it takes to keep the chatbot current.

   This constant holds only behaviour, never facts. */
const RULES_FI = `Olet Seloran verkkosivuston avustaja. Selora on suomalainen
verkkosivutoimisto.

Vastaa VAIN alla olevan sivuston sisällön perusteella. Se on ainoa tietolähteesi
Selorasta.

- Jos vastaus ei löydy sisällöstä, sano rehellisesti ettet tiedä ja ohjaa
  [Yhteystiedot-sivulle](/yhteystiedot.html). Älä arvaa hintoja, aikatauluja,
  paketteja tai ominaisuuksia, äläkä keksi palveluja joita ei mainita.
- Pidä vastaukset tiiviinä, 2, 4 lausetta tai lyhyt lista.
- Käytä Markdownia ja anna linkit muodossa [teksti](/sivu.html).
- Ole ystävällinen ja suora, älä myyntipuheinen.
- Älä koskaan lupaa alennuksia, takuita tai toimitusaikoja joita sisältö ei
  mainitse.
- Jos kysytään palvelusta jota sisältö ei mainitse (esimerkiksi
  sovelluskehitys, logosuunnittelu tai puhelinpalvelut), älä päättele että
  Selora tarjoaisi sitä vain koska kysymys muistuttaa jotain mainittua
  palvelua, tai koska Selora on saattanut tarjota sitä aiemmin. Sano
  rehellisesti ettet tiedä.

SIVUSTON SISÄLTÖ:
`;

const RULES_EN = `You are the assistant on Selora's website. Selora is a Finnish
web design studio.

Answer ONLY from the site content below. It is your only source about Selora.

- If the answer is not in the content, say honestly that you do not know and
  point to the [contact page](/yhteystiedot.html). Never guess prices,
  schedules, packages or features, and never invent services.
- Keep answers short, 2 to 4 sentences or a brief list.
- Use Markdown and give links as [text](/page.html).
- Be friendly and direct, not salesy.
- Never promise discounts, guarantees or delivery times the content does not
  state.
- If asked about a service the content does not mention (for example app
  development, logo design or phone services), do not infer that Selora
  offers it just because the question sounds similar to something
  mentioned, or because Selora may have offered it in the past. Say
  honestly that you do not know.

SITE CONTENT:
`;

/* SITE_KNOWLEDGE.fi/.en used to be sent whole (~17k tokens with rules —
   Finnish runs ~2.4 chars/token on Groq's tokenizer, not the ~4 chars/token
   English rule of thumb) and blew past the free-tier per-request token cap
   on every model tried, so every reply 502'd. Fix: never send more than a
   relevant slice. Tietosuojaseloste (privacy policy) is dropped outright —
   it was the single biggest section and never worth answering from; the
   "say honestly you don't know" rule already covers it. The remaining
   sections are ranked by keyword overlap with the user's message and
   packed in under KNOWLEDGE_CHAR_BUDGET, in original page order so the
   model still reads them as coherent page excerpts. History is also capped
   (recentHistory below) since stored assistant replies count toward the
   same limit on every follow-up turn. */
const KNOWLEDGE_CHAR_BUDGET = 10000; // ~4200 tokens of Finnish, less of English
const SECTION_CHAR_CAP = 5500; // a single section can't eat the whole budget

function pickKnowledge(knowledgeText, queryText) {
  const sections = knowledgeText
    .split(/\n(?=## )/)
    .filter(function (s) { return !/^## Tietosuojaseloste/.test(s); });

  const words = queryText.toLowerCase().split(/[^a-zäöå0-9]+/i).filter(function (w) { return w.length > 2; });

  var scored = sections.map(function (s) {
    var lower = s.toLowerCase();
    var score = 0;
    words.forEach(function (w) { if (lower.indexOf(w) !== -1) score++; });
    var capped = s.length > SECTION_CHAR_CAP ? s.slice(0, SECTION_CHAR_CAP) : s;
    // Density, not raw count, so one huge tangentially-matching page can't
    // starve the budget a smaller, more on-topic page needs.
    return { section: capped, density: score / capped.length };
  });
  scored.sort(function (a, b) { return b.density - a.density; });

  var budget = KNOWLEDGE_CHAR_BUDGET;
  var chosen = [];
  for (var i = 0; i < scored.length; i++) {
    var s = scored[i].section;
    if (s.length > budget) continue;
    chosen.push(s);
    budget -= s.length;
    if (budget <= 0) break;
  }
  if (chosen.length === 0) chosen.push(sections[0].slice(0, KNOWLEDGE_CHAR_BUDGET));

  chosen.sort(function (a, b) { return sections.indexOf(a) - sections.indexOf(b); });
  return chosen.join('\n');
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, lang } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }
  const userLang = lang === 'en' ? 'en' : 'fi';
  // A capped message COUNT isn't enough on its own: assistant replies can run
  // up to max_tokens each, so a few long turns can rebuild the same token
  // pressure the knowledge-base budget above was built to avoid. Trim by
  // char budget too, dropping oldest turns first, always keeping at least
  // the latest user message.
  const HISTORY_CHAR_BUDGET = 6000;
  var recentHistory = messages.slice(-8);
  var historyChars = recentHistory.reduce(function (n, m) { return n + (m.content || '').length; }, 0);
  while (historyChars > HISTORY_CHAR_BUDGET && recentHistory.length > 1) {
    historyChars -= (recentHistory[0].content || '').length;
    recentHistory = recentHistory.slice(1);
  }
  // Query the knowledge base with the last couple of user turns so a short
  // follow-up ("entä hinnat?") still pulls in the right section.
  const queryText = recentHistory
    .filter(function (m) { return m.role === 'user'; })
    .slice(-2)
    .map(function (m) { return m.content; })
    .join(' ');
  // Each language gets the knowledge base in its own language, so the model is
  // never asked to translate the site's copy on the fly and invent wording.
  const systemForLang = userLang === 'en'
    ? RULES_EN + pickKnowledge(SITE_KNOWLEDGE.en, queryText)
    : RULES_FI + pickKnowledge(SITE_KNOWLEDGE.fi, queryText);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[chat] GROQ_API_KEY not set');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
        messages: [
          { role: 'system', content: systemForLang },
          ...recentHistory,
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[chat] Groq error:', response.status, err);
      return res.status(502).json({ error: 'AI service unavailable' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? 'Pahoittelen, en saanut vastausta.';
    return res.status(200).json({ content });
  } catch (err) {
    console.error('[chat] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
