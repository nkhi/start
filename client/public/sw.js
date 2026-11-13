// Minimal pass-through service worker for PWA installability.
// Intentionally does not cache requests so Vite dev/HMR and API calls always hit the network.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

