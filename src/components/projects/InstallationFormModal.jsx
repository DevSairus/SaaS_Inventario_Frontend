import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import CustomerSearchInput from '../common/CustomerSearchInput';
import { createMaintenanceInstallation, updateMaintenanceInstallation } from '../../api/projects';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800';
const today = () => new Date().toLocaleDateString('en-CA');
const FREQ = [[1, 'Mensual'], [2, 'Bimestral'], [3, 'Trimestral'], [6, 'Semestral'], [12, 'Anual'], [24, 'Cada 2 años']];
const EMPTY = { customer_id: '', name: '', system_type: '', capacity: '', site_address: '', city: '', installed_at: '', notes: '' };
const EMPTY_PLAN = { enabled: true, name: 'Mantenimiento preventivo', frequency_months: '6', start_date: today(), tasks: '', alert_days_before: '15' };

/**
 * Alta o edición de una instalación (sistema de un cliente) para
 * mantenimiento, sin proyecto de Pitbox. En el alta se puede crear de una
 * vez el primer plan con su primera visita.
 */
export default function InstallationFormModal({ isOpen, installation = null, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [plan, setPlan] = useState(EMPTY_PLAN);
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(installation?.id);

  useEffect(() => {
    if (!isOpen) return;
    setForm(isEdit ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, installation[k] ?? ''])) : EMPTY);
    setPlan({ ...EMPTY_PLAN, start_date: today() });
  }, [isOpen, installation, isEdit]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setP = (k) => (e) => setPlan((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async () => {
    if (!form.customer_id) { toast('Elige el cliente'); return; }
    setBusy(true);
    try {
      const body = { ...form, installed_at: form.installed_at || null };
      if (!isEdit && plan.enabled) {
        body.plan = {
          name: plan.name, frequency_months: Number(plan.frequency_months), start_date: plan.start_date,
          tasks: plan.tasks.split('\n'), alert_days_before: Number(plan.alert_days_before),
        };
      }
      const r = isEdit ? await updateMaintenanceInstallation(installation.id, body) : await createMaintenanceInstallation(body);
      toast.success(r.message);
      onSaved?.(r.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar la instalación');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar instalación' : 'Nueva instalación'} size="lg">
      <div className="space-y-4">
        {!isEdit && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Para sistemas instalados antes de usar Pitbox (o sin proyecto). Si son muchos, usa "Importar desde Excel".
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Cliente *</label>
            <CustomerSearchInput
              customers={installation?.customer ? [installation.customer] : []}
              value={form.customer_id}
              onChange={(id) => setForm((f) => ({ ...f, customer_id: id || '' }))}
              placeholder="Buscar cliente por nombre o NIT..."
            />
          </div>
          <div><label className="block text-sm font-medium mb-1">Nombre del sistema *</label><input value={form.name} onChange={set('name')} className={inputCls} placeholder="Ej. Sistema solar 10 kWp - Finca El Roble" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Tipo de sistema</label><input value={form.system_type} onChange={set('system_type')} className={inputCls} placeholder="Ej. Solar on-grid" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Capacidad</label><input value={form.capacity} onChange={set('capacity')} className={inputCls} placeholder="Ej. 10 kWp" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Dirección</label><input value={form.site_address} onChange={set('site_address')} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Ciudad</label><input value={form.city} onChange={set('city')} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Fecha de instalación</label><input type="date" value={form.installed_at || ''} onChange={set('installed_at')} className={inputCls} /></div>
        </div>
        <div><label className="block text-xs text-gray-500 mb-1">Notas</label><textarea rows={2} value={form.notes} onChange={set('notes')} className={inputCls} /></div>

        {!isEdit && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={plan.enabled} onChange={setP('enabled')} /> Crear de una vez el plan de mantenimiento
            </label>
            {plan.enabled && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2"><label className="block text-xs text-gray-500 mb-1">Plan</label><input value={plan.name} onChange={setP('name')} className={inputCls} /></div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Frecuencia</label>
                    <select value={plan.frequency_months} onChange={setP('frequency_months')} className={inputCls}>
                      {FREQ.map(([m, l]) => <option key={m} value={m}>{l}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Próxima visita</label><input type="date" value={plan.start_date} onChange={setP('start_date')} className={inputCls} /></div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tareas (una por línea) *</label>
                  <textarea rows={4} value={plan.tasks} onChange={setP('tasks')} className={inputCls} placeholder={'Limpieza de paneles\nRevisión de conexiones y torque de bornes\nLectura de producción del inversor'} />
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">Cancelar</button>
          <button type="button" onClick={save} disabled={busy} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
            {busy ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear instalación'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
