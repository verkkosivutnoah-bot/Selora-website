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

   Each card shows a still of the page it links to. On hardware that can carry
   it, the first few cards additionally mount the real page in a scaled, inert
   iframe, layered over the still and torn down once the section is well clear.

   That budget is not a nicety. Every card is a full site — GSAP, ScrollTrigger,
   Lenis and its own rAF loop — so mounting all seven meant seven live browsing
   contexts in one tab, on top of this page's own smooth scrolling. iOS Safari
   answers that by killing the page: "A problem repeatedly occurred". Phones and
   tablets now get the stills alone, which look the same standing still and cost
   a decoded image each.

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

  /* ---------- how many live previews this device gets ----------

     A mouse on a wide screen is the one combination worth spending memory on:
     it is where the hover states live, and it rules out phones and tablets in
     a single test. `deviceMemory` narrows it further where the browser reports
     it — Safari does not, which is exactly why the pointer test carries the
     weight here and the memory one only trims. */

  function liveBudget() {
    if (reduced || !window.matchMedia) return 0;
    if (!window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches) return 0;
    if (navigator.deviceMemory && navigator.deviceMemory < 8) return 2;
    return 3;
  }

  var MAX_LIVE = liveBudget();

  /* ---------- previews ---------- */

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

  /* The frames allowed to go live: the first MAX_LIVE, in DOM order. The rest
     keep their still, which is a screenshot of the same hero the iframe would
     render — so a card that never goes live is not a card that looks unfinished. */
  var frames = Array.prototype.slice
    .call(track.querySelectorAll('.story-frame[data-src]'))
    .slice(0, MAX_LIVE);

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
      var opacity = Math.max(0, 1 - FADE * distance) * edge;
      card.style.opacity = String(opacity);
      card.style.zIndex = String(100 - Math.round(distance));
      // Anything you can actually see is a click target: the centre card
      // follows its link, an off-centre one rotates to the middle first (see
      // the click handler below). Cards faded past the edge stay inert so a
      // click cannot land on something invisible.
      var centred = Math.round(distance) === 0;
      card.style.pointerEvents = opacity > 0.12 ? 'auto' : 'none';
      // Tab order still only ever holds the centre card; the arrow keys and
      // the focus handler are how the keyboard reaches the rest.
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
    dragSlop = e.pointerType === 'mouse' ? 6 : 14;
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
    // Hand the pointer back, or the capture outlives the gesture and keeps
    // retargeting later events at the track.
    if (track.hasPointerCapture && track.hasPointerCapture(e.pointerId)) {
      track.releasePointerCapture(e.pointerId);
    }
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
    // 6px was tight enough that an ordinary finger tap registered as a drag and
    // got cancelled. A mouse is precise, a thumb is not, so the two get
    // different slop.
    if (lastDragDistance > dragSlop) { e.preventDefault(); e.stopPropagation(); return; }

    // onDown takes pointer capture on the track so a drag survives leaving the
    // card. The side effect is that the resulting click is retargeted to the
    // track, so e.target is never the card and the anchor never sees the click
    // at all -- which is why pressing an example did nothing. Resolve the card
    // under the cursor instead, and do the navigating ourselves.
    var node = document.elementFromPoint(e.clientX, e.clientY);
    while (node && node !== track && !(node.classList && node.classList.contains('story-card'))) {
      node = node.parentNode;
    }
    if (!node || node === track) return;
    var i = cards.indexOf(node);
    if (i === -1) return;

    e.preventDefault();
    e.stopPropagation();

    // First click on an off-centre card brings it to the middle.
    if (indexAt(pos) !== i) { goTo(i); return; }

    var href = node.getAttribute('href');
    if (!href) return;
    if (node.getAttribute('target') === '_blank') window.open(href, '_blank', 'noopener');
    else window.location.href = href;
  }, true);
  var lastDragDistance = 0;
  var dragSlop = 6; // widened to 14 for touch/pen in onDown
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

  // Touch never fires mouseenter, so on a phone the ring used to keep rotating
  // while you were using it: a tap would centre a card and autoplay would carry
  // it away before you could tap again. Any pointer interaction now holds the
  // ring still, and it only resumes after a spell of no input.
  var idleTimer = null;
  function holdStill() {
    paused = true;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { paused = false; }, 9000);
  }
  track.addEventListener('pointerdown', holdStill, true);
  track.addEventListener('click', holdStill, true);
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
