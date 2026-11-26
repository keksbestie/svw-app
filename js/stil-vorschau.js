/* Stil-Vorschau: nur zum Ansehen. Mit ?stil=nacht|frisch|studio|aktuell aufrufbar. */
(function () {
  var NAMES = [['aktuell', 'Aktuell'], ['nacht', '1 Nacht'], ['frisch', '2 Frisch'], ['studio', '3 Studio']];
  var KEY = 'stil-vorschau';
  function get() {
    var q = /[?&]stil=([a-z]+)/.exec(location.search);
    if (q) return q[1];
    try { return localStorage.getItem(KEY) || 'aktuell'; } catch (e) { return 'aktuell'; }
  }
  function apply(s) {
    if (s === 'aktuell') document.documentElement.removeAttribute('data-stil');
    else document.documentElement.setAttribute('data-stil', s);
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
})();
