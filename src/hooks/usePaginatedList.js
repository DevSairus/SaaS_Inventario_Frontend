import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Listado paginado en servidor con el contrato común del backend:
 *   petición  ?page=&limit=  → respuesta { data, pagination: { page, limit, total, pages } }
 *
 *   const list = usePaginatedList(
 *     (params, { signal }) => journalEntriesAPI.getAll(params, { signal }),
 *     { filters, defaultPageSize: 50 },
 *   );
 *   list.rows, list.loading, list.page, list.pageSize, list.total, list.pages,
 *   list.setPage, list.setPageSize, list.reload, list.paginationProps,
 *   list.meta (respuesta completa, para totales u otros campos extra)
 *
 * - Vuelve a la página 1 cuando cambian los filtros (comparados por valor).
 * - Guarda page y limit en la URL (?page=3&limit=100), así al entrar a un
 *   detalle y volver se conserva la página. `urlPrefix` separa dos listados
 *   en la misma pantalla; `syncUrl: false` lo desactiva (modales, pestañas).
 * - Cancela la petición anterior si se cambia de página rápido, e ignora
 *   respuestas viejas.
 * - Mientras carga conserva las filas anteriores (sin parpadeo).
 */
export default function usePaginatedList(fetcher, {
  filters = {},
  defaultPageSize = 50,
  syncUrl = true,
  urlPrefix = '',
  enabled = true,
  onError,
} = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageKey = `${urlPrefix}page`;
  const limitKey = `${urlPrefix}limit`;

  const [localPage, setLocalPage] = useState(1);
  const [localSize, setLocalSize] = useState(defaultPageSize);

  const page = syncUrl ? Math.max(1, parseInt(searchParams.get(pageKey), 10) || 1) : localPage;
  const pageSize = syncUrl ? (parseInt(searchParams.get(limitKey), 10) || defaultPageSize) : localSize;

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: defaultPageSize, total: 0, pages: 1 });
  // Respuesta completa (para campos extra como totales o contadores).
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const seqRef = useRef(0);
  const abortRef = useRef(null);

  const writeUrl = useCallback((patch) => {
    // Se parte de la URL actual y no de `prev`: si la pantalla también
    // escribe la URL en el mismo render (p. ej. sus filtros), `prev` estaría
    // desactualizado y se perderían esos cambios.
    setSearchParams(() => {
      const next = new URLSearchParams(window.location.search);
      Object.entries(patch).forEach(([k, v]) => {
        if (v == null || v === '' || (k === pageKey && v === 1) || (k === limitKey && v === defaultPageSize)) next.delete(k);
        else next.set(k, String(v));
      });
      return next;
    }, { replace: true });
  }, [setSearchParams, pageKey, limitKey, defaultPageSize]);

  const setPage = useCallback((p) => {
    const n = Math.max(1, Number(p) || 1);
    if (syncUrl) writeUrl({ [pageKey]: n });
    else setLocalPage(n);
  }, [syncUrl, writeUrl, pageKey]);

  const setPageSize = useCallback((size) => {
    if (syncUrl) writeUrl({ [limitKey]: size, [pageKey]: 1 });
    else { setLocalSize(size); setLocalPage(1); }
  }, [syncUrl, writeUrl, limitKey, pageKey]);

  // Filtros nuevos → página 1. Se salta el primer render para respetar la
  // página que venga en la URL.
  const filtersKey = JSON.stringify(filters);
  const prevFiltersKey = useRef(filtersKey);
  useEffect(() => {
    if (prevFiltersKey.current === filtersKey) return;
    prevFiltersKey.current = filtersKey;
    if (page !== 1) setPage(1);
  }, [filtersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled) return undefined;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);

    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v != null) params[k] = v;
    });
    params.page = page;
    params.limit = pageSize;

    Promise.resolve(fetcherRef.current(params, { signal: controller.signal }))
      .then((res) => {
        if (seq !== seqRef.current) return;
        // Acepta tanto la respuesta de axios ({ data: {...} }) como el body.
        const body = res && res.data && !Array.isArray(res.data) && res.data.data !== undefined ? res.data : res;
        const data = Array.isArray(body?.data) ? body.data : [];
        const pg = body?.pagination || { page, limit: pageSize, total: data.length, pages: 1 };
        setRows(data);
        setPagination(pg);
        setMeta(body);
        // Si la página pedida ya no existe (p. ej. se borraron filas), ir a la última.
        if (pg.pages && page > pg.pages) setPage(pg.pages);
      })
      .catch((err) => {
        if (seq !== seqRef.current || err?.name === 'CanceledError' || err?.name === 'AbortError') return;
        setError(err);
        onErrorRef.current?.(err);
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });

    return () => controller.abort();
  }, [filtersKey, page, pageSize, reloadTick, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  return {
    rows,
    setRows,
    loading,
    error,
    page,
    pageSize,
    total: pagination.total || 0,
    pages: pagination.pages || 1,
    pagination,
    meta,
    setPage,
    setPageSize,
    reload,
    paginationProps: {
      currentPage: page,
      totalPages: pagination.pages || 1,
      onPageChange: setPage,
      totalItems: pagination.total || 0,
      pageSize,
      onPageSizeChange: setPageSize,
    },
  };
}
