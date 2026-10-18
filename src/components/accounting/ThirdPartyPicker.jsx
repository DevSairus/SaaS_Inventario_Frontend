import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { thirdPartiesAPI, THIRD_PARTY_TYPE_LABELS } from '../../api/accounting';
import { FloatingPanel, HighlightMatch, useClickOutside, useListNavigation, optionCls } from '../common/searchDropdown';

const TYPE_BADGE = {
  customer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  supplier: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  employee: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

export function ThirdPartyBadge({ type }) {
  if (!type) return null;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_BADGE[type] || 'bg-gray-100 text-gray-600'}`}>
      {THIRD_PARTY_TYPE_LABELS[type] || type}
    </span>
  );
}

/**
 * Selector de tercero contable (cliente, proveedor o empleado).
 * value: { id, name, tax_id, type } | null — onChange(value | null)
 */
export default function ThirdPartyPicker({ value, onChange, placeholder = 'Tercero (opcional)...', types, className = '' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const typesKey = (types || []).join(',');

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    let stale = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await thirdPartiesAPI.search(q, typesKey ? { types: typesKey } : {});
        if (!stale) setResults(res.data || []);
      } catch {
        if (!stale) setResults([]);
      } finally {
        if (!stale) setLoading(false);
      }
    }, 250);
    return () => { stale = true; clearTimeout(t); };
  }, [query, typesKey]);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  const pick = (tp) => { onChange(tp); close(); };

  const nav = useListNavigation({
    count: results.length,
    open,
    resetKey: query,
    onPick: (i) => results[i] && pick(results[i]),
    onOpen: () => setOpen(true),
    onClose: close,
  });
  useClickOutside([wrapRef, nav.listRef], close, open);

  const q = query.trim();
  let status = null;
  if (q.length < 2) status = 'Escribe nombre o NIT / cédula (mín. 2 caracteres)';
  else if (loading && !results.length) status = 'Buscando…';
  else if (!loading && !results.length) status = `Sin terceros para "${q}"`;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        autoComplete="off"
        value={open ? query : (value ? `${value.name}${value.tax_id ? ` · ${value.tax_id}` : ''}` : '')}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={nav.onKeyDown}
        placeholder={value ? `${value.name}` : placeholder}
        title={value ? `${THIRD_PARTY_TYPE_LABELS[value.type] || ''}: ${value.name} ${value.tax_id || ''}` : ''}
        className="w-full pl-7 pr-7 py-1.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm bg-white dark:bg-graphite-2 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
        {loading ? <Loader2 size={13} className="animate-spin text-indigo-500" /> : value && (
          <button type="button" tabIndex={-1} onClick={() => onChange(null)} className="text-gray-400 hover:text-red-500" title="Quitar tercero">
            <X size={13} />
          </button>
        )}
      </div>
      <FloatingPanel ref={nav.listRef} anchorRef={wrapRef} open={open} minWidth={320}>
        {status ? (
          <p className="px-3 py-2.5 text-xs text-gray-400">{status}</p>
        ) : results.map((tp, i) => (
          <div
            key={`${tp.type}-${tp.id}`}
            data-index={i}
            role="option"
            onMouseEnter={() => nav.setActiveIndex(i)}
            onClick={() => pick(tp)}
            className={optionCls(i === nav.activeIndex, value?.id === tp.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-gray-900 dark:text-gray-100 truncate"><HighlightMatch text={tp.name} query={q} /></p>
                {tp.tax_id && <p className="text-xs text-gray-500"><HighlightMatch text={tp.tax_id} query={q} /></p>}
              </div>
              <ThirdPartyBadge type={tp.type} />
            </div>
          </div>
        ))}
      </FloatingPanel>
    </div>
  );
}
