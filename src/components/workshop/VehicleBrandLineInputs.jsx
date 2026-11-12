import { useEffect, useId, useMemo, useState } from 'react';
import { vehiclesApi } from '../../api/workshop';

// Marca y línea del vehículo con sugerencias del catálogo global (marcas y
// líneas del mercado colombiano) según el tipo de vehículo. Son sugerencias:
// se puede escribir cualquier marca o línea que no esté en la lista.
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

const norm = (s) => String(s || '').trim().toUpperCase();

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
  const id = useId();
  const catalog = useVehicleCatalog(vehicleType);
  const lines = useMemo(() => catalog.find((b) => b.brand === norm(brand))?.lines || [], [catalog, brand]);

  return (
    <div className={layoutClassName}>
      <div>
        {brandLabel && <label className={labelClassName}>{brandLabel}</label>}
        <input
          value={brand || ''}
          list={`${id}-brands`}
          placeholder={brandPlaceholder}
          autoComplete="off"
          className={inputClassName}
          onChange={(e) => onBrandChange(e.target.value)}
          // Al elegir de la lista queda con la ortografía del catálogo.
          onBlur={(e) => {
            const hit = catalog.find((b) => b.brand === norm(e.target.value));
            if (hit && hit.brand !== e.target.value) onBrandChange(hit.brand);
          }}
        />
        <datalist id={`${id}-brands`}>
          {catalog.map((b) => <option key={b.brand} value={b.brand} />)}
        </datalist>
      </div>
      <div>
        {lineLabel && <label className={labelClassName}>{lineLabel}</label>}
        <input
          value={line || ''}
          list={`${id}-lines`}
          placeholder={linePlaceholder}
          autoComplete="off"
          className={inputClassName}
          onChange={(e) => onLineChange(e.target.value)}
          onBlur={(e) => {
            const hit = lines.find((l) => l === norm(e.target.value));
            if (hit && hit !== e.target.value) onLineChange(hit);
          }}
        />
        <datalist id={`${id}-lines`}>
          {lines.map((l) => <option key={l} value={l} />)}
        </datalist>
      </div>
    </div>
  );
}
