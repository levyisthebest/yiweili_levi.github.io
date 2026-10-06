/* Ribbons — soft flowing canvas ribbons behind the page, with scroll parallax.
   Tuned to stay subtle under text; respects prefers-reduced-motion; pauses when hidden. */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'ribbons-bg';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var opt = {
    ribbonCount: 4,
    horizontalSpeed: 170,     // px per section
    verticalWander: 0.12,     // fraction of viewport height per step
    colorCycleSpeed: 4,       // hue drift per section
    colorSaturation: '70%',
    parallaxAmount: -0.4,     // scroll parallax
    fadeIn: 0.022,
    holdFrames: 110,
    fadeOut: 0.012
  };
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function alphaBase() { return isDark() ? 0.11 : 0.13; }
  function bright() { return isDark() ? '56%' : '62%'; }
  // vertical wander in absolute px, capped so tall viewports never produce giant triangles
  function wander() { return Math.min(H * opt.verticalWander, 90); }

  var W = 0, H = 0, py = 0, ribbons = [], raf = null, running = false;
  function rand(a, b) { return Math.random() * (b - a) + a; }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeRibbon(warm) {
    var dir = Math.random() < 0.5 ? 1 : -1;
    var startX = dir === 1 ? -opt.horizontalSpeed * 1.5 : W + opt.horizontalSpeed * 1.5;
    var y = rand(H * 0.12, H * 0.88) - py;      // spawn inside the visible band
    var r = {
      dir: dir, hue: rand(0, 360), sections: [], done: false,
      p1: { x: startX, y: y + rand(-30, 30) },
      p2: { x: startX + dir * rand(60, 120), y: y + rand(-30, 30) }
    };
    if (warm) {                                   // pre-grow so the page isn't empty at load
      var n = Math.floor(rand(3, 9));
      for (var k = 0; k < n; k++) addSection(r);
      r.sections.forEach(function (s) { s.phase = 1; s.alpha = 1; s.delay = Math.floor(rand(0, opt.holdFrames)); });
      // shift the whole warm ribbon on-screen
      var shift = dir === 1 ? rand(0, W * 0.5) : -rand(0, W * 0.5);
      r.sections.forEach(function (s) { s.p1 = sh(s.p1, shift); s.p2 = sh(s.p2, shift); s.p3 = sh(s.p3, shift); });
      r.p1 = sh(r.p1, shift); r.p2 = sh(r.p2, shift);
    }
    return r;
  }
  function sh(p, dx) { return { x: p.x + dx, y: p.y }; }

  function addSection(r) {
    var step = opt.horizontalSpeed * rand(0.6, 1.1);
    var lo = H * 0.06 - py, hi = H * 0.94 - py;
    var w = wander();
    var p3 = { x: r.p2.x + r.dir * step, y: r.p2.y + rand(-w, w) };
    p3.y = Math.max(lo, Math.min(hi, p3.y));
    r.sections.push({ p1: r.p1, p2: r.p2, p3: p3, hue: r.hue, phase: 0, alpha: 0, delay: 0, fading: false });
    r.p1 = r.p2; r.p2 = p3; r.hue = (r.hue + opt.colorCycleSpeed) % 360;
    if ((r.dir === 1 && r.p2.x > W + opt.horizontalSpeed) || (r.dir === -1 && r.p2.x < -opt.horizontalSpeed)) r.done = true;
  }

  function drawSection(s, a, b) {
    ctx.beginPath();
    ctx.moveTo(s.p1.x, s.p1.y); ctx.lineTo(s.p2.x, s.p2.y); ctx.lineTo(s.p3.x, s.p3.y); ctx.closePath();
    ctx.fillStyle = 'hsla(' + s.hue + ',' + opt.colorSaturation + ',' + b + ',' + (a * s.alpha) + ')';
    ctx.fill();
  }

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    var a = alphaBase(), b = bright();
    ctx.save(); ctx.translate(0, py);
    for (var i = 0; i < ribbons.length; i++) {
      var r = ribbons[i];
      var last = r.sections[r.sections.length - 1];
      if (!r.done && (!last || last.phase > 0.3)) addSection(r);   // grow smoothly
      for (var j = 0; j < r.sections.length; j++) {
        var s = r.sections[j];
        if (!s.fading) {
          s.phase = Math.min(1, s.phase + opt.fadeIn); s.alpha = s.phase;
          if (s.phase >= 1 && ++s.delay > opt.holdFrames) s.fading = true;
        } else { s.alpha -= opt.fadeOut; }
        if (s.alpha > 0) drawSection(s, a, b);
      }
      r.sections = r.sections.filter(function (s) { return !(s.fading && s.alpha <= 0); });
      if (r.done && r.sections.length === 0) ribbons[i] = makeRibbon(false);
    }
    ctx.restore();
    raf = requestAnimationFrame(frame);
  }

  function start() { if (!running) { running = true; frame(); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', function () { py = (window.pageYOffset || 0) * opt.parallaxAmount; }, { passive: true });
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  for (var i = 0; i < opt.ribbonCount; i++) ribbons.push(makeRibbon(true));
  start();
})();
