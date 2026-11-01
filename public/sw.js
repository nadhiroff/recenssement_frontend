// Service worker : pré-cache de toute l'application dès la première visite, pour rouvrir
// et remplir le formulaire hors ligne. Les appels à l'API ne passent jamais par ce cache.
const CACHE = 'zocli';

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const liste = await (await fetch('precache.json', { cache: 'no-store' })).json();
      const cache = await caches.open(`${CACHE}-${liste.version}`);
      await cache.addAll(liste.fichiers);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const cles = await caches.keys();
      await Promise.all(cles.slice(0, -1).map((c) => caches.delete(c)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.includes('/app/')) return;
  const accueil = new URL('index.html', self.registration.scope).href;
  e.respondWith(
    (async () => {
      const trouve = await caches.match(e.request.mode === 'navigate' ? accueil : e.request);
      if (trouve) return trouve;
      return fetch(e.request);
    })()
  );
});
