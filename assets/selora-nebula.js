/* ============================================================
   SELORA NEBULA
   Ray-marched nebula background for the hero, rendered with raw
   WebGL. No three.js: this is a single full-screen quad, so the
   library would add ~600KB for nothing.

   Contract:
   - Targets #pageCanvas. If WebGL is missing, the canvas is left
     alone so any 2D fallback still shows.
   - prefers-reduced-motion renders exactly one static frame.
   - Pauses while the tab is hidden or the hero is scrolled away,
     so it never burns GPU behind other content.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('pageCanvas');
  if (!canvas) return;

  var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
        || canvas.getContext('experimental-webgl');
  if (!gl) return; // leave the existing canvas untouched

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var VERT = [
    'attribute vec2 p;',
    'void main(){ gl_Position = vec4(p, 0.0, 1.0); }'
  ].join('\n');

  /* Selora palette: deep navy base lifted into brand blues.
     base  #060c18   mid #1D4ED8   lift #3b82f6 / #60A5FA        */
  var FRAG = [
    'precision mediump float;',
    'uniform vec2 iResolution;',
    'uniform float iTime;',
    'uniform vec2 iMouse;',
    '',
    'mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }',
    '',
    'float map(vec3 p, float t){',
    '  p.xz *= rot(t * 0.32);',
    '  p.xy *= rot(t * 0.24);',
    '  vec3 q = p * 2.0 + t;',
    '  return length(p + vec3(sin(t * 0.6))) * log(length(p) + 1.0)',
    '       + sin(q.x + sin(q.z + sin(q.y))) * 0.5 - 1.0;',
    '}',
    '',
    'void main(){',
    '  vec2 frag = gl_FragCoord.xy;',
    '  /* frame off the LARGER axis and anchor the nebula right of centre, so',
    '     short page heroes and tall full-screen heroes both stay composed */',
    '  float s = max(iResolution.x, iResolution.y) * 0.62;',
    '  vec2 uv = (frag - iResolution * vec2(0.66, 0.5)) / s;',
    '',
    '  /* gentle pointer drift */',
    '  vec2 m = (iMouse / iResolution - 0.5);',
    '  uv += m * 0.12;',
    '',
    '  float t = iTime;',
    '  vec3 col = vec3(0.0);',
    '  float d = 2.5;',
    '',
    '  for (int i = 0; i <= 5; i++) {',
    '    vec3 p = vec3(0.0, 0.0, 5.0) + normalize(vec3(uv, -1.0)) * d;',
    '    float rz = map(p, t);',
    '    float f = clamp((rz - map(p + 0.1, t)) * 0.5, -0.1, 1.0);',
    '    /* brand blue ramp: navy shadow -> #1D4ED8 -> #60A5FA highlight */',
    '    vec3 base = vec3(0.04, 0.10, 0.30) + vec3(1.10, 2.40, 6.00) * f;',
    '    col = col * base + smoothstep(2.5, 0.0, rz) * 0.7 * base;',
    '    d += min(rz, 1.0);',
    '  }',
    '',
    '  /* keep the middle calm so hero text stays readable */',
    '  float dist = distance(frag, iResolution * 0.5);',
    '  float radius = min(iResolution.x, iResolution.y) * 0.5;',
    '  float dim = smoothstep(radius * 0.25, radius * 0.62, dist);',
    '  col = mix(col * 0.30, col, dim);',
    '',
    '  /* sit the whole thing on the brand navy */',
    '  col = max(col, vec3(0.024, 0.047, 0.094));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes   = gl.getUniformLocation(prog, 'iResolution');
  var uTime  = gl.getUniformLocation(prog, 'iTime');
  var uMouse = gl.getUniformLocation(prog, 'iMouse');

  var mouse = { x: 0, y: 0 };
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5); // cap: full DPR is wasteful here

  function resize() {
    var w = canvas.offsetWidth || window.innerWidth;
    var h = canvas.offsetHeight || window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    mouse.x = canvas.width * 0.5;
    mouse.y = canvas.height * 0.5;
  }

  function render(t) {
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  if (reduced) { render(0.0); return; } // one static frame, no loop

  window.addEventListener('mousemove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * dpr;
    mouse.y = (r.height - (e.clientY - r.top)) * dpr;
  }, { passive: true });

  var start = performance.now();
  var visible = true;
  var running = true;

  // Stop drawing once the hero is off-screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; requestAnimationFrame(loop); }
    }, { threshold: 0 }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !running) { running = true; requestAnimationFrame(loop); }
  });

  function loop() {
    if (document.hidden || !visible) { running = false; return; }
    render((performance.now() - start) * 0.001);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
