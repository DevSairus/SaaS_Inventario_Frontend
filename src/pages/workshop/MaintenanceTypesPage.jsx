// frontend/src/pages/workshop/MaintenanceTypesPage.jsx
// "Taller > Mantenimientos": intervalos de mantenimiento por tipo de
// vehículo (ej. Cambio de aceite cada 5.000 km o 6 meses para automóvil).
// Al entregar una OT con un ítem que contenga alguna de las palabras clave,
// se registra solo el servicio y se calcula el próximo -- ver
// plan-portal-mantenimiento-vehiculo.md.
import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import { maintenanceTypesApi } from '../../api/workshop';
import { VEHICLE_TYPE_LABELS, fmtKm } from '../../components/workshop/maintenanceStatus';
import { CalendarClock, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white';
const EMPTY_FORM = { name: '', vehicle_type: 'automovil', interval_km: '', interval_months: '', match_keywords: '' };

export default function MaintenanceTypesPage() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicleType, setVehicleType] = useState('automovil');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await maintenanceTypesApi.list();
      setTypes(res.data.data || []);
    } catch {
      toast.error('Error al cargar los tipos de mantenimiento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, vehicle_type: vehicleType });
    setShowModal(true);
  };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name,
      vehicle_type: t.vehicle_type,
      interval_km: t.interval_km || '',
      interval_months: t.interval_months || '',
      match_keywords: (t.match_keywords || []).join(', '),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('El nombre es requerido');
    if (!form.interval_km && !form.interval_months) return toast.error('Indica un intervalo en km, en meses o ambos');
    if (!form.match_keywords.trim()) return toast.error('Indica al menos una palabra clave');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        vehicle_type: form.vehicle_type,
        interval_km: form.interval_km || null,
        interval_months: form.interval_months || null,
        match_keywords: form.match_keywords,
      };
      if (editing) await maintenanceTypesApi.update(editing.id, payload);
      else await maintenanceTypesApi.create(payload);
      toast.success(editing ? 'Mantenimiento actualizado' : 'Mantenimiento creado');
      setShowModal(false);
      setVehicleType(form.vehicle_type);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`¿Eliminar "${t.name}" (${VEHICLE_TYPE_LABELS[t.vehicle_type]})? El historial ya registrado se conserva.`)) return;
    try {
      await maintenanceTypesApi.remove(t.id);
      toast.success('Mantenimiento eliminado');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al eliminar');
    }
  };

  const countByType = types.reduce((acc, t) => ({ ...acc, [t.vehicle_type]: (acc[t.vehicle_type] || 0) + 1 }), {});
  const visible = types.filter(t => t.vehicle_type === vehicleType);

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarClock size={20} className="text-emerald-600" /> Mantenimientos
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Intervalos por tipo de vehículo. Al entregar una OT con un ítem que contenga alguna palabra clave,
              el servicio queda registrado y se calcula el próximo. El cliente lo consulta escaneando el sticker QR.
            </p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shrink-0">
            <Plus size={15} /> Nuevo
          </button>
        </div>

        {/* Tabs por tipo de vehículo */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(VEHICLE_TYPE_LABELS).map(([k, label]) => (
            <button key={k} onClick={() => setVehicleType(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                vehicleType === k ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              {label}
              {countByType[k] ? <span className="ml-1.5 text-xs opacity-70">{countByType[k]}</span> : null}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : visible.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No hay mantenimientos configurados para {VEHICLE_TYPE_LABELS[vehicleType].toLowerCase()}.</p>
              <button onClick={openCreate} className="mt-2 text-sm text-emerald-600 hover:underline">+ Agregar el primero</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {visible.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-500">
                      Cada {[fmtKm(t.interval_km), t.interval_months ? `${t.interval_months} mes${t.interval_months === 1 ? '' : 'es'}` : null].filter(Boolean).join(' o ')}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(t.match_keywords || []).map(k => (
                        <span key={k} className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{k}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(t)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(t)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !saving && setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{editing ? 'Editar mantenimiento' : 'Nuevo mantenimiento'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre</label>
              <input value={form.name} placeholder="Cambio de aceite" className={inputCls}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo de vehículo</label>
              <select value={form.vehicle_type} className={inputCls}
                onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}>
                {Object.entries(VEHICLE_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cada (km)</label>
                <input type="number" min="1" value={form.interval_km} placeholder="5000" className={inputCls}
                  onChange={e => setForm(f => ({ ...f, interval_km: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cada (meses)</label>
                <input type="number" min="1" value={form.interval_months} placeholder="6" className={inputCls}
                  onChange={e => setForm(f => ({ ...f, interval_months: e.target.value }))} />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 -mt-2">Puedes dejar uno vacío. Si pones ambos, vence lo que ocurra primero.</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Palabras clave (separadas por coma)</label>
              <input value={form.match_keywords} placeholder="aceite, lubricante" className={inputCls}
                onChange={e => setForm(f => ({ ...f, match_keywords: e.target.value }))} />
              <p className="text-[11px] text-gray-400 mt-1">
                Si el nombre de un repuesto o servicio de la OT contiene alguna, se registra este mantenimiento al entregarla.
              </p>
            </div>
            {editing && (
              <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">
                Cambiar el intervalo aplica desde el próximo servicio; no modifica los ya registrados.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowModal(false)} disabled={saving}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
