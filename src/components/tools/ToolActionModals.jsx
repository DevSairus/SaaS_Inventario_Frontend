import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Combobox from '../common/Combobox';
import NumericInput from '../inputs/NumericInput';
import ProjectSelect from '../projects/ProjectSelect';
import SignaturePad from './SignaturePad';
import { suppliersAPI } from '../../api/suppliers';
import {
  assignTool, returnToolAssignment, addToolEvent, retireTool, getToolResponsibles, openToolActa,
} from '../../api/tools';
import { formatCurrency } from '../../utils/formatters';
import { inputCls, todayLocal } from './toolConstants';

const Label = ({ children }) => <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>;
const Actions = ({ onClose, saving, label, danger }) => (
  <div className="flex justify-end gap-2 pt-2">
    <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600">Cancelar</button>
    <button type="submit" disabled={saving} className={`px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
      {saving ? 'Guardando…' : label}
    </button>
  </div>
);

// Pregunta si abrir el acta recién generada.
const offerActa = (assignmentId, kind) => {
  toast((t) => (
    <span className="flex items-center gap-3">
      Acta lista
      <button className="underline font-medium" onClick={() => { toast.dismiss(t.id); openToolActa(assignmentId, kind).catch(() => toast.error('No se pudo abrir el acta')); }}>
        Ver PDF
      </button>
    </span>
  ), { duration: 8000 });
};

/** Entrega de una herramienta (acta de entrega con firma). */
export function AssignToolModal({ isOpen, onClose, tool, defaultProject = null, onDone }) {
  const [form, setForm] = useState({});
  const [people, setPeople] = useState({ employees: [], users: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      responsible: '', responsible_name: '', responsible_document: '', quantity: 1,
      project_id: defaultProject?.id || null, assigned_at: todayLocal(), expected_return_date: '',
      delivery_condition: 'good', delivery_notes: '', delivery_signature: null, delivery_signed_name: '',
    });
    getToolResponsibles().then((r) => setPeople(r.data || { employees: [], users: [] })).catch(() => {});
  }, [isOpen, defaultProject]);

  if (!tool) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    const [kind, id] = (form.responsible || '').split(':');
    if (!form.responsible || (kind === 'other' && !form.responsible_name.trim())) { toast('Indica a quién se le entrega'); return; }
    setSaving(true);
    try {
      const res = await assignTool(tool.id, {
        employee_id: kind === 'employee' ? id : undefined,
        user_id: kind === 'user' ? id : undefined,
        responsible_name: kind === 'other' ? form.responsible_name : undefined,
        responsible_document: form.responsible_document || undefined,
        quantity: Number(form.quantity) || 1,
        project_id: form.project_id || null,
        assigned_at: form.assigned_at,
        expected_return_date: form.expected_return_date || null,
        delivery_condition: form.delivery_condition,
        delivery_notes: form.delivery_notes,
        delivery_signature: form.delivery_signature,
        delivery_signed_name: form.delivery_signed_name || undefined,
      });
      toast.success(res.message);
      offerActa(res.data.id, 'entrega');
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo registrar la entrega');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Entregar ${tool.code} · ${tool.name}`} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={tool.tracking === 'quantity' ? '' : 'md:col-span-2'}>
            <Label>Responsable *</Label>
            <select value={form.responsible} onChange={set('responsible')} className={inputCls}>
              <option value="">— Selecciona —</option>
              {people.employees.length > 0 && (
                <optgroup label="Empleados">
                  {people.employees.map((p) => <option key={p.id} value={`employee:${p.id}`}>{p.name}{p.document_number ? ` · ${p.document_number}` : ''}</option>)}
                </optgroup>
              )}
              {people.users.length > 0 && (
                <optgroup label="Usuarios">
                  {people.users.map((p) => <option key={p.id} value={`user:${p.id}`}>{p.name}</option>)}
                </optgroup>
              )}
              <option value="other:">Otra persona (contratista)…</option>
            </select>
          </div>
          {tool.tracking === 'quantity' && (
            <div>
              <Label>Cantidad * (disponibles: {tool.available_quantity})</Label>
              <input type="number" min="1" max={tool.available_quantity} value={form.quantity} onChange={set('quantity')} className={inputCls} />
            </div>
          )}
        </div>
        {form.responsible === 'other:' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Nombre *</Label><input value={form.responsible_name} onChange={set('responsible_name')} className={inputCls} /></div>
            <div><Label>Documento</Label><input value={form.responsible_document} onChange={set('responsible_document')} className={inputCls} /></div>
          </div>
        )}
        <ProjectSelect value={form.project_id} onChange={(id) => setForm((f) => ({ ...f, project_id: id }))} label="Proyecto" />
        {Number(tool.usage_rate_daily) > 0 && form.project_id && (
          <p className="text-xs text-gray-500 -mt-2">Se cargará {formatCurrency(tool.usage_rate_daily)} por día de uso al proyecto.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Fecha de entrega</Label><input type="date" value={form.assigned_at} onChange={set('assigned_at')} className={inputCls} /></div>
          <div><Label>Devolución prevista</Label><input type="date" value={form.expected_return_date} onChange={set('expected_return_date')} className={inputCls} /></div>
          <div>
            <Label>Estado al entregar</Label>
            <select value={form.delivery_condition} onChange={set('delivery_condition')} className={inputCls}>
              <option value="good">Buen estado</option>
              <option value="damaged">Con daño (anotar)</option>
            </select>
          </div>
        </div>
        <div><Label>Observaciones</Label><input value={form.delivery_notes} onChange={set('delivery_notes')} className={inputCls} placeholder="Accesorios entregados, estado, etc." /></div>
        <div>
          <Label>Firma de quien recibe</Label>
          <SignaturePad onChange={(sig) => setForm((f) => ({ ...f, delivery_signature: sig }))} />
          <p className="text-xs text-gray-500 mt-1">Opcional: sin firma en pantalla, el acta sale con la línea para firmar en papel.</p>
        </div>
        <Actions onClose={onClose} saving={saving} label="Registrar entrega" />
      </form>
    </Modal>
  );
}

/** Devolución (acta de devolución con firma). */
export function ReturnToolModal({ isOpen, onClose, assignment, tool, onDone }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setForm({ returned_at: todayLocal(), return_condition: 'good', lost_quantity: 0, return_notes: '', return_signature: null });
  }, [isOpen]);

  if (!assignment) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const needsNotes = form.return_condition !== 'good' || Number(form.lost_quantity) > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (needsNotes && !form.return_notes.trim()) { toast('Describe el daño o la pérdida'); return; }
    setSaving(true);
    try {
      const res = await returnToolAssignment(assignment.id, { ...form, lost_quantity: Number(form.lost_quantity) || 0 });
      toast.success(res.message);
      offerActa(assignment.id, 'devolucion');
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo registrar la devolución');
    } finally {
      setSaving(false);
    }
  };

  const isQty = tool?.tracking === 'quantity' && assignment.quantity > 1;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Devolución ${assignment.number}`} size="md">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {assignment.quantity > 1 ? `${assignment.quantity} unidades` : 'Herramienta'} en poder de <strong>{assignment.responsible_name}</strong>
          {assignment.project ? <> · {assignment.project.code}</> : null}.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Fecha de devolución</Label><input type="date" value={form.returned_at} onChange={set('returned_at')} className={inputCls} /></div>
          <div>
            <Label>Estado</Label>
            <select value={form.return_condition} onChange={set('return_condition')} className={inputCls}>
              <option value="good">Buen estado</option>
              <option value="damaged">Con daño</option>
              <option value="lost">Perdida{isQty ? ' (todas)' : ''}</option>
            </select>
          </div>
        </div>
        {isQty && form.return_condition !== 'lost' && (
          <div className="md:w-1/2"><Label>Unidades perdidas</Label><input type="number" min="0" max={assignment.quantity} value={form.lost_quantity} onChange={set('lost_quantity')} className={inputCls} /></div>
        )}
        {form.return_condition === 'damaged' && tool?.tracking === 'individual' && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">Quedará en mantenimiento hasta que se registre su reparación.</p>
        )}
        {form.return_condition === 'lost' && tool?.tracking === 'individual' && (
          <p className="text-xs text-red-700 bg-red-50 rounded px-3 py-2">La herramienta quedará dada de baja por pérdida.</p>
        )}
        <div><Label>Observaciones{needsNotes ? ' *' : ''}</Label><input value={form.return_notes} onChange={set('return_notes')} className={inputCls} /></div>
        <div>
          <Label>Firma de quien devuelve</Label>
          <SignaturePad onChange={(sig) => setForm((f) => ({ ...f, return_signature: sig }))} />
        </div>
        <Actions onClose={onClose} saving={saving} label="Registrar devolución" />
      </form>
    </Modal>
  );
}

const EVENT_FORM = {
  maintenance: { title: 'Registrar mantenimiento', cost: true, supplier: true, nextDue: 'Próximo mantenimiento' },
  calibration: { title: 'Registrar calibración', cost: true, supplier: true, certificate: true, nextDue: 'Próxima calibración' },
  repair: { title: 'Registrar reparación', cost: true, supplier: true, descriptionRequired: true },
  damage: { title: 'Reportar daño', descriptionRequired: true },
  note: { title: 'Agregar nota', descriptionRequired: true },
};

/** Mantenimiento, calibración, reparación, daño o nota en la hoja de vida. */
export function ToolEventModal({ isOpen, onClose, tool, eventType, onDone }) {
  const cfg = EVENT_FORM[eventType] || EVENT_FORM.note;
  const [form, setForm] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ event_date: todayLocal(), description: '', cost: '', supplier_id: null, certificate_number: '', next_due_date: '' });
    if (cfg.supplier) suppliersAPI.getAll({ is_active: true, limit: 100, sort_by: 'name', sort_order: 'ASC' }).then((r) => setSuppliers(r.data || [])).catch(() => {});
  }, [isOpen, cfg.supplier]);

  if (!tool) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const interval = eventType === 'calibration' ? tool.calibration_interval_months : eventType === 'maintenance' ? tool.maintenance_interval_months : null;

  const submit = async (e) => {
    e.preventDefault();
    if (cfg.descriptionRequired && !form.description.trim()) { toast('Escribe una descripción'); return; }
    setSaving(true);
    try {
      const res = await addToolEvent(tool.id, {
        event_type: eventType,
        ...form,
        cost: form.cost === '' ? null : Number(form.cost),
        next_due_date: form.next_due_date || null,
      });
      toast.success(res.message);
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };
  const supplierName = (s) => s?.business_name || s?.name || '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${cfg.title} · ${tool.code}`} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Fecha</Label><input type="date" value={form.event_date} max={todayLocal()} onChange={set('event_date')} className={inputCls} /></div>
          {cfg.cost && <div><Label>Costo</Label><NumericInput value={form.cost} onChange={set('cost')} className={inputCls} placeholder="0" /></div>}
        </div>
        {cfg.supplier && (
          <div>
            <Label>Proveedor / taller</Label>
            <Combobox
              placeholder="Buscar proveedor..."
              items={suppliers}
              value={form.supplier_id}
              displayValue={supplierName(suppliers.find((s) => s.id === form.supplier_id))}
              onSelect={(s) => setForm((f) => ({ ...f, supplier_id: s.id }))}
              onClear={() => setForm((f) => ({ ...f, supplier_id: null }))}
              getSearchText={(s) => `${supplierName(s)} ${s.tax_id || ''}`}
              renderItem={(s) => <span>{supplierName(s)}</span>}
              remoteSearch={async (q) => (await suppliersAPI.getAll({ search: q, is_active: true, limit: 20 })).data || []}
            />
          </div>
        )}
        {cfg.certificate && <div><Label>N.º de certificado</Label><input value={form.certificate_number} onChange={set('certificate_number')} className={inputCls} /></div>}
        {cfg.nextDue && (
          <div>
            <Label>{cfg.nextDue}</Label>
            <input type="date" value={form.next_due_date} onChange={set('next_due_date')} className={inputCls} />
            {interval ? <p className="text-xs text-gray-500 mt-1">Si la dejas vacía se calcula con la frecuencia de la herramienta ({interval} meses).</p> : null}
          </div>
        )}
        <div><Label>Descripción{cfg.descriptionRequired ? ' *' : ''}</Label><textarea rows={2} value={form.description} onChange={set('description')} className={inputCls} /></div>
        {cfg.cost && <p className="text-xs text-gray-500">El costo queda en la hoja de vida. Para contabilidad registra la factura del taller como gasto o compra.</p>}
        {tool.status === 'maintenance' && ['maintenance', 'calibration', 'repair'].includes(eventType) && (
          <p className="text-xs text-green-700 bg-green-50 rounded px-3 py-2">Al guardar, la herramienta vuelve a estar disponible.</p>
        )}
        <Actions onClose={onClose} saving={saving} label="Guardar" />
      </form>
    </Modal>
  );
}

/** Baja de la herramienta (y opcionalmente de su activo fijo). */
export function RetireToolModal({ isOpen, onClose, tool, onDone }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (isOpen) setForm({ retired_at: todayLocal(), reason: '', dispose_fixed_asset: true }); }, [isOpen]);
  if (!tool) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) { toast('Indica el motivo de la baja'); return; }
    setSaving(true);
    try {
      const res = await retireTool(tool.id, form);
      toast.success(res.message, { duration: 6000 });
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo dar de baja');
    } finally {
      setSaving(false);
    }
  };

  const hasAsset = tool.fixed_asset && tool.fixed_asset.status !== 'dado_de_baja';
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Dar de baja ${tool.code}`} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div><Label>Fecha</Label><input type="date" value={form.retired_at} onChange={(e) => setForm((f) => ({ ...f, retired_at: e.target.value }))} className={inputCls} /></div>
        <div><Label>Motivo *</Label><input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className={inputCls} placeholder="Ej. Daño irreparable, venta, robo" /></div>
        {hasAsset && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={form.dispose_fixed_asset} onChange={(e) => setForm((f) => ({ ...f, dispose_fixed_asset: e.target.checked }))} />
            <span>
              Dar de baja también el activo fijo «{tool.fixed_asset.name}» (valor en libros {formatCurrency(tool.fixed_asset.book_value)}).
              <span className="block text-xs text-gray-500">Se deprecia hasta el día de la baja y se genera el asiento de retiro (pérdida por el valor en libros).</span>
            </span>
          </label>
        )}
        <Actions onClose={onClose} saving={saving} label="Dar de baja" danger />
      </form>
    </Modal>
  );
}
