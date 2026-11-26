const CACHE = 'assistcoach-v251';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/fonts/fonts.css',
  '/icons/logo.svg',
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
  '/js/15-calendar.js',
  '/js/16-block-share.js',
  '/js/17-onboarding.js',
  '/js/18-tour.js',
  '/js/19-help.js',
  '/js/vendor/qrcode-generator.js',
  '/icons/equip-dumbbell.png',
  '/icons/equip-bike.png',
  '/icons/equip-yogamat.png'
];

// Fremde Bibliotheken mit fester Versionsnummer: ändern sich nie, daher aus dem Zwischenspeicher
// (schneller Start, funktioniert offline und wenn das CDN gesperrt ist). Muss zu index.html passen.
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      await c.addAll(ASSETS);
      // Best effort: Ist das CDN gerade nicht erreichbar, darf die Installation trotzdem nicht scheitern
      await Promise.all(CDN_ASSETS.map(url =>
        fetch(url, { mode: 'cors' }).then(res => { if (res.ok) return c.put(url, res); }).catch(() => {})
      ));
    }).then(() => self.skipWaiting())
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
  if (CDN_ASSETS.includes(req.url)) { e.respondWith(cacheFirst(req)); return; }
  // Supabase, übriges CDN und fremde Bilder direkt vom Netz (nicht abfangen)
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

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req.url);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req.url, res.clone());
  return res;
}
