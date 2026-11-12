import { useEffect, useMemo, useRef, useState } from 'react';
import { vehiclesApi } from '../../api/workshop';

// Marca y línea del vehículo con sugerencias del catálogo global (marcas y
// líneas del mercado colombiano) según el tipo de vehículo. Son sugerencias:
// se puede escribir cualquier marca o línea que no esté en la lista.
// La búsqueda ignora mayúsculas, tildes, espacios y guiones ("can am" encuentra
// CAN-AM), cosa que un <datalist> del navegador no hace.
const cache = new Map(); // tipo -> Promise<[{ brand, lines }]>

function loadCatalog(vehicleType) {
  if (!vehicleType || vehicleType === 'otro') return Promise.resolve([]);
  if (!cache.has(vehicleType)) {
    cache.set(vehicleType, vehiclesApi.catalog(vehicleType)
      .then((r) => r.data.data || [])
      .catch(() => { cache.delete(vehicleType); return []; }));
  }
  return cache.get(vehicleType);
}

export function useVehicleCatalog(vehicleType) {
  const [catalog, setCatalog] = useState([]);
  useEffect(() => {
    let alive = true;
    loadCatalog(vehicleType).then((data) => { if (alive) setCatalog(data); });
    return () => { alive = false; };
  }, [vehicleType]);
  return catalog;
}

const key = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const MAX_OPTIONS = 60;

// Campo de texto libre con lista de sugerencias filtrada.
function SuggestInput({ value, onChange, options, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  const filtered = useMemo(() => {
    const q = key(value);
    if (!q) return options.slice(0, MAX_OPTIONS);
    const starts = [];
    const contains = [];
    for (const o of options) {
      const k = key(o);
      if (k === q && o === value) continue; // ya está elegida
      if (k.startsWith(q)) starts.push(o);
      else if (k.includes(q)) contains.push(o);
      if (starts.length >= MAX_OPTIONS) break;
    }
    return [...starts, ...contains].slice(0, MAX_OPTIONS);
  }, [value, options]);

  useEffect(() => { setActive(0); }, [value]);

  const pick = (o) => { onChange(o); setOpen(false); };

  return (
    <div className="relative" ref={boxRef}>
      <input
        value={value || ''}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        // El clic en una opción usa onMouseDown, que llega antes que este blur.
        onBlur={() => {
          setOpen(false);
          const hit = options.find((o) => key(o) === key(value));
          if (hit && hit !== value) onChange(hit); // queda con la ortografía del catálogo
        }}
        onKeyDown={(e) => {
          if (!open || !filtered.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); pick(filtered[active]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-white/10 dark:bg-graphite">
          {filtered.map((o, i) => (
            <li
              key={o}
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-1.5 ${i === active ? 'bg-blue-50 text-blue-700 dark:bg-white/10 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Props: vehicleType, brand, line, onBrandChange(v), onLineChange(v),
 * inputClassName, labelClassName, brandLabel, lineLabel, layoutClassName.
 */
export default function VehicleBrandLineInputs({
  vehicleType, brand, line, onBrandChange, onLineChange,
  inputClassName = '', labelClassName = 'text-xs text-gray-500 block mb-0.5',
  brandLabel = 'Marca', lineLabel = 'Línea', layoutClassName = 'contents',
  brandPlaceholder = 'Marca', linePlaceholder = 'Línea',
}) {
  const catalog = useVehicleCatalog(vehicleType);
  const brands = useMemo(() => catalog.map((b) => b.brand), [catalog]);
  const lines = useMemo(() => catalog.find((b) => key(b.brand) === key(brand))?.lines || [], [catalog, brand]);

  return (
    <div className={layoutClassName}>
      <div>
        {brandLabel && <label className={labelClassName}>{brandLabel}</label>}
        <SuggestInput value={brand} onChange={onBrandChange} options={brands}
          placeholder={brandPlaceholder} className={inputClassName} />
      </div>
      <div>
        {lineLabel && <label className={labelClassName}>{lineLabel}</label>}
        <SuggestInput value={line} onChange={onLineChange} options={lines}
          placeholder={linePlaceholder} className={inputClassName} />
      </div>
    </div>
  );
}
