// Service worker removido - causava cache de respostas de erro
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  self.clients.claim();
});
