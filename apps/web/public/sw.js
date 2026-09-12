const CACHE_NAME = 'global-messenger-shell-v11';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('global-messenger-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Authentication, API and realtime traffic must always go directly to the network.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  // The manifest must never be cached by this service worker. This prevents a stale
  // or deployment-protection redirect from becoming a cached PWA installation failure.
  if (url.pathname === '/manifest.webmanifest') {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Never serve the application HTML from the service-worker cache.
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/sw.js') {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => new Response('Global Messenger is temporarily offline.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }))
    );
    return;
  }

  // Network-first for same-origin static resources; cached fallback is only for offline use.
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      return cached || new Response('', { status: 504, statusText: 'Gateway Timeout' });
    })
  );
});
