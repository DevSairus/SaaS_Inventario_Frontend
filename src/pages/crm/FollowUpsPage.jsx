import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import CrmSubNav from '../../components/crm/CrmSubNav';
import FollowUpMiniCalendar from '../../components/crm/FollowUpMiniCalendar';
import crmApi from '../../api/crm';
import customersApi from '../../api/customers';
import { usersAPI } from '../../api/users';
import useAuthStore from '../../store/authStore';
import useTenantStore from '../../store/tenantStore';
import { buildWaLink, bestPhone, trackWhatsAppInteraction } from '../../utils/whatsapp';
import {
  ListTodo, Check, X, Clock, AlertTriangle, Plus, User as UserIcon, MessageCircle,
  List, CalendarDays,
} from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toLocalDateString } from '../../utils/formatters';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import CustomerSearchInput from '../../components/common/CustomerSearchInput';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// `due_at` se guarda como medianoche UTC (campo "solo fecha", mismo patrón
// documentado en utils/formatters.js). Para agrupar por día de calendario
// alcanza con tomar los primeros 10 caracteres del ISO string — no hace
// falta pasar por el huso horario local, que es justo lo que causa el
// corrimiento de un día en Bogotá (UTC-5).
const dayKeyOf = (due_at) => (due_at ? String(due_at).slice(0, 10) : null);

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', badge: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200', accent: 'border-l-blue-500' },
  vencida:   { label: 'Vencida',   badge: 'bg-red-100 text-red-700 ring-1 ring-red-200',    accent: 'border-l-red-500' },
  hecha:     { label: 'Hecha',     badge: 'bg-green-100 text-green-700 ring-1 ring-green-200', accent: 'border-l-green-500' },
  cancelada: { label: 'Cancelada', badge: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',  accent: 'border-l-gray-300' },
};

const FILTERS = [
  { key: '', label: 'Todas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'vencida', label: 'Vencidas' },
  { key: 'hecha', label: 'Hechas' },
  { key: 'cancelada', label: 'Canceladas' },
];

function customerName(c) {
  if (!c) return 'Cliente';
  return c.business_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Cliente';
}

export default function FollowUpsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canAssignOthers = ['admin', 'manager', 'super_admin'].includes(user?.role);
  const hasCrm = (useTenantStore((s) => s.enabledModules) || []).includes('crm');

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Fase A.2 — 2.4: segundo modo de vista, "Mi día". Vive aparte del filtro
  // de lista (statusFilter) porque el calendario siempre trae el mes
  // completo sin filtrar por estado — el estado se ve por color de punto.
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [calendarTasks, setCalendarTasks] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const todayKey = toLocalDateString(new Date());

  const [createModal, setCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customer_id: '', title: '', due_at: '', assigned_to_user_id: '' });
  const [customers, setCustomers] = useState([]);
  const [advisors, setAdvisors] = useState([]);

  // Fase B.3 — plantillas de WhatsApp disponibles para el botón "Enviar mensaje".
  const [waTemplates, setWaTemplates] = useState([]);
  const [waMenuTaskId, setWaMenuTaskId] = useState(null);

  useEffect(() => {
    crmApi.listMessageTemplates({ channel: 'whatsapp' })
      .then(res => setWaTemplates(res.data.data || []))
      .catch(() => {});
  }, []);

  const handleSendWaTemplate = async (task, template) => {
    setWaMenuTaskId(null);
    try {
      const res = await crmApi.renderMessageTemplate(template.id, {
        customer_id: task.customer_id,
        opportunity_id: task.opportunity?.id,
      });
      const phone = bestPhone(task.customer);
      const text = res.data.data.text;
      const link = buildWaLink(phone, text);
      if (link) {
        window.open(link, '_blank', 'noreferrer');
        trackWhatsAppInteraction(task.customer_id, text, hasCrm);
      }
      else toast.error('Este cliente no tiene un teléfono registrado');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo generar el mensaje');
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await crmApi.listFollowUps(params);
      setTasks(res.data.data || []);
    } catch {
      toast.error('Error cargando la bandeja de seguimiento');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Trae todas las tareas (sin filtrar por estado) de la grilla visible del
  // mini-calendario — incluye los días de otro mes que completan la semana,
  // para que también muestren su punto de color.
  const loadCalendarMonth = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const from = format(startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const to = format(endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const res = await crmApi.listFollowUps({ from, to });
      setCalendarTasks(res.data.data || []);
    } catch {
      toast.error('Error cargando el calendario de seguimiento');
    } finally {
      setCalendarLoading(false);
    }
  }, [calendarMonth]);

  useEffect(() => {
    if (viewMode === 'calendar') loadCalendarMonth();
  }, [viewMode, loadCalendarMonth]);

  const tasksByDay = useMemo(() => {
    const map = new Map();
    for (const t of calendarTasks) {
      const key = dayKeyOf(t.due_at);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return map;
  }, [calendarTasks]);

  const selectedDayKey = selectedDay ? toLocalDateString(selectedDay) : null;
  const selectedDayTasks = selectedDayKey ? (tasksByDay.get(selectedDayKey) || []) : [];

  const openCreate = async () => {
    setForm({ customer_id: '', title: '', due_at: '', assigned_to_user_id: '' });
    setCreateModal(true);
    if (customers.length === 0) {
      try {
        const res = await customersApi.getAll({ limit: 200, is_active: true });
        setCustomers(res.data.data || []);
      } catch { /* el buscador queda vacío si falla, no bloquea el modal */ }
    }
    if (canAssignOthers && advisors.length === 0) {
      try {
        const res = await usersAPI.getAll({ limit: 200, is_active: true });
        setAdvisors((res.data?.users || []).filter(u => !['technician'].includes(u.role)));
      } catch { /* idem */ }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.customer_id || !form.title.trim() || !form.due_at) {
      toast.error('Cliente, título y fecha son requeridos');
      return;
    }
    setSaving(true);
    try {
      await crmApi.createFollowUp({
        customer_id: form.customer_id,
        title: form.title,
        due_at: form.due_at,
        assigned_to_user_id: form.assigned_to_user_id || undefined,
      });
      toast.success('Tarea de seguimiento creada');
      setCreateModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear la tarea');
    } finally { setSaving(false); }
  };

  // Refresca la vista de lista y, si está activa, también el mes visible del
  // calendario — para que no quede desactualizado al alternar entre vistas.
  const refreshAfterAction = () => {
    load();
    if (viewMode === 'calendar') loadCalendarMonth();
  };

  const handleComplete = async (id) => {
    setBusyId(id);
    try {
      await crmApi.completeFollowUp(id);
      toast.success('Tarea marcada como hecha');
      refreshAfterAction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar la tarea');
    } finally { setBusyId(null); }
  };

  const handleCancel = async (id) => {
    setBusyId(id);
    try {
      await crmApi.cancelFollowUp(id);
      toast.success('Tarea cancelada');
      refreshAfterAction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cancelar la tarea');
    } finally { setBusyId(null); }
  };

  const counts = tasks.reduce((acc, t) => ({ ...acc, [t.status]: (acc[t.status] || 0) + 1 }), {});

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-accent to-accent-soft rounded-xl shadow-sm shadow-accent/30">
              <ListTodo className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Bandeja de seguimiento</h1>
              <p className="text-sm text-gray-500">Tareas de seguimiento asignadas a tu equipo</p>
            </div>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-accent to-accent-soft text-white rounded-xl text-sm font-medium shadow-sm shadow-accent/30 hover:shadow-md transition-all">
            <Plus className="h-4 w-4" /> Nueva tarea
          </button>
        </div>

        <CrmSubNav badges={{ followups: counts.vencida || 0 }} />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {viewMode === 'list' ? (
            <div className="flex items-center gap-2 flex-wrap">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    statusFilter === f.key ? 'bg-gradient-to-br from-accent to-accent-soft text-white shadow-sm shadow-accent/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {f.label}{f.key && counts[f.key] ? ` (${counts[f.key]})` : ''}
                </button>
              ))}
            </div>
          ) : <div />}

          {/* Fase A.2 — 2.4: alternar entre la lista de siempre y "Mi día" */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <List size={13} /> Lista
            </button>
            <button onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                viewMode === 'calendar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <CalendarDays size={13} /> Mi día
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
              <ListTodo size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm font-medium text-gray-600">
                Sin tareas de seguimiento{statusFilter ? ` (${STATUS_CONFIG[statusFilter]?.label.toLowerCase()})` : ''}
              </p>
              {!statusFilter && (
                <>
                  <p className="text-xs text-gray-400 mt-1 mb-4">Crea una tarea para no perder de vista a un cliente</p>
                  <button onClick={openCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-accent to-accent-soft text-white rounded-xl text-sm font-medium shadow-sm shadow-accent/30 hover:shadow-md transition-all">
                    <Plus className="h-4 w-4" /> Nueva tarea
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <TaskCard key={task.id} task={task} navigate={navigate} busyId={busyId}
                  waTemplates={waTemplates} waMenuTaskId={waMenuTaskId} setWaMenuTaskId={setWaMenuTaskId}
                  onSendWaTemplate={handleSendWaTemplate} onComplete={handleComplete} onCancel={handleCancel} />
              ))}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 items-start">
            <FollowUpMiniCalendar
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              tasksByDay={tasksByDay}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              todayKey={todayKey}
            />

            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-800 capitalize px-1">
                {selectedDay ? format(selectedDay, "EEEE d 'de' MMMM", { locale: es }) : 'Selecciona un día'}
                {selectedDayKey === todayKey && <span className="ml-2 text-xs font-medium text-accent">Hoy</span>}
              </p>

              {calendarLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
              ) : selectedDayTasks.length === 0 ? (
                <div className="text-center py-10 bg-white border border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-500">Sin tareas para este día</p>
                  <button onClick={openCreate}
                    className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition">
                    <Plus className="h-3.5 w-3.5" /> Nueva tarea
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayTasks.map(task => (
                    <TaskCard key={task.id} task={task} navigate={navigate} busyId={busyId}
                      waTemplates={waTemplates} waMenuTaskId={waMenuTaskId} setWaMenuTaskId={setWaMenuTaskId}
                      onSendWaTemplate={handleSendWaTemplate} onComplete={handleComplete} onCancel={handleCancel} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Nueva tarea de seguimiento" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <CustomerSearchInput customers={customers} value={form.customer_id}
              onChange={v => setForm(f => ({ ...f, customer_id: v }))} />
          </div>
          <Input label="Título *" value={form.title} placeholder="¿Qué hay que hacer?"
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Input label="Fecha límite *" type="date" value={form.due_at}
            onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))} required />
          {canAssignOthers && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a</label>
              <select value={form.assigned_to_user_id}
                onChange={e => setForm(f => ({ ...f, assigned_to_user_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="">A mí mismo</option>
                {advisors.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setCreateModal(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving}
              className="!bg-gradient-to-br !from-accent !to-accent-soft hover:!opacity-90 !shadow-sm !shadow-accent/30">
              {saving ? 'Guardando...' : 'Crear tarea'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}

// Tarjeta de tarea — extraída para que la vista de lista y la de "Mi día"
// (Fase A.2 — 2.4) rendericen exactamente lo mismo sin duplicar el JSX.
function TaskCard({ task, navigate, busyId, waTemplates, waMenuTaskId, setWaMenuTaskId, onSendWaTemplate, onComplete, onCancel }) {
  const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.pendiente;
  const isOpen = ['pendiente', 'vencida'].includes(task.status);
  return (
    <div className={`bg-white border border-gray-100 border-l-[3px] ${sc.accent} rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] hover:shadow-[0_4px_10px_-2px_rgba(15,15,15,0.08)] transition-shadow p-4 flex items-center justify-between gap-3 flex-wrap`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.badge}`}>{sc.label}</span>
          {task.status === 'vencida' && <AlertTriangle size={13} className="text-red-500" />}
          <span className="text-sm font-semibold text-gray-800 truncate">{task.title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          <button onClick={() => navigate(`/customers/${task.customer_id}`)} className="hover:text-accent hover:underline font-medium">
            {customerName(task.customer)}
          </button>
          <span className="flex items-center gap-1"><Clock size={12} /> {fmtDate(task.due_at)}</span>
          {task.assigned_to && (
            <span className="flex items-center gap-1"><UserIcon size={12} /> {task.assigned_to.first_name} {task.assigned_to.last_name}</span>
          )}
          {task.opportunity && (
            <span className="text-accent font-medium">Oportunidad: {task.opportunity.stage}</span>
          )}
        </div>
      </div>
      {isOpen && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {waTemplates.length > 0 && bestPhone(task.customer) && (
            <div className="relative">
              <button onClick={() => setWaMenuTaskId(id => id === task.id ? null : task.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition">
                <MessageCircle size={13} /> Enviar mensaje
              </button>
              {waMenuTaskId === task.id && (
                <div className="absolute right-0 top-9 z-10 w-48 bg-white border border-gray-100 rounded-lg shadow-lg py-1">
                  {waTemplates.map(t => (
                    <button key={t.id} type="button" onClick={() => onSendWaTemplate(task, t)}
                      className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 truncate">{t.name}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={() => onComplete(task.id)} disabled={busyId === task.id}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition disabled:opacity-50">
            <Check size={13} /> Hecha
          </button>
          <button onClick={() => onCancel(task.id)} disabled={busyId === task.id}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg text-xs font-medium hover:bg-gray-100 transition disabled:opacity-50">
            <X size={13} /> Cancelar
          </button>
        </div>
      )}
    </div>
  );
}