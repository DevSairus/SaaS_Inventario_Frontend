import { useEffect, useRef, useState } from 'react';

/**
 * Opciones de un buscador que consulta el servidor mientras se escribe, en
 * vez de precargar todo el catálogo (que con un tope fijo deja registros por
 * fuera sin avisar).
 *
 *   const { options, loading } = useRemoteOptions(
 *     (q) => axios.get('/customers', { params: { search: q, limit: 8 } }).then(r => r.data.data || []),
 *     search,
 *   );
 *
 * Con menos de `minChars` caracteres devuelve []. Debounce de 300 ms y
 * descarta respuestas viejas.
 */
export default function useRemoteOptions(fetcher, query, { minChars = 2, delay = 300 } = {}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const q = (query || '').trim();
    if (q.length < minChars) { setOptions([]); setLoading(false); return undefined; }
    let stale = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetcherRef.current(q);
        if (!stale) setOptions(Array.isArray(res) ? res : []);
      } catch {
        if (!stale) setOptions([]);
      } finally {
        if (!stale) setLoading(false);
      }
    }, delay);
    return () => { stale = true; clearTimeout(t); };
  }, [query, minChars, delay]);

  return { options, loading };
}
