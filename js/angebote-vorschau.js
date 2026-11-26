/* Angebote: Karten-Stapel zum Durchblättern. Basic + ist immer vorausgewählt. */
(function () {
  var HERO = 'BASIC +';
  var ORDER = ['GAST', 'BASIC', 'BASIC +', 'ADVANCED', 'PRO', 'VEREIN'];
  var plans = null, sel = 2, root, stage, cards = [], countEl;

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
  function heroIdx() { return plans.findIndex(isHero); }
  function go(i) { sel = (i + plans.length) % plans.length; layout(); }
  function layout() {
    var n = plans.length, h = Math.floor(n / 2);
    cards.forEach(function (c, i) {
      var d = ((i - sel + n + h) % n) - h, ad = Math.abs(d);
      c.className = 'ag-sc' + (d === 0 ? ' front' : '') + (isHero(plans[i]) ? ' hero' : '');
      c.style.opacity = ad > 2 ? 0 : ad === 0 ? 1 : ad === 1 ? .72 : .4;
      c.style.pointerEvents = ad > 2 ? 'none' : '';
      c.style.zIndex = 10 - ad;
      c.style.transform = 'translateX(' + (d * 52) + '%) scale(' + (1 - ad * .13) + ') rotateY(' + (-d * 14) + 'deg)';
    });
    if (countEl) countEl.textContent = (sel + 1) + ' / ' + n;
  }
  function build() {
    var page = document.getElementById('page-angebote'); if (!page || root) return;
    var grid = page.querySelector('.offer-grid'); if (!grid) return;
    plans = readPlans(); sel = heroIdx();
    root = document.createElement('div'); root.id = 'agVar';
    stage = document.createElement('div'); stage.className = 'ag-stage ag-v-stapel';
    var stack = document.createElement('div'); stack.className = 'ag-stack';
    stack.innerHTML = plans.map(function (p, i) {
      return '<div class="ag-sc" data-i="' + i + '">' + (isHero(p) ? '<span class="ag-flag">Empfohlen</span>' : '') +
        '<div class="ag-name">' + p.name + '</div><div class="ag-sub">' + p.sub + '</div>' + p.badge + list(p) + '<div class="ag-ctas">' + cta(p) + '</div></div>';
    }).join('');
    stage.appendChild(stack);
    stage.insertAdjacentHTML('beforeend', '<div class="ag-arrows"><button type="button" class="ag-ar" data-d="-1" aria-label="Zurück">←</button><span class="ag-count"></span><button type="button" class="ag-ar" data-d="1" aria-label="Weiter">→</button></div>');
    countEl = stage.querySelector('.ag-count');
    root.appendChild(stage);
    grid.parentNode.insertBefore(root, grid);
    grid.style.display = 'none';
    cards = Array.prototype.slice.call(stack.children);
    function measure() {
      var m = 0; cards.forEach(function (c) { c.style.height = 'auto'; m = Math.max(m, c.offsetHeight); c.style.height = ''; });
      if (m) { stack.style.height = m + 'px'; stage.style.height = (m + 100) + 'px'; }
    }
    layout();
    measure(); setTimeout(measure, 400); window.addEventListener('resize', measure);
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'), c = e.target.closest('.ag-sc');
      if (b && b.dataset.d) go(sel + +b.dataset.d);
      else if (b && b.dataset.go) go(heroIdx());
      else if (b && b.dataset.act) { var p = plans[sel]; if (p.btn) p.btn.click(); }
      else if (c && +c.dataset.i !== sel) go(+c.dataset.i);
    });
    document.addEventListener('keydown', function (e) {
      if (!page.classList.contains('active') || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
      if (e.key === 'ArrowRight') go(sel + 1); else if (e.key === 'ArrowLeft') go(sel - 1);
    });
    var sx = null; stage.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    stage.addEventListener('pointerup', function (e) { if (sx != null && Math.abs(e.clientX - sx) > 60) go(sel + (e.clientX < sx ? 1 : -1)); sx = null; });
  }
  setInterval(function () {
    if (!root) build();
    else if (document.getElementById('page-angebote').classList.contains('active') && !root.getAttribute('data-ok')) { root.setAttribute('data-ok', '1'); go(heroIdx()); }
  }, 400);
})();
