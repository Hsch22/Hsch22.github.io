// Stale-while-revalidate service worker: serves from cache instantly (works offline),
// refreshes the cache in the background so the next launch picks up updates.
// CacheStorage is shared with the blog and other apps on the same origin.
const CACHE_PREFIX = `calcdm:${self.registration.scope}:`;
const CACHE = `${CACHE_PREFIX}v13`;
const ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './calc-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(ASSETS.map((asset) => new Request(asset, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => null);
      return cached || (await network) || Response.error();
    })
  );
});
