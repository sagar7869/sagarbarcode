self.addEventListener('install', function(event) {
  console.log('Service Worker installing.');
});
self.addEventListener('fetch', function(event) {
  // Optional: cache handling for offline
});