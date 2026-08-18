/* ===============================================================
   Ardenwood — page behaviour

   One rAF loop drives everything that depends on scroll position
   (progress bar, nav, the hero light sequence, the pinned gallery,
   parallax). Scroll listeners only set a dirty flag; nothing reads
   layout inside an event handler, so there's no thrash.
================================================================*/

(function () {
'use strict';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;

/* ---------------------------------------------------------------
   Split headlines into per-word masks
----------------------------------------------------------------*/

$$('[data-split]').forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const span = document.createElement('span');
    span.className = 'word';
    const inner = document.createElement('i');
    inner.textContent = w;
    inner.style.transitionDelay = `${Math.min(i * 42, 620)}ms`;
    span.appendChild(inner);
    el.appendChild(span);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
});

/* ---------------------------------------------------------------
   Reveal on entry
----------------------------------------------------------------*/

const revealTargets = $$('[data-reveal], [data-split]');

if (reduced) {
  revealTargets.forEach((el) => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e, i) => {
      setTimeout(() => e.target.classList.add('is-in'), i * 90);
      io.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

  revealTargets.forEach((el) => io.observe(el));
}

/* ---------------------------------------------------------------
   Self-drawing elevations

   Every stroke gets dashed to exactly its own length so the dash
   gap can't repeat, then the offset is released on entry. Strokes
   are staggered in document order, which is roughly ground-up.
----------------------------------------------------------------*/

$$('[data-draw]').forEach((svg) => {
  const strokes = $$('path, rect', svg);
  strokes.forEach((el, i) => {
    const len = Math.ceil(el.getTotalLength ? el.getTotalLength() : 400) + 2;
    el.style.setProperty('--len', len);
    el.style.setProperty('--d', `${Math.min(i * 55, 1200)}ms`);
  });

  if (reduced) { svg.classList.add('is-drawn'); return; }

  const dio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-drawn');
      dio.unobserve(e.target);
    });
  }, { threshold: 0.3 });
  dio.observe(svg);
});

/* SVG <rect> has no getTotalLength in every engine — fall back to
   its perimeter so the dash still matches the shape. */
$$('[data-draw] rect').forEach((r) => {
  if (r.style.getPropertyValue('--len') !== '402') return;
  const w = +r.getAttribute('width'), h = +r.getAttribute('height');
  r.style.setProperty('--len', 2 * (w + h) + 2);
});

/* ---------------------------------------------------------------
   Counters
----------------------------------------------------------------*/

function runCount(el) {
  const target = parseFloat(el.dataset.count);
  const dec    = parseInt(el.dataset.dec || '0', 10);
  const pre    = el.dataset.prefix || '';
  const suf    = el.dataset.suffix || '';
  const DUR    = 1700;
  let t0 = null;

  if (reduced) { el.textContent = pre + target.toFixed(dec) + suf; return; }

  function step(now) {
    if (t0 === null) t0 = now;
    const p = clamp((now - t0) / DUR);
    el.textContent = pre + (target * (1 - Math.pow(1 - p, 3))).toFixed(dec) + suf;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const counters = $$('[data-count]');
if (counters.length) {
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      runCount(e.target);
      cio.unobserve(e.target);
    });
  }, { threshold: 0.5 });
  counters.forEach((el) => cio.observe(el));
}

/* ---------------------------------------------------------------
   Day / night comparison slider
----------------------------------------------------------------*/

(function compare() {
  const box  = $('#cmp');
  if (!box) return;
  const clip = $('#cmpClip');
  const bar  = $('#cmpBar');

  let pos = 0.5;          // where the wipe sits
  let want = 0.5;         // where the pointer wants it
  let raf = null;
  let dragging = false;

  function paint() {
    pos = lerp(pos, want, reduced ? 1 : 0.18);
    const pct = pos * 100;
    clip.style.clipPath = `inset(0 ${(100 - pct).toFixed(2)}% 0 0)`;
    bar.style.left = `${pct.toFixed(2)}%`;
    box.setAttribute('aria-valuenow', Math.round(pct));

    if (Math.abs(pos - want) > 0.0008) raf = requestAnimationFrame(paint);
    else raf = null;
  }
  function nudge() { if (!raf) raf = requestAnimationFrame(paint); }

  function fromEvent(e) {
    const r = box.getBoundingClientRect();
    want = clamp((e.clientX - r.left) / r.width);
    nudge();
  }

  box.addEventListener('pointerdown', (e) => {
    dragging = true;
    box.setPointerCapture(e.pointerId);
    fromEvent(e);
  });
  box.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
  box.addEventListener('pointerup',     () => { dragging = false; });
  box.addEventListener('pointercancel', () => { dragging = false; });

  // hovering alone glides the wipe — invites the drag
  box.addEventListener('pointermove', (e) => {
    if (!dragging && e.pointerType === 'mouse') fromEvent(e);
  });

  box.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 0.1 : 0.04;
    if (e.key === 'ArrowLeft')  { want = clamp(want - step); nudge(); e.preventDefault(); }
    if (e.key === 'ArrowRight') { want = clamp(want + step); nudge(); e.preventDefault(); }
    if (e.key === 'Home')       { want = 0; nudge(); e.preventDefault(); }
    if (e.key === 'End')        { want = 1; nudge(); e.preventDefault(); }
  });
})();

/* ---------------------------------------------------------------
   Draggable track
   Shared by the portfolio carousel and the testimonials. Pointer
   drag with inertia, snapping to whichever slide ends up nearest.
----------------------------------------------------------------*/

function makeTrack({ view, track, onIndex, snapAll }) {
  let x = 0, want = 0, raf = null;
  let down = false, startX = 0, startWant = 0, lastX = 0, vel = 0;

  const slides = () => [...track.children];

  function maxScroll() {
    return Math.max(0, track.scrollWidth - view.clientWidth);
  }

  function slidePositions() {
    const base = track.getBoundingClientRect().left - x;
    return slides().map((s) => s.getBoundingClientRect().left - base);
  }

  function nearest(to) {
    const ps = slidePositions();
    let best = 0, d = Infinity;
    ps.forEach((p, i) => { const dd = Math.abs(p + to); if (dd < d) { d = dd; best = i; } });
    return best;
  }

  function settle() {
    const i = nearest(want);
    const ps = slidePositions();
    want = -Math.min(ps[i], maxScroll());
    if (onIndex) onIndex(i, slides().length);
  }

  function paint() {
    x = lerp(x, want, reduced ? 1 : 0.14);
    track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    if (Math.abs(x - want) > 0.4) raf = requestAnimationFrame(paint);
    else { raf = null; track.style.transform = `translate3d(${want.toFixed(2)}px,0,0)`; }
  }
  function nudge() { if (!raf) raf = requestAnimationFrame(paint); }

  view.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    down = true;
    startX = lastX = e.clientX;
    startWant = want;
    vel = 0;
    view.classList.add('is-drag');
    view.setPointerCapture(e.pointerId);
  });

  view.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    vel = e.clientX - lastX;
    lastX = e.clientX;
    want = clamp(startWant + dx, -maxScroll(), 0);
    nudge();
  });

  function release() {
    if (!down) return;
    down = false;
    view.classList.remove('is-drag');
    want = clamp(want + vel * 6, -maxScroll(), 0);
    if (snapAll !== false) settle(); else if (onIndex) onIndex(nearest(want), slides().length);
    nudge();
  }
  view.addEventListener('pointerup', release);
  view.addEventListener('pointercancel', release);

  // a drag shouldn't also count as a click on the card underneath
  view.addEventListener('click', (e) => {
    if (Math.abs(lastX - startX) > 6) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  view.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  { api.go(-1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { api.go(1);  e.preventDefault(); }
  });

  const api = {
    go(dir) {
      const i = clamp(nearest(want) + dir, 0, slides().length - 1);
      const ps = slidePositions();
      want = -Math.min(ps[i], maxScroll());
      if (onIndex) onIndex(i, slides().length);
      nudge();
    },
    to(i) {
      const ps = slidePositions();
      want = -Math.min(ps[clamp(i, 0, ps.length - 1)], maxScroll());
      if (onIndex) onIndex(i, slides().length);
      nudge();
    },
    index: () => nearest(want),
    refresh: () => { want = clamp(want, -maxScroll(), 0); nudge(); },
  };
  return api;
}

/* ---------------------------------------------------------------
   Portfolio carousel
----------------------------------------------------------------*/

let carousel = null;
(function initCarousel() {
  const view  = $('#carousel');
  const track = $('#cTrack');
  const bar   = $('#cBar');
  if (!view || !track) return;

  const btns = $$('.cbtn');

  carousel = makeTrack({
    view, track,
    onIndex(i, n) {
      if (bar) {
        const span = Math.max(1, n - 1);
        bar.style.width = `${(100 / n).toFixed(2)}%`;
        bar.style.left  = `${((i / span) * (100 - 100 / n)).toFixed(2)}%`;
      }
      btns.forEach((b) => {
        const dir = +b.dataset.dir;
        b.disabled = (dir < 0 && i === 0) || (dir > 0 && i >= n - 1);
      });
    },
  });

  btns.forEach((b) => b.addEventListener('click', () => carousel.go(+b.dataset.dir)));
  carousel.to(0);
})();

/* ---------------------------------------------------------------
   Testimonials
----------------------------------------------------------------*/

(function initQuotes() {
  const view  = $('#qView');
  const track = $('#qTrack');
  const dotsW = $('#quoteDots');
  if (!view || !track) return;

  const slides = $$('.quote', track);
  let dots = [];
  let timer = null;

  const t = makeTrack({
    view, track,
    onIndex(i) {
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

  function restart() {
    clearInterval(timer);
    if (reduced) return;
    timer = setInterval(() => {
      const next = (t.index() + 1) % slides.length;
      t.to(next);
    }, 6500);
  }

  view.addEventListener('pointerdown', restart);
  t.to(0);
  restart();
})();

/* ---------------------------------------------------------------
   Contour art
   Concentric offset rings, like a site plan's level lines, drifting
   very slowly. Drawn once per resize into an offscreen path set and
   redrawn each frame with a phase offset.
----------------------------------------------------------------*/

(function contours() {
  const cv = $('#contours');
  if (!cv) return;
  const c = cv.getContext('2d');
  let w = 0, h = 0, dpr = 1, t = 0, raf = null;

  function size() {
    const r = cv.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = w * dpr;
    cv.height = h * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(169,127,69,0.30)';
    c.lineWidth = 1;

    const cx = w * 0.78, cy = h * 0.42;
    const RINGS = 26;

    for (let i = 0; i < RINGS; i++) {
      const r = 40 + i * 34;
      c.globalAlpha = 0.10 + 0.5 * (1 - i / RINGS);
      c.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.09) {
        // three detuned harmonics keep the rings from looking circular
        const wob =
          Math.sin(a * 3 + i * 0.42 + t * 0.22) * 16 +
          Math.sin(a * 5 - i * 0.28 - t * 0.14) * 9 +
          Math.sin(a * 2 + t * 0.09) * 12;
        const rr = r + wob;
        const x = cx + Math.cos(a) * rr * 1.25;
        const y = cy + Math.sin(a) * rr * 0.72;
        a === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  function loop() { t += 0.006; draw(); raf = requestAnimationFrame(loop); }

  const vio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && !raf && !reduced) loop();
      else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
    });
  }, { threshold: 0 });

  size();
  draw();
  vio.observe(cv);
  window.addEventListener('resize', () => { size(); draw(); }, { passive: true });
})();

/* ---------------------------------------------------------------
   Enquiry form (front-end only — no endpoint wired up)
----------------------------------------------------------------*/

const form = $('#form');
if (form) {
  const note = $('#formNote');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;

    ['f-name', 'f-email'].forEach((id) => {
      const input = document.getElementById(id);
      const bad = !input.value.trim() ||
                  (input.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value));
      input.closest('.field').classList.toggle('is-bad', bad);
      if (bad) ok = false;
    });

    if (!ok) {
      note.textContent = 'A name and a valid email, and it’s on its way.';
      note.style.color = '#e0977f';
      return;
    }

    note.style.color = '';
    note.textContent = 'Thank you — Elena replies personally, usually within a day.';
    form.reset();
    $$('.field', form).forEach((f) => f.classList.remove('is-bad'));
  });
}

/* ---------------------------------------------------------------
   Scroll engine
----------------------------------------------------------------*/

const nav    = $('#nav');
const bar    = $('#progress span');
const stage  = $('.herostage');
const heroEl = $('#hero');
const opener = $('#opener');
const cue    = $('#cue');
const tags   = $$('.tag');

const gallery   = $('#gallery');
const galPin    = $('.gallery__pin');
const galTrack  = $('#galTrack');
const galRail   = $('#galRail');

const parallaxEls = $$('[data-parallax]').map((el) => ({
  el,
  target: el.matches('.res__plate, .agent__portrait') ? el.querySelector('img') : el,
  factor: parseFloat(el.dataset.parallax) || 0,
}));

const CUES = [
  { house: 'left',   at: 0.17 },
  { house: 'middle', at: 0.33 },
  { house: 'right',  at: 0.49 },
];

let lastY = window.scrollY;
let dirty = true;

const mark = () => { dirty = true; };
window.addEventListener('scroll', mark, { passive: true });
window.addEventListener('resize', () => { dirty = true; if (carousel) carousel.refresh(); }, { passive: true });

function frame() {
  if (dirty) {
    dirty = false;
    const y  = window.scrollY;
    const vh = window.innerHeight;
    const doc = document.documentElement.scrollHeight - vh;

    if (bar) bar.style.width = `${clamp(y / Math.max(doc, 1)) * 100}%`;

    if (nav && stage) {
      nav.classList.toggle('is-solid', y > stage.offsetHeight - vh * 0.55);
      const down = y > lastY && y > vh * 0.9;
      nav.classList.toggle('is-hidden', down && Math.abs(y - lastY) > 4);
    }

    /* hero sequence */
    if (stage && heroEl) {
      const p = clamp(y / Math.max(stage.offsetHeight - vh, 1));

      if (opener) {
        const o = 1 - clamp((p - 0.04) / 0.24);
        opener.style.opacity = o;
        opener.style.transform = `translateY(calc(-50% - ${(1 - o) * 40}px))`;
      }
      if (cue) cue.style.opacity = 1 - clamp(p / 0.12);

      if (window.heroAPI) {
        CUES.forEach(({ house, at }) => {
          window.heroAPI.set(house, p >= at);
          const tag = tags.find((t) => t.dataset.house === house);
          if (tag) tag.classList.toggle('is-on', p >= at + 0.02);
        });
      }

      heroEl.style.filter = `brightness(${1 - 0.45 * clamp((p - 0.72) / 0.28)})`;
    }

    /* pinned gallery — vertical scroll becomes horizontal travel */
    if (gallery && galTrack && galPin) {
      const top = gallery.offsetTop;
      const travel = gallery.offsetHeight - vh;
      const p = clamp((y - top) / Math.max(travel, 1));
      const dist = Math.max(0, galTrack.scrollWidth - galPin.clientWidth);
      galTrack.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
      if (galRail) galRail.style.width = `${(p * 100).toFixed(1)}%`;
    }

    /* parallax */
    if (!reduced) {
      const mid = vh / 2;
      parallaxEls.forEach(({ el, target, factor }) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const shift = ((mid - (r.top + r.height / 2)) / vh) * factor * 260;
        target.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
      });
    }

    lastY = y;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

/* Anchor clicks shouldn't fight the sticky nav */
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    window.scrollTo({
      top: t.getBoundingClientRect().top + window.scrollY - (id === '#top' ? 0 : 72),
      behavior: reduced ? 'auto' : 'smooth',
    });
  });
});

})();
