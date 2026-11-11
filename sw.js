// Guarda la app en el teléfono para que abra al instante y sin internet.
// - La página (index.html) y config.js se buscan PRIMERO en internet (sin caché), para que los cambios
//   se vean de inmediato; si no hay conexión, se usa la copia guardada.
// - Íconos y demás archivos: se muestra lo guardado y se actualiza por detrás.
// Los datos de asistencia NO pasan por aquí: van directo al servidor.
const CACHE = 'asistencia-teba-clasica-v4';
const ARCHIVOS = ['./', './index.html', './direccion.js', './config.js', './manifest.webmanifest', './icono-192.png', './icono-512.png', './icono-apple.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.all(ARCHIVOS.map((a) => fetch(a, { cache: 'no-store' }).then((r) => r.ok && c.put(a, r)).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const esPagina = req.mode === 'navigate';
  const primeroRed = esPagina || /\/config\.js$/.test(url.pathname) || /\/direccion\.js$/.test(url.pathname);
  const llave = esPagina ? './index.html' : req;
  e.respondWith(caches.open(CACHE).then((c) => {
    const deRed = fetch(req.url, { cache: 'no-store' }).then((r) => {
      if (r && r.ok) c.put(llave, r.clone());
      return r;
    });
    deRed.catch(() => {});
    if (primeroRed) {
      return deRed.catch(() => c.match(llave, { ignoreSearch: esPagina }));
    }
    return c.match(llave).then((guardado) => guardado || deRed).catch(() => deRed);
  }));
});

// Al tocar una notificación de lista pendiente se abre la app directo en esa lista.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ('navigate' in c) return c.navigate(url).then((w) => w && w.focus()); }
    return self.clients.openWindow(url);
  }));
});
