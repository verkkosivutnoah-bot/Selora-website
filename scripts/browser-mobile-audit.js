/* Mobile audit, run inside the page via javascript_tool.

   Paste or fetch this, then call window.__mobileAudit(). Resize the
   viewport to 375 first, and reload after resizing: some layout only
   settles at load.

   Reports: horizontal overflow, elements past the right edge, tap
   targets under 44px, type under 12px, and text clipped by a fixed
   height. Elements in off-canvas panels (the mobile menu) legitimately
   sit past the right edge, so treat those as noise.
*/

window.__mobileAudit = function () {
  var vw = window.innerWidth;
  var out = { viewport: vw + 'x' + window.innerHeight, overflow: null, wide: [], tap: [], tiny: [], clipped: [] };

  out.overflow = document.documentElement.scrollWidth - vw;

  var all = document.querySelectorAll('body *');
  Array.prototype.forEach.call(all, function (el) {
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    var id = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0,2).join('.') : '');

    // elements sticking out past the right edge
    if (r.right > vw + 1 && cs.position !== 'fixed') {
      out.wide.push({ el: id, right: Math.round(r.right), w: Math.round(r.width) });
    }
    // tap targets
    if (/^(a|button|summary)$/i.test(el.tagName) && el.offsetParent !== null) {
      var min = Math.min(r.width, r.height);
      if (min > 0 && min < 44) out.tap.push({ el: id, size: Math.round(r.width) + 'x' + Math.round(r.height), text: (el.textContent||'').trim().slice(0,24) });
    }
    // tiny type on text-bearing leaves
    if (el.children.length === 0 && (el.textContent || '').trim().length > 8) {
      var fs = parseFloat(cs.fontSize);
      if (fs && fs < 12) out.tiny.push({ el: id, size: fs, text: el.textContent.trim().slice(0,28) });
    }
    // text clipped by a fixed height
    if (el.scrollHeight > el.clientHeight + 2 && cs.overflowY === 'hidden' && el.clientHeight > 0) {
      out.clipped.push({ el: id, need: el.scrollHeight, have: el.clientHeight });
    }
  });

  ['wide','tap','tiny','clipped'].forEach(function (k) {
    out[k + 'Count'] = out[k].length;
    out[k] = out[k].slice(0, 12);
  });
  return out;
};
