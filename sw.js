const CACHE_NAME = "sagar-scan-v2"; // version change important!

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "https://unpkg.com/html5-qrcode@2.2.1/minified/html5-qrcode.min.js"
];

// Install Service Worker
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    })
  );
});
// Fetch Assets from Cache
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});
