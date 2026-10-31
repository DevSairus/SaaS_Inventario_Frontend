import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import CrmSubNav from '../../components/crm/CrmSubNav';
import FollowUpMiniCalendar from '../../components/crm/FollowUpMiniCalendar';
import DealModal from '../../components/crm/DealModal';
import crmApi from '../../api/crm';
import customersApi from '../../api/customers';
import { notifyGoalMilestones } from '../../store/goalMilestoneStore';
import { usersAPI } from '../../api/users';
import useAuthStore from '../../store/authStore';
import useTenantStore from '../../store/tenantStore';
import { buildWaLink, bestPhone, trackWhatsAppInteraction } from '../../utils/whatsapp';
import {
  ListTodo, Check, X, Plus, MessageCircle, List, CalendarDays, Search, AlertTriangle, Flame,
  ChevronRight, ArrowUpRight,
} from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, addDays, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toLocalDateString } from '../../utils/formatters';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import CustomerSearchInput from '../../components/common/CustomerSearchInput';
import toast from 'react-hot-toast';

const GRADIENT_BG = 'bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600';
const GRADIENT_TEXT = `${GRADIENT_BG} bg-clip-text text-transparent`;
const DEFAULT_STAGE_COLOR = '#64748b';
const AVATAR_COLORS = ['bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];

const fmtDate = d => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// `due_at` se guarda como medianoche UTC (campo "solo fecha", mismo patrón
// documentado en utils/formatters.js). Para agrupar por día de calendario
// alcanza con tomar los primeros 10 caracteres del ISO string — no hace
// falta pasar por el huso horario local, que es justo lo que causa el
// corrimiento de un día en Bogotá (UTC-5).
const dayKeyOf = (due_at) => (due_at ? String(due_at).slice(0, 10) : null);
const dateOfKey = (key) => new Date(`${key}T00:00:00`);

const isOpenTask = (t) => ['pendiente', 'vencida'].includes(t.status);

const FILTERS = [
  { key: 'open', label: 'Pendientes' },
  { key: 'done', label: 'Completadas' },
  { key: 'all', label: 'Todas' },
];

// Grupos de urgencia de la vista de lista. `accent` pinta el borde izquierdo
// de las tarjetas del grupo; `dateCls` el chip de fecha relativa.
const GROUPS = [
  { key: 'overdue', label: 'Vencidas', dot: 'bg-red-500', labelCls: 'text-red-600', countCls: 'bg-red-50 text-red-600', accent: 'border-l-red-500', dateCls: 'bg-red-100 text-red-700 font-semibold' },
  { key: 'today', label: 'Hoy', dot: 'bg-orange-500', labelCls: GRADIENT_TEXT, countCls: 'bg-orange-50 text-orange-600', accent: 'border-l-orange-500', dateCls: 'bg-orange-100 text-orange-700 font-semibold' },
  { key: 'tomorrow', label: 'Mañana', dot: 'bg-blue-500', labelCls: 'text-gray-600', countCls: 'bg-gray-100 text-gray-500', accent: 'border-l-blue-500', dateCls: 'bg-gray-100 text-gray-600 font-medium' },
  { key: 'week', label: 'Esta semana', dot: 'bg-gray-400', labelCls: 'text-gray-600', countCls: 'bg-gray-100 text-gray-500', accent: 'border-l-gray-300', dateCls: 'bg-gray-100 text-gray-600 font-medium' },
  { key: 'later', label: 'Después', dot: 'bg-gray-300', labelCls: 'text-gray-500', countCls: 'bg-gray-100 text-gray-500', accent: 'border-l-gray-200', dateCls: 'bg-gray-100 text-gray-600 font-medium' },
  { key: 'closed', label: 'Completadas y canceladas', dot: 'bg-green-500', labelCls: 'text-gray-500', countCls: 'bg-gray-100 text-gray-500', accent: 'border-l-gray-200', dateCls: 'bg-gray-50 text-gray-400 font-medium' },
];
const GROUP_BY_KEY = Object.fromEntries(GROUPS.map(g => [g.key, g]));

function groupKeyOf(task, todayKey, tomorrowKey, weekEndKey) {
  if (!isOpenTask(task)) return 'closed';
  const key = dayKeyOf(task.due_at);
  if (task.status === 'vencida' || (key && key < todayKey)) return 'overdue';
  if (key === todayKey) return 'today';
  if (key === tomorrowKey) return 'tomorrow';
  if (key && key <= weekEndKey) return 'week';
  return 'later';
}

function relativeDateLabel(task, todayKey) {
  const key = dayKeyOf(task.due_at);
  if (!key) return '—';
  if (!isOpenTask(task)) return task.status === 'hecha' ? `Hecha · ${fmtDate(task.completed_at || task.due_at)}` : 'Cancelada';
  const diff = differenceInCalendarDays(dateOfKey(key), dateOfKey(todayKey));
  if (diff < -1) return `Venció hace ${-diff}d`;
  if (diff === -1) return 'Venció ayer';
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  return format(dateOfKey(key), 'EEE d MMM', { locale: es });
}

const normalizeSearch = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function customerName(c) {
  if (!c) return 'Cliente';
  return c.business_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Cliente';
}

function initialsOf(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

function avatarColor(name) {
  const sum = [...(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function FollowUpsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canAssignOthers = ['admin', 'manager', 'super_admin'].includes(user?.role);
  const hasCrm = (useTenantStore((s) => s.enabledModules) || []).includes('crm');

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [showClosed, setShowClosed] = useState(false);
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
  const tomorrowKey = toLocalDateString(addDays(new Date(), 1));
  const weekEndKey = toLocalDateString(addDays(new Date(), 7));

  const [createModal, setCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customer_id: '', title: '', due_at: '', assigned_to_user_id: '' });
  const [customers, setCustomers] = useState([]);
  const [advisors, setAdvisors] = useState([]);

  // Etapas del tenant — para pintar el chip del negocio con su color y nombre.
  const [stages, setStages] = useState([]);
  const stageByKey = useMemo(() => Object.fromEntries(stages.map(s => [s.key, s])), [stages]);
  const [dealOpp, setDealOpp] = useState(null);

  useEffect(() => {
    crmApi.listPipelineStages()
      .then(res => setStages(res.data.data || []))
      .catch(() => {});
  }, []);

  const openDeal = async (opportunityId) => {
    try {
      const res = await crmApi.getOpportunity(opportunityId);
      setDealOpp(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo abrir el negocio');
    }
  };

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

  // La lista trae todas las tareas y filtra en el cliente: así los contadores
  // de Pendientes/Completadas y las pastillas de resumen siempre cuadran.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.listFollowUps();
      setTasks(res.data.data || []);
    } catch {
      toast.error('Error cargando la bandeja de seguimiento');
    } finally {
      setLoading(false);
    }
  }, []);

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
        // Solo para hojear; el buscador consulta el servidor al escribir.
        const res = await customersApi.getAll({ limit: 50 });
        setCustomers(res.data.data || []);
      } catch { /* el buscador queda vacío si falla, no bloquea el modal */ }
    }
    if (canAssignOthers && advisors.length === 0) {
      try {
        const res = await usersAPI.getAll({ limit: 200, is_active: true, has_system_access: true });
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
      refreshAfterAction();
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
      const res = await crmApi.completeFollowUp(id);
      toast.success('Tarea marcada como hecha');
      // Gamificación §4 — followup_completed puede mover followups_completed.
      notifyGoalMilestones(res.data.gamification);
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

  const searchedTasks = useMemo(() => {
    const term = normalizeSearch(search.trim());
    if (!term) return tasks;
    return tasks.filter(t => normalizeSearch(`${t.title} ${customerName(t.customer)}`).includes(term));
  }, [tasks, search]);

  const groupedTasks = useMemo(() => {
    const map = Object.fromEntries(GROUPS.map(g => [g.key, []]));
    for (const t of searchedTasks) map[groupKeyOf(t, todayKey, tomorrowKey, weekEndKey)].push(t);
    // Las cerradas, de la más reciente a la más vieja.
    map.closed.reverse();
    return map;
  }, [searchedTasks, todayKey, tomorrowKey, weekEndKey]);

  const openCount = tasks.filter(isOpenTask).length;
  const closedCount = tasks.length - openCount;
  const overdueCount = tasks.filter(t => groupKeyOf(t, todayKey, tomorrowKey, weekEndKey) === 'overdue').length;
  const todayCount = tasks.filter(t => groupKeyOf(t, todayKey, tomorrowKey, weekEndKey) === 'today').length;
  const filterCounts = { open: openCount, done: closedCount, all: tasks.length };

  const visibleGroups = GROUPS.filter(g => {
    if (statusFilter === 'open') return g.key !== 'closed';
    if (statusFilter === 'done') return g.key === 'closed';
    return true;
  }).filter(g => groupedTasks[g.key].length > 0);

  const cardProps = {
    todayKey, stageByKey, busyId, waTemplates, waMenuTaskId, setWaMenuTaskId,
    onSendWaTemplate: handleSendWaTemplate, onComplete: handleComplete, onCancel: handleCancel,
    onOpenCustomer: (id) => navigate(`/customers/${id}`), onOpenDeal: openDeal,
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">

        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-accent to-accent-soft rounded-xl shadow-sm shadow-accent/30">
            <ListTodo className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Bandeja de seguimiento</h1>
            <p className="text-sm text-gray-500">Tareas de seguimiento asignadas a tu equipo</p>
          </div>
        </div>

        <CrmSubNav badges={{ followups: overdueCount }} />

        <div className="flex items-center gap-2 flex-wrap">
          {/* Fase A.2 — 2.4: alternar entre la lista de siempre y "Mi día" */}
          <div className="flex items-center gap-0.5 p-1 bg-gray-100 rounded-xl">
            {[['list', 'Lista', List], ['calendar', 'Mi día', CalendarDays]].map(([mode, label, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 !px-3 !py-1.5 rounded-lg !text-xs font-semibold transition ${
                  viewMode === mode ? `${GRADIENT_BG} text-white shadow-sm shadow-rose-500/30` : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-red-50 text-red-600 ring-1 ring-red-200">
              <AlertTriangle size={12} /> {overdueCount} {overdueCount === 1 ? 'vencida' : 'vencidas'}
            </span>
          )}
          <span className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ring-1 ${
            todayCount > 0 ? 'bg-orange-50 text-accent ring-orange-200' : 'bg-gray-50 text-gray-400 ring-gray-200'
          }`}>
            <Flame size={12} className={todayCount > 0 ? 'fill-orange-300' : ''} /> {todayCount} hoy
          </span>
          <button onClick={openCreate}
            className="group relative overflow-hidden ml-auto flex items-center gap-2.5 pl-2.5 pr-5 py-2.5 bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600 text-white rounded-2xl text-base font-semibold shadow-lg shadow-rose-500/30 ring-1 ring-white/20 hover:shadow-xl hover:shadow-fuchsia-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-out motion-reduce:transition-none">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-0 group-hover:translate-x-[300%] transition-transform duration-700 ease-out motion-reduce:hidden" />
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 group-hover:bg-white/30 transition-colors">
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300 ease-out" strokeWidth={2.5} />
            </span>
            <span className="relative whitespace-nowrap">Nueva tarea</span>
          </button>
        </div>

        {viewMode === 'list' ? (
          <>
            <div className="flex items-center gap-2 flex-wrap bg-white border border-gray-100 rounded-xl px-3 py-2">
              <div className="relative flex-1 min-w-[200px] sm:flex-none sm:w-64">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar cliente o tarea…" aria-label="Buscar tareas"
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-2 py-1 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15" />
              </div>
              {FILTERS.map(f => (
                <button key={f.key} type="button" onClick={() => setStatusFilter(f.key)} aria-pressed={statusFilter === f.key}
                  className={`!px-3 !py-1 rounded-full !text-xs transition whitespace-nowrap ${
                    statusFilter === f.key
                      ? `${GRADIENT_BG} text-white font-semibold shadow-sm shadow-rose-500/30`
                      : 'border border-gray-200 text-gray-600 font-medium hover:border-orange-300'
                  }`}>
                  {f.label}{f.key !== 'all' ? ` ${filterCounts[f.key]}` : ''}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : visibleGroups.length === 0 ? (
              <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
                <ListTodo size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-medium text-gray-600">
                  {search.trim() ? 'Ninguna tarea coincide con la búsqueda'
                    : statusFilter === 'open' ? 'Estás al día: no hay tareas pendientes'
                    : 'Sin tareas de seguimiento'}
                </p>
                {!search.trim() && statusFilter !== 'done' && (
                  <>
                    <p className="text-xs text-gray-400 mt-1 mb-4">Crea una tarea para no perder de vista a un cliente</p>
                    <button onClick={openCreate}
                      className={`inline-flex items-center gap-2 px-4 py-2 ${GRADIENT_BG} text-white rounded-xl text-sm font-medium shadow-sm shadow-rose-500/30 hover:shadow-md transition-all`}>
                      <Plus className="h-4 w-4" /> Nueva tarea
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {visibleGroups.map(group => {
                  const items = groupedTasks[group.key];
                  // En "Todas", las cerradas arrancan plegadas para no tapar lo pendiente.
                  const collapsible = group.key === 'closed' && statusFilter === 'all';
                  const expanded = !collapsible || showClosed;
                  return (
                    <section key={group.key}>
                      {collapsible ? (
                        <button type="button" onClick={() => setShowClosed(v => !v)} aria-expanded={expanded}
                          className="w-full flex items-center gap-2 !px-3 !py-2.5 rounded-xl border border-dashed border-gray-200 !text-xs font-semibold text-gray-500 hover:border-gray-300 hover:text-gray-700 transition">
                          <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
                          {group.label}
                          <span className={`text-[11px] rounded-full px-1.5 ${group.countCls}`}>{items.length}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <span className={`h-2 w-2 rounded-full ${group.dot}`} />
                          <span className={`text-xs font-bold uppercase tracking-wide ${group.labelCls}`}>{group.label}</span>
                          <span className={`text-[11px] font-semibold rounded-full px-1.5 ${group.countCls}`}>{items.length}</span>
                        </div>
                      )}
                      {expanded && (
                        <div className={`space-y-2 ${collapsible ? 'mt-2' : ''}`}>
                          {items.map(task => <TaskCard key={task.id} task={task} group={group} {...cardProps} />)}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </>
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
                    <TaskCard key={task.id} task={task}
                      group={GROUP_BY_KEY[groupKeyOf(task, todayKey, tomorrowKey, weekEndKey)]} {...cardProps} />
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

      <DealModal opportunity={dealOpp} stage={stageByKey[dealOpp?.stage]}
        onClose={() => setDealOpp(null)} onChanged={refreshAfterAction} />
    </Layout>
  );
}

// Tarjeta de tarea — la usan la lista por grupos y "Mi día" (Fase A.2 — 2.4).
// En escritorio las acciones aparecen al pasar el mouse; en celular siempre.
function TaskCard({ task, group, todayKey, stageByKey, busyId, waTemplates, waMenuTaskId, setWaMenuTaskId, onSendWaTemplate, onComplete, onCancel, onOpenCustomer, onOpenDeal }) {
  const isOpen = isOpenTask(task);
  const busy = busyId === task.id;
  const name = customerName(task.customer);
  const stage = task.opportunity ? stageByKey[task.opportunity.stage] : null;
  const stageColor = stage?.color || DEFAULT_STAGE_COLOR;
  const canMessage = isOpen && waTemplates.length > 0 && bestPhone(task.customer);

  return (
    <div className={`group bg-white border border-gray-100 border-l-[3px] ${group.accent} rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] hover:shadow-[0_4px_10px_-2px_rgba(15,15,15,0.08)] transition-shadow p-3 flex items-start sm:items-center gap-3 ${isOpen ? '' : 'opacity-70'}`}>
      {isOpen ? (
        <button type="button" onClick={() => onComplete(task.id)} disabled={busy}
          title="Marcar como hecha" aria-label={`Marcar "${task.title}" como hecha`}
          className="mt-0.5 sm:mt-0 flex-none h-5 w-5 !p-0 rounded-full border-2 border-gray-300 text-transparent flex items-center justify-center hover:border-green-500 hover:bg-green-50 hover:text-green-600 transition disabled:opacity-50">
          <Check size={11} strokeWidth={3} />
        </button>
      ) : (
        <span className={`mt-0.5 sm:mt-0 flex-none h-5 w-5 rounded-full flex items-center justify-center ${
          task.status === 'hecha' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          {task.status === 'hecha' ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
        </span>
      )}

      <div className={`hidden sm:flex flex-none w-8 h-8 rounded-full items-center justify-center text-[11px] font-bold text-white shadow-sm ${avatarColor(name)}`}>
        {initialsOf(name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold text-gray-800 leading-snug sm:truncate ${task.status === 'hecha' ? 'line-through decoration-gray-300' : ''}`}>{task.title}</p>
        <p className="text-xs text-gray-500 truncate">
          <button type="button" onClick={() => onOpenCustomer(task.customer_id)}
            className="!p-0 !text-xs font-medium hover:text-accent hover:underline">{name}</button>
          {task.assigned_to && <span> · {task.assigned_to.first_name} {task.assigned_to.last_name}</span>}
        </p>

        {/* En celular los chips y las acciones bajan debajo del título */}
        <div className="flex sm:hidden items-center gap-1.5 mt-2 flex-wrap">
          <TaskChips task={task} group={group} todayKey={todayKey} stage={stage} stageColor={stageColor} onOpenDeal={onOpenDeal} />
        </div>
        {isOpen && (
          <div className="flex sm:hidden gap-2 mt-2">
            {canMessage && (
              <TaskMessageButton task={task} waTemplates={waTemplates} waMenuTaskId={waMenuTaskId}
                setWaMenuTaskId={setWaMenuTaskId} onSendWaTemplate={onSendWaTemplate} mobile />
            )}
            <button type="button" onClick={() => onCancel(task.id)} disabled={busy}
              className="flex-1 flex items-center justify-center gap-1 !py-1.5 !px-2 rounded-lg !text-[11px] font-medium bg-gray-50 text-gray-500 hover:bg-gray-100 transition disabled:opacity-50">
              <X size={12} /> Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-1.5 flex-none">
        {isOpen && (
          <div className={`flex items-center gap-1.5 transition-opacity ${waMenuTaskId === task.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}>
            {canMessage && (
              <TaskMessageButton task={task} waTemplates={waTemplates} waMenuTaskId={waMenuTaskId}
                setWaMenuTaskId={setWaMenuTaskId} onSendWaTemplate={onSendWaTemplate} />
            )}
            <button type="button" onClick={() => onCancel(task.id)} disabled={busy}
              title="Cancelar tarea" aria-label={`Cancelar "${task.title}"`}
              className="h-7 w-7 !p-0 flex items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition disabled:opacity-50">
              <X size={13} />
            </button>
          </div>
        )}
        <TaskChips task={task} group={group} todayKey={todayKey} stage={stage} stageColor={stageColor} onOpenDeal={onOpenDeal} />
      </div>
    </div>
  );
}

function TaskChips({ task, group, todayKey, stage, stageColor, onOpenDeal }) {
  return (
    <>
      <span className={`px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap ${group.dateCls}`}>
        {relativeDateLabel(task, todayKey)}
      </span>
      {task.opportunity ? (
        <button type="button" onClick={() => onOpenDeal(task.opportunity.id)} title="Abrir el negocio"
          className="inline-flex items-center gap-1.5 !px-2 !py-0.5 rounded-full !text-[11px] font-medium border border-gray-200 text-gray-700 bg-white hover:border-gray-300 hover:text-gray-900 transition whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: stageColor }} />
          {stage?.label || task.opportunity.stage}
          <ArrowUpRight size={11} className="text-gray-400" />
        </button>
      ) : (
        <span className="text-[11px] text-gray-300 whitespace-nowrap">Sin negocio</span>
      )}
    </>
  );
}

function TaskMessageButton({ task, waTemplates, waMenuTaskId, setWaMenuTaskId, onSendWaTemplate, mobile = false }) {
  const open = waMenuTaskId === task.id;
  return (
    <div className={`relative ${mobile ? 'flex-1' : ''}`}>
      <button type="button" onClick={() => setWaMenuTaskId(id => id === task.id ? null : task.id)}
        title="Enviar mensaje" aria-label="Enviar mensaje por WhatsApp" aria-expanded={open}
        className={mobile
          ? 'w-full flex items-center justify-center gap-1 !py-1.5 !px-2 rounded-lg !text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition'
          : 'h-7 w-7 !p-0 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition'}>
        <MessageCircle size={13} />{mobile && ' Mensaje'}
      </button>
      {open && (
        <div className={`absolute top-9 z-10 w-48 bg-white border border-gray-100 rounded-lg shadow-lg py-1 ${mobile ? 'left-0' : 'right-0'}`}>
          {waTemplates.map(t => (
            <button key={t.id} type="button" onClick={() => onSendWaTemplate(task, t)}
              className="block w-full text-left !px-3 !py-1.5 !text-xs text-gray-700 hover:bg-gray-50 truncate">{t.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}
