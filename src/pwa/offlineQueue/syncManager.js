import axios from '../../api/axios';
import db from './db';

let flushing = false;
let started = false;
let pollHandle = null;

function isNetworkError(error) {
  return !error.response && !!error.request;
}

function rewriteUrl(url, localId, serverId) {
  return url.replaceAll(localId, serverId);
}

// FIFO por createdAt. Deliberadamente secuencial (no paralelo): el volumen
// esperado por técnico/turno es bajo y evita reordenar mutaciones dependientes
// (ej. un "addItem" sobre una OT que todavía no existía en el servidor).
export async function flush() {
  if (flushing || typeof navigator === 'undefined' || !navigator.onLine) return;
  flushing = true;
  try {
    const pending = await db.mutationQueue.where('status').equals('pending').sortBy('createdAt');
    const idMap = new Map(); // localEntityId -> serverEntityId, resuelto en esta corrida

    for (const mutation of pending) {
      let { url } = mutation;
      const { payload, localEntityId, baseVersion, operation } = mutation;

      if (operation !== 'create' && localEntityId && idMap.has(localEntityId)) {
        url = rewriteUrl(url, localEntityId, idMap.get(localEntityId));
      }

      const body = baseVersion ? { ...payload, expected_updated_at: baseVersion } : payload;

      try {
        const res = await axios.request({ method: mutation.method, url, data: body });
        if (operation === 'create') {
          const serverId = res.data?.data?.id;
          if (serverId) idMap.set(localEntityId, serverId);
        }
        await db.mutationQueue.delete(mutation.id);
      } catch (error) {
        if (error.response?.status === 409) {
          await db.mutationQueue.update(mutation.id, {
            status: 'conflict',
            lastError: 'El registro cambió en el servidor mientras estabas sin conexión.',
          });
        } else if (isNetworkError(error)) {
          // Seguimos sin red real (falso positivo de navigator.onLine): detener
          // el resto del flush, se reintentará en el próximo trigger.
          break;
        } else {
          await db.mutationQueue.update(mutation.id, {
            status: 'error',
            attempts: (mutation.attempts || 0) + 1,
            lastError: error.response?.data?.message || error.message,
          });
        }
      }
    }
  } finally {
    flushing = false;
  }
}

// Reintento manual (botón "Reintentar sincronización"): reactiva mutaciones
// marcadas 'error' para que el próximo flush() las vuelva a intentar. Las
// 'conflict' NO se tocan aquí — requieren resolución explícita del usuario.
export async function retryErrors() {
  const errored = await db.mutationQueue.where('status').equals('error').toArray();
  await Promise.all(errored.map((m) => db.mutationQueue.update(m.id, { status: 'pending' })));
}

export function startSyncManager() {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.addEventListener('online', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flush();
  });
  // Red de seguridad: cubre el caso donde 'online'/'visibilitychange' no se
  // disparan de forma confiable (frecuente en iOS Safari).
  pollHandle = setInterval(() => {
    db.mutationQueue.where('status').equals('pending').count().then((count) => {
      if (count > 0) flush();
    });
  }, 20000);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'WORKSHOP_FLUSH_QUEUE') flush();
    });
    navigator.serviceWorker.ready
      .then((registration) => {
        if ('sync' in registration) {
          // Bonus solo Chrome/Android — iOS Safari nunca dispara esto, por
          // eso el mecanismo base es online/visibilitychange/polling arriba.
          return registration.sync.register('workshop-sync').catch(() => {});
        }
      })
      .catch(() => {});
  }

  flush();
}

export function stopSyncManager() {
  if (pollHandle) clearInterval(pollHandle);
  started = false;
}
