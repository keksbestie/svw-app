// ══════════════════════════════════════════════════════════════════
// MODUL: APP-START
// ══════════════════════════════════════════════════════════════════
// Diese Datei muss als LETZTES <script> im HTML eingebunden werden,
// nachdem alle anderen Module (und data/exercises.default.js) geladen
// wurden. init() startet die App (lädt Daten, rendert die erste Seite).
// ══════════════════════════════════════════════════════════════════
init();

// PWA Install
let _pwaPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _pwaPrompt = e;
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.style.display = 'inline-block';
});

window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.style.display = 'none';
});

function triggerPWAInstall() {
  if (_pwaPrompt) {
    _pwaPrompt.prompt();
    _pwaPrompt.userChoice.then(() => { _pwaPrompt = null; });
  }
}

// iOS: kein beforeinstallprompt → eigenen Hinweis zeigen
(function() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (isIOS && !isStandalone) {
    const hint = document.getElementById('pwaIOSHint');
    if (hint) hint.style.display = 'block';
  }
})();
