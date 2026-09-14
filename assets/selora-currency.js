/* Currency switch for the pricing packages.
 *
 * Every convertible figure carries data-price="<euro amount>" and the table
 * below holds the finished string for each currency, so the page never does
 * arithmetic or rounding in the browser. The USD and CAD figures are marketing
 * prices set by hand from the 2026-09-09 rates (1 EUR = 1.165 USD = 1.604 CAD),
 * rounded up to a round number rather than converted to the cent.
 *
 * Every element the switch writes to also carries data-i18n-skip, so i18n.js
 * leaves it alone. That matters: i18n restores each text node from its own
 * stashed original on every language change, which would put the euro price
 * back the moment someone switched language.
 */
(function () {
  var TABLE = {
    '298': { eur: '298 €', usd: '$349',   cad: 'CA$479' },
    '498': { eur: '498 €', usd: '$589',   cad: 'CA$799' },
    '898': { eur: '898 €', usd: '$1,049', cad: 'CA$1,449' },
    '29':  { eur: '29 €',  usd: '$35',    cad: 'CA$47' }
  };

  var KEY = 'seloraCurrency';
  var VALID = { eur: 1, usd: 1, cad: 1 };

  function saved() {
    try {
      var c = localStorage.getItem(KEY);
      return VALID[c] ? c : 'eur';
    } catch (e) { return 'eur'; }
  }

  function apply(cur) {
    document.querySelectorAll('[data-price]').forEach(function (el) {
      var row = TABLE[el.getAttribute('data-price')];
      if (row && row[cur]) el.textContent = row[cur];
    });
    document.querySelectorAll('.cur-toggle [data-currency]').forEach(function (b) {
      var on = b.getAttribute('data-currency') === cur;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function set(cur) {
    if (!VALID[cur]) cur = 'eur';
    try { localStorage.setItem(KEY, cur); } catch (e) {}
    apply(cur);
  }

  function init() {
    if (!document.querySelector('.cur-toggle')) return;
    document.querySelectorAll('.cur-toggle [data-currency]').forEach(function (b) {
      b.addEventListener('click', function () { set(b.getAttribute('data-currency')); });
    });
    apply(saved());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
