/* Tribüne im Hintergrund der Startseite (Blick vom Rasen nach aussen): Vereinslogos sitzen auf den Plätzen. Drei Entwürfe zum Auswählen (Vorschau). */
(function () {
  var KEY = 'tribuene-design';
  var DESIGNS = [['frontal', 'Frontal'], ['schraeg', 'Schräg'], ['weit', 'Weit']];
  var DEMO = [0, 12, 40, 90], demo = 0, cur = 'frontal', lastWrap = null, lastLogos = [], bar = null;
  try { cur = localStorage.getItem(KEY) || 'frontal'; } catch (e) {}
  if (!DESIGNS.some(function (d) { return d[0] === cur; })) cur = 'frontal';

  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function light() { return document.documentElement.getAttribute('data-theme') === 'light'; }

  /* Blick vom Rasen: 3D-Rechnung. Betrachter auf dem Spielfeld (Augenhöhe 1,7 m), Tribüne als abgerundetes Rechteck rundherum, optional schräg gedreht.
     Zwei Ränge (Unter-/Oberrang) mit Umlauf, Treppen, Brüstung, Dach und Flutlicht. Gezeichnet werden Flächen statt einzelner Plätze. */
  var VARS = {
    frontal: { a: 62, b: 78, n: 3.2, rows: 40, split: 15, gap: 8, jump: 3.2, rise: 0.55, off: 3, ex: 3, yaw: 0 },
    schraeg: { a: 56, b: 74, n: 3.4, rows: 40, split: 15, gap: 8, jump: 3.4, rise: 0.6, off: 3, ex: 2.6, yaw: 0.5 },
    weit:    { a: 100, b: 125, n: 3, rows: 34, split: 14, gap: 12, jump: 4, rise: 0.46, off: 5, ex: 3.6, yaw: 0.25 }
  };
  function sp(v, e) { return (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), e); }

  function rowGeom(V, k) {
    var upper = k >= V.split;
    var d = V.off + k * 0.5 + k * k * 0.035 + (upper ? V.gap : 0);
    return { sc: 1 + d / V.a, scz: 1 + d / V.b, h: 0.7 + k * V.rise + (upper ? V.jump : 0) };
  }
  /* Punkt der Tribüne bei Winkel ph in Reihe r -> Bildschirm */
  function project(V, cam, ph, rg, hOverride) {
    var e = 2 / V.n;
    var X = V.a * rg.sc * sp(Math.sin(ph), e), Z = V.b * rg.scz * sp(Math.cos(ph), e);
    var cy = Math.cos(V.yaw), sy = Math.sin(V.yaw);
    var X2 = X * cy - Z * sy, Z2 = X * sy + Z * cy;
    if (Z2 < 9) return null;
    var h = hOverride != null ? hOverride : rg.h;
    return [cam.cx + X2 * cam.F / Z2, cam.hz - (h - 1.7) * cam.F * V.ex / Z2, Z2];
  }
  function rowPoints(V, cam, k, phs, hOverride) {
    var rg = rowGeom(V, k);
    return phs.map(function (ph) { return project(V, cam, ph, rg, hOverride); });
  }
  /* zusammenhängende Abschnitte ohne null */
  function spans(pts) {
    var out = [], cur2 = [];
    pts.forEach(function (p, i) { if (p) cur2.push(i); else { if (cur2.length > 1) out.push(cur2); cur2 = []; } });
    if (cur2.length > 1) out.push(cur2);
    return out;
  }

  function render(wrap, logos) {
    lastWrap = wrap; lastLogos = logos || [];
    if (!wrap) return;
    wrap.innerHTML = '';
    var W = wrap.clientWidth || window.innerWidth, H = Math.min(wrap.clientHeight || window.innerHeight, window.innerHeight);
    if (W < 900) return;
    var V = VARS[cur] || VARS.frontal, cam = { cx: W / 2, hz: H * 0.64, F: W * 0.36 };
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var cv = document.createElement('canvas');
    cv.width = W * dpr; cv.height = H * dpr; cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;';
    var c = cv.getContext('2d'); c.scale(dpr, dpr);
    var lt = light(), base = lt ? '15,40,32' : '190,220,210';
    var phs = []; for (var ph = -Math.PI; ph <= Math.PI + 0.001; ph += 0.006) phs.push(ph);
    var R = V.rows, rows = [];
    for (var k = 0; k < R; k++) rows.push(rowPoints(V, cam, k, phs));

    /* Rangflächen Reihe für Reihe, Schattierung nach Tiefe */
    for (k = 0; k < R - 1; k++) {
      if (k === V.split - 1) continue; /* Umlauf zwischen Unter- und Oberrang */
      var A = rows[k], B = rows[k + 1];
      spans(A.map(function (p, i) { return p && B[i] ? p : null; })).forEach(function (sp2) {
        var zm = A[sp2[Math.floor(sp2.length / 2)]][2];
        var depth = Math.max(0.3, Math.min(1, 1.15 - (zm - 14) / 150));
        var tone = (k % 2 ? 0.04 : 0.07) * depth * (k >= V.split ? 1.15 : 1);
        c.beginPath();
        sp2.forEach(function (i, j) { if (j) c.lineTo(A[i][0], A[i][1]); else c.moveTo(A[i][0], A[i][1]); });
        for (var j2 = sp2.length - 1; j2 >= 0; j2--) c.lineTo(B[sp2[j2]][0], B[sp2[j2]][1]);
        c.closePath();
        c.fillStyle = 'rgba(' + base + ',' + (lt ? tone * 1.4 : tone).toFixed(3) + ')';
        c.fill();
      });
    }
    /* Treppen: Linien von der untersten bis zur obersten Reihe jedes Rangs */
    c.lineWidth = 1;
    [[0, V.split - 1], [V.split, R - 1]].forEach(function (tier) {
      for (var i = 0; i < phs.length; i += 22) {
        var p0 = rows[tier[0]][i], p1 = rows[tier[1]][i];
        if (!p0 || !p1) continue;
        var dep = Math.max(0.3, Math.min(1, 1.15 - (p0[2] - 14) / 150));
        c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]);
        c.strokeStyle = 'rgba(' + base + ',' + (0.07 * dep).toFixed(3) + ')'; c.stroke();
      }
    });
    /* Brüstungen: helle Kanten vorne an jedem Rang, dazu die Bande am Spielfeldrand */
    function edge(row, alpha, w, col) {
      spans(row).forEach(function (sp2) {
        c.beginPath(); sp2.forEach(function (i, j) { if (j) c.lineTo(row[i][0], row[i][1]); else c.moveTo(row[i][0], row[i][1]); });
        c.lineWidth = w; c.strokeStyle = col || 'rgba(' + base + ',' + alpha + ')'; c.stroke();
      });
    }
    edge(rows[0], 0.22, 1.5); edge(rows[V.split - 1], 0.2, 1.5); edge(rows[V.split], 0.2, 1.5); edge(rows[R - 1], 0.25, 2);
    var bande = rowPoints(V, cam, 0, phs, 0.9), boden = rowPoints(V, cam, 0, phs, 0.2);
    spans(bande.map(function (p, i) { return p && boden[i] ? p : null; })).forEach(function (sp2) {
      c.beginPath();
      sp2.forEach(function (i, j) { if (j) c.lineTo(bande[i][0], bande[i][1]); else c.moveTo(bande[i][0], bande[i][1]); });
      for (var j3 = sp2.length - 1; j3 >= 0; j3--) c.lineTo(boden[sp2[j3]][0], boden[sp2[j3]][1]);
      c.closePath(); c.fillStyle = 'rgba(47,208,143,' + (lt ? 0.16 : 0.12) + ')'; c.fill();
    });
    /* Dach: dunkle Fläche über dem Oberrang, davor Flutlichter */
    var top = rowPoints(V, cam, R - 1, phs, rowGeom(V, R - 1).h + 0.5);
    var roofTop = rowPoints(V, cam, R - 1, phs, rowGeom(V, R - 1).h + 9);
    spans(top.map(function (p, i) { return p && roofTop[i] ? p : null; })).forEach(function (sp2) {
      c.beginPath();
      sp2.forEach(function (i, j) { if (j) c.lineTo(top[i][0], top[i][1]); else c.moveTo(top[i][0], top[i][1]); });
      for (var j4 = sp2.length - 1; j4 >= 0; j4--) c.lineTo(roofTop[sp2[j4]][0], roofTop[sp2[j4]][1]);
      c.closePath();
      c.fillStyle = lt ? 'rgba(10,30,25,.10)' : 'rgba(0,0,0,.45)'; c.fill();
    });
    [-0.95, -0.5, 0.5, 0.95].forEach(function (a2) {
      var i = Math.round((a2 + Math.PI) / 0.006), p = roofTop[i];
      if (!p || p[1] < -20) return;
      var rad = Math.max(26, Math.min(44, 600 / p[2] * 6));
      var g2 = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], rad);
      g2.addColorStop(0, lt ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.55)'); g2.addColorStop(0.25, 'rgba(255,255,255,.18)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g2; c.fillRect(p[0] - rad, p[1] - rad, rad * 2, rad * 2);
    });
    wrap.appendChild(cv);

    /* Logos bilden die Schüssel: von der untersten Reihe nach oben, links und rechts abwechselnd, ohne sich zu überdecken */
    var items = lastLogos.slice();
    if (DEMO[demo]) { var base0 = items.length ? items : [{ name: 'Beispiel', logo_url: 'icons/logo.svg' }]; items = []; for (var q = 0; q < DEMO[demo]; q++) items.push(base0[q % base0.length]); }
    var N = items.length, placed = [], rr = rnd(11), lastY = { L: 1e9, R: 1e9 };
    function sizeAt(z) { return Math.max(16, Math.min(46, Math.round(2.6 * cam.F / z))); }
    for (k = 0; k < R && placed.length < N; k++) {
      if (k === V.split - 1) continue;
      var L = [], Rt = [];
      rows[k].forEach(function (p) {
        if (!p || p[2] < 12) return;
        if (Math.abs(p[0] - cam.cx) < 400 || p[0] < 20 || p[0] > W - 20 || p[1] < 26 || p[1] > H - 40) return;
        (p[0] < cam.cx ? L : Rt).push(p);
      });
      /* Reihen nur so dicht, dass sich Logos übereinander stapeln statt zu überlappen */
      if (L.length && Math.abs(L[0][1] - lastY.L) < 0.85 * sizeAt(L[0][2])) L = []; else if (L.length) lastY.L = L[0][1];
      if (Rt.length && Math.abs(Rt[0][1] - lastY.R) < 0.85 * sizeAt(Rt[0][2])) Rt = []; else if (Rt.length) lastY.R = Rt[0][1];
      L.sort(function (u, v) { return u[0] - v[0]; }); Rt.sort(function (u, v) { return v[0] - u[0]; }); /* von aussen nach innen */
      var order = [], m = Math.max(L.length, Rt.length);
      for (var iq = 0; iq < m; iq++) { if (L[iq]) order.push(L[iq]); if (Rt[iq]) order.push(Rt[iq]); }
      order.forEach(function (p) {
        if (placed.length >= N) return;
        var sz = Math.round(sizeAt(p[2]) * (0.92 + rr() * 0.16)), x = p[0] + (rr() - 0.5) * sz * 0.4, y = p[1] + (rr() - 0.5) * sz * 0.3;
        for (var t = 0; t < placed.length; t++) if (Math.hypot(placed[t].x - x, placed[t].y - y) < (placed[t].sz + sz) / 2 + 5) return;
        placed.push({ x: x, y: y, sz: sz });
      });
    }
    placed.forEach(function (pl, kx) {
      var c2 = items[kx], sz = pl.sz;
      var el = document.createElement('span');
      el.className = 'club-chip'; el.title = c2.name || '';
      el.style.cssText = 'position:absolute;left:0;top:0;width:' + sz + 'px;height:' + sz + 'px;padding:' + Math.max(2, sz / 8 | 0) + 'px;border-radius:' + Math.round(sz / 3.2) + 'px;opacity:.95;transform:translate(' + Math.round(pl.x - sz / 2) + 'px,' + Math.round(pl.y - sz / 2) + 'px);box-shadow:0 0 0 1px rgba(47,208,143,.3),0 6px 14px -6px rgba(0,0,0,.7)';
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
      if (b.dataset.demo) { demo = (demo + 1) % DEMO.length; mark(); if (lastWrap) render(lastWrap, lastLogos); return; }
      cur = b.dataset.d; try { localStorage.setItem(KEY, cur); } catch (x) {}
      mark(); if (lastWrap) render(lastWrap, lastLogos);
    });
    document.body.appendChild(bar); mark();
    return bar;
  }
  function mark() { if (bar) bar.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.demo ? demo > 0 : b.dataset.d === cur); if (b.dataset.demo) b.textContent = demo ? 'Beispiel: ' + DEMO[demo] + ' Logos' : 'Beispiel-Logos'; }); }
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (lastWrap && lastWrap.childNodes.length) render(lastWrap, lastLogos); }, 200); });
  setInterval(function () {
    var show = document.documentElement.hasAttribute('data-mix') && document.body.classList.contains('on-home') && lastWrap && lastWrap.offsetParent && window.innerWidth >= 900;
    if (show) ensureBar();
    if (bar) bar.style.display = show ? '' : 'none';
  }, 400);
})();
