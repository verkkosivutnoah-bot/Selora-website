/* ============================================================
   SELORA STORIES COVERFLOW
   Portfolio strip. (shared: palvelut/services, verkkosivusuunnittelu/web-design)

   Position is one number: `pos`, a FRACTIONAL card index at the centre.
   Everything else is derived from it, so there is no separate "which card is
   selected" state to keep in sync.

   Looping is arithmetic, not DOM. Each card's offset from the centre is folded
   into the shorter way round the ring, so a card at the far right is simply
   redrawn on the left once it passes half a turn out. No cloned nodes, no
   shuffling children, no seam to hide -- which is what the old translate-the-
   whole-track version needed a duplicate card set for.

   The rake eases off with pow(distance, FALLOFF). A linear ramp folds the
   second card almost shut; at 0.56 the neighbours stay readable while the
   far ones still recede. Tilt is capped short of edge-on so no card ever
   turns its back.

   Each card's preview is the real page in a scaled, inert iframe, mounted
   while the section is near the viewport and torn down once it is well clear.

   Targets #storiesTrack / #storiesMarquee / #storiesPrev / #storiesNext.
   Bails out cleanly if a page does not have the marquee markup.
   ============================================================ */
(function () {
  var track = document.getElementById('storiesTrack');
  var marquee = document.getElementById('storiesMarquee');
  if (!track || !marquee) return;

  var cards = Array.prototype.slice.call(track.children);
  var count = cards.length;
  if (!count) return;

  var BASE_W = 1440, BASE_H = 900;

  /* ---- rake geometry ---- */
  var ROTATE = 44;      // degrees the first neighbour tilts
  var DEPTH = 0.6;      // how far it recedes, as a fraction of card width
  var LENS = 3;         // viewer distance as a multiple of card width
  var FALLOFF = 0.56;   // exponent on distance; below 1 the rake eases off
  var FADE = 0.1;       // opacity lost per step out
  var GAP = 0.06;       // space between cards, as a fraction of card width
  var TILT_CAP = 82;    // never let a card turn edge-on
  var AUTOPLAY_MS = 4500;

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- previews (unchanged behaviour) ---------- */

  function fit(frame, iframe) {
    var scale = frame.offsetWidth / BASE_W;
    var need = frame.offsetHeight / BASE_H;
    if (need > scale) scale = need;
    iframe.style.transform = 'scale(' + scale + ')';
  }

  function mount(frame) {
    if (frame.dataset.mounted) return;
    frame.dataset.mounted = '1';
    var iframe = document.createElement('iframe');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('tabindex', '-1');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('scrolling', 'no');
    iframe.src = frame.getAttribute('data-src');
    iframe.addEventListener('load', function () { iframe.classList.add('is-ready'); });
    frame.appendChild(iframe);
    fit(frame, iframe);
    if ('ResizeObserver' in window) new ResizeObserver(function () { fit(frame, iframe); }).observe(frame);
    else window.addEventListener('resize', function () { fit(frame, iframe); }, { passive: true });
  }

  function unmount(frame) {
    if (!frame.dataset.mounted) return;
    delete frame.dataset.mounted;
    var iframe = frame.querySelector('iframe');
    if (iframe) iframe.remove();
  }

  /* Watch the section, not the individual cards.

     Per-card observation looked cheaper but was the reason cards showed up as
     empty slabs: in a strip that never stops moving, every card crosses the
     observer's margin repeatedly, so each one tore its iframe down and rebuilt
     it seconds later. A rebuilt iframe starts blank and only fades in once the
     remote page has loaded again, which is exactly the gap you see.

     Mounting per section means each preview loads once while the section is on
     screen and simply stays. */
  function watchFrames(frames) {
    if (!frames.length) return;
    if (!('IntersectionObserver' in window)) { frames.forEach(mount); return; }
    var obs = new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      frames.forEach(visible ? mount : unmount);
    }, { rootMargin: '600px 0px' });
    obs.observe(marquee);
  }

  var frames = Array.prototype.slice.call(track.querySelectorAll('.story-frame[data-src]'));

  // Reduced motion keeps the plain wrapped grid the stylesheet already gives
  // us: no rake, no autoplay, nothing to pause.
  if (reduced) { watchFrames(frames); return; }

  marquee.classList.add('is-coverflow');
  marquee.setAttribute('role', 'region');
  marquee.setAttribute('aria-roledescription', 'carousel');
  if (!marquee.getAttribute('aria-label')) marquee.setAttribute('aria-label', 'Esimerkkityöt');
  track.setAttribute('tabindex', '0');

  cards.forEach(function (card, i) {
    card.setAttribute('role', 'group');
    card.setAttribute('aria-roledescription', 'slide');
    card.setAttribute('aria-label', (i + 1) + ' / ' + count);
  });

  /* ---------- state ---------- */

  var pos = 0;        // fractional index at the centre — the single source of truth
  var target = 0;     // where the current settle is headed
  var width = 0, height = 0;
  var raf = null;
  var selected = 0;
  var drag = null;
  var paused = false;
  var autoTimer = null;

  function indexAt(p) { return ((Math.round(p) % count) + count) % count; }

  /* ---------- paint ---------- */

  // Straight to the DOM. Sixty updates a second through a framework would
  // re-render every card for numbers nothing else needs to see.
  function paint() {
    if (!width) return;
    var pitch = width * (1 + GAP);

    for (var i = 0; i < count; i++) {
      var card = cards[i];

      // Fold into the shorter way round the ring. This is the whole loop.
      var offset = i - pos;
      offset = ((offset % count) + count) % count;
      if (offset > count / 2) offset -= count;

      var distance = Math.abs(offset);
      var ramp = Math.pow(distance, FALLOFF);
      var tilt = Math.min(ROTATE * ramp, TILT_CAP) * (offset < 0 ? -1 : 1);

      card.style.transform =
        'translateX(calc(-50% + ' + (offset * pitch).toFixed(2) + 'px)) ' +
        'translateZ(' + (-DEPTH * width * ramp).toFixed(2) + 'px) ' +
        'rotateY(' + (-tilt).toFixed(2) + 'deg)';

      // A card is teleported across the ring at exactly half a turn out, so it
      // has to be invisible by then or the jump shows.
      var edge = Math.min(1, Math.max(0, count / 2 - distance));
      card.style.opacity = String(Math.max(0, 1 - FADE * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
      // Only the centre card should be a tab stop or a click target.
      var centred = Math.round(distance) === 0;
      card.style.pointerEvents = centred ? 'auto' : 'none';
      if (card.tagName === 'A') card.setAttribute('tabindex', centred ? '0' : '-1');
    }
  }

  function setSelected(i) {
    if (i === selected) return;
    selected = i;
    if (dots) {
      for (var d = 0; d < dots.length; d++) {
        dots[d].setAttribute('aria-current', d === i ? 'true' : 'false');
      }
    }
  }

  /* ---------- motion ---------- */

  function settle(to) {
    if (raf !== null) cancelAnimationFrame(raf);
    target = to;
    setSelected(indexAt(to));

    (function step() {
      var remaining = target - pos;
      if (Math.abs(remaining) < 0.0004) {
        pos = target;
        paint();
        raf = null;
        return;
      }
      // Exponential ease-out, not a spring: this settle should not overshoot,
      // because an overshooting card reads as a bounce against the rake.
      pos += remaining * 0.16;
      paint();
      raf = requestAnimationFrame(step);
    })();
  }

  function goTo(index) {
    // Take the shorter way round rather than unwinding the whole ring.
    settle(index + Math.round((target - index) / count) * count);
  }

  function nudge(by) { settle(Math.round(target) + by); }

  /* ---------- pointer ---------- */

  function onDown(e) {
    if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
    track.setPointerCapture(e.pointerId);
    target = pos;
    drag = { id: e.pointerId, x: e.clientX, pos: pos, v: 0, t: performance.now(), moved: 0 };
  }

  function onMove(e) {
    if (!drag || drag.id !== e.pointerId) return;
    var pitch = width * (1 + GAP);
    if (!pitch) return;

    var now = performance.now();
    var previous = pos;
    var dx = e.clientX - drag.x;
    drag.moved = Math.max(drag.moved, Math.abs(dx));
    pos = drag.pos - dx / pitch;
    // Cards per second, for the throw.
    drag.v = ((pos - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;

    setSelected(indexAt(pos));
    paint();
  }

  function onUp(e) {
    if (!drag || drag.id !== e.pointerId) return;
    var d = drag;
    drag = null;
    // Let a flick carry, but never more than two cards.
    var carried = Math.max(-2, Math.min(2, d.v * 0.18));
    settle(Math.round(pos + carried));
  }

  track.addEventListener('pointerdown', onDown);
  track.addEventListener('pointermove', onMove);
  track.addEventListener('pointerup', onUp);
  track.addEventListener('pointercancel', onUp);

  // A drag that ends on a card must not also follow its link.
  track.addEventListener('click', function (e) {
    if (lastDragDistance > 6) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  var lastDragDistance = 0;
  track.addEventListener('pointerup', function () {
    lastDragDistance = drag ? drag.moved : lastDragDistance;
  }, true);
  track.addEventListener('pointerdown', function () { lastDragDistance = 0; }, true);

  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1); }
  });

  // Tabbing to a card brings it to the middle, so keyboard focus is never on
  // something the rake has turned away.
  cards.forEach(function (card, i) {
    card.addEventListener('focus', function () { if (indexAt(pos) !== i) goTo(i); });
  });

  /* ---------- arrows + dots ---------- */

  var prevBtn = document.getElementById('storiesPrev');
  var nextBtn = document.getElementById('storiesNext');
  if (prevBtn) prevBtn.addEventListener('click', function () { nudge(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { nudge(1); });

  // Built here rather than in the markup, so all four pages get them without
  // touching any HTML.
  var dots = null;
  (function buildDots() {
    if (marquee.querySelector('.stories-dots')) return;
    var wrap = document.createElement('div');
    wrap.className = 'stories-dots';
    for (var i = 0; i < count; i++) {
      (function (i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'stories-dot';
        b.setAttribute('aria-label', 'Siirry kohteeseen ' + (i + 1));
        b.setAttribute('aria-current', i === 0 ? 'true' : 'false');
        b.addEventListener('click', function () { goTo(i); });
        wrap.appendChild(b);
      })(i);
    }
    marquee.parentNode.insertBefore(wrap, marquee.nextSibling);
    dots = wrap.querySelectorAll('.stories-dot');
  })();

  /* ---------- autoplay ---------- */

  function startAuto() {
    if (autoTimer) return;
    autoTimer = setInterval(function () {
      if (!paused && !drag && document.visibilityState !== 'hidden') nudge(1);
    }, AUTOPLAY_MS);
  }
  function pause() { paused = true; }
  function resume() { paused = false; }

  marquee.addEventListener('mouseenter', pause);
  marquee.addEventListener('mouseleave', resume);
  marquee.addEventListener('focusin', pause);
  marquee.addEventListener('focusout', resume);

  /* ---------- measure ---------- */

  // Card width drives pitch, depth and the lens, so it is the only thing worth
  // measuring, and only when the box actually changes.
  function measure() {
    var card = cards[0];
    if (!card) return;
    width = card.offsetWidth;
    height = card.offsetHeight;
    if (!width) return;
    // The track is absolutely positioned now, so it has no height of its own.
    marquee.style.setProperty('--sl-cf-h', height + 'px');
    marquee.style.setProperty('--sl-cf-lens', (width * LENS) + 'px');
    paint();
  }

  measure();
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(marquee);
  else window.addEventListener('resize', measure, { passive: true });

  watchFrames(frames);
  paint();
  startAuto();
})();
