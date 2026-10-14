/* ============================================================
   Galata Kebab House — liike ja vuorovaikutus
   GSAP + ScrollTrigger + Lenis. Kaikki vieritysanimaatiot ovat
   scrubattuja: sivu ei animoi itsekseen vaan seuraa vieritystä.
   ========================================================== */
(function () {
  'use strict';

  /* Käännökset: englanninkielinen sivu asettaa window.I18N:n. Ilman sitä suomi. */
  const T = window.I18N || {};
  const _ = (fi) => T[fi] || fi;


  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ?touch=1 pakottaa kosketuslaitteen logiikan. Tarvitaan mobiiliesittelyyn:
  // työpöydän iframe raportoi tarkan osoittimen, jolloin sivu käyttäisi
  // Lenis-vieritystä ja pinnattua karusellia oikean sormivierityksen sijaan.
  const coarse  = matchMedia('(pointer: coarse)').matches || /[?&]touch=1/.test(location.search);
  // ?still=1 ohittaa piilolähtötilat (kuvakaappauksia ja tarkistusta varten)
  const still = /[?&]still=1/.test(location.search);

  /* Turvaverkko: paljastusanimaatiot piilottavat sisällön lähtötilassa. Jos
     rAF ei koskaan aja (välilehti taustalla latauksen ajan, GSAP ei lataudu,
     virhe skriptissä), sisältö jäisi näkymättömiin — ravintolan aukioloajat
     eivät saa kadota animaation takia. Pakotetaan kaikki näkyviin, jos jokin
     on yhä piilossa kahden sekunnin kuluttua latauksesta. */
  function unhideAll() {
    $$('[data-rise]').forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
    $$('[data-split] .w > span, .hero__title .ln > span').forEach((el) => { el.style.transform = 'none'; });
    $$('.story__figure .cover').forEach((el) => { el.style.transform = 'scaleY(0)'; });
    $$('.hero__eyebrow, .hero__meta').forEach((el) => { el.style.opacity = '1'; });
    $$('[data-split] .w, .hero__title .ln').forEach((el) => { el.style.overflow = 'visible'; });
  }
  if (still) { setTimeout(unhideAll, 0); }

  /* ?only=<id> piilottaa muut osiot, jolloin haluttu osio on sivun ylin.
     Tarkistustyökalu: esikatselupaneeli rasteroi vain ensimmäisen näkymän,
     joten alempia osioita ei muuten saa kuvakaappaukseen. */
  const only = (location.search.match(/[?&]only=([\w-]+)/) || [])[1];
  if (only) {
    $$('main > section, .marquee, footer').forEach((sec) => {
      if (sec.id !== only && !sec.closest('#' + only)) sec.style.display = 'none';
    });
  }
  addEventListener('load', () => setTimeout(() => {
    const hidden = $$('[data-rise]').filter((el) => +getComputedStyle(el).opacity < 0.05);
    if (hidden.length) unhideAll();
  }, 2000));

  gsap.registerPlugin(ScrollTrigger);

  /* ---------------------------------------------------------- 1. vieritys */
  let lenis = null;
  if (!reduced && !coarse && window.Lenis) {
    lenis = new Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // ankkurilinkit: Lenis hoitaa vierityksen, muuten natiivi
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const el = $(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { offset: -10 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }));

  /* ---------------------------------------------------------- 2. navi */
  const nav = $('#nav');
  ScrollTrigger.create({
    start: 'top -60',
    onUpdate: (self) => nav.classList.toggle('is-stuck', self.scroll() > 60),
    onToggle: (self) => nav.classList.toggle('is-stuck', self.isActive)
  });

  /* ---------------------------------------------------------- 3. hiillos */
  /* Nousevia kipinöitä. Ei kuvatiedostoa: jokainen kipinä on hehkuva piste,
     jonka koko ja kirkkaus värähtelevät. Määrä skaalataan pinta-alan mukaan,
     jotta mobiili ei joudu piirtämään turhaa. */
  function embers(canvas, opts) {
    if (!canvas || reduced) return null;
    const o = Object.assign({ density: 1, rise: 26, hue: 22 }, opts);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, devicePixelRatio || 1);
    let w = 0, h = 0, ps = [], vis = true;

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp(w * h / 12000, 30, 150) * o.density);
      ps = Array.from({ length: n }, () => spawn(true));
    }
    function spawn(anywhere) {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + 12,
        r: 0.6 + Math.random() * 1.9,
        v: (0.35 + Math.random() * 1) * (o.rise / 26),
        drift: (Math.random() - 0.5) * 0.5,
        ph: Math.random() * Math.PI * 2,
        life: 0.4 + Math.random() * 0.6
      };
    }
    function frame(t) {
      if (!vis) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of ps) {
        p.y -= p.v; p.x += p.drift + Math.sin(t / 900 + p.ph) * 0.28;
        if (p.y < -10 || p.x < -20 || p.x > w + 20) Object.assign(p, spawn(false));
        const flick = 0.55 + 0.45 * Math.sin(t / 220 + p.ph * 3);
        const a = p.life * flick * clamp(p.y / h, 0, 1);   // haipuu ylhaalla
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, `hsla(${o.hue + flick * 18},100%,68%,${a})`);
        g.addColorStop(1, `hsla(${o.hue},100%,50%,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.r * 5, p.y - p.r * 5, p.r * 10, p.r * 10);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    resize();
    addEventListener('resize', resize);
    gsap.ticker.add(() => frame(performance.now()));
    // ei piirretä kun osio on poissa ruudulta
    ScrollTrigger.create({
      trigger: canvas, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => { vis = s.isActive; if (!vis) ctx.clearRect(0, 0, w, h); }
    });
    return { resize };
  }
  embers($('#embers'), { density: 1 });
  embers($('#embers2'), { density: 0.7, rise: 34, hue: 18 });

  /* ---------------------------------------------------------- 4. hero */
  const heroLines = $$('.hero__title .ln > span');
  if (heroLines.length) {
    // Maski (overflow:hidden) tarvitaan vain nousun ajaksi. Se puretaan heti
    // perään, jottei mikään kirjain voi jäädä leikkautuneeksi lepotilassa —
    // Anton-fontin ylä- ja alapidennykset eivät mahdu tiukkaan riviruutuun.
    const unmask = (el) => $$('.ln', el.closest('h1, h2') || document).forEach((n) => (n.style.overflow = 'visible'));
    if (reduced) { gsap.set(heroLines, { y: 0 }); unmask(heroLines[0]); }
    else gsap.to(heroLines, {
      y: 0, duration: 1.25, stagger: 0.09, ease: 'expo.out', delay: 0.15,
      onComplete: () => unmask(heroLines[0])
    });
  }
  gsap.fromTo('.hero__eyebrow', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1, delay: 0.1, ease: 'expo.out' });
  gsap.fromTo('.hero__meta', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1, delay: 0.55, ease: 'expo.out' });

  if (!reduced) {
    gsap.to('.hero__inner', {
      y: -90, opacity: 0.15, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.5 }
    });
  }

  /* yleinen parallaksi: data-para="0.22" = liikkuu 22 % osion korkeudesta */
  if (!reduced) $$('[data-para]').forEach((el) => {
    const amt = parseFloat(el.dataset.para) || 0.2;
    gsap.fromTo(el, { yPercent: -amt * 50 }, {
      yPercent: amt * 50, ease: 'none',
      scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: 0.4 }
    });
  });

  /* ---------------------------------------------------------- 5. marquee */
  $$('.marquee__track').forEach((track) => {
    const dir = +track.dataset.dir || 1;
    const w = track.scrollWidth / 4;          // sisalto on nelinkertainen
    gsap.set(track, { x: dir > 0 ? 0 : -w });
    if (reduced) return;
    const tw = gsap.to(track, {
      x: dir > 0 ? -w : 0, duration: 22, ease: 'none', repeat: -1,
      modifiers: { x: (x) => (parseFloat(x) % w) + 'px' }
    });
    // vieritysnopeus kiihdyttaa nauhaa ja kaantaa sen suunnan
    let last = 0;
    ScrollTrigger.create({
      onUpdate: (self) => {
        const v = clamp(self.getVelocity() / 900, -4, 4);
        tw.timeScale(1 + Math.abs(v));
        if (Math.sign(v) && Math.sign(v) !== last) { last = Math.sign(v); }
      }
    });
  });

  /* ---------------------------------------------------------- 6. tarina */
  const fig = $('.story__figure');
  if (fig && !reduced) {
    gsap.to(fig.querySelector('.cover'), {
      scaleY: 0, duration: 1.35, ease: 'expo.inOut',
      scrollTrigger: { trigger: fig, start: 'top 78%' }
    });
  } else if (fig) {
    gsap.set(fig.querySelector('.cover'), { scaleY: 0 });
  }

  /* torni piirtyy vierittaessa: 48 avointa vetoa, pathLength=1000 */
  const tower = $('#tower');
  if (tower) {
    const paths = $$('path, circle', tower).sort((a, b) => (+a.dataset.i || 0) - (+b.dataset.i || 0));
    paths.forEach((p) => { p.style.strokeDasharray = '1000'; p.style.strokeDashoffset = reduced ? '0' : '1000'; });
    if (!reduced) {
      const n = paths.length, span = 0.42;
      ScrollTrigger.create({
        trigger: '.story', start: 'top 85%', end: 'bottom 55%', scrub: 0.6,
        onUpdate: (self) => {
          const p = self.progress;
          for (let i = 0; i < n; i++) {
            const a = (n > 1 ? i / (n - 1) : 0) * (1 - span);
            const t = clamp((p - a) / span, 0, 1);
            paths[i].style.strokeDashoffset = String(1000 * (1 - t));
          }
        }
      });
      gsap.fromTo(tower, { yPercent: 6 }, {
        yPercent: -6, ease: 'none',
        scrollTrigger: { trigger: '.story', start: 'top bottom', end: 'bottom top', scrub: 0.5 }
      });
    }
  }

  /* ---------------------------------------------------------- 7. paljastukset */
  $$('[data-rise]').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.95, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });
  $$('[data-split]').forEach((el) => {
    const ws = $$('.w > span', el);
    const open = () => $$('.w', el).forEach((w) => (w.style.overflow = 'visible'));
    if (reduced) { gsap.set(ws, { y: 0 }); open(); return; }
    gsap.to(ws, {
      y: 0, duration: 1.05, stagger: 0.055, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
      onComplete: open
    });
  });

  /* ---------------------------------------------------------- 8. ruokalista */
  const track = $('#menuTrack'), vp = $('#menuViewport'), rail = $('#menuRail');
  if (track && vp) {
    const distance = () => Math.max(0, track.scrollWidth - vp.clientWidth + 32);
    // Suosikkeja on viisi, joten leveällä ruudulla ne voivat mahtua kerralla
    // näkyviin. Silloin pinnaus jumittaisi sivun paikalleen ilman että mikään
    // liikkuu — pidetään osio tavallisena.
    if (!reduced && !coarse && distance() > 80) {
      gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: {
          trigger: '.menu', start: 'top top', end: () => '+=' + distance(),
          pin: true, scrub: 0.55, invalidateOnRefresh: true,
          onUpdate: (self) => { if (rail) gsap.set(rail, { scaleX: self.progress }); }
        }
      });
    } else if (coarse || distance() > 0) {
      // kosketuslaitteet (ja mahtuva lista) vierittavat itse
      vp.style.overflowX = 'auto';
      vp.style.scrollSnapType = 'x mandatory';
      $$('.mcard', track).forEach((c) => (c.style.scrollSnapAlign = 'start'));
    }

    // suodatus: kortit himmenevat, eivat katoa -> vaakamitta pysyy vakiona
    // eika pinnattu osio hyppaa suodattaessa. (Suodattimet ovat kaytossa vain
    // jos markupissa on .chip-nappeja.)
    $$('.chip').forEach((chip) => chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      $$('.chip').forEach((c) => {
        const on = c === chip;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', String(on));
      });
      $$('.mcard', track).forEach((card) => {
        card.classList.toggle('is-dim', f !== 'all' && card.dataset.cat !== f);
      });
    }));
  }

  /* ---------------------------------------------------------- 9. luvut */
  /* Lopullinen luku on valmiiksi HTML:ssä, joten se näkyy aina — myös ilman
     JavaScriptiä, vähennetyllä liikkeellä tai jos vieritysanimaatio ei laukea.
     Laskenta nollasta aloitetaan vasta, kun luku oikeasti tulee näkyviin. */
  const counters = $$('[data-count]');
  if (!reduced && 'IntersectionObserver' in window) {
    const run = (el) => {
      const to = +el.dataset.count, sfx = el.dataset.suffix || '';
      const t0 = performance.now(), dur = 1600;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(to * (1 - Math.pow(2, -10 * k))) + sfx;
        if (k < 1) requestAnimationFrame(step);
        else el.textContent = to + sfx;
      };
      requestAnimationFrame(step);
    };
    const cio = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      run(e.target);
    }), { threshold: 0.4 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------------------------------------------------------- 10. galleria */
  const gvp = $('#galViewport'), gtr = $('#galTrack'), gbar = $('#galBar');
  if (gvp && gtr) {
    let x = 0, max = 0, drag = null;
    const measure = () => { max = Math.max(0, gtr.scrollWidth - gvp.clientWidth); };
    const apply = (snap) => {
      x = clamp(x, -max, 0);
      gsap.to(gtr, { x, duration: snap ? 0.75 : 0.35, ease: 'expo.out', overwrite: true });
      if (gbar) gsap.to(gbar, { scaleX: max ? -x / max : 0, duration: 0.4, ease: 'expo.out' });
    };
    const step = () => ($('.gslide', gtr) || {}).offsetWidth + 20 || 320;
    measure(); addEventListener('resize', () => { measure(); apply(); });

    $('#galNext').addEventListener('click', () => { x -= step(); apply(true); });
    $('#galPrev').addEventListener('click', () => { x += step(); apply(true); });

    // raahaus hiirella ja sormella
    gvp.addEventListener('pointerdown', (e) => {
      drag = { sx: e.clientX, ox: x };
      gvp.classList.add('is-drag');
      gvp.setPointerCapture(e.pointerId);
    });
    gvp.addEventListener('pointermove', (e) => {
      if (!drag) return;
      x = drag.ox + (e.clientX - drag.sx) * 1.15;
      apply();
    });
    const end = () => { if (drag) { drag = null; gvp.classList.remove('is-drag'); apply(true); } };
    gvp.addEventListener('pointerup', end);
    gvp.addEventListener('pointercancel', end);
    // estetaan kuvien natiivi raahaus, joka keskeyttaisi eleen
    $$('img', gtr).forEach((i) => i.addEventListener('dragstart', (e) => e.preventDefault()));
  }

  /* ---------------------------------------------------------- 11. auki nyt */
  /* Aukioloajat luetaan taulukosta, jotta HTML on ainoa totuuden lahde. */
  function hours() {
    return $$('.hours tr').map((tr) => {
      const [a, b] = tr.cells[1].textContent.split('–').map((s) => {
        const [h, m] = s.trim().split('.').map(Number);
        return h * 60 + m;
      });
      return { day: +tr.dataset.day, open: a, close: b, name: tr.cells[0].textContent, tr };
    });
  }
  function updateStatus() {
    const rows = hours();
    if (!rows.length) return;
    const now = new Date();
    const day = (now.getDay() + 6) % 7;                 // ma=0
    const min = now.getHours() * 60 + now.getMinutes();
    const today = rows[day];
    const open = min >= today.open && min < today.close;
    const fmt = (m) => `${Math.floor(m / 60)}.${String(m % 60).padStart(2, '0')}`;

    const box = $('#status'), txt = $('#statusText');
    box.classList.toggle('is-open', open);
    box.classList.toggle('is-closed', !open);
    txt.textContent = open
      ? `${_('Auki nyt · sulkeutuu')} ${fmt(today.close)}`
      : (min < today.open
          ? `${_('Suljettu · avaamme')} ${fmt(today.open)}`
          : _('Suljettu tältä päivältä'));

    rows.forEach((r) => r.tr.classList.toggle('is-today', r.day === day));

    const nc = $('#nextChange');
    if (nc) {
      if (open) nc.textContent = `${_('Suljemme tänään klo')} ${fmt(today.close)}.`;
      else if (min < today.open) nc.textContent = `${_('Avaamme tänään klo')} ${fmt(today.open)}.`;
      else {
        const nxt = rows[(day + 1) % 7];
        /* suomeksi "maanantaina", englanniksi "on Monday" */
        const dayName = T['Seuraavan kerran auki'] ? nxt.name : nxt.name.toLowerCase() + 'na';
        nc.textContent = `${_('Seuraavan kerran auki')} ${dayName} ${_('klo')} ${fmt(nxt.open)}.`;
      }
    }
  }
  updateStatus();
  setInterval(updateStatus, 60000);
  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------- 12. hehku */
  const glow = $('.glow');
  if (glow && !coarse && !reduced) {
    const q = { x: gsap.quickTo(glow, 'x', { duration: 0.7, ease: 'power3' }),
                y: gsap.quickTo(glow, 'y', { duration: 0.7, ease: 'power3' }) };
    addEventListener('pointermove', (e) => { q.x(e.clientX); q.y(e.clientY); }, { passive: true });
  }

  /* ---------------------------------------------------------- 13. tahdet */
  const rateBox = $('#rateStars');
  if (rateBox) {
    const labels = $$('.rate__s', rateBox);
    const paint = (upto) => labels.forEach((l, i) => l.classList.toggle('on', i < upto));
    const chosen = () => labels.findIndex((l) => l.querySelector('input').checked) + 1;
    labels.forEach((l, i) => {
      l.addEventListener('pointerenter', () => paint(i + 1));
      l.addEventListener('click', () => paint(i + 1));
      l.querySelector('input').addEventListener('focus', () => paint(i + 1));
    });
    rateBox.addEventListener('pointerleave', () => paint(chosen()));
  }

  /* ------------------------------------------------ 13b. arviokaruselli */
  const revTrack = $('#revTrack');
  if (revTrack) {
    const cards = $$('.rcard', revTrack);
    const dots = $$('.revdot', $('#revDots'));
    const step = () => (cards[0] ? cards[0].offsetWidth + 19 : 300);
    const current = () => Math.round(revTrack.scrollLeft / step());
    const paint = () => {
      const i = Math.min(dots.length - 1, Math.max(0, current()));
      dots.forEach((d, n) => d.classList.toggle('is-on', n === i));
    };
    const go = (i) => revTrack.scrollTo({ left: i * step(), behavior: reduced ? 'auto' : 'smooth' });
    $('#revPrev').addEventListener('click', () => go(Math.max(0, current() - 1)));
    $('#revNext').addEventListener('click', () => go(Math.min(cards.length - 1, current() + 1)));
    dots.forEach((d) => d.addEventListener('click', () => go(+d.dataset.i)));
    revTrack.addEventListener('scroll', paint, { passive: true });
    paint();

    /* Automaattinen kierto. Pysähtyy kun kävijä koskee karuselliin, kun osio
       ei ole näkyvissä tai kun selain on pyytänyt vähemmän liikettä. */
    let timer = null, visible = false, held = false;
    const ADVANCE = 5000;
    const tick = () => {
      const last = cards.length - 1;
      const i = current();
      go(i >= last ? 0 : i + 1);
    };
    const start = () => {
      if (timer || reduced || !visible || held || cards.length < 2) return;
      timer = setInterval(tick, ADVANCE);
    };
    const stop = () => { clearInterval(timer); timer = null; };
    const hold = () => { held = true; stop(); };
    const release = () => { held = false; start(); };

    ['pointerenter', 'focusin', 'pointerdown', 'touchstart'].forEach((ev) =>
      revTrack.addEventListener(ev, hold, { passive: true }));
    ['pointerleave', 'focusout'].forEach((ev) =>
      revTrack.addEventListener(ev, release, { passive: true }));
    $$('#revPrev, #revNext, .revdot').forEach((el) => {
      el.addEventListener('pointerenter', hold, { passive: true });
      el.addEventListener('pointerleave', release, { passive: true });
      el.addEventListener('click', () => { hold(); setTimeout(release, 8000); });
    });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      visible ? start() : stop();
    }, { threshold: 0.25 }).observe(revTrack);
  }

  /* -------------------------------------------------- 14b. kiitos + Google */
  const thanks = $('#thanks'), copyBtn = $('#thanksCopy'), copied = $('#thanksCopied');
  let lastText = '';
  const copyText = async () => {
    if (!lastText) return;
    try {
      await navigator.clipboard.writeText(lastText);
      copied.textContent = _('Teksti kopioitu — liitä se Googlen arviokenttään.');
    } catch (err) {
      /* Leikepöytä voi olla estetty (vanha selain, ei HTTPS). Silloin
         näytetään teksti valittuna, jotta sen voi kopioida käsin. */
      let ta = $('.thanks__fallback', thanks);
      if (!ta) {
        ta = document.createElement('textarea');
        ta.className = 'thanks__fallback';
        ta.readOnly = true;
        copied.after(ta);
      }
      ta.value = lastText;
      copied.textContent = _('Kopioi teksti tästä:');
      ta.select();
    }
  };
  function showThanks(text) {
    if (!thanks) return;
    const old = $('.thanks__fallback', thanks);
    if (old) old.remove();
    lastText = text;
    if (copyBtn) copyBtn.hidden = !text;
    copied.textContent = '';
    thanks.hidden = false;
    thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
    copyText();
  }
  if (copyBtn) copyBtn.addEventListener('click', copyText);

  /* ---------------------------------------------------------- 14. lomake */
  const form = $('#reviewForm'), msg = $('#reviewMsg');
  if (form) {
    const say = (text, cls) => { msg.textContent = text; msg.className = 'leave__msg ' + (cls || ''); };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const bad = [];
      $$('.fld', form).forEach((f) => f.classList.remove('is-bad'));
      if (!data.get('stars')) bad.push(_('arvosana'));
      ['name', 'text'].forEach((k) => {
        if (!String(data.get(k) || '').trim()) {
          bad.push(k === 'name' ? _('nimi') : _('arvio'));
          form.querySelector(`[name="${k}"]`).closest('.fld').classList.add('is-bad');
        }
      });
      if (bad.length) return say(_('Täydennä vielä:') + ' ' + bad.join(', ') + '.', 'bad');

      /* Vastaanottaja asetetaan lomakkeen data-endpoint-attribuutilla. Ilman
         sitä arviota ei lähetetä minnekään — silloin EI väitetä että se meni
         perille, vaan ohjataan Googleen. Ks. README. */
      const endpoint = form.dataset.endpoint;
      if (!endpoint) {
        return say(_('Lomaketta ei ole vielä kytketty vastaanottajaan. Voit jättää arvion Googlessa yllä olevasta linkistä.'), 'bad');
      }
      try {
        say(_('Lähetetään…'));
        const r = await fetch(endpoint, { method: 'POST', body: data });
        if (!r.ok) throw new Error(r.status);
        const written = String(data.get('text') || '').trim();
        form.reset();
        $$('.rate__s', form).forEach((l) => l.classList.remove('on'));
        say('');
        /* Arviota EI voi julkaista Googleen puolesta — Google ei tarjoa siihen
           rajapintaa, ja toisen nimissä kirjoitettu arvio on väärennös. Siksi
           teksti kopioidaan leikepöydälle ja kävijä julkaisee sen itse.
           Kiitosnäkymä näytetään kaikille arvosanasta riippumatta: hyvien
           arvioiden ohjaaminen Googleen ja huonojen piilottaminen (review
           gating) on Googlen sääntöjen vastaista. */
        showThanks(written);
      } catch (err) {
        say(_('Lähetys ei onnistunut. Kokeile hetken päästä uudelleen tai soita meille.'), 'bad');
      }
    });
  }

  // kuvat voivat muuttaa mittoja -> paivitetaan ankkurit kun kaikki on ladattu
  addEventListener('load', () => ScrollTrigger.refresh());
})();
