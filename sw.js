// Cache de recursos estáticos do sistema. Dados do Firebase nunca entram no cache.
const CACHE_PREFIX = 'otica-horizonte-shell-';
const CACHE_NAME = CACHE_PREFIX + 'v501';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './catalogo.html',
  './os_print.html'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async path => {
      try {
        const response = await fetch(path, {cache:'reload'});
        if (response.ok) await cache.put(path, response);
      } catch (error) {
        // A instalação continua mesmo quando um recurso secundário falha.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

function isFirebaseDataRequest(url) {
  return /(^|\.)firestore\.googleapis\.com$/i.test(url.hostname) ||
    /(^|\.)firebasestorage\.googleapis\.com$/i.test(url.hostname) ||
    /(^|\.)identitytoolkit\.googleapis\.com$/i.test(url.hostname) ||
    /(^|\.)securetoken\.googleapis\.com$/i.test(url.hostname) ||
    /(^|\.)firebaseio\.com$/i.test(url.hostname) ||
    /(^|\.)cloudinary\.com$/i.test(url.hostname);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (isFirebaseDataRequest(url)) return;

  const sameOrigin = url.origin === self.location.origin;
  const firebaseSdk = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  if (!sameOrigin && !firebaseSdk) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const appShell = await cache.match('./index.html');
        if (appShell) return appShell;
      }
      return Response.error();
    }
  })());
});
