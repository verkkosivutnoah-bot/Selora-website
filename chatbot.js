/* =============================================================
   Selora AI Chatbot Widget
   Morphing pill -> panel, color orb, no emojis
   ============================================================= */
(function () {
  'use strict';

  var API  = '/api/chat';
  var BLUE = '#1D4ED8';
  var BLUE_DARK = '#1e40af';

  var SUGGESTIONS = [
    'Miten tekoälyvastaanottaja toimii?',
    'Mitä palveluja tarjoatte?',
    'Paljonko se maksaa?',
    'Kuinka nopeasti pääsen alkuun?',
    'Vertaa tekoälyä ja ihmisvastaanottajaa',
  ];

  /* ── CSS ───────────────────────────────────────────────────── */
  var css = [
    '@property --slr-angle{syntax:"<angle>";inherits:false;initial-value:0deg;}',

    '#slr-wrap{position:fixed;bottom:24px;right:24px;z-index:99999;}',

    /* Morphing container */
    '#slr-morph{',
      'position:relative;',
      'overflow:hidden;',
      'background:#fff;',
      'border:1px solid #e2e8f0;',
      'box-shadow:0 8px 40px rgba(0,0,0,.14),0 2px 8px rgba(0,0,0,.06);',
      'transition:',
        'width .34s cubic-bezier(.34,1.4,.64,1),',
        'height .34s cubic-bezier(.34,1.4,.64,1),',
        'border-radius .3s ease;',
      'width:138px;height:44px;border-radius:22px;',
    '}',
    '#slr-morph.open{width:360px;height:560px;border-radius:16px;}',

    /* Form panel (absolute, fills above dock) */
    '#slr-form{',
      'position:absolute;top:0;left:0;right:0;bottom:44px;',
      'display:flex;flex-direction:column;overflow:hidden;',
      'opacity:0;pointer-events:none;',
      'transition:opacity .2s ease;',
    '}',
    '#slr-morph.open #slr-form{opacity:1;pointer-events:auto;}',

    /* Header */
    '#slr-hd{',
      'padding:14px 16px 11px;',
      'display:flex;align-items:center;gap:10px;',
      'border-bottom:1px solid #f1f5f9;flex-shrink:0;',
    '}',
    '#slr-hd-title{',
      'flex:1;font-family:Inter,sans-serif;',
      'font-size:.875rem;font-weight:600;color:#1e293b;letter-spacing:-.01em;',
    '}',
    '#slr-hd-sub{font-family:Inter,sans-serif;font-size:.7rem;color:#94a3b8;margin-top:1px;}',
    '#slr-x{',
      'background:none;border:none;cursor:pointer;color:#94a3b8;',
      'display:flex;align-items:center;padding:4px;border-radius:6px;',
      'transition:color .15s,background .15s;',
    '}',
    '#slr-x:hover{color:#1e293b;background:#f1f5f9;}',

    /* Messages */
    '#slr-msgs{',
      'flex:1;overflow-y:auto;padding:14px 14px 8px;',
      'display:flex;flex-direction:column;gap:10px;min-height:0;',
    '}',
    '#slr-msgs::-webkit-scrollbar{width:3px;}',
    '#slr-msgs::-webkit-scrollbar-track{background:transparent;}',
    '#slr-msgs::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:3px;}',

    /* Bubbles */
    '.slr-row{display:flex;gap:8px;align-items:flex-end;}',
    '.slr-row.user{flex-direction:row-reverse;}',
    '.slr-bub{',
      'max-width:82%;padding:9px 12px;border-radius:14px;',
      'font-size:.835rem;line-height:1.58;word-break:break-word;',
      'font-family:Inter,sans-serif;',
    '}',
    '.slr-row.ai .slr-bub{background:#f1f5f9;color:#1e293b;border-bottom-left-radius:4px;}',
    '.slr-row.user .slr-bub{background:' + BLUE + ';color:#fff;border-bottom-right-radius:4px;}',
    '.slr-bub a{color:' + BLUE + ';text-decoration:underline;}',
    '.slr-row.user .slr-bub a{color:#bfdbfe;}',
    '.slr-bub strong{font-weight:600;}',
    '.slr-bub em{font-style:italic;}',
    '.slr-bub ul{margin:5px 0 2px 16px;padding:0;}',
    '.slr-bub li{margin-bottom:3px;}',
    '.slr-bub p{margin:0 0 5px;}',
    '.slr-bub p:last-child{margin-bottom:0;}',

    /* Typing dots */
    '.slr-dots{',
      'display:flex;gap:4px;align-items:center;padding:10px 12px;',
      'background:#f1f5f9;border-radius:14px;border-bottom-left-radius:4px;width:fit-content;',
    '}',
    '.slr-dots span{',
      'width:5px;height:5px;background:#94a3b8;border-radius:50%;',
      'animation:slrBounce 1.1s ease-in-out infinite;',
    '}',
    '.slr-dots span:nth-child(2){animation-delay:.18s;}',
    '.slr-dots span:nth-child(3){animation-delay:.36s;}',
    '@keyframes slrBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}',

    /* Suggestions */
    '#slr-sugg{padding:2px 12px 8px;display:flex;flex-wrap:wrap;gap:5px;flex-shrink:0;}',
    '.slr-chip{',
      'background:#eff6ff;color:' + BLUE + ';border:1.5px solid #bfdbfe;',
      'border-radius:20px;padding:4px 11px;font-size:.73rem;cursor:pointer;',
      'font-family:Inter,sans-serif;transition:background .14s;white-space:nowrap;line-height:1.4;',
    '}',
    '.slr-chip:hover{background:#dbeafe;}',

    /* Input row */
    '#slr-foot{',
      'border-top:1px solid #f1f5f9;padding:9px 10px;',
      'display:flex;gap:7px;align-items:flex-end;flex-shrink:0;',
    '}',
    '#slr-in{',
      'flex:1;border:1.5px solid #e2e8f0;border-radius:10px;',
      'padding:8px 12px;font-size:.835rem;font-family:Inter,sans-serif;',
      'resize:none;outline:none;max-height:96px;line-height:1.45;color:#1e293b;background:#fff;',
    '}',
    '#slr-in:focus{border-color:' + BLUE + ';}',
    '#slr-in::placeholder{color:#94a3b8;}',
    '#slr-send{',
      'width:36px;height:36px;background:' + BLUE + ';',
      'border:none;border-radius:9px;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;flex-shrink:0;',
      'transition:background .14s;',
    '}',
    '#slr-send:hover{background:' + BLUE_DARK + ';}',
    '#slr-send:disabled{background:#cbd5e1;cursor:not-allowed;}',

    /* Powered-by */
    '#slr-pw{',
      'text-align:center;font-size:.63rem;color:#cbd5e1;',
      'font-family:Inter,sans-serif;padding:4px 0 6px;flex-shrink:0;',
    '}',

    /* Dock bar — always visible at bottom */
    '#slr-dock{',
      'position:absolute;bottom:0;left:0;right:0;height:44px;',
      'display:flex;align-items:center;gap:9px;padding:0 16px;',
      'cursor:pointer;user-select:none;',
      'background:#fff;',
    '}',
    '#slr-morph.open #slr-dock{border-top:1px solid #f1f5f9;cursor:default;}',
    '#slr-dock-label{',
      'font-family:Inter,sans-serif;font-size:.875rem;font-weight:500;',
      'color:#1e293b;white-space:nowrap;',
    '}',

    /* Color Orb */
    '.slr-orb{',
      'width:20px;height:20px;border-radius:50%;overflow:hidden;',
      'position:relative;flex-shrink:0;',
    '}',
    '.slr-orb-inner{',
      'width:100%;height:100%;border-radius:50%;transform:scale(1.15);',
      'background:',
        'conic-gradient(from calc(var(--slr-angle)*2) at 25% 70%,#60A5FA,transparent 20% 80%,#60A5FA),',
        'conic-gradient(from calc(var(--slr-angle)*2) at 45% 75%,#3B82F6,transparent 30% 60%,#3B82F6),',
        'conic-gradient(from calc(var(--slr-angle)*-3) at 80% 20%,#1D4ED8,transparent 40% 60%,#1D4ED8),',
        'conic-gradient(from calc(var(--slr-angle)*2) at 15% 5%,#93C5FD,transparent 10% 90%,#93C5FD),',
        'conic-gradient(from calc(var(--slr-angle)*-2) at 85% 10%,#BFDBFE,transparent 20% 80%,#BFDBFE);',
      'filter:blur(1.4px) contrast(2.2);',
      'animation:slrOrb 18s linear infinite;',
    '}',
    '@keyframes slrOrb{to{--slr-angle:360deg;}}',

    /* Mobile */
    '@media(max-width:420px){',
      '#slr-wrap{right:10px;bottom:14px;}',
      '#slr-morph.open{width:calc(100vw - 20px);}',
    '}',
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── HTML ──────────────────────────────────────────────────── */
  var wrap = document.createElement('div');
  wrap.id = 'slr-wrap';

  var SEND_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  var CLOSE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var ORB = '<div class="slr-orb"><div class="slr-orb-inner"></div></div>';

  wrap.innerHTML =
    '<div id="slr-morph">' +

      /* Form panel */
      '<div id="slr-form">' +
        '<div id="slr-hd">' +
          ORB +
          '<div><div id="slr-hd-title">Selora Assistentti</div><div id="slr-hd-sub">Vastaan yleensa heti</div></div>' +
          '<button id="slr-x" aria-label="Sulje">' + CLOSE_ICON + '</button>' +
        '</div>' +
        '<div id="slr-msgs"></div>' +
        '<div id="slr-sugg"></div>' +
        '<div id="slr-foot">' +
          '<textarea id="slr-in" rows="1" placeholder="Kirjoita viestisi..." maxlength="800"></textarea>' +
          '<button id="slr-send" aria-label="Laheta">' + SEND_ICON + '</button>' +
        '</div>' +
        '<div id="slr-pw">Selora AI</div>' +
      '</div>' +

      /* Dock bar */
      '<div id="slr-dock">' +
        ORB +
        '<span id="slr-dock-label">Selora AI</span>' +
      '</div>' +

    '</div>';

  document.body.appendChild(wrap);

  /* ── Refs ──────────────────────────────────────────────────── */
  var morph   = document.getElementById('slr-morph');
  var msgsEl  = document.getElementById('slr-msgs');
  var suggEl  = document.getElementById('slr-sugg');
  var inputEl = document.getElementById('slr-in');
  var sendBtn = document.getElementById('slr-send');
  var closeBtn = document.getElementById('slr-x');
  var dock    = document.getElementById('slr-dock');

  var history = [];
  var isOpen  = false;
  var loading = false;

  /* ── Open / close ──────────────────────────────────────────── */
  function open() {
    isOpen = true;
    morph.classList.add('open');
    if (history.length === 0) greeting();
    setTimeout(function () { inputEl.focus(); }, 360);
  }
  function close() {
    isOpen = false;
    morph.classList.remove('open');
  }

  dock.addEventListener('click', function () { if (!isOpen) open(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('mousedown', function (e) {
    if (isOpen && !morph.contains(e.target)) close();
  });

  /* ── Greeting ──────────────────────────────────────────────── */
  function greeting() {
    addBubble('ai', 'Hei. Olen Seloran AI-assistentti. Voin kertoa palveluistamme, vastata kysymyksiin ja ohjata sinut oikealle sivulle.\n\nMiten voin auttaa?');
    renderSuggestions();
  }

  /* ── Suggestions ───────────────────────────────────────────── */
  function renderSuggestions() {
    suggEl.innerHTML = '';
    SUGGESTIONS.forEach(function (q) {
      var chip = document.createElement('button');
      chip.className = 'slr-chip';
      chip.textContent = q;
      chip.addEventListener('click', function () {
        suggEl.innerHTML = '';
        sendMessage(q);
      });
      suggEl.appendChild(chip);
    });
  }

  /* ── Bubbles ───────────────────────────────────────────────── */
  function addBubble(role, text) {
    var row = document.createElement('div');
    row.className = 'slr-row ' + role;
    var bub = document.createElement('div');
    bub.className = 'slr-bub';
    bub.innerHTML = renderMd(text);
    row.appendChild(bub);
    msgsEl.appendChild(row);
    scroll();
  }

  /* ── Typing indicator ──────────────────────────────────────── */
  function showTyping() {
    var row = document.createElement('div');
    row.className = 'slr-row ai';
    row.id = 'slr-typing';
    row.innerHTML = '<div class="slr-dots"><span></span><span></span><span></span></div>';
    msgsEl.appendChild(row);
    scroll();
  }
  function hideTyping() {
    var t = document.getElementById('slr-typing');
    if (t) t.remove();
  }

  /* ── Send ──────────────────────────────────────────────────── */
  function sendMessage(text) {
    text = (text || '').trim();
    if (!text || loading) return;

    suggEl.innerHTML = '';
    addBubble('user', text);
    history.push({ role: 'user', content: text });
    inputEl.value = '';
    resize();
    loading = true;
    sendBtn.disabled = true;
    showTyping();

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        hideTyping();
        var reply = data.content || 'Pahoittelen, tapahtui virhe.';
        addBubble('ai', reply);
        history.push({ role: 'assistant', content: reply });
      })
      .catch(function (err) {
        hideTyping();
        addBubble('ai', 'Pahoittelen, yhteys katkesi. Kokeile uudelleen tai ota [yhteytta](/yhteystiedot.html).');
        console.error('[Selora chat]', err);
      })
      .finally(function () {
        loading = false;
        sendBtn.disabled = false;
        inputEl.focus();
      });
  }

  /* ── Input events ──────────────────────────────────────────── */
  function resize() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 96) + 'px';
  }
  inputEl.addEventListener('input', resize);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputEl.value); }
    if (e.key === 'Escape') close();
  });
  sendBtn.addEventListener('click', function () { sendMessage(inputEl.value); });

  /* ── Scroll ────────────────────────────────────────────────── */
  function scroll() {
    setTimeout(function () { msgsEl.scrollTop = msgsEl.scrollHeight; }, 30);
  }

  /* ── Markdown renderer ─────────────────────────────────────── */
  function renderMd(raw) {
    var t = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    t = t.replace(/\[([^\]]+)\]\((\/[^\)]+)\)/g, '<a href="$2">$1</a>');

    var lines = t.split('\n');
    var out = '';
    var inList = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^[-*] /.test(line)) {
        if (!inList) { out += '<ul>'; inList = true; }
        out += '<li>' + line.replace(/^[-*] /, '') + '</li>';
      } else {
        if (inList) { out += '</ul>'; inList = false; }
        out += (line.trim() === '') ? '</p><p>' : line + ' ';
      }
    }
    if (inList) out += '</ul>';

    out = '<p>' + out + '</p>';
    out = out
      .replace(/<p>\s*<\/p>/g, '')
      .replace(/<p>(<ul>)/g, '$1')
      .replace(/(<\/ul>)<\/p>/g, '$1');
    return out;
  }

})();
