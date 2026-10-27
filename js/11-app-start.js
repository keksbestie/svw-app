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

  // Desktop: Banner komplett ausblenden
  if (!_isMobile) { section.style.setProperty('display','none','important'); return; }

  // Bereits als App installiert → Abschnitt dauerhaft ausblenden
  if (_isStandalone) { section.style.setProperty('display','none','important'); return; }

  // Plattform-spezifische Hinweise
  if (_isIOS) {
    const a = document.getElementById('pwaHintAndroid');
    if (a) a.style.display = 'none';
  } else {
    const i = document.getElementById('pwaHintIOS');
    if (i) i.style.display = 'none';
  }
})();

// QR-Code auf der Startseite (nur Desktop; Bibliothek wird erst dann nachgeladen)
(function initHomeQr() {
  const box = document.getElementById('homeQr');
  if (!box) return;
  const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (_isMobile || _isStandalone || isTouch) { box.remove(); return; }
  const s = document.createElement('script');
  s.src = 'js/vendor/qrcode-generator.js';
  s.onload = () => {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(location.origin + '/');
      qr.make();
      const target = document.getElementById('homeQrCode');
      target.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true });
      const svg = target.querySelector('svg');
      if (svg) { svg.style.width = '100%'; svg.style.height = '100%'; svg.style.display = 'block'; }
      box.style.display = 'flex';
    } catch (e) { box.remove(); }
  };
  s.onerror = () => box.remove();
  document.head.appendChild(s);
})();

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _pwaPrompt = e;
  if (!_isMobile) return; // Desktop: Banner nie anzeigen
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
