// Service Worker for PWA - Connection recovery and offline handling
const CACHE_NAME = 'scribble-v1';
const urlsToCache = [
  '/',
  '/index.html'
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch handler - Network first, fall back to cache
self.addEventListener('fetch', (event) => {
  // Skip WebSocket and API calls
  if (event.request.url.includes('/ws') || 
      event.request.url.includes('/api') ||
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response before caching
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});

// Handle background sync for reconnection
self.addEventListener('sync', (event) => {
  if (event.tag === 'reconnect-websocket') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'RECONNECT_WEBSOCKET'
          });
        });
      })
    );
  }
});
