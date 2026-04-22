/* Offline shell for hosted alayna-planner-v9.html — same origin / same localStorage. */
const CACHE = 'alayna-planner-v4';
const CORE = [
  new URL('./alayna-planner-v9.html', self.location).href,
  new URL('./alayna-planner-manifest.webmanifest', self.location).href,
  new URL('./alayna-planner-icon-192.png', self.location).href,
  new URL('./alayna-planner-icon-512.png', self.location).href,
  new URL('./src/styles/theme.css', self.location).href,
  new URL('./src/styles/layout.css', self.location).href,
  new URL('./src/styles/components.css', self.location).href,
  new URL('./src/app/state.js', self.location).href,
  new URL('./src/app/tasks.js', self.location).href,
  new URL('./src/app/filters.js', self.location).href,
  new URL('./src/app/weekly.js', self.location).href,
  new URL('./src/app/calendar.js', self.location).href,
  new URL('./src/app/views/today.js', self.location).href,
  new URL('./src/app/views/weekly.js', self.location).href,
  new URL('./src/app/views/areas.js', self.location).href,
  new URL('./src/app/views/timeline.js', self.location).href,
  new URL('./src/app/views/quick-capture.js', self.location).href,
  new URL('./src/app/main.js', self.location).href
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        if (res.ok && (req.mode === 'navigate' || /\.html$/i.test(url.pathname) || url.pathname.endsWith('.webmanifest') || /\.png$/i.test(url.pathname))) {
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
