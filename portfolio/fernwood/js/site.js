/* ==========================================================
   Fernwood Animal Clinic — page behaviour
   One rAF loop owns everything scroll-dependent. Events only
   raise a dirty flag, so no layout is read inside a handler.
========================================================== */

(function () {
'use strict';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;


/* ---------- start-up gate ----------
   Holds the site behind a curtain until the hero photograph has
   genuinely decoded, so the reveal never lands on a grey box.
   Enter lifts seven slats in sequence, blooms a warm wash out of
   the button, and only then releases the hero's own entrance. */

(function gate () {
  const gate = $('#gate');
  if (!gate) return;

  const btn = $('#gateBtn');
  const txt = $('#gateTxt');
  const bar = $('#gateBar');
  const img = $('#heroImg');

  document.documentElement.classList.add('is-gated');
  document.body.classList.add('is-gated');

  let pct = 0;
  const creep = setInterval(() => {
    pct = Math.min(92, pct + 4 + Math.random() * 9);
    if (bar) bar.style.width = pct + '%';
  }, 120);

  function ready () {
    clearInterval(creep);
    if (bar) bar.style.width = '100%';
    gate.classList.add('is-ready');
    btn.disabled = false;
    txt.textContent = 'Enter';
  }

  // wait on the actual decode, but never hang on a slow network
  const done = img && img.decode
    ? img.decode().catch(() => {})
    : new Promise((r) => {
        if (!img || img.complete) return r();
        img.addEventListener('load', r, { once: true });
        img.addEventListener('error', r, { once: true });
      });

  Promise.race([done, new Promise((r) => setTimeout(r, 4500))]).then(() => {
    setTimeout(ready, 260);
  });

  function open () {
    if (btn.disabled) return;
    btn.disabled = true;
    gate.classList.add('is-leaving');

    // release the hero animations as the last slat clears
    setTimeout(() => {
      document.documentElement.classList.remove('is-gated');
      document.body.classList.remove('is-gated');
      document.body.classList.add('is-open');
      scrollTo(0, 0);
    }, 620);

    setTimeout(() => gate.remove(), 1700);
  }

  btn.addEventListener('click', open);
  addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !btn.disabled && document.activeElement !== btn) {
      e.preventDefault();
      open();
    }
  });
})();

/* ---------- split headlines into per-word masks ---------- */

$$('[data-split]').forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const span = document.createElement('span');
    span.className = 'word';
    const inner = document.createElement('i');
    inner.textContent = w;
    inner.style.transitionDelay = `${Math.min(i * 44, 620)}ms`;
    span.appendChild(inner);
    el.appendChild(span);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
});

/* ---------- reveal on entry ---------- */

const targets = $$('[data-reveal], [data-split]');
if (reduced) {
  targets.forEach((el) => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver((es) => {
    es.filter((e) => e.isIntersecting).forEach((e, i) => {
      setTimeout(() => e.target.classList.add('is-in'), i * 88);
      io.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -7% 0px' });
  targets.forEach((el) => io.observe(el));
}

/* ---------- self-drawing line art ----------
   Each stroke is dashed to exactly its own length so the dash can
   never repeat, then released on entry. */

$$('[data-draw]').forEach((svg) => {
  $$('path, circle, rect', svg).forEach((el, i) => {
    let len = 400;
    if (el.getTotalLength) {
      try { len = el.getTotalLength(); } catch (_) { /* keep fallback */ }
    }
    if (!len || !isFinite(len)) {
      const w = +el.getAttribute('width') || 0;
      const h = +el.getAttribute('height') || 0;
      len = w && h ? 2 * (w + h) : 400;
    }
    el.style.setProperty('--len', Math.ceil(len) + 2);
    el.style.setProperty('--d', `${Math.min(i * 130, 900)}ms`);
  });

  if (reduced) { svg.classList.add('is-drawn'); return; }
  const dio = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-drawn');
      dio.unobserve(e.target);
    });
  }, { threshold: 0.4 });
  dio.observe(svg);
});

/* ---------- counters ---------- */

$$('[data-count]').forEach((el) => {
  const to  = parseFloat(el.dataset.count);
  const suf = el.dataset.suffix || '';
  const fmt = (v) => (to >= 1000 ? Math.round(v).toLocaleString('en-US') : Math.round(v)) + suf;

  if (reduced) { el.textContent = fmt(to); return; }

  const cio = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      let t0 = null;
      const step = (now) => {
        if (t0 === null) t0 = now;
        const p = clamp((now - t0) / 1600);
        el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      cio.unobserve(e.target);
    });
  }, { threshold: 0.5 });
  cio.observe(el);
});

/* ---------- ticker ---------- */

(function ticker () {
  const row = $('.ticker__row');
  if (!row || reduced) return;
  let x = 0, half = row.scrollWidth / 2;
  addEventListener('resize', () => { half = row.scrollWidth / 2; }, { passive: true });
  (function run () {
    x -= 0.5;
    if (half && -x >= half) x += half;
    row.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    requestAnimationFrame(run);
  })();
})();

/* ---------- draggable track (carousel + testimonials) ---------- */

function makeTrack ({ view, track, onIndex }) {
  let x = 0, want = 0, raf = null;
  let down = false, startX = 0, startWant = 0, lastX = 0, vel = 0;

  const slides = () => [...track.children];
  const maxScroll = () => Math.max(0, track.scrollWidth - view.clientWidth);

  function positions () {
    const base = track.getBoundingClientRect().left - x;
    return slides().map((s) => s.getBoundingClientRect().left - base);
  }
  function nearest (to) {
    const ps = positions();
    let best = 0, d = Infinity;
    ps.forEach((p, i) => { const dd = Math.abs(p + to); if (dd < d) { d = dd; best = i; } });
    return best;
  }
  function paint () {
    x = lerp(x, want, reduced ? 1 : 0.14);
    track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    if (Math.abs(x - want) > 0.4) raf = requestAnimationFrame(paint);
    else { raf = null; track.style.transform = `translate3d(${want.toFixed(2)}px,0,0)`; }
  }
  const nudge = () => { if (!raf) raf = requestAnimationFrame(paint); };

  function settle () {
    const i = nearest(want);
    want = -Math.min(positions()[i], maxScroll());
    if (onIndex) onIndex(i, slides().length);
  }

  view.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    down = true; startX = lastX = e.clientX; startWant = want; vel = 0;
    view.classList.add('is-drag');
    view.setPointerCapture(e.pointerId);
  });
  view.addEventListener('pointermove', (e) => {
    if (!down) return;
    vel = e.clientX - lastX; lastX = e.clientX;
    want = clamp(startWant + (e.clientX - startX), -maxScroll(), 0);
    nudge();
  });
  function release () {
    if (!down) return;
    down = false;
    view.classList.remove('is-drag');
    want = clamp(want + vel * 6, -maxScroll(), 0);
    settle(); nudge();
  }
  view.addEventListener('pointerup', release);
  view.addEventListener('pointercancel', release);

  // a drag must not also fire as a click on whatever is underneath
  view.addEventListener('click', (e) => {
    if (Math.abs(lastX - startX) > 6) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  view.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  { api.go(-1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { api.go(1);  e.preventDefault(); }
  });

  const api = {
    go (dir) {
      const i = clamp(nearest(want) + dir, 0, slides().length - 1);
      want = -Math.min(positions()[i], maxScroll());
      if (onIndex) onIndex(i, slides().length);
      nudge();
    },
    to (i) {
      const ps = positions();
      want = -Math.min(ps[clamp(i, 0, ps.length - 1)], maxScroll());
      if (onIndex) onIndex(i, slides().length);
      nudge();
    },
    index: () => nearest(want),
    refresh () { want = clamp(want, -maxScroll(), 0); nudge(); },
  };
  return api;
}

let carousel = null;
(function initCarousel () {
  const view = $('#carousel'), track = $('#cTrack'), bar = $('#cBar');
  if (!view || !track) return;
  const btns = $$('.cbtn');

  carousel = makeTrack({
    view, track,
    onIndex (i, n) {
      if (bar) {
        const span = Math.max(1, n - 1);
        bar.style.width = `${(100 / n).toFixed(2)}%`;
        bar.style.left  = `${((i / span) * (100 - 100 / n)).toFixed(2)}%`;
      }
      btns.forEach((b) => {
        const d = +b.dataset.dir;
        b.disabled = (d < 0 && i === 0) || (d > 0 && i >= n - 1);
      });
    },
  });
  btns.forEach((b) => b.addEventListener('click', () => carousel.go(+b.dataset.dir)));
  carousel.to(0);
})();

(function initQuotes () {
  const view = $('#qView'), track = $('#qTrack'), dotsW = $('#qDots');
  if (!view || !track) return;
  const slides = $$('.quote', track);
  let dots = [], timer = null;

  const t = makeTrack({
    view, track,
    onIndex (i) {
      slides.forEach((s, n) => s.classList.toggle('is-active', n === i));
      dots.forEach((d, n) => d.classList.toggle('is-on', n === i));
    },
  });

  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Testimonial ${i + 1}`);
    b.addEventListener('click', () => { t.to(i); restart(); });
    dotsW.appendChild(b);
  });
  dots = $$('button', dotsW);

  function restart () {
    clearInterval(timer);
    if (reduced) return;
    timer = setInterval(() => t.to((t.index() + 1) % slides.length), 6500);
  }
  view.addEventListener('pointerdown', restart);
  t.to(0);
  restart();
})();

/* ---------- ECG trace ----------
   A real lead-II shape rather than a sine: P wave, QRS spike,
   T wave, then baseline. It sweeps like a monitor. */

(function ecg () {
  const cv = $('#ecg');
  if (!cv) return;
  const c = cv.getContext('2d');
  let w = 0, h = 0, t = 0, raf = null;

  function size () {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 2);
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    cv.width = w * dpr; cv.height = h * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // one heartbeat, phase 0..1 -> vertical offset -1..1
  function beat (p) {
    if (p < 0.12) return 0;
    if (p < 0.20) return Math.sin((p - 0.12) / 0.08 * Math.PI) * 0.16;   // P
    if (p < 0.26) return 0;
    if (p < 0.29) return -(p - 0.26) / 0.03 * 0.22;                      // Q
    if (p < 0.33) return -0.22 + (p - 0.29) / 0.04 * 1.22;               // R
    if (p < 0.37) return 1.0 - (p - 0.33) / 0.04 * 1.38;                 // S
    if (p < 0.42) return -0.38 + (p - 0.37) / 0.05 * 0.38;
    if (p < 0.60) return Math.sin((p - 0.42) / 0.18 * Math.PI) * 0.30;   // T
    return 0;
  }

  function draw () {
    c.clearRect(0, 0, w, h);

    c.strokeStyle = 'rgba(23,33,29,0.09)';
    c.lineWidth = 1;
    for (let x = 0; x <= w; x += w / 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y <= h; y += h / 4)  { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }

    const mid = h / 2, amp = h * 0.34, CYCLES = 3.2;

    c.beginPath();
    for (let x = 0; x <= w; x++) {
      const p = ((x / w) * CYCLES + t) % 1;
      const y = mid - beat(p) * amp;
      x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.strokeStyle = '#2e6b4f';
    c.lineWidth = 2;
    c.lineJoin = 'round';
    c.shadowColor = 'rgba(46,107,79,0.45)';
    c.shadowBlur = 10;
    c.stroke();
    c.shadowBlur = 0;

    // the sweeping cursor dot
    const cx = ((-t % 1) + 1) % 1 * w;
    const cp = ((cx / w) * CYCLES + t) % 1;
    c.beginPath();
    c.arc(cx, mid - beat(cp) * amp, 4.5, 0, Math.PI * 2);
    c.fillStyle = '#f2a33c';
    c.fill();
  }

  function loop () { t += 0.0035; draw(); raf = requestAnimationFrame(loop); }

  size(); draw();
  addEventListener('resize', () => { size(); draw(); }, { passive: true });

  const vio = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting && !raf && !reduced) loop();
      else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
    });
  }, { threshold: 0 });
  vio.observe(cv);
})();


/* ---------- patients strip ----------
   A native horizontal scroller, so the page's vertical scroll is
   never hijacked. It drifts along on its own until you touch it,
   and stops drifting for good once you take over. */

(function strip () {
  const track = $('#galTrack');
  if (!track) return;

  const rail  = $('#galRail');
  const hint  = $('#galHint');
  const end   = $('#galEnd');

  let taken = false;          // has the visitor moved it themselves
  let hovering = false;
  let onScreen = false;
  let raf = null;

  const maxX = () => Math.max(0, track.scrollWidth - track.clientWidth);

  function sync () {
    const p = maxX() ? track.scrollLeft / maxX() : 0;
    if (rail) rail.style.width = `${(p * 100).toFixed(1)}%`;
    if (end) end.classList.toggle('is-live', p > 0.6);
    if (hint && p > 0.04) hint.classList.add('is-gone');
  }

  track.addEventListener('scroll', sync, { passive: true });

  /* --- drift --- */
  function drift () {
    raf = requestAnimationFrame(drift);
    if (taken || hovering || !onScreen || reduced) return;
    if (track.scrollLeft >= maxX() - 1) return;
    track.scrollLeft += 0.55;
  }

  const vio = new IntersectionObserver((es) => {
    es.forEach((e) => { onScreen = e.isIntersecting; });
  }, { threshold: 0.25 });
  vio.observe(track);

  track.addEventListener('pointerenter', () => { hovering = true; });
  track.addEventListener('pointerleave', () => { hovering = false; });
  ['wheel', 'touchstart', 'keydown'].forEach((ev) =>
    track.addEventListener(ev, () => { taken = true; }, { passive: true }));

  /* --- drag to pan --- */
  let down = false, startX = 0, startScroll = 0, moved = 0;

  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    down = true; taken = true; moved = 0;
    startX = e.clientX; startScroll = track.scrollLeft;
    track.classList.add('is-drag');
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    track.scrollLeft = startScroll - dx;
  });
  function release () {
    if (!down) return;
    down = false;
    track.classList.remove('is-drag');
  }
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
  track.addEventListener('click', (e) => {
    if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  sync();
  if (!reduced) raf = requestAnimationFrame(drift);
})();

/* ---------- form (front end only — no endpoint wired up) ---------- */

const form = $('#form');
if (form) {
  const note = $('#note');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    ['fn', 'fd', 'fp'].forEach((id) => {
      const f = document.getElementById(id);
      const bad = !f.value.trim();
      f.closest('.fld').classList.toggle('is-bad', bad);
      if (bad) ok = false;
    });
    if (!ok) {
      note.style.color = '#e4674c';
      note.textContent = 'We need your name, your dog’s name and a phone number.';
      return;
    }
    note.style.color = '';
    note.textContent = 'Thank you — we will call back the same working day.';
    form.reset();
    $$('.fld', form).forEach((f) => f.classList.remove('is-bad'));
  });
}

/* ---------- scroll engine ---------- */

const nav    = $('#nav');
const bar    = $('#progress span');
const stage  = $('.herostage');
const hero   = $('#hero');
const copy   = $('#heroCopy');
const vitals = $('#vitals');
const cue    = $('#cue');

let lastY = scrollY, dirty = true;
let mx = 0, my = 0, tmx = 0, tmy = 0;

const mark = () => { dirty = true; };
addEventListener('scroll', mark, { passive: true });
addEventListener('resize', () => { dirty = true; if (carousel) carousel.refresh(); }, { passive: true });

if (matchMedia('(pointer: fine)').matches && !reduced) {
  addEventListener('pointermove', (e) => {
    tmx = (e.clientX / innerWidth - 0.5) * -2;
    tmy = (e.clientY / innerHeight - 0.5) * -2;
  }, { passive: true });
}

function frame () {
  const vh = innerHeight;

  // mouse parallax runs every frame so it keeps moving when scroll stops
  if (hero) {
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;
    hero.style.setProperty('--px', (mx * 18).toFixed(2));
    hero.style.setProperty('--py', (my * 12).toFixed(2));
  }

  if (dirty) {
    dirty = false;
    const y = scrollY;
    const doc = document.documentElement.scrollHeight - vh;

    if (bar) bar.style.width = `${clamp(y / Math.max(doc, 1)) * 100}%`;

    if (nav && stage) {
      nav.classList.toggle('is-solid', y > stage.offsetHeight - vh * 0.5);
      const down = y > lastY && y > vh * 0.85;
      nav.classList.toggle('is-away', down && Math.abs(y - lastY) > 4);
    }

    if (stage && hero) {
      const p = clamp(y / Math.max(stage.offsetHeight - vh, 1));

      if (copy) {
        const o = 1 - clamp((p - 0.06) / 0.3);
        copy.style.opacity = o;
        copy.style.transform = `translateY(calc(-50% - ${(1 - o) * 46}px))`;
      }
      if (vitals) vitals.style.opacity = 1 - clamp((p - 0.2) / 0.3);
      if (cue) cue.style.opacity = 1 - clamp(p / 0.12);

      // the photograph pushes back and darkens as the page takes over
      hero.style.filter = `brightness(${1 - 0.42 * clamp((p - 0.55) / 0.45)})`;
      const plate = $('#heroPlate img');
      // gentle dolly, kept shallow so the plate is never upscaled far
      if (plate) plate.style.setProperty('--zoom', (1.055 + p * 0.09).toFixed(3));
    }

    lastY = y;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- anchors ---------- */

$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    scrollTo({ top: t.getBoundingClientRect().top + scrollY - 70, behavior: reduced ? 'auto' : 'smooth' });
  });
});

})();
