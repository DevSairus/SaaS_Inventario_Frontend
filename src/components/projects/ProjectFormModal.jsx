import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import CustomerSearchInput from '../common/CustomerSearchInput';
import NumericInput from '../inputs/NumericInput';
import { usersAPI } from '../../api/users';
import { createProject, updateProject } from '../../api/projects';
import { invalidateProjectOptions } from './ProjectSelect';
import { PROJECT_TYPES, userName } from './projectConstants';

const empty = {
  name: '', customer_id: null, type: 'ongrid', status: 'prospect', city: '', site_address: '',
  capacity_kwp: '', contract_amount: '', start_date: '', end_date_planned: '', manager_id: '', notes: '',
  create_warehouse: true,
  alert_warning_pct: 80,
  alert_critical_pct: 100,
  retention_pct: 0,
};

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800';
const Label = ({ children }) => <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>;

/**
 * Alta y edición de un proyecto. project = null → nuevo.
 */
export default function ProjectFormModal({ isOpen, onClose, project = null, onSaved }) {
  const [form, setForm] = useState(empty);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(project);

  useEffect(() => {
    if (!isOpen) return;
    setForm(project ? {
      ...empty,
      ...Object.fromEntries(Object.keys(empty).map((k) => [k, project[k] ?? empty[k]])),
      capacity_kwp: project.capacity_kwp ?? '',
      contract_amount: project.contract_amount ?? '',
      manager_id: project.manager_id || '',
    } : empty);
    if (!users.length) {
      usersAPI.getAll({ limit: 200, is_active: true, has_system_access: true })
        .then((r) => setUsers(r.data?.users || []))
        .catch(() => setUsers([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, project]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast('Escribe el nombre del proyecto'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        capacity_kwp: form.capacity_kwp === '' ? null : Number(form.capacity_kwp),
        contract_amount: form.contract_amount === '' ? null : Number(form.contract_amount),
        alert_warning_pct: Number(form.alert_warning_pct) || 80,
        alert_critical_pct: Number(form.alert_critical_pct) || 100,
        retention_pct: Number(form.retention_pct) || 0,
        manager_id: form.manager_id || null,
      };
      const res = isEdit ? await updateProject(project.id, payload) : await createProject(payload);
      invalidateProjectOptions();
      toast.success(res.message || 'Proyecto guardado');
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo guardar el proyecto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? `Editar ${project.code}` : 'Nuevo proyecto'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Nombre del proyecto *</Label>
          <input value={form.name} onChange={set('name')} className={inputCls} placeholder="Ej. Sistema solar 50 kWp - Finca El Roble" autoFocus />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Cliente</Label>
            <CustomerSearchInput
              customers={project?.customer ? [project.customer] : []}
              value={form.customer_id}
              onChange={(id) => setForm((f) => ({ ...f, customer_id: id || null }))}
              placeholder="Buscar cliente por nombre o NIT..."
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <select value={form.type} onChange={set('type')} className={inputCls}>
              {Object.entries(PROJECT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Valor del contrato (antes de IVA)</Label>
            <NumericInput value={form.contract_amount} onChange={set('contract_amount')} className={inputCls} placeholder="0" />
          </div>
          <div>
            <Label>Capacidad (kWp)</Label>
            <input type="number" min="0" step="0.001" value={form.capacity_kwp} onChange={set('capacity_kwp')} className={inputCls} />
          </div>
          <div>
            <Label>Responsable</Label>
            <select value={form.manager_id} onChange={set('manager_id')} className={inputCls}>
              <option value="">— Sin asignar —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{userName(u)}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Ciudad</Label>
            <input value={form.city || ''} onChange={set('city')} className={inputCls} />
          </div>
          <div>
            <Label>Dirección de la obra</Label>
            <input value={form.site_address || ''} onChange={set('site_address')} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Fecha de inicio</Label>
            <input type="date" value={form.start_date || ''} onChange={set('start_date')} className={inputCls} />
          </div>
          <div>
            <Label>Fecha de entrega planeada</Label>
            <input type="date" value={form.end_date_planned || ''} onChange={set('end_date_planned')} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Retención de garantía (%)</Label>
            <input type="number" min="0" max="30" step="0.5" value={form.retention_pct} onChange={set('retention_pct')} className={inputCls} />
            <p className="text-xs text-gray-500 mt-1">De cada factura parcial, antes de IVA; se cobra a la entrega.</p>
          </div>
          <div>
            <Label>Avisar al llegar al (% del presupuesto)</Label>
            <input type="number" min="1" max="500" value={form.alert_warning_pct} onChange={set('alert_warning_pct')} className={inputCls} />
          </div>
          <div>
            <Label>Sobrecosto desde (% del presupuesto)</Label>
            <input type="number" min="1" max="500" value={form.alert_critical_pct} onChange={set('alert_critical_pct')} className={inputCls} />
          </div>
        </div>

        <div>
          <Label>Notas</Label>
          <textarea rows={2} value={form.notes || ''} onChange={set('notes')} className={inputCls} />
        </div>

        {!isEdit && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-1/2">
              <Label>Estado inicial</Label>
              <select value={form.status} onChange={set('status')} className={inputCls}>
                <option value="prospect">Prospecto</option>
                <option value="quoted">Cotizado</option>
                <option value="approved">Aprobado</option>
              </select>
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 sm:pt-7">
              <input type="checkbox" checked={form.create_warehouse} onChange={set('create_warehouse')} className="mt-0.5" />
              <span>Crear la bodega de la obra (para despachar materiales y medir su costo)</span>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
            {saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear proyecto')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
