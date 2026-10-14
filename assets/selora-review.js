/* ============================================================
   SELORA REVIEW
   Behaviour for the star rating card on the contact pages.

   Every rating is emailed to us through Web3Forms, which binds
   the recipient to the access key, so no address is exposed in
   the page. Four and five star raters get an extra link to
   leave the same words on Google after they have sent it; the
   send never depends on the rating, so nothing is gated.

   No string lives in here. Every piece of copy sits in the
   HTML and this file only toggles `hidden` / `is-on`, which
   keeps the i18n overlay in charge of translation.
   ============================================================ */
(function () {
  'use strict';

  var card = document.querySelector('[data-selora-review]');
  if (!card) return;

  var stars  = Array.prototype.slice.call(card.querySelectorAll('.rv-star'));
  var words  = Array.prototype.slice.call(card.querySelectorAll('.rv-word .rv-w'));
  var form   = card.querySelector('.rv-form');
  var prompts = Array.prototype.slice.call(card.querySelectorAll('[data-rv-prompt]'));
  var google = card.querySelector('.rv-google');
  var msgBox = card.querySelector('.rv-msg');
  var submit = form ? form.querySelector('[type="submit"]') : null;
  if (!stars.length || !form) return;

  var key     = card.getAttribute('data-rv-key') || '';
  var mailTo  = card.getAttribute('data-rv-email') || '';
  var fromTag = card.getAttribute('data-rv-from') || 'Selora';
  var rating  = 0;
  var sent    = false;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function paint(n) {
    stars.forEach(function (s, i) { s.classList.toggle('is-on', i < n); });
    words.forEach(function (w) {
      w.classList.toggle('is-on', String(w.getAttribute('data-rv-w')) === String(n));
    });
  }

  function message(kind) {
    if (!msgBox) return;
    msgBox.className = 'rv-msg' + (kind === 'ok' ? ' is-ok' : (kind === 'short' || kind === 'fail') ? ' is-bad' : '');
    Array.prototype.forEach.call(msgBox.querySelectorAll('.rv-m'), function (m) {
      m.classList.toggle('is-on', m.getAttribute('data-rv-msg') === kind);
    });
  }

  stars.forEach(function (star, i) {
    star.addEventListener('mouseenter', function () { if (!sent) paint(i + 1); });
    var input = star.querySelector('input');
    if (!input) return;
    input.addEventListener('change', function () {
      if (sent) return;
      rating = i + 1;
      paint(rating);
      form.hidden = false;
      // Two prompts, one per mood: the overlay owns both strings.
      prompts.forEach(function (p) {
        p.hidden = (p.getAttribute('data-rv-prompt') === 'good') !== (rating >= 4);
      });
      message('');
      form.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    });
  });

  card.addEventListener('mouseleave', function () { if (!sent) paint(rating); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sent) return;

    var data = new FormData(form);
    var body = String(data.get('msg') || '').trim();
    var name = String(data.get('name') || '').trim();
    var contact = String(data.get('contact') || '').trim();
    if (data.get('website')) return;                       // honeypot: a bot filled it

    if (!rating) { message('rating'); return; }
    if (body.length < 5) {
      message('short');
      var field = form.querySelector('[name="msg"]');
      if (field) field.focus();
      return;
    }

    if (submit) submit.disabled = true;
    message('sending');

    var payload = {
      access_key: key,
      subject: 'Arvio sivustolta: ' + rating + '/5',
      from_name: fromTag,
      Arvosana: rating + '/5',
      Arvio: body,
      Nimi: name || '-',
      Yhteystieto: contact || '-'
    };
    if (/@/.test(contact)) payload.replyto = contact;

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.success) throw new Error(j.message || r.status);
      });
    }).then(function () {
      done();
    })['catch'](function () {
      // Fallback: hand the visitor a prefilled mail instead of losing the review.
      // Safari reports a blocked fetch as "Load failed", so every failure lands here.
      if (mailTo) {
        var text = 'Arvosana: ' + rating + '/5\n\n' + body + '\n\nNimi: ' + (name || '-') + '\nYhteystieto: ' + (contact || '-');
        window.location.href = 'mailto:' + mailTo +
          '?subject=' + encodeURIComponent('Arvio sivustolta (' + rating + '/5)') +
          '&body=' + encodeURIComponent(text);
        message('mail');
      } else {
        message('fail');
      }
      if (submit) submit.disabled = false;
    });
  });

  function done() {
    sent = true;
    form.reset();
    Array.prototype.forEach.call(form.querySelectorAll('.rv-fld, .rv-row, .rv-actions, [data-rv-prompt]'), function (el) {
      el.hidden = true;
    });
    message('ok');
    if (google && rating >= 4) google.hidden = false;
    stars.forEach(function (s) {
      var input = s.querySelector('input');
      if (input) input.disabled = true;
    });
  }
})();
