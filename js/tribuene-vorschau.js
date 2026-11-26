/* Tribüne im Hintergrund der Startseite (Blick vom Rasen nach aussen): Vereinslogos sitzen auf den Plätzen. Drei Entwürfe zum Auswählen (Vorschau). */
(function () {
  var KEY = 'tribuene-design';
  var DESIGNS = [['kurve', 'Kurve'], ['steil', 'Steil'], ['weit', 'Weit']];
  var demo = false, cur = 'kurve', lastWrap = null, lastLogos = [], bar = null;
  try { cur = localStorage.getItem(KEY) || 'kurve'; } catch (e) {}
  if (!DESIGNS.some(function (d) { return d[0] === cur; })) cur = 'kurve';

  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function light() { return document.documentElement.getAttribute('data-theme') === 'light'; }

  /* Blick vom Rasen: 3D-Rechnung. Betrachter in der Mitte des Spielfelds (Augenhöhe 1,7 m), Tribüne als abgerundetes Rechteck rundherum. */
  var VARS = {
    kurve: { a: 62, b: 78, n: 3.2, rows: 34, rise: 0.55, off: 5, ex: 2.7, label: 'Kurve' },
    steil: { a: 46, b: 58, n: 3.6, rows: 44, rise: 0.8, off: 4, ex: 2.1, label: 'Steil' },
    weit:  { a: 100, b: 125, n: 3, rows: 30, rise: 0.5, off: 6, ex: 3.6, label: 'Weit' }
  };
  function sp(v, e) { return (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), e); }

  function geometry(kind, W, H) {
    var V = VARS[kind] || VARS.kurve, seats = [], cx = W / 2, hz = H * 0.64, F = W * 0.36;
    var spacing = 0.55, e = 2 / V.n;
    for (var k = 0; k < V.rows; k++) {
      var sc = 1 + (V.off + k * 0.78) / V.a, scz = 1 + (V.off + k * 0.78) / V.b;
      var hgt = 0.7 + k * V.rise, acc = 0, prev = null, idx = 0;
      for (var ph = -Math.PI; ph <= Math.PI; ph += 0.002) {
        var X = V.a * sc * sp(Math.sin(ph), e), Z = V.b * scz * sp(Math.cos(ph), e);
        if (prev) acc += Math.hypot(X - prev[0], Z - prev[1]);
        prev = [X, Z];
        if (acc < spacing && idx > 0) continue;
        acc = 0; idx++;
        if (Z < 6) continue;
        if (idx % 18 === 0) continue; /* Treppe */
        var sx = cx + X * F / Z, sy = hz - (hgt - 1.7) * F * V.ex / Z;
        if (sx < -10 || sx > W + 10 || sy < -6 || sy > H + 6) continue;
        seats.push({ x: sx, y: sy, z: Z, k: k, a: 0.45 + 0.5 * (k / V.rows) });
      }
    }
    return { seats: seats, hz: hz, F: F, V: V };
  }

  function render(wrap, logos) {
    lastWrap = wrap; lastLogos = logos || [];
    if (!wrap) return;
    wrap.innerHTML = '';
    var W = wrap.clientWidth || window.innerWidth, H = Math.min(wrap.clientHeight || window.innerHeight, window.innerHeight);
    if (W < 900) return;
    var g = geometry(cur, W, H), dpr = Math.min(2, window.devicePixelRatio || 1);
    var cv = document.createElement('canvas');
    cv.width = W * dpr; cv.height = H * dpr; cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;';
    var c = cv.getContext('2d'); c.scale(dpr, dpr);
    var lt = light(), base = lt ? '20,40,34' : '200,225,215';
    /* Rasen: weiche Mähstreifen in Perspektive unterhalb des Horizonts */
    for (var z = 8, st = 0; z < 120; z += 7, st++) {
      var y0 = g.hz + 1.7 * g.F * g.V.ex / z, y1 = g.hz + 1.7 * g.F * g.V.ex / (z + 7);
      if (st % 2 === 0) { c.fillStyle = lt ? 'rgba(15,138,90,.05)' : 'rgba(47,208,143,.035)'; c.fillRect(0, Math.min(y0, y1), W, Math.abs(y0 - y1) + 1); }
    }
    var gr = c.createLinearGradient(0, g.hz - 30, 0, g.hz + 60);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    /* Plätze */
    g.seats.forEach(function (s) {
      var sc = g.F / s.z, w = Math.max(2.2, 0.52 * sc), h = Math.max(1.8, 0.34 * sc);
      var fade = Math.abs(s.x - W / 2) < 400 && s.y > 40 ? 0.55 : 1;
      var al = (lt ? 0.30 : 0.24) * s.a * fade * (s.k % 2 ? 0.8 : 1);
      c.fillStyle = 'rgba(' + base + ',' + al.toFixed(3) + ')';
      c.fillRect(s.x - w / 2, s.y - h / 2, w, h);
    });
    wrap.appendChild(cv);
    /* Logos sitzen auf Plätzen: gleichmässig gewählt, ausserhalb des Inhalts, Grösse nach Entfernung */
    var free = g.seats.filter(function (s) { return s.z > 12 && Math.abs(s.x - W / 2) > 410 && s.y > 30 && s.y < H - 30 && s.x > 24 && s.x < W - 24; });
    var items = lastLogos.slice();
    if (demo) { var base0 = items.length ? items : [{ name: 'Beispiel', logo_url: 'icons/logo.svg' }]; items = []; for (var q = 0; q < 26; q++) items.push(base0[q % base0.length]); }
    var n = items.length;
    items.forEach(function (c2, k) {
      if (!free.length) return;
      var best = free[Math.min(free.length - 1, Math.floor((k + 0.5) * free.length / n))];
      var sz = Math.max(18, Math.min(46, Math.round(1.5 * g.F / best.z)));
      var el = document.createElement('span');
      el.className = 'club-chip'; el.title = c2.name || '';
      el.style.cssText = 'position:absolute;left:0;top:0;width:' + sz + 'px;height:' + sz + 'px;padding:' + Math.max(2, sz / 8 | 0) + 'px;border-radius:' + Math.round(sz / 3.2) + 'px;opacity:.95;transform:translate(' + Math.round(best.x - sz / 2) + 'px,' + Math.round(best.y - sz / 2) + 'px);box-shadow:0 0 0 1px rgba(47,208,143,.3),0 6px 14px -6px rgba(0,0,0,.7)';
      var im = document.createElement('img'); im.src = c2.logo_url; im.alt = c2.name || ''; im.loading = 'lazy';
      el.appendChild(im); wrap.appendChild(el);
    });
  }
  window.renderTribune = render;

  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div'); bar.id = 'tribSwitch';
    bar.innerHTML = '<span>Tribüne</span>' + DESIGNS.map(function (d) { return '<button type="button" data-d="' + d[0] + '">' + d[1] + '</button>'; }).join('') + '<button type="button" data-demo="1">Beispiel-Logos</button>';
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.demo) { demo = !demo; mark(); if (lastWrap) render(lastWrap, lastLogos); return; }
      cur = b.dataset.d; try { localStorage.setItem(KEY, cur); } catch (x) {}
      mark(); if (lastWrap) render(lastWrap, lastLogos);
    });
    document.body.appendChild(bar); mark();
    return bar;
  }
  function mark() { if (bar) bar.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.demo ? demo : b.dataset.d === cur); }); }
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (lastWrap && lastWrap.childNodes.length) render(lastWrap, lastLogos); }, 200); });
  setInterval(function () {
    var show = document.documentElement.hasAttribute('data-mix') && document.body.classList.contains('on-home') && lastWrap && lastWrap.offsetParent && window.innerWidth >= 900;
    if (show) ensureBar();
    if (bar) bar.style.display = show ? '' : 'none';
  }, 400);
})();
