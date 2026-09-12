const CACHE_NAME = 'global-messenger-shell-v10';
const APP_SHELL = ['/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  // Never serve the application HTML from the service-worker cache. The Docker
  // frontend must always provide the current production shell.
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/sw.js') {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => caches.match(request)));
    return;
  }

  // Network-first for other same-origin resources; cached fallback only when offline.
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok && response.type === 'basic' && !url.pathname.startsWith('/api/')) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }).catch(() => caches.match(request))
  );
});
