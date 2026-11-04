// Service worker legado do caminho /app/: não apaga caches do sistema principal.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  event.respondWith(fetch(request).catch(async () => {
    if (request.mode === 'navigate') {
      const appShellUrl = new URL('../index.html', self.location.href).href;
      const cached = await caches.match(appShellUrl);
      if (cached) return cached;
    }
    return Response.error();
  }));
});
