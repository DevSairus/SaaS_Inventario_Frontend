// Service Worker de la PWA "Taller" — scope /workshop/ únicamente.
// Ver plan: 00 - Documentación / PWA Taller. No debe interceptar nada fuera
// de /workshop/ (el resto de la SPA sigue funcionando sin SW).
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST || []);

// Navegaciones dentro de /workshop/* caen al shell precacheado si no hay red.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    allowlist: [/^\/workshop\//],
  })
);

// Lecturas (listas/detalle) de Órdenes de Trabajo y Vehículos: red primero,
// con fallback rápido a caché si no hay respuesta en 4s o falla la red.
// Explícitamente fuera: /pdf (blobs grandes) y /commission-* (fuera del alcance
// de navegación de la PWA mobile).
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    /\/api\/workshop\/(work-orders|vehicles)(\/|\?|$)/.test(url.pathname) &&
    !url.pathname.includes('/pdf'),
  new NetworkFirst({
    cacheName: 'workshop-api-cache',
    networkTimeoutSeconds: 4,
  })
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Background Sync (bonus, solo Chrome/Android — iOS Safari no dispara este evento;
// el mecanismo real de sincronización vive en syncManager.js, disparado por la página).
self.addEventListener('sync', (event) => {
  if (event.tag === 'workshop-sync') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'WORKSHOP_FLUSH_QUEUE' }));
      })
    );
  }
});
