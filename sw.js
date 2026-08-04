// DHYAN DEIN: Maine yahan v1 ko v2 kar diya hai, taaki purana cache turant delete ho jaye.
const CACHE_NAME = "sagar-scan-v2"; 
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "https://unpkg.com/html5-qrcode"
];

// Install Service Worker
self.addEventListener("install", (e) => {
  self.skipWaiting(); // Naye update ko turant lagoo karne ke liye
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Purane Cache (jaise v1) ko delete karne ke liye
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Asli Jadoo (Stale-While-Revalidate) - Cache aur Update dono ek sath
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // 1. Background mein internet se naya update check karo aur download karo
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, networkResponse.clone()); // Naye code ko memory mein save karo
        });
        return networkResponse;
      }).catch(() => {
        // Agar internet off hai, toh app crash nahi hogi
      });

      // 2. Turant purana cache dikha do (fast load), aur background mein file update hone do
      return cachedResponse || fetchPromise;
    })
  );
});
