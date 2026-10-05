importScripts('/app-config.js');
const CACHE_PREFIX = 'mesura-shell-';
const CACHE = `${CACHE_PREFIX}${self.MESURA_CONFIG.version}`;
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/', '/icon-192.png', '/icon-512.png', '/fonts/Archivo-variable.ttf'])).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Never persist API responses, photos, exports, sessions, measurements or notes.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/')));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/icon-')) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); } return response; })));
});
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch {}
  event.waitUntil(self.registration.showNotification(self.MESURA_CONFIG.name, { body: 'Votre rendez-vous de mesures vous attend.', icon: '/icon-192.png', badge: '/icon-192.png', tag: payload.tag || 'measurement-reminder', data: { url: '/#measure' } }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => { const client = clients.find(client => new URL(client.url).origin === self.location.origin); if (client) return client.navigate('/#measure').then(() => client.focus()); return self.clients.openWindow('/#measure'); }));
});
