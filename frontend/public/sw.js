const CACHE_NAME = 'xungang-pwa-v9';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const RUNTIME_CACHE = `${CACHE_NAME}-runtime`;

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => !key.startsWith(CACHE_NAME)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  const type = event.data?.type;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (type === 'CLEAR_CACHES') {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))));
  }
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

function isFreshRequest(url) {
  return url.pathname === '/'
    || url.pathname === '/index.html'
    || url.pathname === '/manifest.json'
    || url.pathname === '/manifest.webmanifest'
    || url.pathname === '/sw.js';
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/assets/')
    || url.pathname === '/favicon.svg'
    || url.pathname === '/pwa-icon-192.png'
    || url.pathname === '/pwa-icon-512.png'
    || url.pathname === '/apple-touch-icon.png';
}

async function networkFirst(request, fallbackUrl = '') {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw new Error('Network request failed and no cached response exists.');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (shouldBypass(request)) return;

  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/index.html'));
    return;
  }

  if (isFreshRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});
