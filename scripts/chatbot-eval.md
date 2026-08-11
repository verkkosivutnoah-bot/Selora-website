# Chatbot knowledge-coverage eval

25 questions a real visitor might ask the widget, in Finnish and English.
For each one this records the correct answer and where in
`api/site-knowledge.js` it comes from, then marks whether the knowledge base
actually contains what's needed to answer it.

**Method.** There is no Groq API key in this environment, so nothing here
was run against the live model. Every row below was checked by hand against
the generated `api/site-knowledge.js` (rebuilt from the current pages via
`python3 scripts/build-chatbot-knowledge.py`) — i.e. this tests knowledge
*coverage*, not the model's actual wording. A ✅ means the facts needed to
answer correctly are present and clearly attributable; a ❌ would mean the
model has nothing to answer from and, per the rules in `api/chat.js`, should
say it doesn't know and point to `/yhteystiedot.html`.

Run `python3 scripts/build-chatbot-knowledge.py` after any copy change and
re-check this file — coverage is only as good as the last build.

## Answerable questions

| # | Question | Correct answer (from knowledge base) | Coverage |
|---|---|---|---|
| 1 | FI: *Mitä Selora tekee?* | Selora on suomalainen verkkosivutoimisto, joka suunnittelee ja rakentaa selkeitä, nopeita verkkosivustoja suomalaisille yrityksille kertamaksulla. | ✅ index.html hero + meta description |
| 2 | EN: *What does Selora do?* | Selora is a Finnish web design studio that builds fast, clear websites for Finnish businesses, paid as a one-time fee. | ✅ same section, English side of the DICT |
| 3 | FI: *Mitkä ovat kolme pakettia ja paljonko ne maksavat?* | Perussivu 298 €, Täysi sivusto 498 €, Elämyssivusto 898 €. Kaikki kertamaksuja, ei kuukausimaksuja. | ✅ pricing-card extraction now names the package once per card: `Perussivu (298 €, kertamaksu) — ...` etc. |
| 4 | EN: *What's included in the "Full site" package?* | 4+ pages, fully custom design, keyword research + deep SEO, forms/automations/CRM integration, Google review automation, optional e-commerce, analytics dashboard. | ✅ `Full site (498 €, one-time fee) — ... Includes: ...` |
| 5 | FI: *Kuinka nopeasti sivusto valmistuu?* | Itse rakennus vie 48 tuntia siitä kun sisällöt ovat kasassa. Kokonaisaikataulu on tyypillisesti 1, 2 viikkoa perussivulle ja 3, 4 viikkoa laajemmalle sivustolle, koska se riippuu lähinnä siitä kuinka nopeasti asiakas toimittaa tekstit ja kuvat. | ✅ "Rakennettu 48 tunnissa" section + index.html FAQ, which now state build time and calendar time as two distinct numbers |
| 6 | EN: *How fast will my site be ready?* | The build itself takes 48 hours once content is ready; the overall schedule is typically 1–2 weeks (basic) or 3–4 weeks (larger), depending on how fast the customer sends texts and images. | ✅ same, English side |
| 7 | FI: *Voinko pitää nykyisen verkkotunnukseni?* | Kyllä. Voit pitää nykyisen verkkotunnuksesi tai rekisteröidä uuden; Selora hoitaa siirron ja tekniset asetukset, sivusto ei ole pois käytöstä siirron aikana. | ✅ index.html FAQ, now paired as one `Kysymys:/Vastaus:` statement |
| 8 | EN: *Does the site work well on mobile phones?* | Yes — every package is mobile-optimised (explicit package feature), plus a dedicated "responsive mobile design" item: mobile-first approach, tested on major browsers, fast load on mobile networks. | ✅ pkg-card feature list + `feat-item` accordion on verkkosivusuunnittelu.html |
| 9 | FI: *Näkyykö sivusto Googlessa, teettekö hakukoneoptimointia?* | Kyllä. Jokainen sivusto rakennetaan hakukoneoptimoituna (otsikkorakenne, metatiedot, sivukartta, nopeat latausajat). Täysi sivusto ja Elämyssivusto sisältävät lisäksi avainsanatutkimuksen ja syväluotaavan SEO:n, Perussivu vain SEO:n perusteet. | ✅ index.html FAQ + compare-table row `Markkinointi ja SEO – Hakukoneoptimointi — Perussivu: Perusteet, Täysi sivusto: Syväluotaava, ...` |
| 10 | EN: *Is my data handled according to GDPR, and where is it hosted?* | Yes — form data and site data are processed on servers located in the EU, the build is GDPR-compliant, and data is never sold or shared with third parties. | ✅ index.html FAQ + tietosuojaseloste.html (now a translated data-table row pairing purpose/legal basis/data type) |
| 11 | FI: *Miten saan teihin yhteyttä?* | Sähköpostitse selora.tuki@gmail.com, puhelimitse 040 815 1122, tai varaamalla maksuton 30 min kartoituspuhelu kalenterista. Vastaus viestiin 4 tunnin sisällä arkipäivisin. | ✅ yhteystiedot.html |
| 12 | EN: *How does the Google review automation work?* | After a purchase/visit the system pulls the customer's contact info automatically, sends a friendly email asking for a short review, and routes happy customers straight to a Google review (shown on the site too); unhappy feedback goes to Selora first so it can be fixed before it becomes a public review. | ✅ verkkosivusuunnittelu.html "Google-arvostelut" section (3 numbered steps) |
| 13 | FI: *Voinko päivittää sivuston sisältöä itse julkaisun jälkeen?* | Kyllä. Sivusto rakennetaan niin, että tekstit, kuvat ja hinnat on helppo päivittää ilman koodia; käyttöönoton yhteydessä näytetään miten, ja apua saa tarvittaessa. | ✅ index.html FAQ |
| 14 | EN: *What happens after the site launches — is there ongoing support?* | The site is yours after the one-time payment. Maintenance/updates can continue on a separate, cancel-any-time agreement, or you can run it yourself — Selora doesn't lock you into a monthly fee. | ✅ index.html FAQ + hinnoittelu.html "Ylläpito on valinnainen" |
| 15 | FI: *Onko hinnassa piilokuluja, ja miten maksu jakautuu?* | Ei piilokuluja — sovittu hinta kattaa suunnittelun, rakennuksen ja julkaisun, ja lisätoiveista sovitaan aina hinta etukäteen. Maksu jakautuu kahteen osaan: puolet projektin alussa, puolet julkaisussa. | ✅ hinnoittelu.html FAQ + "Maksat kerran" section |
| 16 | EN: *Can I get the site in English as well as Finnish?* | Yes — sites are built in both Finnish and English with a one-click language switch, and both language versions are separately SEO-optimised. | ✅ index.html FAQ |
| 17 | FI: *Voinko nähdä esimerkkejä aiemmista sivustoista?* | Kyllä, verkkosivusuunnittelu.html-sivulla on esimerkkiprojekteja (Vantage, Plume, Nocturne, The Green Electrician) — huom. sisältö toteaa nämä ovat esimerkkiprojekteja eivätkä oikeita asiakasprojekteja, se kannattaa mainita vastauksessa. | ✅ verkkosivusuunnittelu.html "Esimerkkitöitä" |

## Questions the chatbot must refuse or deflect

The knowledge base contains **nothing** about any of these — the correct
behaviour is "I don't know, here's the contact page," never an invented
answer.

| # | Question | Why it must refuse | Coverage check |
|---|---|---|---|
| R1 | FI: *Teettekö myös mobiilisovelluksia?* | Site only ever describes websites; no app-development service exists anywhere in the 6 crawled pages. | ✅ confirmed absent — grepped all `PAGES` sources, no app/sovellus service |
| R2 | EN: *Do you also do logo design?* | No mention of logo/graphic design as a service (checked all public pages, not just the 6 crawled by the chatbot). | ✅ confirmed absent |
| R3 | FI: *Saanko alennusta, jos tilaan nyt?* | Pricing is explicitly stated as fixed, agreed in advance, no discounts mentioned. `api/chat.js` already forbids inventing discounts. | ✅ rule already present |
| R4 | EN: *Do you offer web hosting for 5 euros a month?* | Site explicitly markets "0 € kuukausimaksuja" (0€ monthly fees) and a one-time-fee model — a €5/mo hosting plan would contradict the stated model, not extend it. | ✅ confirmed absent, and contradicts stated pricing model |
| R5 | FI: *Voitteko taata, että pääsemme Googlen ykköseksi?* | Content describes SEO best practices, never a ranking guarantee. `api/chat.js` already forbids inventing guarantees. | ✅ rule already present |
| R6 | EN: *Do you still offer the AI phone receptionist product?* | Archived per CLAUDE.md months ago; zero mentions anywhere in the current 6 pages. This is the exact failure the old hand-written prompt had. | ✅ confirmed absent from all 6 pages |
| R7 | FI: *Missä teidän blogi on, löydän sen linkin sivustolta?* | Blog was archived (`blog-v1` tag); no `blogi.html` and no "Blogi" nav/footer link anywhere in the current 6 pages. | ✅ confirmed absent |
| R8 | EN: *Do you offer a free trial period before I have to pay anything?* | Only a free discovery call is offered (30 min, non-committal); nothing describes a free trial of the finished product. Must not conflate the two. | ✅ confirmed — "maksuton kartoituspuhelu" ≠ free trial, no free-trial language anywhere |

## Content issue found and resolved

Questions 5 and 6 originally exposed a real contradiction in the **site copy
itself**, not in extraction or in the chatbot's rules:

- `hinnoittelu.html` and `index.html` both headlined the "Miten se toimii"
  section as **"Käytössä 48 tunnissa"** ("Live in 48 hours").
- `index.html`'s own FAQ said **"Perussivu valmistuu tyypillisesti 1–2
  viikossa ja laajempi sivusto 3–4 viikossa"** ("typically ready in 1–2 /
  3–4 weeks").

Both were extracted correctly and both reached the model in the same
prompt, so "how fast will my site be ready" was a coin flip between two
numbers the site itself stated.

Fixed in the page copy rather than in the knowledge base, per the
"no hand-written facts" rule this chatbot is built on. The FAQ already
contained the reconciliation — *"Aikataulu riippuu lähinnä siitä, kuinka
nopeasti saamme sinulta tekstit ja kuvat"* — so 48h is Selora's own
production time and the weeks are calendar time spent waiting on customer
content. The copy now says exactly that:

- Headline is **"Rakennettu 48 tunnissa"** ("Built in 48 hours"), matching
  what the process steps actually sum to (build <24h + test/launch <24h).
- The hero chip reads **"48 h rakennusaika"** ("48 h build time"), not
  "48 h käyttöönotto".
- The section sub and the FAQ now state both numbers together, so they read
  as two different measurements rather than as rival claims.

This also brought the customer testimonial ("muutama viikko myöhemmin uudet
sivut olivat julkaistu") into line, which previously undercut the 48h
launch claim.
