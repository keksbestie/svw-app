const CACHE = 'assistcoach-v192';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/fonts/fonts.css',
  '/js/00-supabase.js',
  '/js/01-i18n-theme.js',
  '/js/02-core-state.js',
  '/js/03-submit-page.js',
  '/js/04-planner.js',
  '/js/05-catalog.js',
  '/js/06-plan-save-load.js',
  '/js/07-longterm-planning.js',
  '/js/08-modals-toast.js',
  '/js/09-default-descs.js',
  '/js/10-field-editor.js',
  '/js/11-app-start.js',
  '/js/12-kader.js',
  '/js/13-sport.js',
  '/icons/sport-fussball.png',
  '/icons/sport-volleyball.png',
  '/icons/sport-tennis.png',
  '/data/exercises.default.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/tennis-ball.png',
  '/js/14-clubs.js',
  '/js/vendor/qrcode-generator.js',
  '/icons/equip-dumbbell.png',
  '/icons/equip-bike.png',
  '/icons/equip-yogamat.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Immer die neueste Version zeigen: zuerst das Netz fragen (und beim Server neu validieren),
// der Zwischenspeicher dient nur offline bzw. bei sehr langsamer Verbindung.
const NETWORK_TIMEOUT = 3500;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Supabase, CDN und fremde Bilder direkt vom Netz (nicht abfangen)
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const fromNetwork = fetch(req, { cache: 'no-cache' }).then(res => {
    if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
    return res;
  });
  fromNetwork.catch(() => {}); // verhindert „unhandled rejection“, falls der Zwischenspeicher gewinnt
  try {
    return await Promise.race([
      fromNetwork,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT))
    ]);
  } catch (err) {
    const cached = (await cache.match(req, { ignoreSearch: true }))
      || (req.mode === 'navigate' ? await cache.match('/index.html') : undefined);
    if (cached) return cached;
    return fromNetwork; // keine Kopie vorhanden: auf das Netz warten
  }
}
