/**
 * Selora Blog Post Generator
 * Picks the next pending topic, generates Finnish content via Claude API,
 * writes the post HTML, rotates cards in blogi.html, and updates sitemap.xml.
 *
 * Usage:
 *   node generate-post.js           — generate and publish
 *   node generate-post.js --dry-run — generate only, print HTML to stdout
 */

import 'dotenv/config';
import { JSDOM } from 'jsdom';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOPICS_PATH = resolve(ROOT, 'scripts/blog-topics.json');
const BLOGI_PATH = resolve(ROOT, 'blogi.html');
const SITEMAP_PATH = resolve(ROOT, 'sitemap.xml');
const BLOGI_DIR = resolve(ROOT, 'blogi');

// ─── Unsplash fallback photo IDs by category ────────────────────────────────
const FALLBACK_IMAGES = {
  toimiala: 'photo-1497366216548-37526070297c', // office/business
  opas:     'photo-1499750310107-5fef28a66643', // laptop/learning
  ongelma:  'photo-1516321318423-f06f85e504b3', // phone/problem
};

// ─── Arrow SVG shared by all cards ──────────────────────────────────────────
const ARROW_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>`;
const CLOCK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;
const BACK_SVG  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;

// ─── Hero gradient per category ─────────────────────────────────────────────
const HERO_GRADIENTS = {
  ongelma:  'rgba(194,65,12,0.15)',
  opas:     'rgba(5,150,105,0.15)',
  toimiala: 'rgba(29,78,216,0.18)',
};

// ─── Cat-badge CSS class per category ───────────────────────────────────────
const CAT_CLASS = {
  ongelma:  'cat-ongelma',
  opas:     'cat-opas',
  toimiala: 'cat-toimiala',
};

// ────────────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────────────
async function main() {
  const topic = await pickNextTopic();
  if (!topic) {
    console.log('No pending topics in blog-topics.json. Add more topics and try again.');
    return;
  }

  console.log(`[generate-post] Topic: "${topic.title_hint}" (${topic.category})`);

  if (!DRY_RUN) await markTopic(topic.id, 'in-progress');

  let content;
  try {
    content = await generateContent(topic);
    console.log(`[generate-post] Generated: "${content.title}" → ${content.slug}`);
  } catch (err) {
    if (!DRY_RUN) await markTopic(topic.id, 'pending');
    throw new Error(`OpenRouter API failed: ${err.message}`);
  }

  const imageUrl = await fetchUnsplashImage(topic.unsplash_query, topic.category);
  console.log(`[generate-post] Image: ${imageUrl.slice(0, 80)}...`);

  // Extract shared chunks from an existing post (CSS, nav, footer, scripts)
  const sharedChunks = await extractSharedChunks();

  const postHtml = buildPostHTML(content, imageUrl, sharedChunks);

  if (DRY_RUN) {
    console.log('\n─── DRY RUN: Generated HTML ───\n');
    console.log(postHtml);
    console.log('\n─── DRY RUN: Generated JSON ───\n');
    console.log(JSON.stringify(content, null, 2));
    return;
  }

  // Write post file
  await mkdir(BLOGI_DIR, { recursive: true });
  const postPath = resolve(BLOGI_DIR, `${content.slug}.html`);
  await writeFile(postPath, postHtml, 'utf8');
  console.log(`[generate-post] Wrote: blogi/${content.slug}.html`);

  // Update blog index
  await updateBlogiIndex(content, imageUrl);
  console.log('[generate-post] Updated: blogi.html');

  // Update sitemap
  await updateSitemap(content.slug);
  console.log('[generate-post] Updated: sitemap.xml');

  await markTopic(topic.id, 'done');
  console.log(`[generate-post] Done. Topic "${topic.id}" marked as done.`);
}

// ────────────────────────────────────────────────────────────────────────────
// TOPIC QUEUE
// ────────────────────────────────────────────────────────────────────────────
async function pickNextTopic() {
  const data = JSON.parse(await readFile(TOPICS_PATH, 'utf8'));
  return data.topics.find(t => t.status === 'pending') || null;
}

async function markTopic(id, status) {
  const data = JSON.parse(await readFile(TOPICS_PATH, 'utf8'));
  const topic = data.topics.find(t => t.id === id);
  if (topic) topic.status = status;
  await writeFile(TOPICS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ────────────────────────────────────────────────────────────────────────────
// CLAUDE API
// ────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Olet Seloran sisältötiimi. Selora on suomalainen tekoälyvastaanottaja-SaaS, joka palvelee suomalaisia pk-yrittäjiä: fysioterapeutteja, parturikampaamoita, ravintoloita, kiinteistövälittäjiä, autohuoltoja, kauneushoitoloita ja muita pienyrittäjiä.

Kirjoitat blogi-artikkeleita, jotka:
1. On kirjoitettu täysin suomeksi — ei yhtäkään englanninkielistä lausetta
2. Ovat ammattimaisia mutta lähestyttäviä — yrittäjä tunnistaa oman tilanteensa
3. Eivät ole myyntipuhetta — ne ovat oikeasti hyödyllisiä oppaita tai analyysejä
4. Sisältävät konkreettisia lukuja, esimerkkejä ja laskelmaruutuja aina kun mahdollista
5. Päättyvät luontevaan toimintakehotukseen (maksuton demo)

Seloran faktat (käytä näitä tarkasti):
- Hinnat: Aloitus 490 €/kk, Kasvu 890 €/kk
- Käyttöönotto alle 48 tunnissa
- 78 % vastaamattomista puheluista palautuu Seloran avulla
- Palvelimet EU:ssa, GDPR-yhteensopiva

Älä keksi tilastoja — käytä todellisia tai mainitse "arvio" tai "arviolta".
Kirjoita yrittäjälle, ei tekniselle asiantuntijalle.`;

async function generateContent(topic) {
  const today = new Date();
  const finnishMonths = [
    'tammikuuta','helmikuuta','maaliskuuta','huhtikuuta','toukokuuta','kesäkuuta',
    'heinäkuuta','elokuuta','syyskuuta','lokakuuta','marraskuuta','joulukuuta'
  ];
  const publishDate = `${today.getDate()}. ${finnishMonths[today.getMonth()]} ${today.getFullYear()}`;

  const userPrompt = `Kirjoita blogi-artikkeli seuraavasta aiheesta:

Aihevinkki: ${topic.title_hint}
Kategoria: ${topic.category}  (ongelma = Ongelma→Ratkaisu, opas = Käytännön opas, toimiala = Toimialaopas)
Avainsanat: ${topic.keywords.join(', ')}
Julkaisupäivä: ${publishDate}

Palauta VAIN validi JSON-objekti alla olevalla rakenteella. Ei markdown-koodiblokeja, ei selityksiä — pelkkä JSON.

{
  "title": "Artikkelin otsikko suomeksi (ytimekäs, max 80 merkkiä)",
  "accentWord": "yksi sana tai lyhyt fraasi otsikosta joka laitetaan kursiviin (Instrument Serif -fontilla)",
  "slug": "url-friendly-slug-ilman-pistetta-tai-html-paatetta",
  "category": "${topic.category}",
  "categoryLabel": "Ihmisluettava kategoriamerkki suomeksi (esim. Toimialaopas | Ongelma → Ratkaisu | Käytännön opas | Vertailu)",
  "readTime": 7,
  "publishDate": "${publishDate}",
  "excerpt": "Lyhyt kuvaus kortille, max 110 merkkiä, ei pistettä lopussa",
  "heroLead": "Ingressiteksti artikkelin herolle, 1–2 virkettä, max 200 merkkiä",
  "ctaHeading": "Lyhyt CTA-otsikko artikkelin loppuun (max 60 merkkiä)",
  "ctaBody": "CTA-alaviesti, max 120 merkkiä. Mainitse maksuton demo tai varaa puhelu.",
  "sections": [
    { "type": "h2", "text": "Osion otsikko" },
    { "type": "p", "text": "Kappaleteksti." },
    {
      "type": "stat",
      "number": "78",
      "unit": "%",
      "description": "Kuvaus tilastosta (voi sisältää <strong>bold</strong>-tagia)"
    },
    {
      "type": "pull-quote",
      "text": "Lainaus tai keskeinen väite.",
      "cite": "Lähde tai henkilö"
    },
    {
      "type": "calc",
      "heading": "Esimerkkilaskelma: otsikko",
      "rows": [
        { "label": "Rivi 1", "value": "123 €", "total": false },
        { "label": "Yhteensä / Tulos", "value": "1 234 €", "total": true }
      ]
    },
    {
      "type": "roi",
      "heading": "ROI-otsikko",
      "rows": [
        { "label": "Seloran maksu", "value": "490 €/kk", "highlight": false },
        { "label": "ROI ensimmäisenä vuonna", "value": "+430%", "highlight": true }
      ]
    }
  ]
}

Ohjeet sections-kenttään:
- Kirjoita 6–9 osiota yhteensä
- Yhdistelmä: h2-otsikoita, p-kappaleita ja vähintään yksi erikoisblokki (stat, pull-quote, calc tai roi)
- Artikkelin kokonaiswordcount: 700–900 sanaa
- Älä lisää artikkelin CTA:ta sections-listaan — se generoidaan automaattisesti ctaHeading- ja ctaBody-kentistä`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b:free',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const raw = json.choices[0].message.content.trim();

  // Strip markdown code block if Claude wrapped it anyway
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(`Claude returned invalid JSON. Raw:\n${raw}`);
  }

  // Validate required fields
  const required = ['title', 'slug', 'category', 'categoryLabel', 'readTime', 'publishDate',
                    'excerpt', 'heroLead', 'ctaHeading', 'ctaBody', 'sections'];
  for (const field of required) {
    if (!parsed[field]) throw new Error(`Claude response missing field: ${field}`);
  }

  // Ensure slug is URL-safe
  parsed.slug = parsed.slug
    .toLowerCase()
    .replace(/[äå]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '');

  return parsed;
}

// ────────────────────────────────────────────────────────────────────────────
// UNSPLASH
// ────────────────────────────────────────────────────────────────────────────
async function fetchUnsplashImage(query, category) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    console.warn('[generate-post] No UNSPLASH_ACCESS_KEY — using fallback image.');
    return fallbackImageUrl(category);
  }

  try {
    const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Unsplash API ${res.status}`);
    const json = await res.json();
    return json.urls.raw + '&w=1400&q=85&auto=format&fit=crop';
  } catch (err) {
    console.warn(`[generate-post] Unsplash failed (${err.message}) — using fallback.`);
    return fallbackImageUrl(category);
  }
}

function fallbackImageUrl(category) {
  const photoId = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.opas;
  return `https://images.unsplash.com/${photoId}?w=1400&q=85&auto=format&fit=crop`;
}

// ────────────────────────────────────────────────────────────────────────────
// SHARED CHUNKS (extracted from existing post to stay in sync)
// ────────────────────────────────────────────────────────────────────────────
async function extractSharedChunks() {
  const src = await readFile(resolve(BLOGI_DIR, 'menetettyjen-puhelujen-hinta.html'), 'utf8');

  // Extract <style>...</style>
  const styleMatch = src.match(/<style>([\s\S]*?)<\/style>/);
  const style = styleMatch ? styleMatch[1] : '';

  // Extract NAV block (header element)
  const navMatch = src.match(/<!-- NAV -->([\s\S]*?)<!-- ARTICLE HERO -->/);
  const nav = navMatch ? navMatch[0].replace('<!-- ARTICLE HERO -->', '') : '';

  // Extract FOOTER block
  const footerMatch = src.match(/<!-- FOOTER -->([\s\S]*?)<!-- MOBILE MENU -->/);
  const footer = footerMatch ? footerMatch[0].replace('<!-- MOBILE MENU -->', '') : '';

  // Extract MOBILE MENU block
  const mobileMenuMatch = src.match(/<!-- MOBILE MENU -->([\s\S]*?)<script>/);
  const mobileMenu = mobileMenuMatch ? mobileMenuMatch[0].replace(/<script>$/, '') : '';

  // Extract inline scripts (after mobile menu, before cookie banner)
  const scriptsMatch = src.match(/<script>\n\(function\(\)\{[\s\S]*?<\/script>\n\n<!-- GDPR/);
  const scripts = scriptsMatch ? scriptsMatch[0].replace('\n\n<!-- GDPR', '') : '';

  // Extract cookie banner block
  const cookieMatch = src.match(/<!-- GDPR Cookie Banner -->([\s\S]*?)<script src="\/chatbot/);
  const cookieBanner = cookieMatch ? cookieMatch[0].replace('<script src="/chatbot', '') : '';

  return { style, nav, footer, mobileMenu, scripts, cookieBanner };
}

// ────────────────────────────────────────────────────────────────────────────
// BUILD POST HTML
// ────────────────────────────────────────────────────────────────────────────
function buildPostHTML(content, imageUrl, chunks) {
  const { title, accentWord, slug, category, categoryLabel, readTime,
          publishDate, heroLead, ctaHeading, ctaBody, sections } = content;

  const gradient = HERO_GRADIENTS[category] || HERO_GRADIENTS.opas;
  const catClass  = CAT_CLASS[category] || 'cat-opas';

  // Inject accent span into title for <h1>
  const titleHtml = accentWord && title.includes(accentWord)
    ? title.replace(accentWord, `<span class="accent">${accentWord}</span>`)
    : title;

  const sectionsHtml = sections.map(renderSection).join('\n\n    ');

  // Override hero gradient in style block (replaces the ongelma-specific one from the template)
  const style = chunks.style.replace(
    /\.article-hero::before \{[^}]+\}/,
    `.article-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 50% 0%, ${gradient} 0%, transparent 70%); pointer-events: none; }`
  );

  // Thumbnail URL (smaller for the featured image display)
  const thumbUrl = imageUrl.replace('w=1400', 'w=900');

  return `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)} – Selora Blogi</title>
  <meta name="description" content="${escHtml(content.excerpt)}" />
  <link rel="icon" type="image/jpeg" href="../selora-logo.jpeg" />
  <meta property="og:title" content="${escHtml(title)}" />
  <meta property="og:description" content="${escHtml(content.excerpt)}" />
  <meta property="og:image" content="https://www.selora.fi/selora-logo.jpeg" />
  <meta property="og:url" content="https://www.selora.fi/blogi/${slug}.html" />
  <meta property="og:type" content="article" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet" />
  <style>${style}</style>
  <script defer data-domain="selora.fi" src="https://plausible.io/js/script.js"></script>
</head>
<body>

${chunks.nav}
<!-- ARTICLE HERO -->
<section class="article-hero">
  <div class="article-hero-inner">
    <div class="article-meta-top">
      <span class="cat-badge ${catClass}">${escHtml(categoryLabel)}</span>
      <span class="article-date">${escHtml(publishDate)}</span>
      <span class="article-readtime">· ${readTime} min lukuaika</span>
    </div>
    <h1>${titleHtml}</h1>
    <p class="article-hero-lead">${escHtml(heroLead)}</p>
    <div class="article-author">
      <div class="author-avatar">NT</div>
      <div class="author-info">
        <div class="author-name">Noah Tuokkola</div>
        <div class="author-role">Perustaja, Selora</div>
      </div>
    </div>
  </div>
</section>

<!-- FEATURED IMAGE -->
<div class="article-featured-img">
  <img src="${thumbUrl}" alt="${escHtml(title)}" loading="eager" />
</div>

<!-- ARTICLE BODY -->
<div class="article-body-wrap">
  <a href="../blogi.html" class="back-link">
    ${BACK_SVG}
    Takaisin blogiin
  </a>

  <div class="article-body reveal">
    ${sectionsHtml}
  </div>

  <div class="article-cta reveal">
    <h3>${escHtml(ctaHeading)}</h3>
    <p>${escHtml(ctaBody)}</p>
    <a href="../yhteystiedot.html" class="btn btn-light" style="font-size:0.9rem;padding:0.85rem 2rem;">Varaa maksuton demo →</a>
  </div>
</div>

${chunks.footer}
${chunks.mobileMenu}
${chunks.scripts}
${chunks.cookieBanner}
  <script src="/chatbot.js" defer></script>
</body>
</html>`;
}

// ─── Section renderers ────────────────────────────────────────────────────────
function renderSection(s) {
  switch (s.type) {
    case 'h2': return `<h2>${escHtml(s.text)}</h2>`;
    case 'h3': return `<h3>${escHtml(s.text)}</h3>`;
    case 'p':  return `<p>${s.text}</p>`; // allow <strong> tags from Claude

    case 'stat': return `<div class="stat-highlight">
      <div class="stat-num">${escHtml(s.number)}<span>${escHtml(s.unit)}</span></div>
      <div class="stat-desc">${s.description}</div>
    </div>`;

    case 'pull-quote': return `<div class="pull-quote">
      <p>"${escHtml(s.text)}"</p>
      <cite>${escHtml(s.cite)}</cite>
    </div>`;

    case 'calc': return `<div class="calc-box">
      <h3>${escHtml(s.heading)}</h3>
      ${s.rows.map(r => `<div class="calc-row${r.total ? ' total' : ''}">
        <span class="calc-label">${escHtml(r.label)}</span>
        <span class="calc-value">${escHtml(r.value)}</span>
      </div>`).join('')}
    </div>`;

    case 'roi': return `<div class="roi-card">
      <h3>${escHtml(s.heading)}</h3>
      ${s.rows.map(r => `<div class="roi-row${r.highlight ? ' highlight' : ''}">
        <span class="label">${escHtml(r.label)}</span>
        <span class="value">${escHtml(r.value)}</span>
      </div>`).join('')}
    </div>`;

    default: return '';
  }
}

function escHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ────────────────────────────────────────────────────────────────────────────
// UPDATE BLOGI.HTML — card rotation with jsdom
// ────────────────────────────────────────────────────────────────────────────
async function updateBlogiIndex(content, imageUrl) {
  const { title, slug, category, categoryLabel, readTime, publishDate, excerpt } = content;

  const html = await readFile(BLOGI_PATH, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Thumbnail URL for index card
  const thumbUrl = imageUrl.replace('w=1400', 'w=800');

  // ── 1. Read existing cards ──────────────────────────────────────────────
  const featuredCard = doc.querySelector('.blog-card-featured');
  const smallCards = [...doc.querySelectorAll('.blog-card-small')];

  if (!featuredCard) throw new Error('Could not find .blog-card-featured in blogi.html');

  // ── 2. Build new featured card ──────────────────────────────────────────
  const newFeatured = buildFeaturedCardElement(doc, {
    href: `blogi/${slug}.html`,
    imgSrc: thumbUrl,
    imgAlt: title,
    category,
    categoryLabel,
    publishDate,
    readTime,
    title,
    excerpt,
  });

  // ── 3. Demote old featured → small card ────────────────────────────────
  const demoted = demoteFeaturedToSmall(doc, featuredCard);

  // ── 4. Handle secondary grid (for overflow posts) ──────────────────────
  if (smallCards.length >= 2) {
    const oldSmall2 = smallCards[1].cloneNode(true);
    // Move old small card 2 into secondary grid
    insertIntoSecondaryGrid(doc, oldSmall2);
  }

  // ── 5. Reconstruct primary grid ────────────────────────────────────────
  const primaryGrid = doc.querySelector('.blog-grid');
  // Clear existing cards but keep any non-card children (comments, etc.)
  [...primaryGrid.children].forEach(child => {
    if (child.classList && (child.classList.contains('blog-card-featured') ||
        child.classList.contains('blog-cards-right'))) {
      child.remove();
    }
  });

  primaryGrid.insertAdjacentHTML('afterbegin', '');

  // Build right column
  const rightCol = doc.createElement('div');
  rightCol.className = 'blog-cards-right';

  // New small card 1 = demoted old featured
  rightCol.appendChild(demoted);

  // New small card 2 = old small card 1 (unchanged)
  if (smallCards.length >= 1) {
    rightCol.appendChild(smallCards[0].cloneNode(true));
  }

  // Insert into primary grid: featured first, then right column
  primaryGrid.insertBefore(rightCol, primaryGrid.firstChild);
  primaryGrid.insertBefore(newFeatured, primaryGrid.firstChild);

  await writeFile(BLOGI_PATH, dom.serialize(), 'utf8');
}

function buildFeaturedCardElement(doc, { href, imgSrc, imgAlt, category, categoryLabel,
                                          publishDate, readTime, title, excerpt }) {
  const catClass = CAT_CLASS[category] || 'cat-opas';

  const a = doc.createElement('a');
  a.href = href;
  a.className = `blog-card blog-card-featured`;
  a.setAttribute('data-categories', category);

  a.innerHTML = `
        <img
          class="blog-card-image"
          src="${imgSrc}"
          alt="${escHtml(imgAlt)}"
          loading="eager"
        />
        <div class="blog-card-overlay"></div>
        <div class="blog-card-overlay-top"></div>
        <div class="blog-card-content">
          <div class="card-top">
            <span class="cat-badge ${catClass}"><span class="cat-dot"></span>${escHtml(categoryLabel)}</span>
          </div>
          <div class="card-bottom">
            <div class="card-meta">
              <span class="card-meta-item">
                ${CLOCK_SVG}
                ${escHtml(publishDate)}
              </span>
              <span class="card-meta-item">
                ${CLOCK_SVG}
                ${readTime} min lukuaika
              </span>
            </div>
            <h2 class="card-title-featured">${escHtml(title)}</h2>
            <p class="card-excerpt-featured">${escHtml(excerpt)}</p>
            <div class="card-arrow">${ARROW_SVG}</div>
          </div>
        </div>`;

  return a;
}

function demoteFeaturedToSmall(doc, featuredCard) {
  const small = featuredCard.cloneNode(true);

  // Update classes
  small.className = small.className
    .replace('blog-card-featured', 'blog-card-small');

  // h2 → h3, class card-title-featured → card-title-small
  const h2 = small.querySelector('h2.card-title-featured');
  if (h2) {
    const h3 = doc.createElement('h3');
    h3.className = 'card-title-small';
    h3.textContent = h2.textContent;
    h2.replaceWith(h3);
  }

  // excerpt class
  const excerpt = small.querySelector('.card-excerpt-featured');
  if (excerpt) excerpt.className = 'card-excerpt';

  // Remove date meta item (small cards only show read time)
  const metaItems = [...small.querySelectorAll('.card-meta-item')];
  // The first meta item is the date (for featured), second is read time
  // Small cards in the existing HTML only have 1 meta item (read time)
  if (metaItems.length >= 2) {
    metaItems[0].remove();
  }

  // Change image loading to lazy
  const img = small.querySelector('img');
  if (img) img.setAttribute('loading', 'lazy');

  return small;
}

function insertIntoSecondaryGrid(doc, card) {
  let secondaryGrid = doc.querySelector('.blog-grid-secondary');

  if (!secondaryGrid) {
    // Create the secondary grid and insert it after the primary grid
    secondaryGrid = doc.createElement('div');
    secondaryGrid.className = 'blog-grid-secondary reveal reveal-delay-2';

    const primaryGrid = doc.querySelector('.blog-grid');
    if (primaryGrid && primaryGrid.parentNode) {
      primaryGrid.parentNode.insertBefore(secondaryGrid, primaryGrid.nextSibling);
    }
  }

  // If already 3 cards in secondary grid, remove the oldest (last) one
  const existingCards = secondaryGrid.querySelectorAll('.blog-card');
  if (existingCards.length >= 3) {
    existingCards[existingCards.length - 1].remove();
  }

  // Insert at the beginning (newest first)
  secondaryGrid.insertBefore(card, secondaryGrid.firstChild);
}

// ────────────────────────────────────────────────────────────────────────────
// UPDATE SITEMAP
// ────────────────────────────────────────────────────────────────────────────
async function updateSitemap(slug) {
  const xml = await readFile(SITEMAP_PATH, 'utf8');
  const today = new Date().toISOString().split('T')[0];

  const entry = `
  <url>
    <loc>https://www.selora.fi/blogi/${slug}.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <lastmod>${today}</lastmod>
  </url>
`;

  const updated = xml.replace('</urlset>', entry + '</urlset>');
  await writeFile(SITEMAP_PATH, updated, 'utf8');
}

// ────────────────────────────────────────────────────────────────────────────
// RUN
// ────────────────────────────────────────────────────────────────────────────
main().catch(err => {
  console.error('[generate-post] Fatal error:', err.message);
  process.exit(1);
});
