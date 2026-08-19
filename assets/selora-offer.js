/* ============================================================
   SELORA — promo strip + site audit form
   No dependencies. Both halves are optional: the script does
   nothing on a page that has neither element.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. Promo strip ---------- */
  /* Dismissal removes the element. The header's offset comes from
     html:has(.sl-promo) in the stylesheet, so there is no second piece of
     state to reset — the layout corrects itself the moment it is gone. */
  var KEY = 'sl-promo-dismissed';

  function initPromo() {
    var promo = document.querySelector('.sl-promo');
    if (!promo) return;

    var until = promo.getAttribute('data-until');
    // An offer with a date on it should disappear by itself when that date
    // passes. A promo strip advertising last month's deadline is worse than
    // no strip at all, and nobody remembers to take it down by hand.
    if (until && new Date(until + 'T23:59:59') < new Date()) {
      promo.remove();
      return;
    }

    var stamp = null;
    try { stamp = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
    // Dismissal is tied to the offer, so a new offer shows again rather than
    // staying hidden for everyone who ever closed the old one.
    if (stamp && stamp === (until || 'always')) { promo.remove(); return; }

    /* The stylesheet's --sl-promo-h is a sensible default for one line, but
       the strip wraps to two on a narrow phone and the English copy is a
       different length again — at 320px the constant was 14px short and the
       header sat on top of the text. Measure the real height instead, so the
       offset is right for whatever the strip actually renders as. */
    var sync = function () {
      document.documentElement.style.setProperty('--sl-promo-h', promo.offsetHeight + 'px');
    };
    sync();
    if ('ResizeObserver' in window) new ResizeObserver(sync).observe(promo);
    else window.addEventListener('resize', sync, { passive: true });

    var x = promo.querySelector('.sl-promo-x');
    if (x) {
      x.addEventListener('click', function () {
        promo.remove();
        // Hand the offset back to the stylesheet, which resolves it to 0 once
        // the element is gone. Leaving the inline value would keep a gap.
        document.documentElement.style.removeProperty('--sl-promo-h');
        try { localStorage.setItem(KEY, until || 'always'); } catch (e) { /* ignore */ }
      });
    }
  }

  /* ---------- 2. Audit form ---------- */
  /* Posts to the same Formspree endpoint the contact form uses. It lands in
     Noah's inbox, which is where it has to end up anyway — a person does the
     audit. Deliberately not the newsletter table: that list exists to send a
     newsletter, and "you asked us to look at your site" is a different
     purpose to collect an address under. */
  var ENDPOINT = 'https://formspree.io/f/mwvwrdne';

  function normaliseUrl(v) {
    v = (v || '').trim();
    if (!v) return '';
    // People type "yritys.fi". Accept it rather than rejecting the form.
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try {
      var u = new URL(v);
      // A hostname with no dot is a typo, not a site.
      if (!/\./.test(u.hostname)) return '';
      return u.href;
    } catch (e) { return ''; }
  }

  function initAudit() {
    var form = document.querySelector('.sl-audit-form');
    if (!form) return;

    var urlEl = form.querySelector('[name="sivusto"]');
    var mailEl = form.querySelector('[name="email"]');
    var btn = form.querySelector('button[type="submit"]');
    var err = form.querySelector('.sl-audit-err');
    var done = document.querySelector('.sl-audit-done');
    if (!urlEl || !mailEl || !btn) return;

    var say = function (m) { if (err) err.textContent = m || ''; };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      say('');

      var url = normaliseUrl(urlEl.value);
      if (!url) {
        say(form.getAttribute('data-msg-url') || 'Tarkista sivuston osoite.');
        urlEl.focus();
        return;
      }
      if (!mailEl.value || mailEl.value.indexOf('@') === -1) {
        say(form.getAttribute('data-msg-mail') || 'Tarkista sähköpostiosoite.');
        mailEl.focus();
        return;
      }

      var label = btn.textContent;
      btn.disabled = true;
      btn.textContent = btn.getAttribute('data-sending') || 'Lähetetään…';

      var body = new FormData();
      body.append('sivusto', url);
      body.append('email', mailEl.value.trim());
      // So these are filterable in the inbox and never confused with a
      // general contact message.
      body.append('_subject', 'Maksuton sivustoarvio: ' + url);
      body.append('tyyppi', 'sivustoarvio');

      fetch(ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body: body })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          form.hidden = true;
          if (done) done.hidden = false;
        })
        .catch(function () {
          say(form.getAttribute('data-msg-fail') || 'Lähetys epäonnistui. Yritä uudelleen tai kirjoita meille.');
          btn.disabled = false;
          btn.textContent = label;
        });
    });
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function () { initPromo(); initAudit(); });
})();
