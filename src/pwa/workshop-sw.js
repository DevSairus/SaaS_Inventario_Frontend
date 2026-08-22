// Service Worker de la PWA — mismo archivo compilado sirve dos alcances
// distintos según con qué `scope` se haya registrado (ver PwaBootstrap.jsx):
//   - /workshop/ -> PWA "Taller", limitada a esas rutas (rol técnico).
//   - /          -> PWA completa, sin restricción de navegación (todo
//                   el resto de roles). Se detecta leyendo
//                   self.registration.scope en vez de hardcodearlo, así no
//                   hace falta compilar dos Service Workers distintos.
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST || []);

const isFullScope = new URL(self.registration.scope).pathname === '/';

// Navegaciones dentro del alcance registrado caen al shell precacheado si no
// hay red -- /workshop/* nada más para la PWA "Taller", cualquier ruta para
// la PWA completa.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    allowlist: isFullScope ? [/^\//] : [/^\/workshop\//],
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

// Diagram templates (catálogo de diagramas) — cache agresivo, cambia raramente.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    /\/api\/workshop\/diagram-templates/.test(url.pathname),
  new NetworkFirst({
    cacheName: 'diagram-api-cache',
    networkTimeoutSeconds: 4,
  })
);

// Diagnosis marks — network first, fallback a cache.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    /\/api\/workshop\/work-orders\/.*\/diagnosis-marks/.test(url.pathname),
  new NetworkFirst({
    cacheName: 'diagnosis-api-cache',
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
