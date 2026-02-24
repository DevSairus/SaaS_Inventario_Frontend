import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

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
 *  renderItem(item) — JSX de cada opción en el dropdown
 *  filterFn(item, query) — función de filtrado
 *  disabled      — deshabilita el input
 *  className     — clases adicionales para el wrapper
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
  disabled = false,
  className = '',
}) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const ref               = useRef(null);

  // Sincronizar texto cuando el valor cambia desde afuera (ej: autofill)
  useEffect(() => {
    if (!value) setQuery('');
    else if (displayValue) setQuery(displayValue);
  }, [value, displayValue]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = query.trim()
    ? items.filter(i => filterFn(i, query)).slice(0, 12)
    : items.slice(0, 12);

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={placeholder}
          className={`${inputCls} pl-8 pr-8 ${disabled ? 'bg-gray-50 text-gray-400 cursor-default' : ''}`}
        />
        {(value || query) && !disabled && (
          <button
            type="button"
            onClick={() => { setQuery(''); onClear(); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filtered.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onSelect(item); setQuery(displayValue || ''); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition border-b border-gray-50 last:border-0 text-sm ${
                value === item.id ? 'bg-blue-50' : ''
              }`}
            >
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg">
          <p className="px-3 py-3 text-xs text-gray-400 text-center">
            Sin resultados para "{query}"
          </p>
        </div>
      )}
    </div>
  );
}