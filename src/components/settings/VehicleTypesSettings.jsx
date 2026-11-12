// Configuración → Taller: tipos de vehículo que atiende la empresa. Filtra el
// tipo y el catálogo de marcas/líneas al crear vehículos (un taller de motos
// no ve autos y viceversa). Se guarda en business_config.vehicle_types con
// el botón "Guardar Cambios" de la página; vacío = todos.
import Card from '../common/Card';
import { VEHICLE_TYPE_OPTIONS, VEHICLE_TYPE_PRESETS, VEHICLE_TYPES } from '../../constants/vehicleTypes';

export default function VehicleTypesSettings({ businessConfig, onChange }) {
  const configured = Array.isArray(businessConfig?.vehicle_types) ? businessConfig.vehicle_types : [];
  const selected = configured.length ? configured : VEHICLE_TYPES;
  const same = (a, b) => a.length === b.length && a.every((t) => b.includes(t));

  const toggle = (value) => {
    const next = selected.includes(value) ? selected.filter((t) => t !== value) : [...selected, value];
    if (!next.some((t) => t !== 'otro')) return; // al menos un tipo real
    onChange(VEHICLE_TYPES.filter((t) => next.includes(t)));
  };

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-1">Tipos de vehículo que atiende</h2>
        <p className="text-sm text-gray-500 mb-4">
          Define el tipo de establecimiento: al registrar un vehículo solo se ofrecen estos tipos y
          las marcas y líneas que les corresponden (un taller de motos no ve automóviles y viceversa).
          Los vehículos ya registrados no cambian.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {VEHICLE_TYPE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(p.types)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${same(selected, p.types)
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {VEHICLE_TYPE_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                disabled={o.value === 'otro'}
                onChange={() => toggle(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">"Otro" siempre queda disponible para casos especiales.</p>
      </div>
    </Card>
  );
}
