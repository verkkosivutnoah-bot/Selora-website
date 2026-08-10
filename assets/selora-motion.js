/* ============================================================
   SELORA MOTION v1
   Vanilla scroll + pointer motion system. No dependencies.

   Progressive enhancement contract:
   content is visible by default. This script adds `html.sl-motion`
   and only then do the opt-in animation styles apply. If the script
   fails or the user prefers reduced motion, everything still renders.

   Usage:
     [data-sl-reveal]            fade + rise on enter
     [data-sl-reveal="left"]     variants: left | right | scale | blur
     [data-sl-stagger]           stagger direct children
     [data-sl-split]             per-character headline reveal
     [data-sl-parallax="0.2"]    scroll parallax, value = strength
     [data-sl-tilt]              pointer parallax on children w/ [data-sl-depth]
     [data-sl-count="1240"]      count up when scrolled into view
     .sl-magnetic                cursor-magnetic button
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse  = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  if (reduced) return; // leave everything in its static, visible state

  var root = document.documentElement;
  root.classList.add('sl-motion');

  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /* ---------- 1. Reveal on scroll ---------- */
  function initReveal() {
    // [data-sl-pop] is the springy variant: it hides the same way, so it has
    // to be observed here too or it never gets .is-in and stays invisible.
    var els = document.querySelectorAll('[data-sl-reveal], [data-sl-pop]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        obs.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { obs.observe(el); });

    /* Failsafe: these elements are hidden until the observer reveals them, so
       anything that stops it firing (a zero-sized viewport, an embed, a
       browser quirk) would leave the page blank. If nothing has been revealed
       anything still hidden a few seconds after load is shown regardless:
       a missed animation is better than invisible content. */
    setTimeout(function () {
      els.forEach(function (el) { el.classList.add('is-in'); });
    }, 2500);
  }

  /* ---------- 2. Stagger children ---------- */
  function initStagger() {
    document.querySelectorAll('[data-sl-stagger]').forEach(function (parent) {
      var step = parseInt(parent.getAttribute('data-sl-stagger'), 10) || 90;
      Array.prototype.forEach.call(parent.children, function (child, i) {
        if (!child.hasAttribute('data-sl-reveal') && !child.hasAttribute('data-sl-pop')) child.setAttribute('data-sl-reveal', '');
        child.style.setProperty('--sl-delay', (i * step) + 'ms');
      });
    });
  }

  /* ---------- 3. Per-character headline reveal ---------- */
  function splitNode(node, state) {
    // Walk text nodes so inline markup (spans, <br>) survives the split.
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var text = child.nodeValue;
        if (!text.trim()) return;
        var frag = document.createDocumentFragment();
        text.split('').forEach(function (ch) {
          if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
          var s = document.createElement('span');
          s.className = 'sl-char';
          s.textContent = ch;
          s.style.transitionDelay = (state.i * 26) + 'ms';
          state.i++;
          frag.appendChild(s);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && !child.classList.contains('sl-char')) {
        splitNode(child, state);
      }
    });
  }

  function revealChars(h) {
    h.querySelectorAll('.sl-char').forEach(function (c) { c.classList.add('is-in'); });
  }

  function splitOne(h) {
    // Keep the pre-split markup so we can restore it before re-translating.
    if (!h.dataset.slOriginal) h.dataset.slOriginal = h.innerHTML;
    splitNode(h, { i: 0 });
  }

  var splitObserver = null;

  function observeSplit(heads) {
    if (!('IntersectionObserver' in window)) {
      heads.forEach(revealChars);
      return;
    }
    if (splitObserver) splitObserver.disconnect();
    splitObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        revealChars(e.target);
        splitObserver.unobserve(e.target);
      });
    }, { threshold: 0.2 });
    heads.forEach(function (h) { splitObserver.observe(h); });
  }

  function doSplit() {
    var heads = Array.prototype.slice.call(document.querySelectorAll('[data-sl-split]'));
    if (!heads.length) return;
    heads.forEach(splitOne);
    observeSplit(heads);
  }

  /* Splitting wraps every character in its own <span>, which destroys the
     text nodes the i18n overlay looks up. So: translate first, split after,
     and rebuild on every language change. */
  function initSplit() {
    var hasI18n = !!window.selora_i18n || !!document.querySelector('script[src*="i18n"]');

    if (!hasI18n) { doSplit(); return; }

    var done = false;
    function once() {
      if (done) return;
      done = true;
      doSplit();
    }
    // i18n dispatches this at the end of its first setLang() pass.
    window.addEventListener('selora:langchange', once, { once: true });
    // Fallback in case i18n never loads.
    setTimeout(once, 2000);

    // On later language switches, restore the original markup so the overlay
    // can translate real text nodes, then split the new text.
    window.addEventListener('selora:langchange', function () {
      if (!done) return;
      var heads = Array.prototype.slice.call(document.querySelectorAll('[data-sl-split]'));
      heads.forEach(function (h) {
        if (h.dataset.slOriginal) h.innerHTML = h.dataset.slOriginal;
      });
      // Let the overlay walk the restored nodes before we re-split them.
      setTimeout(function () {
        heads.forEach(function (h) {
          h.dataset.slOriginal = h.innerHTML; // now holds translated markup
          splitNode(h, { i: 0 });
        });
        heads.forEach(revealChars); // already in view, show immediately
      }, 60);
    });
  }

  /* ---------- 4. Scroll parallax ---------- */
  function initParallax() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-sl-parallax]'));
    if (!els.length || coarse) return;
    var ticking = false;

    function update() {
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var strength = parseFloat(el.getAttribute('data-sl-parallax')) || 0.15;
        var progress = (r.top + r.height / 2 - vh / 2) / vh; // -1 .. 1
        el.style.transform = 'translate3d(0,' + (progress * strength * 100).toFixed(2) + 'px,0)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true; raf(update);
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ---------- 5. Pointer tilt / depth ---------- */
  function initTilt() {
    var scenes = document.querySelectorAll('[data-sl-tilt]');
    if (!scenes.length || coarse) return;

    scenes.forEach(function (scene) {
      var layers = scene.querySelectorAll('[data-sl-depth]');
      var tx = 0, ty = 0, cx = 0, cy = 0, running = false;

      function loop() {
        cx += (tx - cx) * 0.08;
        cy += (ty - cy) * 0.08;
        layers.forEach(function (l) {
          var d = parseFloat(l.getAttribute('data-sl-depth')) || 0.5;
          l.style.transform = 'translate3d(' + (cx * d * 26).toFixed(2) + 'px,' + (cy * d * 26).toFixed(2) + 'px,0)';
        });
        if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf(loop);
        else running = false;
      }
      function start() { if (!running) { running = true; raf(loop); } }

      scene.addEventListener('mousemove', function (e) {
        var r = scene.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width * 2 - 1;
        ty = (e.clientY - r.top) / r.height * 2 - 1;
        start();
      });
      scene.addEventListener('mouseleave', function () { tx = 0; ty = 0; start(); });
    });
  }

  /* ---------- 6. Magnetic buttons ---------- */
  function initMagnetic() {
    var els = document.querySelectorAll('.sl-magnetic');
    if (!els.length || coarse) return;
    els.forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + (x * 0.22).toFixed(2) + 'px,' + (y * 0.3).toFixed(2) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- 7. Count-up ---------- */
  function initCounters() {
    var els = document.querySelectorAll('[data-sl-count]');
    if (!els.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute('data-sl-count')) || 0;
      var dur = parseInt(el.getAttribute('data-sl-count-dur'), 10) || 1600;
      var suffix = el.getAttribute('data-sl-count-suffix') || '';
      var decimals = (el.getAttribute('data-sl-count') || '').split('.')[1];
      var dp = decimals ? decimals.length : 0;
      var start = null;
      function tick(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(dp) + suffix;
        if (p < 1) raf(tick);
      }
      raf(tick);
    }

    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        run(e.target); obs.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { obs.observe(el); });
  }


  /* ---------- 8. Scroll progress bar ----------
     Vantage drives this with GSAP ScrollTrigger; a scroll listener plus a
     scaleX transform is the same effect without the 70KB. */
  function initProgress() {
    var bar = document.createElement('div');
    bar.className = 'sl-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true; raf(update);
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ---------- 9. Custom cursor ----------
     Ring lerps behind a dot that tracks exactly, and the ring grows over
     anything clickable. Pointer devices only. */
  function initCursor() {
    if (coarse) return;
    var ring = document.createElement('div'); ring.className = 'sl-cursor';
    var dot  = document.createElement('div'); dot.className = 'sl-cursor-dot';
    ring.setAttribute('aria-hidden', 'true');
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    document.body.appendChild(dot);
    document.documentElement.classList.add('sl-has-cursor');

    var tx = -100, ty = -100, cx = -100, cy = -100, running = false;

    function loop() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      ring.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0) translate(-50%,-50%)';
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) raf(loop);
      else running = false;
    }

    window.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      dot.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) translate(-50%,-50%)';
      if (!running) { running = true; raf(loop); }
    }, { passive: true });

    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('a, button, summary, input, textarea, select, [role="button"]')) {
        ring.classList.add('is-active');
      }
    });
    document.addEventListener('mouseout', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('a, button, summary, input, textarea, select, [role="button"]')) {
        ring.classList.remove('is-active');
      }
    });
    document.addEventListener('mouseleave', function () { ring.classList.add('is-hidden'); dot.classList.add('is-hidden'); });
    document.addEventListener('mouseenter', function () { ring.classList.remove('is-hidden'); dot.classList.remove('is-hidden'); });
  }

  /* ---------- 10. Scroll-scrubbed text reveal ----------
     Vantage scrubs a per-word timeline. Wrapping words in spans would destroy
     the text nodes the i18n overlay owns, which leaves the page half English
     after a language switch, so this paints the same effect with a clipped
     gradient instead and never touches the DOM. */
  function initWords() {
    var blocks = Array.prototype.slice.call(document.querySelectorAll('[data-sl-words]'));
    if (!blocks.length) return;

    blocks.forEach(function (b) { b.classList.add('sl-words'); });

    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      blocks.forEach(function (b) {
        var r = b.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        // 0 as the block enters the lower third, 1 once it clears the middle
        var p = (vh * 0.82 - r.top) / (r.height + vh * 0.24);
        p = Math.max(0, Math.min(1, p));
        b.style.setProperty('--sl-lit', (p * 100).toFixed(2) + '%');
      });
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true; raf(update);
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }


  /* ---------- 11. Heading accent swipe ---------- */
  function initSwipe() {
    var hosts = document.querySelectorAll('.sl-swipe-host');
    if (!hosts.length) return;
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(hosts, function (h) { h.classList.add('is-swiped'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-swiped');
        obs.unobserve(e.target);
      });
    }, { threshold: 0.3 });
    Array.prototype.forEach.call(hosts, function (h) { obs.observe(h); });
  }

  ready(function () {
    initStagger();   // must run before initReveal so injected attrs are observed
    initReveal();
    initSplit();
    initParallax();
    initTilt();
    initMagnetic();
    initCounters();
    initProgress();
    initCursor();
    initWords();
    initSwipe();
  });

  window.seloraMotion = { reveal: initReveal, split: initSplit, counters: initCounters, words: initWords };
})();
