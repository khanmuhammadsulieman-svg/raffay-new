const CACHE_NAME = 'dr-streaming-v3';

const ASSETS_TO_PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => {
    if (key !== CACHE_NAME) return caches.delete(key);
  }))));
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // CRITICAL FIX: Ignore Firebase Database traffic so it never gets stuck!
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase')) {
    return; 
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }
      })
  );
});
