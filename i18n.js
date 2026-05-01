/* Selora i18n — vanilla runtime translation overlay
 * Strategy: pages stay in Finnish in HTML. When EN is active, we walk text nodes
 * and key attributes, looking up each string in DICT[fi->en]. A MutationObserver
 * keeps newly inserted nodes translated.
 * Persisted via localStorage.seloraLang. Default: fi.
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Translation dictionary — Finnish → English
  // Keys are the EXACT trimmed text (including punctuation, capitalization).
  // Whitespace is normalized at lookup time (collapsed runs of \s).
  // ------------------------------------------------------------------
  const DICT = {
    // ---------- nav / chrome ----------
    'Etusivu': 'Home',
    'Palvelut': 'Services',
    'Hinnoittelu': 'Pricing',
    'Blogi': 'Blog',
    'Yhteystiedot': 'Contact',
    'Prosessi': 'Process',
    'Tietosuoja': 'Privacy',
    'Tietosuojaseloste': 'Privacy Policy',
    'Kirjaudu': 'Sign in',
    'Kirjaudu sisään': 'Sign in',
    'Kirjaudu sisään →': 'Sign in →',
    'Kirjaudu ulos': 'Sign out',
    'Rekisteröidy': 'Sign up',
    'Varaa demo': 'Book a demo',
    'Varaa puhelu': 'Book a call',
    'Varaa puhelu →': 'Book a call →',
    'Varaa demo →': 'Book a demo →',
    'Aloita ilmaiseksi': 'Start free',
    'Aloita nyt →': 'Start now →',
    'Aloita': 'Start',
    'Demo': 'Demo',
    'Tilaus': 'Subscription',
    'Yritys': 'Company',
    'Yritys *': 'Company *',
    'Yritystiedot': 'Company details',
    'Asiakas': 'Customer',
    'Asiakkaat': 'Customers',
    'Asiakkaat yhteensä': 'Total customers',
    'Asiakastuki': 'Customer support',
    'Asiakaspalvelu': 'Customer service',
    'Asiakaspalveluhistoria': 'Customer service history',
    'Asiakashallinta': 'Customer management',
    'Asiakasportaali': 'Customer portal',
    'Asiakassuhteen hoitaminen': 'Customer relationship management',
    'Asiakastarinat': 'Customer stories',
    'Asiakastiedot (aktiiviset sopimukset)': 'Customer data (active contracts)',
    'Asiakastiedot kirjataan selkeästi jatkotoimia varten': 'Customer details are recorded clearly for follow-up',
    'Asiakastulokset': 'Customer results',
    'Asiakaspyynnöt, dokumenttipyynnöt ja tapaamiset hoidettu ennen kuin tilitoimisto avaa ovensa.': 'Client requests, document requests and meetings handled before the office opens its doors.',
    'Aina päällä': 'Always on',
    'AINA PÄÄLLÄ': 'ALWAYS ON',
    'Aina tavoitettavissa': 'Always reachable',

    // ---------- common UI ----------
    'Lähetä viesti': 'Send message',
    'Lähetä viesti →': 'Send message →',
    'Lähetä yhteystiedot, vahvistukset ja linkit tekstiviestillä heti puhelun aikana.': 'Send contact details, confirmations and links by text message during the call.',
    'Lähetä palautuslinkki →': 'Send reset link →',
    'Lähettää vahvistuksen': 'Sends confirmation',
    'Lähetys sekunnin sisällä pyynnöstä': 'Delivered within a second of request',
    'Lähetimme vahvistusviestin osoitteeseen': 'We sent a confirmation message to',
    'Tarkista sähköpostisi': 'Check your email',
    'Sähköposti': 'Email',
    'Sähköposti *': 'Email *',
    'Sähköpostiosoite': 'Email address',
    'Salasana': 'Password',
    'Salasana *': 'Password *',
    'Unohditko salasanasi?': 'Forgot your password?',
    'Vahvista salasana': 'Confirm password',
    'Etunimi': 'First name',
    'Etunimi ja sukunimi': 'First and last name',
    'Etunimi & sukunimi *': 'First & last name *',
    'Sukunimi': 'Last name',
    'Puhelin': 'Phone',
    'Puhelinnumero': 'Phone number',
    'Yrityksen nimi': 'Company name',
    'Viesti': 'Message',
    'Viesti lähetetty!': 'Message sent!',
    'Tervetuloa': 'Welcome',
    'Tervetuloa takaisin': 'Welcome back',
    'Aktivoi': 'Activate',
    'Jatka': 'Continue',
    'Peruuta': 'Cancel',
    'Tallenna': 'Save',
    'Vahvista': 'Confirm',
    'Hyväksy kaikki': 'Accept all',
    'Hylkää': 'Decline',
    'Käytössä': 'Enabled',
    'Lue lisää →': 'Read more →',
    'Lue lisää ▾': 'Read more ▾',
    'Lue prosessista': 'Read about our process',
    'Lue ylläpidosta ▼': 'Read about maintenance ▼',
    'Kaikki →': 'All →',
    'Kaikki': 'All',
    'Pyydä': 'Request',
    'Pyydä tarjous →': 'Request a quote →',
    'Ota yhteyttä': 'Get in touch',
    'Ota yhteyttä →': 'Get in touch →',
    'Ota täysversio →': 'Activate full version →',
    'Ilmainen': 'Free',
    'Maksuton': 'Free',
    'Päivitä nyt →': 'Upgrade now →',
    'Päivitä': 'Update',
    'Päivitettävä milloin tahansa': 'Update at any time',
    'Linkitä →': 'Link →',
    'Linkitä agentti': 'Link agent',
    'Linkitä Retell-agentti': 'Link Retell agent',
    '+ Lisää henkilö': '+ Add person',
    '+ Lisää kysymys': '+ Add question',
    '+ Lisää palvelu': '+ Add service',
    'Lisää henkilökunnan jäsenet ja heidän erikoisosaamisensa — voit ohittaa tämän vaiheen.': 'Add staff members and their specialities — you can skip this step.',
    'Lisää palvelusi taulukkoon — agentti osaa kertoa hinnat ja kestot automaattisesti.': 'Add your services to the table — the agent will quote prices and durations automatically.',
    'Lisää yleisimmät kysymykset ja vastaukset — agentti käyttää näitä suoraan.': 'Add the most common questions and answers — the agent will use them directly.',
    'Lue': 'Read',
    'Kuukausi': 'Monthly',
    'Kuukaudessa': 'per month',
    'Kuukausittain': 'Monthly',
    'Vuosi': 'Yearly',
    'Vuodessa': 'per year',
    'Päivässä': 'per day',
    'Päivä': 'Day',
    'Tänään': 'Today',
    'Tällä viikolla': 'This week',
    'Yhteensä': 'Total',
    'Käytetty': 'Used',
    'käytetty': 'used',
    'Käyttötarkoitus': 'Purpose',
    'Säilytysaika': 'Retention period',
    'Evästeen tyyppi': 'Cookie type',
    'Voimaantulopäivä': 'Effective date',
    'Päivitetty viimeksi': 'Last updated',

    // ---------- hero / index ----------
    'Selora — Älä enää missaa yhtään puhelua': 'Selora — Never miss another call',
    'Tekoäly vastaa jokaiseen puheluun, ei enää vastaamattomuutta': 'AI answers every call — never miss one again',
    'Tekoäly vastaa jokaiseen puheluun — ei enää vastaamattomuutta': 'AI answers every call — never miss one again',
    'Älä enää missaa yhtään puhelua': 'Never miss another call',
    'Tekoälyvastaanottajamme hoitaa puhelut, ajanvaraukset ja raportoinnin. Sinä keskityt muuhun.': 'Our AI receptionist handles calls, appointment booking and reporting. You focus on the rest.',
    'Tekoälymme vastaa puheluihin, tunnistaa potentiaaliset asiakkaat ja varaa tapaamiset suoraan kalenteriisi. Se toimii 24 tuntia vuorokaudessa, 7 päivää viikossa, ilman lomia tai taukoja.': 'Our AI answers calls, identifies prospects and books appointments straight into your calendar. It works 24 hours a day, 7 days a week, with no holidays or breaks.',
    'Tekoälyvastaanottaja ja verkkosivusuunnittelu suomalaisille yrityksille. Käyttöönotto alle 48 tunnissa.': 'AI receptionist and web design for Finnish businesses. Live in under 48 hours.',
    'Ei luottokorttia. Käyttöönotto alle 48 tunnissa.': 'No credit card. Live in under 48 hours.',
    'Käyttöönotto alle kahdessa päivässä': 'Live in under two days',
    'Käyttöönotto': 'Onboarding',
    'käyttöönotto.': 'onboarding.',
    'Useimmat järjestelmät käynnissä 48 tunnin sisällä': 'Most systems live within 48 hours',
    'Useimmat järjestelmät ovat toiminnassa 48 tunnin sisällä sopimuksen allekirjoittamisesta. Ei odottelua.': 'Most systems are running within 48 hours of signing. No waiting around.',
    'Säästä aikaa': 'Save time',
    'Vähennä kustannuksia': 'Cut costs',
    'Enemmän asiakkaita.': 'More customers.',
    'Vähemmän työtä.': 'Less work.',
    'Tekoäly vastaa.': 'AI answers.',
    'Sinä myyt.': 'You sell.',
    'Pysyvä tulos.': 'Lasting results.',

    // ---------- stats ----------
    '22 työpäivää': '22 working days',
    '+34 % enemmän varattuja aikoja ensimmäisessä kuussa': '+34% more bookings in the first month',
    '+34% enemmän varauksia': '+34% more bookings',
    'Säästö 2 400 € / kk henkilöstökuluissa': 'Saves €2,400/month in staffing costs',
    'menettämätöntä liikevaihtoa': 'in revenue saved',
    'pöydälle': 'on the table',
    'yhtään': 'a single',
    '% liideistä': '% of leads',

    // ---------- services teaser ----------
    'Tekoälyvastaanottaja': 'AI receptionist',
    'Tekoälyvastaanottajat': 'AI receptionists',
    'Tekoälyvastaanottajat — Selora': 'AI receptionists — Selora',
    'Tekoälyvastaanottajapalvelu': 'AI receptionist service',
    'Tekoälychatbot': 'AI chatbot',
    'Tekoälychatbot sisältyy': 'AI chatbot included',
    'Tekoälychatbot sisältyy verkkosivustoon': 'AI chatbot included with the website',
    'Tekoälychatbot + prioriteettituki käyttöönotossa': 'AI chatbot + priority onboarding support',
    'Mitä teemme': 'What we do',
    'Mitä rakennamme': 'What we build',
    'Mitä sisältyy': 'What\'s included',
    'Räätälöity sinulle': 'Tailored for you',
    'Tekoäly luo personoidun vastaanottajan juuri sinun yritykseesi.': 'AI builds a personalised receptionist for exactly your business.',
    'Sinulle tehtäisiin sama — omalla nimellä, omilla palveluilla.': 'Yours would be built the same way — with your name, your services.',
    'Selkeät ja nopeat verkkosivustot, jotka on suunniteltu muuttamaan vierailijat asiakkaiksi.': 'Clean, fast websites designed to turn visitors into customers.',
    'Selkeät ja nopeat verkkosivustot, jotka edustavat brändiäsi ja muuttavat vierailijat asiakkaiksi. Rakennamme kaiken aloitussivuista monisivuisiin brändi-sivustoihin. Kaikki on moderni, mobiilioptimoitu ja hakukoneystävällinen.': 'Clean, fast websites that represent your brand and turn visitors into customers. We build everything from landing pages to multi-page brand sites. All modern, mobile-first and SEO-ready.',
    'Rakennamme nopeita, konvertoivia verkkosivustoja, jotka edustavat brändiäsi ja muuttavat vierailijat maksaviksi asiakkaiksi. Jokainen sivu on räätälöity toimialallesi ja kohderyhmällesi, alusta loppuun, ilman valmiita teemoja.': 'We build fast, high-converting websites that represent your brand and turn visitors into paying customers. Every page is tailored to your industry and audience, from start to finish — no off-the-shelf themes.',

    // ---------- process / prosessi ----------
    'Prosessi — Selora': 'Process — Selora',
    'Prosessimme': 'Our process',
    'Neljä askelta': 'Four steps',
    'Selkeä prosessi, joka kunnioittaa aikaasi ja saa tekoälyjärjestelmäsi toimimaan 48 tunnin sisällä ilman viikkoja kestävää edestakaisin viestittelyä.': 'A clear process that respects your time and gets your AI system live within 48 hours — no weeks of back-and-forth.',
    'Selkeä prosessi, joka kunnioittaa aikaasi ja saa tekoälyjärjestelmäsi toimimaan ilman viikkoja kestävää edestakaisin viestittelyä.': 'A clear process that respects your time and gets your AI system running without weeks of back-and-forth.',
    'Kuinka se toimii': 'How it works',
    'Kolme vaihetta konseptista verkkoon.': 'Three steps from concept to live site.',
    'Kolme vaihetta älykkäästä vastaanottajasta tuottavaan järjestelmään.': 'Three steps from smart receptionist to a system that pays for itself.',
    'Kerro yrityksestäsi': 'Tell us about your business',
    'Kerro yrityksestäsi — toimiala, palvelut, aukioloajat': 'Tell us about your business — industry, services, opening hours',
    'Täytä lyhyt kysely. Aukioloajat, palvelut, äänensävy.': 'Fill in a short questionnaire. Hours, services, tone of voice.',
    'Käymme läpi yrityksesi tarpeet ja räätälöimme tekoälyn persoonan, skriptit ja toimintalogiikan juuri sinulle.': 'We walk through your needs and tailor the AI\'s persona, scripts and logic specifically for you.',
    'Tekoäly rakentaa agentin automaattisesti': 'AI builds the agent automatically',
    'Räätälöity ulkoasu yrityksesi brändiin': 'Custom design matched to your brand',
    'Testaus ja käyttöönotto': 'Testing and launch',
    'Käymme järjestelmän läpi yhdessä, testaame puhelut, vahvistamme integraatiot ja varmistamme että kaikki toimii juuri niin kuin pitää. Sinun ei tarvitse koskea koodiin — hoidamme kaiken teknisen puolen.': 'We walk through the system together, test calls, verify integrations and make sure everything runs exactly as it should. You don\'t need to touch any code — we handle every technical detail.',
    'Käymme järjestelmän läpi yhdessä, testaame puhelut, vahvistamme integraatiot ja varmistamme että kaikki toimii juuri niin kuin pitää. Sinun ei tarvitse koskea koodiin, hoidamme kaiken teknisen puolen.': 'We walk through the system together, test calls, verify integrations and make sure everything runs exactly as it should. You don\'t need to touch any code — we handle every technical detail.',

    // ---------- demo / live demo ----------
    'Kuule miten tekoäly puhuu oikeasti': 'Hear how the AI actually speaks',
    'Kuule miten se kuulostaa': 'Hear how it sounds',
    'Kuulostaa': 'Sounds',
    'hyvältä': 'great',
    'Soita agentillesi suoraan selaimesta. Täysin ilmaiseksi.': 'Call your agent straight from your browser. Completely free.',
    'Ilmainen · Ei rekisteröitymistä · Käyttää selaimen mikrofonia': 'Free · No signup · Uses your browser microphone',
    'Aloita demo-puhelu': 'Start demo call',
    'Aloita testipuhelu': 'Start test call',
    'Rakennetaan ääniyhteys': 'Connecting audio',
    'Puhelu käynnissä': 'Call in progress',
    'Asiakas soittaa.': 'Customer calls.',
    'Asiakas': 'Customer',
    'Alla oleva demo esittää kuvitteellista Kampaamo Katariinaa. Sinulle rakennettaisiin täsmälleen samanlainen tekoäly, räätälöitynä omaan yritykseesi, omalla äänellä ja omilla palveluillasi.': 'The demo below features a fictional salon called "Kampaamo Katariina". Yours would be built exactly the same way — tailored to your business, with your own voice and services.',

    // ---------- ROI ----------
    'Mitä voisit ansaita Seloran kanssa': 'What you could earn with Selora',
    'Mitä voisit ansaita Seloran': 'What you could earn with Selora',
    'Seloran kanssa': 'with Selora',
    'Kaksi lukua riittää. Siirrä liukuja ja näe heti, paljonko yrityksesi menettää vastaamattomista puheluista.': 'Two numbers are enough. Move the sliders and see instantly how much your business loses to missed calls.',
    'Näe sekunnissa, paljonko vastaamattomat puhelut maksavat yrityksellesi.': 'See in seconds how much missed calls cost your business.',
    'Harva yrittäjä laskee tätä lukua. Lasketaan se nyt yhdessä — tulokset voivat yllättää.': 'Few entrepreneurs ever calculate this number. Let\'s do it together — the result may surprise you.',
    'Kuinka paljon rahaa jää': 'How much money is left',
    'Kuinka paljon yrityksesi häviää menetetyistä puheluista vuodessa?': 'How much does your business lose to missed calls per year?',
    'Vastaamattomia puheluita päivässä': 'Missed calls per day',
    'Keskimääräinen tulo yhdestä asiakkaasta': 'Average revenue per customer',
    'Kuinka monta prosenttia liideistä yleensä klousaat?': 'What % of leads do you typically close?',
    'Siirrä liukuja vasemmalta — kaavio päivittyy reaaliajassa': 'Move the sliders on the left — the chart updates in real time',
    'Siirrä liukuja vasemmalta, kaavio päivittyy reaaliajassa': 'Move the sliders on the left — the chart updates in real time',
    'Luvut perustuvat syöttämiisi tietoihin. Selora kaappaa konservatiivisesti 78 % vastaamattomista liideistä.': 'Numbers are based on the values you entered. Selora conservatively recovers 78% of missed leads.',
    'Luvut perustuvat syöttämiisi tietoihin, mukaan lukien klousausprosenttisi. Selora kaappaa konservatiivisesti 78 % vastaamattomista liideistä.': 'Numbers are based on what you entered, including your close rate. Selora conservatively recovers 78% of missed leads.',

    // ---------- features ----------
    'Kaikki mitä tarvitset.': 'Everything you need.',
    'Kaikki mitä tarvitset': 'Everything you need',
    'Kaikki mitä tarvitset,': 'Everything you need,',
    'Tekoälyvastaanottajamme sisältää kaiken: ei lisäosia, ei yllätyksiä. Tässä täydellinen ominaisuusluettelo.': 'Our AI receptionist includes everything — no add-ons, no surprises. Here\'s the full feature list.',
    'Suuri osa puheluista menee vastaajaan silloin kun olet kiireinen. Tekoälyvastaanottaja vastaa joka kerta. Ei yhtään menetettyä asiakasta.': 'Most calls go to voicemail when you\'re busy. Our AI receptionist answers every time. No customer left behind.',
    'Jokainen puhelu vastataan yöllä, viikonloppuna, juhlapyhinä. Ei koskaan kiinni.': 'Every call answered — nights, weekends, public holidays. Never closed.',
    'Käsittelee kymmeniä samanaikaisia puheluita ilman jonotusaikaa, sesonkikin sujuu.': 'Handles dozens of simultaneous calls with no queues — even peak season runs smoothly.',
    'Tekoäly puhuu sujuvaa suomea ja mukauttaa äänensävyn brändisi mukaan. Asiakkaasi saa aina rauhallisen, asiantuntevan vastaanoton.': 'The AI speaks fluent Finnish and adapts its tone to your brand. Every customer gets a calm, expert reception.',
    'Tekoäly siirtää puhelun saumattomasti oikealle henkilölle tiimissäsi tai ottaa viestin talteen. Sinä määrität siirtosäännöt, ja kukaan ei jää ilman palvelua.': 'The AI transfers calls seamlessly to the right person on your team — or takes a message. You define the rules; nobody goes unserved.',
    'Tekoäly siirtää puhelun saumattomasti oikealle henkilölle tiimissäsi tai ottaa viestin talteen. Sinä määrität siirtosäännöt, ja kukaan ei jää ilman palvelua.': 'The AI transfers calls seamlessly to the right person on your team — or takes a message. You set the rules; nobody goes unserved.',
    'Monimutkainen kysymys? Tekoäly siirtää oikealle henkilölle saumattomasti.': 'Complex question? The AI transfers seamlessly to the right person.',
    'Kerää yhteystiedot, selvitä tarpeet ja pisteytä liidit automaattisesti jokaisen puhelun jälkeen.': 'Collect contact details, qualify needs and score leads automatically after every call.',
    'Älykäs puheluiden hallinta, liidien kvalifiointi ja automaatioiden integraatio.': 'Smart call handling, lead qualification and automation integrations.',
    'Älykäs puhelujen ohjaus': 'Smart call routing',
    'Älykäs puheluohjaus': 'Smart call routing',
    'Älykäs vastaanotto 24/7, ilman henkilöstökuluja.': 'Smart 24/7 reception, with no staffing costs.',

    // ---------- benefits ----------
    'Tekoälyvastaanottaja ei ole pelkkä kuluerä. Se maksaa itsensä takaisin jo ensimmäisen kuukauden aikana.': 'The AI receptionist isn\'t just a cost — it pays for itself within the first month.',
    'Tekoälyvastaanottaja maksaa murto-osan perinteisestä vastaanottajasta ja palvelee rajattomasti.': 'An AI receptionist costs a fraction of a traditional one and handles unlimited calls.',
    'Rutiinipuhelut, ajanvaraukset ja liidien keruu hoituvat automaattisesti. Tiimisi voi keskittyä olennaiseen.': 'Routine calls, bookings and lead capture are handled automatically. Your team focuses on what matters.',
    'Kaikki data käsitellään EU:ssa. Täysin GDPR- ja EU AI Act -yhteensopiva. Tietoturvasi on turvassa.': 'All data is processed in the EU. Fully GDPR and EU AI Act compliant. Your security is locked down.',

    // ---------- testimonials ----------
    'Mitä asiakkaamme': 'What our customers',
    'Asiakaspalveluhistoria': 'Customer service history',
    'Kampaamoyrittäjä, Tampere': 'Salon owner, Tampere',
    'Kiinteistövälittäjä, Helsinki': 'Real estate agent, Helsinki',
    'Kaikenlaisista yrityksistä — tässä mitä asiakkaamme kokevat tekoälyjärjestelmien käyttöönoton jälkeen.': 'From every kind of business — here\'s what our customers experience after switching to AI.',
    '"Ennen Seloraa minulla meni joka päivä useita puheluita vastaajaksi kesken asiakastyön. Nyt ne kaikki hoidetaan automaattisesti. Ensimmäisen kuukauden aikana varaukset kasvoivat reippaasti ja minulla on vihdoin aikaa keskittyä itse tekemiseen."':
      '"Before Selora, multiple calls went to voicemail every day while I was with a client. Now they\'re all handled automatically. Bookings jumped in the first month and I finally have time to focus on the actual work."',
    '"Odotin, että tämä olisi monimutkainen projekti. Se ei ollut. Yksi puhelu Seloran kanssa ja päivä myöhemmin tekoäly vastasi ensimmäiseen puheluun. Asiakkaat eivät edes huomanneet eroa, he saivat vain paremman palvelun kuin ennen."':
      '"I expected this to be a complex project. It wasn\'t. One call with Selora and a day later the AI answered its first call. Customers didn\'t even notice the difference — they just got better service than before."',
    '"Olen paljon kentällä enkä pysty aina vastaamaan. Selora hoitaa kyselyt ja yhteydenottopyynnöt silloin kun olen asiakkaan kanssa. Saan tiivistelmän jokaisesta puhelusta ja voin soittaa takaisin heti kun on sopiva hetki."':
      '"I\'m on the road a lot and can\'t always pick up. Selora handles enquiries and callback requests while I\'m with a customer. I get a summary of every call and ring back as soon as I have a moment."',

    // ---------- pricing teaser ----------
    'Aloituspaketti': 'Starter',
    'Aloituspaketti: suomi': 'Starter: Finnish',
    'Kasvupaketti': 'Growth',
    'Kasvupaketti: suomi, ruotsi ja englanti': 'Growth: Finnish, Swedish and English',
    'Yrityspaketti': 'Enterprise',
    'Säästä 15 %': 'Save 15%',
    'Kuukausi': 'Monthly',
    'Vuosi': 'Yearly',
    'Kaikki Aloituspaketin ominaisuudet': 'Everything in Starter',
    'Kaikki Kasvupaketin ominaisuudet': 'Everything in Growth',
    'Mitä kukin paketti': 'What each plan',
    'sisältää.': 'includes.',
    'Kaikki paketit sisältävät täysin personoidun tekoälyvastaanottajan, joka vastaa puheluihin 24/7. Kiinteä kuukausihinta, ei piilomaksuja.': 'Every plan includes a fully personalised AI receptionist that handles calls 24/7. Flat monthly fee, no hidden costs.',
    'Kaikki selkeästi eritelty. Ei piilotettuja rajoituksia.': 'Everything spelled out clearly. No hidden limits.',
    '✓ Sisältyy hintaan': '✓ Included',

    // ---------- FAQ ----------
    'Usein kysyttyä': 'Frequently asked questions',
    'Hinnoittelukysymykset': 'Pricing questions',
    'Mitä tapahtuu, kun tekoäly ei osaa vastata?': 'What happens if the AI can\'t answer?',
    'Kun asia vaatii ihmistä, tekoäly tunnistaa tilanteen automaattisesti ja siirtää puhelun oikealle henkilölle, myyntiin, asiakaspalveluun tai johtoon. Taustatiedot kulkevat mukana.':
      'When something needs a human, the AI detects it automatically and transfers the call to the right person — sales, support or management. Context is passed along.',
    'Tukeeko se useita kieliä?': 'Does it support multiple languages?',
    'Kyllä. Tekoälyvastaanottajamme palvelee asiakkaita suomeksi, ruotsiksi ja englanniksi. Monikielinen vastaanotto sisältyy Kasvu- ja Yrityspakettiin.':
      'Yes. Our AI receptionist serves customers in Finnish, Swedish and English. Multilingual reception is included in the Growth and Enterprise plans.',
    'Voinko pitää nykyisen puhelinnumeroni?': 'Can I keep my current phone number?',
    'Kyllä. Voit joko siirtää olemassa olevan numerosi meille tai ottaa uuden numeron. Molemmat vaihtoehdot onnistuvat helposti ja nopeasti.':
      'Yes. You can either port your existing number to us or take a new one. Both options are quick and easy.',
    'Kuinka monta puhelua se voi käsitellä samanaikaisesti?': 'How many calls can it handle at once?',
    'Rajattomasti. Tekoälyvastaanottajamme käsittelee kymmeniä samanaikaisia puheluita ilman jonotusaikaa, myös sesonkihuippujen aikana.':
      'Unlimited. Our AI receptionist handles dozens of simultaneous calls with zero queue time — even at peak season.',
    'Miten tekoäly oppii yrityksestäni?': 'How does the AI learn about my business?',
    'Rakennamme yrityksellesi tietopankin, johon syötetään kaikki olennainen: palvelut, hinnat, aukioloajat ja usein kysytyt kysymykset. Mitä enemmän kerrot, sitä paremmin vastaanottaja palvelee asiakkaitasi, ja sitä oppii koko ajan lisää.':
      'We build a knowledge base for your business covering everything that matters: services, prices, hours and FAQs. The more you share, the better the receptionist serves your customers — and it keeps learning.',
    'Onko piilomaksuja tai ylimääräisiä kuluja?': 'Are there hidden fees or extra charges?',
    'Ei. Kuukausihinta kattaa kaiken sopimuksessa sovitun. Ainoa lisäkustannus voi tulla erittäin suuresta puhelumäärästä, josta sovimme aina etukäteen. Ei yllätyksiä laskussa.':
      'No. The monthly fee covers everything in your contract. The only possible extra is unusually high call volume — and we always agree on that in advance. No surprises on your invoice.',
    'Voinko vaihtaa pakettia jälkikäteen?': 'Can I change plan later?',
    'Kyllä. Voit päivittää tai alentaa pakettia milloin tahansa. Muutos astuu voimaan seuraavan laskutusjakson alussa. Ylennys onnistuu myös kesken kauden.':
      'Yes. You can upgrade or downgrade anytime. Changes take effect at the start of the next billing cycle. Upgrades can also kick in mid-period.',
    'Kuinka nopeasti voin aloittaa?': 'How quickly can I get started?',
    'Useimmat asiakkaat ovat live-tilassa 24–48 tunnin sisällä sopimuksen allekirjoittamisesta. Konfigurointi on yksinkertaista: tarvitsemme vain perustiedot yrityksestäsi ja palveluistasi.':
      'Most customers go live within 24–48 hours of signing. Setup is simple — we just need the basics about your business and services.',
    'Miten irtisanominen toimii?': 'How does cancellation work?',
    'Sopimus on kuukausittainen. Irtisanomisaika on 30 päivää. Voit irtisanoa milloin tahansa ilman sakkomaksuja tai lisäkuluja. Tietosi palautetaan sinulle pyydettäessä.':
      'Contracts are month-to-month. Notice period is 30 days. You can cancel anytime with no penalty or extra fees. Your data is returned to you on request.',
    'Mitä tapahtuu jos minuutit ylittyvät?': 'What if I exceed my minutes?',
    'Ylittävät minuutit laskutetaan 0,25 € / minuutti. Saat ilmoituksen kun 80 % minuuteista on käytetty.':
      'Overage minutes are billed at €0.25/minute. You\'ll get a notification when you\'ve used 80% of your allowance.',
    'Voiko agentin tietoja muokata jälkeen päin?': 'Can the agent\'s info be edited afterwards?',
    'Kyllä. Dashboardissasi voit milloin tahansa päivittää palvelut, aukioloajat, aloitusviestin ja äänensävyn — muutokset astuvat voimaan välittömästi.':
      'Yes. From your dashboard you can update services, hours, greeting and tone of voice at any time — changes take effect instantly.',
    'Mitkä ovat maksuehdot ja laskutusväli?': 'What are the payment terms and billing cycle?',
    'Laskutamme kuukausittain etukäteen. Hyväksymme kortit, laskun ja verkkopankin.': 'We bill monthly in advance. We accept cards, invoice and bank transfer.',
    'Mitä tehdään kiireellisissä tapauksissa?': 'What happens with urgent cases?',
    'Milloin agentti on käytössä oston jälkeen?': 'When is the agent live after purchase?',
    'Millainen tyyli sopii brändiisi, ja mitä agentti tekee?': 'What style suits your brand, and what should the agent do?',
    'Millä kielillä agentti palvelee, ja mitä muuta sen tulisi tietää?': 'What languages should the agent speak, and what else should it know?',

    // ---------- pricing page ----------
    'Hinnoittelu — Selora': 'Pricing — Selora',
    'Säästä 15 %': 'Save 15%',
    'Kuukausittain': 'Monthly',
    '+ alv. 25,5%  ·  Irtisanottavissa milloin tahansa 30 päivän varoitusajalla': '+ VAT 25.5%  ·  Cancel anytime with 30 days\' notice',
    'Yksikin menetetty asiakas voi maksaa enemmän kuin kuukausihinta. Voit irtisanoa milloin tahansa 30 päivän varoitusajalla.':
      'A single lost customer can cost more than the monthly fee. Cancel anytime with 30 days\' notice.',
    'Ylimenevä minuutti': 'Overage minute',
    ' ·  0,25 € sen jälkeen': ' ·  €0.25 thereafter',
    'Kyllä, voit peruuttaa milloin tahansa ilman peruutuskuluja. Laskutusjakso jatkuu loppuun asti peruutuksen jälkeen.':
      'Yes, you can cancel anytime with no cancellation fees. The current billing period runs to the end after cancellation.',

    // ---------- contact page ----------
    'Yhteystiedot — Selora': 'Contact — Selora',
    'Varaa maksuton 30 minuutin demo. Näytämme miten tekoälyvastaanottaja toimisi juuri sinun yrityksessäsi. Ei paineita, ei sitoumuksia.':
      'Book a free 30-minute demo. We\'ll show you exactly how the AI receptionist would work for your business. No pressure, no commitments.',
    'Varaa maksuton 30 minuutin demo. Näytämme miten tekoälyvastaanottaja toimisi juuri sinun yrityksessäsi. Ei paineita, ei sitoumuksia, ei jargonia.':
      'Book a free 30-minute demo. We\'ll show you exactly how the AI receptionist would work for your business. No pressure, no commitments, no jargon.',
    'Varaa maksuton 30 minuutin demo. Näytämme miten tekoälyvastaanottaja toimisi juuri sinun yrityksessäsi, valmiilla konfiguraatiolla, oikeilla skripteillä, ilman sitoumuksia.':
      'Book a free 30-minute demo. We\'ll show you the AI receptionist running in your context, fully configured with real scripts, no commitments.',
    'Varaa maksuton 30 minuutin demo suoraan kalenteristani. Käymme läpi yrityksesi tilanteen ja näytämme tarkalleen miten tekoäly voi toimia juuri sinulle. Ei paineita, ei jargonia, ei sitoumuksia.':
      'Book a free 30-minute demo directly on my calendar. We\'ll review your situation and show you exactly how the AI can work for you. No pressure, no jargon, no commitments.',
    'Pidätkö enemmän soittamisesta? ': 'Prefer to call? ',
    'Kiitos yhteydenotostasi. Palaamme sinulle 4 tunnin sisällä arkipäivisin ja sovimme maksuttoman kartoituspuhelun.':
      'Thanks for getting in touch. We\'ll be back to you within 4 working hours to set up your free discovery call.',
    'Hyväksyn, että Selora Oy käsittelee henkilötietojani yhteydenottoa varten': 'I agree to Selora Oy processing my personal data for contact purposes',
    'Olen lukenut ja hyväksyn': 'I have read and accept',
    'ja hyväksyn henkilötietojeni käsittelyn.': 'and consent to processing of my personal data.',
    'Ensimmäinen tapaaminen on maksuton ja sitoumukseton': 'The first meeting is free and non-committal',
    '4 tunnin sisällä arkipäivisin': 'Within 4 working hours',
    'Saat konkreettisen suunnitelman ja hinnan, ilman yllätyksiä': 'You\'ll get a concrete plan and price, with no surprises',
    'Käymme läpi yrityksesi nykyiset haasteet ja tavoitteet': 'We\'ll review your current challenges and goals',
    'Hetki, käsittelemme pyyntöäsi.': 'One moment, we\'re processing your request.',
    'Lisätietoja palveluista (valinnainen)': 'More about your needs (optional)',
    'Lähetä viesti →': 'Send message →',

    // ---------- blog ----------
    'Blogi — Selora | Tekoäly, automaatio ja pienyrityksen kasvu': 'Blog — Selora | AI, automation and small-business growth',
    'Oppaat, vertailut ja strategiat suomalaiselle yrittäjälle.': 'Guides, comparisons and strategies for Finnish entrepreneurs.',
    'Sisältökategoriat': 'Categories',
    'Käytännön opas': 'Practical guide',
    'Käytännön vinkit, miten tekoäly tehostaa ajanvarausta ja asiakaspalvelua': 'Practical tips on how AI streamlines bookings and customer service',
    'Toimialakohtaiset oppaat: kampaamo, lääkäriasema, kiinteistövälitys, ravintola, autokorjaamo ja muu pienyrittäjyys. Konkreettiset esimerkit ja ROI-laskurit.':
      'Industry guides: hair salons, clinics, real estate, restaurants, auto repair and other small businesses. Concrete examples and ROI calculators.',
    'Mitä maksaa? Miten toimii? Onko se turvallinen? Vastaamme yrittäjien yleisimpiin kysymyksiin selkeästi ja rehellisesti, ilman markkinointijargonia.':
      'What does it cost? How does it work? Is it safe? We answer the most common entrepreneur questions clearly and honestly, with zero marketing jargon.',
    'Ymmärrä tekoäly ilman teknistä osaamista': 'Understand AI without a technical background',
    'Jokainen artikkeli alkaa todellisesta yrittäjän ongelmasta: menetetyistä puheluista, ylikuormittuneesta henkilöstöstä tai kasvun esteistä, ja tarjoaa konkreettisen ratkaisun.':
      'Every article starts with a real entrepreneur problem — missed calls, overstretched staff or growth bottlenecks — and offers a concrete fix.',
    'Kaikki artikkelimme pohjautuvat yhteen kolmesta strategiasta. Löydä sinulle sopivin.': 'Every article is built on one of three strategies. Find the one that fits.',
    'Julkaisemme kerran kuussa käytännöllisen oppaan tekoälyn ja automaation hyödyntämisestä suomalaisessa pienyrityksessä. Ei spämmejä.':
      'Once a month, we publish a practical guide on using AI and automation in a Finnish small business. No spam.',
    'sisältöpilaria': 'content pillars',
    'Tekoäly & kasvu': 'AI & growth',
    'Tekoäly & kasvu': 'AI & growth',
    'Tekoäly kasvattaa parturi-kampaamon asiakaskuntaa käytännössä': 'How AI grows a barber-salon\'s customer base in practice',
    'Tekoäly vai ihmisvastaanottaja? Rehellinen vertailu suomalaiselle yrittäjälle': 'AI or human receptionist? An honest comparison for Finnish entrepreneurs',
    'Tekoälyvastaanottajan käyttöönotto: mitä oikeasti tapahtuu?': 'Getting started with an AI receptionist — what actually happens?',
    'GDPR ja tekoälyvastaanottaja: mitä suomalaisen pk‑yrityksen on tiedettävä': 'GDPR and the AI receptionist: what Finnish SMBs need to know',
    'Opas GDPR‑vaatimusten täyttämiseen tekoälyvastaanottajan kanssa pk‑yritykselle': 'A guide to meeting GDPR with an AI receptionist for SMBs',
    'Miksi LVI‑yrityksen illat ja viikonloput karkaavat kilpailijalle — ja mitä sille voi tehdä.': 'Why HVAC companies lose evenings and weekends to competitors — and what to do about it.',
    'LVI‑yritys ja hätäpuhelut: mitä tapahtuu, kun asiakas soittaa kello 22': 'HVAC and emergency calls: what happens when the customer rings at 10pm',
    'Kustannukset, hyödyt ja rajoitukset rinnakkain.': 'Costs, benefits and limits side by side.',
    'suoraan sähköpostiisi': 'straight to your inbox',

    // ---------- service detail pages ----------
    'Palvelut — Selora': 'Services — Selora',
    'Palvelut & ': 'Services & ',
    'Palvelut ja hinnat': 'Services and pricing',
    'Tekoälyvastaanottajan käyttöönotto': 'AI receptionist onboarding',
    'Tekoäly juuri sinun toimialallasi': 'AI built for your industry',
    'Tekoäly, joka tekee töitä': 'AI that does the work',
    'Tekoäly menee töihin. Saat reaaliaikaisen kojelaudan ja kuukausiraportin tuloksista.': 'The AI gets to work. You get a real-time dashboard and a monthly results report.',
    'Tekoälyvastaanottajamme on konfiguroitu toimimaan parhaiten näillä toimialoilla, toimialakohtaisilla skripteillä ja integraatioilla.':
      'Our AI receptionist is tuned for these industries, with industry-specific scripts and integrations.',
    'Räätälöity ulkoasu brändisi väreillä, fonteilla ja kuvastolla. Ei valmiita malleja.': 'Custom design with your brand colours, fonts and imagery. No templates.',
    'Räätälöity ulkoasu yrityksesi brändiin': 'Custom design matched to your brand',
    'Räätälöitävät kvalifiointikriteerit': 'Customisable qualification criteria',
    'Räätälöity sinulle': 'Tailored for you',
    'Räätälöity integraatio olemassa oleviin järjestelmiin': 'Custom integration with existing systems',
    'Räätälöidyt API-integraatiot Pro-paketissa': 'Custom API integrations on the Pro plan',
    'Räätälöity kokonaisuus kampaamon, autokorjaamon, ravintolan tai vastaavan toimialan erityistarpeisiin:, menu, galleria.':
      'A tailored package for the specific needs of salons, auto repair, restaurants and similar industries: menus, galleries and more.',
    'Sivustot räätälöitynä': 'Custom-built websites',
    'Sivusto näyttää täydelliseltä kaikilla laitteilla: puhelin, tabletti, tietokone.': 'The site looks perfect on every device: phone, tablet, desktop.',
    'Mobile-first lähestymistapa': 'Mobile-first approach',
    'Selkeä ehdotus': 'Clear proposal',
    'Selkeä,': 'Clear,',
    'läpinäkyvä': 'transparent',
    'Läpinäkyvät tulokset': 'Transparent results',
    'Saat kuukausittaiset raportit, joista näet tarkalleen mitä tekoälyjärjestelmäsi tekee ja minkälaisia tuloksia se tuottaa.':
      'You get monthly reports showing exactly what the AI is doing and the results it\'s delivering.',
    'Tiimimme rakentaa tekoälyjärjestelmäsi, skriptit ja työnkulut, täysin räätälöitynä brändillesi, äänensävyllesi ja toimialallesi. Ei valmiita malleja, ei kompromisseja. Saat tarkalleen sen mitä yrityksesi tarvitsee.':
      'Our team builds your AI system, scripts and workflows — fully tailored to your brand, tone and industry. No templates, no compromises. You get exactly what your business needs.',
    'Tiimimme rakentaa tekoälyjärjestelmäsi, skriptit ja työnkulut — täysin räätälöitynä brändillesi, äänensävyllesi ja toimialallesi. Ei valmiita malleja, ei kompromisseja. Saat tarkalleen sen mitä yrityksesi tarvitsee.':
      'Our team builds your AI system, scripts and workflows — fully tailored to your brand, tone and industry. No templates, no compromises. You get exactly what your business needs.',
    'Kuukausittaiset tarkistukset, reaaliaikainen suorituskykydata ja jatkuva hienosäätö, jotta järjestelmäsi kehittyy ajan myötä ja tulokset kasvavat kuukausittain. Tekoälysi oppii jatkuvasti, ja niin oppii myös strategiasi.':
      'Monthly check-ins, real-time performance data and continuous fine-tuning so your system improves over time and results grow month after month. Your AI keeps learning, and so does your strategy.',
    'Kuukausittaiset tarkistukset, reaaliaikainen suorituskykydata ja jatkuva hienosäätö — jotta järjestelmäsi kehittyy ajan myötä ja tulokset kasvavat kuukausittain. Tekoälysi oppii jatkuvasti, ja niin oppii myös strategiasi.':
      'Monthly check-ins, real-time performance data and continuous fine-tuning so your system improves over time and results grow month after month. Your AI keeps learning, and so does your strategy.',
    'Toimii työkalujesi': 'Works with your tools',
    'Yli 500 integraatiota Zapierin kautta tai natiivi yhteys suosituimpiin järjestelmiin. Ei koodia, ei IT-tiimiä tarvita.':
      '500+ integrations via Zapier or native connections to popular tools. No code, no IT team required.',
    'Zapier ja Make.com yli 500 muuhun työkaluun': 'Zapier and Make.com to 500+ other tools',

    // ---------- demo / call states ----------
    'Tekoäly analysoi pyyntösi ja vastaa siihen luonnollisella kielellä': 'The AI analyses your request and replies in natural language',
    'Tekoäly tarkistaa kalenterisi reaaliajassa, tarjoaa vapaita aikoja ja vahvistaa varauksen suoraan puhelun aikana, ilman manuaalista työtä. Muistutukset lähetetään automaattisesti.':
      'The AI checks your calendar in real time, offers open slots and confirms the booking during the call — no manual work. Reminders are sent automatically.',
    'Tekoäly tunnistaa automaattiset robottipuhelut, myyntipuhelut ja häiriösoittajat ja suodattaa ne pois. Tiimisi kuulee vain aidot asiakkaat.':
      'The AI identifies robocalls, sales calls and nuisance callers and filters them out. Your team only hears real customers.',
    'Tekoäly tunnistaa puhelun aiheen ja ohjaa sen oikeaan paikkaan: varauksiin, myyntiin tai asiakaspalveluun.':
      'The AI recognises the topic and routes the call to the right place — bookings, sales or support.',
    'Tekoäly tunnistaa soittajan kielen automaattisesti ja vaihtaa kielelle saumattomasti. Suomi sisältyy Aloituspakettiin. Monikielinen vastaanotto (suomi, ruotsi ja englanti) on saatavilla Kasvupaketissa.':
      'The AI auto-detects the caller\'s language and switches seamlessly. Finnish is included in Starter. Multilingual reception (Finnish, Swedish and English) is available in Growth.',
    'Tekoäly varaa tapaamisia suoraan Google Calendar tai Outlook -kalenteriisi ilman välikäsiä.': 'The AI books meetings directly into your Google Calendar or Outlook.',
    'Tekoäly vastaa jokaiseen puheluun, myös ruuhkapiikkien aikana ja yöllä. Yhdenkään asiakkaan ei tarvitse odottaa.':
      'The AI answers every call, even at peak times and at night. No customer has to wait.',
    'Tekoäly voi lähettää tekstiviestejä suoraan puhelun aikana: varausvahvistukset, karttalinkit, hinnaston tai yhteystiedot. Asiakkaan ei tarvitse kirjoittaa mitään ylös.':
      'The AI can send texts during the call: booking confirmations, map links, pricing or contact details. The customer doesn\'t need to write anything down.',
    'Tekoäly esittää oikeat kysymykset ja arvioi jokaisen soittajan ostoaikomuksen ennen kuin yhtään myyjän minuuttia kulutetaan.':
      'The AI asks the right questions and evaluates every caller\'s buying intent before a single sales minute is spent.',
    'Tekoäly puhuu sujuvaa suomea ja mukauttaa äänensävyn brändisi mukaan. Asiakkaasi saa aina rauhallisen, asiantuntevan vastaanoton.':
      'The AI speaks fluent Finnish and adapts its tone to your brand. Every customer gets a calm, expert reception.',
    'Toisin kuin ihmiset, tekoälyvastaanottaja voi käsitellä kymmeniä puheluita täsmälleen samaan aikaan. Ei koskaan varattu, ei koskaan ruuhkaa, edes kampanjoiden tai sesonkien aikana.':
      'Unlike humans, an AI receptionist handles dozens of calls at the exact same time. Never busy, never queued — even during campaigns or seasonal peaks.',
    'Jokainen puhelu hoidetaan johdonmukaisesti brändisi äänensävyllä. Järjestelmä puhuu luonnollista suomea ja mukauttaa persoonansa juuri sinun yrityksellesi.':
      'Every call is handled consistently in your brand voice. The system speaks natural Finnish and adapts its persona specifically to your business.',
    'Jokaisen puhelun jälkeen asiakas saa automaattisen yhteenvedon, vahvistuksen tai lisätietoja tekstiviestinä.':
      'After every call the customer receives an automatic summary, confirmation or follow-up info by SMS.',
    'Jokaisen puhelun jälkeen tekoäly tuottaa automaattisen yhteenvedon: asiakastiedot, asian syy ja sovitut toimenpiteet. Puheluja ei tallenneta – ainoastaan oleellinen tieto kirjataan.':
      'After every call the AI produces an automatic summary: customer details, reason for calling and agreed next steps. Calls aren\'t recorded — only the essentials are logged.',
    'Jokaisen puhelun jälkeen tekoäly tuottaa automaattisen yhteenvedon: soittajan tiedot, asian syy, sovitut toimenpiteet ja mahdollinen ajanvaraus. Puheluja ei tallenneta, ainoastaan oleellinen tieto kirjataan.':
      'After every call the AI produces an automatic summary: caller details, reason, agreed actions and any booking. Calls aren\'t recorded — only the essentials are logged.',
    'Jokaisen puhelun jälkeen tekoäly on kerännyt yhteystiedot, selvittänyt tarpeet ja pisteyttänyt liidin. Kasvupaketissa tiedot synkronoituvat automaattisesti CRM-järjestelmääsi. Myyntitiimisi saa vain valmiiksi kvalifioidut liidit.':
      'After every call the AI has collected contact details, qualified needs and scored the lead. In Growth, data syncs to your CRM automatically. Your sales team only gets pre-qualified leads.',
    'Tekoälyvastaanottaja on online joka hetki: yöllä, viikonloppuna ja juhlapyhinä. Jokainen soitto vastataan alle 2 sekunnissa. Ei voicemailia, ei ruuhkaa, ei menetettyä liiketoimintaa.':
      'The AI receptionist is online at every moment: nights, weekends, holidays. Every call is answered in under 2 seconds. No voicemail, no queues, no lost business.',
    'Tekoälyvastaanottaja puhuu täysin sinun brändisi äänellä: nimellä, tyyliä ja skriptejä myöten.': 'The AI receptionist speaks entirely in your brand voice — name, tone and scripts.',
    'Tekoälyvastaanottaja vastaa puheluihin 24/7, myös öisin ja viikonloppuisin': 'The AI receptionist answers calls 24/7, including nights and weekends',
    'Tekoälyvastaanottaja hoitaa ajanvaraukset, potilasmuistutukset ja jälkihoitoyhteydenotot, GDPR-yhteensopivasti ja 24/7.':
      'The AI receptionist handles appointment booking, patient reminders and follow-ups, GDPR-compliant and 24/7.',
    'Tekoälyvastaanottajasi on töissä silloinkin, kun et itse pysty vastaamaan, ei yhtään menetettyä asiakasta, ei vastaamatonta puhelua. Kiinteä kuukausihinta, ei piilomaksuja.':
      'Your AI receptionist is at work even when you can\'t answer — no lost customers, no unanswered calls. Flat monthly fee, no hidden costs.',

    // ---------- ROI / banner ----------
    'Hinnoittelu — Selora': 'Pricing — Selora',
    'Tekoälyn nimi, äänensävy, persoonallisuus ja puhetyyli räätälöidään täsmälleen vastaamaan brändisi identiteettiä. Asiakas ei tiedä puhuvansa tekoälyn kanssa, ellei halua kertoa.':
      'The AI\'s name, tone, personality and speaking style are tailored to match your brand identity exactly. Customers won\'t know it\'s an AI unless you choose to tell them.',

    // ---------- cookie banner ----------
    'Tämä sivusto käyttää evästeitä': 'This site uses cookies',
    'Käytämme evästeitä sivuston toiminnan parantamiseen ja kävijätilastoihin.': 'We use cookies to improve site performance and gather visitor analytics.',
    'Plausible Analytics. Ei evästeitä, ei henkilötietoja, palvelin EU:ssa.': 'Plausible Analytics. No cookies, no personal data, EU-hosted.',
    'Evästeasetustesi muistaminen. Näitä ei voi poistaa käytöstä.': 'Remembers your cookie preferences. These can\'t be disabled.',
    'Välttämättömät': 'Essential',
    'Välttämättömät evästeet': 'Essential cookies',
    'Toiminnalliset evästeet': 'Functional cookies',
    'Analytiikkaevästeet': 'Analytics cookies',
    'Käyttäjäasetusten muistaminen': 'Remembering user preferences',
    'Kävijätilastot (anonymisoitu), sivuston kehittäminen': 'Visitor analytics (anonymised), site improvements',
    'Verkkosivuston käytön seuranta ja parantaminen': 'Tracking and improving site usage',
    'IP-osoite (anonymisoitu), evästetiedot, sivuston käyttäytymisdata': 'IP address (anonymised), cookie data, site behaviour data',

    // ---------- 404 ----------
    'Sivua ei löydy – Selora': 'Page not found – Selora',
    'Etsimäsi sivu on poistettu, siirretty tai osoite on kirjoitettu väärin. Ei hätää — pääset takaisin oikeille raiteille alla olevista linkeistä.':
      'The page you\'re looking for has been removed, moved or mistyped. No worries — the links below will get you back on track.',
    'Etusivulle': 'Back to home',

    // ---------- footer / company / legal ----------
    'Selora Oy': 'Selora Oy',
    'Autamme suomalaisia yrityksiä kasvamaan tekoälyn avulla. Nopea käyttöönotto ja selkeät tulokset.':
      'We help Finnish businesses grow with AI. Fast onboarding, clear results.',
    'Autamme suomalaisia yrityksiä kasvamaan tekoälyn avulla. Rakennamme, konfiguroimme ja toimitamme sinulle valmiina alle 48 tunnissa.':
      'We help Finnish businesses grow with AI. We build, configure and deliver — fully ready in under 48 hours.',
    '© 2025 Selora Oy · Y-tunnus: 3535677-9 · Kaikki oikeudet pidätetään.': '© 2025 Selora Oy · Business ID: 3535677-9 · All rights reserved.',
    '© 2025 Selora. Kaikki oikeudet pidätetään.': '© 2025 Selora. All rights reserved.',
    '© 2025 Selora. Kaikki oikeudet pidätetään.  ·  ': '© 2025 Selora. All rights reserved.  ·  ',
    'Tietosuojaseloste — Selora': 'Privacy Policy — Selora',
    'Tietosuojaselosteen päivittäminen': 'Updates to this policy',
    'Henkilötietojesi rekisterinpitäjä on:': 'The controller of your personal data is:',
    'Rekisterinpitäjän tiedot': 'Controller details',
    'Selora Oy, tietosuoja-asiat': 'Selora Oy, privacy matters',
    'Mitä henkilötietoja käsittelemme ja miksi': 'What personal data we process and why',
    'Selora Oy käsittelee henkilötietoja seuraavissa yhteyksissä:': 'Selora Oy processes personal data in the following contexts:',
    'Tekoälyjärjestelmän henkilötietojen käsittely': 'Personal data processing in the AI system',
    'Seloran tekoälyvastaanottaja käyttää automaattista puheentunnistusta ja tekoälyä puheluiden käsittelyyn asiakkaidemme puolesta. Tämä tarkoittaa, että kun soitat Seloran palveluita käyttävän yrityksen numeroon, seuraavat asiat tapahtuvat:':
      'The Selora AI receptionist uses automatic speech recognition and AI to handle calls on our customers\' behalf. This means when you call a number that uses Selora, the following happens:',
    'Puhelusi vastaanottaa tekoälyjärjestelmä, joka tunnistaa puheesi tekstiksi (puheentunnistus)': 'Your call is received by an AI system that converts your speech to text (speech recognition)',
    'Puheluiden tallentamisesta ilmoitetaan soittajalle puhelun alkaessa automaattisella ääniopastuksella. Soittajalla on oikeus pyytää siirtymistä ihmispalveluun ilmoittamalla tästä puhelun aikana.':
      'Callers are informed about call recording at the start via an automatic voice prompt. Callers have the right to request a transfer to a human service by saying so during the call.',
    'Puhelutallenteet ja -tiivistelmät käsitellään EU:n alueella sijaitsevilla palvelimilla. Tietoja ei siirretä EU:n tai ETA-alueen ulkopuolelle ilman asianmukaisia suojatoimia.':
      'Call recordings and summaries are processed on servers located in the EU. Data is not transferred outside the EU/EEA without appropriate safeguards.',
    'Kuinka kauan säilytämme tietojasi': 'How long we retain your data',
    'Tietoja säilytetään enintään yllä mainitut ajat, jonka jälkeen ne poistetaan tai anonymisoidaan pysyvästi.': 'Data is retained for no longer than the periods listed above, after which it is permanently deleted or anonymised.',
    'Kansainväliset tiedonsiirrot': 'International data transfers',
    'Käsittelemme tietoja ensisijaisesti EU:n ja ETA:n alueella sijaitsevilla palvelimilla. Jos tietoja on tarpeen siirtää kolmansiin maihin, varmistamme siirtojen lainmukaisuuden käyttämällä:':
      'We primarily process data on servers within the EU/EEA. Where transfers to third countries are necessary, we ensure they are lawful by using:',
    'Euroopan komission hyväksymiä vakiosopimuslausekkeita (SCC)': 'European Commission-approved Standard Contractual Clauses (SCCs)',
    'Riittävyyttä koskevia päätöksiä (kuten EU-US Data Privacy Framework -kehys)': 'Adequacy decisions (such as the EU-US Data Privacy Framework)',
    'Voit pyytää lisätietoja tiedonsiirtojen suojatoimista ottamalla yhteyttä osoitteeseen': 'You can request more information on transfer safeguards by emailing',
    'Toteutamme asianmukaiset tekniset ja organisatoriset suojatoimet henkilötietojesi suojaamiseksi luvattomalta pääsyltä, muutoksilta, paljastumiselta tai tuhoutumiselta:':
      'We implement appropriate technical and organisational safeguards to protect your personal data from unauthorised access, alteration, disclosure or destruction:',
    'Kaiken siirrettävän datan salaus TLS 1.3 -protokollalla': 'TLS 1.3 encryption for all data in transit',
    'Pääsynhallinta vähimmän oikeuden periaatteella (least privilege)': 'Access control on a least-privilege basis',
    'Säännölliset tietoturva-auditoinnit ja haavoittuvuusskannailu': 'Regular security audits and vulnerability scanning',
    'Henkilökunnan tietoturvakoulutus': 'Staff security training',
    'Emme käytä tekoälyjärjestelmää itsenäiseen päätöksentekoon, jolla olisi merkittäviä oikeudellisia vaikutuksia rekisteröityyn. Tekoäly toimii aina asiakkaamme yrityksen ohjauksessa ja vastuulla (GDPR 22 artikla).':
      'We do not use the AI system for autonomous decision-making with significant legal effect on the data subject. The AI always operates under our customer business\'s direction and responsibility (GDPR Article 22).',
    'Emme myy henkilötietojasi kolmansille osapuolille. Käytämme luotettavia alihankkijoita palveluidemme tuottamiseen. Kaikki alihankkijat on velvoitettu noudattamaan GDPR:ää ja ovat allekirjoittaneet tietojenkäsittelysopimuksen (DPA) kanssamme.':
      'We do not sell your personal data to third parties. We use trusted subcontractors to deliver our services. All subcontractors are required to comply with GDPR and have signed a Data Processing Agreement (DPA) with us.',
    'Puheentunnistus- ja kielimalliteknologian toimittajat (käsittelevät puhelutietoja palvelun tuottamiseksi)': 'Speech recognition and language model providers (process call data to deliver the service)',
    'Tekoälypalveluntarjoajat:': 'AI service providers:',
    'Sähköpostijärjestelmät:': 'Email systems:',
    'Laskutusjärjestelmät:': 'Billing systems:',
    'Viestintäpalveluiden tarjoajat': 'Communication service providers',
    'GDPR:n mukaan sinulla on seuraavat oikeudet henkilötietojesi käsittelyyn. Voit käyttää oikeuksiasi ottamalla yhteyttä osoitteeseen':
      'Under GDPR, you have the following rights regarding your personal data. You can exercise them by contacting',
    'Sinulla on oikeus saada vahvistus siitä, käsitteleekö Selora sinua koskevia henkilötietoja, ja pyytää kopio käsiteltävistä tiedoistasi.':
      'You have the right to confirmation of whether Selora processes your personal data, and to request a copy of the data we hold.',
    'Sinulla on oikeus pyytää virheellisten tai puutteellisten henkilötietojesi korjaamista viipymättä.':
      'You have the right to request correction of inaccurate or incomplete personal data without undue delay.',
    'Sinulla on oikeus pyytää henkilötietojesi poistamista ("oikeus tulla unohdetuksi"), kun käsittelylle ei enää ole perustetta.':
      'You have the right to request erasure of your personal data ("right to be forgotten") when there is no longer a basis for processing.',
    'Sinulla on oikeus pyytää henkilötietojesi käsittelyn rajoittamista tietyissä tilanteissa, esimerkiksi tietojen oikeellisuuden riitauttamisen ajaksi.':
      'You have the right to request restriction of processing in certain situations — for example, while contesting accuracy.',
    'Sinulla on oikeus saada suostumukseesi tai sopimukseen perustuvat tietosi koneluettavassa muodossa ja siirtää ne toiselle rekisterinpitäjälle.':
      'You have the right to receive data based on your consent or contract in a machine-readable format and to transfer it to another controller.',
    'Sinulla on oikeus vastustaa henkilötietojesi käsittelyä, joka perustuu oikeutettuun etuun tai profilointiin, omaan henkilökohtaiseen tilanteeseesi liittyvistä syistä.':
      'You have the right to object to processing based on legitimate interests or profiling, on grounds relating to your particular situation.',
    'Voit peruuttaa suostumuksesi milloin tahansa ilman, että se vaikuttaa peruuttamista edeltäneen käsittelyn lainmukaisuuteen.':
      'You can withdraw consent at any time, without affecting the lawfulness of processing prior to withdrawal.',
    'Sinulla on oikeus tehdä valitus Tietosuojavaltuutetun toimistolle, jos katsot, että henkilötietojasi ei käsitellä lainmukaisesti.':
      'You have the right to lodge a complaint with the Office of the Data Protection Ombudsman if you believe your data is being processed unlawfully.',
    'Oikeus käsittelyn rajoittamiseen': 'Right to restriction of processing',
    'Oikeus tehdä valitus valvontaviranomaiselle': 'Right to lodge a complaint with a supervisory authority',
    'Sinulla on oikeus tehdä valitus toimivaltaiselle tietosuojaviranomaiselle, jos katsot, että henkilötietojesi käsittely ei ole GDPR:n mukaista. Suomessa toimivaltainen valvontaviranomainen on:':
      'You have the right to lodge a complaint with the competent data protection authority if you believe processing is not GDPR-compliant. In Finland the supervisory authority is:',
    'Tietosuojavaltuutetun toimisto': 'Office of the Data Protection Ombudsman',
    'Tietosuoja-asioissa voit ottaa meihin yhteyttä sähköpostitse osoitteeseen': 'For privacy matters, contact us by email at',
    'Suosittelemme kuitenkin ottamaan meihin yhteyttä ensin, jotta voimme ratkaista asian mahdollisimman nopeasti suoraan.':
      'We recommend contacting us first so we can resolve the matter as quickly as possible.',
    '. Pyrimme vastaamaan kaikkiin tietosuojapyyntöihin 30 päivän kuluessa.': '. We aim to respond to all privacy requests within 30 days.',
    'Suosittelemme tarkistamaan tämän selosteen säännöllisesti pysyäksesi ajan tasalla siitä, miten käsittelemme henkilötietojasi.':
      'We recommend reviewing this policy regularly to stay informed about how we handle your personal data.',
    'Pidätämme oikeuden päivittää tätä tietosuojaselostetta toimintamme tai lainsäädännön muuttuessa. Merkittävistä muutoksista ilmoitamme verkkosivustollamme tai sähköpostitse. Päivitetyn selosteen voimaantulopäivä ilmoitetaan sivun yläosassa.':
      'We reserve the right to update this policy as our operations or the law evolve. We\'ll announce significant changes on our website or by email. The effective date of the updated policy is shown at the top of this page.',
    'Vastauksesi tietopyyntöön toimitetaan 30 päivän kuluessa. Monimutkaisten pyyntöjen osalta voimme jatkaa käsittelyaikaa enintään kahdella kuukaudella, josta ilmoitamme sinulle.':
      'A response to your data request will be provided within 30 days. For complex requests we may extend the period by up to two months and will notify you.',
    'Pyydämme sinua yksilöimään pyyntösi mahdollisimman tarkasti, jotta voimme käsitellä sen tehokkaasti. Saatamme pyytää henkilöllisyytesi varmistamista ennen tietopyyntöön vastaamista rekisteröidyn tietosuojan varmistamiseksi.':
      'Please specify your request as precisely as possible so we can handle it efficiently. We may ask you to verify your identity before responding, to protect your privacy.',
    'Kaikissa henkilötietojesi käsittelyä koskevissa kysymyksissä ja oikeuksien käyttämistä koskevissa pyynnöissä ota yhteyttä:':
      'For any questions about processing of your personal data or to exercise your rights, contact:',
    'Voimme luovuttaa henkilötietoja viranomaisille, jos laki niin velvoittaa tai jos se on tarpeen oikeudellisten vaateiden esittämiseksi, toteuttamiseksi tai puolustamiseksi.':
      'We may disclose personal data to authorities where required by law or where necessary to assert, exercise or defend legal claims.',
    'Tietoturvaloukkausepäilystä ilmoitamme Tietosuojavaltuutetun toimistolle 72 tunnin kuluessa havaitsemisesta GDPR 33 artiklan mukaisesti.':
      'We notify the Office of the Data Protection Ombudsman of any suspected data breach within 72 hours of detection, in line with GDPR Article 33.',
    'Verkkosivustomme käyttää evästeitä (cookies) palvelun toiminnan varmistamiseksi ja käyttökokemuksen parantamiseksi. Eväste on pieni tekstitiedosto, joka tallennetaan laitteellesi vieraillessasi verkkosivustollamme.':
      'Our website uses cookies to ensure the service works and improve your experience. A cookie is a small text file stored on your device when you visit our site.',
    'Voit hallita evästeasetuksia selaimesi asetuksista tai kieltää evästeiden käytön kokonaan. Huomaa, että evästeiden estäminen voi vaikuttaa sivuston toiminnallisuuteen.':
      'You can manage cookie settings in your browser or block cookies entirely. Note that blocking cookies may affect site functionality.',
    'Evästeiden käyttö': 'Cookie usage',

    // ---------- auth ----------
    'Kirjaudu sisään — Selora': 'Sign in — Selora',
    'Pääset hallinnoimaan tekoälyvastaanottajaasi ja tarkastelemaan tilastoja.': 'Manage your AI receptionist and review your stats.',
    'Vain valtuutetuille käyttäjille.': 'For authorised users only.',
    'Klikkaa sähköpostiviestin linkkiä aktivoidaksesi tilisi ja pääset luomaan demo-vastaanottajasi.':
      'Click the link in the email to activate your account and create your demo receptionist.',
    'Linkki ei ole enää voimassa tai se on jo käytetty.': 'The link is no longer valid or has already been used.',
    'Syötä sähköpostiosoitteesi, niin lähetämme palautuslinkin.': 'Enter your email and we\'ll send you a reset link.',
    'Rekisteröidy ja saat heti oman demo-tekoälyvastaanottajan — konfiguroitu sinun yrityksellesi.': 'Sign up and get your own demo AI receptionist instantly — configured for your business.',
    'Rekisteröidy sekunnissa. Ei luottokorttia, ei sitoutumista.': 'Sign up in seconds. No credit card, no commitment.',

    // ---------- onboarding ----------
    'Luodaan sinulle personoitu tekoälypuhelinvastaaja. Vastaa muutamaan kysymykseen yrityksestäsi ja agenttisi on valmis minuuteissa.':
      'We\'re building your personalised AI phone receptionist. Answer a few questions about your business and your agent will be ready in minutes.',
    'Sinut ohjataan suoraan lyhyeen kyselyyn — aukioloajat, palvelut, äänensävy, tervehdysviesti. Kestää alle 5 minuuttia.':
      'You\'ll be taken straight to a short questionnaire — hours, services, tone, greeting. Takes under 5 minutes.',
    'Vastauksistasi rakennetaan automaattisesti täysin personoitu tuotantoagentti — juuri sinun yrityksesi äänellä ja tiedoilla.':
      'Your answers are turned into a fully personalised production agent automatically — with your business\'s voice and data.',
    'Agenttisi on valmis vastaamaan oikeisiin puheluihin. Saat ilmoituksen jokaisesta puhelusta ja näet kaikki tiedot dashboardissasi.':
      'Your agent is ready to take real calls. You get a notification for every call and see everything in your dashboard.',
    'Tämä kestää noin 10–20 sekuntia': 'This takes about 10–20 seconds',
    'Viimeistellään — kohta valmis!': 'Finishing up — almost done!',
    'Agentin tehtävät *': 'Agent tasks *',
    'Agentin äänensävy': 'Agent tone of voice',
    'Aloitusviesti (mitä agentti sanoo ensimmäisenä)': 'Greeting (what the agent says first)',
    'Lisätiedot agentille': 'More info for the agent',
    'Lisätietoja agentille': 'More info for the agent',
    'Muita tärkeitä tietoja agentille (valinnainen)': 'Other important info for the agent (optional)',
    'Peruutuskäytäntö (valinnainen)': 'Cancellation policy (optional)',
    'Linkki varauslomakkeeseen tai verkkosivuille': 'Link to your booking form or website',
    'Valitse yritystäsi parhaiten kuvaava toimiala.': 'Pick the industry that best describes your business.',
    'Nämä tiedot auttavat tekoälyä ymmärtämään yrityksesi kontekstin.': 'These details help the AI understand your business context.',
    'Ei mallipohjia. Ei kompromisseja. Rakennettu juuri sinulle.': 'No templates. No compromises. Built specifically for you.',
    'Kuvaus (excerpt)': 'Description (excerpt)',
    'Henkilöstömäärä': 'Team size',
    '1–9 henkilöä': '1–9 people',
    '10–49 henkilöä': '10–49 people',
    '50–199 henkilöä': '50–199 people',
    '200+ henkilöä': '200+ people',
    'Henkilökunta': 'Staff',
    'Aukioloajat': 'Opening hours',
    'Sävy': 'Tone',
    'Sävy ja': 'Tone and',
    'Äänensävy': 'Tone of voice',
    'Lämmin, helposti lähestyttävä': 'Warm, approachable',
    'Muodollinen tai rento sävy, sinä valitset': 'Formal or casual tone — your call',
    'Ystävällinen': 'Friendly',
    'Oma nimi ja brändipersoona': 'Custom name and brand persona',
    'Yrityskohtainen nimi ja persoonallisuus': 'Business-specific name and personality',
    '🔀 Siirtää puhelut henkilöstölle': '🔀 Transfers calls to staff',
    '📬 Ottaa viestejä (vastaaja)': '📬 Takes messages (voicemail)',
    'Agentin luonti epäonnistui': 'Agent creation failed',
    'Tekoäly rakentaa agentin automaattisesti': 'AI builds the agent automatically',

    // ---------- dashboard ----------
    'Demo-tila —': 'Demo mode —',
    'Demo-käyttäjät': 'Demo users',
    'Demo-puhelut': 'Demo calls',
    '0 / 5 käytetty': '0 / 5 used',
    'testipuhelua jäljellä': 'test calls remaining',
    'Käynnissä päivissä,': 'Live for days,',
    'Tunnistaa palaavat asiakkaat ja muistaa heidän historiatietonsa': 'Recognises returning customers and remembers their history',
    'Tunnistaa liidit ja merkitsee ne ylös jatkotoimia varten': 'Identifies leads and flags them for follow-up',
    'Kirjaa puhelun yhteenvedon ja asiakastiedot jokaisen puhelun jälkeen': 'Logs a call summary and customer details after every call',
    'Lähettää asiakkaalle SMS- ja sähköpostivahvistuksen automaattisesti': 'Sends customers SMS and email confirmations automatically',
    'Ei puheluita.': 'No calls.',
    'Ei puheluita vielä.': 'No calls yet.',
    'Ei puheluita rekisteröity tälle numerolle.': 'No calls logged for this number.',
    'Ei puheluita vielä. Testaa agenttiasi →': 'No calls yet. Try your agent →',
    'Ei rekisteröintejä vielä.': 'No signups yet.',
    'Ei asiakkaita.': 'No customers.',
    'Ei asiakkaita vielä.': 'No customers yet.',
    'Ei manuaalista kirjausta': 'No manual logging',
    'Ei onboardingia': 'No onboarding',
    'Ei turhaa.': 'No fluff.',
    'Ei jonoja, ei äänivastaajaviestejä': 'No queues, no voicemails',
    'Ei jonotusaikaa, vastaus heti ensimmäisellä soittokerralla': 'Zero wait time — answered on the first ring',
    'Ei pitkiä sitoutumisia': 'No long-term commitments',
    'Ei pitkiä sopimuksia, voit irtisanoa milloin tahansa': 'No long contracts — cancel anytime',
    'Ei IT-jargonia. Alle 48 tunnissa käyttöön.': 'No IT jargon. Live in under 48 hours.',
    'Ei yllätyksiä.': 'No surprises.',
    'Viimeisimmät': 'Latest',
    'viimeisimmät': 'latest',
    'Viimeisimmät puhelut': 'Recent calls',
    'Aktivoi': 'Activate',
    'Otetaan agentti täysversioon käyttöön': 'Activate full version',
    'ei vielä maksanut': 'has not paid yet',
    'rekisteröityä tiliä': 'registered accounts',
    'sisään': 'in',
    'Kaikki Seloraan rekisteröityneet tilit': 'All accounts registered with Selora',
    'Luo uusia asiakastilejä, hallinnoi suunnitelmia ja seuraa agenttien tilaa.': 'Create new customer accounts, manage plans and monitor agent status.',
    'Tämä korvaa käyttäjän nykyisen agentin ja linkittää olemassa olevan Retell-agentin suoraan heidän tililleen.':
      'This replaces the user\'s current agent and links an existing Retell agent directly to their account.',
    'Tilaus': 'Subscription',
    'Tilaus rekisteröidään ja saat vahvistussähköpostin välittömästi. Maksu käsitellään turvallisesti Stripe-palvelun kautta.':
      'Your order is recorded and you\'ll receive a confirmation email immediately. Payment is processed securely via Stripe.',
    'Maksu vahvistetaan': 'Payment confirmed',
    'Maksut käsittelee': 'Payments processed by',
    'Siirrytään maksusivulle...': 'Redirecting to checkout…',
    'Saat vahvistussähköpostin heti oston jälkeen. Tekoälyvastaanottajasi on käytössä 24 tunnin sisällä — tiimimme ottaa sinuun yhteyttä puhelinnumeron asennuksen sopimiseksi.':
      'You\'ll get a confirmation email right after purchase. Your AI receptionist will be live within 24 hours — our team will reach out to set up your phone number.',
    'Oston jälkeen käyt läpi lyhyen kyselyn — tekoälysi rakennetaan juuri sinun yrityksellesi, automaattisesti.':
      'After purchase you\'ll go through a short questionnaire — your AI is built for your business automatically.',
    'Oston jälkeen käyt läpi lyhyen personointikyselyn — AI rakentaa agentin automaattisesti vastaustesi pohjalta. Ei odottelua, ei manuaalista konfigurointia.':
      'After purchase you\'ll go through a short personalisation questionnaire — the AI builds your agent automatically from your answers. No waiting, no manual configuration.',
    'Oston jälkeen sinut ohjataan automaattisesti personointikyselyyn — ei odottelua, ei sähköposteja, ei asennuksia. Agenttisi on käytössä saman istunnon aikana.':
      'After purchase you\'re redirected straight to the personalisation questionnaire — no waiting, no emails, no installs. Your agent is live in the same session.',
    'täydelliseen agenttiin': 'to a complete agent',
    'täysin personoidun': 'a fully personalised',
    'valmiina käyttöön.': 'ready to go.',

    // ---------- unsubscribe ----------
    'Et enää saa Seloran uutiskirjettä sähköpostiisi. Voit tilata sen uudelleen milloin tahansa blogin kautta.':
      'You\'ll no longer receive the Selora newsletter. You can resubscribe anytime via the blog.',
    'Peruutus epäonnistui': 'Unsubscribe failed',

    // ---------- agency / verkkosivut ----------
    'Aloitussivu (Landing page)': 'Landing page',
    'Brändi-sivusto': 'Brand site',
    'Verkkokauppa valinnainen lisä': 'Optional e-commerce add-on',
    'Täysi sivusto': 'Full site',
    'Verkkosivusto + tekoälychatbot': 'Website + AI chatbot',
    'Verkkosivusto on kertaluontoinen projekti. Maksat kerran, sivusto on sinun. Tekoälychatbot sisältyy molempiin paketteihin.':
      'A website is a one-off project. Pay once, the site is yours. The AI chatbot is included in both packages.',
    'Yksi tehokas sivu, joka on suunniteltu yhtä tarkoitusta varten: kampanjaan, palveluun tai liidien keräämiseen. Nopea rakentaa, helppo testata.':
      'One focused page designed for a single goal: a campaign, a service, or lead capture. Fast to build, easy to test.',
    'Asennamme Google Analyticsin ja konversioseurannan, joten tiedät tarkalleen mistä asiakkaat tulevat.':
      'We install Google Analytics and conversion tracking so you know exactly where customers come from.',
    '8+ sivua, täysin räätälöity design': '8+ pages, fully custom design',
    'Avainsanatutkimus ja syväluotaava SEO-optimointi': 'Keyword research and deep SEO optimisation',
    'Käymme läpi tavoitteesi, kohderyhmäsi ja kilpailijasi. Laaditaan sivustorakenne ja sisältösuunnitelma.':
      'We review your goals, audience and competitors. We map the site structure and content plan.',
    'Suunnittelu & sisältö': 'Design & content',
    'Suunnittelu ja tekniikka, jotka tekevät sivustosta tehokkaan.': 'Design and engineering that make the site perform.',
    'Julkaisu & ylläpito': 'Launch & maintenance',
    'Julkaisemme sivuston, varmistamme nopeus ja SEO-optimoinnin. Tarjoamme jatkuvan ylläpidon.':
      'We publish the site, lock down speed and SEO, and provide ongoing maintenance.',
    'Julkaisemme yhdessä täydellisellä testauksella ja perusteellisella perehdytyksellä. Hoidamme kaikki tekniset asennukset ja integraatiot — sinun ei tarvitse koskea koodiin. Saat selkeän kuvan kaikesta käynnissä olevasta.':
      'We launch together with thorough testing and onboarding. We handle every technical install and integration — you don\'t touch any code. You get a clear view of everything running.',
    'Rakennamme sivuston alusta asti: ulkoasu, teksti, kuvat, lomakkeet. Iteroimme yhdessä kunnes olet tyytyväinen.':
      'We build the site from scratch: layout, copy, images, forms. We iterate together until you\'re happy.',
    'Rakennamme sivuston hakukoneystävälliseksi alusta asti: nopeus, rakenne, metatiedot.':
      'We build the site SEO-friendly from day one: speed, structure, metadata.',
    'Kirjoitamme myyvät tekstit suomeksi, jotka puhuttelevat kohderyhmääsi ja ohjaavat toimintaan.':
      'We write conversion-focused Finnish copy that speaks to your audience and drives action.',
    'Sisällön ja kuvien päivitykset': 'Content and image updates',
    'Tietoturva- ja suorituskykypäivitykset': 'Security and performance updates',
    'Selkeä ylläpito-ohje sinulle': 'Clear maintenance guide for you',
    'Ylläpitosopimus pitää sivustosi ajan tasalla ja toimintakuntoisessa.': 'A maintenance contract keeps your site current and in working order.',
    'Kerro meille tarpeistasi, saat tarjouksen 24 tunnin sisällä. Ei sitoumuksia, ei piilokuluja, ei yllätyksiä.':
      'Tell us your needs and get a quote within 24 hours. No commitments, no hidden fees, no surprises.',
    'Aloitetaan kartoituspuhelulla. Se on maksuton, ilman sitoumuksia — ja sen jälkeen tiedät tarkalleen mitä saisit.':
      'Let\'s start with a discovery call. It\'s free and non-committal — and afterwards you\'ll know exactly what you\'d get.',
    'Kolme sivustotyyppiä, jotka toimivat sinun liiketoiminnassasi.': 'Three site types that fit your business.',

    // ---------- industries ----------
    'Hammaslääkärit': 'Dentists',
    'Lääkäriasema': 'Medical clinic',
    'Lääkäriasema / Klinikka': 'Medical clinic',
    'Kiinteistöala': 'Real estate',
    'Kiinteistönvälitys': 'Real estate brokerage',
    'Kiinteistövälitys': 'Real estate',
    'Kotitalouspalvelut (LVI, Sähkö)': 'Home services (HVAC, electrical)',
    'Sähköasennus': 'Electrical installation',
    'Rakennus & kiinteistö': 'Construction & real estate',
    'Terveydenhuolto & hammaslääkärit': 'Healthcare & dentistry',
    '🦷 Hammaslääkäri': '🦷 Dentist',
    '🏥 Lääkäriasema / Klinikka': '🏥 Medical clinic',
    '🏠 Kiinteistönvälitys': '🏠 Real estate',
    '⚡ Sähköasennus': '⚡ Electrical installation',
    'Moderni korjaamo: enemmän varauksia verkosta': 'Modern auto shop: more bookings online',
    'Kampaamo: ajanvaraus suoraan sivustolta, kalenteri täyttyy': 'Salon: bookings straight from the site, calendar fills up',
    'Ravintola: pöytävaraukset ja menu suoraan sivustolta': 'Restaurant: table bookings and menu straight from the site',
    'LVI-yritys: tarjouspyynnöt 24/7 ilman puhelinsoittoja': 'HVAC company: quote requests 24/7 without phone calls',
    'Huoltovaraukset, ajanvaraus ja palveluhinnasto helposti löydettävissä.': 'Service bookings, appointments and pricing easy to find.',
    'Huoltovaraukset, tarjouspyynnöt ja asiakaskyselyt 24/7, myös viikonloppuisin.': 'Service bookings, quotes and customer enquiries 24/7, including weekends.',
    'Huoltoajat, tarjouspyynnöt ja testiajovaraukset 24/7, ja asiakas saa vahvistuksen heti, sinulle jää aikaa korjata autoja.':
      'Service slots, quote requests and test-drive bookings 24/7, with instant customer confirmations — leaving you time to fix cars.',
    'Pöytävaraukset, tilaukset ja asiakaskyselyt sujuvasti, myös ruuhka-aikoina ja suljettuina tunteina.':
      'Table bookings, orders and enquiries handled smoothly — even during peak hours and after closing.',
    'Pöytävaraukset, tilaukset ja aukiolokyselyt, myös kiireenä hetkinä.': 'Table bookings, orders and opening-hours questions — even during the rush.',
    'Pöytävaraukset ja muutokset reaaliajassa': 'Table bookings and changes in real time',
    'Menu, aukioloajat ja pöytävaraus suoraan sivustolta.': 'Menu, opening hours and table booking right from the site.',
    'Tarjouspyynnöt, palvelualueet ja referenssit yhdellä sivulla.': 'Quote requests, service areas and references on a single page.',
    'Tarjouspyynnöt, projektikyselyt ja alihankkijakontaktit hallinnassa: tekoäly suodattaa ja priorisoi tärkeimmät yhteydenotot.':
      'Quote requests, project enquiries and subcontractor contacts under control — the AI filters and prioritises the most important ones.',
    'Tarjouspyyntöjen automaattinen vastaanotto': 'Automatic intake of quote requests',
    'Tarjouspyyntöjen kerääminen ja luokittelu': 'Collect and categorise quote requests',
    'Tarjouspyyntöjen vastaanotto ja luokittelu': 'Receive and categorise quote requests',
    'Liidien kvalifiointi, tapaamisten sopiminen ja asiakaspalvelu säädösten mukaisesti, jokainen yhteydenotto käsitellään ammattimaisesti.':
      'Lead qualification, meeting scheduling and compliant customer service — every contact handled professionally.',
    'Liidien pisteytys ennaltamääriteltyjen kriteerien mukaan': 'Lead scoring against your predefined criteria',
    'Näyttöajat, tarjouspyynnöt ja ostajien esikvalifiointi hoidetaan automaattisesti, myös ilta- ja viikonloppukyselyihin vastataan.':
      'Viewings, offer requests and buyer pre-qualification are handled automatically — including evening and weekend enquiries.',
    'Näyttöajat, ostajien kvalifiointi ja tarjouspyynnöt hoidetaan ennen toimiston aukaisua.':
      'Viewings, buyer qualification and quote requests are handled before the office even opens.',
    'Näyttöaikojen varaus 24/7': 'Viewing bookings 24/7',
    'LVI-, sähkö- ja siivousyritykset: asiakaspyynnöt, aikataulutus ja tarjoukset ilman käsityötä.':
      'HVAC, electrical and cleaning companies: customer requests, scheduling and quotes — without manual work.',
    'Ajanvaraukset ja muistutukset täysin automaattisesti, jotta sinä voit keskittyä asiakkaaseesi.':
      'Appointment booking and reminders fully automated so you can focus on your customer.',
    'Ajanvaraukset, peruutukset ja muistutukset täysin automaattisesti.': 'Bookings, cancellations and reminders fully automated.',
    'Ajanvaraukset kirjataan suoraan yrityksen kalenterijärjestelmään': 'Appointments logged straight into your calendar',
    'Ajanvaraus ja peruutukset automaattisesti': 'Appointments and cancellations automated',
    'Ajanvaraus suoraan kalenteriisi': 'Booking straight into your calendar',
    'Ajanvarausten hallinta': 'Appointment management',
    'Ajanvaraus': 'Appointments',
    'Ajastettavat seurantasekvenssit': 'Scheduled follow-up sequences',
    'Potilasmuistutukset tekstiviestillä': 'Patient reminders by SMS',
    'SMS-muistutukset vähentävät poisjääntejä': 'SMS reminders reduce no-shows',
    'Välittömät vastaukset myynti-ilmoitusten kyselyihin': 'Instant replies to listing enquiries',
    'Välitön ilmoitus kuumista liideistä': 'Instant alerts for hot leads',
    'Välitä nämä tiedot asiakkaalle tai lähetä sähköposti on lähetetty automaattisesti.': 'Pass this info to the customer or the email is sent automatically.',
    'Yhteydenottolomakkeet, varausjärjestelmät ja CRM-integraatiot valmiina.': 'Contact forms, booking systems and CRM integrations ready to go.',
    'CRM-integraatio: asiakastiedot siirtyvät suoraan järjestelmääsi': 'CRM integration: customer data flows straight into your system',
    'Kuukausittainen raportti kertoo tarkasti mitä tekoälyvastaanottaja teki.': 'A monthly report shows exactly what the AI receptionist did.',
    'Kuukausittainen raportti kertoo tarkasti mitä tekoälyvastaanottaja teki: puhelumäärät, automaatioaste, liidit, konversiot ja säästetyt henkilöstötunnit selkeässä kojelaudassa.':
      'A monthly report shows exactly what the AI receptionist did: call volume, automation rate, leads, conversions and staff hours saved — all in a clean dashboard.',
    'Kuukausittainen strategiapuhelu ja raportointi': 'Monthly strategy call and reporting',
    'Kuukausiraportti': 'Monthly report',
    'Kuukausiraportti automaattisesti': 'Monthly report automatically',
    'Kuukausiraportti: puhelut, varaukset ja liidit': 'Monthly report: calls, bookings and leads',
    'Kuukausiraportit: puhelumäärät, automaatioaste, liidit ja konversiot yhdessä näkymässä.':
      'Monthly reports: call volume, automation rate, leads and conversions in one view.',
    'Vähentää tiimin kuormitusta merkittävästi': 'Significantly reduces team workload',
    'Säästetyt henkilöstötunnit': 'Staff hours saved',
    'Puhelumäärät ja automaatioaste': 'Call volume and automation rate',
    'Puhelutiivistelmät': 'Call summaries',
    'Puheluyhteenveto lähetetty': 'Call summary sent',
    'Automaattinen puheluyhteenveto jokaisen puhelun jälkeen': 'Automatic call summary after every call',
    'Automaattinen skaalautuminen kysynnän mukaan': 'Auto-scaling with demand',
    'Automaatioita, jotka ovat räätälöity sinun liiketoimintalogiikallesi.': 'Automations tailored to your business logic.',
    'A/B-testaus eri skriptien välillä': 'A/B testing across different scripts',
    'Säädettävät siirtosäännöt per tilanne': 'Adjustable transfer rules per situation',
    'Säädettävät suodatussäännöt': 'Adjustable filtering rules',
    'Soittajan nimi, puhelinnumero, puhelutiivistelmä, ajanvarauksen tiedot': 'Caller name, phone number, call summary, booking details',
    'Kontekstiyhteenveto siirrettävästä puhelusta': 'Context summary for the transferred call',
    'Luonnollinen kielen ymmärtäminen': 'Natural language understanding',
    'Mukautettu ääni ja vastausskripti': 'Custom voice and response script',
    'Mukautettu ääni ja vastausskripti yrityksellesi': 'Custom voice and response script for your business',
    'Rajaton kapasiteetti ilman lisähintaa': 'Unlimited capacity at no extra cost',
    'Rajaton kapasiteetti, ei enää varattua linjaa tai "soitamme myöhemmin".': 'Unlimited capacity — no more "all lines busy" or "we\'ll call you back".',
    'Rutiinikyselyihin vastaaminen (ALV-päivät, deadlinet)': 'Answering routine questions (VAT dates, deadlines)',
    'Yleisten kysymysten käsittely': 'Handling general questions',
    'Yhteystiedot': 'Contact details',
    'Yhteystiedot — Selora': 'Contact — Selora',
    'Sähköpostiosoite, tilaajan nimi': 'Email address, subscriber name',
    'Markkinointiviestintä tilaajille': 'Marketing communications to subscribers',
    'Nimi, sähköpostiosoite, puhelinnumero, yrityksen nimi, viestin sisältö': 'Name, email, phone, company name, message content',
    'Nimi, yhteystiedot, laskutustiedot, palvelun käyttötiedot': 'Name, contact details, billing info, service usage data',
    'Verkkosivuston kautta lähetettyjen viestien käsittely': 'Handling messages sent through the website',
    'Laskutus, asiakasviestintä, palvelun toimittaminen': 'Billing, customer communication, service delivery',
    'Palvelun kehittäminen': 'Service improvement',
    'Sopimus on kuukausittainen. Irtisanomisaika on 30 päivää. Voit irtisanoa milloin tahansa ilman sakkomaksuja tai lisäkuluja. Tietosi palautetaan sinulle pyydettäessä.':
      'Contracts are month-to-month. Notice period is 30 days. You can cancel anytime with no penalty or extra fees. Your data is returned to you on request.',

    // ---------- misc small fragments / labels ----------
    'Viimeisimmät puhelut': 'Recent calls',
    'Tiimisi voi keskittyä olennaiseen.': 'Your team can focus on what matters.',
    'Aina päällä, vastaa joka kerta': 'Always on — answers every time',
    'Lähettää asiakkaalle SMS- ja sähköpostivahvistuksen automaattisesti': 'Sends customers SMS and email confirmations automatically',
    'Kysymyksiä &': 'Questions &',
    'Tekoäly &': 'AI &',
    'Sähköpostiosoite, tilaajan nimi': 'Email address, subscriber name',
    'Tunnistaa palaavat asiakkaat ja muistaa heidän historiatietonsa': 'Recognises returning customers and remembers their history',
    'Mikä on': 'What is',
    'tekoälyn avulla?': 'with AI?',
    'Mitä asiakkaamme': 'What our customers',
    'sanovat': 'say',
    'Yhdistämme järjestelmän kalenteriisi ja puhelinnumeroon. Kasvupaketissa myös CRM-integraatio. Testaamme kaikki skenaariot ennen julkaisua.':
      'We connect the system to your calendar and phone number. Growth also includes CRM integration. We test every scenario before going live.',
    'Saat suomalaisen puhelinnumeron, jonka voit lisätä verkkosivuille, Google-profiiliin tai siirtää nykyisen numeron edelleenohjaukseen. Autamme asennuksessa.':
      'You get a Finnish phone number you can add to your website, Google profile or use as a forwarding target for your current number. We help with setup.',
    'Tarjoamme maksuttoman demo-puhelun, jossa näet itse miten tekoälyvastaanottaja toimii. Varaa aika yhteystiedot-sivulta, täysin sitoutumatta.':
      'We offer a free demo call so you can see the AI receptionist in action. Book a slot from the contact page — no commitment.',
    'Tarjoamme maksuttoman demo-puhelun, jossa voit testata tekoälyvastaanottajaa itse. Varaa aika yhteystiedot-sivulta. Ensimmäinen strategiapuhelu on täysin ilmainen.':
      'We offer a free demo call so you can try the AI receptionist yourself. Book a slot on the contact page. The first strategy call is completely free.',
    'Näytämme tekoälyvastaanottajan toiminnassa juuri sinulle': 'We\'ll show you the AI receptionist in action — for you',
    'Kasvupaketissa jokainen puhelu, liidi ja varaus kirjataan automaattisesti CRM-järjestelmääsi, kuten HubSpot, Pipedrive ja muut.':
      'In Growth, every call, lead and booking is logged automatically to your CRM — HubSpot, Pipedrive and others.',
    'Kasvupaketissa jokainen puhelu, liidi ja varaus synkronoituu automaattisesti CRM-järjestelmääsi reaaliajassa. Ei manuaalista tietojen syöttöä, ei inhimillisiä virheitä, ei viiveitä.':
      'In Growth, every call, lead and booking syncs to your CRM in real time. No manual data entry, no human error, no delays.',
    'Kasvupaketissa suomi, ruotsi ja englanti – asiakkaasi saavat palvelua omalla kielellään.': 'In Growth: Finnish, Swedish and English — your customers are served in their own language.',
    'Kasvupaketissa: synkronoi automaattisesti HubSpotiin, Pipedriveeen tai muuhun CRM-järjestelmääsi.': 'In Growth: auto-syncs to HubSpot, Pipedrive or your other CRM.',
    'Kerro': 'Tell',
    'Kerro yrityksestäsi': 'Tell us about your business',
    'yrityksestäsi': 'about your business',
    'Tämä sivu on englanninkielinen.': 'This page is in English.',
    'Lähetä yhteystiedot, vahvistukset ja linkit tekstiviestillä heti puhelun aikana.': 'Send contact details, confirmations and links by SMS during the call.',
    'Lisäkielet saatavilla tilauksesta': 'Additional languages available on request',
    'Kuinka kauan säilytämme tietojasi': 'How long we keep your data',
    'Aloita testipuhelu': 'Start a test call',
    'Pidätkö enemmän soittamisesta? ': 'Prefer to call? ',
    'Mukautettu ääni ja vastausskripti yrityksellesi': 'Custom voice and response script for your business',
    'Hetki, käsittelemme pyyntöäsi.': 'One moment, processing your request.',
    'Aukioloajat': 'Opening hours',
    'Selora': 'Selora',
    'Säästä aikaa': 'Save time',
    'Linkki ei ole enää voimassa tai se on jo käytetty.': 'The link is no longer valid or has already been used.',
    'Selkeä ylläpito-ohje sinulle': 'A clear maintenance guide for you',
    'Säästä 15 %': 'Save 15%',

    // ---------- assorted shorter phrases ----------
    'Mitä tapahtuu jos minuutit ylittyvät?': 'What if I run over my minutes?',
    'Onko piilomaksuja tai ylimääräisiä kuluja?': 'Are there hidden or extra fees?',
    'Maksut käsittelee': 'Payments handled by',
    'Maksu vahvistetaan': 'Payment confirmed',
    'Tekoäly vai ihmisvastaanottaja? Rehellinen vertailu suomalaiselle yrittäjälle': 'AI or a human receptionist? An honest comparison for Finnish entrepreneurs',
    'Tekoälyvastaanottajan käyttöönotto: mitä oikeasti tapahtuu?': 'Onboarding an AI receptionist — what really happens?',
    'Käytännön opas': 'Practical guide',
    'Yritys *': 'Company *',
    'Saat suomalaisen puhelinnumeron': 'You get a Finnish phone number',
    'sopimuksen': 'contract',
    'Lähetimme vahvistusviestin osoitteeseen': 'We sent a confirmation message to',
    'lisätiedot': 'extra info',
    'tehtävät': 'tasks',
    'sisään': 'in',
    'tänään': 'today',
    'käytetty': 'used',
    'löydy': 'found',
    'Selora — Älä enää missaa yhtään puhelua': 'Selora — Never miss another call',
    'Ehdottomasti. Kaikki data säilytetään EU:n palvelimilla. Olemme täysin GDPR- ja EU AI Act -yhteensopivia. Emme koskaan myy tai jaa tietojasi kolmansille osapuolille.':
      'Absolutely. All data is stored on EU servers. We\'re fully GDPR and EU AI Act compliant. We never sell or share your data with third parties.',
    'Toimii myös sesonkihuipuissa ilman lisäkustannuksia': 'Works through peak season at no extra cost',
    'Tekoäly &amp; kasvu': 'AI & growth',
    'Palvelut &amp;': 'Services &',
    'Kysymyksiä &amp;': 'Questions &',
    'Rakennus &amp; kiinteistö': 'Construction & real estate',
    'Terveydenhuolto &amp; hammaslääkärit': 'Healthcare & dentistry',
    'Räätälöity ulkoasu yrityksesi brändiin': 'Custom design matched to your brand',
    'Kuukausittainen strategiapuhelu ja raportointi': 'Monthly strategy call and reporting',
    'Selkeä,': 'Clear,',
    'läpinäkyvä': 'transparent',
    'Mitä rakennamme': 'What we build',
    'Mitä sisältyy': 'What\'s included',
    'Käytännön vinkit, miten tekoäly tehostaa ajanvarausta ja asiakaspalvelua': 'Practical tips on how AI streamlines booking and customer service',
    'Selkeä prosessi': 'A clear process',
    'sopimuksen': 'contract',
    'Linkitä Retell-agentti': 'Link a Retell agent',
    'Linkitä agentti': 'Link agent',
    'Henkilökunta': 'Staff',
    'Ei mallipohjia. Ei kompromisseja. Rakennettu juuri sinulle.': 'No templates. No compromises. Built specifically for you.',
    'Mukautettu ääni ja vastausskripti': 'Custom voice and response script',
    'Aina tavoitettavissa': 'Always reachable',
    'Aloituspaketti: suomi': 'Starter: Finnish',
    'Kasvupaketti: suomi, ruotsi ja englanti': 'Growth: Finnish, Swedish and English',
    'Tekoälyvastaanottaja': 'AI receptionist',
    'Verkkosivusto + tekoälychatbot': 'Website + AI chatbot',
    'Säästetyt henkilöstötunnit': 'Staff hours saved',
    'Kerro yrityksestäsi — toimiala, palvelut, aukioloajat': 'Tell us about your business — industry, services, hours',
    'Asiakas': 'Customer',
    'Kuvavalinnat ja visuaalinen hierarkia': 'Image choices and visual hierarchy',
    'Brändilähtöinen väripaletti': 'Brand-led colour palette',
    'Päivystys': 'Emergency support',
    'Kuvaus (excerpt)': 'Description (excerpt)',
    'Kalenteriintegraatio (Google / Outlook)': 'Calendar integration (Google / Outlook)',
    'Kalenterivaraus (Calendly tai vastaava)': 'Calendar booking (Calendly or similar)',
    'Yhteystiedot — Selora': 'Contact — Selora',
    'Tervetuloa': 'Welcome',
    'Selkeä ehdotus': 'Clear proposal',
    'Säästö 2 400 € / kk henkilöstökuluissa': 'Saves €2,400/month in staffing costs',
    'Kaikki puhelut nauhoitetaan ja litteroidaan': 'All calls are recorded and transcribed',
    'Verkkosivustomme käyttää evästeitä (cookies) palvelun toiminnan varmistamiseksi ja käyttökokemuksen parantamiseksi. Eväste on pieni tekstitiedosto, joka tallennetaan laitteellesi vieraillessasi verkkosivustollamme.':
      'Our website uses cookies to ensure the service works and to improve your experience. A cookie is a small text file stored on your device when you visit us.',
    'Asiakastuki': 'Customer support',
    'Demo-tila —': 'Demo mode —',
    'Linkki varauslomakkeeseen tai verkkosivuille': 'Link to your booking form or website',
    'Käymme läpi yrityksesi tarpeet ja räätälöimme tekoälyn persoonan, skriptit ja toimintalogiikan juuri sinulle.':
      'We review your needs and tailor the AI\'s persona, scripts and logic specifically for you.',
    'Markkinointiviestintä tilaajille': 'Marketing communications to subscribers',
    'Yhdenkään asiakkaan ei tarvitse odottaa.': 'No customer has to wait.',
    'Toiminnalliset evästeet': 'Functional cookies',
    'Sähköpostijärjestelmät:': 'Email systems:',
    'Tarjouspyyntöjen vastaanotto ja luokittelu': 'Quote request intake and triage',
    'Käymme läpi yrityksesi nykyiset haasteet ja tavoitteet': 'We review your current challenges and goals',
  };

  // Reverse map for completeness when the page already happens to be in EN
  // (e.g. ported) — not used by default but kept for future tooling.

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  function norm(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  // Translate-or-passthrough.
  function translate(s, lang) {
    if (lang !== 'en') return s;
    const k = norm(s);
    if (DICT[k]) {
      // Preserve leading/trailing whitespace from the original.
      const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
      return m[1] + DICT[k] + m[3];
    }
    return s;
  }

  // Walk all text nodes & translatable attributes.
  function walk(root, lang) {
    if (!root) return;
    // Text nodes
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !norm(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        const p = n.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = (p.nodeName || '').toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'noscript') return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('[data-i18n-skip]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let cur;
    while ((cur = walker.nextNode())) nodes.push(cur);
    nodes.forEach(function (n) {
      // Stash original on first visit
      if (n.__seloraOrig == null) n.__seloraOrig = n.nodeValue;
      const original = n.__seloraOrig;
      n.nodeValue = translate(original, lang);
    });
    // Attributes
    const attrs = ['placeholder', 'title', 'alt', 'aria-label', 'value'];
    const sel = '[' + attrs.join('],[') + ']';
    const els = root.querySelectorAll ? root.querySelectorAll(sel) : [];
    els.forEach(function (el) {
      attrs.forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        // Skip <input type=submit|button> only if value is dynamic (we still translate).
        const orig = el.getAttribute('data-selora-orig-' + a);
        const cur = el.getAttribute(a);
        if (orig == null) {
          el.setAttribute('data-selora-orig-' + a, cur);
        }
        const baseline = el.getAttribute('data-selora-orig-' + a) || cur;
        el.setAttribute(a, translate(baseline, lang));
      });
    });
    // <title>
    const title = document.querySelector('title');
    if (title) {
      if (title.__seloraOrig == null) title.__seloraOrig = title.textContent;
      title.textContent = translate(title.__seloraOrig, lang);
    }
    // <meta name="description">
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      const o = desc.getAttribute('data-selora-orig-content');
      if (o == null) desc.setAttribute('data-selora-orig-content', desc.getAttribute('content') || '');
      const base = desc.getAttribute('data-selora-orig-content') || '';
      desc.setAttribute('content', translate(base, lang));
    }
  }

  // Public state
  const state = { lang: 'fi' };

  function setLang(lang) {
    if (lang !== 'fi' && lang !== 'en') lang = 'fi';
    state.lang = lang;
    try { localStorage.setItem('seloraLang', lang); } catch (_) {}
    document.documentElement.setAttribute('lang', lang);
    walk(document.body || document.documentElement, lang);
    // Update toggle UI
    document.querySelectorAll('.selora-lang-toggle [data-lang]').forEach(function (b) {
      const a = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-active', a);
      b.setAttribute('aria-pressed', a ? 'true' : 'false');
    });
    // Notify any custom listeners (e.g. dashboard's dynamic state strings)
    try { window.dispatchEvent(new CustomEvent('selora:langchange', { detail: { lang: lang } })); } catch (_) {}
  }

  // Helper exposed to JS-driven UI strings.
  function t(s) { return translate(s, state.lang); }

  // Build & inject toggle (idempotent). Also injects <style>.
  function injectToggle() {
    if (document.getElementById('selora-lang-toggle-style')) return;

    const style = document.createElement('style');
    style.id = 'selora-lang-toggle-style';
    style.textContent = [
      '.selora-lang-toggle{display:inline-flex;align-items:center;gap:0;border-radius:9999px;padding:2px;font-family:Inter,sans-serif;font-size:0.7rem;font-weight:500;letter-spacing:0.04em;line-height:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);}',
      '.selora-lang-toggle button{appearance:none;background:transparent;border:0;color:rgba(255,255,255,0.65);padding:0.32rem 0.6rem;border-radius:9999px;cursor:pointer;font:inherit;letter-spacing:inherit;transition:all 0.18s ease;}',
      '.selora-lang-toggle button:hover{color:#fff;}',
      '.selora-lang-toggle button.is-active{background:#fff;color:#0f172a;}',
      '.selora-lang-toggle.is-light{background:rgba(15,23,42,0.04);border-color:rgba(15,23,42,0.12);}',
      '.selora-lang-toggle.is-light button{color:#475569;}',
      '.selora-lang-toggle.is-light button:hover{color:#0f172a;}',
      '.selora-lang-toggle.is-light button.is-active{background:#0f172a;color:#fff;}',
      '@media (max-width:640px){.selora-lang-toggle{font-size:0.62rem;}.selora-lang-toggle button{padding:0.28rem 0.5rem;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function buildToggleEl() {
    const wrap = document.createElement('div');
    wrap.className = 'selora-lang-toggle';
    wrap.setAttribute('data-i18n-skip', '');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Language');
    ['fi', 'en'].forEach(function (l) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-lang', l);
      b.textContent = l.toUpperCase();
      b.addEventListener('click', function () { setLang(l); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function placeToggle() {
    if (document.querySelector('.selora-lang-toggle')) return;
    // Try common nav containers.
    const candidates = [
      '.nav-right', '.site-header .nav-bar > :last-child',
      'nav .nav-right', 'header .nav-right', 'header nav'
    ];
    let host = null;
    for (let i = 0; i < candidates.length; i++) {
      host = document.querySelector(candidates[i]);
      if (host) break;
    }
    const toggle = buildToggleEl();
    if (host) {
      // Insert before any CTA button if present, otherwise prepend.
      const cta = host.querySelector('a.btn, button.btn, .btn-light, .btn-blue, .btn-ghost');
      if (cta) host.insertBefore(toggle, cta);
      else host.appendChild(toggle);
    } else {
      // Fallback: float top-right.
      toggle.style.position = 'fixed';
      toggle.style.top = '12px';
      toggle.style.right = '12px';
      toggle.style.zIndex = '9999';
      document.body.appendChild(toggle);
    }
    // Light variant when on a light page (heuristic: body bg is light).
    try {
      const bg = getComputedStyle(document.body).backgroundColor;
      const m = bg.match(/rgba?\(([^)]+)\)/);
      if (m) {
        const parts = m[1].split(',').map(function (x) { return parseFloat(x); });
        const luma = 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
        if (luma > 200) toggle.classList.add('is-light');
      }
    } catch (_) {}
  }

  function init() {
    let saved = 'fi';
    try { saved = localStorage.getItem('seloraLang') || 'fi'; } catch (_) {}
    state.lang = saved === 'en' ? 'en' : 'fi';
    document.documentElement.setAttribute('lang', state.lang);
    injectToggle();
    placeToggle();
    setLang(state.lang);

    // Re-translate dynamic content
    const mo = new MutationObserver(function (muts) {
      if (state.lang === 'fi') return; // page already in FI
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType === 1) walk(n, state.lang);
          else if (n.nodeType === 3 && n.parentNode) {
            if (n.__seloraOrig == null) n.__seloraOrig = n.nodeValue;
            n.nodeValue = translate(n.__seloraOrig, state.lang);
          }
        });
        if (m.type === 'characterData' && m.target && m.target.nodeType === 3) {
          if (m.target.__seloraOrig == null) m.target.__seloraOrig = m.target.nodeValue;
          // Don't translate again immediately if we just set it ourselves
          if (m.target.nodeValue !== translate(m.target.__seloraOrig, state.lang)) {
            m.target.__seloraOrig = m.target.nodeValue;
            m.target.nodeValue = translate(m.target.__seloraOrig, state.lang);
          }
        }
      });
    });
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }

  // Expose API.
  window.selora_i18n = {
    setLang: setLang,
    getLang: function () { return state.lang; },
    t: t,
    dict: DICT
  };
  window.t = t;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
