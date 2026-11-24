
self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  // PTC Garage online-only app.
  // No offline cache is stored.
  if (event.request.method !== "GET") return;

  event.respondWith(fetch(event.request));
});
