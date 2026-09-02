const CACHE = 'arrosage-v2';
const FICHIERS = ['./', './index.html', './manifest.json', './icone.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

// Coquille en cache d'abord ; les appels météo passent toujours par le réseau
// (l'app garde elle-même le dernier relevé en localStorage).
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname.endsWith('open-meteo.com')) return;
  // La page : réseau d'abord, pour qu'une mise à jour du dépôt soit visible tout de suite.
  if (e.request.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const copie = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copie));
        return resp;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (resp.ok && url.origin === location.origin) {
        const copie = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copie));
      }
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
