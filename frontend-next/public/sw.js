const CACHE_NAME = 'xungang-next-pwa-v1';
const RUNTIME_CACHE = `${CACHE_NAME}-runtime`;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(CACHE_NAME)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api') || url.pathname.startsWith('/src') || url.pathname.startsWith('/@vite')) return;
  if (request.mode !== 'navigate') return;
  event.respondWith(
    fetch(request, { cache: 'no-cache' }).catch(async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match('/index.html');
      if (cached) return cached;
      return fetch('/index.html');
    }),
  );
});
