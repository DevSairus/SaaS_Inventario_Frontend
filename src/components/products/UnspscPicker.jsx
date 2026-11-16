import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { productsAPI } from '../../api/products';

/**
 * Código UNSPSC del producto (factura electrónica, Anexo DIAN 1.9 tabla
 * 13.3.5). Busca en el catálogo UNSPSC v14 que trae la caja de herramientas
 * de la DIAN, por palabras ("pastillas freno") o por código ("2517").
 * Vacío = la factura usa la codificación propia (el código del producto).
 */
export default function UnspscPicker({ value, onChange, inputClassName = '' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const boxRef = useRef(null);

  // Nombre del código ya guardado (al editar un producto).
  useEffect(() => {
    if (!value) { setSelectedName(''); return; }
    let alive = true;
    productsAPI.searchUnspsc(value, 1)
      .then((rows) => { if (alive) setSelectedName(rows.find((r) => r.code === value)?.name || ''); })
      .catch(() => {});
    return () => { alive = false; };
  }, [value]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      productsAPI.searchUnspsc(q, 30)
        .then((rows) => { setResults(rows); setOpen(true); })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg dark:border-white/10 dark:bg-graphite-2">
        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{value}</span>
        <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">{selectedName}</span>
        <button type="button" onClick={() => onChange('')} title="Quitar código UNSPSC"
          className="p-1 text-gray-400 hover:text-red-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        className={inputClassName}
        placeholder="Busca por nombre (ej. filtro aceite) o código"
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto bg-white dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg">
          {loading && <div className="px-3 py-2 text-sm text-gray-500">Buscando…</div>}
          {!loading && !results.length && <div className="px-3 py-2 text-sm text-gray-500">Sin resultados en el catálogo UNSPSC</div>}
          {results.map((r) => (
            <button key={r.code} type="button"
              onClick={() => { onChange(r.code); setSelectedName(r.name); setQuery(''); setResults([]); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-white/5 last:border-0">
              <div className="text-sm text-gray-900 dark:text-gray-100"><span className="font-mono">{r.code}</span> · {r.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.class_name} › {r.family}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
