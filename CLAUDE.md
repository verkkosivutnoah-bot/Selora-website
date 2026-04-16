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

### Website
- [ ] **Formspree**: Add real endpoint to contact form in `yhteystiedot.html`
- [ ] **Favicon**: Create and add favicon to all pages
- [ ] **sitemap.xml** + **robots.txt**: Create for SEO
- [ ] **Blog backend**: Set up automated blog post creation/posting
- [ ] **Newsletter**: Wire subscription form backend (user said: later)
- [ ] **Blog articles**: Write and publish actual blog posts (currently 3 "coming soon")

### Client Portal (priority)
- [ ] **Deploy Edge Functions**: `supabase functions deploy generate-demo-agent` + `supabase functions deploy create-web-call`
- [ ] **Set secrets**: `ANTHROPIC_API_KEY` + `RETELL_API_KEY` via `supabase secrets set` or dashboard
- [ ] **Run SQL schema**: Execute `supabase-setup.sql` in Supabase SQL editor
- [ ] **Email automation**: Onboarding email sequence for new signups (planned, not started)

---

## Notes & Gotchas

- `index-91bf7433.html` is an old backup file — ignore it
- Watermark in blogi.html uses `display: block; margin-bottom: -1.9rem; overflow: hidden; white-space: nowrap` (in-flow clipping, NOT position:absolute — that caused bleed-through)
- All dark sections use `color: #fff` for headings, `rgba(255,255,255,0.5)` for body
- Ghost buttons inside light sections need dark styling: `color: #1e293b; border-color: rgba(15,23,42,0.22)`
- Do NOT use `display: ''` to show hidden elements — always use `display: 'inline'` or `display: 'block'`
- The `#prosessi` section on index.html replaced the deleted prosessi.html page entirely

---

## Client Portal

The website has a full client portal built with Supabase Auth + vanilla HTML/JS. No frameworks.

### Auth Pages
| File | Description |
|------|-------------|
| `kirjaudu.html` | Sign-in page — Supabase email+password, forgot password, Finnish error messages |
| `rekisteroidy.html` | Sign-up page — name, company, phone, email, password with live strength meter |
| `dashboard.html` | Main client dashboard — dark themed, Siri orb call widget, 3 views, 3 states |
| `onboarding.html` | 7-step questionnaire — collects business info, then calls Edge Function to create Retell agent |

### Supabase Project
- **Project URL:** `https://zubhxdlssoochwbwyxlp.supabase.co`
- **Anon key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Ymh4ZGxzc29vY2h3Ynd5eGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTM1ODQsImV4cCI6MjA5MTg2OTU4NH0.czrg_VzVMobfT0lMSZhggBYSV-VEIcggmufUOCntexU`
- **Project ref:** `zubhxdlssoochwbwyxlp`

### Database Schema (`supabase-setup.sql`)
Four tables, all with RLS enabled:

| Table | Key columns | Notes |
|-------|-------------|-------|
| `profiles` | `id` (FK auth.users), `full_name`, `company_name`, `phone`, `has_active_plan` (bool), `plan_type` ('demo'\|'aloitus'\|'kasvu') | Auto-created by trigger on signup |
| `onboarding` | `user_id`, `business_name`, `industry`, `city`, `services`, `hours`, `tasks` (text[]), `tone`, `language`, `extra_info`, `completed_at`, `agent_generated` (bool) | One row per user |
| `retell_agents` | `user_id`, `retell_agent_id`, `agent_name`, `system_prompt`, `voice_id`, `active` (bool), `demo_calls_used` (int), `demo_calls_limit` (int, default 5), `onboarding_id` | Created by generate-demo-agent Edge Function |
| `call_logs` | `user_id`, `agent_id`, `caller_number`, `called_at`, `duration_secs`, `outcome` ('completed'\|'missed'\|'transferred'\|'voicemail'\|'in_progress'), `summary` | Populated by create-web-call + Retell webhooks |

**Admin function:** `upgrade_user_plan(target_user_id UUID, new_plan TEXT)` — sets `has_active_plan=true` and `plan_type`.

### Edge Functions (`supabase/functions/`)

#### `generate-demo-agent/index.ts`
Called from `onboarding.html` after questionnaire submission.
1. Authenticates user via JWT
2. Calls **Claude Opus** with business details → generates personalised Finnish agent system prompt
3. Creates agent in **Retell AI** (`POST /v2/create-agent`) with voice `fi-FI-SelmaNeural`
4. Saves agent to `retell_agents` table
5. Returns `{ success, agent_id, agent_name }`

**Required secrets:** `ANTHROPIC_API_KEY`, `RETELL_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

#### `create-web-call/index.ts`
Called from `dashboard.html` when user clicks the Siri orb / call button.
1. Authenticates user, verifies they own the agent
2. Checks demo call limit (5 calls max unless `has_active_plan=true`)
3. Calls **Retell AI** (`POST /v2/create-web-call`) → gets `access_token`
4. Increments `demo_calls_used` in `retell_agents`
5. Logs call in `call_logs`
6. Returns `{ access_token }` to frontend

**Required secrets:** `RETELL_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### Dashboard States
The dashboard (`dashboard.html`) detects user state on load and renders accordingly:
- **No onboarding** (`onboarding.completed_at` is null) → Welcome card + "Luo oma agenttini →" CTA → links to `onboarding.html`
- **Demo** (`has_active_plan=false`, onboarding done) → Siri orb call widget, demo progress bar (x/5 calls), upgrade nudge
- **Active client** (`has_active_plan=true`) → Full stats, unlimited call widget, call log

### Siri Orb
The call widget uses the exact same Siri orb animation as `index.html#demo`:
- CSS `@property --siri-angle` + conic-gradient + `blur(18px) contrast(1.9)` = fluid colour blob
- States: `idle → connecting → listening → speaking → ended`
- Breathing rings (`.orb-ring`) pulse on listening/speaking
- Wave bars animate when agent is speaking

### Nav: "Kirjaudu" link
All 8 main HTML pages have a "Kirjaudu" text link added before the "Varaa demo" CTA button in the nav-right.

### Deploy Commands (run once)
```bash
supabase link --project-ref zubhxdlssoochwbwyxlp
supabase db push  # runs supabase-setup.sql
supabase functions deploy generate-demo-agent
supabase functions deploy create-web-call
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... RETELL_API_KEY=key_...
```
