const HOUSES = ['left', 'middle', 'right'];

const hero    = document.getElementById('hero');
const frame   = document.getElementById('frame');
const plates  = document.querySelectorAll('.plate--lit');
const mirrors = document.querySelectorAll('.reflect__img');
const layers  = document.querySelectorAll('.spill, .panes');
const zones   = document.querySelectorAll('.zone');

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine    = window.matchMedia('(pointer: fine)').matches;

/* ===============================================================
   Lights
   Each house is independent — any combination can be lit at once.
   Turning one on drives four things: the lit plate, its mirrored
   copy in the road, the light thrown onto lawn and driveway, and
   the hard highlights at the glass.
================================================================*/

const lit = new Set();

const forHouse = (list, house) => [...list].filter((n) => n.dataset.house === house);

function apply(house) {
  const on = lit.has(house);

  forHouse(plates, house).concat(forHouse(mirrors, house)).forEach((n) => {
    n.classList.toggle('is-on', on);
    if (on) n.classList.remove('is-preview');
  });

  forHouse(layers, house).forEach((n) => {
    n.classList.toggle('is-on', on);
    if (!n.classList.contains('panes')) return;
    if (on) {
      n.classList.remove('is-warming');
      void n.offsetWidth;                 // restart the strike-up flicker
      n.classList.add('is-warming');
    } else {
      n.classList.remove('is-warming');
    }
  });

  forHouse(zones, house).forEach((z) => {
    z.classList.toggle('is-on', on);
    z.setAttribute('aria-pressed', String(on));
  });
}

function toggle(house) {
  lit.has(house) ? lit.delete(house) : lit.add(house);
  apply(house);
}

function preview(house, show) {
  if (lit.has(house)) return;
  forHouse(plates, house).concat(forHouse(mirrors, house))
    .forEach((n) => n.classList.toggle('is-preview', show));
}

zones.forEach((z) => {
  const house = z.dataset.house;
  z.addEventListener('click', () => toggle(house));
  z.addEventListener('pointerenter', () => preview(house, true));
  z.addEventListener('pointerleave', () => preview(house, false));
  z.addEventListener('focus', () => preview(house, true));
  z.addEventListener('blur',  () => preview(house, false));
});

document.addEventListener('keydown', (e) => {
  // don't hijack digits while someone is filling in the enquiry form
  const t = e.target;
  if (t && (t.matches('input, textarea, select') || t.isContentEditable)) return;

  const i = ['1', '2', '3'].indexOf(e.key);
  if (i !== -1) toggle(HOUSES[i]);
  if (e.key === '0') HOUSES.forEach((h) => { lit.delete(h); apply(h); });
});

/* Control surface for site.js, which drives the lights from scroll
   position. Setting rather than toggling keeps the scroll sequence
   idempotent — scrubbing back and forth can't desync it. */
window.heroAPI = {
  set(house, on) {
    if (on === lit.has(house)) return;
    on ? lit.add(house) : lit.delete(house);
    apply(house);
  },
  houses: HOUSES,
};

/* ===============================================================
   Parallax
================================================================*/

if (fine && !reduced) {
  const MAX = 8;   // must stay under the .scene overflow margin (scale 1.015)
  let raf = null;

  window.addEventListener('pointermove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const nx = (e.clientX / window.innerWidth  - 0.5) * -2;
      const ny = (e.clientY / window.innerHeight - 0.5) * -2;
      frame.style.setProperty('--px', (nx * MAX).toFixed(2));
      frame.style.setProperty('--py', (ny * MAX * 0.55).toFixed(2));
    });
  });

  document.addEventListener('pointerleave', () => {
    frame.style.setProperty('--px', '0');
    frame.style.setProperty('--py', '0');
  });
}

/* ===============================================================
   Starfield

   Real stars don't blink on and off — they scintillate, because air
   turbulence bends their light on the way down. Faint ones shimmer
   hard, bright ones barely at all, and every star runs its own
   irregular rhythm (two detuned sines, never in phase). Colour
   follows stellar temperature, and the field drifts west the way
   the sky actually does.
================================================================*/

const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d', { alpha: true });

function sprite(core, halo) {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0.00, core);
  grad.addColorStop(0.14, halo);
  grad.addColorStop(0.42, halo.replace(/[\d.]+\)$/, '0.10)'));
  grad.addColorStop(1.00, halo.replace(/[\d.]+\)$/, '0)'));
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  return c;
}

const PALETTE = [
  sprite('rgba(255,255,255,1)', 'rgba(198,216,255,0.55)'), // blue-white
  sprite('rgba(255,255,255,1)', 'rgba(235,240,255,0.55)'), // white
  sprite('rgba(255,252,245,1)', 'rgba(255,238,206,0.55)'), // warm
  sprite('rgba(255,244,232,1)', 'rgba(255,214,168,0.55)'), // amber
];

let stars = [];
let meteor = null;
let nextMeteor = 5000;
let W = 0, H = 0, DPR = 1;

function build() {
  const rect = frame.getBoundingClientRect();
  W = Math.round(rect.width);
  H = Math.round(rect.height);
  DPR = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width  = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  const count = Math.round(Math.min(460, Math.max(180, (W * H) / 5200)));
  const skyH = H * 0.52;

  stars = Array.from({ length: count }, () => {
    const mag = Math.pow(Math.random(), 3);   // mostly faint, a few blazing
    return {
      x: Math.random() * W,
      y: Math.pow(Math.random(), 1.25) * skyH,
      size: 1.6 + mag * 8.5,
      base: 0.20 + mag * 0.80,
      amp: 0.42 - mag * 0.30,                 // faint stars scintillate hardest
      p1: Math.random() * Math.PI * 2,
      p2: Math.random() * Math.PI * 2,
      s1: 0.7 + Math.random() * 1.9,
      s2: 1.6 + Math.random() * 3.4,
      spike: mag > 0.72,
      img: PALETTE[(Math.random() * PALETTE.length) | 0],
    };
  });
}

function spawnMeteor() {
  const fromLeft = Math.random() < 0.5;
  const speed = 0.55 + Math.random() * 0.5;
  meteor = {
    x: fromLeft ? W * (0.1 + Math.random() * 0.3) : W * (0.6 + Math.random() * 0.3),
    y: H * (0.02 + Math.random() * 0.16),
    vx: (fromLeft ? 1 : -1) * speed,
    vy: speed * (0.35 + Math.random() * 0.3),
    len: 90 + Math.random() * 130,
    life: 0,
    span: 900 + Math.random() * 500,
  };
}

let last = 0;

function draw(now) {
  const dt = last ? Math.min(now - last, 64) : 16;
  last = now;
  const t = now / 1000;

  ctx.clearRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'lighter';

  for (const s of stars) {
    const flicker = 0.62 * Math.sin(t * s.s1 + s.p1) + 0.38 * Math.sin(t * s.s2 + s.p2);
    const a = Math.max(0, s.base * (1 - s.amp + s.amp * (0.5 + 0.5 * flicker)));
    if (a < 0.012) continue;

    s.x -= 0.0022 * dt;
    if (s.x < -6) s.x = W + 6;

    const d = s.size * (0.9 + 0.1 * flicker);
    ctx.globalAlpha = a;
    ctx.drawImage(s.img, s.x - d / 2, s.y - d / 2, d, d);

    if (s.spike) {
      ctx.globalAlpha = a * 0.30;
      ctx.strokeStyle = '#dfe9ff';
      ctx.lineWidth = 0.7;
      const r = d * 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x - r, s.y); ctx.lineTo(s.x + r, s.y);
      ctx.moveTo(s.x, s.y - r); ctx.lineTo(s.x, s.y + r);
      ctx.stroke();
    }
  }

  nextMeteor -= dt;
  if (!meteor && nextMeteor <= 0) {
    spawnMeteor();
    nextMeteor = 9000 + Math.random() * 17000;
  }

  if (meteor) {
    meteor.life += dt;
    meteor.x += meteor.vx * dt;
    meteor.y += meteor.vy * dt;

    const k = meteor.life / meteor.span;
    const fade = k < 0.15 ? k / 0.15 : Math.max(0, 1 - (k - 0.15) / 0.85);
    const tx = meteor.x - meteor.vx * meteor.len;
    const ty = meteor.y - meteor.vy * meteor.len;

    const g = ctx.createLinearGradient(meteor.x, meteor.y, tx, ty);
    g.addColorStop(0, `rgba(255,255,255,${0.85 * fade})`);
    g.addColorStop(0.35, `rgba(200,220,255,${0.28 * fade})`);
    g.addColorStop(1, 'rgba(160,190,255,0)');

    ctx.globalAlpha = 1;
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(meteor.x, meteor.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    if (k >= 1) meteor = null;
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  requestAnimationFrame(draw);
}

function drawStatic() {
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (const s of stars) {
    ctx.globalAlpha = s.base;
    ctx.drawImage(s.img, s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { build(); if (reduced) drawStatic(); }, 150);
});

build();
reduced ? drawStatic() : requestAnimationFrame(draw);
