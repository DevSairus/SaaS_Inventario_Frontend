import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Combobox from '../common/Combobox';
import NumericInput from '../inputs/NumericInput';
import { suppliersAPI } from '../../api/suppliers';
import { createTool, updateTool, getToolFixedAssets } from '../../api/tools';
import { formatCurrency } from '../../utils/formatters';
import { COST_MODES, inputCls } from './toolConstants';

const empty = {
  name: '', category: '', brand: '', model: '', serial_number: '', tracking: 'individual', quantity_total: 1,
  cost_mode: 'zero', acquisition_cost: '', acquisition_date: '', acquisition_reference: '', supplier_id: null,
  fixed_asset_id: '', usage_rate_daily: '', location: '', requires_calibration: false,
  calibration_interval_months: '', next_calibration_date: '', maintenance_interval_months: '', next_maintenance_date: '', notes: '',
};
const Label = ({ children }) => <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>;
const supplierName = (s) => s?.business_name || s?.name || '';

/** Alta y edición de una herramienta. tool = null → nueva. */
export default function ToolFormModal({ isOpen, onClose, tool = null, categories = [], onSaved }) {
  const [form, setForm] = useState(empty);
  const [suppliers, setSuppliers] = useState([]);
  const [assets, setAssets] = useState(null);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(tool);

  useEffect(() => {
    if (!isOpen) return;
    setForm(tool ? Object.fromEntries(Object.keys(empty).map((k) => [k, tool[k] ?? empty[k]])) : empty);
    suppliersAPI.getAll({ is_active: true, limit: 100, sort_by: 'name', sort_order: 'ASC' })
      .then((r) => setSuppliers([...(tool?.supplier ? [tool.supplier] : []), ...(r.data || [])]))
      .catch(() => {});
  }, [isOpen, tool]);

  useEffect(() => {
    if (isOpen && form.cost_mode === 'fixed_asset' && assets === null) {
      getToolFixedAssets().then((r) => setAssets(r.data || [])).catch(() => setAssets([]));
    }
  }, [isOpen, form.cost_mode, assets]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast('Escribe el nombre de la herramienta'); return; }
    if (form.cost_mode === 'fixed_asset' && !form.fixed_asset_id) { toast('Selecciona el activo fijo'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity_total: form.tracking === 'quantity' ? Number(form.quantity_total) : 1,
        acquisition_cost: form.acquisition_cost === '' ? null : Number(form.acquisition_cost),
        usage_rate_daily: form.usage_rate_daily === '' ? 0 : Number(form.usage_rate_daily),
        calibration_interval_months: form.requires_calibration && form.calibration_interval_months !== '' ? Number(form.calibration_interval_months) : null,
        next_calibration_date: form.requires_calibration ? form.next_calibration_date || null : null,
        maintenance_interval_months: form.maintenance_interval_months === '' ? null : Number(form.maintenance_interval_months),
        next_maintenance_date: form.next_maintenance_date || null,
        acquisition_date: form.acquisition_date || null,
        fixed_asset_id: form.cost_mode === 'fixed_asset' ? form.fixed_asset_id : null,
      };
      const res = isEdit ? await updateTool(tool.id, payload) : await createTool(payload);
      toast.success(res.message || 'Herramienta guardada');
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo guardar la herramienta');
    } finally {
      setSaving(false);
    }
  };

  const selectedSupplier = suppliers.find((s) => s.id === form.supplier_id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? `Editar ${tool.code}` : 'Nueva herramienta'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label>Nombre *</Label>
            <input value={form.name} onChange={set('name')} className={inputCls} placeholder="Ej. Taladro percutor 1/2&quot;" autoFocus />
          </div>
          <div>
            <Label>Categoría</Label>
            <input value={form.category || ''} onChange={set('category')} className={inputCls} list="tool-categories" placeholder="Ej. Eléctricas, Medición, Alturas" />
            <datalist id="tool-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Marca</Label><input value={form.brand || ''} onChange={set('brand')} className={inputCls} /></div>
          <div><Label>Modelo</Label><input value={form.model || ''} onChange={set('model')} className={inputCls} /></div>
          <div><Label>Ubicación habitual</Label><input value={form.location || ''} onChange={set('location')} className={inputCls} placeholder="Ej. Bodega principal" /></div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Control</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={form.tracking === 'individual'} onChange={() => setForm((f) => ({ ...f, tracking: 'individual' }))} disabled={isEdit && tool.assigned_quantity > 0} />
              Individual (una unidad con serial)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={form.tracking === 'quantity'} onChange={() => setForm((f) => ({ ...f, tracking: 'quantity' }))} disabled={isEdit && tool.assigned_quantity > 0} />
              Por cantidad (varias unidades iguales)
            </label>
          </div>
          {form.tracking === 'individual' ? (
            <div className="md:w-1/2"><Label>Serial</Label><input value={form.serial_number || ''} onChange={set('serial_number')} className={inputCls} /></div>
          ) : (
            <div className="md:w-1/3"><Label>Unidades</Label><input type="number" min="1" step="1" value={form.quantity_total} onChange={set('quantity_total')} className={inputCls} /></div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Costo</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {Object.entries(COST_MODES).map(([k, v]) => (
              <label key={k} className={`rounded-lg border px-3 py-2 text-sm cursor-pointer ${form.cost_mode === k ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                <span className="flex items-center gap-2 font-medium"><input type="radio" checked={form.cost_mode === k} onChange={() => setForm((f) => ({ ...f, cost_mode: k }))} />{v.label}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{v.hint}</span>
              </label>
            ))}
          </div>
          {form.cost_mode === 'fixed_asset' && (
            <div>
              <Label>Activo fijo *</Label>
              <select value={form.fixed_asset_id || ''} onChange={set('fixed_asset_id')} className={inputCls}>
                <option value="">— Selecciona —</option>
                {(assets || []).map((a) => (
                  <option key={a.id} value={a.id} disabled={Boolean(a.linked_tool && a.id !== tool?.fixed_asset_id)}>
                    {a.name} · {formatCurrency(a.acquisition_cost)}{a.linked_tool && a.id !== tool?.fixed_asset_id ? ` (ya vinculado a ${a.linked_tool})` : ''}
                  </option>
                ))}
              </select>
              {assets && !assets.length && <p className="text-xs text-gray-500 mt-1">No hay activos fijos. Créalo primero en Contabilidad → Activos fijos.</p>}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Costo unitario de compra</Label>
              <NumericInput value={form.acquisition_cost} onChange={set('acquisition_cost')} className={inputCls} placeholder="0" />
            </div>
            <div><Label>Fecha de compra</Label><input type="date" value={form.acquisition_date || ''} onChange={set('acquisition_date')} className={inputCls} /></div>
            <div><Label>Documento de compra</Label><input value={form.acquisition_reference || ''} onChange={set('acquisition_reference')} className={inputCls} placeholder="Ej. FC-1234 o GAS-0007" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Proveedor</Label>
              <Combobox
                placeholder="Buscar proveedor..."
                items={suppliers}
                value={form.supplier_id}
                displayValue={supplierName(selectedSupplier)}
                onSelect={(s) => setForm((f) => ({ ...f, supplier_id: s.id }))}
                onClear={() => setForm((f) => ({ ...f, supplier_id: null }))}
                getSearchText={(s) => `${supplierName(s)} ${s.tax_id || ''}`}
                renderItem={(s) => <span>{supplierName(s)}</span>}
                remoteSearch={async (q) => (await suppliersAPI.getAll({ search: q, is_active: true, limit: 20 })).data || []}
              />
            </div>
            <div>
              <Label>Cargo por día de uso en proyectos</Label>
              <NumericInput value={form.usage_rate_daily} onChange={set('usage_rate_daily')} className={inputCls} placeholder="0 = sin cargo" />
              <p className="text-xs text-gray-500 mt-1">Opcional. Suma al resultado del proyecto mientras la tiene asignada (no genera asientos).</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Mantenimiento y calibración</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Mantenimiento cada (meses)</Label><input type="number" min="1" max="120" value={form.maintenance_interval_months ?? ''} onChange={set('maintenance_interval_months')} className={inputCls} /></div>
            <div><Label>Próximo mantenimiento</Label><input type="date" value={form.next_maintenance_date || ''} onChange={set('next_maintenance_date')} className={inputCls} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.requires_calibration} onChange={set('requires_calibration')} />
            Requiere calibración (equipos de medición)
          </label>
          {form.requires_calibration && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Calibración cada (meses)</Label><input type="number" min="1" max="120" value={form.calibration_interval_months ?? ''} onChange={set('calibration_interval_months')} className={inputCls} /></div>
              <div><Label>Próxima calibración</Label><input type="date" value={form.next_calibration_date || ''} onChange={set('next_calibration_date')} className={inputCls} /></div>
            </div>
          )}
        </div>

        <div><Label>Notas</Label><textarea value={form.notes || ''} onChange={set('notes')} rows={2} className={inputCls} /></div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600">Cancelar</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
