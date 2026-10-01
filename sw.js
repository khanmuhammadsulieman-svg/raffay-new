const CACHE_NAME = 'dr-streaming-v5-clean';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let network handle all Firebase, Firestore, and auth traffic directly
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  // Network-First strategy: always fetch fresh code from Vercel
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
