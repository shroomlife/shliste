const CACHE_NAME = 'shliste.app-cache-0.9.0';
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST' || String(event.request.url).includes('/api/')) {
    return;
  }

  event.respondWith(
    Promise.race([
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
          }
          return response;
        }),
      new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), NETWORK_TIMEOUT_MS)
      )
    ])
    .catch(async () => {
      return caches.match(event.request)
        .then((cachedResponse) => {
          return cachedResponse || new Response(
            'No Connection',
            { status: 503, statusText: 'Service Nicht Verfügbar' }
          );
        });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      ).then(() => {
        return clients.claim();
      });
    })
  );
});

self.addEventListener('install', () => {
  self.skipWaiting();
});
