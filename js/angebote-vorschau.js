/* Angebote: mehrere Darstellungen zum Durchblättern (Vorschau zur Auswahl). Basic + ist immer vorausgewählt. */
(function () {
  var KEY = 'angebote-var', HERO = 'BASIC +';
  var ORDER = ['GAST', 'BASIC', 'BASIC +', 'ADVANCED', 'PRO', 'VEREIN'];
  var VARS = [['liste', 'Liste'], ['reiter', 'Reiter'], ['stufen', 'Stufen'], ['stapel', 'Stapel']];
  var plans = null, sel = 2, cur = 'reiter', root, nav, stage;

  function readPlans() {
    var cards = document.querySelectorAll('#page-angebote .offer-card'), out = [];
    cards.forEach(function (c) {
      var num = c.querySelector('.home-card-num'); if (!num) return;
      var btn = c.querySelector('.offer-btn');
      out.push({
        key: num.textContent.trim().toUpperCase(),
        name: c.querySelector('.home-card-title').textContent.trim(),
        sub: (c.querySelector('.offer-sub') || {}).textContent || '',
        badge: (c.querySelector('.offer-badge') || { outerHTML: '' }).outerHTML,
        items: Array.prototype.map.call(c.querySelectorAll('.offer-list li'), function (li) { return { html: li.querySelector('span').innerHTML, off: li.classList.contains('off') }; }),
        btn: btn
      });
    });
    out.sort(function (a, b) { return ORDER.indexOf(a.key) - ORDER.indexOf(b.key); });
    return out;
  }
  function isHero(p) { return p.key === HERO; }
  var CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  var DASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  function list(p, max) {
    return '<ul class="ag-list">' + p.items.slice(0, max || 99).map(function (i) { return '<li class="' + (i.off ? 'off' : '') + '">' + (i.off ? DASH : CHECK) + '<span>' + i.html + '</span></li>'; }).join('') + '</ul>';
  }
  function cta(p) {
    var h = '';
    if (p.btn) h += '<button type="button" class="ag-cta' + (isHero(p) ? ' hero' : '') + '" data-act="btn">' + p.btn.textContent + '</button>';
    if (!isHero(p)) h += '<button type="button" class="ag-link" data-go="hero">Zum empfohlenen Plan Basic + ›</button>';
    return h;
  }
  function panel(p) {
    return '<div class="ag-panel' + (isHero(p) ? ' hero' : '') + ' ag-in">' +
      '<div class="ag-left">' + (isHero(p) ? '<span class="ag-flag">Empfohlen</span>' : '') +
      '<div class="ag-name">' + p.name + '</div><div class="ag-sub">' + p.sub + '</div>' + p.badge + '<div class="ag-ctas">' + cta(p) + '</div></div>' +
      '<div class="ag-right">' + list(p) + '</div></div>';
  }
  function heroIdx() { return plans.findIndex(isHero); }
  function go(i) { sel = (i + plans.length) % plans.length; render(); }

  function navReiter() {
    return '<div class="ag-tabs" role="tablist">' + plans.map(function (p, i) {
      return '<button type="button" role="tab" class="ag-tab' + (i === sel ? ' on' : '') + (isHero(p) ? ' hero' : '') + '" data-i="' + i + '">' + p.name + (isHero(p) ? '<i>Empfohlen</i>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function navStufen() {
    var h = heroIdx();
    return '<div class="ag-steps"><div class="ag-line"></div>' + plans.map(function (p, i) {
      return '<button type="button" class="ag-step' + (i === sel ? ' on' : '') + (isHero(p) ? ' hero' : '') + (i < sel ? ' past' : '') + '" data-i="' + i + '"><span class="ag-dot"></span><span class="ag-sl">' + p.name + '</span>' + (isHero(p) ? '<em>Dein nächster Schritt</em>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function stapel() {
    var n = plans.length;
    return '<div class="ag-stack">' + plans.map(function (p, i) {
      var d = ((i - sel + n + Math.floor(n / 2)) % n) - Math.floor(n / 2);
      var ad = Math.abs(d);
      var st = ad > 2 ? 'opacity:0;pointer-events:none;' : 'opacity:' + (ad === 0 ? 1 : ad === 1 ? .72 : .4) + ';';
      st += 'transform:translateX(' + (d * 52) + '%) scale(' + (1 - ad * .13) + ') rotateY(' + (-d * 14) + 'deg);z-index:' + (10 - ad) + ';';
      return '<div class="ag-sc' + (d === 0 ? ' front' : '') + (isHero(p) ? ' hero' : '') + '" data-i="' + i + '" style="' + st + '">' +
        (isHero(p) ? '<span class="ag-flag">Empfohlen</span>' : '') + '<div class="ag-name">' + p.name + '</div><div class="ag-sub">' + p.sub + '</div>' + p.badge +
        list(p, d === 0 ? 99 : 4) + (d === 0 ? '<div class="ag-ctas">' + cta(p) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function arrows() {
    return '<div class="ag-arrows"><button type="button" class="ag-ar" data-d="-1" aria-label="Zurück">←</button><span class="ag-count">' + (sel + 1) + ' / ' + plans.length + '</span><button type="button" class="ag-ar" data-d="1" aria-label="Weiter">→</button></div>';
  }
  function render() {
    if (!root) return;
    var grid = document.querySelector('#page-angebote .offer-grid');
    if (cur === 'liste') { grid.style.display = ''; stage.innerHTML = ''; stage.style.display = 'none'; }
    else {
      grid.style.display = 'none'; stage.style.display = '';
      var p = plans[sel];
      stage.className = 'ag-stage ag-v-' + cur;
      stage.innerHTML = (cur === 'reiter' ? navReiter() + panel(p) + arrows()
        : cur === 'stufen' ? navStufen() + panel(p) + arrows()
        : stapel() + arrows());
    }
    nav.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === cur); });
  }
  function build() {
    var page = document.getElementById('page-angebote'); if (!page || root) return;
    var grid = page.querySelector('.offer-grid'); if (!grid) return;
    plans = readPlans(); sel = heroIdx();
    try { cur = localStorage.getItem(KEY) || 'reiter'; } catch (e) {}
    root = document.createElement('div'); root.id = 'agVar';
    nav = document.createElement('div'); nav.className = 'ag-var';
    nav.innerHTML = '<span>Darstellung (Vorschau)</span>' + VARS.map(function (v) { return '<button type="button" data-v="' + v[0] + '">' + v[1] + '</button>'; }).join('');
    stage = document.createElement('div');
    root.appendChild(nav); root.appendChild(stage);
    grid.parentNode.insertBefore(root, grid);
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button,.ag-sc'); if (!b) return;
      if (b.dataset.v) { cur = b.dataset.v; try { localStorage.setItem(KEY, cur); } catch (x) {} sel = heroIdx(); render(); }
      else if (b.dataset.d) go(sel + +b.dataset.d);
      else if (b.dataset.go) { sel = heroIdx(); render(); }
      else if (b.dataset.act) { var p = plans[sel]; if (p.btn) p.btn.click(); }
      else if (b.dataset.i != null) { var i = +b.dataset.i; if (i !== sel) go(i); }
    });
    document.addEventListener('keydown', function (e) {
      if (!page.classList.contains('active') || cur === 'liste' || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
      if (e.key === 'ArrowRight') go(sel + 1); else if (e.key === 'ArrowLeft') go(sel - 1);
    });
    var sx = null; stage.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    stage.addEventListener('pointerup', function (e) { if (sx != null && Math.abs(e.clientX - sx) > 60) go(sel + (e.clientX < sx ? 1 : -1)); sx = null; });
    render();
  }
  setInterval(function () { if (!root) build(); else if (document.getElementById('page-angebote').classList.contains('active') && !root.getAttribute('data-ok')) { root.setAttribute('data-ok', '1'); sel = heroIdx(); render(); } }, 400);
})();
