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

SITE CONTENT:
`;

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
  // Each language gets the knowledge base in its own language, so the model is
  // never asked to translate the site's copy on the fly and invent wording.
  const systemForLang = userLang === 'en'
    ? RULES_EN + SITE_KNOWLEDGE.en
    : RULES_FI + SITE_KNOWLEDGE.fi;

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
        model: 'llama-3.1-8b-instant',
        max_tokens: 600,
        messages: [
          { role: 'system', content: systemForLang },
          ...messages.slice(-12),
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
