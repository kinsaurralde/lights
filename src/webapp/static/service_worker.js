const CACHE_NAME = 'static-cache';

const FILES_TO_CACHE = ['/static/offline.html'];

self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');
  evt.waitUntil(caches.open(CACHE_NAME).then((cache) => {
    console.log('[ServiceWorker] Pre-caching offline page');
    return cache.addAll(FILES_TO_CACHE);
  }));

  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activate');
  evt.waitUntil(caches.keys().then((keyList) => {
    return Promise.all(keyList.map((key) => {
      if (key !== CACHE_NAME) {
        console.log('[ServiceWorker] Removing old cache', key);
        return caches.delete(key);
      }
    }));
  }));
  self.clients.claim();
});

// clang-format off
self.addEventListener('fetch', (event) => {
  if (navigator.onLine) {
    return;
  }
  console.log('OFFLINE');
  event.respondWith(caches.open(CACHE_NAME).then((cache) => {
    return cache.match(event.request).then((response) => {
      return response ||
          fetch(event.request).then((response) => {
            const responseClone = response.clone();
            cache.put(event.request, responseClone);
          });
    });
  }));
});
// clang-format on