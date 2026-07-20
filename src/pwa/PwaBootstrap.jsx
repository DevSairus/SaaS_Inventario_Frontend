import { useEffect } from 'react';
import { useWorkshopPwaEligible } from './useWorkshopPwaEligible';
import { startSyncManager } from './offlineQueue/syncManager';

const MANIFEST_LINK_ID = 'workshop-pwa-manifest';
const APPLE_ICON_LINK_ID = 'workshop-pwa-apple-icon';
const SW_SCOPE = '/workshop/';
const SW_URL = '/workshop-sw.js';

function addHeadTag(id, tagName, attrs) {
  if (document.getElementById(id)) return;
  const el = document.createElement(tagName);
  el.id = id;
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  document.head.appendChild(el);
}

function removeHeadTag(id) {
  document.getElementById(id)?.remove();
}

// Inyecta el manifest/ícono de la PWA "Taller" y registra su Service Worker,
// pero SOLO si el dispositivo es mobile Y el tenant tiene el módulo "workshop"
// habilitado — mismo criterio que <TenantRoute module="workshop"> en App.jsx,
// para no duplicar la lógica de bloqueo de módulos.
function PwaBootstrap() {
  const eligible = useWorkshopPwaEligible();

  useEffect(() => {
    if (!eligible) {
      removeHeadTag(MANIFEST_LINK_ID);
      removeHeadTag(APPLE_ICON_LINK_ID);
      return;
    }

    addHeadTag(MANIFEST_LINK_ID, 'link', { rel: 'manifest', href: '/manifest.webmanifest' });
    addHeadTag(APPLE_ICON_LINK_ID, 'link', { rel: 'apple-touch-icon', href: '/icons/workshop-180.png' });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(SW_URL, { scope: SW_SCOPE })
        .catch((err) => {
          if (import.meta.env.DEV) console.warn('[pwa] no se pudo registrar el Service Worker de Taller:', err);
        });
    }

    // Cola de sincronización offline (OT y vehículos) — solo tiene sentido
    // arrancarla para usuarios elegibles a la PWA de Taller.
    startSyncManager();
  }, [eligible]);

  return null;
}

export default PwaBootstrap;
