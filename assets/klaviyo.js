/* Klaviyo onsite tracking, gated behind the site's cookie consent.
 *
 * The stub below is the snippet Klaviyo ships: it defines window.klaviyo so
 * calls like klaviyo.push(['identify', ...]) queue up instead of throwing. It
 * touches no network and sets no cookies, so it is safe to define on every
 * page load.
 *
 * The actual klaviyo.js from static.klaviyo.com does set cookies and track the
 * visitor, so it is only injected once localStorage cookie_consent is
 * 'accepted' — the same flag the banner in every public page writes. Queued
 * calls flush automatically when the real script arrives.
 */
(function () {
  var COMPANY_ID = 'Ya3qrG';

  /* ── Klaviyo's own stub, verbatim ─────────────────────────────────────── */
  !function(){if(!window.klaviyo){window._klOnsite=window._klOnsite||[];try{window.klaviyo=new Proxy({},{get:function(n,i){return"push"===i?function(){var n;(n=window._klOnsite).push.apply(n,arguments)}:function(){for(var n=arguments.length,o=new Array(n),w=0;w<n;w++)o[w]=arguments[w];var t="function"==typeof o[o.length-1]?o.pop():void 0,e=new Promise((function(n){window._klOnsite.push([i].concat(o,[function(i){t&&t(i),n(i)}]))}));return e}}})}catch(n){window.klaviyo=window.klaviyo||[],window.klaviyo.push=function(){var n;(n=window._klOnsite).push.apply(n,arguments)}}}}();

  var loaded = false;

  function loadKlaviyo() {
    if (loaded) return;
    loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.type = 'text/javascript';
    s.src = 'https://static.klaviyo.com/onsite/js/' + COMPANY_ID +
            '/klaviyo.js?company_id=' + COMPANY_ID;
    document.head.appendChild(s);
  }

  function consented() {
    try { return localStorage.getItem('cookie_consent') === 'accepted'; }
    catch (e) { return false; }
  }

  if (consented()) { loadKlaviyo(); return; }

  /* Not consented yet. The banner's handlers are defined inline in the page,
     so wrap them once the DOM is parsed and load Klaviyo the moment the
     visitor accepts, without waiting for a reload. */
  function wrap(name) {
    var original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function () {
      var r = original.apply(this, arguments);
      if (consented()) loadKlaviyo();
      return r;
    };
  }

  function wireConsent() {
    wrap('setCookieConsent');
    wrap('cookieSavePrefs');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireConsent);
  } else {
    wireConsent();
  }
})();
