import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import {
  FloatingPanel, HighlightMatch, matchesSearch, useClickOutside, useListNavigation, optionCls,
} from './searchDropdown';

export { HighlightMatch };

/**
 * Combobox buscable reutilizable
 *
 * Props:
 *  placeholder   — texto de ayuda
 *  items         — array de objetos
 *  value         — id del item seleccionado (o null)
 *  displayValue  — texto visible cuando hay valor seleccionado
 *  onSelect(item) — callback al seleccionar
 *  onClear()      — callback al limpiar
 *  renderItem(item, query) — JSX de cada opción (usar <HighlightMatch text query />
 *                   para resaltar lo buscado)
 *  filterFn(item, query) — función de filtrado (por defecto busca en displayKey / name)
 *  getSearchText(item) — alternativa a filterFn: texto en el que buscar (sin tildes)
 *  maxResults    — máximo de opciones visibles (default 50)
 *  disabled      — deshabilita el input
 *  className     — clases adicionales para el wrapper
 *  onQueryChange(query) — callback opcional con el texto tecleado (ej: para
 *                         precargarlo en un formulario de "registrar nuevo")
 *  emptyText     — texto cuando no hay resultados
 *  panelMinWidth — ancho mínimo del desplegable en px (útil en columnas angostas)
 *  remoteSearch(query) — opcional, async → array. Complementa `items` cuando la
 *                   lista local está truncada (ej: limit=500): con 2+ caracteres
 *                   consulta el servidor y agrega lo que no esté en local.
 */
export default function Combobox({
  placeholder,
  items = [],
  value,
  displayValue,
  onSelect,
  onClear,
  renderItem,
  filterFn,
  getSearchText,
  maxResults = 50,
  disabled = false,
  className = '',
  onQueryChange,
  emptyText,
  panelMinWidth,
  remoteSearch,
  required = false,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  const [remote, setRemote] = useState({ q: '', items: [], loading: false });
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Sincronizar texto cuando el valor cambia desde afuera (ej: autofill) o tras seleccionar
  useEffect(() => {
    if (!value) setQuery('');
    else if (displayValue) setQuery(displayValue);
    setTyping(false);
  }, [value, displayValue, syncTick]);

  const close = useCallback(() => {
    setOpen(false);
    // Si se escribió algo y no se eligió nada, vuelve a mostrar el seleccionado
    setSyncTick(t => t + 1);
  }, []);

  // El texto solo filtra si el usuario está escribiendo; al abrir con un valor
  // ya elegido se muestran todas las opciones (el elegido marcado).
  const activeQuery = typing ? query : '';

  // Búsqueda en servidor (debounce + descarta respuestas viejas)
  const remoteSearchRef = useRef(remoteSearch);
  remoteSearchRef.current = remoteSearch;
  const hasRemote = !!remoteSearch;
  useEffect(() => {
    const q = activeQuery.trim();
    if (!hasRemote || q.length < 2) { setRemote({ q: '', items: [], loading: false }); return; }
    let stale = false;
    setRemote(r => ({ ...r, loading: true }));
    const t = setTimeout(async () => {
      try {
        const res = await remoteSearchRef.current(q);
        if (!stale) setRemote({ q, items: Array.isArray(res) ? res : [], loading: false });
      } catch {
        if (!stale) setRemote({ q, items: [], loading: false });
      }
    }, 300);
    return () => { stale = true; clearTimeout(t); };
  }, [activeQuery, hasRemote]);

  const { filtered, total } = useMemo(() => {
    const q = activeQuery.trim();
    let list = items;
    if (q) {
      list = items.filter(i => {
        if (filterFn) return filterFn(i, q) || (getSearchText && matchesSearch(q, getSearchText(i)));
        return matchesSearch(q, getSearchText ? getSearchText(i) : (i.name ?? i.label ?? ''));
      });
      if (remote.q === q && remote.items.length) {
        const ids = new Set(list.map(i => i.id));
        list = list.concat(remote.items.filter(i => !ids.has(i.id)));
      }
    }
    return { filtered: list.slice(0, maxResults), total: list.length };
  }, [items, activeQuery, filterFn, getSearchText, maxResults, remote]);

  const pick = (item) => {
    onSelect(item);
    setOpen(false);
    setSyncTick(t => t + 1);
  };

  const nav = useListNavigation({
    count: filtered.length,
    open,
    resetKey: activeQuery,
    onPick: (i) => filtered[i] && pick(filtered[i]),
    onOpen: () => setOpen(true),
    onClose: close,
  });

  useClickOutside([wrapRef, nav.listRef], close, open);

  // Al abrir con un valor seleccionado, posiciona el cursor sobre él
  useEffect(() => {
    if (open && !typing && value) {
      const idx = filtered.findIndex(i => i.id === value);
      if (idx >= 0) nav.setActiveIndex(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const inputCls = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-graphite-2 dark:text-gray-100';

  const footer = total > filtered.length
    ? `Mostrando ${filtered.length} de ${total}. Escribe más para afinar la búsqueda.`
    : null;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          required={required}
          onChange={e => { setQuery(e.target.value); setTyping(true); setOpen(true); onQueryChange?.(e.target.value); }}
          onFocus={e => { if (!disabled) { setOpen(true); if (value) e.target.select(); } }}
          onClick={() => !disabled && setOpen(true)}
          onKeyDown={nav.onKeyDown}
          placeholder={placeholder}
          className={`${inputCls} pl-8 pr-8 ${disabled ? 'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-default' : ''}`}
        />
        {(value || query) && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => { setQuery(''); setTyping(false); onClear?.(); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <FloatingPanel
        ref={nav.listRef}
        anchorRef={wrapRef}
        open={open && !disabled && (filtered.length > 0 || !!activeQuery.trim())}
        minWidth={panelMinWidth}
        maxHeight={300}
        footer={footer}
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">
            {remote.loading ? 'Buscando…' : (emptyText || <>Sin resultados para "{activeQuery}"</>)}
          </p>
        ) : filtered.map((item, i) => (
          <div
            key={item.id}
            data-index={i}
            role="option"
            aria-selected={value === item.id}
            onMouseEnter={() => nav.setActiveIndex(i)}
            onClick={() => pick(item)}
            className={optionCls(i === nav.activeIndex, value === item.id)}
          >
            {renderItem(item, activeQuery)}
          </div>
        ))}
      </FloatingPanel>
    </div>
  );
}
