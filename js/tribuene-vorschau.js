/* Tribüne im Hintergrund der Startseite (Blick vom Rasen nach aussen): Vereinslogos sitzen auf den Plätzen. Drei Entwürfe zum Auswählen (Vorschau). */
(function () {
  var KEY = 'tribuene-design';
  var DESIGNS = [['frontal', 'Frontal'], ['schraeg', 'Schräg'], ['weit', 'Weit']];
  var DEMO = [0, 12, 40, 90], demo = 0, cur = 'frontal', lastWrap = null, lastLogos = [], bar = null;
  try { cur = localStorage.getItem(KEY) || 'frontal'; } catch (e) {}
  if (!DESIGNS.some(function (d) { return d[0] === cur; })) cur = 'frontal';

  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function light() { return document.documentElement.getAttribute('data-theme') === 'light'; }

  /* Blick vom Rasen: 3D-Rechnung. Betrachter auf dem Spielfeld (Augenhöhe 1,7 m), die Tribüne ist eine runde, flache Schüssel (ein durchgehender Rang):
     unten nah am Spielfeld, nach oben rücken die Reihen immer weiter nach hinten. Gezeichnet werden Flächen, die Logos sitzen willkürlich darauf. */
  var VARS = {
    frontal: { a: 70, b: 84, n: 2.4, rows: 46, rise: 0.42, off: 1.5, ex: 4, yaw: 0 },
    schraeg: { a: 64, b: 80, n: 2.5, rows: 46, rise: 0.42, off: 1.5, ex: 3.8, yaw: 0.5 },
    weit:    { a: 105, b: 125, n: 2.3, rows: 40, rise: 0.4, off: 3, ex: 5, yaw: 0.25 }
  };
  function sp(v, e) { return (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), e); }

  function rowGeom(V, k) {
    var d = V.off + k * 0.45 + k * k * 0.06;
    return { sc: 1 + d / V.a, scz: 1 + d / V.b, h: 0.5 + k * V.rise + k * k * 0.004 };
  }
  /* Punkt der Tribüne bei Winkel ph in Reihe r -> Bildschirm */
  function project(V, cam, ph, rg) {
    var e = 2 / V.n;
    var X = V.a * rg.sc * sp(Math.sin(ph), e), Z = V.b * rg.scz * sp(Math.cos(ph), e);
    var cy = Math.cos(V.yaw), sy = Math.sin(V.yaw);
    var X2 = X * cy - Z * sy, Z2 = X * sy + Z * cy;
    if (Z2 < 7) return null;
    return [cam.cx + X2 * cam.F / Z2, cam.hz - (rg.h - 1.7) * cam.F * V.ex / Z2, Z2];
  }
  function rowPoints(V, cam, k, phs) {
    var rg = rowGeom(V, k);
    return phs.map(function (ph) { return project(V, cam, ph, rg); });
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
    var V = VARS[cur] || VARS.frontal, cam = { cx: W / 2, hz: H * 0.66, F: W * 0.36 };
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var cv = document.createElement('canvas');
    cv.width = W * dpr; cv.height = H * dpr; cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;';
    var c = cv.getContext('2d'); c.scale(dpr, dpr);
    var lt = light(), base = lt ? '15,40,32' : '190,220,210', bgc = lt ? '245,247,247' : '5,9,13';
    var phs = []; for (var ph = -Math.PI; ph <= Math.PI + 0.001; ph += 0.006) phs.push(ph);
    var R = V.rows, rows = [], k;
    for (k = 0; k < R; k++) rows.push(rowPoints(V, cam, k, phs));

    /* Rangfläche Reihe für Reihe, nach oben und hinten ausklingend */
    for (k = 0; k < R - 1; k++) {
      var A = rows[k], B = rows[k + 1];
      spans(A.map(function (p, i) { return p && B[i] ? p : null; })).forEach(function (sp2) {
        var zm = A[sp2[Math.floor(sp2.length / 2)]][2];
        var fade = Math.max(0.25, 1 - k / R * 0.7);
        var tone = (k % 2 ? 0.045 : 0.08) * fade * Math.max(0.4, Math.min(1, 1.2 - (zm - 12) / 160));
        c.beginPath();
        sp2.forEach(function (i, j) { if (j) c.lineTo(A[i][0], A[i][1]); else c.moveTo(A[i][0], A[i][1]); });
        for (var j2 = sp2.length - 1; j2 >= 0; j2--) c.lineTo(B[sp2[j2]][0], B[sp2[j2]][1]);
        c.closePath();
        c.fillStyle = 'rgba(' + base + ',' + (lt ? tone * 1.4 : tone).toFixed(3) + ')';
        c.fill();
      });
    }
    /* Treppen, ganz leise */
    c.lineWidth = 1;
    for (var i = 0; i < phs.length; i += 24) {
      var p0 = rows[0][i], p1 = rows[R - 1][i];
      if (!p0 || !p1) continue;
      c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]);
      c.strokeStyle = 'rgba(' + base + ',' + (lt ? 0.05 : 0.035) + ')'; c.stroke();
    }
    /* Kante am Spielfeld */
    spans(rows[0]).forEach(function (sp2) {
      c.beginPath(); sp2.forEach(function (i, j) { if (j) c.lineTo(rows[0][i][0], rows[0][i][1]); else c.moveTo(rows[0][i][0], rows[0][i][1]); });
      c.lineWidth = 1.5; c.strokeStyle = 'rgba(47,208,143,' + (lt ? 0.4 : 0.3) + ')'; c.stroke();
    });
    /* Hinter den Karten verblasst die Schüssel */
    var gx = cam.cx, gy = H * 0.5, gr = c.createRadialGradient(gx, gy, 40, gx, gy, Math.min(W * 0.34, 560));
    gr.addColorStop(0, 'rgba(' + bgc + ',.82)'); gr.addColorStop(0.65, 'rgba(' + bgc + ',.5)'); gr.addColorStop(1, 'rgba(' + bgc + ',0)');
    c.save(); c.translate(gx, gy); c.scale(1.25, 1); c.translate(-gx, -gy); c.fillStyle = gr; c.fillRect(0, 0, W, H); c.restore();
    wrap.appendChild(cv);

    /* Logos: willkürlich auf der Schüssel verteilt (feste Zufallsfolge, so bleiben bestehende Logos beim Wachsen an ihrem Platz) */
    var items = lastLogos.slice();
    if (DEMO[demo]) { var base0 = items.length ? items : [{ name: 'Beispiel', logo_url: 'icons/logo.svg' }]; items = []; for (var q = 0; q < DEMO[demo]; q++) items.push(base0[q % base0.length]); }
    var N = items.length, placed = [], rr = rnd(23);
    function sizeAt(z) { return Math.max(15, Math.min(44, Math.round(2.4 * cam.F / z))); }
    var tries = 0;
    while (placed.length < N && tries < N * 80 + 200) {
      tries++;
      var kk = Math.floor(Math.pow(rr(), 1.25) * R), pt = project(V, cam, (rr() * 2 - 1) * Math.PI, rowGeom(V, kk));
      if (!pt || pt[0] < 14 || pt[0] > W - 14 || pt[1] < 20 || pt[1] > H - 30) continue;
      var szp = Math.round(sizeAt(pt[2]) * (0.9 + rr() * 0.2));
      var behind = Math.abs(pt[0] - cam.cx) < 400 && pt[1] > 20 && pt[1] < H * 0.78;
      var bad = false;
      for (var t = 0; t < placed.length; t++) if (Math.hypot(placed[t].x - pt[0], placed[t].y - pt[1]) < (placed[t].sz + szp) / 2 + 4) { bad = true; break; }
      if (bad) continue;
      placed.push({ x: pt[0], y: pt[1], sz: szp, op: behind ? 0.22 : 0.95 });
    }
    placed.forEach(function (pl, kx) {
      var c2 = items[kx], sz = pl.sz;
      var el = document.createElement('span');
      el.className = 'club-chip'; el.title = c2.name || '';
      el.style.cssText = 'position:absolute;left:0;top:0;width:' + sz + 'px;height:' + sz + 'px;padding:' + Math.max(2, sz / 8 | 0) + 'px;border-radius:' + Math.round(sz / 3.2) + 'px;opacity:' + pl.op + ';transform:translate(' + Math.round(pl.x - sz / 2) + 'px,' + Math.round(pl.y - sz / 2) + 'px);box-shadow:0 0 0 1px rgba(47,208,143,.3),0 6px 14px -6px rgba(0,0,0,.7)';
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
