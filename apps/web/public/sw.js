const CACHE_NAME = 'global-messenger-shell-v15-self-hosted';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('global-messenger-shell-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API and realtime traffic must never be intercepted or cached by the shell worker.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  // Deployment metadata and the app shell always come directly from the self-hosted
  // web container. This prevents an older UI/configuration from surviving releases.
  const alwaysFresh = ['/', '/index.html', '/sw.js', '/manifest.webmanifest', '/config.js'];
  if (alwaysFresh.includes(url.pathname)) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => {
        if (url.pathname === '/' || url.pathname === '/index.html') {
          return new Response('Global Messenger is temporarily offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
        return new Response('', { status: 504 });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request, { cache: 'no-store' }).then(response => {
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
