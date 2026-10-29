import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import useProductsStore from '../../store/productsStore';
import { formatCurrency } from '../../utils/formatters';
import { FloatingPanel, HighlightMatch, useClickOutside, useListNavigation, optionCls } from './searchDropdown';
import { productSalePrice } from '../../utils/salePricing';

const MIN_CHARS = 2;
const MAX_RESULTS = 50;

/**
 * Buscador de productos en servidor (compras, ajustes, ...).
 *
 * Props:
 *  value          — texto del input (controlado por el padre)
 *  onChange(text) — al escribir
 *  onSelect(product)
 *  onClear()      — botón X (solo visible si hasSelection o hay texto)
 *  hasSelection   — hay un producto elegido
 *  show           — { stock, cost, price } qué datos mostrar en cada opción
 *  extraParams    — parámetros extra para la búsqueda (ej: warehouse_id)
 */
export default function ProductSearchInput({
  value,
  onChange,
  onSelect,
  onClear,
  hasSelection = false,
  placeholder = 'Buscar por SKU, código o nombre...',
  show = { stock: true },
  extraParams,
  autoFocus = false,
}) {
  const searchProducts = useProductsStore(s => s.searchProducts);
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const query = typing ? (value || '').trim() : '';
  const extraKey = JSON.stringify(extraParams || {});

  useEffect(() => {
    if (query.length < MIN_CHARS) { setResults([]); setLoading(false); return; }
    let stale = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await searchProducts(query, extraParams || {});
      if (stale) return;
      setResults(res.slice(0, MAX_RESULTS));
      setLoading(false);
    }, 300);
    return () => { stale = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, extraKey, searchProducts]);

  const close = useCallback(() => setOpen(false), []);

  const pick = (p) => {
    onSelect(p);
    setTyping(false);
    setOpen(false);
  };

  const nav = useListNavigation({
    count: results.length,
    open,
    resetKey: query,
    onPick: (i) => results[i] && pick(results[i]),
    onOpen: () => setOpen(true),
    onClose: close,
  });

  useClickOutside([wrapRef, nav.listRef], close, open);

  let status = null;
  if (!query) status = hasSelection ? null : `Escribe al menos ${MIN_CHARS} caracteres para buscar…`;
  else if (query.length < MIN_CHARS) status = `Escribe al menos ${MIN_CHARS} caracteres para buscar…`;
  else if (loading && results.length === 0) status = 'Buscando…';
  else if (!loading && results.length === 0) status = `No se encontraron productos para "${query}"`;

  const stockCls = (p) => {
    const s = Number(p.current_stock ?? 0);
    if (s <= 0) return 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400';
    if (p.min_stock != null && s <= Number(p.min_stock)) return 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400';
    return 'text-green-700 bg-green-50 dark:bg-green-500/10 dark:text-green-400';
  };

  return (
    <div ref={wrapRef} className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={e => { onChange(e.target.value); setTyping(true); setOpen(true); }}
        onFocus={e => { setOpen(true); if (hasSelection) e.target.select(); }}
        onKeyDown={nav.onKeyDown}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {loading && <Loader2 size={14} className="animate-spin text-blue-500" />}
        {(hasSelection || value) && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => { onClear?.(); setTyping(false); setResults([]); inputRef.current?.focus(); }}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <FloatingPanel
        ref={nav.listRef}
        anchorRef={wrapRef}
        open={open && (!!status || results.length > 0)}
        minWidth={380}
        maxHeight={340}
        footer={results.length >= MAX_RESULTS
          ? `Mostrando ${MAX_RESULTS} resultados. Refina la búsqueda para ver más.`
          : results.length > 0 ? '↑↓ para moverse · Enter para elegir · Esc para cerrar' : null}
      >
        {status ? (
          <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">{status}</p>
        ) : results.map((p, i) => (
          <div
            key={p.id}
            data-index={i}
            role="option"
            onMouseEnter={() => nav.setActiveIndex(i)}
            onClick={() => pick(p)}
            className={`${optionCls(i === nav.activeIndex, false)} ${loading ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  <HighlightMatch text={p.name} query={query} />
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  SKU <span className="font-mono"><HighlightMatch text={p.sku} query={query} /></span>
                  {p.barcode && p.barcode !== p.sku && (
                    <> · <span className="font-mono"><HighlightMatch text={p.barcode} query={query} /></span></>
                  )}
                  {p.category?.name && <> · {p.category.name}</>}
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0 text-xs">
                {show.stock && (
                  <span className={`px-1.5 py-0.5 rounded font-medium ${stockCls(p)}`}>
                    Stock {Number(p.current_stock ?? 0).toLocaleString('es-CO')}
                  </span>
                )}
                {show.cost && p.average_cost != null && (
                  <span className="text-gray-500 dark:text-gray-400">Costo {formatCurrency(p.average_cost)}</span>
                )}
                {show.price && (p.base_price != null || p.sale_price != null) && (
                  <span className="text-gray-500 dark:text-gray-400">Precio {formatCurrency(productSalePrice(p))}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </FloatingPanel>
    </div>
  );
}
