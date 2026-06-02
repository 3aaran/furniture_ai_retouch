const CACHE_NAME = 'xungang-pwa-v4';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function shouldBypass(request) {
  const url = new URL(request.url);
  return request.method !== 'GET'
    || url.origin !== self.location.origin
    || url.pathname.startsWith('/api')
    || url.pathname.startsWith('/src')
    || url.pathname.startsWith('/@vite')
    || url.pathname.startsWith('/@react-refresh')
    || url.pathname.startsWith('/landing')
    || url.pathname.startsWith('/files')
    || url.pathname.startsWith('/uploads')
    || url.pathname.startsWith('/outputs');
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (shouldBypass(request)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }))
  );
});
