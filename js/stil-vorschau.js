/* Stil-Vorschau: nur zum Ansehen. Mit ?stil=nacht|frisch|studio|aktuell aufrufbar. */
(function () {
  var NAMES = [['aktuell', 'Aktuell'], ['nacht', '1 Nacht'], ['frisch', '2 Frisch'], ['studio', '3 Studio'], ['mix', '4 Mix']];
  var KEY = 'stil-vorschau';
  function get() {
    var q = /[?&]stil=([a-z]+)/.exec(location.search);
    if (q) return q[1];
    try { return localStorage.getItem(KEY) || 'aktuell'; } catch (e) { return 'aktuell'; }
  }
  function apply(s) {
    var h = document.documentElement;
    if (s === 'mix') { h.setAttribute('data-stil', 'nacht'); h.setAttribute('data-mix', '1'); }
    else { h.removeAttribute('data-mix'); if (s === 'aktuell') h.removeAttribute('data-stil'); else h.setAttribute('data-stil', s); }
    try { localStorage.setItem(KEY, s); } catch (e) {}
    var b = document.querySelectorAll('#stilSwitch button');
    for (var i = 0; i < b.length; i++) b[i].setAttribute('aria-pressed', b[i].dataset.s === s);
  }
  var bar = document.createElement('div');
  bar.id = 'stilSwitch';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Stil wählen');
  NAMES.forEach(function (n) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.s = n[0]; btn.textContent = n[1];
    btn.onclick = function () { apply(n[0]); };
    bar.appendChild(btn);
  });
  /* Zusatzschalter: Hell/Dunkel und Bewegung */
  var KEYA = 'stil-anim';
  function animGet() {
    try { var v = localStorage.getItem(KEYA); if (v) return v; } catch (e) {}
    var small = window.matchMedia && (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 700px)').matches);
    var red = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return small || red ? 'off' : 'on';
  }
  function animApply(v) {
    document.documentElement.setAttribute('data-anim', v);
    try { localStorage.setItem(KEYA, v); } catch (e) {}
    var b = document.getElementById('stilAnim'); if (b) { b.textContent = v === 'off' ? 'Bewegung: aus' : 'Bewegung: an'; b.setAttribute('aria-pressed', v === 'on'); }
    if (v === 'off') { cards().forEach(function (c) { c.style.transform = ''; c.style.filter = ''; c.style.zIndex = ''; }); }
  }
  var sep = document.createElement('span'); sep.style.cssText = 'width:1px;background:rgba(255,255,255,.2);margin:4px 2px'; bar.appendChild(sep);
  var bm = document.createElement('button'); bm.type = 'button'; bm.id = 'stilMode';
  function modeLabel() { bm.textContent = document.documentElement.getAttribute('data-theme') === 'light' ? 'Hell' : 'Dunkel'; }
  bm.onclick = function () { if (typeof toggleTheme === 'function') toggleTheme(); setTimeout(modeLabel, 50); };
  bar.appendChild(bm);
  var ba = document.createElement('button'); ba.type = 'button'; ba.id = 'stilAnim';
  ba.onclick = function () { animApply(document.documentElement.getAttribute('data-anim') === 'off' ? 'on' : 'off'); };
  bar.appendChild(ba);
  document.body.appendChild(bar);
  apply(get()); modeLabel(); animApply(animGet());
  setInterval(modeLabel, 800);

  /* ---------- 3D-Rad für die Karten (nur im Stil "Mix") ---------- */
  var rot = 0, target = 0, dragging = false, moved = 0, startX = 0, startRot = 0, hover = 0, snapping = false, active = -1;
  var ui = document.createElement('div'); ui.id = 'ringUi';
  function wrap() { return document.getElementById('homeCards'); }
  function cards() { var w = wrap(); return w ? [].slice.call(w.querySelectorAll('.home-card')) : []; }
  function isMix() { return document.documentElement.hasAttribute('data-mix'); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function step() { return 360 / Math.max(1, cards().length); }
  function cur() { return mod(Math.round(rot / step()), cards().length); }
  function go(i) { var n = cards().length, st = step(), c = Math.round(rot / st), d = mod(i - c, n); if (d > n / 2) d -= n; target = (c + d) * st; snapping = true; }
  function buildUi() {
    var w = wrap(); if (!w || ui.parentNode) return;
    ui.innerHTML = '<div class="rg-row"><button type="button" class="rg-btn" aria-label="Vorherige Karte" data-d="-1">←</button><div class="rg-dots"></div><button type="button" class="rg-btn" aria-label="Nächste Karte" data-d="1">→</button></div>' +
      '<div class="rg-detail"><div><div class="rg-title"></div><p class="rg-text"></p><button type="button" class="rg-open">Öffnen</button></div></div>';
    w.parentNode.insertBefore(ui, w.nextSibling);
    ui.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.d) go(cur() + +b.dataset.d);
      else if (b.classList.contains('rg-dot')) go(+b.dataset.i);
      else if (b.classList.contains('rg-open')) { var c = cards()[active]; if (c) c.click(); }
    });
  }
  function updateUi(idx) {
    var cs = cards(), c = cs[idx]; if (!c) return;
    var dots = ui.querySelector('.rg-dots');
    if (dots.children.length !== cs.length) { dots.innerHTML = ''; cs.forEach(function (_, i) { var d = document.createElement('button'); d.type = 'button'; d.className = 'rg-dot'; d.dataset.i = i; d.setAttribute('aria-label', 'Karte ' + (i + 1)); dots.appendChild(d); }); }
    [].forEach.call(dots.children, function (d, i) { d.setAttribute('aria-current', i === idx); });
    ui.style.setProperty('--c', getComputedStyle(c).getPropertyValue('--c').trim() || '#8fe9c0');
    ui.querySelector('.rg-title').textContent = (c.querySelector('.home-card-title') || {}).textContent || '';
    ui.querySelector('.rg-text').textContent = (c.querySelector('.home-card-desc') || {}).textContent || '';
    var box = ui.querySelector('.rg-detail > div'); box.classList.remove('rg-fade'); void box.offsetWidth; box.classList.add('rg-fade');
  }
  var last = performance.now();
  function frame(t) {
    var dt = Math.min(50, t - last); last = t;
    var w = wrap();
    if (isMix() && w && w.offsetParent && document.documentElement.getAttribute('data-anim') !== 'off') {
      buildUi();
      var cs = cards(), n = cs.length, st = 360 / n, cs0 = getComputedStyle(w);
      var Rx = parseFloat(cs0.getPropertyValue('--Rx')) || 520, Rz = parseFloat(cs0.getPropertyValue('--Rz')) || 300, lift = parseFloat(cs0.getPropertyValue('--lift')) || 70;
      if (!dragging) {
        if (hover) { rot += hover * dt * 0.09; snapping = false; }
        else {
          if (!snapping) { target = Math.round(rot / st) * st; snapping = true; }
          rot += (target - rot) * Math.min(1, dt * 0.008);
        }
      }
      cs.forEach(function (c, i) {
        var a = mod(i * st - rot + 180, 360) - 180, rad = a * Math.PI / 180, cs_ = Math.cos(rad);
        var f = Math.max(-48, Math.min(48, a));
        var x = Rx * Math.sin(rad), z = Rz * (cs_ - 1), y = -lift * (1 - cs_) / 2;
        c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) rotateY(' + f.toFixed(1) + 'deg)';
        c.style.setProperty('--d', ((cs_ + 1) / 2).toFixed(3));
        c.style.zIndex = Math.round(cs_ * 20 + 20);
      });
      var idx = cur();
      if (idx !== active) { active = idx; updateUi(idx); }
    }
    requestAnimationFrame(frame);
  }
  /* Maus am linken/rechten Rand: Rad dreht sich; Mitte: rastet auf die nächste Karte ein */
  document.addEventListener('pointermove', function (e) {
    var w = wrap();
    if (dragging) { var dx = e.clientX - startX; moved = Math.max(moved, Math.abs(dx)); rot = startRot - dx * 0.3; return; }
    if (!isMix() || !w || e.pointerType !== 'mouse') { hover = 0; return; }
    var r = w.getBoundingClientRect();
    if (e.clientY < r.top - 20 || e.clientY > r.bottom + 20) { hover = 0; return; }
    var g = getComputedStyle(w), half = (parseFloat(g.getPropertyValue('--Rx')) || 290) + (parseFloat(g.getPropertyValue('--cw')) || 236) / 2;
    var p = (e.clientX - (r.left + r.width / 2)) / half;
    if (Math.abs(p) > 1.15) { hover = 0; return; }
    var z = .3;
    hover = Math.abs(p) < z ? 0 : Math.sign(p) * Math.min(1, (Math.abs(p) - z) / (1 - z));
  });
  document.addEventListener('pointerdown', function (e) {
    var w = wrap(); if (!isMix() || !w || !w.contains(e.target)) return;
    dragging = true; moved = 0; startX = e.clientX; startRot = rot; snapping = false;
  });
  function end() { if (!dragging) return; dragging = false; snapping = false; }
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  document.addEventListener('click', function (e) {
    var w = wrap(); if (!isMix() || !w || !w.contains(e.target)) return;
    var c = e.target.closest('.home-card'); if (!c) return;
    if (moved > 6) { e.stopPropagation(); e.preventDefault(); moved = 0; return; }
    var i = cards().indexOf(c);
    if (i !== cur()) { e.stopPropagation(); e.preventDefault(); hover = 0; go(i); }
  }, true);
  document.addEventListener('keydown', function (e) {
    if (!isMix() || !wrap() || !wrap().offsetParent) return;
    if (e.key === 'ArrowRight') go(cur() + 1); if (e.key === 'ArrowLeft') go(cur() - 1);
  });
  requestAnimationFrame(frame);
})();
