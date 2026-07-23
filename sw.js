// Service Worker v201 - Otica Horizonte
const CACHE_NAME = 'otica-v201';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => { console.log('SW: removendo cache', k); return caches.delete(k); })))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  // Sempre buscar da rede, sem cache
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
