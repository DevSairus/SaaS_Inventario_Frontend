// frontend/src/hooks/useRetentionCatalog.js
// Catálogo de conceptos de retención del tenant, cacheado en memoria para no
// pedirlo en cada selector (producto, categoría, proveedor). `refresh()` lo
// vuelve a pedir (ej. tras guardar la configuración tributaria).
import { useCallback, useEffect, useState } from 'react';
import { retentionsAPI } from '../api/retentions';

let cache = null;
let inflight = null;

function load(force = false) {
  if (!force && cache) return Promise.resolve(cache);
  if (!force && inflight) return inflight;
  inflight = retentionsAPI.getCatalog()
    .then((res) => { cache = res.data; return cache; })
    .catch(() => null)
    .finally(() => { inflight = null; });
  return inflight;
}

/** Descarta el catálogo cacheado (ej. tras guardar la configuración tributaria). */
export function invalidateRetentionCatalog() {
  cache = null;
}

export default function useRetentionCatalog() {
  const [catalog, setCatalog] = useState(cache);
  useEffect(() => {
    let alive = true;
    load().then((c) => { if (alive && c) setCatalog(c); });
    return () => { alive = false; };
  }, []);
  const refresh = useCallback(async () => {
    const c = await load(true);
    if (c) setCatalog(c);
    return c;
  }, []);
  return { catalog, concepts: catalog?.concepts || [], refresh };
}
