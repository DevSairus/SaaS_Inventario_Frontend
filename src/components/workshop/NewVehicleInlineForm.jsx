// frontend/src/components/workshop/NewVehicleInlineForm.jsx
// Formulario corto de "Nuevo vehículo" dentro de otro formulario (orden de
// trabajo, nuevo peritaje). Es controlado: el estado vive en quien lo usa,
// así la OT lo puede guardar en su borrador. `newVehicleFromRunt` pasa el
// resultado de RuntConsultaModal al formato del formulario.
import { Save, X } from 'lucide-react';
import VehicleBrandLineInputs from './VehicleBrandLineInputs';
import useTenantStore from '../../store/tenantStore';
import { vehicleTypeOptionsFor } from '../../constants/vehicleTypes';

export const emptyNewVehicle = (vehicleType = 'automovil') => ({
  plate: '', brand: '', model: '', year: '', color: '', vehicle_type: vehicleType, fuel_type: 'gasolina',
  engine_number: '', vin: '', soat_number: '', soat_expiry: '', tecnomecanica_number: '', tecnomecanica_expiry: '',
});

export const newVehicleFromRunt = (data) => ({
  plate: data.plate || '',
  brand: data.brand || '',
  model: data.model || '',
  year: data.year || '',
  color: data.color || '',
  vehicle_type: data.vehicle_type || 'automovil',
  fuel_type: data.fuel_type || 'gasolina',
  engine_number: data.engine_number || '',
  vin: data.vin || '',
  soat_number: data.soat_number || '',
  soat_expiry: data.soat_expiry || '',
  tecnomecanica_number: data.tecnomecanica_number || '',
  tecnomecanica_expiry: data.tecnomecanica_expiry || '',
});

/** Texto del aviso tras cargar datos del RUNT ("incluye SOAT y Tecnomecánica"). */
export const runtExtrasText = (data) => [data.soat_number && 'SOAT', data.tecnomecanica_number && 'Tecnomecánica'].filter(Boolean).join(' y ');

export default function NewVehicleInlineForm({ value, onChange, onSave, onClose, saving = false, inputCls, children }) {
  const configuredTypes = useTenantStore((s) => s.vehicleTypes);
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-blue-700">Nuevo vehículo</p>
        <button type="button" onClick={onClose} aria-label="Cerrar"><X size={13} className="text-blue-400" /></button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Placa *</label>
          <input value={value.plate} placeholder="Placa *" className={inputCls}
            onChange={(e) => set('plate', e.target.value.toUpperCase())} />
        </div>
        <VehicleBrandLineInputs
          vehicleType={value.vehicle_type}
          brand={value.brand}
          line={value.model}
          onBrandChange={(v) => set('brand', v)}
          onLineChange={(v) => set('model', v)}
          inputClassName={inputCls}
        />
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Año</label>
          <input type="number" value={value.year} placeholder="2020" className={inputCls}
            onChange={(e) => set('year', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Color</label>
          <input value={value.color} placeholder="Blanco" className={inputCls}
            onChange={(e) => set('color', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Tipo</label>
          <select value={value.vehicle_type} className={inputCls}
            onChange={(e) => set('vehicle_type', e.target.value)}>
            {vehicleTypeOptionsFor(configuredTypes, value.vehicle_type).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Combustible</label>
          <select value={value.fuel_type} className={inputCls}
            onChange={(e) => set('fuel_type', e.target.value)}>
            {['gasolina', 'diesel', 'gas', 'hibrido', 'electrico', 'otro'].map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>
      {children}
      <button type="button" onClick={onSave} disabled={saving}
        className="flex items-center gap-1.5 bg-blue-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
        <Save size={12} /> {saving ? 'Guardando…' : 'Guardar vehículo'}
      </button>
    </div>
  );
}
