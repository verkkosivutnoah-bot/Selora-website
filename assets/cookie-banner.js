/* Selora cookie banner — minimal GDPR-friendly. Stores consent in localStorage. */
(function () {
  'use strict';
  var KEY = 'selora.cookie.consent';
  if (localStorage.getItem(KEY)) return; // already decided

  var lang = (document.documentElement.lang || 'fi').slice(0, 2);
  var fi = lang === 'fi';
  var t = {
    title:    fi ? 'Käytämme välttämättömiä evästeitä' : 'We use essential cookies',
    body:     fi
      ? 'Selora käyttää vain teknisesti välttämättömiä evästeitä sivuston toiminnan varmistamiseksi. Emme seuraa käyttöäsi mainostarkoituksiin. Lue lisää tietosuojaselosteestamme.'
      : 'Selora uses only essential cookies needed for the site to work. We do not track you for advertising. See our privacy policy for details.',
    accept:   fi ? 'Selvä' : 'Got it',
    policy:   fi ? 'Tietosuojaseloste' : 'Privacy policy',
    policyUrl: '/tietosuojaseloste.html',
  };

  var css = [
    '.selora-cookie{position:fixed;bottom:1.25rem;left:1.25rem;right:1.25rem;max-width:480px;margin:0 auto;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:1.1rem 1.2rem;font-family:Inter,sans-serif;font-size:0.85rem;line-height:1.55;box-shadow:0 16px 40px rgba(0,0,0,0.35);z-index:99998;opacity:0;transform:translateY(20px);transition:opacity 0.4s ease,transform 0.4s ease;}',
    '.selora-cookie.in{opacity:1;transform:translateY(0);}',
    '.selora-cookie h4{font-size:0.9rem;font-weight:600;margin:0 0 0.35rem;}',
    '.selora-cookie p{font-size:0.78rem;color:rgba(255,255,255,0.72);margin:0 0 0.85rem;line-height:1.6;}',
    '.selora-cookie a{color:#60a5fa;text-decoration:underline;}',
    '.selora-cookie button{background:#1D4ED8;color:#fff;border:none;border-radius:9px;padding:0.55rem 1.1rem;font:600 0.78rem Inter,sans-serif;cursor:pointer;transition:background 0.2s;}',
    '.selora-cookie button:hover{background:#1e40af;}',
    '@media(min-width:600px){.selora-cookie{left:auto;right:1.5rem;}}',
  ].join('');

  var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);

  var box = document.createElement('div');
  box.className = 'selora-cookie';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', t.title);
  box.innerHTML =
    '<h4>' + t.title + '</h4>' +
    '<p>' + t.body + ' <a href="' + t.policyUrl + '">' + t.policy + '</a>.</p>' +
    '<button type="button">' + t.accept + '</button>';
  document.body.appendChild(box);
  requestAnimationFrame(function () { box.classList.add('in'); });
  box.querySelector('button').addEventListener('click', function () {
    try { localStorage.setItem(KEY, '1'); } catch (_) {}
    box.classList.remove('in');
    setTimeout(function () { box.remove(); }, 420);
  });
})();
