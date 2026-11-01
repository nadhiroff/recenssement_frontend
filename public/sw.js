// Service worker : cache des fichiers de l'application pour rouvrir et remplir le formulaire hors ligne.
// Les appels à l'API ne passent jamais par ce cache.
const CACHE = 'zocli-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.includes('/app/')) return;

  if (e.request.mode === 'navigate') {
    const racine = new URL('index.html', self.registration.scope).href;
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copie = r.clone();
          caches.open(CACHE).then((c) => c.put(racine, copie));
          return r;
        })
        .catch(() => caches.match(racine))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(
      (trouve) =>
        trouve ??
        fetch(e.request).then((r) => {
          if (r.ok) {
            const copie = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copie));
          }
          return r;
        })
    )
  );
});
