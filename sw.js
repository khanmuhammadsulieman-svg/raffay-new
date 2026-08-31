const CACHE_NAME = 'dr-streaming-v4'; // Updated version to clear old caches

const ASSETS_TO_PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_PRECACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => 
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // CRITICAL FIX: Ignore Firebase Database & Auth traffic so it never hangs!
  if (
    event.request.url.includes('firestore.googleapis.com') || 
    event.request.url.includes('firebase') ||
    event.request.url.includes('identitytoolkit.googleapis.com')
  ) {
    return; 
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Serve immediately from cache if available (instant offline load)
      if (cachedResponse) {
        // Fetch network in background to keep cache fresh for next time (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
        }).catch(() => {}); // Ignore network errors in background when offline
        
        return cachedResponse;
      }

      // 2. If not in cache, fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // 3. Complete offline fallback for page navigations
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });
    })
  );
});
