/* ============================================================
   SELORA FLOW FIELD
   Vanilla port of the 21st.dev Shader Builder "Flow field",
   recoloured to the Selora palette. No React, no dependencies.

   Usage:
     <canvas data-selora-flowfield></canvas>
   The canvas fills its parent; give the parent position:relative.

   Contract:
   - No WebGL, no canvas, or prefers-reduced-motion: renders one
     static frame (or nothing) and never starts a loop.
   - Pauses while the tab is hidden or the canvas is off-screen.
   - DPR capped and total pixels budgeted, so a full-bleed section
     background does not cost more than the hero.
   ============================================================ */
(function () {
  'use strict';

  var VERT = [
    'attribute vec2 a_position;',
    'void main() { gl_Position = vec4(a_position, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    '',
    'uniform vec3 u_colors[8];',
    'uniform vec4 u_scene;      // resolution.xy, time, colour count',
    'uniform vec4 u_shape;      // scale, intensity, paramA, warp',
    'uniform vec4 u_surface;    // detail, contrast, brightness, saturation',
    'uniform vec4 u_finish;     // hue, vignette, blur, grain',
    'uniform vec4 u_transform;  // seed, rotation, drift, OKLab toggle',
    'uniform vec4 u_space;      // offset.xy, pointer.xy',
    'uniform vec4 u_cursor;',
    '',
    '#define u_resolution u_scene.xy',
    '#define u_time u_scene.z',
    '#define u_colorCount u_scene.w',
    '#define u_scale u_shape.x',
    '#define u_intensity u_shape.y',
    '#define u_warp u_shape.w',
    '#define u_detail u_surface.x',
    '#define u_contrast u_surface.y',
    '#define u_brightness u_surface.z',
    '#define u_saturation u_surface.w',
    '#define u_hue u_finish.x',
    '#define u_vignette u_finish.y',
    '#define u_blur u_finish.z',
    '#define u_grain u_finish.w',
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    '#define u_seed u_transform.x',
    '#else',
    '#define u_seed mod(u_transform.x, 31.0)',
    '#endif',
    '#define u_rotate u_transform.y',
    '#define u_drift u_transform.z',
    '#define u_oklab u_transform.w',
    '#define u_offset u_space.xy',
    '#define u_mouse u_space.zw',
    '#define u_cursorPresence u_cursor.x',
    '#define u_cursorEffect u_cursor.y',
    '#define u_cursorStrength u_cursor.z',
    '#define u_cursorRadius u_cursor.w',
    '',
    'float hash21(vec2 p) {',
    '#ifndef GL_FRAGMENT_PRECISION_HIGH',
    '  p = mod(p, 31.0);',
    '#endif',
    '  p = fract(p * vec2(234.34, 435.345));',
    '  p += dot(p, p + 34.23);',
    '  return fract(p.x * p.y);',
    '}',
    '',
    'float grainHash(vec2 p) {',
    '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
    '  p3 += dot(p3, p3.yzx + 33.33);',
    '  return fract((p3.x + p3.y) * p3.z);',
    '}',
    '',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(',
    '    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),',
    '    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),',
    '    u.y);',
    '}',
    '',
    'float fbm(vec2 p) {',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  for (int i = 0; i < 5; i++) {',
    '    v += a * noise(p);',
    '    p = p * 2.03 + vec2(17.0, 9.2);',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    'vec3 mixColour(vec3 a, vec3 b, float t) { return mix(a, b, t); }',
    '',
    'vec3 palette(float x) {',
    '  float n = max(u_colorCount - 1.0, 1.0);',
    '  float f = clamp(x, 0.0, 1.0) * n;',
    '  vec3 col = u_colors[0];',
    '  for (int i = 0; i < 7; i++) {',
    '    if (float(i) < n)',
    '      col = mixColour(col, u_colors[i + 1],',
    '        smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0)));',
    '  }',
    '  return col;',
    '}',
    '',
    'vec3 shade(vec2 uv, vec2 p, float t) {',
    '  float a = fbm(p * 2.0 + u_seed) * 6.2831;',
    '  vec2 dir = vec2(cos(a), sin(a));',
    '  float v = fbm(p * 3.0 + dir * (u_intensity * 2.0) + t * 0.12);',
    '  return palette(v);',
    '}',
    '',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / u_resolution.xy;',
    '  vec2 screenUv = uv;',
    '  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy)',
    '    / min(u_resolution.x, u_resolution.y);',
    '  float cursorMask = 0.0;',
    '',
    '  if (u_cursorPresence > 0.001) {',
    '    vec2 cursor = (0.5 * u_mouse * u_resolution.xy)',
    '      / min(u_resolution.x, u_resolution.y);',
    '    p += cursor * u_cursorPresence * u_cursorStrength * 0.55;',
    '  }',
    '',
    '  uv = p * min(u_resolution.x, u_resolution.y) / u_resolution.xy + 0.5;',
    '  p *= u_scale;',
    '  if (abs(u_rotate) > 0.0001) {',
    '    float cr = cos(u_rotate), sr = sin(u_rotate);',
    '    p = mat2(cr, -sr, sr, cr) * p;',
    '  }',
    '  p += u_offset;',
    '  if (u_drift > 0.0001)',
    '    p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));',
    '  if (u_warp > 0.0) {',
    '    p += u_warp * (vec2(',
    '      fbm(p * u_detail + u_seed),',
    '      fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);',
    '  }',
    '  vec3 col = shade(uv, p, u_time);',
    '  if (abs(u_contrast - 1.0) > 0.0001)',
    '    col = (col - 0.5) * u_contrast + 0.5;',
    '  if (abs(u_saturation - 1.0) > 0.0001) {',
    '    float luma = dot(col, vec3(0.299, 0.587, 0.114));',
    '    col = mix(vec3(luma), col, u_saturation);',
    '  }',
    '  if (abs(u_brightness) > 0.0001)',
    '    col += u_brightness;',
    '  if (u_vignette > 0.0001) {',
    '    float vd = length(screenUv - 0.5) * 1.41421356;',
    '    col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);',
    '  }',
    '  if (u_grain > 0.0001)',
    '    col += (grainHash(',
    '      gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;',
    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  /* Selora palette. Keeps the original recipe's dark -> mid -> deep -> light
     rhythm, with the greys swapped for brand navy and blues. */
  var U = {
    colors: [
      [0.024, 0.047, 0.094],  // #060c18 navy floor
      [0.220, 0.360, 0.720],  // muted brand blue
      [0.070, 0.130, 0.300],  // deep blue shadow
      [0.560, 0.720, 0.980],  // #8fb8fa light lift
      [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]
    ],
    colorCount: 4,
    scale: 1.5,
    intensity: 0.55,
    warp: 0.0,
    detail: 2.4,
    contrast: 1.005,
    brightness: -0.04,   // sits behind white copy, so bias it darker
    saturation: 0.95,
    hue: 0.0,
    vignette: 0.5,
    blur: 0.0,
    grain: 0.055,
    seed: 1.0,
    rotate: 0.0,
    offsetX: 0.0,
    offsetY: 0.0,
    drift: 0.0,
    cursorStrength: 0.22,
    cursorRadius: 0.385,
    timeScale: 1.392,
    maxPixels: 1400000
  };

  function init(canvas) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
          || canvas.getContext('experimental-webgl');
    if (!gl) return;

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { gl.deleteShader(sh); return null; }
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
    var loc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uni = {
      colors: gl.getUniformLocation(prog, 'u_colors'),
      scene: gl.getUniformLocation(prog, 'u_scene'),
      shape: gl.getUniformLocation(prog, 'u_shape'),
      surface: gl.getUniformLocation(prog, 'u_surface'),
      finish: gl.getUniformLocation(prog, 'u_finish'),
      transform: gl.getUniformLocation(prog, 'u_transform'),
      space: gl.getUniformLocation(prog, 'u_space'),
      cursor: gl.getUniformLocation(prog, 'u_cursor')
    };

    var flat = [];
    for (var i = 0; i < U.colors.length; i++) flat.push(U.colors[i][0], U.colors[i][1], U.colors[i][2]);
    gl.uniform3fv(uni.colors, new Float32Array(flat));
    gl.uniform4f(uni.shape, U.scale, U.intensity, 0.5, U.warp);
    gl.uniform4f(uni.surface, U.detail, U.contrast, U.brightness, U.saturation);
    gl.uniform4f(uni.finish, U.hue, U.vignette, U.blur, U.grain);
    gl.uniform4f(uni.transform, U.seed, U.rotate, U.drift, 0.0);
    gl.uniform4f(uni.cursor, 0, 0, U.cursorStrength, U.cursorRadius);

    var mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
    var presence = 0, targetPresence = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      var w = Math.max(1, Math.round((canvas.offsetWidth || 1) * dpr));
      var h = Math.max(1, Math.round((canvas.offsetHeight || 1) * dpr));
      var budget = Math.min(1, Math.sqrt(U.maxPixels / Math.max(1, w * h)));
      w = Math.max(1, Math.round(w * budget));
      h = Math.max(1, Math.round(h * budget));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    var start = performance.now();

    function draw(t) {
      gl.uniform4f(uni.scene, canvas.width, canvas.height, t * U.timeScale, U.colorCount);
      gl.uniform4f(uni.space, U.offsetX, U.offsetY, mouseX, mouseY);
      gl.uniform4f(uni.cursor, presence, 0, U.cursorStrength, U.cursorRadius);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    resize();
    window.addEventListener('resize', function () { resize(); }, { passive: true });
    // fonts, images and late layout can change the box after first paint
    if ('ResizeObserver' in window) new ResizeObserver(function () { resize(); }).observe(canvas);

    if (reduced) { draw(0); return; }

    window.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) { targetPresence = 0; return; }
      targetX = ((e.clientX - r.left) / r.width) * 2 - 1;
      targetY = -(((e.clientY - r.top) / r.height) * 2 - 1);
      targetPresence = 1;
    }, { passive: true });

    var visible = true, running = false, last = null;

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) kick();
      }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });

    function kick() { if (!running) { running = true; last = null; requestAnimationFrame(loop); } }

    function loop(now) {
      if (document.hidden || !visible) { running = false; return; }
      var dt = last === null ? 0 : Math.min((now - last) / 1000, 0.1);
      last = now;
      var follow = 1 - Math.exp(-12 * dt);
      mouseX += (targetX - mouseX) * follow;
      mouseY += (targetY - mouseY) * follow;
      presence += (targetPresence - presence) * follow;
      resize();
      draw((now - start) / 1000);
      requestAnimationFrame(loop);
    }
    kick();
  }

  function boot() {
    var nodes = document.querySelectorAll('canvas[data-selora-flowfield]');
    Array.prototype.forEach.call(nodes, init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
