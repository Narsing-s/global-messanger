const CACHE_NAME = 'global-messenger-shell-v13';

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

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  // Deployment metadata and the app shell must always come from the latest deployment.
  // This prevents an older UI from surviving across Vercel/Cloudflare deployments.
  const alwaysFresh = [
    '/',
    '/index.html',
    '/sw.js',
    '/manifest.webmanifest',
    '/config.js'
  ];

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

  // Hashed Vite assets are safe to cache, but always prefer the network so a new
  // deployment becomes visible immediately when the asset URL changes.
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
