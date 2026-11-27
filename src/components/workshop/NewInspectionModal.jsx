// frontend/src/components/workshop/NewInspectionModal.jsx
// Crear un peritaje: vehículo, quién lo pide y para qué, plantilla.
// El solicitante puede ser distinto del propietario (comprador, financiera…).
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search, X, Car, ShieldCheck } from 'lucide-react';
import Modal from '../common/Modal';
import CustomerSearchInput from '../common/CustomerSearchInput';
import NumericInput from '../inputs/NumericInput';
import { vehiclesApi, inspectionsApi } from '../../api/workshop';
import { REQUESTER_TYPES, PURPOSES } from '../../constants/inspection';
import { VEHICLE_TYPE_LABELS, defaultVehicleType } from '../../constants/vehicleTypes';
import NewVehicleInlineForm, { emptyNewVehicle, newVehicleFromRunt, runtExtrasText } from './NewVehicleInlineForm';
import RuntConsultaModal from './RuntConsultaModal';
import useTenantStore from '../../store/tenantStore';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const labelCls = 'block text-xs text-gray-500 mb-1';
const ownerName = (c) => (c ? (c.business_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()) : null);

export default function NewInspectionModal({ presetVehicleId, workOrderId, onClose, onCreated }) {
  const [vehicle, setVehicle] = useState(null);
  const [plateQuery, setPlateQuery] = useState('');
  const [results, setResults] = useState([]);
  const [templates, setTemplates] = useState({ own: [], builtin: [] });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    requester_type: 'comprador', purpose: 'compraventa', requester_customer_id: '',
    requester_name: '', requester_document: '', requester_phone: '', requester_email: '',
    template_id: '', mileage: '', price: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Registrar el vehículo aquí mismo (mismo formulario que la orden de trabajo).
  const configuredTypes = useTenantStore((s) => s.vehicleTypes);
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState(() => emptyNewVehicle(defaultVehicleType(configuredTypes)));
  const [newOwnerId, setNewOwnerId] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [showRunt, setShowRunt] = useState(false);
  // Resultado del RUNT que aún no tiene vehículo (se guarda al crearlo) y
  // consulta ya guardada que se asocia al peritaje.
  const [pendingRunt, setPendingRunt] = useState(null);
  const [runtSnapshotId, setRuntSnapshotId] = useState(null);

  useEffect(() => {
    inspectionsApi.listTemplates().then((r) => setTemplates(r.data.data)).catch(() => {});
    if (presetVehicleId) {
      vehiclesApi.getById(presetVehicleId).then((r) => pickVehicle(r.data.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetVehicleId]);

  useEffect(() => {
    if (vehicle || plateQuery.trim().length < 2) { setResults([]); return undefined; }
    const t = setTimeout(() => {
      vehiclesApi.list({ search: plateQuery.trim(), limit: 8 }).then((r) => setResults(r.data.data || [])).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [plateQuery, vehicle]);

  function pickVehicle(v) {
    setVehicle(v);
    setResults([]);
    setShowNewVehicle(false);
    setForm((f) => ({ ...f, mileage: v.current_mileage ?? '' }));
  }

  const clearVehicle = () => {
    setVehicle(null); setPlateQuery(''); setRuntSnapshotId(null); setPendingRunt(null);
  };

  const openNewVehicle = () => {
    setShowNewVehicle((open) => !open);
    const typed = plateQuery.trim().toUpperCase();
    if (typed && !newVehicle.plate) setNewVehicle((p) => ({ ...p, plate: typed }));
  };

  const saveRunt = async (vehicleId, data) => {
    try {
      const r = await vehiclesApi.saveRuntSnapshot(vehicleId, data);
      setRuntSnapshotId(r.data.data.id);
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar la consulta RUNT');
      return false;
    }
  };

  const handleCreateVehicle = async () => {
    if (!newVehicle.plate) return toast.error('La placa es requerida');
    setSavingVehicle(true);
    try {
      const res = await vehiclesApi.create({ ...newVehicle, customer_id: newOwnerId || null });
      const created = res.data.data;
      pickVehicle(created);
      setNewVehicle(emptyNewVehicle(defaultVehicleType(configuredTypes)));
      setNewOwnerId('');
      // La consulta RUNT con que se llenó el formulario queda en la hoja de vida y en el peritaje.
      const norm = (x) => String(x || '').replace(/[\s-]/g, '').toUpperCase();
      if (pendingRunt && norm(pendingRunt.plate) === norm(created.plate)) await saveRunt(created.id, pendingRunt);
      setPendingRunt(null);
      toast.success('Vehículo registrado');
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo registrar el vehículo');
    } finally {
      setSavingVehicle(false);
    }
  };

  // Mismo criterio que la OT: con vehículo elegido, el RUNT completa su ficha
  // (aquí solo los campos vacíos, para no pisar lo que ya está registrado);
  // sin vehículo, llena el formulario de nuevo vehículo.
  const handleRuntConfirm = async (data) => {
    setShowRunt(false);
    const extras = runtExtrasText(data);
    if (vehicle) {
      const patch = {};
      for (const k of ['brand', 'model', 'year', 'color', 'engine_number', 'vin', 'soat_number', 'soat_expiry', 'tecnomecanica_number', 'tecnomecanica_expiry']) {
        if (data[k] && !vehicle[k]) patch[k] = data[k];
      }
      try {
        if (Object.keys(patch).length) {
          await vehiclesApi.update(vehicle.id, { ...vehicle, ...patch, customer_id: vehicle.customer_id || null });
          setVehicle((v) => ({ ...v, ...patch }));
        }
        if (await saveRunt(vehicle.id, data)) {
          toast.success(Object.keys(patch).length ? 'Consulta RUNT guardada; se completaron los datos que faltaban del vehículo' : 'Consulta RUNT guardada y asociada al peritaje');
        }
      } catch (e) {
        toast.error(e.response?.data?.message || 'No se pudo actualizar el vehículo');
      }
    } else {
      setNewVehicle(newVehicleFromRunt(data));
      setPendingRunt(data);
      setShowNewVehicle(true);
      toast.success(extras ? `Datos RUNT cargados — incluye ${extras}. Revisa y guarda` : 'Datos cargados desde el RUNT — revisa y guarda');
    }
  };

  const isOwner = form.requester_type === 'propietario';
  const allTemplates = [...templates.own, ...templates.builtin];
  const autoTemplate = vehicle
    ? (templates.own.find((t) => (t.vehicle_types || []).includes(vehicle.vehicle_type))
      || templates.builtin.find((t) => (t.vehicle_types || []).includes(vehicle.vehicle_type))
      || templates.builtin[0])
    : null;

  const submit = async () => {
    if (!vehicle) return toast.error('Selecciona el vehículo');
    if (!isOwner && !form.requester_customer_id && !form.requester_name.trim()) return toast.error('Indica quién solicita el peritaje');
    setSaving(true);
    try {
      const payload = {
        vehicle_id: vehicle.id,
        requester_type: form.requester_type,
        purpose: form.purpose,
        template_id: form.template_id || undefined,
        mileage: form.mileage === '' ? undefined : form.mileage,
        price: form.price === '' ? undefined : form.price,
        work_order_id: workOrderId || undefined,
        runt_snapshot_id: runtSnapshotId || undefined,
      };
      if (!isOwner) {
        Object.assign(payload, {
          requester_customer_id: form.requester_customer_id || null,
          requester_name: form.requester_name, requester_document: form.requester_document,
          requester_phone: form.requester_phone, requester_email: form.requester_email,
        });
      }
      const r = await inspectionsApi.create(payload);
      toast.success(`Peritaje ${r.data.data.number} creado`);
      onCreated(r.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo crear el peritaje');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Nuevo peritaje" size="lg">
      <div className="space-y-4">
        {/* Vehículo */}
        <div>
          <label className={labelCls}>Vehículo *</label>
          {vehicle ? (
            <div className="flex items-center justify-between gap-3 border border-blue-200 bg-blue-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-3">
                <Car size={18} className="text-blue-600" />
                <div>
                  <p className="font-mono font-bold text-gray-900">{vehicle.plate}</p>
                  <p className="text-xs text-gray-600">
                    {[
                      [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' '),
                      VEHICLE_TYPE_LABELS[vehicle.vehicle_type],
                      vehicle.customer ? `Propietario: ${ownerName(vehicle.customer)}` : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              {!presetVehicleId && (
                <button onClick={clearVehicle} className="p-1 text-gray-500 hover:text-gray-800" aria-label="Cambiar vehículo"><X size={16} /></button>
              )}
            </div>
          ) : (
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus value={plateQuery} onChange={(e) => setPlateQuery(e.target.value.toUpperCase())} placeholder="Buscar por placa, marca o línea…" className={`${inputCls} pl-9`} />
              {results.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {results.map((v) => (
                    <button key={v.id} type="button" onClick={() => pickVehicle(v)} className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-50 last:border-0">
                      <span className="font-mono font-bold text-sm">{v.plate}</span>
                      <span className="text-xs text-gray-500 ml-2">{[v.brand, v.model, v.year].filter(Boolean).join(' ')}{v.customer ? ` · ${ownerName(v.customer)}` : ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {vehicle && runtSnapshotId && (
            <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1"><ShieldCheck size={12} /> Consulta RUNT guardada: queda asociada al peritaje.</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {!vehicle && (
              <button type="button" onClick={openNewVehicle}
                className="flex-1 min-w-[180px] border border-dashed border-blue-300 text-blue-600 text-sm py-2 rounded-lg hover:bg-blue-50 transition">
                + Registrar nuevo vehículo
              </button>
            )}
            <button type="button" onClick={() => setShowRunt(true)} title="Consultar datos en el RUNT"
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 border border-orange-200 text-orange-600 text-sm rounded-lg hover:bg-orange-100 transition whitespace-nowrap">
              <Search size={15} /> Consultar RUNT
            </button>
          </div>
          {!vehicle && showNewVehicle && (
            <div className="mt-3">
              <NewVehicleInlineForm value={newVehicle} onChange={setNewVehicle} inputCls={inputCls} saving={savingVehicle}
                onSave={handleCreateVehicle} onClose={() => setShowNewVehicle(false)}>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Propietario (opcional)</label>
                  <CustomerSearchInput value={newOwnerId} onChange={(id) => setNewOwnerId(id || '')} placeholder="Buscar cliente…" />
                </div>
              </NewVehicleInlineForm>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>¿Quién lo solicita?</label>
            <select value={form.requester_type} onChange={(e) => set('requester_type', e.target.value)} className={inputCls}>
              {Object.entries(REQUESTER_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Propósito</label>
            <select value={form.purpose} onChange={(e) => set('purpose', e.target.value)} className={inputCls}>
              {Object.entries(PURPOSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        </div>

        {isOwner ? (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            {vehicle?.customer ? <>El solicitante será el propietario registrado: <b>{ownerName(vehicle.customer)}</b>.</> : 'El vehículo no tiene propietario registrado; puedes asignarlo en su ficha.'}
          </p>
        ) : (
          <div className="border border-gray-100 rounded-lg p-3 space-y-3">
            <div>
              <label className={labelCls}>Cliente registrado (opcional)</label>
              <CustomerSearchInput value={form.requester_customer_id} onChange={(id) => set('requester_customer_id', id || '')} placeholder="Buscar cliente…" />
              <p className="text-[11px] text-gray-400 mt-1">Si no está registrado, escribe sus datos abajo. Sirve para facturar el peritaje.</p>
            </div>
            {!form.requester_customer_id && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Nombre / razón social *</label><input value={form.requester_name} onChange={(e) => set('requester_name', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Documento</label><input value={form.requester_document} onChange={(e) => set('requester_document', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Teléfono</label><input value={form.requester_phone} onChange={(e) => set('requester_phone', e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Correo</label><input type="email" value={form.requester_email} onChange={(e) => set('requester_email', e.target.value)} className={inputCls} /></div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className={labelCls}>Plantilla</label>
            <select value={form.template_id} onChange={(e) => set('template_id', e.target.value)} className={inputCls}>
              <option value="">Automática{autoTemplate ? ` (${autoTemplate.name})` : ''}</option>
              {allTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.builtin ? ' · Pitbox' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{vehicle?.meter_unit === 'h' ? 'Horómetro (h)' : 'Kilometraje'}</label>
            <NumericInput value={form.mileage} onChange={(e) => set('mileage', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Valor del peritaje</label>
            <NumericInput value={form.price} onChange={(e) => set('price', e.target.value)} className={inputCls} placeholder="Opcional" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={submit} disabled={saving || !vehicle} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Creando…' : 'Crear y diligenciar'}
          </button>
        </div>
      </div>
      {showRunt && (
        <RuntConsultaModal
          placa={vehicle ? vehicle.plate : (newVehicle.plate || plateQuery)}
          onConfirm={handleRuntConfirm}
          onClose={() => setShowRunt(false)}
        />
      )}
    </Modal>
  );
}
