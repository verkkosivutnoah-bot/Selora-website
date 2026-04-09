# SELORA WEBSITE

This is the Selora website project — a Finnish AI phone receptionist SaaS. All files are plain HTML/CSS/JS with no build step, no frameworks, no dependencies beyond Google Fonts.

---

## Project Overview

**Company:** Selora
**Product:** AI-powered phone receptionist for Finnish SMBs
**Language:** Finnish (fi)
**Stack:** Vanilla HTML + CSS + JS only. No React, no Node, no bundler.
**Font:** Inter (primary) + Instrument Serif italic (accent/headlines only)

---

## File Structure

| File | Description |
|------|-------------|
| `index.html` | Main landing page — hero, stats, services overview, how-it-works, live demo, ROI calculator, features grid, benefits, testimonials, pricing teaser, integrations, CTA, footer |
| `palvelut.html` | Services page |
| `hinnoittelu.html` | Pricing page with monthly/yearly toggle |
| `yhteystiedot.html` | Contact page with Formspree form + Calendly embed |
| `blogi.html` | Blog index — card grid, category filters, newsletter strip |
| `tekoalyvastaanottajat.html` | AI receptionist service detail page |
| `verkkosivusuunnittelu.html` | Web design service detail page |
| `sahkopostiautomaatio.html` | Email automation service detail page |

**Deleted:** `prosessi.html` — its content was merged into `index.html#prosessi`

---

## Design System

### Colors
```css
--blue: #1D4ED8;          /* primary brand blue */
--blue-light: #60A5FA;    /* light blue accents */
--text-muted: #64748b;    /* body copy muted */

/* Dark section backgrounds */
#060c18   /* hero / demo section */
#080e1c   /* ROI calculator section */
#f8fafc   /* light body background */
```

### Typography
- **Body / UI:** `'Inter'`, weights 300 (body), 400, 500, 600
- **Accent (headlines only):** `'Instrument Serif'`, `font-style: italic` — used inside `.accent` spans
- **Section labels:** 0.68rem, weight 500, letter-spacing 0.18em, uppercase, blue
- **Section headings:** `clamp(2rem, 4vw, 2.75rem)`, weight 300, letter-spacing -0.025em

### Shared CSS Patterns
```css
.btn           /* base button */
.btn-light     /* white bg, dark text — on dark sections */
.btn-ghost     /* transparent + border */
.reveal        /* scroll animation: opacity 0 → 1, translateY 18px → 0 */
.reveal-delay-1/.reveal-delay-2/.reveal-delay-3  /* 0.1s / 0.2s / 0.3s delays */
.section-label /* eyebrow text above headings */
.section-heading .accent  /* italic Instrument Serif accent word */
.container     /* max-width: 1160px, centered, padding 0 2rem */
```

### Section Background Pattern
- **Dark sections** use `background: #060c18` or `#080e1c`
- **Light alternating sections** use `background: #eef2f7` (`.section-alt`)
- **Default sections** use the body `#f8fafc`

---

## Key Sections on index.html

| Section | ID / Anchor | Notes |
|---------|-------------|-------|
| Announcement banner | — | Links to `#roi` |
| Hero | — | Canvas blob animation, CTA buttons |
| Stats bar | — | Animated counters on scroll |
| Services teaser | — | 3-column grid |
| How it works | `#prosessi` | 4-step timeline, dark bg `#060c18` |
| Feature grid | — | 8 features, 4-col grid |
| Benefits | — | Left/right split layout |
| Testimonials | — | 3-col card grid |
| Pricing teaser | — | 2 plan cards + link to hinnoittelu.html |
| Integrations | — | Logo grid |
| Live Demo | `#demo` | Dark animated section, conversation preview loop (3 scripts: barbershop, restaurant, real estate), IntersectionObserver triggered |
| ROI Calculator | `#roi` | Dark section, 2 sliders → count-up stats + Canvas chart, IntersectionObserver triggered |
| CTA block | — | Full-width CTA |
| Footer | — | 4-col links grid |

---

## JavaScript Patterns

### Scroll Animations
```js
// IntersectionObserver — all .reveal elements
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('in-view') });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
```

### Canvas Blob Animation (hero sections)
- `drawBlob()` on `requestAnimationFrame`
- Organic blob using sine waves + Bézier curves
- Color: `rgba(29,78,216,0.18)` blue glow

### Animated CSS Grid Background (demo section)
```css
.demo-full-section::before {
  background-image: linear-gradient(rgba(96,165,250,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(96,165,250,0.04) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: gridDrift 20s linear infinite;
}
@keyframes gridDrift { from { background-position: 0 0; } to { background-position: 40px 40px; } }
```

### Live Demo Conversation Loop
- 3 scenarios: `scenarios[]` array with `title`, `messages[]`
- Each message: `{ side: 'ai'|'user', text: '...' }`
- Uses IntersectionObserver to start on scroll
- Typing indicator (3 animated dots) before each message
- Loops automatically through all 3 scenarios

### ROI Calculator
- Two sliders: `#sl-leadval` (100–15000 €), `#sl-missed` (1–50 calls/day)
- `roiCalc()` → updates `#roi-daily`, `#roi-monthly`, `#roi-annual`, `#roi-selora-amount`
- Selora recovery estimate: **78%** of missed calls recovered
- `fillTrack(slider)` — gradient fill on slider track
- `animateVal(id, toVal)` — rAF count-up with ease-out cubic
- `drawChart()` — Canvas API line chart with glow, area fill, milestone dots
- Triggered on first scroll into view via IntersectionObserver

---

## Navigation Structure

All pages share the same nav (no Prosessi link — that page was deleted):
```html
<a href="index.html">Etusivu</a>
<a href="palvelut.html">Palvelut</a>
<a href="hinnoittelu.html">Hinnoittelu</a>
<a href="blogi.html">Blogi</a>
<a href="yhteystiedot.html">Yhteystiedot</a>
```

CTA button in nav: `<a href="yhteystiedot.html" class="btn btn-light">Varaa puhelu →</a>`

---

## Footer Structure

4 columns: **Selora** (logo + tagline + socials), **Palvelut** (service links), **Yritys** (company links), **Ota yhteyttä** (contact info)

---

## Blog (blogi.html)

- 1 featured card (large) + 2 small right-column cards + 3 secondary cards ("Tulossa pian")
- Category filter buttons: `data-filter="kaikki|toimiala|opas|teknologia"`
- Cards use `data-categories="toimiala opas"` etc.
- Filter JS: `.filtered-out` class adds `opacity: 0.18; pointer-events: none; filter: grayscale(0.4)`
- Newsletter strip at bottom (no backend yet)

---

## Pricing (hinnoittelu.html)

- Monthly/yearly toggle — **yearly is default ON**
- Monthly prices shown with `display: 'inline'` (not `display: ''`) to avoid CSS override
- Two plans: Aloitus (~490€/kk) + Kasvu (~890€/kk)

---

## Contact (yhteystiedot.html)

- Form uses **Formspree** — endpoint needs to be configured (TODO)
- Calendly embed: `https://calendly.com/noah-tuokkola08/30min`

---

## SEO / Meta

All pages have custom `<meta name="description">` tags. Sitemap and robots.txt not yet created.

---

## Pending Tasks

- [ ] **Formspree**: Add real endpoint to contact form in `yhteystiedot.html`
- [ ] **Favicon**: Create and add favicon to all pages
- [ ] **sitemap.xml** + **robots.txt**: Create for SEO
- [ ] **Blog backend**: Set up automated blog post creation/posting
- [ ] **Newsletter**: Wire subscription form backend (user said: later)
- [ ] **Blog articles**: Write and publish actual blog posts (currently 3 "coming soon")

---

## Notes & Gotchas

- `index-91bf7433.html` is an old backup file — ignore it
- Watermark in blogi.html uses `display: block; margin-bottom: -1.9rem; overflow: hidden; white-space: nowrap` (in-flow clipping, NOT position:absolute — that caused bleed-through)
- All dark sections use `color: #fff` for headings, `rgba(255,255,255,0.5)` for body
- Ghost buttons inside light sections need dark styling: `color: #1e293b; border-color: rgba(15,23,42,0.22)`
- Do NOT use `display: ''` to show hidden elements — always use `display: 'inline'` or `display: 'block'`
- The `#prosessi` section on index.html replaced the deleted prosessi.html page entirely
