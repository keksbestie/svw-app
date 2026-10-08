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
const _isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const _isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const _isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);

(function initPWAUI() {
  const section = document.getElementById('pwaInstallSection');
  if (!section) return;

  // Bereits als App installiert → Abschnitt ausblenden
  if (_isStandalone) { section.style.display = 'none'; return; }

  // Nur auf Mobilgeräten anzeigen
  if (!_isMobile) { section.style.display = 'none'; return; }

  // Plattform-spezifische Hinweise
  if (_isIOS) {
    const a = document.getElementById('pwaHintAndroid');
    if (a) a.style.display = 'none';
  } else {
    const i = document.getElementById('pwaHintIOS');
    if (i) i.style.display = 'none';
  }
})();

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _pwaPrompt = e;
  const btn = document.getElementById('pwaInstallBtn');
  const fb = document.getElementById('pwaFallback');
  if (btn) { btn.style.display = 'inline-block'; }
  if (fb) { fb.style.display = 'none'; }
});

window.addEventListener('appinstalled', () => {
  const section = document.getElementById('pwaInstallSection');
  if (section) section.style.display = 'none';
});

function triggerPWAInstall() {
  if (_pwaPrompt) {
    _pwaPrompt.prompt();
    _pwaPrompt.userChoice.then(() => { _pwaPrompt = null; });
  }
}
