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

    // ============================================================
    // Exhaustive sweep — additions covering remaining FI strings
    // across every public + app page (index, palvelut, hinnoittelu,
    // tekoaly, verkkosivu, agency, prosessi, yhteystiedot, blogi,
    // tietosuoja, 404, unsubscribe, kirjaudu, rekisteroidy, reset,
    // dashboard, onboarding, admin, checkout)
    // ============================================================

    // ---------- index.html / hero / sections ----------
    'Älä enää missaa': 'Never miss',
    'Seloran tekoälyvastaanottaja vastaa kaikkiin puheluihisi 24/7, varaa tapaamisia ja tunnistaa potentiaaliset asiakkaat. Täysin automaattisesti, ilman lisähenkilöstöä.':
      'Selora\'s AI receptionist answers every one of your calls 24/7, books meetings and qualifies leads. Fully automatic, with no extra staff.',
    'Seloran tekoälyvastaanottaja vastaa puheluihisi 24/7, varaa ajat kalenteriisi ja tunnistaa potentiaaliset asiakkaat, täysin automaattisesti. Ilmainen demo, käyttöönotto 48 tunnissa.':
      'Selora\'s AI receptionist answers your calls 24/7, books appointments straight into your calendar and qualifies leads — fully automatically. Free demo, live in 48 hours.',
    'Katso miten toimii': 'See how it works',
    'Testaa ennen kuin sitoudut': 'Try before you commit',
    'Kaksi palvelua.': 'Two services.',
    'Yksi toimisto.': 'One team.',
    'Vastaa puheluihin, varaa tapaamisia ja tunnistaa potentiaaliset asiakkaat. Toimii 24/7 ilman jonotusta.':
      'Answers calls, books meetings and qualifies leads. Works 24/7 with no queues.',
    'Napauta orbia tai paina nappia aloittaaksesi': 'Tap the orb or hit the button to start',
    'Napauta orbia tai paina nappia': 'Tap the orb or hit the button',
    'Samanaikaiset puhelut': 'Concurrent calls',
    'Miten se toimii': 'How it works',
    'Kartoitamme nykyisen toimintamallisi, löydämme kohdat joissa liidejä menetetään ja määrittelemme mitä kannattaa automatisoida ensin parhaan ROI:n saavuttamiseksi. Puhelun jälkeen sinulla on selkeä kuva siitä, mitä rakennetaan ja milloin.':
      'We map your current operations, identify where leads slip through and decide what to automate first for the strongest ROI. After the call you\'ll have a clear picture of what gets built and when.',
    'Rakennus ja konfigurointi': 'Build and configuration',
    'Optimointi ja kasvu': 'Optimisation and growth',
    'Varaa, muuta ja peruuta aikoja suoraan Google Calendariin tai Outlookiin reaaliajassa.':
      'Book, change and cancel appointments directly in Google Calendar or Outlook in real time.',
    'Analytiikka ja raportit': 'Analytics and reports',
    'Miksi Selora': 'Why Selora',
    'Luonnollinen ja ammattimainen': 'Natural and professional',
    '€ / asiakas': '€ / customer',
    '1 puhelu': '1 call',
    'Voisit kaapata takaisin arviolta': 'You could recover an estimated',
    'seuraavat 12 kuukautta': 'next 12 months',
    'Kumulatiivinen lisätulo Seloran kanssa': 'Cumulative additional revenue with Selora',
    'Ilman Seloraa': 'Without Selora',
    'Tallenna valinnat': 'Save preferences',
    'Evästeilmoitus': 'Cookie notice',
    'kanssa seuraavat 12 kuukautta': 'with Selora over the next 12 months',

    // ---------- palvelut.html ----------
    'Seloran palvelut suomalaisille yrityksille: tekoälyvastaanottaja hoitaa puhelut 24/7 ja verkkosivusuunnittelu muuttaa vierailijat asiakkaiksi. Selkeä hinnoittelu, nopea käyttöönotto.':
      'Selora\'s services for Finnish businesses: an AI receptionist that handles calls 24/7 and web design that turns visitors into customers. Clear pricing, fast onboarding.',
    '24/7 puhelut': '24/7 calls',
    'Jokainen sivusto on räätälöity toimialallesi ja kohderyhmällesi. Emme käytä valmiita malleja. Kaikki rakennetaan alusta asti sinulle.':
      'Every site is tailored to your industry and audience. We don\'t use templates — everything is built from scratch for you.',
    'Jokaiselle toimialalle oma visuaalinen identiteetti. Valmiit mallit, jotka on suunniteltu muuttamaan vierailijat asiakkaiksi.':
      'A visual identity built for each industry. Ready-made designs engineered to turn visitors into customers.',
    'Palvelut, hinnat ja nettivaraus, kalenteri täyttyy automaattisesti.':
      'Services, prices and online booking — your calendar fills itself.',
    'Puhelunkäsittely': 'Call handling',
    'Saumaton siirto ilman katkoja tai toistoa': 'Seamless transfer with no breaks or repeats',
    'Natiivi integraatio Google Calendariin ja Outlookiin': 'Native integration with Google Calendar and Outlook',
    'Automaattiset vahvistus- ja muistutusviestit': 'Automatic confirmation and reminder messages',
    'Peruutukset ja uudelleenvaraukset hoidetaan itse': 'Cancellations and rebookings handled on their own',
    'Toimii kaikkien operaattorien kanssa': 'Works with every carrier',
    'Toimialakohtainen sanasto ja fraseologia': 'Industry-specific vocabulary and phrasing',
    'Automaattinen kielen tunnistus ja vaihto': 'Automatic language detection and switching',
    'GDPR-yhteensopiva tietojen käsittely EU-palvelimilla': 'GDPR-compliant data processing on EU servers',
    'Sopii juuri sinun': 'Built for your',
    'Verkkoajanvaraus ja peruutusten hallinta': 'Online booking and cancellation management',
    'Jälkimarkkinointi ja asiakastyytyväisyyskyselyt': 'Follow-up marketing and customer satisfaction surveys',
    'Kiirepalvelupyynnöt ohjataan oikealle tekijälle': 'Urgent service requests routed to the right person',
    'Projektikyselyjen luokittelu ja priorisointi': 'Project enquiries classified and prioritised',
    'Erikoistoiveiden ja allergeenien kirjaaminen': 'Special requests and allergens recorded',
    'Vastaukset aukioloaika- ja menukyselyihin': 'Answers to opening hours and menu questions',
    'Huoltovaraukset ja muistutukset automaattisesti': 'Service bookings and reminders, automated',
    'Uusien asiakkaiden kvalifiointi, konsultaatioajat ja alustava asian arviointi, noudattaen ja GDPR-yhteensopivasti.':
      'New-customer qualification, consultation booking and initial case assessment — compliant and GDPR-friendly.',
    'Kiireellisten tapausten tunnistaminen ja ohjaus': 'Urgent cases identified and routed',
    'Dokumenttipyyntöjen vastaanotto ja kirjaaminen': 'Document requests received and logged',
    'Liidien automaattinen pisteytys ja kvalifiointi': 'Automatic lead scoring and qualification',
    'Toimialasi ei listalla?': 'Industry not listed?',
    ', räätälöimme ratkaisun juuri teille.': ' — we\'ll tailor a solution just for you.',
    'kanssa.': 'with us.',
    'Mekaanikko töissä': 'Mechanic at work',

    // ---------- hinnoittelu.html ----------
    'Tekoälyvastaanottaja 249 €/kk tai 499 €/kk. Verkkosivusto 790–1 390 € kertamaksuna. Kiinteä hinta, ei piilomaksuja. Irtisano milloin tahansa 30 päivän varoitusajalla.':
      'AI receptionist €249/mo or €499/mo. Website €790–€1,390 one-off. Flat price, no hidden fees. Cancel anytime with 30 days\' notice.',
    'Valitse omasi.': 'Pick yours.',
    ' ·  0,25 € sen jälkeen': ' ·  €0.25 thereafter',
    'Varaa ajat ja palvelut suoraan kalenteriisi puhelun aikana': 'Books appointments and services straight into your calendar during the call',
    'Monikielinen vastaanotto: suomi, ruotsi ja englanti': 'Multilingual reception: Finnish, Swedish and English',
    'Oma yhteyshenkilö ja prioriteettituki': 'Dedicated contact and priority support',
    'Uusi verkkosivusto toteutetaan käyttöönoton yhteydessä': 'A new website is delivered as part of onboarding',
    'ja sivusto pysyy sinulla': 'and the site stays yours',
    'Yhteydenottolomake ja Google Maps': 'Contact form and Google Maps',
    'SEO-perusteet ja nopea latausaika': 'SEO basics and fast load times',
    'Sosiaalisen median linkit ja pikselit': 'Social media links and pixels',
    'Lomakkeet, automaatiot ja CRM-integraatio': 'Forms, automations and CRM integration',
    'Sosiaalisen median integraatiot ja seuranta': 'Social media integrations and tracking',
    'Analytiikkakojelauta: kävijät, liidit ja konversiot': 'Analytics dashboard: visitors, leads and conversions',
    'Tekninen tuki ja ongelmanratkaisu': 'Technical support and troubleshooting',
    '+ alv. 25,5%  ·  Irtisanottavissa milloin tahansa 30 päivän varoitusajalla':
      '+ VAT 25.5%  ·  Cancel anytime with 30 days\' notice',
    'SMS- ja sähköpostivahvistus asiakkaalle': 'SMS and email confirmation for the customer',
    'Puheluyhteenveto ja asiakastiedot kirjataan': 'Call summary and customer details recorded',
    'Liidien tunnistaminen ja kirjaus': 'Lead identification and logging',
    'Tuki ja raportointi': 'Support and reporting',
    'Oma yhteyshenkilö': 'Dedicated contact',
    'Sinun': 'Your',
    'Emme usko pitkiin sopimuksiin tai epäselviin ehtoihin. Tässä mitä voit odottaa.':
      'We don\'t believe in long contracts or fuzzy terms. Here\'s what to expect.',
    'Kuukausittaiset sopimukset. Voit irtisanoa milloin tahansa 30 päivän varoitusajalla, ilman sakkoja.':
      'Month-to-month contracts. Cancel anytime with 30 days\' notice and no penalties.',
    'Nopea käynnistys': 'Fast launch',
    'Epävarma mikä paketti': 'Not sure which plan',
    'Varaa maksuton strategiapuhelu. Kerromme rehellisesti kumpi paketti sopii yrityksesi tilanteeseen. Jos aika ei ole oikea, sanomme sen suoraan.':
      'Book a free strategy call. We\'ll tell you honestly which plan fits your situation. If now isn\'t the right time, we\'ll say so directly.',

    // ---------- tekoalyvastaanottajat.html ----------
    'Seloran tekoälyvastaanottaja vastaa puheluihin 24/7, varaa ajat kalenteriisi ja lähettää SMS-vahvistuksen automaattisesti. Ei henkilöstöä, ei jonotusaikaa. Kokeile ilmaiseksi.':
      'Selora\'s AI receptionist answers calls 24/7, books appointments and sends SMS confirmations automatically. No staff, no queues. Try it free.',
    'Takaisin palveluihin': 'Back to services',
    'Seloran tekoälyvastaanottaja vastaa jokaiseen puheluun, kvalifioi liidit, varaa tapaamisia suoraan kalenteriisi ja lähettää automaattiset seurantaviestit. Toimii suomeksi, ruotsiksi ja englanniksi, täysin sinun brändisi äänensävyllä.':
      'Selora\'s AI receptionist answers every call, qualifies leads, books meetings straight into your calendar and sends automatic follow-ups. Works in Finnish, Swedish and English — entirely in your brand voice.',
    'Peruutukset ja uudelleenvaraukset hoidettu': 'Cancellations and rebookings handled',
    'Pisteytys ja priorisointi automaattisesti': 'Scoring and prioritisation, automated',
    'Vastaanottaja tunnistaa automaattisesti soittajan kielen ja vaihtaa suomeen, ruotsiin tai englantiin.':
      'The receptionist detects the caller\'s language automatically and switches to Finnish, Swedish or English.',
    'Täysi tuki kolmelle kielelle': 'Full support for three languages',
    'Reaaliaikainen tietojen synkronointi': 'Real-time data sync',
    'GDPR-yhteensopiva tietojen käsittely': 'GDPR-compliant data processing',
    'Toimii juuri sinun toimialallasi.': 'Built for exactly your industry.',
    'Ajanvaraukset, muistutukset ja kiireellisten tapausten ohjaus automaattisesti, GDPR-yhteensopivasti.':
      'Bookings, reminders and urgent-case routing, fully automated and GDPR-compliant.',
    'Uusien asiakkaiden esikvalifiointi ja konsultaatioajat sovittua prosessia noudattaen.':
      'New-customer pre-qualification and consultation booking that follows your defined process.',

    // ---------- verkkosivusuunnittelu.html ----------
    'Selora suunnittelee selkeät, nopeat verkkosivustot suomalaisille yrityksille. Tekoälychatbot sisältyy molempiin paketteihin. Kertamaksu 790–1 390 €, ei kuukausimaksuja.':
      'Selora designs clean, fast websites for Finnish businesses. AI chatbot included in both packages. One-off €790–€1,390 — no monthly fees.',
    'Verkkosivusuunnittelu — Selora': 'Web design — Selora',
    'Sivusto joka': 'A site that',
    'Mobiilioptimoitu joka laitteella': 'Mobile-optimised on every device',
    'Yhteydenottolomakkeet ja CTA:t': 'Contact forms and CTAs',
    'GDPR-yhteensopiva evästehallinta': 'GDPR-compliant cookie management',
    'Monisivuinen sivusto, joka kertoo yrityksesi tarinan, esittelee palvelut ja rakentaa luottamusta. Etusivu, palvelut, tietoa, yhteystiedot ja blogi.':
      'A multi-page site that tells your story, presents your services and builds trust. Home, services, about, contact and blog.',
    'Typografia ja ikonisto': 'Typography and icon set',
    'Otsikot ja CTA-tekstit': 'Headlines and CTA copy',
    'Palvelukuvaukset ja hyödyt': 'Service descriptions and benefits',
    'Testattu yleisimmillä selaimilla': 'Tested across major browsers',
    'Nopea lataus myös mobiiliverkossa': 'Fast loading even on mobile networks',
    'Meta-otsikot ja kuvaukset': 'Meta titles and descriptions',
    'Sivukartta ja robots.txt': 'Sitemap and robots.txt',

    // ---------- agency-website.html ----------
    'Apex AI — Intelligent Growth for Modern Businesses': 'Apex AI — Intelligent Growth for Modern Businesses',

    // ---------- prosessi.html ----------
    'ei kuukausissa.': 'not months.',
    'Kesto: 3–7 arkipäivää': 'Duration: 3–7 working days',
    'Julkaisu ja luovutus': 'Launch and handover',
    'Kesto: 1 arkipäivä': 'Duration: 1 working day',
    '"Tekoälyvastaanottajamme varasi 14 uutta tapaamista jo ensimmäisellä viikolla. Se maksoi itsensä takaisin ennen kuun loppua. En oikeasti tiedä, miten pärjäsin ilman sitä."':
      '"Our AI receptionist booked 14 new meetings in the first week alone. It paid for itself before the end of the month. I honestly don\'t know how I managed without it."',
    '"Uusi verkkosivusto ja sähköpostisekvenssit muuttivat asiakkaidemme onboarding-prosessin täysin. Konversioasteemme kaksinkertaistui kahdessa kuukaudessa."':
      '"The new website and email sequences completely changed our customer onboarding. Our conversion rate doubled in two months."',
    '"Olin skeptinen tekoälyn suhteen, mutta he tekivät siitä yksinkertaista. Nyt en koskaan menetä liidiä, vaikka olisin työmaalla. Ehdottomasti paras investointi tänä vuonna."':
      '"I was sceptical about AI, but they made it simple. Now I never lose a lead, even when I\'m on a job site. Hands down the best investment this year."',

    // ---------- yhteystiedot.html ----------
    'Uusi yhteydenotto — Selora': 'New enquiry — Selora',
    'Ota yhteyttä Seloraan. Varaa maksuton 30 minuutin demo tai lähetä viesti. Vastaamme 4 tunnin sisällä arkipäivisin.':
      'Get in touch with Selora. Book a free 30-minute demo or send a message. We reply within 4 working hours.',
    'Varaa aika': 'Book a time',
    'Täysi tekninen tuki koko matkan ajan': 'Full technical support along the way',
    'Pidätkö enemmän soittamisesta? ': 'Prefer to call? ',
    'Valitse…': 'Choose…',
    'Yritys Oy': 'Acme Ltd',
    'Kerro yrityksestäsi ja suurimmasta kasvuhaasteestasi…': 'Tell us about your business and your biggest growth challenge…',

    // ---------- blogi.html ----------
    'Seloran blogi: käytännön oppaat tekoälyvastaanottajista, automaatiosta ja siitä, miten suomalaiset pienyritykset kasvattavat myyntiään älykkäillä ratkaisuilla.':
      'The Selora blog: practical guides on AI receptionists, automation and how Finnish small businesses grow sales with smart solutions.',
    'Käytännönläheiset artikkelit tekoälyvastaanottajista, automaatiosta ja siitä, miten suomalaiset pienyritykset kasvattavat myyntiä älykkäillä ratkaisuilla.':
      'Practical articles on AI receptionists, automation and how Finnish small businesses grow sales with smart solutions.',
    'Tunnista ongelma ja korjaa se nopeasti': 'Spot the problem and fix it fast',
    'Saa uudet artikkelit': 'Get new articles',
    'Tilaa ilmaiseksi →': 'Subscribe free →',
    'Näe käytännössä, miten tekoälyvastaanottaja toimisi juuri sinun yrityksessäsi. 30 minuuttia, ilman sitoumuksia.':
      'See exactly how the AI receptionist would work for your business. 30 minutes, no commitments.',
    'Menetettyjen puhelujen hinta': 'The cost of missed calls',
    'LVI-yritys ja hätäpuhelut': 'HVAC and emergency calls',
    'Tekoäly vs ihmisvastaanottaja': 'AI vs human receptionist',

    // ---------- tietosuojaseloste.html ----------
    'Selora Oy:n tietosuojaseloste. Tietoa henkilötietojen käsittelystä tekoälyvastaanottajapalvelussa ja yhteydenottolomakkeessa.':
      'Selora Oy privacy policy. Information about how personal data is processed in our AI receptionist service and contact form.',
    'Oikeudelliset tiedot': 'Legal information',
    '01. Rekisterinpitäjä': '01. Controller',
    'Sähköposti:': 'Email:',
    '02. Rekisterin nimi ja tarkoitus': '02. Register name and purpose',
    'Asiakkaidemme puheluiden vastaanottaminen, ajanvaraukset, liidien kvalifiointi':
      'Receiving our customers\' calls, appointment booking and lead qualification',
    '03. Tekoälykäsittely ja puhelutallenteet': '03. AI processing and call recordings',
    'Puhelu voidaan tallentaa laadunvarmistusta ja asiakassuhteen hoitamista varten':
      'Calls may be recorded for quality assurance and customer relationship management',
    'Puhelusta luodaan yhteenveto, joka toimitetaan yrityksen edustajalle':
      'A summary of the call is created and sent to the business contact',
    'Huomio puheluiden tallentamisesta:': 'Note on call recording:',
    '04. Tietojen säilytysajat': '04. Data retention periods',
    '90 päivää': '90 days',
    'Laadunvarmistus ja reklamaatioiden käsittely': 'Quality assurance and complaint handling',
    'Yhteydenottolomakkeen tiedot': 'Contact form data',
    'Sopimussuhteen ajan + 5 vuotta': 'Duration of contract + 5 years',
    'Kirjanpito- ja sopimusoikeudelliset velvoitteet': 'Accounting and contract law obligations',
    'Tilauksen ajan + 6 kuukautta': 'Duration of subscription + 6 months',
    '05. Tietojen luovutukset ja alihankkijat': '05. Data disclosures and subcontractors',
    'Kenelle tietoja luovutetaan': 'Who we share data with',
    'Palvelimien ja tallennuksen tarjoajat EU-alueella': 'Server and storage providers in the EU',
    '06. Tietojen siirrot EU/ETA-alueen ulkopuolelle': '06. Data transfers outside the EU/EEA',
    'Miten suojaamme tietosi': 'How we protect your data',
    '08. Rekisteröidyn oikeudet': '08. Data subject rights',
    'Sinulla on seuraavat oikeudet': 'You have the following rights',
    'Oikeus tietojen oikaisemiseen': 'Right to rectification',
    'Oikeus tietojen poistamiseen': 'Right to erasure',
    'Tietojen siirto-oikeus': 'Right to data portability',
    'Käyntiosoite: Lintulahdenkuja 4, 00530 Helsinki': 'Visiting address: Lintulahdenkuja 4, 00530 Helsinki, Finland',
    '10. Evästeet': '10. Cookies',
    'Ota yhteyttä tietosuoja-asioissa': 'Contact us about privacy',
    'Vastausaika: enintään 30 päivää': 'Response time: up to 30 days',
    'Oikeus peruuttaa suostumus': 'Right to withdraw consent',
    'Tarkastusoikeus': 'Right of access',
    'Vastustamisoikeus': 'Right to object',
    'Valitusoikeus': 'Right to lodge a complaint',
    'Tietotyypit': 'Data types',
    'Tietotyyppi': 'Data type',
    'Tarkoitus': 'Purpose',
    'Perustelu': 'Rationale',
    'Oikeusperuste': 'Legal basis',
    'Voimassaoloaika': 'Validity',
    'Istunto': 'Session',
    'Sivuston perustoiminnot, lomakkeiden toiminta': 'Core site functions, form behaviour',
    'Sopimus (GDPR 6 art. 1 b-kohta)': 'Contract (GDPR Article 6(1)(b))',
    'Suostumus (GDPR 6 art. 1 a-kohta)': 'Consent (GDPR Article 6(1)(a))',
    'Oikeutettu etu (GDPR 6 art. 1 f-kohta)': 'Legitimate interest (GDPR Article 6(1)(f))',
    'Oikeutettu etu / suostumus': 'Legitimate interest / consent',
    'Suostumukseen perustuva markkinointi': 'Consent-based marketing',
    'Myyntiprosessin dokumentointi': 'Sales process documentation',
    'Uutiskirjetilaajat': 'Newsletter subscribers',
    'Verkkosivuanalytiikka': 'Website analytics',
    '12 kuukautta': '12 months',
    '24 kuukautta': '24 months',
    '26 kuukautta': '26 months',

    // ---------- 404.html ----------
    'Sivua ei': 'Page not',
    'Takaisin etusivulle →': 'Back to home →',

    // ---------- unsubscribe.html ----------
    'Peruuta tilaus — Selora': 'Unsubscribe — Selora',
    'Takaisin blogiin': 'Back to blog',
    'Peruutetaan tilausta...': 'Unsubscribing…',
    'peruttu': 'cancelled',
    'Tilaus': 'Subscription',
    'Tilauksen peruutus epäonnistui. Kokeile uudelleen.': 'Unsubscribe failed. Please try again.',
    'Peruutuslinkki puuttuu.': 'Unsubscribe link is missing.',

    // ---------- kirjaudu.html ----------
    'Kirjaudu Selora-asiakastilillesi.': 'Sign in to your Selora customer account.',
    'tai': 'or',
    'Ei vielä tiliä?': 'No account yet?',
    'Näytä salasana': 'Show password',
    'Kirjaudutaan...': 'Signing in…',
    'Kirjautuminen epäonnistui. Yritä uudelleen.': 'Sign-in failed. Please try again.',
    'Vahvista sähköpostisi ennen kirjautumista.': 'Confirm your email before signing in.',
    'Virheellinen sähköposti tai salasana.': 'Invalid email or password.',
    'Väärä sähköposti tai salasana.': 'Wrong email or password.',
    'Täytä sähköposti ja salasana.': 'Enter your email and password.',
    'Syötä sähköpostiosoitteesi ensin.': 'Enter your email address first.',
    'Tarkista sähköpostiosoitteen muoto.': 'Check the email format.',
    'Ei löydy käyttäjää tällä sähköpostilla.': 'No user found with this email.',
    'Liian monta yritystä. Odota hetki ja yritä uudelleen.': 'Too many attempts. Please wait and try again.',
    'Liian monta yritystä. Odota hetki.': 'Too many attempts. Please wait.',
    'Salasanan palautuslinkki lähetetty sähköpostiisi.': 'A password reset link was sent to your email.',
    'Palautuslinkki lähetetty! Tarkista sähköpostisi.': 'Reset link sent. Check your email.',

    // ---------- rekisteroidy.html ----------
    'Luo tili — Selora': 'Create account — Selora',
    'Luo ilmainen Selora-asiakastili ja kokeile tekoälyvastaanottajaa.': 'Create a free Selora account and try the AI receptionist.',
    'Luo tili ja aloita →': 'Create account and start →',
    'Matti Meikäläinen': 'John Smith',
    'Parturi Meikäläinen Oy': 'Smith Salon Ltd',
    'Vähintään 8 merkkiä': 'At least 8 characters',
    'Luodaan tiliä...': 'Creating account…',
    'Tilin luominen epäonnistui. Yritä uudelleen.': 'Account creation failed. Please try again.',
    'Tällä sähköpostilla on jo tili. Kirjaudu sisään.': 'An account with this email already exists. Sign in.',
    'Salasanan tulee olla vähintään 8 merkkiä.': 'Password must be at least 8 characters.',
    'Salasanat eivät täsmää.': 'Passwords do not match.',
    'Hyväksy tietosuojaseloste jatkaaksesi.': 'Accept the privacy policy to continue.',
    'Täytä vähintään nimi, yritys ja sähköposti': 'Please fill in at least name, company and email',

    // ---------- reset-salasana.html ----------
    'Palauta salasana — Selora': 'Reset password — Selora',
    'Palauta Selora-tilisi salasana.': 'Reset your Selora account password.',
    '← Takaisin kirjautumiseen': '← Back to sign in',
    'Aseta uusi salasana': 'Set a new password',
    'Valitse uusi salasana tilillesi.': 'Choose a new password for your account.',
    'Uusi salasana': 'New password',
    'Tallenna uusi salasana →': 'Save new password →',

    // ---------- dashboard.html ----------
    'Dashboard — Selora': 'Dashboard — Selora',
    'Päivitä tilaus': 'Upgrade subscription',
    'Ei agenttia': 'No agent',
    'Ota vastaan oikeat puhelut, saa yhteenvedot sähköpostiin ja paljon muuta':
      'Take real calls, get summaries by email and much more',
    'Kokeile agenttiasi nyt': 'Try your agent now',
    '+ Uusi varaus': '+ New booking',
    'Uusi varaus': 'New booking',
    '🚫 Ei saatavilla': '🚫 Not available',
    'Uudet': 'New',
    '+ Uusi asiakas': '+ New customer',
    'Puhelut luovat asiakaskortit automaattisesti.': 'Calls create customer cards automatically.',
    'Ei asiakkaita vielä.<br>Puhelut luovat asiakaskortit automaattisesti.':
      'No customers yet.<br>Calls create customer cards automatically.',
    'Valitse asiakas vasemmalta': 'Select a customer on the left',
    'Uusi asiakas': 'New customer',
    'Pvm & aika': 'Date & time',
    'Pvm &amp; aika': 'Date &amp; time',
    'Valitse...': 'Select…',
    'Yrityksen puhelin': 'Business phone',
    'Päivitä agentti': 'Update agent',
    'Luo uuden promptin agentille palveluiden ja aukioloaikojen perusteella':
      'Create a new prompt for the agent based on your services and opening hours',
    'Tallenna muutokset': 'Save changes',
    'Puhelut': 'Calls',
    'Lisätiedot…': 'More info…',
    'Lisätieto asiakkaasta…': 'Notes about the customer…',
    'Hae nimellä tai numerolla…': 'Search by name or number…',
    'Hei, olet soittanut...': 'Hello, you\'ve reached…',
    'Aloita uusi puhelu': 'Start a new call',
    'Aloita testipuhelu': 'Start a test call',
    'Lopeta puhelu': 'End call',
    'Yhdistetään...': 'Connecting…',
    'Luodaan yhteyttä...': 'Connecting…',
    'Tekoäly puhuu...': 'AI is speaking…',
    'Puhelu päättyi — kiitos!': 'Call ended — thank you!',
    'Puheluloki': 'Call log',
    'Demo-puhelut käytetty': 'Demo calls used',
    'Demo-puhelut käytetty!': 'Demo calls used up!',
    'Päivitetään...': 'Updating…',
    'Päivitys epäonnistui': 'Update failed',
    'Päivitä täysversioon jatkaaksesi.': 'Upgrade to the full version to continue.',
    'Salli mikrofonin käyttö selaimessa ja yritä uudelleen.': 'Allow microphone access in your browser and try again.',
    'Yhteys epäonnistui — yritä uudelleen.': 'Connection failed — please try again.',
    'Ei istuntoa — kirjaudu uudelleen.': 'No session — please sign in again.',
    'Agentti ei vielä luotu': 'Agent not yet created',
    'Agenttia ei löydy. Suorita onboarding ensin.': 'Agent not found. Please complete onboarding first.',
    'LLM-id puuttuu — ota yhteyttä tukeen.': 'LLM ID is missing — please contact support.',
    'Asiakas poistettu': 'Customer deleted',
    'Asiakasta ei löydy': 'Customer not found',
    'Poistetaanko asiakas? Tätä ei voi peruuttaa.': 'Delete this customer? This can\'t be undone.',
    'Poisto epäonnistui': 'Delete failed',
    'Tallennus epäonnistui': 'Save failed',
    'Muokkaa varausta': 'Edit booking',
    'Ei varauksia vietäväksi': 'No bookings to export',
    'Peruutettu': 'Cancelled',
    'Vahvistettu': 'Confirmed',
    'Muuta tilaa': 'Change status',
    'Näytä asiakas': 'View customer',
    'Avaa valikko': 'Open menu',
    'Sulje valikko': 'Close menu',
    'Heinäkuu': 'July',
    'Kesäkuu': 'June',
    'heinäkuuta': 'July',
    'kesäkuuta': 'June',
    'suljettu': 'closed',

    // ---------- onboarding.html ----------
    'Personoi agenttisi — Selora': 'Personalise your agent — Selora',
    'Yrityksen nimi *': 'Business name *',
    'Yrityksen puh. (valinnainen)': 'Business phone (optional)',
    'Valitse toimiala...': 'Select industry…',
    'Milloin asiakkaat voivat tavoittaa sinut? Agentti kertoo aukioloajat automaattisesti.':
      'When can customers reach you? The agent will share your hours automatically.',
    'Kieli ja': 'Language and',
    'Tarkista tiedot ja luo personoitu agenttisi.': 'Review the details and create your personalised agent.',
    'Tarkista tiedot ja luo täysin personoitu tuotantoagenttisi.': 'Review the details and create your fully personalised production agent.',
    '← Edellinen': '← Previous',
    'Seuraava →': 'Next →',
    'Esim. Hinnat sisältävät ALV 24%. Raidoitusajat voivat vaihdella hiusten pituuden mukaan. Lahjakortit saatavilla.':
      'E.g. Prices include VAT 24%. Bleach times may vary by hair length. Gift cards available.',
    'esim. Peruutus viimeistään 24h ennen, muuten 50% hinta':
      'e.g. Cancel at least 24h in advance, otherwise 50% fee',
    'Esim. Meillä on kampaus, joka ei vaadi ajanvarausta ma–ke klo 9–11. Lemmikkystävällinen liike. Ilmainen pysäköinti talon takana...':
      'E.g. We do walk-in styling Mon–Wed 9–11. Pet-friendly. Free parking behind the building…',
    'Erikoisosaaminen (esim. Värikäsittelyt)': 'Speciality (e.g. colour treatments)',
    'Vaihe 1 / 9': 'Step 1 / 9',
    'Vaihe 2 / 9': 'Step 2 / 9',
    'Vaihe 3 / 9': 'Step 3 / 9',
    'Vaihe 4 / 9': 'Step 4 / 9',
    'Vaihe 5 / 9': 'Step 5 / 9',
    'Vaihe 6 / 9': 'Step 6 / 9',
    'Vaihe 7 / 9': 'Step 7 / 9',
    'Vaihe 8 / 9': 'Step 8 / 9',
    'Vaihe 9 / 9': 'Step 9 / 9',
    'toimialasi': 'your industry',
    'hinnat': 'prices',
    'kysymykset': 'questions',
    'tehtävät': 'tasks',
    'lisätiedot': 'extras',
    'valmista': 'done',
    'Kaikki': 'All',
    'Mikä on': 'What is',
    'Kaupunki *': 'City *',
    'Toimiala *': 'Industry *',
    'Palvelukielet': 'Languages spoken',
    'Tehtävät': 'Tasks',
    'Poista henkilö': 'Remove person',
    'Poista kysymys': 'Remove question',
    'Poista rivi': 'Remove row',
    'Lisää vähintään yksi palvelu.': 'Add at least one service.',
    'Valitse toimiala.': 'Pick an industry.',
    'Valitse vähintään yksi tehtävä.': 'Pick at least one task.',
    'Täytä kaikki pakolliset kentät (*).': 'Please fill in every required field (*).',
    'Täytä kaikki kentät.': 'Please fill in every field.',
    'Kyllä, ilmainen pysäköinti rakennuksen takana.': 'Yes — free parking behind the building.',
    'Mikä on peruutuskäytäntönne?': 'What\'s your cancellation policy?',
    'Onko teillä parkkipaikkoja?': 'Do you have parking?',
    'Hyväksyttekö käteistä / korttia / MobilePay:ta?': 'Do you accept cash / card / MobilePay?',
    'Puhuuko henkilökuntanne englantia / ruotsia?': 'Does your staff speak English / Swedish?',
    'Ma-Pe: 09:00-18:00, La: 10:00-15:00, Su: suljettu': 'Mon–Fri: 09:00–18:00, Sat: 10:00–15:00, Sun: closed',
    'PERUUTUSKÄYTÄNTÖ:\n': 'CANCELLATION POLICY:\n',
    'HENKILÖKUNTA:\n': 'STAFF:\n',

    // ---------- admin.html ----------
    'Admin — Selora': 'Admin — Selora',
    'maksava asiakas': 'paying customer',
    'Rekisteröity': 'Registered',
    '+ Luo uusi asiakas': '+ Create new customer',
    'Olemassa oleva Retell Agent ID': 'Existing Retell Agent ID',
    '(valinnainen — jätä tyhjäksi luodaksesi uuden)': '(optional — leave blank to create a new one)',
    'Rekisteröintiloki': 'Signup log',
    'Uutiskirje — Uusi artikkeli': 'Newsletter — New article',
    'Lähetä kaikille tilaajille →': 'Send to all subscribers →',
    'Esim. Näin tekoäly muuttaa pienyritysten asiakaspalvelua': 'E.g. How AI is changing small-business customer service',
    'esim. hiustenleikkaus, värjäys, kampaus': 'e.g. haircuts, colour, styling',
    'ystävällinen': 'friendly',
    'yritys': 'business',
    'Ystävällinen': 'Friendly',
    'Yritys': 'Company',
    'Syötä API-avain': 'Enter API key',
    'Syötä Agent ID': 'Enter Agent ID',
    'Tämä tili ei ole admin-tili.': 'This account is not an admin account.',
    'Lähetetään...': 'Sending…',
    'Lähetys epäonnistui': 'Send failed',
    'Valmiina lähettämään kaikille tilaajille': 'Ready to send to all subscribers',
    'Täytä kaikki pakolliset kentät (otsikko, kuvaus, URL).': 'Please fill in every required field (title, description, URL).',

    // ---------- checkout.html ----------
    'Valitse paketti — Selora': 'Choose plan — Selora',
    'Valitse Seloran tekoälyvastaanottajapalvelu yrityksellesi.': 'Choose the Selora AI receptionist plan for your business.',
    'Takaisin dashboardiin': 'Back to dashboard',
    'Valitse paketti. Saat': 'Choose a plan. You get',
    'Miten puhelinnumero toimii?': 'How does the phone number work?',
    'Hinnat ei ole vielä konfiguoitu. Ota yhteyttä: noah@selora.fi':
      'Pricing not yet configured. Please contact: noah@selora.fi',
    'Siirrytään maksusivulle...': 'Redirecting to checkout…',
    '© 2025 Selora. Kaikki oikeudet pidätetään.  · ': '© 2025 Selora. All rights reserved.  · ',

    // ---------- Final mop-up: remaining visible strings ----------
    'Varaa ilmainen demo →': 'Book a free demo →',
    'Varaa ilmainen': 'Book a free',
    'Varaa 30 min demo': 'Book a 30-min demo',
    'Varaa kampaamoaikoja': 'Books salon appointments',
    'Kartoituspuhelu': 'Discovery call',
    '24/7 puheluihin vastaaminen': '24/7 call answering',
    '50 puhelua': '50 calls',
    'SMS-viestit puhelun aikana': 'SMS messages during the call',
    'SMS-viestit': 'SMS messages',
    'Testaa heti. 5 puhelua.': 'Try it now. 5 calls.',
    '78% puheluista hoidettu automaattisesti': '78% of calls handled automatically',
    '87 % puheluista hoidettu automaattisesti': '87% of calls handled automatically',
    'puhelua / pv': 'calls / day',
    'puhelua': 'calls',
    'Toimitusjohtaja, Keller Kattopalvelut': 'CEO, Keller Roofing',
    'Omistaja, Elite LVI-Palvelut': 'Owner, Elite HVAC Services',

    // palvelut + service related
    'Palvelumme': 'Our services',
    'Kotipalvelut & LVI': 'Home services & HVAC',
    'Kotipalvelut &amp; LVI': 'Home services &amp; HVAC',
    'Automaattinen tiedonkeruu jokaisesta puhelusta': 'Automatic data capture on every call',
    'Puheluyhteenveto & raportointi': 'Call summary & reporting',
    'Puheluyhteenveto &amp; raportointi': 'Call summary &amp; reporting',
    'Tasalaatuinen palvelu kaikille soittajille': 'Consistent service for every caller',
    'Palvelu 01': 'Service 01',
    'Puheluista vastattu': 'Calls answered',

    // hinnoittelu + checkout call-time strings
    '500 min puheluaikaa': '500 min of call time',
    '2 000 min puheluaikaa': '2,000 min of call time',
    '5 000 min puheluaikaa': '5,000 min of call time',
    'Puheluaikaa kuukaudessa': 'Call time per month',
    'Puheluihin vastaaminen 24/7': '24/7 call answering',

    // tietosuojaseloste extras
    'Puhelutallenteet ja -tiivistelmät käsitellään EU:n alueella sijaitsevilla palvelimilla. Tietoja ei siirretä EU:n tai ETA-alueen ulkopuolelle ilman asianmukaisia suojatoimia.':
      'Call recordings and summaries are processed on servers within the EU. Data is not transferred outside the EU/EEA without appropriate safeguards.',
    'Pilvipalvelut:': 'Cloud services:',
    'Taloudenhallintapalveluiden tarjoajat': 'Financial management service providers',

    // yhteystiedot — industry options
    'Lakipalvelut': 'Legal services',

    // dashboard extras
    'Tervetuloa,': 'Welcome,',
    'Testipuhelu': 'Test call',
    'Muokkaa →': 'Edit →',
    'Poista': 'Delete',
    'Sulje': 'Close',
    '✅ Vahvistettu': '✅ Confirmed',

    // onboarding option chips
    '💰 Kertoo palvelujen hinnat': '💰 Shares service prices',
    '💼 Muu palveluala': '💼 Other service industry',
    '💼  Muu palveluala': '💼  Other service industry',
    '💰  Kertoo palvelujen hinnat': '💰  Shares service prices',

    // admin extras
    'Ladataan tilaajia…': 'Loading subscribers…',
    'Ladataan…': 'Loading…',
    'Luo asiakastili & agentti →': 'Create customer account & agent →',
    'Luo asiakastili &amp; agentti →': 'Create customer account &amp; agent →',
    '✅ Asiakastili luotu!': '✅ Customer account created!',

    // generic
    'Usein kysytyt': 'Frequently asked',
    'Valmis': 'Ready',
    'Valmis kasvamaan': 'Ready to grow',
    'Valmis kokeilemaan': 'Ready to try',
    'Valmis kokeilemaan?': 'Ready to try?',

    // ============================================================
    // QA pass 3 — comprehensive additions for full EN coverage.
    // Added strings are unique per FI source; alphabetised by topic
    // for ease of maintenance.
    // ============================================================

    // -------- footer / boilerplate --------
    'SELORA': 'SELORA',
    'Selora.fi': 'Selora.fi',
    'selora.fi': 'selora.fi',
    'selora.fi/kirjaudu.html': 'selora.fi/login',
    'selora.tuki@gmail.com': 'selora.tuki@gmail.com',
    'tietosuoja@om.fi': 'tietosuoja@om.fi',
    'tietosuoja.fi': 'tietosuoja.fi',
    'Y-tunnus: 3535677-9': 'Business ID: 3535677-9',
    'Osoite: Helsinki, Suomi': 'Address: Helsinki, Finland',
    '© 2025 Selora Oy ·': '© 2025 Selora Oy ·',
    'Postiosoite: PL 800, 00531 Helsinki': 'Postal address: PL 800, 00531 Helsinki',
    'Puhelin: 029 566 6700': 'Phone: 029 566 6700',
    'Verkkosivusto:': 'Website:',
    'tietosuojaselosteen': 'privacy policy',
    'mukaisesti. (GDPR)': 'in accordance with. (GDPR)',
    'seloste': 'policy',
    'Tietoja': 'About',
    'Selora.fi · Älä enää missaa puhelua': 'Selora.fi · Never miss a call again',
    '© 2025 Selora Oy · Y-tunnus 3535677-9': '© 2025 Selora Oy · Business ID 3535677-9',

    // -------- nav / common --------
    'Etusivu': 'Home',
    'Palvelut': 'Services',
    'Hinnoittelu': 'Pricing',
    'Blogi': 'Blog',
    'Yhteystiedot': 'Contact',
    'Tietosuoja': 'Privacy',
    'Kirjaudu': 'Sign in',
    'Kirjaudu ulos': 'Sign out',
    'Rekisteröidy': 'Sign up',
    'Verkkosivusuunnittelu': 'Web design',
    'Tekoälyvastaanottaja': 'AI receptionist',
    'Tekoälyvastaanottajat': 'AI receptionists',
    'Tekoälyvastaanottajat — Selora': 'AI receptionists — Selora',
    'Toimialat': 'Industries',
    'Toimialat:': 'Industries:',
    'Toimiala': 'Industry',
    'Toimialaopas': 'Industry guide',
    'Toimialakohtainen sanasto': 'Industry-specific vocabulary',
    'Toimialakohtainen ratkaisu': 'Industry-specific solution',
    'Toimialaoppaat': 'Industry guides',

    // -------- service / industry words --------
    'Terveydenhuolto': 'Healthcare',
    'Terveys & kauneus': 'Health & beauty',
    'Kauneushoitolat': 'Beauty salons',
    'Kauneushoitolat & kampaamot': 'Beauty salons & hairdressers',
    'Kauneudenhoito': 'Beauty care',
    'Kauneudenhoito / Spa': 'Beauty care / Spa',
    'Kauneusala / Kampaamo': 'Beauty / Hair salon',
    'Ravintola': 'Restaurant',
    'Ravintolat': 'Restaurants',
    'Ravintola / Kahvila': 'Restaurant / Café',
    'Ravintola / Hotelli': 'Restaurant / Hotel',
    'Ravintola & autoala': 'Restaurant & automotive',
    'Ravintolat & hotellit': 'Restaurants & hotels',
    'Autokorjaamo': 'Auto repair shop',
    'Autokorjaamo / Autoliike': 'Auto repair / Dealership',
    'Autokorjaamot & autoliikkeet': 'Auto repair shops & dealerships',
    'Tilitoimisto': 'Accounting firm',
    'Tilitoimisto / Rahoitus': 'Accounting / Finance',
    'Tilitoimistot': 'Accounting firms',
    'Lakitoimisto': 'Law firm',
    'Lakitoimistot': 'Law firms',
    'Fysioterapia': 'Physiotherapy',
    'Fysioterapia / Hyvinvointi': 'Physiotherapy / Wellness',
    'Parturi / kampaamo': 'Barber / Hair salon',
    'Parturi / Kampaamo': 'Barber / Hair salon',
    'Parturi / Kampaamo Oy': 'Barber / Hair Salon Ltd',
    'Kampaamo': 'Hair salon',
    'Rakennusala': 'Construction',
    'Rakennus / Remontointi': 'Construction / Renovation',
    'Rakentaminen': 'Construction',
    'LVI': 'HVAC',
    'LVI-ala': 'HVAC industry',
    'LVI-asennus': 'HVAC installation',
    'Vakuutus': 'Insurance',
    'Vakuutus & rahoitus': 'Insurance & finance',
    'Talous & laki': 'Finance & law',
    'Terveydenhuolto / Hammashoito': 'Healthcare / Dental',
    'Muu': 'Other',
    'Muu palveluala': 'Other service industry',
    'Hampaiden- ja terveydenhoito': 'Dental & healthcare',

    // -------- industry icon-prefixed --------
    '✂️ Parturi / Kampaamo': '✂️ Barber / Hair salon',
    '🍽️ Ravintola / Kahvila': '🍽️ Restaurant / Café',
    '💅 Kauneudenhoito / Spa': '💅 Beauty care / Spa',
    '🔧 Autokorjaamo': '🔧 Auto repair shop',
    '📊 Tilitoimisto': '📊 Accounting firm',
    '⚖️ Lakitoimisto': '⚖️ Law firm',
    '🧘 Fysioterapia / Hyvinvointi': '🧘 Physiotherapy / Wellness',
    '🔧 LVI-asennus': '🔧 HVAC installation',
    '🏗️ Rakennus / Remontointi': '🏗️ Construction / Renovation',

    // -------- features / generic UI --------
    'Ominaisuudet': 'Features',
    'Ominaisuus': 'Feature',
    'Liidien kvalifiointi': 'Lead qualification',
    'Liidien keruu & kvalifiointi': 'Lead capture & qualification',
    'Liidien konversioaste': 'Lead conversion rate',
    'Monikielinen tuki': 'Multilingual support',
    'Monikielinen vastaanotto': 'Multilingual reception',
    'CRM-integraatio': 'CRM integration',
    'CRM-synkronointi saatavilla Kasvupaketissa': 'CRM sync available on the Growth plan',
    'Mukautettava persoona': 'Customisable persona',
    'Mukautettavat viestipohjat per tilanne': 'Customisable message templates per situation',
    'Katso hinnat': 'See pricing',
    'Vertailu': 'Comparison',
    'Analytiikka': 'Analytics',
    'Analytiikka & seuranta': 'Analytics & tracking',
    'GDPR': 'GDPR',
    'GDPR-yhteensopiva': 'GDPR-compliant',
    'EU AI Act': 'EU AI Act',
    '99.9% uptime': '99.9% uptime',
    'EU-palvelimet': 'EU servers',
    'Skaalautuu tarpeidesi mukaan': 'Scales with your needs',
    'Tuottolaskin': 'ROI calculator',
    'Live-demo': 'Live demo',
    'ROI-laskin': 'ROI calculator',
    'Laske menetetty liikevaihto sekunnissa': 'Calculate lost revenue in seconds',
    'Laske menetetty liikevaihto': 'Calculate lost revenue',
    'Tutustu palveluun →': 'Explore the service →',
    'Kokeile tuottolaskinta': 'Try the ROI calculator',
    'Kertoo hinnaston': 'Shares the price list',
    'Vastaa aukioloaikoihin': 'Answers opening-hours questions',
    '24/7 tavoitettavissa': 'Available 24/7',
    '24/7 vastaaminen': '24/7 answering',
    '24/7 saatavilla': 'Available 24/7',
    'Vain virka-ajalla': 'Office hours only',
    'Yksi puhelu kerrallaan': 'One call at a time',
    'Useita puheluita yhtä aikaa': 'Multiple calls simultaneously',
    'Ei lomia': 'No vacations',
    'Sairaslomat': 'Sick leave',
    'Empatia': 'Empathy',
    'Monimutkaiset tilanteet': 'Complex situations',
    'Vaatii koulutuksen': 'Requires training',
    'Ei syvää empatiakykyä': 'No deep empathy',
    'Persoonalinen tervehdys jokaiselle soittajalle': 'Personal greeting for every caller',
    'Personoidut viestit jokaiselle soittajalle': 'Personalised messages for every caller',
    'Toimii samanaikaisesti rajattomasti': 'Runs unlimited calls in parallel',
    'Rajaton kapasiteetti samanaikaisiin puheluihin': 'Unlimited capacity for simultaneous calls',
    'Rajaton samanaikaisuus': 'Unlimited parallel calls',
    'Nolla odotusaikaa': 'Zero wait time',
    'Hoidettu': 'Handled',
    'Agentti': 'Agent',
    'Agentit': 'Agents',
    'aktiivinen': 'active',
    'Aktiiviset': 'Active',
    'Apex': 'Apex',
    'AI': 'AI',
    'Demo': 'Demo',
    'Demo: Kampaamo Katariina': 'Demo: Hair Salon Katariina',
    'Kampaamo Katariina — esimerkki puhelusta': 'Hair Salon Katariina — example call',
    'Automatisoitu · Reaaliaikainen · Suomenkielinen': 'Automated · Real-time · Finnish-language',
    '< 1s': '< 1s',
    'Vastausaika': 'Response time',
    'Vasteaika': 'Response time',
    'Kesto: 45–60 min': 'Duration: 45–60 min',
    'Kesto: alle 24 h': 'Duration: under 24 hrs',
    'Kesto (min)': 'Duration (min)',
    'Kesto': 'Duration',
    'Numero': 'Number',
    'Tulos': 'Outcome',
    'Vastaamaton': 'Missed',
    'Siirretty': 'Transferred',
    'Vastaaja': 'Voicemail',
    'Jatkuva tuki': 'Ongoing support',
    'Suunnitelma': 'Plan',
    'Vaihda suunnitelma': 'Change plan',
    'Investointi': 'Investment',
    'Tulopotentiaali': 'Revenue potential',
    'Vuosittain': 'Annually',
    '/kk': '/mo',
    'kuukaudessa': 'per month',
    'kuukaudessa ·': 'per month ·',
    'menee ohi': 'is missed',
    'konservatiivinen arvio (78 %)': 'conservative estimate (78%)',
    'maksuton tarjous': 'free quote',
    'puhelua.': 'calls.',
    'Tee tili ilmaiseksi': 'Create account for free',
    'Luo tili ilmaiseksi →': 'Create free account →',
    'Luo ilmainen tili': 'Create free account',
    'Onko tili jo?': 'Already have an account?',
    'Jo tili?': 'Already a member?',
    'Siirry kirjautumiseen →': 'Go to sign-in →',
    'Unohditko salasanan?': 'Forgot your password?',
    'Kokeile itse': 'Try it yourself',
    'Oma agentti': 'Your own agent',
    'Luo oma agenttini →': 'Create my agent →',
    'Testaa agenttia suoraan selaimessa': 'Test the agent directly in your browser',
    'Seloraan': 'into Selora',
    'AI rakentaa agenttisi': 'AI builds your agent',
    'AI rakentaa agentin': 'AI builds the agent',
    'Agentti live — heti': 'Agent live — instantly',
    'agentin.': 'the agent.',
    'agentti.': 'the agent.',
    'Retell-agenttia': 'Retell agent',
    'Agent ID': 'Agent ID',
    'Retell Agent ID': 'Retell Agent ID',
    'Hae…': 'Search…',
    'Hae asiakasta… (valinnainen)': 'Search customer… (optional)',
    'kokeilemaan': 'to try',
    'kasvatat': 'you grow',
    'liiketoimintaasi.': 'your business.',
    'kampaamossasi.': 'in your salon.',
    'puolestasi.': 'on your behalf.',
    'myy puolestasi.': 'sells on your behalf.',
    'Muuttaa kaiken.': 'Changes everything.',
    'h': 'hrs',
    '48 h': '48 hrs',
    '48 tunnissa.': 'in 48 hours.',
    'kuukaudessa': 'per month',
    'Tehokas,': 'Efficient,',
    'nopea': 'fast',
    'tietosuoja': 'privacy',

    // -------- testimonials --------
    'NT': 'NT',
    'KV': 'KV',
    'MH': 'MH',
    'SL': 'SL',
    'SR': 'SR',
    'JM': 'JM',
    'DK': 'DK',
    'S': 'S',
    'Noah Tuokkola': 'Noah Tuokkola',
    'Noah Tuokkola, Selora': 'Noah Tuokkola, Selora',
    'Perustaja, Selora': 'Founder, Selora',
    'Tietosuojavastaava, Selora': 'Data Protection Officer, Selora',
    'Kaisa Virtanen': 'Kaisa Virtanen',
    'Mikael Heikkinen': 'Mikael Heikkinen',
    'Sara Leinonen': 'Sara Leinonen',
    'Janne M.': 'Janne M.',
    'Sanna R.': 'Sanna R.',
    'Dani K.': 'Dani K.',
    'Autokorjaamon omistaja, Oulu': 'Auto repair shop owner, Oulu',
    'Perustaja, Radiance Kauneusklinikka': 'Founder, Radiance Beauty Clinic',
    'Kampaamo-asiakas, Turku': 'Hair salon client, Turku',
    'Kampaamo Kake, Helsinki': 'Hairdresser Kake, Helsinki',
    'LVI-yrittäjä, Pirkanmaa': 'HVAC entrepreneur, Pirkanmaa',
    '"Pelkäsin, että se olisi monimutkaista. Käyttöönotto kesti kaksi päivää, eikä minun tarvinnut tehdä itse mitään teknistä. Nyt tekoäly vastaa puheluihin viikonloppuisin kun minulla on vapaata."': '"I was afraid it would be complicated. Onboarding took two days and I didn\'t have to do anything technical myself. Now the AI answers calls on weekends when I\'m off."',
    '"Me olimme vuosia siinä uskossa että meillä vain on hiljaisia viikkoja. Kun katsoin soittolistat läpi, 30 puhelua kuussa oli jäänyt vastaamatta. Se ei ollut hiljainen kuukausi. Se oli 10 000 euron kuukausi joka meni muualle."': '"For years we believed we just had quiet weeks. When I went through the call logs, 30 calls a month had gone unanswered. That wasn\'t a quiet month. That was a €10,000 month that went somewhere else."',
    '"Yritykset eivät menetä asiakkaita huonon palvelun takia. He menettävät asiakkaita sen takia, ettei palvelu edes alkanut. Puhelin soi tyhjässä huoneessa."': '"Businesses don\'t lose customers because of bad service. They lose customers because the service never even started. The phone rang in an empty room."',
    '"Useimmat suomalaiset pk-yritykset eivät tarvitse ihmistä tai tekoälyä. He tarvitsevat molempia oikeilla rooleilla. Tekoäly hoitaa rutiinin, ihminen hoitaa poikkeukset."': '"Most Finnish SMBs don\'t need a human or an AI. They need both, in the right roles. AI handles the routine, humans handle the exceptions."',
    '"Kun asiakkaat saavat juuri oikean viestin oikeaan aikaan, varausprosentti nousee automaattisesti."': '"When customers get exactly the right message at the right time, the booking rate goes up automatically."',
    '"Suostumus on väistämätön edellytys, jos tietoja käytetään automaattisesti analysointiin."': '"Consent is an unavoidable requirement if data is used for automated analysis."',
    '"Asentaja soittaa sinulle 20 minuutin sisällä" on kultaakin arvokkaampi lause asiakkaalle, jonka olohuone on muuttumassa uima-altaaksi.': '"A technician will call you within 20 minutes" is worth its weight in gold to a customer whose living room is turning into a swimming pool.',

    // -------- pricing strings --------
    'Aktivoi': 'Activate',
    'Päivitä nyt →': 'Upgrade now →',
    'Päivitä': 'Upgrade',
    '249 €/kk': '€249/mo',
    '499 €/kk': '€499/mo',
    '899 €/kk': '€899/mo',
    '490 €/kk': '€490/mo',
    '500 min': '500 min',
    '2 000 min': '2,000 min',
    '5 000 min': '5,000 min',
    '/ kk': '/ mo',
    '+ alv. 25,5%': '+ VAT 25.5%',
    '+ alv. 25,5 %': '+ VAT 25.5%',
    '5 088 €/vuosi': '€5,088/year',
    '9 168 €/vuosi': '€9,168/year',
    '2 544 €/vuosi': '€2,544/year',
    '~55 000 €': '~€55,000',
    '~380 €': '~€380',
    '2 800 €': '€2,800',
    'Kertamaksu.': 'One-time fee.',
    'kertamaksu': 'one-time fee',
    'Perussivu': 'Single page',
    '4–7 sivua, mobiilioptimoitu': '4–7 pages, mobile-optimised',
    'Kirjautumissivu': 'Login page',
    'Voiko tilauksen peruuttaa?': 'Can I cancel my subscription?',
    'Onko ilmainen kokeilu saatavilla?': 'Is a free trial available?',
    'Onko tietoni turvassa? GDPR?': 'Is my data safe? GDPR?',
    'Stripe': 'Stripe',
    '— 256-bit SSL-salaus': '— 256-bit SSL encryption',

    // -------- demo / hero / index extras --------
    '3 artikkelia julkaistu · 2 tulossa': '3 articles published · 2 coming soon',
    '2 artikkelia julkaistu · 2 tulossa': '2 articles published · 2 coming soon',
    'Uusimmat artikkelit': 'Latest articles',
    'artikkelit': 'articles',
    'Oppaat': 'Guides',
    'Oppaat, joilla': 'Guides to',
    'Uutiskirje': 'Newsletter',
    '20 minuuttia': '20 minutes',
    '20 minuuttia.': '20 minutes.',
    '24 tunnin kuluessa': 'within 24 hours',
    '30 minuuttia.': '30 minutes.',
    '45 minuuttia': '45 minutes',
    'Kolme': 'Three',
    'Sopii täydellisesti.': 'Sounds perfect.',
    'Vastaukset': 'Answers',
    'yleisimpiin': 'to the most common',
    'kysymyksiin.': 'questions.',
    'Valmiina': 'Ready',
    'kaikkiaan': 'in total',
    'Viikko': 'Week',
    'Vie .ics': 'Export .ics',
    'Lataa .ics': 'Download .ics',
    'Ke': 'Wed',
    'Ma': 'Mon',
    'Pe': 'Fri',
    'Ti': 'Tue',
    'To': 'Thu',
    'La': 'Sat',
    'Su': 'Sun',
    '📅 Varaus': '📅 Booking',
    '🕐 Saatavuus': '🕐 Availability',
    'Saatavuuden tila': 'Availability status',
    '✅ Vapaa': '✅ Free',
    'Alkamisaika': 'Start time',
    'Tila': 'Status',
    '🟡 Odottaa': '🟡 Pending',
    '☑️ Hoidettu': '☑️ Completed',
    '❌ Peruutettu': '❌ Cancelled',
    'Tilattu palvelu': 'Booked service',
    'Yleiskatsaus': 'Overview',
    'Kalenteri': 'Calendar',
    'Asetukset': 'Settings',
    'Navigaatio': 'Navigation',
    'Tilisi': 'Your account',
    'Koko nimi': 'Full name',
    'Asiakkaan nimi': 'Customer name',
    'Otsikko': 'Title',
    'Otsikko (esim. Leikkaus — Matti)': 'Title (e.g. Haircut — Matti)',
    'Palvelu': 'Service',
    'Kaupunki': 'City',
    'Kieli': 'Language',
    'Suomi': 'Finnish',
    'Suomi + Englanti': 'Finnish + English',
    'Suomi + Ruotsi': 'Finnish + Swedish',
    'Suomi + Ruotsi + Englanti': 'Finnish + Swedish + English',
    'Suomi · Ruotsi · Englanti': 'Finnish · Swedish · English',
    '🇫🇮 Suomi': '🇫🇮 Finnish',
    '🇬🇧 Englanti': '🇬🇧 English',
    '🇸🇪 Ruotsi': '🇸🇪 Swedish',
    'Vain suomi': 'Finnish only',
    'FI · SV · EN': 'EN · SV · FI',
    'Agentin asetukset': 'Agent settings',
    'Ammattimainen': 'Professional',
    'Asiapitoinen, kohteliaan virallinen': 'Substantive, politely formal',
    'Asiallinen': 'Formal',
    'Rento': 'Casual',
    'Vapaamuotoinen, nuorekas tyyli': 'Casual, youthful style',
    'Virallinen': 'Official',
    'Lupauksemme': 'Our promise',
    'ensin.': 'first.',
    'etusi': 'your benefit',
    'hinnoittelu.': 'pricing.',
    'hinnoittelusta.': 'about pricing.',
    'sopii': 'fits',
    '(valinnainen)': '(optional)',
    'Sulje ilmoitus': 'Close notice',
    'Luo oma agenttisi': 'Create your own agent',
    'Luo': 'Create',
    'tili': 'account',
    'ADMIN': 'ADMIN',
    'Admin-kirjautuminen': 'Admin sign-in',
    'Tarkistetaan oikeuksia…': 'Verifying permissions…',
    'Asiakaspalvelun tehostaminen chatilla': 'Enhancing customer service with chat',
    'Personoitu markkinointi ilman lisätyötä': 'Personalised marketing without extra work',
    'Reaaliaikainen kojelauta verkossa': 'Real-time online dashboard',
    'Vertailutiedot edellisiin jaksoihin': 'Comparisons to previous periods',
    '7 min lukuaika': '7 min read',
    '8 min lukuaika': '8 min read',
    '6 min lukuaika': '6 min read',
    '· 6 min lukuaika': '· 6 min read',
    '· 7 min lukuaika': '· 7 min read',
    '· 8 min lukuaika': '· 8 min read',

    // -------- onboarding additions --------
    'Personointikysely': 'Personalisation questionnaire',
    'Luodaan agenttiasi...': 'Building your agent…',
    'Analysoidaan yrityksesi tietoja': 'Analysing your business details',
    'Luodaan agentin persoonallisuus': 'Building the agent\'s personality',
    'Tallennetaan dashboardiin': 'Saving to dashboard',
    'Koko prosessi tapahtuu suoraan selaimessasi.': 'The entire process runs right in your browser.',

    // -------- features grid items --------
    'Reaaliaikainen kalenteritarkistus': 'Real-time calendar check',
    'Automaattiset muistutukset asiakkaalle': 'Automatic reminders for the customer',
    'Tunnistaa robottipuhelut alle sekunnissa': 'Detects robocalls in under a second',
    'Roskapostisuodatus': 'Spam filtering',
    'Hakukoneoptimoinnin seuranta': 'SEO tracking',
    'Automaattiset varmuuskopiot': 'Automatic backups',
    'Yli 500 integraatiota Zapierin kautta': 'Over 500 integrations via Zapier',
    'Natiivi tuki: HubSpot, Salesforce, Pipedrive, Zoho': 'Native support: HubSpot, Salesforce, Pipedrive, Zoho',
    'Chat arkisin': 'Chat on weekdays',
    'Dashboard': 'Dashboard',
    'Ei IT-jargonia, ei kuukausia kestäviä projekteja. Tässä on mitä tapahtuu, kun suomalainen yritys ottaa Seloran käyttöön.': 'No IT jargon, no projects that drag on for months. Here\'s what happens when a Finnish business gets Selora up and running.',
    'Ongelma → Ratkaisu': 'Problem → Solution',
    'Tekoälyvastaanottajan käyttöönotto:': 'Onboarding an AI receptionist:',
    'mitä oikeasti tapahtuu?': 'what really happens?',
    'Tämä kysymys nousee esiin lähes jokaisessa ensimmäisessä palaverissa. Otetaan se vihdoin käsittelyyn ilman myyntipuhetta.': 'This question comes up in almost every first meeting. Let\'s finally tackle it without a sales pitch.',
    'Kuinka paljon yrityksesi häviää': 'How much your business loses',
    'menetetyistä puheluista': 'on missed calls',
    'vuodessa?': 'each year?',
    'Harva yrittäjä laskee tätä lukua. Lasketaan se nyt yhdessä. Tulokset voivat yllättää.': 'Few business owners ever calculate this number. Let\'s do it together. The results can be surprising.',
    'SEO-optimointi hakukoneille': 'SEO optimisation for search engines',
    'SEO-optimointi': 'SEO optimisation',
    'SEO-avainsanojen integrointi': 'SEO keyword integration',
    'Konversio-optimoitu rakenne': 'Conversion-optimised structure',
    'Konversio-optimointi': 'Conversion optimisation',
    'Yhteydenottolomake': 'Contact form',
    'Tehokas,': 'Effective,',
    'nopea': 'fast',
    'Verkkosivuanalyysi': 'Website analysis',
    'tietosuojaselosteen': 'privacy policy',

    // -------- contact-form attribute placeholders --------
    'Matti': 'Matti',
    'Virtanen': 'Virtanen',
    'asiakas@yritys.fi': 'customer@yourbusiness.com',
    'matti@yrityksesi.fi': 'matti@yourbusiness.com',
    'sinä@yritys.fi': 'you@yourbusiness.com',
    'sinun@email.fi': 'you@email.com',
    '+358 04X XXX XXXX': '+358 04X XXX XXXX',
    'Toista salasana': 'Repeat password',
    'Esim. Parturi Kallio Oy': 'e.g. Parturi Kallio Oy',
    'Parturi Kallio Oy': 'Parturi Kallio Oy',
    'Helsinki': 'Helsinki',
    'Erityisohjeet, hinnat, erikoispalvelut…': 'Special instructions, prices, special services…',
    'Erikoistarjoukset, erityisohjeet...': 'Special offers, special instructions…',
    'Miesten leikkaus 25€, naisten leikkaus 35€...': 'Men\'s cut €25, women\'s cut €35…',
    'agent_xxxxxxxxxxxxxxxxxxxxxxxx': 'agent_xxxxxxxxxxxxxxxxxxxxxxxx',
    'Lyhyt 1–2 lauseen esittely artikkelista…': 'Short 1–2 sentence intro for the article…',
    'https://selora.fi/blogi/artikkeli-slug': 'https://selora.fi/blog/article-slug',
    'https://… .jpg tai .png': 'https://… .jpg or .png',
    'esim. Ohjaa soittamaan suoraan numeroon +358 40 123 4567': 'e.g. Direct calls to +358 40 123 4567',
    'Ma–Pe 9–17': 'Mon–Fri 9–17',
    'sinun@yritys.fi': 'you@yourbusiness.com',
    'Nimi': 'Name',
    'Kansikuva URL (valinnainen)': 'Cover image URL (optional)',
    'Artikkelin URL': 'Article URL',

    // -------- onboarding industries / tasks --------
    '📞 Vastaa yleisiin kysymyksiin': '📞 Answer common questions',
    '📅 Vastaanottaa ajanvarauksia': '📅 Take appointment bookings',
    '🕐 Kertoo aukioloajat': '🕐 Share opening hours',
    '📍 Kertoo sijainnin / ohjeet': '📍 Share location / directions',

    // -------- blog index meta / labels --------
    '7. huhtikuuta 2026': '7 April 2026',
    '9. huhtikuuta 2026': '9 April 2026',
    '13. huhtikuuta 2026': '13 April 2026',
    '21. huhtikuuta 2026': '21 April 2026',
    '1. huhtikuuta 2026': '1 April 2026',
    '1. tammikuuta 2025': '1 January 2025',
    '11. Muutokset tietosuojaselosteeseen': '11. Changes to the privacy policy',
    '12. Yhteydenotto': '12. Contact',
    '07. Tietoturva': '07. Security',
    '09. Valvontaviranomainen': '09. Supervisory authority',
    'Sovellettava laki': 'Applicable law',
    'EU:n yleinen tietosuoja-asetus (GDPR) 2016/679': 'EU General Data Protection Regulation (GDPR) 2016/679',

    // -------- blog post titles --------
    'GDPR ja tekoälyvastaanottaja: mitä suomalaisen pk‑yrityksen on tiedettävä – Selora Blogi':
      'GDPR and AI receptionists: what every Finnish SMB needs to know – Selora Blog',
    'Kuinka paljon yritys häviää menetetyistä puheluista? – Selora Blogi':
      'How much do businesses lose from missed calls? – Selora Blog',
    'LVI-yritys ja hätäpuhelut: mitä tapahtuu, kun asiakas soittaa kello 22 ja putki vuotaa - Selora Blogi':
      'HVAC companies and emergency calls: what happens when a customer calls at 10pm with a burst pipe - Selora Blog',
    'Tekoäly kasvattaa parturi-kampaamon asiakaskuntaa käytännössä – Selora Blogi':
      'How AI grows a barbershop\'s customer base in practice – Selora Blog',
    'Tekoäly vai ihmisvastaanottaja? Rehellinen vertailu – Selora Blogi':
      'AI or human receptionist? An honest comparison – Selora Blog',
    'Tekoälyvastaanottajan käyttöönotto: mitä oikeasti tapahtuu? – Selora Blogi':
      'Onboarding an AI receptionist: what really happens? – Selora Blog',
    'Kumpi kannattaa valita: tekoälyvastaanottaja vai perinteinen ihmisvastaanottaja? Rehellinen kustannusvertailu suomalaiselle yrittäjälle.':
      'Which should you choose: an AI receptionist or a traditional human one? An honest cost comparison for Finnish entrepreneurs.',
    'Käytännön opas tekoälyvastaanottajan käyttöönotosta suomalaisessa yrityksessä. Ei teknistä osaamista vaadita.':
      'A practical guide to deploying an AI receptionist in a Finnish business. No technical skills required.',
    'Lasketaan yhdessä paljonko suomalainen pk-yritys häviää vuodessa menetetyistä puheluista. Luvut yllättävät.':
      'Let\'s calculate together how much a Finnish SMB loses each year on missed calls. The numbers are surprising.',
    'Miksi LVI-yrityksen illat ja viikonloput ovat rahan menetystä, ja miten tekoälyvastaanottaja ottaa hätäpuhelut hallintaan 24/7.':
      'Why evenings and weekends are revenue lost for HVAC companies, and how an AI receptionist takes emergency calls 24/7.',
    'Tekoälyvastaanottajan käyttöönotto yrityksessä': 'Deploying an AI receptionist in your business',
    'Yrittäjä vertailee tekoälyä ja ihmistä vastaanottajaroolissa': 'An entrepreneur compares AI and a human in the receptionist role',
    'Menetetyt puhelut ja niiden vaikutus liiketoimintaan': 'Missed calls and their impact on business',
    'LVI-asentaja korjaa putkistoa iltaan': 'HVAC technician working into the evening',
    'Autokorjaamo verkkosivumalli': 'Auto repair shop website template',
    'LVI verkkosivumalli': 'HVAC website template',
    'Ravintola verkkosivumalli': 'Restaurant website template',
    'Kampaamo verkkosivumalli': 'Hairdresser website template',

    // -------- blog body content --------
    'Tekoälyvastaanottaja helpottaa puheluihin vastaamista, mutta sen käyttö pitää sovittaa tiukkaan EU‑tason tietosuojaan.':
      'An AI receptionist makes call handling easier, but its use must comply with strict EU-level data protection.',
    'Suurin osa suomalaisista LVI-yrityksistä menettää asiakkaita illoilla, öisin ja viikonloppuisin. Syy ei ole huono työ, vaan vastaamaton puhelin. Katsotaan miksi, ja mitä asialle voi tehdä ilman että kukaan joutuu päivystämään sohvan nurkassa.':
      'Most Finnish HVAC companies lose customers in the evenings, at night and on weekends. The reason isn\'t poor work — it\'s an unanswered phone. Let\'s look at why, and what you can do about it without anyone having to be on call from the corner of their sofa.',
    'Sana "tekoäly" saa monet yrittäjät ajattelemaan montaakin asiaa ennen kuin tulee mieleen ratkaisu omaan ongelmaansa. Monimutkainen asennus, kuukausien projekti, IT-asiantuntijat, integraatiot, koodaus. Ehkä jotain, joka sopii isolle pörssifirmalle muttei pienelle parturille tai lääkäriasemalle.':
      'The word "AI" makes many business owners think of many things before they think of a solution to their own problem. Complicated installation, months-long projects, IT experts, integrations, coding. Maybe something that fits a big publicly listed company but not a small barbershop or medical clinic.',
    'Todellisuus on täysin erilainen. Seloran käyttöönotto kestää alle 48 tuntia ja vaatii sinulta yhden puhelinpalaverin. Se siinä.':
      'The reality is entirely different. Selora\'s onboarding takes under 48 hours and requires one phone meeting from you. That\'s it.',
    'Olen käynyt tämän keskustelun kymmeniä kertoja. Yrittäjä kuulee ensimmäistä kertaa tekoälyvastaanottajista, innostuu ideasta, mutta törmää välittömästi samaan kysymykseen:':
      'I\'ve had this conversation dozens of times. An entrepreneur hears about AI receptionists for the first time, gets excited, but immediately runs into the same question:',
    'Onko se oikeasti yhtä hyvä kuin ihminen?': 'Is it really as good as a human?',
    'Mitä tapahtuu askel askeleelta': 'What happens, step by step',
    'Tiedät tunteen. Puhelin on soinut toimistossa sillä hetkellä, kun olet ollut asiakkaan kanssa, ajanut autolla tai syönyt lounasta. Katsot myöhemmin puhelinta ja näet tuntemattoman numeron. Ehkä soitat takaisin, ehkä et.':
      'You know the feeling. The phone rang in the office at the exact moment you were with a customer, driving, or having lunch. Later you check your phone and see an unknown number. Maybe you call back, maybe you don\'t.',
    'Kartoitus & konfigurointi': 'Discovery & configuration',
    'Lyhyt vastaus on: riippuu tilanteesta. Pidempi vastaus vaatii katsauksen molempien todellisiin kustannuksiin, vahvuuksiin ja heikkouksiin. Yritetään siis selvittää tämä rehellisesti.':
      'Short answer: it depends. The longer answer requires looking at the real costs, strengths and weaknesses of both. So let\'s figure this out honestly.',
    'Miksi GDPR on erityisen tärkeä tekoälyn kanssa?': 'Why is GDPR especially important with AI?',
    'Miksi tekoäly on tärkeä kilpailuetu': 'Why AI is an important competitive advantage',
    'Useimmat yrittäjät ajattelevat menetetyistä puheluista pelkkänä pieneen haittana. Se on kuitenkin yksi suurimmista näkymättömistä kustannuksista, joita pk-yrityksillä on. Ja koska sitä ei lasketa, sen ei edes ajatella olevan ongelma.':
      'Most entrepreneurs think of missed calls as a minor inconvenience. But it\'s one of the biggest invisible costs SMBs face. And because it\'s never measured, it isn\'t even thought of as a problem.',
    'LVI-alalla puhelu ei ole kysely, se on hälytys': 'In the HVAC industry a phone call isn\'t an inquiry — it\'s an alarm',
    'Mitä ihmisvastaanottaja oikeasti maksaa?': 'What does a human receptionist really cost?',
    'Päivittäisessä kiireessä verkkomarkkinoinnin ja ajanvarauksen hallinta vie aikaa, jota olisi helpommin käytettävissä leikkaus- ja värjäyspäiviin. Tekoäly automatisoi toistuvat tehtävät, analysoi dataa ja ehdottaa seuraavia askeleita, jolloin voit keskittyä asiakaskokemukseen.':
      'In the daily rush, managing online marketing and bookings eats time that could be spent on cuts and colours. AI automates the repetitive tasks, analyses data and suggests next steps, so you can focus on the customer experience.',
    'Tekoälyvastaanottajan keräämät tiedot sisältävät usein puhelinnumeroita, nimiä ja aikaleimoja – eli henkilötietoja. GDPR:n 5 periaatetta (laki, tarkoitus, minimointi, oikeellisuus, säilytysaika) koskevat näitä tietoja yhtä tiukasti kuin perinteisiä asiakasrekistereitä.':
      'The data an AI receptionist collects often includes phone numbers, names and timestamps — that is, personal data. GDPR\'s five principles (lawfulness, purpose, minimisation, accuracy, retention) apply to this data just as strictly as to traditional customer records.',
    'Mitä tutkimukset sanovat?': 'What does the research say?',
    ', tai kun lämmitys on lakannut toimimasta pakkasyönä.': ', or when the heating has stopped working on a freezing night.',
    'Kampaamoon soitetaan, kun halutaan varata aikaa ensi viikolle. Ravintolaan soitetaan, kun halutaan pöytä illaksi. LVI-yritykseen soitetaan kun':
      'People call a hairdresser to book an appointment for next week. They call a restaurant to reserve a table for the evening. They call an HVAC company when',
    'Seloran GDPR‑yhteensopivuus': 'Selora\'s GDPR compliance',
    'Suomessa toimistotyöntekijän tai vastaanottovirkailijan bruttopalkka liikkuu tyypillisesti välillä 2 400–3 200 euroa kuukaudessa. Kun tähän lisätään työnantajan sivukulut, jotka ovat noin 25–30 prosenttia, todellinen kuukausikustannus yritykselle on helposti 3 000–4 200 euroa. Vuodessa se on 36 000–50 000 euroa pelkästä puheluihin vastaamisesta.':
      'In Finland, the gross monthly salary for an office worker or receptionist typically runs between €2,400 and €3,200. Add the employer\'s side costs of 25–30%, and the real monthly cost to the business is easily €3,000–€4,200. That\'s €36,000–€50,000 per year just for answering the phone.',
    'vettä tulee olohuoneen lattialle juuri nyt': 'water is pouring onto the living-room floor right now',
    '. He etsivät saman palvelun muualta tai luopuvat kokonaan. Vain noin joka viides soittaa toiseen kertaan.':
      '. They look for the same service elsewhere or give up entirely. Only about one in five calls back.',
    '78 prosenttia asiakkaista, jotka eivät tavoita yritystä ensimmäisellä yrittämällä, eivät soita uudelleen':
      '78% of customers who don\'t reach a business on the first try never call again',
    'HubSpotin asiakaspalveluraportin mukaan': 'According to HubSpot\'s customer service report,',
    'Integraatio & testaus': 'Integration & testing',
    'Tutustumispuhelu': 'Discovery call',
    '-tagia)': ' tag)',
    'Kuvaus tilastosta (voi sisältää': 'Caption for the statistic (may include',
    'Käymme läpi yrityksesi tilanteen, asiakaspalvelun haasteet ja mitä haluat tekoälyn tekevän. Puhelulla ei ole myyntipaineita. Se kestää noin 20 minuuttia ja on täysin maksuton.':
      'We walk through your business situation, your customer service challenges and what you want the AI to do. There\'s no sales pressure on the call. It takes about 20 minutes and is completely free.',
    'Selora toimii EU:n sisäisillä palvelimilla ja on GDPR‑yhteensopiva. Kaikki tallennetut puhelut ja keskustelulogit käsitellään kahdenvälisen salauksen (TLS) ja ISO‑27001‑sertifioidun infrastruktuurin kautta.':
      'Selora runs on servers inside the EU and is GDPR-compliant. All stored calls and conversation logs are handled with mutual encryption (TLS) and ISO 27001-certified infrastructure.',
    'Tähän päälle tulevat lomat, sairaslomat, työterveyskustannukset, koulutus ja se tuttu hetki, kun ainoa vastaanottaja on lounaalla ja puhelin soi tyhjässä toimistossa.':
      'On top of that come holidays, sick leave, occupational health costs, training and the familiar moment when the only receptionist is on lunch and the phone rings in an empty office.',
    'Tämä tekee LVI-alasta puheluiden osalta täysin omanlaisensa. Asiakas ei vertaile kolmea tarjousta, hän ei jätä viestiä ja odota aamua. Hän soittaa listaltaan seuraavalle niin kauan että joku vastaa. Ja se joka vastaa, saa keikan.':
      'This makes the HVAC industry uniquely different when it comes to calls. The customer isn\'t comparing three quotes, doesn\'t leave a message and wait for morning. They call the next number on the list until someone answers. And whoever answers gets the job.',
    'bold': 'bold',
    'Toinen relevantti luku: vastaamatta jääneet puhelut sijoittuvat tyypillisimmin lounasaikaan, iltapäiväruuhkaan ja aukioloaikojen ulkopuolelle. Juuri silloin, kun potentiaaliset asiakkaat ovat vapaana soittamaan.':
      'Another relevant number: missed calls typically cluster at lunch time, the afternoon rush and outside opening hours. Exactly when potential customers are free to call.',
    'Puhelut tulevat silloin kun niitä ei voi ottaa': 'Calls come exactly when you can\'t take them',
    'Älykäs ajanvaraus – varmistettu täydennys': 'Smart appointment booking — a verified add-on',
    ', jos he eivät tavoita yritystä ensimmäisellä soittokertaa. Lähde: HubSpot Customer Service Report 2024.':
      ', if they don\'t reach the business on the first call. Source: HubSpot Customer Service Report 2024.',
    'Julkaisu & seuranta': 'Launch & monitoring',
    'Olen jutellut tämän vuoden aikana kymmenien LVI-yrittäjien kanssa ympäri Suomea. Suurin osa kuvaa arkea suunnilleen näin: päivällä asentajat ovat kohteessa ja puhelimeen ei yksinkertaisesti keretä vastaamaan. Illalla ja viikonloppuna puhelin on jossain pöydällä, ja kukaan ei varta vasten päivystä, ei ainakaan ilmaiseksi.':
      'Over the past year I\'ve spoken with dozens of HVAC entrepreneurs across Finland. Most describe daily life roughly like this: during the day technicians are on site and there simply isn\'t time to answer the phone. In the evenings and on weekends the phone sits on a table somewhere, and no one is specifically on call — at least not for free.',
    'asiakkaista ei soita uudelleen': 'of customers never call back',
    'Seloran tekoälypohjainen ajanvaraus seuraa vapaita aikoja, suosituimpia palveluja ja asiakkaiden aikaisempia varauksia. Järjestelmä lähettää automaattisesti muistutuksia ja ehdottaa vapaita aikoja, kun asiakas avaa uudelleen sovelluksen.':
      'Selora\'s AI-driven booking tracks open slots, popular services and each customer\'s past bookings. The system automatically sends reminders and suggests open times when the customer reopens the app.',
    'aukioloaikojen ulkopuolella. Suuri osa näistä on uusia asiakaskontakteja, ei vain olemassa olevia asiakkaita. Lähde: Invoca Call Intelligence Report.':
      'occur outside opening hours. A large share of these are new customer contacts, not just existing customers. Source: Invoca Call Intelligence Report.',
    'yrityspuheluista jää vastaamatta': 'of business calls go unanswered',
    'Tulos on se, että iso osa puheluista menee suoraan vastaajaan. Tai mikä pahempaa, kolmen soiton jälkeen kilpailijalle. Asiakas ei pahoita mieltään siitä ettet vastannut. Hän vain soittaa seuraavalle.':
      'The result is that a large share of calls goes straight to voicemail. Or worse — to a competitor after three rings. The customer doesn\'t feel slighted that you didn\'t answer. They just call the next number.',
    'Ihmisvastaanottaja on parhaimmillaan loistava: hän aistii asiakkaan tunnetilan, osaa improvisoida odottamattomissa tilanteissa ja rakentaa aitoa yhteyttä. Jos yrityksesi käsittelee paljon emotionaalisesti herkkiä tilanteita tai erittäin monimutkaisia sopimuksia, ihminen on korvaamaton.':
      'A human receptionist at their best is excellent: they sense the customer\'s mood, improvise in unexpected situations and build genuine connection. If your business handles many emotionally sensitive situations or highly complex contracts, a human is irreplaceable.',
    'Koulutamme tekoälyn sinun yritystäsi varten': 'We train the AI for your specific business',
    'Kuinka varmistetaan oikeusperuste': 'How to ensure a lawful basis',
    'Esimerkkilaskelma: varausjärjestelmän säästöt': 'Example calculation: savings from the booking system',
    'Lasketaan sinun yrityksesi luvut': 'Let\'s calculate your business\'s numbers',
    'Seloran tiimi rakentaa tekoälyagenttisi perustuen antamaasi tietoon: palvelut, hinnat, aukioloajat, usein kysytyt kysymykset ja miten haluat puhelut hoidettavan. Sinulle lähetetään draft kuultavaksi ennen julkaisua.':
      'The Selora team builds your AI agent based on the information you provide: services, prices, opening hours, frequently asked questions and how you want calls handled. We send you a draft to listen to before going live.',
    'Ennen kuin tekoälyvastaanottaja tallentaa tai tallentaa puhelun, asiakkaalta on pyydettävä nimenomaista suostumusta. Tämä voidaan tehdä joko ääniviestillä tai tekstinä puhelun alussa.':
      'Before an AI receptionist records or stores a call, the customer must be asked for explicit consent. This can be done with a voice message or text at the start of the call.',
    'Mitä tekoälyvastaanottaja osaa ja mitä se maksaa?': 'What can an AI receptionist do, and what does it cost?',
    'Käytetty aika varauksen peruuttamiseen': 'Time spent cancelling bookings',
    'Otetaan konkreettinen esimerkki. Kuvitellaan pieni, yhden tai kahden henkilön yritys Tampereella. Vaikkapa fysioterapiavastaanotto tai autohuolto. He saavat noin 20 puhelua päivässä. Viidestä kymmeneen niistä jää vastaamatta, koska hoitaja tai mekaanikko on jo asiakkaan kanssa.':
      'Let\'s take a concrete example. Imagine a small one- or two-person business in Tampere — say, a physiotherapy practice or an auto shop. They get about 20 calls a day. Five to ten of those go unanswered because the practitioner or mechanic is already with a customer.',
    'ei jätä vastaajaviestiä': 'leaves no voicemail',
    'hätäpuhelun soittaneista asiakkaista': 'of customers calling about an emergency',
    'vaan soittaa suoraan seuraavalle yritykselle, jos ensimmäiseen ei vastata.':
      ' but instead calls the next business directly if no one answers the first.',
    '3 h/kk': '3 hrs/mo',
    'Tekoälyvastaanottaja, kuten Seloran tarjoama ratkaisu, vastaa puheluihin välittömästi vuorokauden ympäri, päivittäin viikossa, ilman lounaataukoja tai sairastelupäiviä. Se käsittelee useita puheluita samanaikaisesti ja puhuu sujuvaa suomea.':
      'An AI receptionist — like Selora\'s — answers calls instantly around the clock, every day of the week, with no lunch breaks or sick days. It handles multiple calls simultaneously and speaks fluent Finnish.',
    'Kartoitus': 'Discovery',
    'Esimerkkilaskelma: 7 vastaamatonta puhelua/päivä': 'Example calculation: 7 missed calls/day',
    'Seloran Aloitus-paketti alkaa 490 eurosta kuukaudessa. Kasvupaketti on 890 euroa. Kummassakaan ei ole piilokustannuksia tai yllätyslaskuja.':
      'Selora\'s Starter plan begins at €490 per month. The Growth plan is €890. Neither has hidden costs or surprise invoices.',
    'Säästöt henkilökunnan ajassa': 'Savings in staff time',
    'Yksi menetetty iltapuhelu = ei kahvirahoja': 'One missed evening call = no coffee money',
    '150 €/kk': '€150/mo',
    'Parturin menetetty puhelu on kolmenkympin leikkaus. LVI-puolella yksi keikka voi olla mitä vain 150 eurosta viiteentuhanteen. Kun laskee tämän realistisesti läpi, puhelimen vastaamattomuus muuttuu lompakkokysymykseksi yllättävän nopeasti.':
      'A barber\'s missed call is a thirty-euro haircut. On the HVAC side one job can be anything from €150 to five thousand. Run the numbers honestly and the cost of an unanswered phone becomes a wallet question surprisingly fast.',
    'Puhelinnumero tai siirto': 'Phone number or porting',
    'Vastaamattomat puhelut päivässä': 'Missed calls per day',
    '7 kpl': '7',
    'Saat joko uuden suomalaisen puhelinnumeron tai teemme siirron olemassa olevasta numerostasi. Kaikki on dokumentoitu selkeästi ja voidaan peruuttaa milloin tahansa.':
      'You either get a new Finnish phone number or we port over your existing number. Everything is clearly documented and can be reversed at any time.',
    'Tietojen minimointi ja säilytys': 'Data minimisation and retention',
    'Yhteensä / Tulos': 'Total / Result',
    '1 800 €/vuosi': '€1,800/year',
    'Ihmisvastaanottaja': 'Human receptionist',
    'Samana päivänä': 'Same day',
    'Suunnittelu & kehitys': 'Design & development',
    'Esimerkkilaskelma: keskikokoinen LVI-yritys': 'Example calculation: a mid-sized HVAC company',
    'Perinteinen ratkaisu': 'Traditional solution',
    'Selora tallentaa vain puheen transkription ja puhelun perusteet. Vanhempia tallenteita voi automaattisesti poistaa 30‑ päivän jälkeen, ellei niille ole erillistä säilytyspohjaa.':
      'Selora stores only the speech transcription and the call essentials. Older recordings can be deleted automatically after 30 days unless there\'s a separate retention basis.',
    'Niistä uusia potentiaalisia asiakkaita (arv. 40%)': 'Of those, new potential customers (est. 40%)',
    '2,8 kpl': '2.8',
    'Arvioitu todellinen kustannus sivukuluineen. Ei sisällä lomia tai sairausaikoja.':
      'Estimated true cost including side costs. Excludes holidays and sick leave.',
    'Puhelutallenteet': 'Call recordings',
    'Vastaamattomia puheluita keskimäärin / vko (illat + vkl)':
      'Average missed calls per week (evenings + weekends)',
    'Esimerkkilaskelma: säästöt tietoturvavaihdoissa': 'Example calculation: savings on security swaps',
    'Eivät soita takaisin (78%)': 'Don\'t call back (78%)',
    'Konsultointi- ja auditointikulut (arvio)': 'Consulting & audit costs (estimate)',
    'Live — ja jatkuva parantaminen': 'Live — and continuous improvement',
    'Näistä hätä- tai keikkapuheluita (~60 %)': 'Of those, emergency or job calls (~60%)',
    'Tekoäly analysoi asiakkaiden käyntihistoriaa ja luo kohdennettuja kampanjoita – esimerkiksi “Tule tänä viikonloppuna, saat 20 % alennuksen värjäyspalvelusta”. Näin viestit ovat relevantteja ja reaktioprosentit nousevat.':
      'The AI analyses customer visit history and builds targeted campaigns — for example, "Come this weekend and get 20% off colour services." That way the messages stay relevant and response rates climb.',
    '2,2 kpl/päivä': '2.2/day',
    'Tekoäly vastaa puheluihin. Saat jokaisen puhelun jälkeen tiivistelmän viestistä. Voit milloin tahansa pyytää muutoksia vastauksiin tai lisätä uusia tietoja. Ajan myötä agentti oppii juuri sinun yrityksesi tilanteen.':
      'The AI answers calls. After every call you get a summary of the message. You can request changes to answers or add new information at any time. Over time the agent learns the specifics of your business.',
    'Alle 48 tunnissa käyttöönotosta': 'In under 48 hours from onboarding',
    'Keskimääräinen keikka-arvo': 'Average job value',
    'Mahdollinen sakko GDPR‑rikkomuksesta (arvio)': 'Possible fine for a GDPR violation (estimate)',
    'Keskimääräinen asiakkuuden arvo': 'Average customer value',
    'Menetys / viikko (jos 40 % olisi konvertoitunut)': 'Lost / week (if 40% had converted)',
    'Mitä sinulta tarvitaan etukäteen?': 'What do we need from you in advance?',
    'Häviö kuukaudessa (22 arkipäivää)': 'Loss per month (22 weekdays)',
    'Selora-ratkaisu': 'Selora solution',
    'Ei paljon. Ennen tutustumispuhelua on hyödyllistä miettiä muutama asia valmiiksi, mutta emme lähetä mitään lomaketta etukäteen täytettäväksi. Selvitämme kaiken yhdessä palaverissa.':
      'Not much. Before the discovery call it helps to think through a few things, but we don\'t send a form to fill out in advance. We sort everything out together on the call.',
    'Menetys / vuosi': 'Loss / year',
    'Seloran AI‑chat voi vastata peruskysymyksiin, tarkistaa vapaita aikoja ja tehdä varauksia 24/7. Tämä vähentää puuttuvia puheluita ja parantaa asiakastyytyväisyyttä.':
      'Selora\'s AI chat can answer basic questions, check open slots and make bookings 24/7. This reduces missed calls and improves customer satisfaction.',
    'Kiinteä kuukausimaksu, ei sivukuluja. Käyttöönotto alle 48 tunnissa.':
      'A flat monthly fee, no side costs. Live in under 48 hours.',
    'Käyttöönottoprosessi ja aikataulu': 'Onboarding process and timeline',
    'Arvioitu häviö vuodessa': 'Estimated annual loss',
    'Hyödyllisiä tietoja etukäteen': 'Useful information to gather in advance',
    'ROI – investoinnin takaisinmaksu': 'ROI — return on investment',
    'Selora otetaan käyttöön alle 48 tunnissa. Tämä tarkoittaa, että pienyrityksen ei tarvitse odottaa pitkää aikaa ennen kuin se voi hyödyntää tekoälyä ja samalla täyttää GDPR‑vaatimukset.':
      'Selora is up and running in under 48 hours. That means a small business doesn\'t have to wait long before it can leverage AI and stay GDPR-compliant at the same time.',
    'Seloran maksu': 'Selora\'s fee',
    'Tämä ei ole pelottelumarkkinointia. Nämä luvut tulevat keskusteluista oikeiden LVI-yrittäjien kanssa, jotka ovat jälkeenpäin katsoneet teleoperaattorin raporttia ja laskeneet missä puhelimen ääni oli kilpailijan korvassa, ei heidän.':
      'This isn\'t scare marketing. These numbers come from conversations with real HVAC entrepreneurs who later looked at their telco reports and calculated where the ringing ended up in a competitor\'s ear, not theirs.',
    'Yrityksesi palvelut ja hinnat pääpiirteissään': 'Your services and prices in broad strokes',
    'ROI: Tietoturva ja tehokkuus yhdessä': 'ROI: security and efficiency together',
    'Luvut vaikuttavat suurilta, mutta ne perustuvat konservatiivisiin arvioihin. Jos käytät matalampia lukuja, vaikkapa vain 3 uutta asiakascontactia päivässä ja 250 euron asiakkuusarvoa, vuosihäviö on silti yli 60 000 euroa.':
      'The numbers look large, but they\'re based on conservative assumptions. If you use lower numbers — say only 3 new customer contacts per day and a customer value of €250 — the annual loss is still over €60,000.',
    'ROI ensimmäisenä vuonna': 'ROI in the first year',
    'Aukioloajat ja sijainti': 'Opening hours and location',
    'Visuaalinen suunnittelu': 'Visual design',
    'Miksi perinteinen puhelinvastaaja ei riitä': 'Why a traditional voicemail isn\'t enough',
    'Missä tekoäly loistaa ja missä ihminen voittaa?': 'Where AI shines and where humans win',
    '5–10 yleisintä kysymystä, joita asiakkaat soittavat kysymään': 'The 5–10 most common questions customers call to ask',
    'Dynaaminen ohjauslogiikka': 'Dynamic routing logic',
    'Selkein ratkaisu olisi tietysti ostaa perinteinen puhelinvastaaja tai päivystyspalvelu. Ongelma on kaksiosainen.':
      'The most obvious solution would be to buy a traditional voicemail or on-call answering service. The problem is twofold.',
    'Tekoäly on ylivoimainen kaikessa toistuvassa ja ennustettavassa. Ajanvaraukset, aukioloaikatiedustelut, hintatiedustelut, ohjeet perille pääsemiseksi, peruutusten vastaanottaminen. Nämä muodostavat helposti 70–80 prosenttia kaikista sisääntulevista puheluista lähes kaikilla toimialoilla. Näissä tekoäly on nopeampi, virheettömämpi ja saatavilla silloinkin kun toimisto on kiinni.':
      'AI is unbeatable at anything repetitive and predictable. Bookings, opening-hours questions, price questions, directions, taking cancellations. These easily make up 70–80% of all incoming calls in almost any industry. Here AI is faster, more accurate and available even when the office is closed.',
    'Kokeile tekoälyä omassa kampaamossasi': 'Try AI in your own salon',
    'Miksi tähän ei kiinnitetä huomiota?': 'Why doesn\'t anyone pay attention to this?',
    'Ensinnäkin:': 'First:',
    'Ihminen on korvaamaton silloin, kun asiakas on hädissään, tilanne on monimutkainen tai asiayhteys vaatii soveltavaa harkintaa. Lääkäriaseman kiirevastaanotto, juridiset neuvottelut tai reklamaatioiden käsittely ovat esimerkkejä siitä, missä ihmisaivo on edelleen ylivoimainen.':
      'A human is irreplaceable when the customer is in distress, the situation is complex, or the context requires applied judgement. A medical urgent-care line, legal negotiations or handling of complaints are examples of where the human brain is still unbeatable.',
    'Varaa maksuton demo nyt ja näe tulokset heti – varaa puhelu tai aloita ilmaisella kokeilujaksolla.':
      'Book a free demo now and see the results immediately — book a call or start with a free trial.',
    'asiakkaat eivät jätä viestejä. Ne 62 % jotka eivät jätä viestiä eivät jätä viestiä tekoälyllekään, mutta niistä 38 % jotka jättävät viestin, kukaan ei kuule ääntä ennen aamua.':
      'customers don\'t leave messages. The 62% who don\'t leave a message won\'t leave one for AI either, but of the 38% who do leave a message, no one hears it before morning.',
    'Miten seurata ja dokumentoida GDPR‑toimenpiteet?': 'How to track and document GDPR measures?',
    'Syy on yksinkertainen: menetettyä asiakasta ei kirjata minnekään. Se henkilö, joka soitti maanantaina klo 12.15 eikä saanut vastausta, ei koskaan näy kassajärjestelmässä tai asiakasrekisterissä. Hän on näkymätön häviö.':
      'The reason is simple: a lost customer is never recorded anywhere. The person who called Monday at 12:15 and got no answer never shows up in the cash register or customer database. They\'re an invisible loss.',
    'Varaa maksuton demo →': 'Book a free demo →',
    'Varaa maksuton demo': 'Book a free demo',
    'Haluatko tekoälyn varaavan aikoja suoraan vai vain keräävän tiedot takaisinsoittoa varten?':
      'Do you want the AI to book appointments directly, or just collect details for a callback?',
    'Toiseksi:': 'Second:',
    'ihmispäivystys on kallista. Suomalaisen päivystyspalvelun kiinteä kuukausihinta pyörii 300-900 € välillä, ja he eivät tiedä yrityksesi hinnastoa, palvelualueesi rajoja tai että "lämpöpumppu vuotaa" on eri kiireellisyysluokka kuin "hanan pakkanen tippuu".':
      'a human on-call service is expensive. A Finnish on-call provider\'s flat monthly fee runs between €300 and €900, and they don\'t know your price list, your service area, or that "the heat pump is leaking" is a different urgency class than "the tap is dripping in the cold."',
    'Selora tuottaa kuukausittaiset audittilokit, joista käy selvästi ilmi kerätyt tiedot, säilytysaika ja mahdolliset poisto- tai anonymisointitoimet. Nämä lokit voi liittää osaksi yrityksen omaa tietosuojadokumentaatiota.':
      'Selora produces monthly audit logs that clearly show the data collected, the retention period and any deletion or anonymisation actions. These logs can be attached to the business\'s own data-protection documentation.',
    'Sen sijaan olemassa olevien asiakkaiden reklamaatiot, kassavirran ongelmat ja henkilöstökulut ovat konkreettisia ja mitattavia. Niihin reagoidaan. Menetettyjä mahdollisuuksia ei kukaan laske, ja siksi niiden kokonaissumma pääsee paisumaan vuodesta toiseen.':
      'On the other hand, existing-customer complaints, cash-flow issues and staffing costs are concrete and measurable. People react to them. No one tallies missed opportunities — which is why their total bloats year after year.',
    'Mitä tekoälyvastaanottaja tekee toisin': 'What an AI receptionist does differently',
    'Aukioloajat ovat jo historiaa asiakkaiden näkökulmasta': 'Opening hours are already history from the customer\'s point of view',
    'Muita GDPR 46 artiklan mukaisia suojatoimia': 'Other safeguards under GDPR Article 46',
    'Mahdollinen varausjärjestelmä (esim. Timma, Zingle, tai oma kalenteri)':
      'Existing booking system if any (e.g. Timma, Zingle, or your own calendar)',
    'Tekoälyvastaanottaja vastaa puhelimeen kolmannella soitolla. Myös kello 22, myös sunnuntaina, myös juhannuksena. Asiakkaalle soittokokemus ei ole "jätä viestiä", vaan oikea keskustelu, jossa agentti:':
      'The AI receptionist answers the phone on the third ring. Also at 10pm, also on Sunday, also during midsummer. For the customer the experience isn\'t "leave a message" but a real conversation in which the agent:',
    'Haluatko selvittää, miten Selora täyttää GDPR‑vaatimukset?': 'Want to learn how Selora meets GDPR requirements?',
    'Käytännön esimerkki: parturi-kampaamo Helsingissä': 'A practical example: a barbershop in Helsinki',
    'Live-demo': 'Live demo',
    'Suomessa kuluttajat ovat tottuneet verkkokaupoista ja palveluista, jotka toimivat kellon ympäri. He tutkivat vaihtoehtoja iltaisin, vertailevat hintoja sunnuntaisin ja tekevät ostopäätöksiä milloin parhaiten sopii. Kun he haluavat tiedustella paikallisen parturin tai fysioterapeutin palveluista illalla, he soittavat. Jos kukaan ei vastaa, he etsivät seuraavan vaihtoehdon verkosta.':
      'In Finland consumers are used to online shops and services that run around the clock. They research options in the evening, compare prices on Sunday and make purchase decisions whenever it suits them best. When they want to ask a local barber or physiotherapist about services in the evening, they call. If no one answers, they look up the next option online.',
    'Varaa maksuton demo tai puhelu ja katsotaan yhdessä, miten voit tehostaa asiakaspalvelua turvallisesti.':
      'Book a free demo or call and we\'ll look together at how you can enhance customer service safely.',
    'Jos puhuja mainitsee vuotoa, tulvaa, kaasua tai lämmityksen loppumista, agentti merkitsee puhelun kiireelliseksi ja hälyttää päivystäjän heti tekstiviestillä tai puhelulla.':
      'If the caller mentions a leak, flooding, gas or heating failure, the agent flags the call as urgent and alerts the on-call technician immediately by text or phone.',
    'Otetaan konkreettinen esimerkki. Helsinkiläinen parturi-kampaamo saa noin 40 puhelua päivässä. Hiustenleikkausajat, hintatiedustelut, peruutukset ja uudelleenvaraukset muodostavat noin 35 puhelua näistä. Loput 5 vaativat henkilökohtaisempaa palvelua, kuten värikorjauksen neuvottelua tai asiakkaan erikoispyyntöjä.':
      'Let\'s take a concrete example. A Helsinki barbershop gets about 40 calls a day. Haircut bookings, price questions, cancellations and rebookings make up about 35 of those. The remaining 5 need more personal service — for example colour-correction discussions or special customer requests.',
    'Tekstisuunnittelu': 'Copywriting',
    'Tunnistaa hätätilanteen.': 'Recognises an emergency.',
    'Tämä ei tarkoita, että yrittäjien pitäisi olla tavoitettavissa vuorokauden ympäri henkilökohtaisesti. Se tarkoittaa, että':
      'This doesn\'t mean entrepreneurs need to be personally reachable around the clock. It means that',
    'jonkun tai jonkin pitää vastata': 'someone or something has to answer',
    'silloin kun asiakas haluaa ottaa yhteyttä.': 'whenever the customer wants to get in touch.',
    'Kerää oikeat tiedot.': 'Collects the right details.',
    'Mitä tapahtuu ensimmäisen viikon aikana?': 'What happens during the first week?',
    'Osoite, mitä on tapahtunut, milloin alkoi, onko vesi suljettu, voiko päästä sisään. Ne tiedot jotka sinä kysyisit itse, ja joiden ilman asentaja ei voi lähteä.':
      'Address, what happened, when it started, whether the water is shut off, whether someone can get inside. The details you\'d ask yourself, and without which a technician can\'t leave.',
    'Antaa luotettavan vastausajan.': 'Gives a reliable response time.',
    'Ilman tekoälyä nämä 35 rutiinipuhelua vievät hiustyöntekijöiden ja omistajan aikaa koko päivän ajan. Jotkut menevät vastaajaan. Jotkut soittavat kilpailijalle. Tekoälyvastaanottajan kanssa kaikki 35 rutiinikysymystä hoidetaan automaattisesti, ja omistaja näkee yhteenvedon kaikista puheluista illalla. Henkilöstö voi keskittyä siihen mitä he oikeasti osaavat: hiusten leikkaamiseen.':
      'Without AI, those 35 routine calls eat the stylists\' and the owner\'s time all day. Some go to voicemail. Some call a competitor. With an AI receptionist, all 35 routine questions are handled automatically and the owner sees a summary of every call in the evening. Staff can focus on what they\'re actually good at: cutting hair.',
    'Mikä on ratkaisu?': 'What\'s the solution?',
    '07. Tietoturva': '07. Security',
    'Ei-hätäpuhelut, kuten tarjouspyyntö saunaremontista, tulevat sähköpostiin aamulla koottuna listana. Nukut rauhassa, tarjouksia ei silti häviä.':
      'Non-emergency calls — like a quote request for a sauna renovation — arrive in your inbox in the morning as a single list. You sleep in peace, but the quote requests don\'t get lost.',
    'Ensimmäinen viikko on havainnoinnin aikaa. Tekoäly hoitaa puhelut ja sinä saat jokaisen puhelun jälkeen tiivistelmän: mitä asiakas halusi, miten agentti vastasi ja onko jokin kohta, johon pitäisi tehdä muutos. Monet asiakkaat löytävät tässä vaiheessa pari kohtaa, joita haluavat hienosäätää.':
      'The first week is observation time. The AI handles the calls and after each call you get a summary: what the customer wanted, how the agent responded and any point that should be tweaked. Many clients find a couple of items they want to fine-tune at this stage.',
    'Jakaa kiireellisyyden.': 'Sorts by urgency.',
    'Tekoälyvastaanottaja vastaa puheluihin silloin kun ihminen ei voi. Se vastaa kysymyksiin, varaa aikoja kalenteriin ja kerää yhteystiedot takaisinsoittoa varten. Kaikista puheluista jää kirjallinen yhteenveto, joten mikään ei katoa.':
      'An AI receptionist answers calls when a human can\'t. It answers questions, books appointments to the calendar and collects contact details for a callback. Every call leaves a written summary, so nothing is lost.',
    'Esimerkiksi eräs tamperelainen parturi huomasi ensimmäisen viikon jälkeen, että tekoäly ei osannut vastata kysymykseen lasten hiusten leikkauksen hinnasta. Muutos tehtiin samana päivänä sähköpostilla. Se siinä.':
      'For example, a Tampere barber noticed after the first week that the AI didn\'t know the price for children\'s haircuts. The change was made the same day by email. That\'s it.',
    'Käytännön esimerkki illasta': 'A practical example of an evening',
    'Monissa yrityksissä paras ratkaisu on yhdistelmä. Tekoäly hoitaa kaikki puhelut ilta-aikoina, viikonloppuisin ja silloin kun henkilöstö on varattuna. Virka-aikana tekoäly voi silti ottaa vastaan yksinkertaisia varauksia ja tiedusteluja, jotta työntekijät pysyvät häiritsemättöminä tärkeissä asiakaskohtaamisissa.':
      'In many businesses the best solution is a combination. AI handles all calls in the evenings, weekends and whenever staff are busy. During office hours the AI can still take simple bookings and inquiries so employees stay uninterrupted during important customer interactions.',
    'ROI-laskelma: Selora Aloitus vs. menetetyt puhelut': 'ROI calculation: Selora Starter vs. missed calls',
    'Maanantai kello 21:12. Asiakkaalta puhkeaa pesukoneen liitin. Hän soittaa ensimmäiseen löytämäänsä LVI-yritykseen, joka on sinun. Kolmen soiton jälkeen vastaa ääni: "Selora LVI-päivystys, miten voin auttaa?" Hän kertoo tilanteen, agentti kysyy osoitteen ja sen, onko pääsulku kiinni. Samassa hetkessä sinun päivystysvuorossa oleva asentajasi saa tekstiviestin: "Kiireellinen: vuoto Hämeenkatu 12, asiakas paikalla, pääsulku suljettu. Soita 10 min sisällä." Asentaja soittaa, sopii ajan, ja yöllinen keikka on varma.':
      'Monday at 21:12. A customer\'s washing-machine fitting bursts. They call the first HVAC company they find — yours. After three rings a voice answers: "Selora HVAC on-call, how can I help?" They explain the situation, the agent asks for the address and whether the main valve is closed. At the same moment your on-call technician gets a text: "Urgent: leak at Hämeenkatu 12, customer present, main valve closed. Call within 10 min." The technician calls, agrees a time, and the night job is locked in.',
    'Tallennetun datan salaus AES-256-standardilla': 'Stored data encrypted with the AES-256 standard',
    'Tämä malli on erityisen tehokas yrityksille, joilla on jo yksi tai kaksi henkilöä töissä, mutta joilla on kapasiteettiongelma ruuhkahuippujen aikana tai puheluvirran jälkeen aukioloaikojen ulkopuolella.':
      'This model works especially well for businesses that already have one or two people on staff but face a capacity problem at peak times or after-hours.',
    'Ulkoasu & kehitys': 'Layout & development',
    'Seloran kuukausimaksu (Aloitus)': 'Selora\'s monthly fee (Starter)',
    'Johtopäätös: kumpi valita?': 'Conclusion: which one to choose?',
    'Tuo puhelu olisi aiemmin mennyt vastaajaan, ja asiakas olisi soittanut Espoon suurimmalle kilpailijallesi seuraavat 90 sekuntia myöhemmin.':
      'That call would previously have gone to voicemail, and the customer would have called your biggest competitor in Espoo 90 seconds later.',
    'Mobiilioptimointi': 'Mobile optimisation',
    'Jos yrityksesi on vasta käynnistymässä ja budjetti on tiukka, tekoälyvastaanottaja on selvä valinta. Saat ammattimaisen puhelinasiakaspalvelun murto-osalla ihmisvastaanottajan kustannuksista. Jos yrityksesi kasvaa ja asiakasmäärät nousevat, harkitse yhdistelmämallia: tekoäly hoitaa volyymin, henkilöstö hoitaa laadun.':
      'If your business is just starting out and the budget is tight, an AI receptionist is the obvious choice. You get professional phone customer service at a fraction of the cost of a human receptionist. If your business grows and customer volumes rise, consider the combined model: AI handles the volume, staff handle the quality.',
    'Mille yrityksille tämä sopii parhaiten?': 'Which businesses does this fit best?',
    'Mitä tämä maksaa verrattuna menetettyyn': 'What does this cost versus what is lost',
    'Tietoturvaloukkauksiin reagoimisen toimintasuunnitelma': 'Action plan for responding to data breaches',
    'Automaatio': 'Automation',
    'Seloran vuosimaksu': 'Selora annual fee',
    'Ihmistä puolestaan kannattaa harkita ehdottomasti, jos yrityksesi käsittelee pääasiassa monimutkaisia tai tunnepitoisia asiakastilanteita, joissa empatia ja soveltaminen ovat kriittisiä. Esimerkiksi kriisiapu, hautaustoimistot tai terapiapalvelut hyötyvät ihmisvastaanottajasta selkeästi.':
      'A human, on the other hand, is well worth considering if your business mainly handles complex or emotional customer situations where empathy and judgement are critical. Crisis services, funeral homes or therapy practices, for example, clearly benefit from a human receptionist.',
    'Tekoälyvastaanottaja sopii parhaiten yrityksille, joille puhelin on tärkeä asiakaskanava mutta joilla ei ole resursseja tai tarvetta palkata kokoaikaista vastaanottovirkailijaa. Käytännössä tämä tarkoittaa suurinta osaa suomalaisista pk-yrityksistä.':
      'An AI receptionist fits best for businesses where the phone is an important customer channel but who don\'t have the resources or need to hire a full-time receptionist. In practice that means most Finnish SMBs.',
    'ROI: yksi säilytetty hätäkeikka / kk riittää': 'ROI: one saved emergency job per month is enough',
    'Responsiivinen mobiilisuunnittelu': 'Responsive mobile design',
    'Erityisesti Selora sopii hyvin parturikampaamoihin ja kauneushoitoloihin, joissa ajanvaraukset vievät paljon puhelinaikaa. Ravintoloille, jotka haluavat ottaa pöytävarauksia myös aukioloaikojen ulkopuolella. Kiinteistövälittäjille, jotka saavat kyselyitä epäsäännöllisesti läpi päivän. Lääkäriasemille ja terapeuteille, jotka haluavat pitää puhelinajan hallinnassa ilman, että vastaanotto ruuhkautuu. Autokorjaamoille, joissa mekaanikon on vaikea vastata puhelimeen kesken työn.':
      'Selora is a particularly good fit for barbershops and beauty salons where bookings take up a lot of phone time. For restaurants that want to take reservations outside opening hours. For real-estate agents who get inquiries irregularly throughout the day. For medical clinics and therapists who want to keep phone time under control without overloading reception. For auto repair shops where it\'s hard for a mechanic to answer the phone mid-job.',
    'Useimmille suomalaisille pk-yrityksille, kuten kampamoille, ravintoloille, kiinteistövälittäjille ja autokorjaamoille, tekoälyvastaanottaja on se tehokkain ensimmäinen askel kohti parempaa asiakaspalvelua ilman massiivisia palkkakuluja.':
      'For most Finnish SMBs — barbershops, restaurants, real-estate agents and auto repair shops — an AI receptionist is the most effective first step toward better customer service without massive salary costs.',
    'Arv. palautetut puhelut (78% Selora-tehokkuus)': 'Est. recovered calls (78% Selora effectiveness)',
    'Seloran kuukausihinta (Aloitus)': 'Selora\'s monthly price (Starter)',
    '+2–4 uutta asiakasta/vko': '+2–4 new customers/week',
    'Haluatko nähdä miten se toimisi': 'Want to see how it would work',
    'Näin nopeasti tekoälyvastaanottaja on toiminnassa': 'This is how fast the AI receptionist is up and running',
    'Yksi keskikokoinen hätäkeikka': 'One mid-sized emergency job',
    'ensimmäisestä yhteydenotosta. Ei kuukausia, ei monimutkaisia projekteja. Vain yksi puhelu ja 48 tuntia.':
      'from your first contact. No months, no complex projects. Just one call and 48 hours.',
    'juuri sinun': 'in your own',
    'yrityksessäsi?': 'business?',
    'Arv. lisätulo vuodessa (2 asiakasta/vko × 300 €)': 'Est. extra annual revenue (2 customers/week × €300)',
    'Varaa maksuton 20 minuutin demo. Käydään läpi yrityksesi tilanne ja lasketaan yhdessä, paljonko tekoälyvastaanottaja voisi säästää.':
      'Book a free 20-minute demo. We\'ll walk through your business situation and calculate together how much an AI receptionist could save.',
    'Entä jos tekoäly ei osaa vastata johonkin kysymykseen?': 'What if the AI doesn\'t know how to answer a question?',
    'Yksi suurempi putkisto- tai lämmityskeikka': 'One larger plumbing or heating job',
    'Tämä on yksi yleisimmistä kysymyksistä. Tekoäly on ohjelmoitu käsittelemään tilanteet, joihin se ei osaa vastata, selkeällä tavalla: se kertoo asiakkaalle, ettei sillä ole tietoa kyseisestä asiasta juuri nyt, ja tarjoaa vaihtoehtona takaisinsoittoa tai viestinvälitystä. Kukaan ei jää tyhjän päälle.':
      'This is one of the most common questions. The AI is built to handle situations it can\'t answer in a clear way: it tells the customer it doesn\'t have information on that specific topic right now and offers a callback or message relay as an alternative. No one is left hanging.',
    'toimialallesi.': 'for your industry.',
    'ROI, jos pelastaa 4 hätäkeikkaa/kk': 'ROI if you save 4 emergency jobs/mo',
    'Lisäksi jokainen tällainen tilanne kirjataan ylös ja sinulle lähetetään tieto siitä. Näin voidaan lisätä puuttuva tieto agenttiin nopeasti, eikä sama tilanne toistu.':
      'On top of that, every such situation is logged and you\'re notified. The missing information can be added to the agent quickly so the same situation doesn\'t repeat.',
    'Mitä sopimuksessa lukee?': 'What does the contract say?',
    'Luvut ovat arvioita, ja jokaisen yrityksen tilanne on erilainen. Siksi tarjoamme maksuttoman demon, jossa käymme yhdessä läpi sinun yrityksesi luvut. Moni asiakas on ollut yllättynyt siitä, miten pienestä investoinnista on kyse suhteessa siihen, mitä jää tällä hetkellä pöydälle.':
      'The numbers are estimates, and every business is different. That\'s why we offer a free demo where we walk through your business\'s numbers together. Many clients have been surprised at how small the investment really is compared with what currently gets left on the table.',
    'Käytännössä tekoälyvastaanottaja maksaa itsensä takaisin ensimmäisestä illasta jolloin se ottaa vastaan yhden puhelun, johon kukaan ei muuten olisi vastannut.':
      'In practice an AI receptionist pays for itself from the first evening it takes a single call no one else would have answered.',
    'Seloran sopimus on kuukausittainen. Ei vuosisopimuksia, ei pitkiä sitoutumisjaksoja. Jos kokeilu ei tunnu toimivan omaan yritykseen, voi lopettaa kuukauden varoitusajalla. Käyttöönottomaksua ei peritä.':
      'Selora\'s contract is month-to-month. No annual contracts, no long lock-ins. If the trial doesn\'t feel right for your business, you can cancel with one month\'s notice. No onboarding fee is charged.',
    'Tekniikka & optimointi': 'Tech & optimisation',
    'Ensimmäinen askel: laske omat lukusi': 'First step: calculate your own numbers',
    'SMS-seurantaviestit': 'SMS follow-up messages',
    'Tämä tarkoittaa käytännössä, että riskiä ei juurikaan ole. Pahin mahdollinen skenaario on, että kokeilet kuukauden, toteat ettei se sovi juuri sinulle ja lopetat. Paras skenaario on, että se vapauttaa merkittävän osan ajastasi ja alkaa tuoda lisää asiakkaita juuri siitä kanavasta, joka ennen toi pelkkiä vastaajakuormia.':
      'In practice that means there\'s essentially no risk. Worst case: you try it for a month, decide it isn\'t for you, and cancel. Best case: it frees up a meaningful chunk of your time and starts bringing in more customers from the very channel that used to deliver only voicemails.',
    'Mitä käyttöönotto LVI-yrityksessä oikeasti vaatii': 'What deployment in an HVAC company really takes',
    'Katso viimeisen kuukauden puhelulokit. Kuinka monta puhelua meni vastaajaksi tai jäi kokonaan vastaamatta? Kerro se neljällä saadaksesi vuosiarvion. Kerro se sitten arviollasi yhden uuden asiakkaan arvosta. Saatat yllättyä.':
      'Look at the last month\'s call logs. How many calls went to voicemail or weren\'t answered at all? Multiply by twelve for an annual estimate. Then multiply by your estimate of the value of one new customer. You may be surprised.',
    'Vuosittain': 'Annually',
    '45 minuuttia': '45 minutes',
    'Tämä on se kohta jossa moni pudottaa luurin: "meillä ei ole aikaa ottaa uutta järjestelmää käyttöön". Reilu vastaus: käyttöönotto vie noin':
      'This is the point where many hang up: "we don\'t have time to set up a new system." Honest answer: onboarding takes about',
    'yrittäjältä itseltään.': 'from the entrepreneur themself.',
    'Jos et pysty saamaan näitä lukuja puhelimesta, se kertoo jo jotain oleellista: et tällä hetkellä edes tiedä, kuinka paljon menetät. Tekoälyvastaanottaja ratkaisee molemmat ongelmat kerralla. Se sekä vastaa puheluihin että kirjaa jokaisen kontaktin järjestelmään.':
      'If you can\'t pull these numbers from your phone, that already tells you something important: you currently don\'t even know how much you\'re losing. An AI receptionist solves both problems at once. It answers calls and logs every contact in the system.',
    'Käytännössä tarvitaan kolme asiaa:': 'In practice you need three things:',
    'Se vie 20 minuuttia.': 'It takes 20 minutes.',
    'selora.fi/autokorjaamo': 'selora.fi/autoshop',
    'Varaa maksuton tutustumispuhelu. Käymme läpi yrityksesi tilanteen ja rakennetaan suunnitelma yhdessä. Ilman sitoumuksia.':
      'Book a free discovery call. We walk through your business situation and build a plan together. No commitments.',
    'Hinnasto ja palvelualue kirjattuna (mitä teette, missä, mihin hintaan karkeasti)':
      'Price list and service area written down (what you do, where, roughly at what price)',
    'Paljonko sinun yrityksesi': 'How much your business',
    'menettää': 'is losing',
    'Core Web Vitals -optimointi': 'Core Web Vitals optimisation',
    'Lasketaan se yhdessä. Varaa maksuton 20 minuutin demo ja käymme läpi sinun lukusi. Ilman sitoumuksia.':
      'Let\'s calculate it together. Book a free 20-minute demo and we\'ll walk through your numbers. No commitments.',
    'Päivystysvuorossa olevan numero, johon kiireelliset puhelut ohjataan':
      'The on-call technician\'s number to which urgent calls are routed',
    'Sähköposti, johon ei-kiireelliset kootaan aamulla': 'The email where non-urgent items are gathered in the morning',
    'Sen jälkeen agentti koulutetaan teidän toiminnan mukaiseksi, numero ohjataan päälle illaksi ja viikonlopuksi, ja homma on käynnissä saman viikon aikana. Ei uutta järjestelmää, ei sovellusta johon kirjautua, ei koulutuksia työntekijöille.':
      'After that the agent is trained on how you operate, the number is routed for evenings and weekends, and the whole thing is running the same week. No new system, no app to sign in to, no employee training.',
    'Milloin kannattaa harkita tätä': 'When this is worth considering',
    'Tekoälyvastaanottaja ei ole jokaiselle LVI-yritykselle välttämätön. Se kannattaa kun vähintään yksi seuraavista pätee:':
      'An AI receptionist isn\'t essential for every HVAC company. It\'s worth it when at least one of the following applies:',
    'Teet 60 %:n täyttöasteella tai yli ja puhelin on arkena jo kiireessä':
      'You\'re running at 60% capacity or higher and the phone is already busy on weekdays',
    'Sinulla ei ole vakituista päivystyshenkilöä, mutta saat silti iltapuheluita':
      'You don\'t have a dedicated on-call person but still get evening calls',
    'Huomaat kilpailijoiden saavan keikkoja jotka tulisivat luonnollisesti sinulle':
      'You notice competitors picking up jobs that should naturally come to you',
    'Haluat rajata päivystyksen oikeisiin hätätilanteisiin, etkä vastaanottaa aamuisin 40 vastaajaviestiä':
      'You want to limit on-call to actual emergencies, not wake up to 40 voicemails',
    'Google Analytics 4': 'Google Analytics 4',
    'Konversiotapahtumien seuranta': 'Conversion event tracking',
    'Google Search Console -yhteys': 'Google Search Console connection',
    'Google Analytics -integraatio': 'Google Analytics integration',
    'Jos yritys on yhden miehen pyörittämä ja 95 % puheluista menee jo läpi, tätä ei ehkä tarvita. Jos taas olette 3-15 hengen LVI-yritys jossa puhelin on sekä eduksi että riesaksi, tässä on luultavasti selkein yksittäinen kulukohta jonka voi vaihtaa tuloskohteeksi tänä vuonna.':
      'If your company is run by one person and 95% of calls already get through, this may not be needed. But if you\'re a 3–15 person HVAC company where the phone is both an asset and a burden, this is probably the single clearest cost line you can flip into a profit line this year.',
    '09. Valvontaviranomainen': '09. Supervisory authority',
    'Katso mitä Selora vastaisi sinun yrityksesi puhelimeen': 'See how Selora would answer your business\'s phone',
    '30 minuutin demossa näet oikean puhelun alusta loppuun, LVI-yrityksen skenaariolla. Ei PowerPointia, ei sitoumuksia.':
      'In a 30-minute demo you\'ll see a real call from start to finish using an HVAC scenario. No PowerPoint, no commitments.',
    'Lomakkeet & integraatiot': 'Forms & integrations',
    'Asiakkaiden esikvalifiointi': 'Pre-qualifying customers',
    'Uusien asiakkaiden esikvalifiointi': 'Pre-qualifying new customers',
    'Konsultaatioaikojen varaus': 'Booking consultation appointments',
    'Tapaamisaikojen varaus asiakkaille': 'Booking meeting times for customers',
    'Tapaamisten sopiminen neuvonantajille': 'Scheduling meetings for advisors',
    'Aikataulujen hallinta useille tiimeille': 'Schedule management for multiple teams',
    'Alihankkijakoordinoinnin tuki': 'Subcontractor coordination support',
    'Testiajojen aikataulutus': 'Test-drive scheduling',
    'Kiireellisten tapausten ohjaus oikealle hoitajalle': 'Routing urgent cases to the right caregiver',
    'Ostajien automaattinen kvalifiointi': 'Automatic buyer qualification',
    'Palaavien asiakkaiden tunnistus': 'Returning-customer recognition',
    'Tapaamisaikojen varaus asiakkaille': 'Booking meeting times for customers',
    'Persoonalinen tervehdys jokaiselle soittajalle': 'Personal greeting for every caller',
    'Verkkosivumallit': 'Website templates',

    // -------- agency-website (the EN-language template page) — keep as-is --------
    // (No FI translations — page is already English; the i18n.js attempts EN
    // would just leave it as English. We add identity entries to suppress audit noise.)

    // -------- onboarding flow extras --------
    '+ Lisää henkilö': '+ Add person',
    '+ Lisää kysymys': '+ Add question',
    '+ Lisää palvelu': '+ Add service',
    'Lisää henkilökunnan jäsenet ja heidän erikoisosaamisensa — voit ohittaa tämän vaiheen.':
      'Add staff members and their specialities — you can skip this step.',
    'Lisää palvelusi taulukkoon — agentti osaa kertoa hinnat ja kestot automaattisesti.':
      'Add your services to the table — the agent will quote prices and durations automatically.',
    'Lisää yleisimmät kysymykset ja vastaukset — agentti käyttää näitä suoraan.':
      'Add the most common questions and answers — the agent will use them directly.',

    // -------- final pass — leftover misses from QA round 4 --------
    'Myynti & liidit': 'Sales & leads',
    'Data & integraatiot': 'Data & integrations',
    'Integraatiot': 'Integrations',
    'Verkkosivusto': 'Website',
    'Automaattinen kielentunnistus': 'Automatic language detection',
    'ilmaiseksi': 'free',
    'vastauksia': 'answers',
    'Nopea latausaika (Core Web Vitals)': 'Fast load time (Core Web Vitals)',
    'Oikea kasvu.': 'Real growth.',
    'Oikeat yritykset.': 'Real businesses.',
    'Ravintola / kahvila': 'Restaurant / Café',
    'demo': 'demo',
    'Pitääkö valita toinen vai voiko käyttää molempia?':
      'Do you have to pick one, or can you use both?',
    'Rehellinen vertailu': 'An honest comparison',
    'Tekoäly vai ihmisvastaanottaja?': 'AI or human receptionist?',
    'suomalaiselle yrittäjälle': 'for the Finnish entrepreneur',
    'Opit, miten tekoälyratkaisut kuten Selora voivat tuoda uusia kävijöitä ja pitää vanhat asiakkaat tyytyväisinä.':
      'Learn how AI solutions like Selora can bring in new visitors and keep existing customers happy.',
    'LVI-yritys ja hätäpuhelut: mitä tapahtuu, kun asiakas soittaa kello 22 ja putki vuotaa':
      'HVAC companies and emergency calls: what happens when a customer calls at 10pm with a burst pipe',

    // -------- integration brand names (identity for EN audit) --------
    'Slack': 'Slack',
    'HubSpot': 'HubSpot',
    'Salesforce': 'Salesforce',
    'Pipedrive': 'Pipedrive',
    'Zapier': 'Zapier',
    'Make.com': 'Make.com',
    'n8n': 'n8n',
    'Notion': 'Notion',
    'Google Sheets': 'Google Sheets',
    'MS Teams': 'MS Teams',
    'Outlook 365': 'Outlook 365',
    'Google Calendar': 'Google Calendar',
    'Zendesk': 'Zendesk',
    'Freshdesk': 'Freshdesk',
    'Zoho CRM': 'Zoho CRM',
    'Procountor': 'Procountor',
    'Netvisor': 'Netvisor',
    'Visma': 'Visma',

    // -------- JS-driven UI strings (toasts, dialogs, demo conversations) --------
    'Agentti päivitetty ✓': 'Agent updated ✓',
    'Asiakas lisätty ✓': 'Customer added ✓',
    'Asiakas poistettu ✓': 'Customer deleted ✓',
    'Asiakas:': 'Customer:',
    'Suunnitelma päivitetty ✓': 'Plan updated ✓',
    'Käyttöoikeus myönnetty ✓': 'Access granted ✓',
    'Käsitellään…': 'Processing…',
    'Linkitetään…': 'Linking…',
    'Lähetetään…': 'Sending…',
    'Lähetys epäonnistui:': 'Send failed:',
    'Verkkovirhe — tarkista yhteys ja yritä uudelleen.':
      'Network error — check your connection and try again.',
    'Yritä uudelleen': 'Try again',
    'Tallennus epäonnistui:': 'Save failed:',
    'Virhe:': 'Error:',
    'Anna yrityksen nimi.': 'Please enter your company name.',
    'Maksu vastaanotettu! Tilisi päivitetään hetken kuluttua…':
      'Payment received! Your account will be updated shortly…',
    'Cal.com API-virhe:': 'Cal.com API error:',
    'Cal.com-virhe:': 'Cal.com error:',
    'Google Calendar API-virhe': 'Google Calendar API error',
    'Google-virhe:': 'Google error:',
    'Ladataan...': 'Loading…',
    '⏳ Tämä voi kestää 15–30 sekuntia…': '⏳ This may take 15–30 seconds…',
    '📅 Uusi varaus lisätty kalenteriin': '📅 New booking added to calendar',
    '📞 Uusi puhelu vastaanotettu': '📞 New call received',

    // -------- demo conversation script (index.html) --------
    'Hei! Kyllä, olemme auki lauantaisin klo 9–15. Haluaisitko varata ajan?':
      'Hi! Yes, we\'re open Saturdays 9–15. Would you like to book an appointment?',
    'Hei! Perusvärjäys on meillä 65 € ja raidat alkaen 85 € — sisältää pesun ja föönauksen. Varaanko samalla ajan?':
      'Hi! Our basic colour is €65 and highlights start at €85 — includes wash and blow-dry. Shall I book a time at the same time?',
    'Hei, mitä värjäys maksaa teillä?': 'Hi, how much does colour cost at your salon?',
    'Hei, täällä Kampaamo Katariina! Tietysti. Meillä on vapaa aika tiistaina 15.4. klo 14:00 — sopiiko se?':
      'Hi, this is Hair Salon Katariina! Of course. We have an open slot on Tuesday 15 April at 14:00 — does that work?',
    'Kyllä, ensi viikolla jos on tilaa.': 'Yes, next week if there\'s an opening.',
    'Loistava, kiitos!': 'Wonderful, thank you!',
    'Sopii, olen Liisa Mäkinen.': 'Sounds good, I\'m Liisa Mäkinen.',
    'Torstai 17.4. klo 11:00 sopii väri + föönaus. Kuulostaako hyvältä?':
      'Thursday 17 April at 11:00 works for colour + blow-dry. Sound good?',
    'Puhelu päättyi — kiitos! Varaa aika alta.': 'Call ended — thanks! Book your appointment below.',
    'SDK ei latautunut — päivitä sivu ja yritä uudelleen.':
      'SDK failed to load — refresh the page and try again.',
    '✓ Aika varattuna Matille, ti 15.4. klo 14:00. Vahvistus lähtee tekstiviestillä!':
      '✓ Appointment booked for Matti, Tue 15 April at 14:00. Confirmation will be sent by text!',
    '✓ Värjäys varattuna to 17.4. klo 11:00. Nähdään pian!':
      '✓ Colour booked for Thu 17 April at 11:00. See you soon!',
    'Palvelu maksaa itsensä takaisin jo päivänä':
      'The service pays for itself by day',

    // -------- admin dialogs --------
    'Lähetetäänkö uutiskirje kaikille aktiivisille tilaajille?\n\n':
      'Send the newsletter to all active subscribers?\n\n',

    // -------- blog: ravintolan-puhelin-lounaskiire-tekoaly --------
    'Ravintolan puhelin ja lounaskiire: miksi pöytävaraukset menevät metsään juuri kun salin pitäisi tuottaa - Selora Blogi':
      'A restaurant\'s phone during the lunch rush: why table bookings slip away exactly when the dining room should be earning - Selora Blog',
    'Ravintolan puhelin ja lounaskiire: miksi pöytävaraukset menevät metsään juuri kun salin pitäisi tuottaa':
      'A restaurant\'s phone during the lunch rush: why table bookings slip away exactly when the dining room should be earning',
    'Ravintolan puhelin ja lounaskiire: miksi pöytävaraukset menevät metsään':
      'A restaurant\'s phone and the lunch rush: why table bookings slip away',
    'Ravintolan puhelin soi pahimpana mahdollisena hetkenä. Näin tekoälyvastaanottaja ottaa pöytävaraukset, vahvistaa varaukset ja vähentää no-showta ilman lisäkäsipareja salissa.':
      'A restaurant\'s phone always rings at the worst possible moment. Here\'s how an AI receptionist takes table bookings, confirms reservations and reduces no-shows without extra hands on the floor.',
    'Vastaamattomat puhelut ja no-showt syövät salin tuloksen. Näin tekoäly hoitaa varaukset.':
      'Missed calls and no-shows eat into the dining room\'s bottom line. Here\'s how AI handles bookings.',
    'Ravintolan puhelin ja lounaskiire': 'A restaurant\'s phone and the lunch rush',
    'Ravintolasali täynnä asiakkaita illan ruuhkassa':
      'A restaurant dining room full of customers during the evening rush',
    'Ravintolan puhelin soi lounaskiireessä, perjantain rynnäkössä ja juuri silloin kun keittiöstä tulee viimeinen tilaus. Katsotaan miksi pöytävaraukset karkaavat puolimatkassa, mitä se maksaa kuukaudessa ja miten tekoälyvastaanottaja täyttää salin ilman että kukaan jättää pannuja paistumaan.':
      'A restaurant\'s phone rings during the lunch rush, the Friday surge and exactly when the kitchen is firing the last order. Let\'s look at why table bookings slip away halfway through, what that costs per month, and how an AI receptionist fills the dining room without anyone leaving pans burning on the stove.',
    'Ravintola-alalla puhelin soi pahimpana mahdollisena hetkenä':
      'In the restaurant business the phone rings at the worst possible moment',
    'Lounaskiire alkaa yhdeltätoista. Sali täyttyy puolessatoista. Keittiössä juoksee kuusi tilausta yhtä aikaa, sali pyytää lisää leipää ja kassan jonossa odottaa kolme asiakasta. Juuri tällä sekunnilla puhelin alkaa soida.':
      'The lunch rush starts at eleven. The dining room fills up by half past one. The kitchen is running six orders at once, the floor is asking for more bread and three customers are waiting at the till. At exactly that second the phone starts ringing.',
    'Ravintolan puhelinpiikit eivät tule satunnaisina hetkinä. Ne tulevat tasan silloin kun kukaan ei voi ottaa puhelinta. Lounaalla varataan iltaa, illallisaikaan varataan viikonloppua ja perjantaina iltapäivällä varataan synttäriä. Joka ikinen kerta soi pahimpana mahdollisena hetkenä, koska se hetki on se hetki jolloin asiakas itsekin miettii ravintolaa.':
      'A restaurant\'s phone spikes don\'t come at random moments. They come exactly when nobody can pick up the phone. At lunch people book the evening, at dinner time they book the weekend, and on Friday afternoons they book a birthday. Every single time it rings at the worst possible moment, because that moment is the same moment the customer is thinking about restaurants.',
    'Vastaamatta jäänyt soitto on vastaamatta jäänyt pöytä':
      'A missed call is a missed table',
    'Olen jutellut tämän kevään aikana ravintoloitsijoiden kanssa Helsingissä, Tampereella ja Turussa. Kaikki sanovat saman asian:':
      'Over this spring I\'ve spoken with restaurant owners in Helsinki, Tampere and Turku. They all say the same thing:',
    'he tietävät että puhelin jää soimaan, mutta eivät tiedä paljonko se maksaa':
      'they know the phone keeps ringing unanswered, but they don\'t know what it costs',
    'Kun yksi yhteinen kysymys on "kuinka monta varausta soittaja olisi tehnyt jos olisitte vastanneet", vastaukset ovat järkyttäviä. Puhelin soi keskimäärin 40-90 kertaa päivässä keskikokoisessa lounas- ja illallisravintolassa. Niistä noin 30 % menee vastaamatta. Niistä vastaamatta jääneistä noin puolet on pöytävarauspuheluita.':
      'When one common question is "how many bookings would the caller have made if you had answered", the answers are shocking. The phone rings on average 40-90 times a day in a mid-sized lunch and dinner restaurant. About 30% of those go unanswered. About half of the unanswered ones are table-booking calls.',
    'ravintolan puhelinasiakkaista': 'of a restaurant\'s phone customers',
    'varaa toiseen ravintolaan': 'book a different restaurant',
    ', jos heille ei vastata kahden minuutin sisällä. He eivät jätä viestiä, koska illan ravintola on löydettävä nyt.':
      ', if no one picks up within two minutes. They don\'t leave a message, because tonight\'s restaurant has to be found now.',
    'Pöytävarauslomake verkossa ei ratkaise tätä':
      'An online booking form doesn\'t solve this',
    'Moni ravintola on lisännyt verkkosivulleen varauslomakkeen tai TableOnline- ja ResDiary-tyyppisen kalenterin. Hyvä juttu, ne tuovat osan varauksista ilman puhelua. Mutta puhelinvarausten määrä ei tipahda nollaan, vaikka miten paljon mainostaisi nettivaraussivua.':
      'Many restaurants have added a booking form or a TableOnline or ResDiary-style calendar to their website. Good move, those bring in a share of bookings without a phone call. But the number of phone bookings doesn\'t drop to zero no matter how heavily you promote the online booking page.',
    'Syyt ovat inhimillisiä. Iso osa Suomen aikuisväestöstä, etenkin yli 45-vuotiaat, varaa edelleen mieluummin puhelimitse. Ryhmävaraukset, allergiat, esteettömyyspyynnöt, syntymäpäivät ja tasapuoliset alennukset hoidetaan kysymällä, ei pudotusvalikolla. Ja kun joku haluaa tarkentaa "onko teillä se ikkunapaikka vapaana", hän soittaa.':
      'The reasons are human. A large share of Finland\'s adult population, especially the over-45s, still prefers to book by phone. Group bookings, allergies, accessibility requests, birthdays and matching everyone\'s discount are handled by asking, not by a dropdown. And when someone wants to confirm "do you have that window seat available", they call.',
    'Nettivaraukset ovat täydennys. Puhelin on edelleen pääkanava etenkin ryhmille ja yli 4 hengen pöydille, joissa on isoin keskiostos.':
      'Online bookings are a complement. The phone is still the main channel, especially for groups and tables of more than 4, which carry the biggest average spend.',
    'Mitä yksi menetetty puhelu maksaa lounaspaikalle':
      'What one missed call costs a lunch spot',
    'Ravintolan tapauksessa yhden puhelun arvo riippuu kahdesta luvusta: pöydän koko ja keskiostos per asiakas. Lounasravintolan keskiostos on tyypillisesti 12-18 €, ala carten 35-65 € ja viikonloppuiltaisin sen päälle juomat. Kun pöytä on neljän hengen ryhmä, yksi vastaamatta jäänyt soitto voi olla 200-300 € liikevaihtoa joka ei tule taloon.':
      'In a restaurant\'s case the value of one call depends on two numbers: table size and average spend per customer. A lunch restaurant\'s average is typically €12-18, à la carte runs €35-65, and weekend evenings add drinks on top. When the table is a group of four, one missed call can be €200-300 of revenue that never reaches the till.',
    'Esimerkkilaskelma: keskikokoinen lounas- ja illallisravintola':
      'Sample calculation: mid-sized lunch and dinner restaurant',
    'Vastaamattomia puheluita / arkipäivä': 'Missed calls / weekday',
    'Näistä pöytävaraus- tai ryhmäpuheluita': 'Of these, table booking or group calls',
    'Keskimääräinen pöytäkoko (ryhmä)': 'Average table size (group)',
    '3,4 hlö': '3.4 ppl',
    'Keskimääräinen lasku / pöytä': 'Average bill / table',
    'Menetys / arkipäivä (jos 50 % olisi konvertoitunut)':
      'Loss / weekday (if 50% had converted)',
    'Menetys / vuosi (260 päivää)': 'Loss / year (260 days)',
    'Tämäkin laskelma on alakanttiin. Mukana ei ole viikonloppujen ryhmävarauksia, syntymäpäiviä, suurempia firmaillallisia tai keikkaa tilaavia asiakkaita, joiden lasku voi olla nelinumeroinen. Kun nuo lasketaan mukaan, monella ravintolalla puhuvat luvut nousevat kuusinumeroisiksi vuodessa.':
      'Even this calculation runs low. It doesn\'t include weekend group bookings, birthdays, bigger company dinners, or catering customers whose bill can be four figures. When those are factored in, for many restaurants the numbers climb into six figures a year.',
    '"Me luulimme että somemainonta on se, mihin pitää laittaa lisää rahaa. Sitten katsoimme operaattorin raporttia. Vastaamatta jäi 41 puhelua viikossa. Se ei ollut markkinoinnin ongelma, se oli puhelimen ongelma."':
      '"We thought social media advertising was the thing we needed to spend more on. Then we looked at the carrier\'s report. We were missing 41 calls a week. It wasn\'t a marketing problem, it was a phone problem."',
    'Ravintoloitsija, Helsinki': 'Restaurant owner, Helsinki',
    'No-showt: toinen vuotokohta jonka harva laskee':
      'No-shows: the second leak few people calculate',
    'Vastaamatta jääneet puhelut ovat yksi puoli. Toinen on no-showt, eli pöytävaraukset jotka eivät koskaan tule paikalle. Suomessa lukemat vaihtelevat 8-15 % välillä riippuen ravintolasta ja viikonpäivästä. Perjantai-iltana voi olla helposti 10 % varauksista paikalla tulematta.':
      'Missed calls are one side. The other is no-shows, table bookings that never show up. In Finland the rate varies between 8-15% depending on the restaurant and the day of the week. On a Friday evening you can easily have 10% of bookings not turn up.',
    'No-show maksaa monta asiaa kerralla. Pöytä on varattu, joten muita asiakkaita on käännytetty pois. Tarjoilijat ovat työvuorossa. Keittiö on tilannut raaka-aineet illan kapasiteetin mukaan. Joka tyhjäksi jäänyt nelosen pöytä on käytännössä tunnin liikevaihto pois.':
      'A no-show costs several things at once. The table is reserved, so other customers were turned away. Servers are on shift. The kitchen has ordered ingredients to match the evening\'s capacity. Every empty four-top is essentially an hour of revenue gone.',
    'Yksinkertainen vahvistuspuhelu tai tekstari iltapäivällä laskee no-show-prosentin tutkimusten mukaan suunnilleen puoleen. Ongelma on, että kukaan ei ehdi soittaa 30 vahvistuspuhelua kello 14, koska samaan aikaan keittiö valmistautuu illalla.':
      'A simple confirmation call or text in the afternoon cuts the no-show rate roughly in half, according to studies. The problem is, nobody has time to make 30 confirmation calls at 2pm, because at the same time the kitchen is prepping for the evening.',
    'Mitä tekoälyvastaanottaja tekee toisin':
      'What an AI receptionist does differently',
    'Tekoälyvastaanottaja vastaa puhelimeen kolmannella soitolla. Lounaskiireessä, perjantai-iltana, juhannuksena. Ravintolakontekstissa tekoälyagentti tekee neljä asiaa, joista jokainen on suoraan rahaksi käännettävää aikaa.':
      'An AI receptionist answers the phone on the third ring. During the lunch rush, on Friday evening, on Midsummer. In a restaurant context the AI agent does four things, each of which is time directly convertible to money.',
    'Ottaa pöytävarauksen kalenteriin.': 'Takes a table booking into the calendar.',
    'Agentti kysyy päivän, kellonajan, henkilömäärän, nimen ja puhelinnumeron. Tarvittaessa myös allergiat tai erikoispyynnöt. Tieto siirtyy suoraan ravintolan varauskalenteriin (TableOnline, ResDiary, Quentic, Google Sheets, sähköposti, oma järjestelmä).':
      'The agent asks for the day, time, number of guests, name and phone number. If needed, allergies or special requests too. The data flows straight into the restaurant\'s booking calendar (TableOnline, ResDiary, Quentic, Google Sheets, email, your own system).',
    'Tarkistaa vapauden reaaliajassa.': 'Checks availability in real time.',
    'Agentti näkee saman kalenterin kuin sinä. Jos perjantai 19:00 on täynnä, se ehdottaa 18:00 tai 20:30. Asiakas saa vastauksen samassa puhelussa, ei "soitamme takaisin huomenna".':
      'The agent sees the same calendar you do. If Friday 19:00 is full, it offers 18:00 or 20:30. The customer gets an answer in the same call, not "we\'ll call you back tomorrow".',
    'Vahvistaa varaukset automaattisesti.': 'Confirms bookings automatically.',
    'Asiakas saa heti tekstiviestivahvistuksen ja muistutusviestin saman päivän aamuna. Tämä yksin pudottaa no-shown puoleen.':
      'The customer gets an instant text confirmation and a reminder on the morning of the booking. This alone cuts no-shows in half.',
    'Suodattaa lounas-, kysymys- ja ryhmäpuhelut erilleen.':
      'Filters lunch, question and group calls into separate streams.',
    '"Onko teillä gluteenitonta lounasta?" saa suoran vastauksen. "Voinko varata 30 hengen syntymäpäiväillan?" siirtyy sähköpostiin tai päällikön puhelimeen, koska se on iso keskiostos jonka haluat hoitaa itse.':
      '"Do you have a gluten-free lunch?" gets a direct answer. "Can I book a birthday evening for 30?" goes to email or the manager\'s phone, because that\'s a big-ticket booking you want to handle yourself.',
    'Käytännön esimerkki perjantai-iltapäivästä':
      'A practical example from a Friday afternoon',
    'Perjantai 13:45. Ravintolan puhelin soi. Tarjoilija ei voi vastata, koska kantaa kahta lautasta ja kassalla on jonoa. Puhelu menee tekoälyvastaanottajalle. Ääni vastaa: "Ravintola Lyhty, miten voin auttaa?" Asiakas haluaa varata pöydän neljälle illaksi kello 19. Agentti tarkistaa kalenterin, tarjoaa kahta vapaata aikaa, vahvistaa varauksen, kysyy onko allergioita ja lopuksi: "Lähetän vahvistusviestin numeroosi. Nähdään illalla."':
      'Friday 13:45. The restaurant\'s phone rings. The server can\'t pick up because they\'re carrying two plates and there\'s a queue at the till. The call goes to the AI receptionist. The voice answers: "Ravintola Lyhty, how can I help?" The customer wants to book a table for four for the evening at 7pm. The agent checks the calendar, offers two open times, confirms the booking, asks about allergies and finishes: "I\'ll send a confirmation message to your number. See you tonight."',
    'Vahvistusviesti lähtee. Iltapäivällä klo 16 lähtee muistutusviesti: "Hei, muistathan varauksesi tänään 19:00. Vastaa KYLLÄ vahvistaaksesi tai EI peruaksesi." Asiakas vastaa KYLLÄ. No-show ei toteudu. Pöytä tuottaa.':
      'The confirmation message goes out. At 16:00 in the afternoon a reminder follows: "Hi, remember your booking today at 19:00. Reply YES to confirm or NO to cancel." The customer replies YES. No no-show. The table earns.',
    'Tarjoilijalta kului tämän puhelun käsittelyyn nolla sekuntia. Pöytä on kalenterissa, varaus on vahvistettu, asiakas on tulossa.':
      'The server spent zero seconds handling this call. The table is in the calendar, the booking is confirmed, the customer is coming.',
    'Mitä tämä maksaa verrattuna menetettyyn':
      'What this costs compared to what you\'re losing',
    'ROI: yksi säilytetty pöytä per päivä riittää':
      'ROI: one saved table per day is enough',
    'Yksi keskikokoinen lasku ravintolassa': 'One mid-sized restaurant bill',
    'Yksi pelastettu ryhmävaraus (8 hlö illallinen)':
      'One rescued group booking (8-person dinner)',
    'ROI, jos pelastaa 5 pöytää/kk + 1 ryhmävaraus':
      'ROI if it saves 5 tables/month + 1 group booking',
    'Käytännössä riittää että tekoälyvastaanottaja ottaa kiinni neljä vastaamatta jäävää lounaspuhelua viikossa. Sen jälkeen kaikki muu, eli pelastetut ryhmävaraukset, vähentyneet no-showt ja salin parantunut palvelutaso, on bonusta.':
      'In practice it\'s enough for the AI receptionist to catch four unanswered lunch calls a week. After that everything else, the rescued group bookings, the lower no-show rate and the better service level on the floor, is a bonus.',
    'Mitä käyttöönotto ravintolalle oikeasti vaatii':
      'What onboarding actually requires for a restaurant',
    'Tämä on se kohta jossa moni ravintoloitsija pudottaa luurin: "minulla ei ole aikaa ottaa uutta järjestelmää käyttöön". Reilu vastaus: käyttöönotto vie noin':
      'This is the point where many restaurant owners hang up: "I don\'t have time to roll out a new system". Honest answer: onboarding takes about',
    '60 minuuttia': '60 minutes',
    'ravintoloitsijalta itseltään.': 'from the owner.',
    'Käytännössä tarvitaan kolme asiaa:': 'In practice three things are needed:',
    'Ruokalista, hinnasto karkeasti ja aukioloajat (mitä tarjoatte, mihin hintaan, milloin auki)':
      'Menu, rough pricing and opening hours (what you serve, at roughly what price, when you\'re open)',
    'Pöytäkalenteri johon agentti saa kirjoittaa (TableOnline, ResDiary tai jopa Google Calendar käy)':
      'A booking calendar the agent can write into (TableOnline, ResDiary, even Google Calendar works)',
    'Sähköposti tai puhelinnumero, johon ryhmävaraukset ja erikoispyynnöt ohjataan':
      'An email or phone number to forward group bookings and special requests to',
    'Sen jälkeen agentti koulutetaan ravintolan oman tyylin mukaiseksi, numero ohjataan päälle ruuhka-aikoina (tai aina) ja vahvistusviestit kytketään päälle. Homma on käynnissä saman viikon aikana. Ei uutta kassajärjestelmää, ei sovellusta tarjoilijoille, ei koulutuksia salihenkilökunnalle.':
      'After that the agent is trained in the restaurant\'s own style, the number is forwarded during peak hours (or always) and confirmation messages are switched on. The whole thing is up and running within the same week. No new POS, no app for the servers, no training sessions for the floor staff.',
    'Milloin kannattaa harkita tätä': 'When this is worth considering',
    'Tekoälyvastaanottaja ei ole jokaiselle ravintolalle välttämätön. Se kannattaa kun vähintään yksi seuraavista pätee:':
      'An AI receptionist isn\'t essential for every restaurant. It\'s worth it when at least one of the following is true:',
    'Salin täyttöaste on lounaalla tai illalla yli 70 % ja puhelin jää soimaan ruuhka-aikoina':
      'Your dining room runs above 70% capacity at lunch or dinner and the phone keeps ringing during peak hours',
    'No-show-prosentti on yli 8 % etkä ehdi tehdä vahvistuspuheluita käsin':
      'Your no-show rate is over 8% and you don\'t have time to make confirmation calls by hand',
    'Saat säännöllisesti ryhmävarauspyyntöjä, jotka vaativat takaisinsoittoa tai sähköpostin tarkistusta':
      'You regularly get group booking requests that require a callback or an email check',
    'Asiakkaat antavat palautetta että puhelimeen ei vastata, tai et tiedä paljonko menetät vastaamatta jääneistä puheluista':
      'Customers give feedback that nobody picks up the phone, or you don\'t know how much you\'re losing on missed calls',
    'Jos ravintola on viiden pöydän bistro jossa omistaja ehtii itse vastata jokaiseen puheluun, tätä ei tarvita. Jos taas olette 40-150 paikan ravintola, lounaspaikka jossa puhelin soi 60 kertaa päivässä, tai useamman toimipisteen ketju, tässä on luultavasti se yksi asia jonka voi automatisoida tänä vuonna ilman että asiakaspalvelun laatu kärsii. Päinvastoin, asiakkaalle puhelin alkaa':
      'If your restaurant is a five-table bistro where the owner can pick up every call themselves, this isn\'t needed. But if you\'re a 40-150 seat restaurant, a lunch spot where the phone rings 60 times a day, or a multi-location chain, this is probably the one thing you can automate this year without service quality suffering. The opposite, in fact: for the customer the phone starts',
    'aina vastata': 'always answering',
    ', ei joskus.': ', not sometimes.',
    'Katso mitä Selora vastaisi sinun ravintolasi puhelimeen':
      'See what Selora would say to your restaurant\'s phone',
    '30 minuutin demossa näet oikean pöytävarauspuhelun alusta loppuun, ravintolan skenaariolla. Ei PowerPointia, ei sitoumuksia.':
      'In a 30-minute demo you see a real table-booking call from start to finish, with a restaurant scenario. No PowerPoint, no commitments.',
    'Varaa maksuton demo →': 'Book a free demo →',

    // -------- blog: autokorjaamon-puhelin-ajanvaraus-tekoaly --------
    'Autokorjaamon puhelin soi öljynvaihdon aikana: miksi joka kolmas ajanvaraus karkaa kilpailijalle - Selora Blogi':
      'A repair shop\'s phone rings during an oil change: why one in three booking calls slips away to a competitor - Selora Blog',
    'Autokorjaamon puhelin soi öljynvaihdon aikana: miksi joka kolmas ajanvaraus karkaa kilpailijalle':
      'A repair shop\'s phone rings during an oil change: why one in three booking calls slips away to a competitor',
    'Autokorjaamon puhelin: miksi joka kolmas ajanvaraus karkaa kilpailijalle':
      'A repair shop\'s phone: why one in three bookings slips away to a competitor',
    'Autokorjaamon puhelin soi juuri kun nosturin alla on auto. Katsotaan miksi ajanvarauspuhelut karkaavat kilpailijalle, mitä se maksaa kuukaudessa ja miten tekoälyvastaanottaja ottaa varauksen ja vapaan paikan ilman että asentajan kädet jäävät pesuun.':
      'A repair shop\'s phone rings exactly when there\'s a car on the lift. Let\'s look at why booking calls slip away to a competitor, what that costs per month, and how an AI receptionist takes the booking and finds an open slot without the mechanic having to wash their hands.',
    'Autokorjaamon puhelin soi juuri kun nosturin alla on auto. Katsotaan miksi ajanvarauspuhelut karkaavat kilpailijalle, mitä se maksaa kuukaudessa ja miten tekoälyvastaanottaja ottaa varauksen ja vapaan paikan.':
      'A repair shop\'s phone rings exactly when there\'s a car on the lift. Let\'s look at why booking calls slip away to a competitor, what that costs per month, and how an AI receptionist takes the booking and finds an open slot.',
    'Asentajan kädet ovat öljyssä kun puhelin soi. Näin tekoäly ottaa ajanvaraukset ilman keskeytyksiä.':
      'The mechanic\'s hands are covered in oil when the phone rings. Here\'s how AI takes bookings without interruptions.',
    'Autokorjaamon puhelin ja ajanvaraus': 'A repair shop\'s phone and booking',
    'Asentaja työskentelee auton alla nostimella autokorjaamossa':
      'A mechanic working under a car on a lift in a repair shop',
    '4. toukokuuta 2026': '4 May 2026',
    'Asentajan kädet ovat öljyssä, nostimella roikkuu Volkkari ja seuraava asiakas odottaa tiskillä. Juuri silloin puhelin soi. Katsotaan miksi autokorjaamon ajanvarauspuhelut ovat kaikkein helpoiten karkaavia, mitä se maksaa kuukaudessa ja miten tekoälyvastaanottaja ottaa varauksen ilman että kukaan pyyhkii käsiään liinalla.':
      'The mechanic\'s hands are covered in oil, a Volkswagen is hanging on the lift and the next customer is waiting at the counter. That\'s exactly when the phone rings. Let\'s look at why a repair shop\'s booking calls are the easiest to lose, what that costs per month, and how an AI receptionist takes the booking without anyone wiping their hands on a rag.',
    'Autokorjaamossa puhelin soi aina väärällä hetkellä':
      'In a repair shop the phone always rings at the wrong moment',
    'Aamu kahdeksan, hallin ovet juuri auki. Ensimmäinen auto on jo nostimella, toinen tulee tiskille avaimet kourassa ja kolmannen omistaja kysyy "ehtiikö katsastusta ennen perjantaita". Juuri silloin puhelin alkaa soida. Soitto siirtyy vastaajaan, koska tiskillä seisoo asiakas ja asentajan kädet ovat öljyssä.':
      'Eight in the morning, the workshop doors just opened. The first car is already on the lift, the second is coming to the counter with the keys, and the third owner is asking "can we squeeze in inspection before Friday". Right at that moment the phone starts ringing. The call goes to voicemail, because there\'s a customer at the counter and the mechanic\'s hands are covered in oil.',
    'Tämä toistuu noin 30-50 kertaa päivässä keskikokoisessa korjaamossa. Joka soiton takana on potentiaalinen ajanvaraus, hintatiedustelu, varaosakysely tai katsastuskorjaus. Joka soitto on euroja. Ja joka kolmas niistä menee vastaamatta, koska kukaan ei voi olla yhtä aikaa hallissa, tiskillä ja puhelimessa.':
      'This repeats roughly 30-50 times a day in a mid-sized repair shop. Behind every call is a potential booking, a price inquiry, a parts question or an inspection-related repair. Every call is euros. And one in three goes unanswered, because nobody can be in the workshop, at the counter and on the phone at the same time.',
    'Autoala on kilpailluin "kuka vastaa ensin" -peli':
      'The auto trade is the most competitive "who answers first" game',
    'Autoasiakas ei ole uskollinen yhdelle korjaamolle samalla tavalla kuin esimerkiksi parturille tai hammaslääkärille. Kun jarrupala kirskuu, akku ei pyöritä starttia tai jakohihna lähestyy 100 000 kilometriä, asiakas tekee yhden asian:':
      'A car customer isn\'t loyal to one repair shop the same way they are to a barber or dentist. When a brake pad squeals, the battery won\'t crank the starter, or the timing belt is approaching 100,000 km, the customer does one thing:',
    'soittaa kolmeen lähimpään korjaamoon ja varaa siltä jossa pääsee nopeimmin':
      'they call the three nearest repair shops and book with whichever one can take them in fastest',
    '. Olen jutellut tämän vuoden aikana korjaamoyrittäjien kanssa Vantaalla, Lahdessa ja Jyväskylässä. Kaikilla on sama havainto: jos puhelimeen ei vastata kahdella ensimmäisellä soitolla, asiakas soittaa seuraavalle. He ovat itse tehneet sen joka kerta, kun oma auto on hajonnut. Ostopäätös tehdään 5 minuutissa, ei viikossa.':
      '. Over this year I\'ve spoken with workshop owners in Vantaa, Lahti and Jyväskylä. They all share the same observation: if the phone isn\'t picked up on the first two calls, the customer calls the next one. They\'ve done it themselves every time their own car has broken down. The buying decision is made in 5 minutes, not in a week.',
    'Olen jutellut tämän vuoden aikana korjaamoyrittäjien kanssa Vantaalla, Lahdessa ja Jyväskylässä. Kaikilla on sama havainto: jos puhelimeen ei vastata kahdella ensimmäisellä soitolla, asiakas soittaa seuraavalle. He ovat itse tehneet sen joka kerta, kun oma auto on hajonnut. Ostopäätös tehdään 5 minuutissa, ei viikossa.':
      'Over this year I\'ve spoken with workshop owners in Vantaa, Lahti and Jyväskylä. They all share the same observation: if the phone isn\'t picked up on the first two calls, the customer calls the next one. They\'ve done it themselves every time their own car has broken down. The buying decision is made in 5 minutes, not in a week.',
    'korjaamoasiakkaista soittaa': 'of repair shop customers call',
    'vähintään kahteen korjaamoon': 'at least two repair shops',
    'kun auto kaipaa huoltoa. Voittaja on yleensä se, joka vastaa ensimmäisenä ja tarjoaa selkeän ajan saman puhelun aikana.':
      'when their car needs servicing. The winner is usually the one who answers first and offers a clear appointment time within the same call.',
    'Verkkoajanvaraus ei korvaa puhelinta tällä alalla':
      'Online booking doesn\'t replace the phone in this trade',
    'Moni korjaamo on ostanut ajanvarauskalenterin verkkoon: Autofutur, Automaster, oma WordPress-kalenteri tai jopa Google Calendar-linkki. Hyvä juttu, ne tuovat osan varauksista ilman puhelua. Mutta autoala on tässä asiassa täysin oma lukunsa:':
      'Many repair shops have bought an online booking calendar: Autofutur, Automaster, their own WordPress calendar or even a Google Calendar link. Good move, those bring in some bookings without a phone call. But the auto trade is in a league of its own on this:',
    'iso osa asiakkaista haluaa kuvailla ongelmaa ennen ajan varaamista':
      'a large share of customers wants to describe the problem before booking a slot',
    '.':
      '.',
    '"Auto rätisee kun kääntää oikealle." "Ohjauspyörä tärisee 100 km/h jälkeen." "Mittariin syttyi keltainen valo joka näyttää öljykannulta." Näitä ei klikata pudotusvalikosta. Asiakas haluaa kuvailla ääneen ja kysyä "mahtaako se olla pakoputki vai pyöränlaakerit". Sitten varataan aika, kun asiakas tietää suurin piirtein mihin on tulossa.':
      '"The car rattles when I turn right." "The steering wheel vibrates above 100 km/h." "A yellow warning light shaped like an oil can lit up on the dash." These aren\'t clicked from a dropdown. The customer wants to describe it out loud and ask "could it be the exhaust or the wheel bearings". Then a slot is booked, once the customer roughly knows what they\'re coming in for.',
    'Toinen syy on aikakriittisyys. Katsastus on huomenna umpeutumassa, vakuutusyhtiö pyytää nopeaa korjausta tai työauton on päästävä huomenna työmaalle. Soittajat eivät halua täyttää lomaketta ja odottaa "vahvistamme ajan parin tunnin sisällä". He haluavat ajan nyt, puhelussa.':
      'The second reason is time pressure. Inspection expires tomorrow, the insurance company is asking for a fast repair, or the work van has to be on a job site tomorrow morning. Callers don\'t want to fill in a form and wait for "we\'ll confirm a slot within a couple of hours". They want a slot now, in the call.',
    'Mitä yksi vastaamatta jäänyt soitto maksaa korjaamolle':
      'What one missed call costs a repair shop',
    'Korjaamon ajanvarauksen arvo riippuu työn tyypistä. Öljynvaihto on 80-150 €, jarrupalat 250-400 €, jakohihna 500-900 € ja iso vaihteistoremontti voi olla 1500-3500 €. Keskikokoisessa korjaamossa keskimääräinen lasku per käynti pyörii 280-450 € välillä, kun lasketaan myös pelkät katsastukset ja öljynvaihdot mukaan.':
      'The value of a repair shop booking depends on the job type. An oil change is €80-150, brake pads €250-400, a timing belt €500-900, and a major gearbox rebuild can be €1500-3500. In a mid-sized shop the average bill per visit runs between €280-450, including basic inspections and oil changes.',
    'Esimerkkilaskelma: keskikokoinen monimerkkikorjaamo':
      'Sample calculation: mid-sized multi-brand repair shop',
    'Näistä ajanvaraus- tai työpyyntöpuheluita': 'Of these, booking or work-request calls',
    'Keskimääräinen lasku / työmääräys': 'Average bill / work order',
    'Konversio (asiakas valitsee toisen jos ei vastausta)':
      'Conversion (customer picks another if no answer)',
    'Menetys / arkipäivä': 'Loss / weekday',
    'Menetys / vuosi (250 työpäivää)': 'Loss / year (250 working days)',
    'Tämä luku näyttää järjettömältä, kunnes ajattelee mitä se tarkoittaa: päivässä noin neljä työmääräystä karkaa korjaamolta jossa on vain 2-3 nostinta. Tilaa ei välttämättä riittäisi kaikille kuitenkaan, mutta luku näyttää sen mitä putkesta vuotaa. Suurempi vuoto on toinen: kun asiakas kerran löytää uuden korjaamon joka vastaa puhelimeen, hän palaa sinne myös seuraavalla huoltovälillä. Yksi menetetty soitto on usein menetetty asiakassuhde 3-5 vuoden ajalle.':
      'This number looks absurd until you think about what it means: roughly four work orders a day slip away from a shop with only 2-3 lifts. There might not be capacity for all of them anyway, but the number shows what\'s leaking out of the pipe. The bigger leak is the second one: once a customer finds a new shop that answers the phone, they\'ll come back there at the next service interval too. One missed call is often a lost customer relationship for 3-5 years.',
    '"Me oletettiin että nettiajanvaraus riittää. Sitten katsoin operaattorin raporttia ja näin että soittoja oli 740 kuukaudessa, vastattu 480. Loput 260 menivät vastaajaan. Soitin niistä takaisin viidesosalle, joista jokainen sanoi \'ai, ehdin jo varata muualta\'."':
      '"We assumed online booking was enough. Then I looked at the carrier\'s report and saw 740 calls a month, 480 answered. The other 260 went to voicemail. I called back a fifth of those, and every one of them said \'oh, I already booked somewhere else\'."',
    'Korjaamoyrittäjä, Vantaa': 'Repair shop owner, Vantaa',
    'Varaosakyselyt: hidas vuotokohta jonka harva mittaa':
      'Parts inquiries: the slow leak few people measure',
    'Ajanvaraukset ovat näkyvin osa puhelinliikennettä. Toinen iso siivu on varaosakyselyt: "onko sopivaa akkua tähän autoon", "kuinka paljon maksaisi etujarrupalat Octaviaan vuosimallia 2018", "voitko tilata pakoputken iltapäiväksi". Nämä eivät aina muutu välittömästi työmääräykseksi, mutta ne ovat ostosignaaleja. Asiakas tutkii eri korjaamojen hintatasoa.':
      'Bookings are the most visible part of phone traffic. The other big slice is parts inquiries: "do you have a battery that fits this car", "how much would front brake pads for a 2018 Octavia cost", "can you order an exhaust for this afternoon". These don\'t always turn into a work order on the spot, but they\'re buying signals. The customer is checking the price level across different shops.',
    'Jos kaksi korjaamoa antaa hinta-arvion ja kolmannelle ei vastata, kolmas ei yleensä saa työtä. Tämä on hiljaisin liikevaihdon vuoto, koska se ei näy ajanvarauskalenterissa. Se näkyy vain tyhjinä päivinä huoltokauden hiljaisempina viikkoina, kun katsastuskausi on ohi ja kelirikko on loppunut.':
      'If two shops give a price estimate and the third doesn\'t pick up, the third one usually doesn\'t get the job. This is the quietest revenue leak, because it doesn\'t show up in the booking calendar. It only shows up as empty days during the slower weeks of the service season, once inspection season is over and the spring thaw has ended.',
    'Mitä tekoälyvastaanottaja tekee toisin':
      'What an AI receptionist does differently',
    'Tekoälyvastaanottaja vastaa puhelimeen kolmannella soitolla, joka päivä, joka tunti. Korjaamoympäristössä se tekee viisi asiaa, joista jokainen on suoraan euroja:':
      'An AI receptionist answers the phone on the third ring, every day, every hour. In a repair shop context it does five things, each of which is directly money:',
    'Ottaa ajanvarauksen suoraan kalenteriin.': 'Takes the booking straight into the calendar.',
    'Agentti kysyy auton merkin, vuosimallin, ongelman kuvauksen, asiakkaan nimen ja puhelinnumeron. Tieto siirtyy suoraan korjaamon kalenteriin (Autofutur, Automaster, Google Calendar, oma järjestelmä) oikealle nostimelle ja oikealle asentajalle.':
      'The agent asks for the car make, year, a description of the problem, the customer\'s name and phone number. The info goes straight into the shop\'s calendar (Autofutur, Automaster, Google Calendar, an in-house system) onto the right lift and the right mechanic.',
    'Tarkistaa vapaat ajat reaaliajassa.': 'Checks open slots in real time.',
    'Jos torstai on täynnä, agentti ehdottaa perjantaita aamupäivällä tai ensi maanantaita. Asiakas saa vahvan kyllä-vastauksen samassa puhelussa, ei "tarkistamme ja palaamme".':
      'If Thursday is full, the agent suggests Friday morning or next Monday. The customer gets a firm yes in the same call, not "we\'ll check and get back to you".',
    'Antaa karkean hinta-arvion tutuille töille.': 'Gives a rough estimate for familiar jobs.',
    'Öljynvaihto, jarrupalojen vaihto, jakohihna, akku, katsastuskorjaus. Agentti tietää korjaamon hintaluokat ja osaa sanoa "öljynvaihto Octaviaan on meillä noin 110 €, sisältää suodattimen".':
      'Oil change, brake pad replacement, timing belt, battery, inspection-related repairs. The agent knows the shop\'s price brackets and can say "an oil change on an Octavia runs about €110 with us, filter included".',
    'Vahvistaa ajan tekstiviestillä.': 'Confirms the slot by text message.',
    'Asiakas saa heti vahvistuksen ja muistutusviestin edellisenä päivänä. Tämä yksin pudottaa peruutusten määrää.':
      'The customer gets an instant confirmation and a reminder the day before. This alone cuts cancellations.',
    'Ohjaa monimutkaiset tapaukset oikealle ihmiselle.':
      'Routes complex cases to the right person.',
    '"Auto sammui kesken matkan ja tarvii hinauksen" siirtyy päällikön puhelimeen. "Voiko vakuutusyhtiön pelivaroin tehdä korjauksen" siirtyy sähköpostiin. Iso vaihteistoremontti, jossa asiakas haluaa tarkemman arvion, päätyy soittolistalle aamulla.':
      '"The car died mid-trip and needs a tow" goes through to the manager\'s phone. "Can the repair be done on the insurance company\'s tab" goes to email. A major gearbox rebuild where the customer wants a more detailed estimate ends up on the morning callback list.',
    'Käytännön esimerkki tiistaiaamusta': 'A practical example from a Tuesday morning',
    'Tiistai 9:15. Asentaja on nostimen alla vaihtamassa pakoputkea. Tiskillä asiakas täyttää työmääräystä. Puhelin soi. Soittaja: "Hei, mun Volkkarissa on alkanut tärisemään ohjauspyörä, ehtisikö tällä viikolla katsoa?"':
      'Tuesday 9:15. A mechanic is under the lift swapping an exhaust. At the counter a customer is filling out a work order. The phone rings. Caller: "Hi, the steering wheel on my Volkswagen has started vibrating, could you take a look this week?"',
    'Tekoälyvastaanottaja vastaa, kysyy auton tiedot, kuvaa ongelman, tarjoaa torstain aamuvuoroon kahden tunnin slottia ja sanoo "todennäköisesti tasapainotus tai pyöränlaakeri, hinta-arvio tasapainotuksesta on 65 €, laakerin vaihto noin 280 €, tarkemmin nähdään kun nostimella tutkitaan". Asiakas ottaa ajan. Vahvistus lähtee tekstiviestillä.':
      'The AI receptionist answers, asks for the car details, describes the issue back, offers a two-hour slot on Thursday morning and says "most likely a balancing job or a wheel bearing, balancing is around €65, bearing replacement around €280, we\'ll see more once it\'s on the lift". The customer takes the slot. Confirmation goes out by text.',
    'Asentajalta meni puhelun käsittelyyn nolla sekuntia. Ajanvaraus on kalenterissa, hinta-arvio on annettu ja asiakas tietää suurin piirtein mihin on tulossa. Aamu jatkuu ilman keskeytyksiä.':
      'The mechanic spent zero seconds on this call. The booking is in the calendar, the estimate is given and the customer roughly knows what they\'re coming in for. The morning continues without interruptions.',
    'Mitä tämä maksaa verrattuna menetettyyn':
      'What it costs compared to what\'s lost',
    'ROI: kaksi pelastettua ajanvarausta kuukaudessa riittää':
      'ROI: two recovered bookings a month is enough',
    'Yksi keskimääräinen työmääräys': 'One average work order',
    'Yksi pelastettu jakohihnatyö': 'One recovered timing belt job',
    'ROI, jos pelastaa 4 työmääräystä/kk':
      'ROI if you recover 4 work orders per month',
    'Käytännössä riittää että tekoälyvastaanottaja ottaa kiinni neljä vastaamatta jäävää ajanvarauspuhelua kuukaudessa. Sen jälkeen kaikki muu, eli pelastetut isot remontit, varaosakyselyiden seurauksena tulleet työt ja takaisinpalautuvat kanta-asiakkaat, on bonusta.':
      'In practice it\'s enough for the AI receptionist to catch four missed booking calls a month. After that, everything else, the recovered big jobs, work that came in via parts inquiries, and returning regulars, is a bonus.',
    'Mitä käyttöönotto korjaamolle oikeasti vaatii':
      'What rolling this out actually takes for a repair shop',
    'Tämä on se kohta jossa moni korjaamoyrittäjä epäilee: "kuka kerkeää opettaa robotille meidän hinnastoa". Reilu vastaus: käyttöönotto vie noin':
      'This is the point where many shop owners get sceptical: "who has time to teach a robot our pricing". Honest answer: rollout takes about',
    '90 minuuttia': '90 minutes',
    'yrittäjältä itseltään.': 'from the owner.',
    'Käytännössä tarvitaan neljä asiaa:': 'In practice four things are needed:',
    'Hintalista yleisimmistä töistä (öljynvaihto, jarrupalat, jakohihna, akku, katsastuskorjaus, tasapainotus, rengastyöt)':
      'A price list for the most common jobs (oil change, brake pads, timing belt, battery, inspection-related repair, wheel balancing, tyre work)',
    'Aukioloajat ja kapasiteetti (nostinten määrä, asentajien tyypilliset työajat)':
      'Opening hours and capacity (number of lifts, typical mechanic shifts)',
    'Ajanvarauskalenteri johon agentti saa kirjoittaa (Autofutur, Automaster, Google Calendar tai jopa jaettu Excel)':
      'A booking calendar the agent can write into (Autofutur, Automaster, Google Calendar or even a shared Excel)',
    'Sähköposti tai puhelin, johon hinaukset, vakuutuskorjaukset ja isot remontit ohjataan':
      'An email or phone number to forward tows, insurance repairs and major jobs to',
    'Sen jälkeen agentti koulutetaan korjaamon oman tyylin mukaiseksi, numero ohjataan päälle (ruuhka-aikoina tai aina, riippuen kuinka usein puhelin jää ilman vastaajaa) ja vahvistusviestit kytketään päälle. Homma on käynnissä saman viikon aikana. Ei uutta hallintajärjestelmää, ei uutta sovellusta asentajille, ei viikon koulutusta tiskihenkilölle.':
      'After that the agent is trained in the shop\'s own style, the number is forwarded (during peak hours or always, depending on how often the phone goes unanswered) and confirmation messages are switched on. The whole thing is running within the same week. No new shop management system, no new app for the mechanics, no week-long training for the counter staff.',
    'Milloin tämä kannattaa korjaamolle':
      'When this is worth it for a repair shop',
    'Tekoälyvastaanottaja ei ole jokaiselle korjaamolle pakollinen. Yhden hengen pajalla, jossa omistaja itse vastaa puhelimeen aamukahdeksasta iltaviiteen ilman keskeytyksiä, tätä ei tarvita. Mutta kun jokin seuraavista pätee, laskenta muuttuu nopeasti:':
      'An AI receptionist isn\'t mandatory for every repair shop. In a one-person workshop where the owner picks up the phone from eight to five without interruptions, this isn\'t needed. But when any of the following is true, the math shifts fast:',
    'Korjaamossa on 2 tai useampaa nostinta ja puhelin jää säännöllisesti soimaan kun asentaja on töissä auton alla':
      'The shop has 2 or more lifts and the phone keeps ringing unanswered while the mechanic is under a car',
    'Tiskihenkilö joutuu valitsemaan asiakkaan ja puhelimen välillä useamman kerran päivässä':
      'The counter person has to choose between a customer and the phone several times a day',
    'Saat säännöllisesti palautetta että "ei oltu päästy soittamaan teille läpi"':
      'You regularly hear "we couldn\'t get through to you" as feedback',
    'Et tiedä paljonko menetät vastaamatta jääneistä puheluista, mutta arvelet että lukemia ei kestäisi katsoa':
      'You don\'t know how much you\'re losing on missed calls, but you suspect the numbers would be hard to look at',
    'Olet ulkoistanut iltavuoron tai viikonloppupäivystyksen vastaajaan, joka ei tuo takaisinsoittoja kunnolla':
      'You\'ve outsourced the evening shift or weekend on-call to a voicemail service that doesn\'t bring callbacks back properly',
    'Korjaamoala on viime vuosina muuttunut siten, että asiakas tekee päätöksen yhä useammin sen perusteella, kuka':
      'The repair trade has shifted in recent years, with customers more and more often deciding based on who',
    'vastaa puhelimeen ensimmäisenä': 'answers the phone first',
    '. Hinta ratkaisee silloin kun puhutaan isoista remonteista, mutta ajanvarauksessa, varaosatiedusteluissa ja katsastuskorjauksissa voitto menee sille korjaamolle joka on tavoitettavissa. Tekoälyvastaanottaja siirtää sen voiton sinun puolelle, ilman että kukaan jättää työkaluja kädestä kesken nostimen alle.':
      '. Price decides on big repairs, but for bookings, parts inquiries and inspection-related work the win goes to the shop that can be reached. An AI receptionist moves that win to your side, without anyone having to drop their tools mid-job under the lift.',
    'Katso mitä Selora vastaisi sinun korjaamosi puhelimeen':
      'See what Selora would say to your repair shop\'s phone',
    '30 minuutin demossa näet oikean ajanvarauspuhelun alusta loppuun, korjaamon skenaariolla. Ei PowerPointia, ei sitoumuksia.':
      'In a 30-minute demo you see a real booking call from start to finish, with a repair shop scenario. No PowerPoint, no commitments.',

    // ---------- mobile app showcase ----------
    'Selora-sovellus': 'Selora app',
    'Tulossa pian': 'Coming soon',
    'Hallinnoi puheluita': 'Manage calls',
    'kämmenelläsi.': 'in your pocket.',
    'Mobiilisovellus iOS:lle ja Androidille. Reaaliaikainen näkymä agenttisi puheluihin, varauksiin ja asiakkaisiin. Push-ilmoitukset heti uudesta puhelusta. Julkaistaan kevään aikana.':
      'Mobile app for iOS and Android. Real-time view of your agent\'s calls, bookings and customers. Push notifications the moment a new call comes in. Launching this spring.',
    'Puhelin, kalenteri ja asiakkaat, yhdessä paikassa.': 'Phone, calendar and customers, all in one place.',
    'Selora-mobiilisovellus näyttää reaaliaikaisesti agenttisi puhelut, varaukset ja asiakkaat. Saat push-ilmoituksen heti, kun uusi puhelu vastataan tai aika varataan.':
      'The Selora mobile app shows your agent\'s calls, bookings and customers in real time. You get a push notification the moment a new call is answered or an appointment is booked.',
    'Tänään': 'Today',
    'Kojelauta': 'Dashboard',
    'Puhelua / vko': 'Calls / wk',
    'Uusi puhelu vastattu': 'New call answered',
    '+358 40 123 4567 · 1 m sitten': '+358 40 123 4567 · 1 m ago',
    'Uusi varaus': 'New booking',
    'Mari L. · perjantaina 14:30': 'Mari L. · Friday 14:30',
    '+34 % varauksia': '+34% bookings',
    'Tällä viikolla': 'This week',
    'Asiakas vastattu': 'Customer answered',
    'Heti, 24/7': 'Instant, 24/7',
    'Lataa': 'Download',
    'App Storesta': 'on the App Store',
    'Hanki': 'Get',
    'Google Playsta': 'on Google Play',
    'Pian': 'Soon',

    // ---------- a11y / chrome ----------
    'Hyppää sisältöön': 'Skip to content',

    // ---------- cookie banner ----------
    'Käytämme välttämättömiä evästeitä': 'We use essential cookies',
    'Selora käyttää vain teknisesti välttämättömiä evästeitä sivuston toiminnan varmistamiseksi. Emme seuraa käyttöäsi mainostarkoituksiin. Lue lisää tietosuojaselosteestamme.':
      'Selora uses only essential cookies needed for the site to work. We do not track you for advertising. See our privacy policy for details.',
    'Selvä': 'Got it',

    // ---------- newsletter GDPR ----------
    'Tilaamalla hyväksyt, että Selora käyttää sähköpostiosoitettasi uutiskirjeen lähettämiseen. Voit perua tilauksen milloin tahansa jokaisen viestin alalaidan linkistä. Lue tietosuojaseloste.':
      'By subscribing you agree that Selora uses your email to send the newsletter. You can unsubscribe any time via the link at the bottom of every email. See the privacy policy.',
    'tietosuojaseloste': 'privacy policy',
    'Sähköpostiosoite': 'Email address',

    // ---------- portfolio / stories carousel (verkkosivusuunnittelu.html) ----------
    'Esimerkkitöitä': 'Recent work',
    'Sivut, joita olemme rakentaneet.': "Sites we've built.",
    'rakentaneet': 'built',
    'Katso sivusto →': 'View site →',
    'Pizzeria · Turku': 'Pizzeria · Turku',
    'Hammasklinikka · Helsinki': 'Dental clinic · Helsinki',
    'LVI urakointi · Vantaa': 'Plumbing · Vantaa',
  };

  // Reverse map for completeness when the page already happens to be in EN
  // (e.g. ported) — not used by default but kept for future tooling.

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  function norm(s) {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  // Pattern-based translations for dynamic strings (e.g. "5 / 10 käytetty").
  // Each entry: [regex on FI text, EN replacement template ($1, $2 etc).]
  const PATTERNS = [
    [/^(\d+)\s*\/\s*(\d+)\s*käytetty$/i, '$1 / $2 used'],
    [/^Lähetetty\s+(\d+)\/(\d+)\s+tilaajalle$/i, 'Sent to $1/$2 subscribers'],
    [/^Poistetaanko\s+(.+?)\?\s+Kaikki data poistetaan pysyvästi\.$/i, 'Delete $1? All data will be permanently removed.'],
    [/^(\d+)\s+puhelua$/i, '$1 calls'],
    [/^(\d+)\s+puhelu$/i, '$1 call'],
    [/^(\d+)\s+min$/i, '$1 min'],
    [/^(\d+)\s+sek$/i, '$1 sec'],
    [/^Ladataan\s+(.+?)…$/i, 'Loading $1…'],
    [/^Tervetuloa,\s+(.+?)!?$/i, 'Welcome, $1!'],
    [/^Hei\s+(.+?)!?$/i, 'Hi $1!'],
    [/^(\d+)\.(\d+)\.(\d+)$/, '$3-$2-$1'],  // dd.mm.yyyy → yyyy-mm-dd
  ];

  // Translate-or-passthrough.
  function translate(s, lang) {
    if (lang !== 'en') return s;
    const k = norm(s);
    if (DICT[k]) {
      // Preserve leading/trailing whitespace from the original.
      const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
      return m[1] + DICT[k] + m[3];
    }
    // Try pattern-based dynamic translations
    for (let i = 0; i < PATTERNS.length; i++) {
      const pm = k.match(PATTERNS[i][0]);
      if (pm) {
        const out = k.replace(PATTERNS[i][0], PATTERNS[i][1]);
        const lt = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
        return lt[1] + out + lt[3];
      }
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
    const attrs = ['placeholder', 'title', 'alt', 'aria-label', 'data-placeholder', 'data-title', 'data-tooltip'];
    const sel = '[' + attrs.join('],[') + ']';
    const els = root.querySelectorAll ? root.querySelectorAll(sel) : [];
    els.forEach(function (el) {
      attrs.forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        const orig = el.getAttribute('data-selora-orig-' + a);
        const cur = el.getAttribute(a);
        if (orig == null) {
          el.setAttribute('data-selora-orig-' + a, cur);
        }
        const baseline = el.getAttribute('data-selora-orig-' + a) || cur;
        el.setAttribute(a, translate(baseline, lang));
      });
    });
    // <input type=submit|button|reset> value translation only (do NOT translate text input values)
    const valEls = root.querySelectorAll ? root.querySelectorAll('input[type="submit"], input[type="button"], input[type="reset"], button[value]') : [];
    valEls.forEach(function (el) {
      if (!el.hasAttribute('value')) return;
      const orig = el.getAttribute('data-selora-orig-value');
      const cur = el.getAttribute('value');
      if (orig == null) el.setAttribute('data-selora-orig-value', cur);
      const baseline = el.getAttribute('data-selora-orig-value') || cur;
      el.setAttribute('value', translate(baseline, lang));
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
    const watchedAttrs = ['placeholder', 'title', 'alt', 'aria-label', 'data-placeholder', 'data-title', 'data-tooltip'];
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
        if (m.type === 'attributes' && m.target && m.target.nodeType === 1) {
          const a = m.attributeName;
          if (watchedAttrs.indexOf(a) === -1) return;
          const el = m.target;
          const baseline = el.getAttribute(a);
          if (baseline == null) return;
          const translated = translate(baseline, state.lang);
          if (translated !== baseline) {
            // Fresh baseline (JS just set a new FI string)
            el.setAttribute('data-selora-orig-' + a, baseline);
            el.setAttribute(a, translated);
          }
        }
      });
    });
    if (document.body) {
      mo.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: watchedAttrs
      });
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
