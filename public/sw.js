// Minimal service worker for PWA installability
self.addEventListener('fetch', (event) => {
  // A basic fetch handler is often sufficient to make the app installable.
  // For a production app, you'd implement caching strategies here.
  // event.respondWith(fetch(event.request));
});
