/* Tribüne im Hintergrund der Startseite: Vereinslogos sitzen auf den Plätzen. Vier Entwürfe zum Auswählen (Vorschau). */
(function () {
  var KEY = 'tribuene-design';
  var DESIGNS = [['arena', 'Arena'], ['seiten', 'Seiten'], ['oben', 'Oberrang'], ['rundum', 'Rundum']];
  var demo = false, cur = 'rundum', lastWrap = null, lastLogos = [], bar = null;
  try { cur = localStorage.getItem(KEY) || 'rundum'; } catch (e) {}
  if (!DESIGNS.some(function (d) { return d[0] === cur; })) cur = 'rundum';

  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function light() { return document.documentElement.getAttribute('data-theme') === 'light'; }

  /* Jeder Entwurf liefert Reihen: Liste von Plätzen {x,y,a} (a = Helligkeit 0..1) und Stufenlinien */
  function geometry(kind, W, H) {
    var seats = [], rows = [], cx = W / 2;
    function row(pts, a) { rows.push(pts); pts.forEach(function (p) { seats.push({ x: p[0], y: p[1], a: a }); }); }
    var gap = 17;
    if (kind === 'arena') {
      /* Ovale Ringe um die Mitte, nur der Teil ausserhalb des Inhalts */
      var cy = H * 0.56, n = 9;
      for (var r = 0; r < n; r++) {
        var rx = W * 0.40 + r * 34, ry = H * 0.50 + r * 30, pts = [];
        var cnt = Math.floor((Math.PI * 2 * Math.sqrt((rx * rx + ry * ry) / 2)) / gap);
        for (var i = 0; i < cnt; i++) {
          var t = i / cnt * Math.PI * 2, x = cx + Math.cos(t) * rx, y = cy + Math.sin(t) * ry;
          if (y > H - 4 || y < 0 || x < 6 || x > W - 6) continue;
          pts.push([x, y]);
        }
        row(pts, 0.35 + r * 0.07);
      }
    } else if (kind === 'seiten') {
      /* Zwei Tribünen links und rechts, nach aussen ansteigend */
      var sideW = Math.max(0, (W - 1060) / 2);
      for (var side = 0; side < 2; side++) {
        for (var k = 0; k < 14; k++) {
          var pts2 = [], y0 = 70 + k * 0, xk = side === 0 ? 10 + k * (sideW / 14) : W - 10 - k * (sideW / 14);
          for (var y = 40 + k * 7; y < H - 30 - k * 7; y += gap) pts2.push([xk, y + Math.sin(y / 120 + side) * 0]);
          row(pts2, 0.62 - k * 0.035);
        }
      }
    } else if (kind === 'oben') {
      /* Gegentribüne oben: leicht gebogene Reihen über die ganze Breite */
      for (var q = 0; q < 8; q++) {
        var y1 = 14 + q * 22, pts3 = [];
        for (var x2 = 14; x2 < W - 10; x2 += gap) {
          var u = (x2 - cx) / (W / 2);
          pts3.push([x2, y1 + u * u * (8 + q * 2)]);
        }
        row(pts3, 0.3 + q * 0.06);
      }
    } else {
      /* Rundum: oben und an beiden Seiten, in den Ecken abgerundet */
      var ins = 8;
      for (var m = 0; m < 6; m++) {
        var pts4 = [], off = ins + m * 20, rad = 70 + m * 20;
        var top = off, left = off, right = W - off;
        var seg = [];
        // linke Seite von unten nach oben
        for (var yl = H - 10; yl >= top + rad; yl -= gap) seg.push([left, yl]);
        // linke Ecke
        for (var ang = 0; ang <= 90; ang += 8) {
          var tr = ang * Math.PI / 180;
          seg.push([left + rad - Math.cos(tr) * rad, top + rad - Math.sin(tr) * rad]);
        }
        // obere Kante
        for (var xx = left + rad; xx <= right - rad; xx += gap) seg.push([xx, top]);
        // rechte Ecke
        for (var ang2 = 0; ang2 <= 90; ang2 += 8) {
          var tr2 = ang2 * Math.PI / 180;
          seg.push([right - rad + Math.sin(tr2) * rad, top + rad - Math.cos(tr2) * rad]);
        }
        // rechte Seite von oben nach unten
        for (var yr = top + rad; yr < H - 10; yr += gap) seg.push([right, yr]);
        pts4 = seg;
        row(pts4, 0.34 + m * 0.07);
      }
    }
    return { seats: seats, rows: rows };
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
    /* Stufenlinien */
    c.lineWidth = 1;
    g.rows.forEach(function (pts, i) {
      if (pts.length < 2) return;
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (var k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]);
      c.lineWidth = 15; c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = 'rgba(' + base + ',' + (lt ? 0.045 : 0.03) + ')'; c.stroke();
      c.lineWidth = 1; c.strokeStyle = 'rgba(' + base + ',' + (lt ? 0.16 : 0.1) + ')'; c.stroke();
    });
    /* Plätze */
    g.seats.forEach(function (s) {
      var fade = Math.abs(s.x - W / 2) < 420 && s.y < 340 ? 0.35 : 1;
      c.fillStyle = 'rgba(' + base + ',' + ((lt ? 0.26 : 0.2) * s.a * fade).toFixed(3) + ')';
      c.beginPath(); if (c.roundRect) c.roundRect(s.x - 5, s.y - 4, 10, 8, 3); else c.rect(s.x - 5, s.y - 4, 10, 8); c.fill();
    });
    wrap.appendChild(cv);
    /* Logos auf freien Plätzen, gleichmässig verteilt, nicht hinter dem Inhalt */
    var free = g.seats.filter(function (s) { return Math.abs(s.x - W / 2) > 430 && s.y > 24 && s.y < H - 24; });
    var items = lastLogos.slice();
    if (demo) { var base0 = items.length ? items : [{ name: 'Beispiel', logo_url: 'icons/logo.svg' }]; items = []; for (var z = 0; z < 22; z++) items.push(base0[z % base0.length]); }
    var n = items.length, sz = 30;
    items.forEach(function (c2, k) {
      if (!free.length) return;
      var best = free[Math.min(free.length - 1, Math.floor((k + 0.5) * free.length / n))];
      var el = document.createElement('span');
      el.className = 'club-chip'; el.title = c2.name || '';
      el.style.cssText = 'position:absolute;left:0;top:0;width:' + sz + 'px;height:' + sz + 'px;padding:4px;opacity:.95;transform:translate(' + Math.round(best.x - sz / 2) + 'px,' + Math.round(best.y - sz / 2) + 'px);box-shadow:0 0 0 1px rgba(47,208,143,.3),0 6px 14px -6px rgba(0,0,0,.7)';
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
