/* Recanto Agradável: recebe os avisos (Web Push) e abre a tela certa ao tocar.
   Não guarda nada em cache: o site sempre carrega a versão publicada. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  const base = self.registration.scope;
  const url = typeof d.url === 'string' && d.url.startsWith(base) ? d.url : base;
  e.waitUntil(self.registration.showNotification(d.title || 'Recanto Agradável', {
    body: d.body || '', tag: d.tag || undefined, icon: base + 'icones/icone-192.png', badge: base + 'icones/icone-192.png', data: { url }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abertas) {
      if (c.url.startsWith(self.registration.scope)) { try { await c.navigate(url); } catch (_) {} return c.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});
