const CACHE_NAME = 'dr-streaming-v6-cloud';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Let browser handle all Firebase, Firestore, and Google API traffic directly
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('googleapis.com')
  ) {
    return;
  }

  // Only handle GET requests (skip POST, PUT, DELETE)
  if (event.request.method !== 'GET') {
    return;
  }

  // Network-First with Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
