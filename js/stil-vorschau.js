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
  document.body.appendChild(bar);
  apply(get());

  /* ---------- 3D-Rad für die Karten (nur im Stil "Mix") ---------- */
  var rot = 0, target = 0, dragging = false, moved = 0, startX = 0, startRot = 0, lastAct = Date.now(), active = -1;
  var ui = document.createElement('div'); ui.id = 'ringUi';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function wrap() { return document.getElementById('homeCards'); }
  function cards() { var w = wrap(); return w ? [].slice.call(w.querySelectorAll('.home-card')) : []; }
  function isMix() { return document.documentElement.hasAttribute('data-mix'); }
  var STEP = 50;
  function mod(a, n) { return ((a % n) + n) % n; }
  function clampR(r) { var m = (cards().length - 1) * STEP; return Math.max(-20, Math.min(m + 20, r)); }
  function go(i) { var n = cards().length; i = Math.max(0, Math.min(n - 1, i)); target = i * STEP; lastAct = Date.now(); }
  function cur() { return Math.max(0, Math.min(cards().length - 1, Math.round(rot / STEP))); }
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
    var col = getComputedStyle(c).getPropertyValue('--c').trim() || '#8fe9c0';
    ui.style.setProperty('--c', col);
    ui.querySelector('.rg-title').textContent = (c.querySelector('.home-card-title') || {}).textContent || '';
    ui.querySelector('.rg-text').textContent = (c.querySelector('.home-card-desc') || {}).textContent || '';
    var box = ui.querySelector('.rg-detail > div'); box.classList.remove('rg-fade'); void box.offsetWidth; box.classList.add('rg-fade');
  }
  var last = performance.now();
  function frame(t) {
    var dt = Math.min(50, t - last); last = t;
    var w = wrap();
    if (isMix() && w && w.offsetParent) {
      buildUi();
      var cs = cards(), n = cs.length, step = STEP;
      if (!dragging) {
        if (!reduce && Date.now() - lastAct > 5500) { target = (cur() >= n - 1 ? 0 : cur() + 1) * STEP; lastAct = Date.now() - 1500; }
        rot += (target - rot) * Math.min(1, dt * 0.006);
      }
      cs.forEach(function (c, i) {
        var a = i * step - rot, rad = a * Math.PI / 180;
        c.style.setProperty('--a', a + 'deg');
        c.style.setProperty('--d', ((Math.cos(rad) + 1) / 2).toFixed(3));
        c.style.zIndex = Math.round(Math.cos(rad) * 10 + 10);
        c.style.pointerEvents = Math.abs(a) > 100 ? 'none' : '';
      });
      var idx = cur();
      if (idx !== active) { active = idx; updateUi(idx); }
    }
    requestAnimationFrame(frame);
  }
  document.addEventListener('pointerdown', function (e) {
    var w = wrap(); if (!isMix() || !w || !w.contains(e.target)) return;
    dragging = true; moved = 0; startX = e.clientX; startRot = rot; lastAct = Date.now();
  });
  document.addEventListener('pointermove', function (e) {
    if (!dragging) return; var dx = e.clientX - startX; moved = Math.max(moved, Math.abs(dx)); rot = clampR(startRot - dx * 0.3); lastAct = Date.now();
  });
  function end() { if (!dragging) return; dragging = false; target = cur() * STEP; lastAct = Date.now(); }
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  document.addEventListener('click', function (e) {
    var w = wrap(); if (!isMix() || !w || !w.contains(e.target)) return;
    var c = e.target.closest('.home-card'); if (!c) return;
    var cs = cards(), i = cs.indexOf(c);
    if (moved > 6) { e.stopPropagation(); e.preventDefault(); moved = 0; return; }
    if (i !== cur()) { e.stopPropagation(); e.preventDefault(); go(i); }
  }, true);
  w_keys();
  function w_keys() { document.addEventListener('keydown', function (e) { if (!isMix() || !wrap() || !wrap().offsetParent) return; if (e.key === 'ArrowRight') go(cur() + 1); if (e.key === 'ArrowLeft') go(cur() - 1); }); }
  requestAnimationFrame(frame);
})();
