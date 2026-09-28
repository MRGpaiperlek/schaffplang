// Service Worker: Netz zuerst, bei Offline aus dem Zwischenspeicher; Push-Benachrichtigungen anzeigen
const CACHE = 'mr-schaffplang-v2';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // nur eigene Dateien zwischenspeichern
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./')))
  );
});

// Push-Meldung vom Server anzeigen
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'Schaffplang';
  const opts = { body: d.body || 'Der Plan wurde geändert.', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || 'plan', renotify: true, data: { url: d.url || './' } };
  e.waitUntil(self.registration.showNotification(title, opts));
});

// Tipp auf die Meldung: App in den Vordergrund holen bzw. öffnen und zur richtigen Woche springen
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.location.href).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(x => x.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({ type: 'goto', url }); if (c.focus) return c.focus(); return; }
    return self.clients.openWindow(url);
  }));
});
