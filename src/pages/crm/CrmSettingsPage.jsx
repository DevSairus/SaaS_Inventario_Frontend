import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import CrmSubNav from '../../components/crm/CrmSubNav';
import crmApi from '../../api/crm';
import { Settings, Plus, Pencil, Trash2, ArrowUp, ArrowDown, MessageSquare, Zap, Power, GripVertical, Trophy, X } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const STAGE_TYPE_LABELS = { open: 'Abierta', won: 'Ganada', lost: 'Perdida' };
const CHANNEL_LABELS = { whatsapp: 'WhatsApp', llamada: 'Llamada', email: 'Email' };

const SOURCE_LABELS = {
  walk_in: 'Mostrador', whatsapp: 'WhatsApp', llamada: 'Llamada', referido: 'Referido',
  redes: 'Redes sociales', web: 'Web', recompra_recurrente: 'Recompra recurrente', meta_ads: 'Meta Ads',
};

const TRIGGER_TYPE_LABELS = {
  unattended_lead: 'Lead sin contactar',
  stage_stale: 'Sin movimiento en una etapa',
  opportunity_created: 'Entra una oportunidad nueva',
};

const ACTION_TYPE_LABELS = {
  create_task: 'Crear tarea de seguimiento',
  assign_round_robin: 'Asignar por ronda entre vendedores',
};

// Gamificación — catálogo cerrado de assets visuales (§5.1). El set real de
// íconos/ilustraciones se define en Fase 3 (GoalPathWidget.jsx); acá solo
// se guarda la clave para que el admin la elija de antemano.
const ICON_STYLE_OPTIONS = [
  { key: 'rocket', label: 'Cohete' },
  { key: 'flag', label: 'Bandera de meta' },
  { key: 'trophy', label: 'Trofeo' },
  { key: 'star', label: 'Estrella' },
  { key: 'car', label: 'Vehículo' },
];

const GOAL_TYPE_LABELS = { principal: 'Principal', secundaria: 'Secundaria' };
const SCOPE_LABELS = { individual: 'Por vendedor', branch: 'Por sede', tenant: 'Todo el negocio' };
const PERIOD_TYPE_LABELS = { weekly: 'Semanal', monthly: 'Mensual', custom: 'Fechas manuales' };
const BOARD_VISIBILITY_LABELS = {
  own_only: 'Cada quien ve solo lo suyo',
  team: 'El equipo ve el tablero de su(s) sede(s)',
  all: 'Todos ven el tablero completo',
};

const TABS = [
  { key: 'stages', label: 'Etapas' },
  { key: 'reasons', label: 'Motivos de pérdida' },
  { key: 'templates', label: 'Plantillas' },
  { key: 'automations', label: 'Automatizaciones' },
  { key: 'goals', label: 'Metas' },
];

function SortableStageRow({ s, i, total, onMove, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'bg-accent/[0.04] relative z-10' : ''}>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1">
          <button {...attributes} {...listeners} title="Arrastrar para reordenar"
            className="p-0.5 text-gray-300 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none">
            <GripVertical size={14} />
          </button>
          <button onClick={() => onMove(i, -1)} disabled={i === 0} className="p-0.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-20"><ArrowUp size={14} /></button>
          <button onClick={() => onMove(i, 1)} disabled={i === total - 1} className="p-0.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 disabled:opacity-20"><ArrowDown size={14} /></button>
        </div>
      </td>
      <td className="px-4 py-2.5"><span className="inline-block w-5 h-5 rounded-full border border-gray-200 dark:border-white/10" style={{ background: s.color || '#e5e7eb' }} /></td>
      <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{s.label} <span className="text-gray-300 dark:text-gray-600 font-normal">({s.key})</span></td>
      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-500">{STAGE_TYPE_LABELS[s.stage_type]}</td>
      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-500">{s.default_probability != null ? `${s.default_probability}%` : '—'}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => onEdit(s)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-accent rounded-full hover:bg-gray-50 dark:hover:bg-white/5"><Pencil size={14} /></button>
          <button onClick={() => onDelete(s)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-50 dark:hover:bg-white/5"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  );
}

function StagesTab() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | stage object
  const [form, setForm] = useState({ key: '', label: '', color: '#0284c7', stage_type: 'open', default_probability: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.listPipelineStages();
      setStages(res.data.data || []);
    } catch { toast.error('Error cargando las etapas'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setForm({ key: '', label: '', color: '#0284c7', stage_type: 'open', default_probability: '' });
    setModal('new');
  };

  const openEdit = (stage) => {
    setForm({
      key: stage.key, label: stage.label, color: stage.color || '#0284c7',
      stage_type: stage.stage_type, default_probability: stage.default_probability ?? '',
    });
    setModal(stage);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.label.trim() || (modal === 'new' && !form.key.trim())) {
      toast.error('Completa los campos requeridos');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        label: form.label,
        color: form.color,
        stage_type: form.stage_type,
        default_probability: form.default_probability === '' ? null : parseInt(form.default_probability, 10),
      };
      if (modal === 'new') {
        await crmApi.createPipelineStage({ ...payload, key: form.key.trim().toLowerCase().replace(/\s+/g, '_') });
        toast.success('Etapa creada');
      } else {
        await crmApi.updatePipelineStage(modal.id, payload);
        toast.success('Etapa actualizada');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar la etapa');
    } finally { setSaving(false); }
  };

  const handleDelete = async (stage) => {
    if (!window.confirm(`¿Eliminar la etapa "${stage.label}"?`)) return;
    try {
      await crmApi.removePipelineStage(stage.id);
      toast.success('Etapa eliminada');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo eliminar la etapa');
    }
  };

  // A.2.6 — antes solo se podía reordenar con las flechas ↑↓; ahora también
  // se puede arrastrar por el handle (⠿), usando @dnd-kit/sortable (misma
  // librería que ya se usó para el Kanban en A.2.1). Las flechas se dejan
  // como respaldo accesible (teclado / sin soporte de puntero).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const persistOrder = async (reordered) => {
    try {
      await crmApi.reorderPipelineStages(reordered.map(s => s.id));
    } catch {
      toast.error('No se pudo reordenar');
      load();
    }
  };

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    const reordered = [...stages];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setStages(reordered);
    persistOrder(reordered);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stages.findIndex(s => s.id === active.id);
    const newIndex = stages.findIndex(s => s.id === over.id);
    const reordered = arrayMove(stages, oldIndex, newIndex);
    setStages(reordered);
    persistOrder(reordered);
  };

  if (loading) return <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Cargando etapas...</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="primary" icon={Plus} onClick={openNew}>Nueva etapa</Button>
      </div>
      <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-graphite-2 text-gray-500 dark:text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Orden</th>
              <th className="text-left px-4 py-2.5 font-medium">Color</th>
              <th className="text-left px-4 py-2.5 font-medium">Etiqueta</th>
              <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
              <th className="text-left px-4 py-2.5 font-medium">Prob. default</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-white/10">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {stages.map((s, i) => (
                  <SortableStageRow key={s.id} s={s} i={i} total={stages.length}
                    onMove={move} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </SortableContext>
            </DndContext>
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Nueva etapa' : 'Editar etapa'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          {modal === 'new' && (
            <Input label="Key (identificador interno)" value={form.key}
              onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
              helperText="Sin espacios ni tildes, ej: en_taller" required />
          )}
          <Input label="Etiqueta" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="w-16 h-9 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de etapa</label>
            <select value={form.stage_type} onChange={e => setForm(f => ({ ...f, stage_type: e.target.value }))}
              className="w-full border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2">
              <option value="open">Abierta</option>
              <option value="won">Ganada</option>
              <option value="lost">Perdida</option>
            </select>
          </div>
          <Input label="Probabilidad por defecto (%)" type="number" min="0" max="100" value={form.default_probability}
            onChange={e => setForm(f => ({ ...f, default_probability: e.target.value }))}
            helperText="Usada en el forecast del dashboard cuando la oportunidad no trae su propia probabilidad" />
          <div className="flex justify-end gap-2 pt-4 border-t dark:border-white/10">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function LossReasonsTab() {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ key: '', label: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.listLossReasons();
      setReasons(res.data.data || []);
    } catch { toast.error('Error cargando los motivos de pérdida'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm({ key: '', label: '' }); setModal('new'); };
  const openEdit = (r) => { setForm({ key: r.key, label: r.label }); setModal(r); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.label.trim() || (modal === 'new' && !form.key.trim())) {
      toast.error('Completa los campos requeridos');
      return;
    }
    setSaving(true);
    try {
      if (modal === 'new') {
        await crmApi.createLossReason({ key: form.key.trim().toLowerCase().replace(/\s+/g, '_'), label: form.label });
        toast.success('Motivo creado');
      } else {
        await crmApi.updateLossReason(modal.id, { label: form.label });
        toast.success('Motivo actualizado');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar el motivo');
    } finally { setSaving(false); }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`¿Eliminar el motivo "${r.label}"?`)) return;
    try {
      await crmApi.removeLossReason(r.id);
      toast.success('Motivo eliminado');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo eliminar el motivo');
    }
  };

  if (loading) return <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Cargando motivos...</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="primary" icon={Plus} onClick={openNew}>Nuevo motivo</Button>
      </div>
      <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl divide-y divide-gray-50 dark:divide-white/10">
        {reasons.map(r => (
          <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.label} <span className="text-gray-300 dark:text-gray-600 font-normal">({r.key})</span></span>
            <div className="flex items-center gap-1">
              <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-accent rounded-full hover:bg-gray-50 dark:hover:bg-white/5"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(r)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-50 dark:hover:bg-white/5"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {reasons.length === 0 && <p className="text-xs text-gray-300 dark:text-gray-600 text-center py-6">Sin motivos configurados</p>}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Nuevo motivo' : 'Editar motivo'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          {modal === 'new' && (
            <Input label="Key (identificador interno)" value={form.key}
              onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
              helperText="Sin espacios ni tildes, ej: fuera_de_presupuesto" required />
          )}
          <Input label="Etiqueta" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required />
          <div className="flex justify-end gap-2 pt-4 border-t dark:border-white/10">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', channel: 'whatsapp', body: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.listMessageTemplates();
      setTemplates(res.data.data || []);
    } catch { toast.error('Error cargando las plantillas'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm({ name: '', channel: 'whatsapp', body: '' }); setModal('new'); };
  const openEdit = (t) => { setForm({ name: t.name, channel: t.channel, body: t.body }); setModal(t); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.body.trim()) {
      toast.error('Completa nombre y cuerpo del mensaje');
      return;
    }
    setSaving(true);
    try {
      if (modal === 'new') {
        await crmApi.createMessageTemplate(form);
        toast.success('Plantilla creada');
      } else {
        await crmApi.updateMessageTemplate(modal.id, form);
        toast.success('Plantilla actualizada');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar la plantilla');
    } finally { setSaving(false); }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`¿Eliminar la plantilla "${t.name}"?`)) return;
    try {
      await crmApi.removeMessageTemplate(t.id);
      toast.success('Plantilla eliminada');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo eliminar la plantilla');
    }
  };

  if (loading) return <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Cargando plantillas...</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="primary" icon={Plus} onClick={openNew}>Nueva plantilla</Button>
      </div>
      <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl divide-y divide-gray-50 dark:divide-white/10">
        {templates.map(t => (
          <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MessageSquare size={13} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.name}</span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">{CHANNEL_LABELS[t.channel]}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{t.body}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-accent rounded-full hover:bg-gray-50 dark:hover:bg-white/5"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(t)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-50 dark:hover:bg-white/5"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {templates.length === 0 && <p className="text-xs text-gray-300 dark:text-gray-600 text-center py-6">Sin plantillas configuradas</p>}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Nueva plantilla' : 'Editar plantilla'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Canal</label>
            <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
              className="w-full border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2">
              <option value="whatsapp">WhatsApp</option>
              <option value="llamada">Llamada</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensaje</label>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              rows={5} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Variables disponibles: <code>{'{{cliente}}'}</code>, <code>{'{{asesor}}'}</code>, <code>{'{{monto}}'}</code></p>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t dark:border-white/10">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function AutomationRulesTab() {
  const [rules, setRules] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | rule object
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    name: '', is_active: true,
    trigger_type: 'unattended_lead', hours: 2, stage_key: '', source: '',
    action_type: 'create_task', title: 'Contactar al cliente', due_in_hours: 1,
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, stagesRes] = await Promise.all([
        crmApi.listAutomationRules(),
        crmApi.listPipelineStages(),
      ]);
      setRules(rulesRes.data.data || []);
      setStages(stagesRes.data.data || []);
    } catch { toast.error('Error cargando las automatizaciones'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setModal('new'); };

  const openEdit = (rule) => {
    setForm({
      name: rule.name,
      is_active: rule.is_active,
      trigger_type: rule.trigger_type,
      hours: rule.trigger_config?.hours ?? 2,
      stage_key: rule.trigger_config?.stage_key || '',
      source: rule.trigger_config?.source || '',
      action_type: rule.action_type,
      title: rule.action_config?.title || 'Contactar al cliente',
      due_in_hours: rule.action_config?.due_in_hours ?? 1,
    });
    setModal(rule);
  };

  const buildPayload = () => {
    const trigger_config = {};
    if (form.trigger_type === 'unattended_lead') {
      trigger_config.hours = parseFloat(form.hours) || 2;
      if (form.source) trigger_config.source = form.source;
    } else if (form.trigger_type === 'stage_stale') {
      trigger_config.stage_key = form.stage_key;
      trigger_config.hours = parseFloat(form.hours) || 72;
    } else if (form.trigger_type === 'opportunity_created') {
      if (form.source) trigger_config.source = form.source;
    }

    const action_config = {};
    if (form.action_type === 'create_task') {
      action_config.title = form.title;
      action_config.due_in_hours = parseFloat(form.due_in_hours) || 1;
    }

    return {
      name: form.name,
      is_active: form.is_active,
      trigger_type: form.trigger_type,
      trigger_config,
      action_type: form.action_type,
      action_config,
    };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Ponle un nombre a la regla'); return; }
    if (form.trigger_type === 'stage_stale' && !form.stage_key) {
      toast.error('Elige la etapa a vigilar'); return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (modal === 'new') {
        await crmApi.createAutomationRule(payload);
        toast.success('Automatización creada');
      } else {
        await crmApi.updateAutomationRule(modal.id, payload);
        toast.success('Automatización actualizada');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar la automatización');
    } finally { setSaving(false); }
  };

  const toggleActive = async (rule) => {
    try {
      await crmApi.updateAutomationRule(rule.id, { is_active: !rule.is_active });
      load();
    } catch {
      toast.error('No se pudo cambiar el estado de la regla');
    }
  };

  const handleDelete = async (rule) => {
    if (!window.confirm(`¿Eliminar la automatización "${rule.name}"?`)) return;
    try {
      await crmApi.removeAutomationRule(rule.id);
      toast.success('Automatización eliminada');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo eliminar la automatización');
    }
  };

  const describeTrigger = (rule) => {
    const c = rule.trigger_config || {};
    if (rule.trigger_type === 'unattended_lead') {
      return `Sin contactar hace ${c.hours ?? 2}h${c.source ? ` · origen: ${SOURCE_LABELS[c.source] || c.source}` : ''}`;
    }
    if (rule.trigger_type === 'stage_stale') {
      const stage = stages.find(s => s.key === c.stage_key);
      return `${c.hours ?? 72}h sin moverse en "${stage?.label || c.stage_key || '—'}"`;
    }
    if (rule.trigger_type === 'opportunity_created') {
      return c.source ? `Origen: ${SOURCE_LABELS[c.source] || c.source}` : 'Cualquier origen';
    }
    return '';
  };

  const describeAction = (rule) => {
    if (rule.action_type === 'create_task') {
      const hours = rule.action_config?.due_in_hours ?? 1;
      return `Tarea "${rule.action_config?.title || 'Seguimiento'}" (vence en ${hours}h)`;
    }
    if (rule.action_type === 'assign_round_robin') return 'Asignar por ronda';
    return '';
  };

  if (loading) return <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Cargando automatizaciones...</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 max-w-2xl">
        Reglas "si esto → entonces esto". Las que dependen de tiempo (lead sin contactar, sin movimiento en una etapa)
        se revisan cada 30 minutos; las que dependen de un evento (entra una oportunidad nueva) se aplican al instante.
      </p>
      <div className="flex justify-end">
        <Button variant="primary" icon={Plus} onClick={openNew}>Nueva automatización</Button>
      </div>
      <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl divide-y divide-gray-50 dark:divide-white/10">
        {rules.map(rule => (
          <div key={rule.id} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Zap size={13} className={rule.is_active ? 'text-accent flex-shrink-0' : 'text-gray-300 flex-shrink-0'} />
                <span className={`text-sm font-medium ${rule.is_active ? 'text-gray-800' : 'text-gray-400'}`}>{rule.name}</span>
                {!rule.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Pausada</span>}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {TRIGGER_TYPE_LABELS[rule.trigger_type]} — {describeTrigger(rule)} → {describeAction(rule)}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => toggleActive(rule)} title={rule.is_active ? 'Pausar' : 'Activar'}
                className={`p-1.5 rounded-full hover:bg-gray-50 ${rule.is_active ? 'text-accent' : 'text-gray-300'}`}>
                <Power size={14} />
              </button>
              <button onClick={() => openEdit(rule)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-accent rounded-full hover:bg-gray-50 dark:hover:bg-white/5"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(rule)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-50 dark:hover:bg-white/5"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {rules.length === 0 && <p className="text-xs text-gray-300 dark:text-gray-600 text-center py-6">Sin automatizaciones configuradas</p>}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Nueva automatización' : 'Editar automatización'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder='Ej: "Lead sin contactar en 2 horas"' required />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cuándo (disparador)</label>
            <select value={form.trigger_type} onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))}
              className="w-full border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2">
              {Object.entries(TRIGGER_TYPE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>

          {form.trigger_type === 'unattended_lead' && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Horas sin contactar" type="number" min="0" step="0.5" value={form.hours}
                onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} required />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origen (opcional)</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2">
                  <option value="">Cualquiera</option>
                  {Object.entries(SOURCE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </div>
            </div>
          )}

          {form.trigger_type === 'stage_stale' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Etapa a vigilar</label>
                <select value={form.stage_key} onChange={e => setForm(f => ({ ...f, stage_key: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2" required>
                  <option value="">Elige una etapa</option>
                  {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <Input label="Horas sin moverse" type="number" min="0" step="1" value={form.hours}
                onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} required />
            </div>
          )}

          {form.trigger_type === 'opportunity_created' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origen (opcional)</label>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                className="w-full border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2">
                <option value="">Cualquiera</option>
                {Object.entries(SOURCE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Ej: solo cuando el origen sea Meta Ads.</p>
            </div>
          )}

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entonces (acción)</label>
            <select value={form.action_type} onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))}
              className="w-full border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2">
              {Object.entries(ACTION_TYPE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>

          {form.action_type === 'create_task' && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Título de la tarea" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              <Input label="Vence en (horas)" type="number" min="0" step="0.5" value={form.due_in_hours}
                onChange={e => setForm(f => ({ ...f, due_in_hours: e.target.value }))} required />
            </div>
          )}

          {form.action_type === 'assign_round_robin' && (
            <p className="text-xs text-gray-400">
              Se asigna al siguiente vendedor activo en la rotación (por sede si la oportunidad tiene una asignada).
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            Regla activa
          </label>

          <div className="flex justify-end gap-2 pt-4 border-t dark:border-white/10">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Gamificación — configuración de visibilidad del tablero (§3.5, §5.3) ──
function GamificationSettingsPanel({ settings, onSaved }) {
  const [form, setForm] = useState({
    board_visibility: settings?.board_visibility || 'own_only',
    enabled: settings?.enabled ?? true,
  });
  const [saving, setSaving] = useState(false);
  const dirty = form.board_visibility !== settings?.board_visibility || form.enabled !== settings?.enabled;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await crmApi.updateGamificationSettings(form);
      toast.success('Configuración de gamificación actualizada');
      onSaved(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar la configuración');
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Gamificación</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Quién puede ver el tablero de los demás — el administrador siempre ve todo, sin importar esta opción.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
          <input type="checkbox" checked={form.enabled}
            onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />
          Activada
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visibilidad del tablero</label>
        <select value={form.board_visibility} disabled={!form.enabled}
          onChange={e => setForm(f => ({ ...f, board_visibility: e.target.value }))}
          className="w-full sm:w-96 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2 disabled:opacity-50">
          {Object.entries(BOARD_VISIBILITY_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </div>

      {dirty && (
        <div className="flex justify-end pt-2 border-t dark:border-white/10">
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      )}
    </div>
  );
}

function MilestonesEditor({ milestones, onChange }) {
  const update = (i, field, value) => {
    const next = [...milestones];
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  };
  const add = () => onChange([...milestones, { percent: '', message: '' }]);
  const remove = (i) => onChange(milestones.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hitos</label>
        <button type="button" onClick={add} className="text-xs text-accent hover:underline flex items-center gap-1">
          <Plus size={12} /> Agregar hito
        </button>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
        Al cruzar cada porcentaje se dispara la celebración con este mensaje.
      </p>
      <div className="space-y-2">
        {milestones.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="number" min="1" max="500" value={m.percent}
              onChange={e => update(i, 'percent', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              placeholder="%" className="w-16 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm" />
            <input type="text" value={m.message}
              onChange={e => update(i, 'message', e.target.value)}
              placeholder="Ej: 🏆 ¡Vas a mitad de camino!"
              className="flex-1 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm" />
            <button type="button" onClick={() => remove(i)} className="p-1 text-gray-300 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
          </div>
        ))}
        {milestones.length === 0 && <p className="text-xs text-gray-300 dark:text-gray-600">Sin hitos configurados todavía</p>}
      </div>
    </div>
  );
}

const emptyGoalForm = {
  name: '', goal_type: 'secundaria', metric: '', scope: 'individual',
  target_value: '', period_type: 'monthly', starts_at: '', ends_at: '',
  milestones: [], icon_style: 'flag', active: true,
};

function GoalsTab() {
  const [goals, setGoals] = useState([]);
  const [metricsCatalog, setMetricsCatalog] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | goal object
  const [form, setForm] = useState(emptyGoalForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, settingsRes] = await Promise.all([
        crmApi.listGoals(),
        crmApi.getGamificationSettings(),
      ]);
      setGoals(goalsRes.data.data || []);
      setMetricsCatalog(goalsRes.data.metrics_catalog || []);
      setSettings(settingsRes.data.data);
    } catch { toast.error('Error cargando las metas'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const metricLabel = (key) => metricsCatalog.find(m => m.key === key)?.label || key;

  const openNew = () => {
    setForm({ ...emptyGoalForm, metric: metricsCatalog[0]?.key || '' });
    setModal('new');
  };

  const openEdit = (goal) => {
    setForm({
      name: goal.name,
      goal_type: goal.goal_type,
      metric: goal.metric,
      scope: goal.scope,
      target_value: goal.target_value,
      period_type: goal.period_type,
      starts_at: goal.starts_at || '',
      ends_at: goal.ends_at || '',
      milestones: goal.milestones || [],
      icon_style: goal.icon_style || 'flag',
      active: goal.active,
    });
    setModal(goal);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.metric || !form.target_value) {
      toast.error('Completa nombre, métrica y objetivo');
      return;
    }
    if (form.period_type === 'custom' && (!form.starts_at || !form.ends_at)) {
      toast.error('Define fecha de inicio y de fin para una meta con fechas manuales');
      return;
    }
    const cleanMilestones = form.milestones
      .filter(m => m.percent !== '' && m.message.trim())
      .map(m => ({ percent: parseInt(m.percent, 10), message: m.message.trim() }));

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        goal_type: form.goal_type,
        metric: form.metric,
        scope: form.scope,
        target_value: parseFloat(form.target_value),
        period_type: form.period_type,
        starts_at: form.period_type === 'custom' ? form.starts_at : null,
        ends_at: form.period_type === 'custom' ? form.ends_at : null,
        milestones: cleanMilestones,
        icon_style: form.icon_style,
      };
      if (modal === 'new') {
        await crmApi.createGoal(payload);
        toast.success('Meta creada');
      } else {
        await crmApi.updateGoal(modal.id, { ...payload, active: form.active });
        toast.success('Meta actualizada');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar la meta');
    } finally { setSaving(false); }
  };

  const toggleActive = async (goal) => {
    try {
      await crmApi.updateGoal(goal.id, { active: !goal.active });
      load();
    } catch {
      toast.error('No se pudo cambiar el estado de la meta');
    }
  };

  const handleDelete = async (goal) => {
    if (!window.confirm(`¿Desactivar la meta "${goal.name}"? El histórico de avance se conserva.`)) return;
    try {
      await crmApi.removeGoal(goal.id);
      toast.success('Meta desactivada');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo desactivar la meta');
    }
  };

  const describePeriod = (goal) => {
    if (goal.period_type === 'custom') {
      return `${goal.starts_at || '—'} → ${goal.ends_at || '—'}`;
    }
    return PERIOD_TYPE_LABELS[goal.period_type];
  };

  if (loading) return <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Cargando metas...</div>;

  return (
    <div className="space-y-4">
      <GamificationSettingsPanel settings={settings} onSaved={setSettings} />

      <div className="flex justify-end">
        <Button variant="primary" icon={Plus} onClick={openNew}>Nueva meta</Button>
      </div>

      <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl divide-y divide-gray-50 dark:divide-white/10">
        {goals.map(goal => (
          <div key={goal.id} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Trophy size={13} className={goal.active ? 'text-accent flex-shrink-0' : 'text-gray-300 flex-shrink-0'} />
                <span className={`text-sm font-medium ${goal.active ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>{goal.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">{GOAL_TYPE_LABELS[goal.goal_type]}</span>
                {!goal.active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Pausada</span>}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {metricLabel(goal.metric)} · objetivo {parseFloat(goal.target_value)} · {SCOPE_LABELS[goal.scope]} · {describePeriod(goal)}
                {goal.milestones?.length ? ` · ${goal.milestones.length} hito(s)` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => toggleActive(goal)} title={goal.active ? 'Pausar' : 'Activar'}
                className={`p-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-white/5 ${goal.active ? 'text-accent' : 'text-gray-300'}`}>
                <Power size={14} />
              </button>
              <button onClick={() => openEdit(goal)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-accent rounded-full hover:bg-gray-50 dark:hover:bg-white/5"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(goal)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-50 dark:hover:bg-white/5"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {goals.length === 0 && <p className="text-xs text-gray-300 dark:text-gray-600 text-center py-6">Sin metas configuradas</p>}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Nueva meta' : 'Editar meta'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder='Ej: "Meta de ventas de septiembre"' required />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
              <select value={form.goal_type} onChange={e => setForm(f => ({ ...f, goal_type: e.target.value }))}
                className="w-full border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2">
                {Object.entries(GOAL_TYPE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aplica a</label>
              <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                className="w-full border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2">
                {Object.entries(SCOPE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Métrica</label>
              <select value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}
                className="w-full border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2" required>
                <option value="">Elige una métrica</option>
                {metricsCatalog.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <Input label="Objetivo" type="number" min="0" step="0.01" value={form.target_value}
              onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Período</label>
            <select value={form.period_type} onChange={e => setForm(f => ({ ...f, period_type: e.target.value }))}
              className="w-full border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2">
              {Object.entries(PERIOD_TYPE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>

          {form.period_type === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Fecha de inicio" type="date" value={form.starts_at}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} required />
              <Input label="Fecha de fin" type="date" value={form.ends_at}
                onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} required />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ícono del camino</label>
            <select value={form.icon_style} onChange={e => setForm(f => ({ ...f, icon_style: e.target.value }))}
              className="w-full sm:w-64 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2">
              {ICON_STYLE_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>

          <MilestonesEditor milestones={form.milestones} onChange={(m) => setForm(f => ({ ...f, milestones: m }))} />

          {modal !== 'new' && (
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              Meta activa
            </label>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t dark:border-white/10">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function CrmSettingsPage() {
  // Permite enlazar directo a una pestaña (ej. el CTA de GoalPathWidget
  // cuando todavía no hay metas configuradas: /crm/settings?tab=goals).
  const [searchParams] = useSearchParams();
  const initialTab = TABS.some(t => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'stages';
  const [tab, setTab] = useState(initialTab);

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-accent to-accent-soft rounded-xl shadow-sm shadow-accent/30">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Configuración del CRM</h1>
            <p className="text-sm text-gray-500">Etapas, motivos de pérdida, plantillas de mensaje y metas — propios de tu negocio</p>
          </div>
        </div>

        <CrmSubNav />

        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${tab === t.key ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'stages' && <StagesTab />}
        {tab === 'reasons' && <LossReasonsTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'automations' && <AutomationRulesTab />}
        {tab === 'goals' && <GoalsTab />}
      </div>
    </Layout>
  );
}
