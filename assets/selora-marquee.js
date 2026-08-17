/* ============================================================
   SELORA STORIES MARQUEE
   Portfolio marquee. (shared: verkkosivusuunnittelu.html, palvelut.html)

   The track is cloned once and driven from JS rather than a CSS keyframe:
   the arrows need to nudge the same value the auto-scroll animates, and you
   cannot layer a second transform on a property an animation owns.

   Position is one number, x, in pixels. One full set of cards is `half`
   pixels wide, so x wraps within [-half, 0) and the strip never shows a seam.
   Auto-scroll walks x forward; an arrow sets a target and the loop eases into
   it. Adding more cards changes nothing here: speed is per-card, so the strip
   travels at a constant rate however long it gets.

   Each card shows a still of the page it links to. On hardware that can carry
   it, the first few cards additionally mount the real page in a scaled, inert
   iframe, layered over the still.

   That budget is not a nicety. Every card is a full site — GSAP, ScrollTrigger,
   Lenis and its own rAF loop — and the track is cloned, so mounting them all
   meant eight live browsing contexts in one tab. iOS Safari answers that by
   killing the page: "A problem repeatedly occurred". Phones and tablets now get
   the stills only, which look the same standing still and cost a decoded image
   each.

   Targets #storiesTrack / #storiesMarquee / #storiesPrev / #storiesNext.
   Bails out cleanly if a page does not have the marquee markup.
   ============================================================ */
(function () {
  var track = document.getElementById('storiesTrack');
  var marquee = document.getElementById('storiesMarquee');
  if (!track || !marquee) return;

  var BASE_W = 1440, BASE_H = 900;
  var SECONDS_PER_CARD = 5.5; // constant travel speed as cards are added

  var originals = Array.prototype.slice.call(track.children);
  if (!originals.length) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- how many live previews this device gets ----------

     A mouse on a wide screen is the one combination worth spending memory on:
     it is where the hover states live, and it rules out phones and tablets in
     one test. `deviceMemory` narrows it further where the browser reports it;
     Safari does not, which is exactly why the pointer test carries the weight
     rather than the memory one. */

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

  /* The frames allowed to go live, in DOM order and capped by the budget.

     Only originals are eligible — clones keep their still. Since the still is
     a screenshot of the same hero the iframe renders, the two halves of the
     loop look alike at rest, and the seam the clones exist to hide stays
     hidden. */
  function liveFrames() {
    if (!MAX_LIVE) return [];
    var frames = [];
    for (var i = 0; i < originals.length && frames.length < MAX_LIVE; i++) {
      var frame = originals[i].querySelector('.story-frame[data-src]');
      if (frame) frames.push(frame);
    }
    return frames;
  }

  function unmount(frame) {
    if (!frame.dataset.mounted) return;
    delete frame.dataset.mounted;
    var iframe = frame.querySelector('iframe');
    if (iframe) iframe.remove();
  }

  /* ---------- the strip ---------- */

  if (reduced) {
    // static, wrapped grid: no clones, no motion, arrows hidden by CSS
    watchFrames(liveFrames());
    return;
  }

  originals.forEach(function (card) {
    var clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('tabindex', '-1');
    track.appendChild(clone);
  });

  var half = 0, step = 0, x = 0, target = null, paused = false, started = false;

  function measure() {
    // scrollWidth is 0 until the cards have laid out, so this is retried from
    // the loop until it returns something real
    half = track.scrollWidth / 2;
    if (!half) return false;
    step = half / originals.length;          // one card, including its margin
    if (!started) { x = -half; started = true; }   // start on the clone set
    // paint straight away: rAF does not run while the tab is hidden, and
    // without this the strip would sit at 0 and jump on first display
    paint();
    return true;
  }

  function paint() {
    track.style.transform = 'translate3d(' + x + 'px,0,0)';
  }

  function wrap() {
    if (!half) return;
    while (x >= 0) x -= half;
    while (x < -half) x += half;
  }

  var last = null;
  function frame(now) {
    var dt = last === null ? 0 : Math.min((now - last) / 1000, 0.05);
    last = now;

    if (!half && !measure()) { requestAnimationFrame(frame); return; }

    if (target !== null) {
      // ease toward the arrow's destination, then hand back to auto-scroll
      var d = target - x;
      x += d * (1 - Math.exp(-9 * dt));
      if (Math.abs(target - x) < 0.5) { x = target; target = null; }
    } else if (!paused) {
      x += (step / SECONDS_PER_CARD) * dt;   // travels left to right
    }

    wrap();
    if (target !== null) target = null_or_wrapped(target);
    paint();
    requestAnimationFrame(frame);
  }

  // keep a pending target in the same wrapped space as x, so a nudge taken
  // near the seam does not send the strip the long way round
  function null_or_wrapped(t) {
    if (t === null) return null;
    while (t - x > half) t -= half;
    while (t - x < -half) t += half;
    return t;
  }

  function nudge(dir) {
    var base = target === null ? x : target;
    target = base + dir * step;
  }

  var prevBtn = document.getElementById('storiesPrev');
  var nextBtn = document.getElementById('storiesNext');
  if (prevBtn) prevBtn.addEventListener('click', function () { nudge(1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { nudge(-1); });

  marquee.addEventListener('mouseenter', function () { paused = true; });
  marquee.addEventListener('mouseleave', function () { paused = false; });
  marquee.addEventListener('focusin', function () { paused = true; });
  marquee.addEventListener('focusout', function () { paused = false; });

  measure();
  window.addEventListener('resize', function () {
    var before = half;
    half = 0;
    if (measure() && before) x = x / before * half;   // hold position across a resize
    wrap();
  }, { passive: true });

  watchFrames(liveFrames());
  requestAnimationFrame(frame);

  /* Watch the section, not the individual cards.

     Per-card observation looked cheaper but was the reason cards showed up as
     empty slabs: in a strip that never stops moving, every card crosses the
     observer's margin on every pass, so each one tore its iframe down and
     rebuilt it seconds later. A rebuilt iframe starts blank and only fades in
     once the remote page has loaded again, which is exactly the gap you see.

     Mounting per section means each preview loads once while the section is on
     screen and simply stays. Nothing is destroyed until the whole section is
     well out of view, so the strip is never mid-reload where you can see it. */
  function watchFrames(frames) {
    if (!frames.length) return;
    if (!('IntersectionObserver' in window)) { frames.forEach(mount); return; }
    var obs = new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      frames.forEach(visible ? mount : unmount);
    }, { rootMargin: '600px 0px' });
    obs.observe(marquee);
  }
})();
