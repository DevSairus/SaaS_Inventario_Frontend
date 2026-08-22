import { useEffect } from 'react';
import { useWorkshopPwaEligible, useIsFullPwaAccess } from './useWorkshopPwaEligible';
import { startSyncManager } from './offlineQueue/syncManager';

const MANIFEST_LINK_ID = 'workshop-pwa-manifest';
const APPLE_ICON_LINK_ID = 'workshop-pwa-apple-icon';
const SW_URL = '/workshop-sw.js';

function addOrUpdateHeadTag(id, tagName, attrs) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement(tagName);
    el.id = id;
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
}

function removeHeadTag(id) {
  document.getElementById(id)?.remove();
}

// Desregistra Service Workers de una sesión previa cuyo scope ya no coincide
// con el que le toca al rol actual (ej: se cerró sesión de un técnico y
// entró un admin en el mismo dispositivo) -- si no, quedarían dos SW
// activos compitiendo por rutas superpuestas del mismo origen.
async function unregisterStaleServiceWorkers(currentScopeUrl) {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((reg) => reg.active?.scriptURL.endsWith(SW_URL) && reg.scope !== currentScopeUrl)
      .map((reg) => reg.unregister())
  );
}

// Inyecta el manifest/ícono de la PWA y registra su Service Worker, pero
// SOLO si el dispositivo es mobile Y el tenant tiene el módulo "workshop"
// habilitado — mismo criterio que <TenantRoute module="workshop"> en App.jsx,
// para no duplicar la lógica de bloqueo de módulos.
//
// El alcance depende del rol (ver useIsFullPwaAccess): el técnico recibe la
// PWA "Taller", limitada a /workshop/* (histórico); cualquier otro rol
// recibe la app completa (scope "/", manifest-full.webmanifest) sin esa
// restricción. El mismo Service Worker (workshop-sw.js) sirve ambos casos —
// internamente ajusta su alcance de navegación offline leyendo
// self.registration.scope.
function PwaBootstrap() {
  const eligible = useWorkshopPwaEligible();
  const isFull = useIsFullPwaAccess();

  useEffect(() => {
    if (!eligible) {
      removeHeadTag(MANIFEST_LINK_ID);
      removeHeadTag(APPLE_ICON_LINK_ID);
      return;
    }

    const scope = isFull ? '/' : '/workshop/';
    const manifestHref = isFull ? '/manifest-full.webmanifest' : '/manifest.webmanifest';

    addOrUpdateHeadTag(MANIFEST_LINK_ID, 'link', { rel: 'manifest', href: manifestHref });
    addOrUpdateHeadTag(APPLE_ICON_LINK_ID, 'link', { rel: 'apple-touch-icon', href: '/icons/workshop-180.png' });

    if ('serviceWorker' in navigator) {
      const scopeUrl = new URL(scope, window.location.origin).href;
      unregisterStaleServiceWorkers(scopeUrl).finally(() => {
        navigator.serviceWorker
          .register(SW_URL, { scope })
          .catch((err) => {
            if (import.meta.env.DEV) console.warn('[pwa] no se pudo registrar el Service Worker:', err);
          });
      });
    }

    // Cola de sincronización offline (OT y vehículos) — solo tiene sentido
    // arrancarla para usuarios elegibles a la PWA.
    startSyncManager();
  }, [eligible, isFull]);

  return null;
}

export default PwaBootstrap;
