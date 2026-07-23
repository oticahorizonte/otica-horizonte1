// Service Worker — Ótica Horizonte v199
// Estratégia: Limpar TODOS os caches antigos e buscar sempre da rede

const CACHE_NAME = 'otica-horizonte-v199';

self.addEventListener('install', function(event) {
  console.log('SW v199: instalando...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('SW v199: ativando, limpando caches antigos...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('SW v199: removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('SW v199: todos os caches antigos removidos!');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Sempre buscar da rede - nunca servir do cache
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});
