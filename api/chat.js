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

  /* ── Who answers, and in what order ──────────────────────────────────
   *
   * Groq retired llama-3.3-70b-versatile on 2026-08-16 and the chatbot was
   * down until somebody noticed. One hardcoded model at one provider is the
   * bug; a list is the fix. Each candidate is tried in turn and the first one
   * that answers wins, so a model disappearing costs a few hundred
   * milliseconds instead of taking the assistant off the site.
   *
   * OmniRoute goes first when it is configured. It is an OpenAI-compatible
   * gateway that fans a request across providers on its own, so pointing at it
   * replaces this little list with a real router — but it is a long-running
   * server, and until one is up there is nothing at that address. Hence the
   * env var: set OMNIROUTE_URL and it leads, leave it unset and the direct
   * providers carry the traffic exactly as they do now.
   */
  /* The whole request has a budget, not each attempt.
   *
   * Vercel's Hobby plan stops a function at 10 seconds, so a per-attempt
   * timeout longer than that can never fire — the function is killed first and
   * the visitor gets nothing. And attempts add up: two candidates that each
   * hang for their full allowance spend the budget twice over.
   *
   * So the deadline is shared. Each attempt gets whatever is left, capped, and
   * once too little remains to be worth starting the loop stops and answers
   * with what it knows rather than being cut off mid-call. */
  const startedAt = Date.now();
  const TOTAL_BUDGET_MS = 8500;   // under Vercel's 10s, with room to reply
  const PER_TRY_CAP_MS = 5000;    // a healthy completion is 1-3s
  const WORTH_STARTING_MS = 1200;

  const remainingBudget = () => TOTAL_BUDGET_MS - (Date.now() - startedAt);

  const providers = [];

  if (process.env.OMNIROUTE_URL) {
    providers.push({
      name: 'omniroute',
      // Accepts either form, since the README quotes the base with /v1 on it.
      url: process.env.OMNIROUTE_URL.replace(/\/+$/, '').replace(/\/v1$/, '') + '/v1/chat/completions',
      key: process.env.OMNIROUTE_API_KEY || '',
      // "auto" is OmniRoute's own routing: it picks across its provider tiers
      // and falls back internally. Override per deployment if you want one.
      model: process.env.OMNIROUTE_MODEL || 'auto',
    });
  }

  if (process.env.GROQ_API_KEY) {
    // Both of Groq's remaining production text models. 120b answers better,
    // 20b is faster and is the fallback rather than a downgrade anyone chose.
    for (const model of ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']) {
      providers.push({
        name: 'groq',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        key: process.env.GROQ_API_KEY,
        model,
      });
    }
  }

  if (process.env.GEMINI_API_KEY) {
    // A second company, which is the point. Everything above this line is one
    // Groq account: if Groq retires a model, runs out of free quota or has a
    // bad afternoon, every candidate before this one fails together. Gemini
    // has its own free tier, its own limits and its own outages, and it reads
    // Finnish well — which rules out most of the other free options, since a
    // model that answers a Finnish question in stilted Finnish is worse for
    // this site than no chatbot.
    //
    // It sits last because Groq is markedly faster and is normally healthy;
    // this is the net under it, not the default.
    providers.push({
      name: 'gemini',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      key: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
      // Gemini 3 thinks before it answers and those tokens come out of
      // max_tokens, so the 600 that is plenty for Groq leaves nothing for the
      // reply — measured: 600 gave finish_reason "length" with an empty
      // message and 0 completion tokens, twice. At 2000 the thinking takes
      // about 200 and the answer arrives whole in around two seconds.
      // reasoning_effort was the other lever and it was worse: "low" answered
      // but took 25 seconds, and "none" did not come back at all.
      maxTokens: 2000,
    });
  }

  if (!providers.length) {
    console.error('[chat] no provider configured: set GROQ_API_KEY or OMNIROUTE_URL');
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Shared by every candidate except the token budget, which is per provider:
  // a model that thinks before answering needs headroom the others do not.
  const promptMessages = [
    { role: 'system', content: systemForLang },
    ...recentHistory,
  ];
  const DEFAULT_MAX_TOKENS = 600;

  // Remembered across candidates so the visitor is told the truth when every
  // one of them was merely busy, rather than being told the service is broken.
  // Two separate facts: whether anything was rate-limited at all, and how long
  // it asked us to wait. Keying the first on the second was a bug — Gemini
  // returns 429 with no Retry-After header, and that read as "no rate limit
  // seen", so a quota error was reported to the visitor as a dead service.
  let sawRateLimit = false;
  let retryAfter = null;
  let skipProvider = null;

  for (const p of providers) {
    if (p.name === skipProvider) continue;

    const left = remainingBudget();
    if (left < WORTH_STARTING_MS) {
      console.error(`[chat] out of time before ${p.name}/${p.model}`);
      break;
    }

    try {
      // A fallback chain is only worth having if it moves on. Without a
      // deadline a provider that accepts the connection and then goes quiet
      // holds the whole request until the function itself is killed, and the
      // candidates below never get tried — the visitor waits and then gets an
      // apology, which is the exact failure the list exists to prevent.
      const response = await fetch(p.url, {
        method: 'POST',
        signal: AbortSignal.timeout(Math.min(left, PER_TRY_CAP_MS)),
        headers: {
          ...(p.key ? { Authorization: 'Bearer ' + p.key } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: p.model,
          max_tokens: p.maxTokens ?? DEFAULT_MAX_TOKENS,
          messages: promptMessages,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        // An empty completion is a failure of this candidate, not an answer to
        // hand the visitor, so it falls through to the next one.
        if (content) {
          if (p !== providers[0]) console.warn(`[chat] served by fallback ${p.name}/${p.model}`);
          return res.status(200).json({ content });
        }
        console.error(`[chat] ${p.name}/${p.model} returned no content`);
        continue;
      }

      const err = await response.text();
      console.error(`[chat] ${p.name}/${p.model} error:`, response.status, err.slice(0, 300));

      // Being over the rate limit is a different thing from being broken, and
      // the visitor can act on it — waiting works, where retrying a dead
      // service does not. Another provider may well not be limited, so this is
      // remembered and only reported if nothing else answers either.
      if (response.status === 429) {
        sawRateLimit = true;
        retryAfter = response.headers.get('retry-after') || retryAfter;
        // A rate limit belongs to the account, not the model, so the other
        // entries for this same provider will fail identically. Skip straight
        // to the next provider rather than spending a round trip proving it.
        skipProvider = p.name;
      }
    } catch (err) {
      // Network-level failure reaching this candidate: unreachable OmniRoute,
      // DNS, timeout. Same treatment — try the next one, but not the other
      // models at the same host: if it did not answer, it will not answer for
      // a different model name either, and the budget is better spent
      // elsewhere.
      console.error(`[chat] ${p.name}/${p.model} unreachable:`, String(err.message ?? err));
      skipProvider = p.name;
    }
  }

  if (sawRateLimit) {
    if (retryAfter) res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'rate_limited' });
  }
  return res.status(502).json({ error: 'AI service unavailable' });
};
