import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Guarda la página actual en la URL (?page=3) para pantallas que manejan su
 * propia paginación (estado local o store), sin pasarlas a usePaginatedList.
 * Así, al entrar a un detalle y volver con "atrás", se conserva la página.
 *
 *   useUrlPageSync(pagination.page, setPage);
 *
 * - Al montar, si la URL trae otra página, llama setPage(n) una vez.
 * - Después, cada cambio de página se escribe en la URL (replace, sin
 *   ensuciar el historial). La página 1 no se escribe.
 * - `key` permite dos listados en la misma pantalla.
 */
export default function useUrlPageSync(page, setPage, { key = 'page' } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const restored = useRef(false);
  // Página pedida desde la URL al montar, mientras la pantalla la aplica
  // (puede tardar si setPage dispara una carga).
  const pending = useRef(null);
  const initialPage = useRef(page);
  const setPageRef = useRef(setPage);
  setPageRef.current = setPage;

  // URL → pantalla (solo al montar)
  useEffect(() => {
    const fromUrl = parseInt(searchParams.get(key), 10);
    if (fromUrl > 1 && fromUrl !== Number(page)) {
      pending.current = fromUrl;
      setPageRef.current(fromUrl);
    }
    restored.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // pantalla → URL
  useEffect(() => {
    if (!restored.current) return;
    const n0 = Number(page) || 1;
    if (pending.current != null) {
      // Aún no llega la página restaurada: no tocar la URL. Si la pantalla
      // se movió a otra (p. ej. un filtro la devolvió a 1), se sigue normal.
      if (n0 === pending.current) { pending.current = null; return; }
      if (n0 === Number(initialPage.current)) return;
      pending.current = null;
    }
    const current = parseInt(new URLSearchParams(window.location.search).get(key), 10) || 1;
    const n = Number(page) || 1;
    if (current === n) return;
    // Se parte de la URL actual (no de searchParams del render) para no
    // pisar otros parámetros que la pantalla haya escrito en el mismo ciclo.
    setSearchParams(() => {
      const next = new URLSearchParams(window.location.search);
      if (n > 1) next.set(key, String(n)); else next.delete(key);
      return next;
    }, { replace: true });
  }, [page, key, setSearchParams]);
}
