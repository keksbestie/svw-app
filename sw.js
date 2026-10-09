const CACHE = 'assistcoach-v11';
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
  '/data/exercises.default.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
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

self.addEventListener('fetch', e => {
  // Supabase API-Calls immer live holen
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
