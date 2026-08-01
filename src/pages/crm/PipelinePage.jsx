import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import CrmSubNav from '../../components/crm/CrmSubNav';
import crmApi from '../../api/crm';
import customersApi from '../../api/customers';
import { usersAPI } from '../../api/users';
import useAuthStore from '../../store/authStore';
import useTenantStore from '../../store/tenantStore';
import { buildWaLink, bestPhone, trackWhatsAppInteraction } from '../../utils/whatsapp';
import {
  Target, Plus, DollarSign, LayoutGrid, List, Clock, MessageCircle, Phone,
  Store, Users, Share2, Globe, RefreshCw, Megaphone, Inbox, Flame, FileText, Wrench,
  TrendingDown, SlidersHorizontal, X as XIcon,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import CustomerSearchInput from '../../components/common/CustomerSearchInput';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, TouchSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—';

// Fase B.4 — las etapas y motivos de pérdida ya no están hardcodeados: se
// cargan desde crmApi.listPipelineStages()/listLossReasons() (configurables
// por tenant en /crm/settings). Fallback por si el color no viene seteado.
const DEFAULT_STAGE_COLOR = '#64748b';

// Ícono por canal de origen — ayuda a escanear el tablero de un vistazo,
// sin tener que leer el texto de cada tarjeta.
const SOURCE_ICONS = {
  walk_in: Store,
  whatsapp: MessageCircle,
  llamada: Phone,
  referido: Users,
  redes: Share2,
  web: Globe,
  recompra_recurrente: RefreshCw,
  meta_ads: Megaphone,
};

const AVATAR_COLORS = ['bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];

// A.2.3 — celebración real al ganar una oportunidad (antes solo era un toast
// con emoji). Colores de marca (accent) + verde de "ganado", sin depender de
// nada más que canvas-confetti (2kb, sin dependencias).
function celebrateWin() {
  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 45,
    origin: { y: 0.7 },
    colors: ['#CF3A0B', '#F0572B', '#2FAE66'],
  });
}

// C.2 — "Oportunidad → cotización en un clic": arma la URL hacia el
// formulario de Ventas con lo que ya sabemos de la oportunidad, para que
// el asesor no tenga que volver a escribir cliente ni valor estimado.
// El backend (sales.controller.create) lee opportunity_id + document_type
// para vincular quote_sale_id y mover la etapa a 'cotizado' automáticamente.
function buildQuoteUrl(opp) {
  const params = new URLSearchParams({ opportunity_id: opp.id, customer_id: opp.customer_id });
  if (opp.expected_value > 0) params.set('expected_value', opp.expected_value);
  return `/sales/new?${params.toString()}`;
}

// C.3 — "Oportunidad → OT en un clic": mismo patrón que C.2, para tenants
// con Taller activo. El backend (workOrders.controller.create) lee
// opportunity_id para vincular work_order_id y mover la etapa.
function buildWorkOrderUrl(opp) {
  const params = new URLSearchParams({ opportunity_id: opp.id, customer_id: opp.customer_id });
  return `/workshop/work-orders/new?${params.toString()}`;
}

// Igual que canQuote: mientras siga abierta y no tenga ya una OT vinculada.
function canConvertToOT(opp, stageTypeByKey) {
  return !opp.work_order_id && stageTypeByKey[opp.stage] === 'open';
}

// Puede generarse una cotización mientras la oportunidad siga abierta y no
// tenga ya una cotización vinculada (evita duplicados accidentales).
// `stageTypeByKey` viene de las CrmPipelineStage del tenant (Fase B.4).
function canQuote(opp, stageTypeByKey) {
  return !opp.quote_sale_id && stageTypeByKey[opp.stage] === 'open';
}

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

// Prioridad visual: un lead recién llegado (primera etapa del embudo) sin
// contactar en horas es lo más urgente del tablero; una oportunidad
// estancada varios días en una etapa intermedia también merece llamar la
// atención. Cerradas (won/lost) no aplican.
// `stageTypeByKey`/`firstStageKey` vienen de las CrmPipelineStage del tenant.
function urgencyInfo(opp, stageTypeByKey, firstStageKey) {
  if (stageTypeByKey[opp.stage] !== 'open') return null;
  const hours = (Date.now() - new Date(opp.stage_changed_at).getTime()) / 3600000;
  if (opp.stage === firstStageKey) {
    if (hours >= 24) return { label: `Sin contactar ${Math.floor(hours / 24)}d`, cls: 'bg-red-100 text-red-700' };
    if (hours >= 2) return { label: `Sin contactar ${Math.floor(hours)}h`, cls: 'bg-amber-100 text-amber-700' };
    return null;
  }
  const days = hours / 24;
  if (days >= 5) return { label: `${Math.floor(days)}d sin mover`, cls: 'bg-red-100 text-red-700' };
  if (days >= 3) return { label: `${Math.floor(days)}d sin mover`, cls: 'bg-amber-100 text-amber-700' };
  return null;
}

// A.2.1 — antes usaba el `draggable` HTML5 nativo, que no dispara en touch
// (tablet/celular quedaban en solo-lectura). Ahora usa useDraggable de
// dnd-kit, que sí soporta puntero táctil vía TouchSensor (ver sensors más
// abajo). `overlay` indica que esta instancia es la que se pinta dentro de
// <DragOverlay> mientras se arrastra — no necesita listeners propios.
function OpportunityCard({ opp, accentColor, onOpen, onQuote, onWorkOrder, hasWorkshop, hasCrm, stageTypeByKey, firstStageKey, waTemplates, onSendWa, overlay }) {
  const name = customerName(opp.customer);
  const urgency = urgencyInfo(opp, stageTypeByKey, firstStageKey);
  const phone = bestPhone(opp.customer);
  const defaultWaText = `Hola ${name.split(' ')[0]}, te escribo sobre tu solicitud.`;
  const waLink = phone ? buildWaLink(phone, defaultWaText) : null;
  const SourceIcon = SOURCE_ICONS[opp.source] || Store;
  const showQuoteAction = canQuote(opp, stageTypeByKey);
  const showWorkOrderAction = hasWorkshop && canConvertToOT(opp, stageTypeByKey);
  const [waMenuOpen, setWaMenuOpen] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: opp.id, disabled: overlay });
  const dragProps = overlay ? {} : { ref: setNodeRef, ...attributes, ...listeners };

  return (
    <div
      {...dragProps}
      onClick={overlay ? undefined : onOpen}
      style={{ borderLeftColor: accentColor || DEFAULT_STAGE_COLOR }}
      className={`group relative bg-white border border-gray-100 border-l-[3px] rounded-lg p-3 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_1px_1px_rgba(15,15,15,0.03)] cursor-grab active:cursor-grabbing hover:shadow-[0_8px_16px_-4px_rgba(15,15,15,0.10),0_2px_4px_-2px_rgba(15,15,15,0.06)] hover:-translate-y-0.5 transition-all duration-200 touch-none ${
        isDragging && !overlay ? 'opacity-40 scale-95' : ''
      } ${overlay ? 'shadow-xl rotate-2 w-72' : ''}`}
    >
      {opp.priority_score >= 70 && (
        <div title="Prioridad alta — atender primero"
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-accent to-accent-soft flex items-center justify-center shadow-sm shadow-accent/40 ring-2 ring-white">
          <Flame size={11} className="text-white" />
        </div>
      )}
      <div className="flex items-start gap-2">
        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${avatarColor(name)}`}>
          {initialsOf(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
            <SourceIcon size={11} />
            <span className="capitalize truncate">{opp.source.replace(/_/g, ' ')}</span>
          </div>
        </div>
        {opp.expected_value > 0 && (
          <span className="flex-shrink-0 text-xs font-semibold text-gray-700">{COP(opp.expected_value)}</span>
        )}
      </div>

      {urgency && (
        <span className={`inline-flex items-center gap-1 mt-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${urgency.cls}`}>
          <Clock size={9} /> {urgency.label}
        </span>
      )}

      <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
        <span className="truncate">{opp.owner ? `${opp.owner.first_name} ${opp.owner.last_name}` : '—'}</span>
        {opp.expected_close_date && <span>{fmtDate(opp.expected_close_date)}</span>}
      </div>

      {opp.lost_reason && <p className="text-[11px] text-red-500 mt-1">Motivo: {opp.lost_reason.replace(/_/g, ' ')}</p>}
      {opp.quote_sale && <p className="text-[11px] text-accent font-medium mt-1">Cotización #{opp.quote_sale.sale_number}</p>}
      {opp.work_order && <p className="text-[11px] text-orange-500 font-medium mt-1">OT #{opp.work_order.order_number}</p>}

      {showQuoteAction && (
        <button
          type="button"
          draggable={false}
          onClick={e => { e.stopPropagation(); onQuote(); }}
          title="Generar cotización en Ventas y vincularla a esta oportunidad"
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium text-accent bg-accent/[0.06] border border-accent/15 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-accent/[0.12]"
        >
          <FileText size={11} /> Generar cotización
        </button>
      )}

      {showWorkOrderAction && (
        <button
          type="button"
          draggable={false}
          onClick={e => { e.stopPropagation(); onWorkOrder(); }}
          title="Crear orden de trabajo en Taller y vincularla a esta oportunidad"
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium text-orange-600 bg-orange-50 border border-orange-200 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-orange-100"
        >
          <Wrench size={11} /> Convertir a OT
        </button>
      )}

      {(waLink || phone) && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          {waLink && (
            waTemplates?.length ? (
              <div className="relative">
                <button type="button" draggable={false}
                  onClick={e => { e.stopPropagation(); setWaMenuOpen(o => !o); }}
                  title="Escribir por WhatsApp"
                  className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100">
                  <MessageCircle size={12} />
                </button>
                {waMenuOpen && (
                  <div onClick={e => e.stopPropagation()}
                    className="absolute right-0 top-7 z-10 w-44 bg-white border border-gray-100 rounded-lg shadow-lg py-1">
                    <a href={waLink} target="_blank" rel="noreferrer"
                      onClick={() => { setWaMenuOpen(false); trackWhatsAppInteraction(opp.customer_id, defaultWaText, hasCrm); }}
                      className="block px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">Mensaje por defecto</a>
                    {waTemplates.map(t => (
                      <button key={t.id} type="button" onClick={() => { setWaMenuOpen(false); onSendWa(opp, t); }}
                        className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 truncate">{t.name}</button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <a href={waLink} target="_blank" rel="noreferrer" draggable={false}
                onClick={e => { e.stopPropagation(); trackWhatsAppInteraction(opp.customer_id, defaultWaText, hasCrm); }}
                title="Escribir por WhatsApp"
                className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100">
                <MessageCircle size={12} />
              </a>
            )
          )}
          {phone && (
            <a href={`tel:${phone}`} draggable={false} onClick={e => e.stopPropagation()} title="Llamar"
              className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100">
              <Phone size={12} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="flex-shrink-0 w-72 rounded-xl border border-gray-100 bg-gray-50/60 p-2 space-y-2">
          <div className="h-9 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// A.2.1 — columna droppable de dnd-kit. Antes esta lógica vivía inline en
// PipelinePage con onDragOver/onDragLeave/onDrop nativos; ahora usa
// useDroppable, que sí participa del ciclo de eventos de dnd-kit (mouse y
// touch por igual) y nos da `isOver` gratis para el resaltado visual.
function KanbanColumn({ stage, items, isOver, navigate, hasWorkshop, hasCrm, stageTypeByKey, firstStageKey, waTemplates, onSendWa }) {
  const { setNodeRef } = useDroppable({ id: stage.key });
  const total = items.reduce((s, o) => s + parseFloat(o.expected_value || 0), 0);

  return (
    <div ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-xl border transition ${
        isOver ? 'border-accent/50 bg-accent/[0.04] ring-2 ring-accent/20' : 'border-gray-100 bg-gray-50/60'
      }`}>
      <div style={{ background: stage.color || DEFAULT_STAGE_COLOR }} className="rounded-t-xl px-3 py-2.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{stage.label}</span>
        <span className="text-xs font-medium text-white/80">{items.length}</span>
      </div>
      {total > 0 && (
        <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100 flex items-center gap-1">
          <DollarSign size={11} /> {COP(total)} estimado
        </div>
      )}
      <div className="p-2 space-y-2 min-h-[120px]">
        {items.map(opp => (
          <OpportunityCard
            key={opp.id}
            opp={opp}
            accentColor={stage.color}
            onOpen={() => navigate(`/customers/${opp.customer_id}`)}
            onQuote={() => navigate(buildQuoteUrl(opp))}
            onWorkOrder={() => navigate(buildWorkOrderUrl(opp))}
            hasWorkshop={hasWorkshop}
            hasCrm={hasCrm}
            stageTypeByKey={stageTypeByKey}
            firstStageKey={firstStageKey}
            waTemplates={waTemplates}
            onSendWa={onSendWa}
          />
        ))}
        {items.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-6">Sin oportunidades</p>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canFilterTeam = ['admin', 'manager', 'super_admin'].includes(user?.role);
  const enabledModules = useTenantStore((s) => s.enabledModules) || [];
  const hasWorkshop = enabledModules.includes('workshop');
  const hasCrm = enabledModules.includes('crm');

  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState('');
  const [advisors, setAdvisors] = useState([]);
  // A.2.7 — selección para acciones masivas en la vista de lista.
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  // A.2.1 — sensores dnd-kit: PointerSensor cubre mouse/trackpad (requiere
  // moverse 8px para activar, así un clic normal no se confunde con drag);
  // TouchSensor usa un pequeño "delay" de mantener presionado antes de
  // activar, para no pelear con el gesto de scroll horizontal del tablero
  // en tablet/celular (sin esto, cualquier swipe se interpretaría como drag).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );
  const [activeDragOpp, setActiveDragOpp] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list' | 'funnel'

  // A.2.5 — filtros combinables (antes solo existía el filtro por asesor).
  // Todo client-side sobre lo que ya trae listOpportunities, sin tocar el
  // controller — si el volumen por tenant crece mucho conviene moverlos a
  // query params del backend.
  const [sourceFilter, setSourceFilter] = useState('');
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [createModal, setCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customer_id: '', source: 'walk_in', expected_value: '', expected_close_date: '' });
  const [customers, setCustomers] = useState([]);
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ full_name: '', customer_type: 'individual', phone: '', email: '' });

  const [lostModal, setLostModal] = useState(null); // opportunity being moved a una etapa de tipo 'lost'
  const [lostReason, setLostReason] = useState('');
  const [pendingLostStage, setPendingLostStage] = useState(null);

  // Fase B.4 — etapas y motivos de pérdida configurables por tenant.
  const [stages, setStages] = useState([]);
  const [lossReasons, setLossReasons] = useState([]);
  // Fase B.3 — plantillas de WhatsApp disponibles para el botón rápido.
  const [waTemplates, setWaTemplates] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = ownerFilter ? { owner_user_id: ownerFilter } : {};
      const res = await crmApi.listOpportunities(params);
      setOpportunities(res.data.data || []);
    } catch {
      toast.error('Error cargando el pipeline');
    } finally {
      setLoading(false);
    }
  }, [ownerFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    crmApi.listPipelineStages()
      .then(res => setStages((res.data.data || []).slice().sort((a, b) => a.sort_order - b.sort_order)))
      .catch(() => toast.error('Error cargando las etapas del pipeline'));
    crmApi.listLossReasons()
      .then(res => setLossReasons(res.data.data || []))
      .catch(() => {});
    crmApi.listMessageTemplates({ channel: 'whatsapp' })
      .then(res => setWaTemplates(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (canFilterTeam) {
      usersAPI.getAll({ limit: 200, is_active: true })
        .then(res => setAdvisors((res.data?.users || []).filter(u => !['technician'].includes(u.role))))
        .catch(() => {});
    }
  }, [canFilterTeam]);

  const stageTypeByKey = useMemo(
    () => Object.fromEntries(stages.map(s => [s.key, s.stage_type])),
    [stages]
  );
  const firstStageKey = stages[0]?.key;

  // A.2.5 — lista filtrada por origen, prioridad y rango de fecha de
  // creación. Es la que alimenta las tres vistas (kanban/lista/embudo).
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(o => {
      if (sourceFilter && o.source !== sourceFilter) return false;
      if (priorityOnly && !(o.priority_score >= 70)) return false;
      if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(o.created_at) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [opportunities, sourceFilter, priorityOnly, dateFrom, dateTo]);

  const activeFilterCount = [sourceFilter, priorityOnly, dateFrom, dateTo].filter(Boolean).length;
  const clearFilters = () => { setSourceFilter(''); setPriorityOnly(false); setDateFrom(''); setDateTo(''); };

  const byStage = useMemo(() => {
    const grouped = Object.fromEntries(stages.map(s => [s.key, []]));
    filteredOpportunities.forEach(o => { if (grouped[o.stage]) grouped[o.stage].push(o); });
    return grouped;
  }, [filteredOpportunities, stages]);

  // A.2.2 — datos del embudo: cuántas oportunidades pasaron por cada etapa
  // (abiertas + que ya avanzaron más allá), para mostrar el "ancho" real del
  // embudo y no solo lo que hay hoy parado en cada columna. Se calcula sobre
  // el histórico visible (todas las oportunidades cargadas), no solo abiertas.
  const funnelData = useMemo(() => {
    const openStages = stages.filter(s => s.stage_type === 'open');
    const wonCount = filteredOpportunities.filter(o => stageTypeByKey[o.stage] === 'won').length;
    const rows = openStages.map((s, idx) => {
      // en esta etapa o más adelante en el embudo (incluye ganadas)
      const laterKeys = new Set(openStages.slice(idx).map(x => x.key));
      const count = filteredOpportunities.filter(o => laterKeys.has(o.stage) || stageTypeByKey[o.stage] === 'won').length;
      return { key: s.key, label: s.label, color: s.color || DEFAULT_STAGE_COLOR, count };
    });
    rows.push({ key: '__won', label: 'Ganadas', color: '#2FAE66', count: wonCount });
    const max = Math.max(1, ...rows.map(r => r.count));
    return rows.map((r, idx) => ({
      ...r,
      pct: max ? Math.round((r.count / max) * 100) : 0,
      dropPct: idx > 0 && rows[idx - 1].count > 0 ? Math.round((1 - r.count / rows[idx - 1].count) * 100) : null,
    }));
  }, [filteredOpportunities, stages, stageTypeByKey]);

  // Badge del ítem "Pipeline" en el sub-nav — solo cuenta con lo que ya está
  // en memoria (oportunidades en la primera etapa sin contactar hace rato),
  // no dispara una llamada extra a la API.
  const unattendedCount = useMemo(
    () => opportunities.filter(o => o.stage === firstStageKey && urgencyInfo(o, stageTypeByKey, firstStageKey)).length,
    [opportunities, stageTypeByKey, firstStageKey]
  );

  const handleSendWaTemplate = async (opp, template) => {
    try {
      const res = await crmApi.renderMessageTemplate(template.id, { customer_id: opp.customer_id, opportunity_id: opp.id });
      const phone = bestPhone(opp.customer);
      const text = res.data.data.text;
      const link = buildWaLink(phone, text);
      if (link) {
        window.open(link, '_blank', 'noreferrer');
        trackWhatsAppInteraction(opp.customer_id, text, hasCrm);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo generar el mensaje');
    }
  };

  const openCreate = async () => {
    setForm({ customer_id: '', source: 'walk_in', expected_value: '', expected_close_date: '' });
    setNewCustomerMode(false);
    setNewCustomerForm({ full_name: '', customer_type: 'individual', phone: '', email: '' });
    setCreateModal(true);
    if (customers.length === 0) {
      try {
        const res = await customersApi.getAll({ limit: 200, is_active: true });
        setCustomers(res.data.data || []);
      } catch { /* buscador queda vacío, no bloquea el modal */ }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    let customerId = form.customer_id;
    if (newCustomerMode) {
      if (!newCustomerForm.full_name.trim()) {
        toast.error('Escribe el nombre del cliente nuevo');
        return;
      }
    } else if (!customerId) {
      toast.error('Selecciona un cliente');
      return;
    }

    setSaving(true);
    try {
      if (newCustomerMode) {
        const res = await customersApi.create(newCustomerForm);
        customerId = res.data.data.id;
        setCustomers(c => [...c, res.data.data]);
      }

      await crmApi.createOpportunity({
        customer_id: customerId,
        source: form.source,
        expected_value: form.expected_value || null,
        expected_close_date: form.expected_close_date || null,
      });
      toast.success('Oportunidad creada');
      setCreateModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear la oportunidad');
    } finally { setSaving(false); }
  };

  const moveStage = async (opportunity, stage, lost_reason) => {
    try {
      await crmApi.updateOpportunityStage(opportunity.id, { stage, lost_reason });
      setOpportunities(prev => prev.map(o => o.id === opportunity.id ? { ...o, stage, lost_reason: lost_reason || null } : o));
      if (stageTypeByKey[stage] === 'won') {
        celebrateWin();
        toast.success('🎉 ¡Oportunidad ganada! Bien hecho.', { duration: 4000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo mover la oportunidad');
    }
  };

  const handleDrop = (stageKey, opp) => {
    if (!opp || opp.stage === stageKey) return;
    if (stageTypeByKey[opp.stage] !== 'open') {
      const label = stages.find(s => s.key === opp.stage)?.label || opp.stage;
      toast.error(`Esta oportunidad ya está cerrada (${label})`);
      return;
    }
    if (stageTypeByKey[stageKey] === 'lost') {
      setLostModal(opp);
      setPendingLostStage(stageKey);
      setLostReason('');
      return;
    }
    moveStage(opp, stageKey);
  };

  const handleDndDragStart = (event) => {
    setActiveDragOpp(opportunities.find(o => o.id === event.active.id) || null);
  };
  const handleDndDragOver = (event) => {
    setOverStage(event.over?.id || null);
  };
  const handleDndDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragOpp(null);
    setOverStage(null);
    if (!over) return;
    const opp = opportunities.find(o => o.id === active.id);
    handleDrop(over.id, opp);
  };

  const confirmLost = () => {
    if (!lostReason) {
      toast.error('Selecciona un motivo de pérdida');
      return;
    }
    moveStage(lostModal, pendingLostStage, lostReason);
    setLostModal(null);
  };

  // A.2.7 — acciones masivas sobre la vista de lista. Sin endpoint nuevo:
  // reutiliza updateOpportunity/updateOpportunityStage por cada oportunidad
  // seleccionada (Promise.all), igual que sugiere la propuesta original.
  // Se limita a etapas 'open'→'open' — mover a 'ganada'/'perdida' en bloque
  // queda fuera a propósito (perdida pide motivo por oportunidad, y ganada
  // dispara confetti que no tiene sentido repetir en cadena).
  const selectedOpps = filteredOpportunities.filter(o => selectedIds.has(o.id));
  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleSelectAll = () => setSelectedIds(prev => {
    const allSelected = filteredOpportunities.length > 0 && filteredOpportunities.every(o => prev.has(o.id));
    return allSelected ? new Set() : new Set(filteredOpportunities.map(o => o.id));
  });
  const clearSelection = () => setSelectedIds(new Set());

  const bulkMoveStage = async (stageKey) => {
    const movable = selectedOpps.filter(o => stageTypeByKey[o.stage] === 'open');
    const skipped = selectedOpps.length - movable.length;
    if (movable.length === 0) {
      toast.error('Ninguna de las seleccionadas se puede mover (ya están cerradas)');
      return;
    }
    setBulkBusy(true);
    try {
      await Promise.all(movable.map(o => crmApi.updateOpportunityStage(o.id, { stage: stageKey })));
      toast.success(`${movable.length} oportunidad(es) movidas${skipped ? ` — ${skipped} omitida(s) por estar cerradas` : ''}`);
      clearSelection();
      load();
    } catch {
      toast.error('Algunas oportunidades no se pudieron mover');
      load();
    } finally { setBulkBusy(false); }
  };

  const bulkReassign = async (userId) => {
    setBulkBusy(true);
    try {
      await Promise.all(selectedOpps.map(o => crmApi.updateOpportunity(o.id, { owner_user_id: userId })));
      toast.success(`${selectedOpps.length} oportunidad(es) reasignadas`);
      clearSelection();
      load();
    } catch {
      toast.error('Algunas oportunidades no se pudieron reasignar');
      load();
    } finally { setBulkBusy(false); }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-5">

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-accent to-accent-soft rounded-xl shadow-sm shadow-accent/30">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Pipeline comercial</h1>
              <p className="text-sm text-gray-500">
                {viewMode === 'kanban' ? 'Arrastra las tarjetas entre etapas' : 'Vista de lista — clic en una fila para ver el cliente'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CrmSubNav badges={{ pipeline: unattendedCount }} />
          <div className="flex items-center gap-2">
            {canFilterTeam && (
              <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Todo el equipo</option>
                {advisors.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            )}
            <div className="flex items-center p-0.5 bg-gray-100 rounded-lg">
              <button onClick={() => setViewMode('kanban')} title="Vista Kanban"
                className={`p-1.5 rounded-md transition ${viewMode === 'kanban' ? 'bg-white shadow-sm text-accent' : 'text-gray-400 hover:text-gray-600'}`}>
                <LayoutGrid size={16} />
              </button>
              <button onClick={() => setViewMode('list')} title="Vista de lista"
                className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-sm text-accent' : 'text-gray-400 hover:text-gray-600'}`}>
                <List size={16} />
              </button>
              <button onClick={() => setViewMode('funnel')} title="Vista de embudo"
                className={`p-1.5 rounded-md transition ${viewMode === 'funnel' ? 'bg-white shadow-sm text-accent' : 'text-gray-400 hover:text-gray-600'}`}>
                <TrendingDown size={16} />
              </button>
            </div>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-accent to-accent-soft text-white rounded-xl text-sm font-medium shadow-sm shadow-accent/30 hover:shadow-md hover:shadow-accent/40 hover:-translate-y-px transition-all">
              <Plus className="h-4 w-4" /> Nueva oportunidad
            </button>
          </div>
        </div>

        {/* A.2.5 — filtros combinables: origen, solo prioritarias, rango de fecha */}
        <div className="flex items-center gap-2 flex-wrap bg-white border border-gray-100 rounded-xl px-3 py-2">
          <SlidersHorizontal size={13} className="text-gray-400 flex-shrink-0" />
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600">
            <option value="">Todos los orígenes</option>
            {Object.keys(SOURCE_ICONS).map(key => (
              <option key={key} value={key}>{key.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer px-2 py-1 rounded-lg hover:bg-gray-50">
            <input type="checkbox" checked={priorityOnly} onChange={e => setPriorityOnly(e.target.checked)} />
            <Flame size={12} className="text-accent" /> Solo prioritarias
          </label>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>Creadas</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600" />
            <span>—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600" />
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-accent hover:underline ml-auto">
              <XIcon size={12} /> Limpiar filtros ({activeFilterCount})
            </button>
          )}
        </div>

        {loading || stages.length === 0 ? (
          viewMode === 'kanban' ? <KanbanSkeleton /> : (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          )
        ) : opportunities.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
            <Inbox size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-600">Todavía no hay oportunidades en el pipeline</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Crea la primera manualmente o conecta Meta Lead Ads para que entren solas</p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-accent to-accent-soft text-white rounded-xl text-sm font-medium shadow-sm shadow-accent/30 hover:shadow-md transition-all">
                <Plus className="h-4 w-4" /> Nueva oportunidad
              </button>
              <button onClick={() => navigate('/crm/settings/meta')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Conectar Meta Ads
              </button>
            </div>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
            <SlidersHorizontal size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-600">Ninguna oportunidad coincide con estos filtros</p>
            <button onClick={clearFilters} className="mt-3 text-xs text-accent hover:underline">Limpiar filtros</button>
          </div>
        ) : viewMode === 'funnel' ? (
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="space-y-3 max-w-2xl mx-auto">
              {funnelData.map((row, idx) => (
                <div key={row.key}>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span className="font-medium text-gray-700">{row.label}</span>
                    <span className="flex items-center gap-2">
                      {row.dropPct != null && row.dropPct > 0 && (
                        <span className="text-red-500">-{row.dropPct}%</span>
                      )}
                      <span className="font-semibold text-gray-700">{row.count}</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                    <div
                      className="h-8 rounded-full flex items-center justify-end px-3 transition-all duration-500"
                      style={{ width: `${Math.max(row.count > 0 ? 8 : 0, row.pct)}%`, background: row.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-6">
              % de caída calculado contra la etapa anterior del embudo, sobre las oportunidades cargadas con los filtros actuales.
            </p>
          </div>
        ) : viewMode === 'kanban' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDndDragStart}
            onDragOver={handleDndDragOver}
            onDragEnd={handleDndDragEnd}
            onDragCancel={() => { setActiveDragOpp(null); setOverStage(null); }}
          >
            <div className="flex gap-3 overflow-x-auto pb-4">
              {stages.map(stage => (
                <KanbanColumn
                  key={stage.key}
                  stage={stage}
                  items={byStage[stage.key] || []}
                  isOver={overStage === stage.key}
                  navigate={navigate}
                  hasWorkshop={hasWorkshop}
                  hasCrm={hasCrm}
                  stageTypeByKey={stageTypeByKey}
                  firstStageKey={firstStageKey}
                  waTemplates={waTemplates}
                  onSendWa={handleSendWaTemplate}
                />
              ))}
            </div>
            <DragOverlay>
              {activeDragOpp && (
                <OpportunityCard
                  opp={activeDragOpp}
                  accentColor={stages.find(s => s.key === activeDragOpp.stage)?.color}
                  hasWorkshop={hasWorkshop}
                  hasCrm={hasCrm}
                  stageTypeByKey={stageTypeByKey}
                  firstStageKey={firstStageKey}
                  waTemplates={waTemplates}
                  overlay
                />
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="space-y-2">
            {/* A.2.7 — barra de acciones masivas, solo visible con selección */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 flex-wrap bg-gray-900 text-white rounded-xl px-4 py-2.5 sticky top-0 z-10 shadow-lg">
                <span className="text-sm font-medium">{selectedIds.size} seleccionada{selectedIds.size === 1 ? '' : 's'}</span>
                <select disabled={bulkBusy} onChange={e => { if (e.target.value) { bulkMoveStage(e.target.value); e.target.value = ''; } }}
                  defaultValue="" className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs">
                  <option value="" disabled>Mover a etapa…</option>
                  {stages.filter(s => s.stage_type === 'open').map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
                {canFilterTeam && (
                  <select disabled={bulkBusy} onChange={e => { if (e.target.value) { bulkReassign(e.target.value); e.target.value = ''; } }}
                    defaultValue="" className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs">
                    <option value="" disabled>Reasignar a…</option>
                    {advisors.map(u => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                )}
                <button onClick={clearSelection} disabled={bulkBusy}
                  className="ml-auto flex items-center gap-1 text-xs text-gray-300 hover:text-white">
                  <XIcon size={12} /> Cancelar
                </button>
              </div>
            )}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5 w-8">
                    <input type="checkbox"
                      checked={filteredOpportunities.length > 0 && filteredOpportunities.every(o => selectedIds.has(o.id))}
                      onChange={toggleSelectAll} />
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium">Cliente</th>
                  <th className="text-left px-4 py-2.5 font-medium">Etapa</th>
                  <th className="text-left px-4 py-2.5 font-medium">Origen</th>
                  <th className="text-right px-4 py-2.5 font-medium">Valor</th>
                  <th className="text-left px-4 py-2.5 font-medium">Asesor</th>
                  <th className="text-left px-4 py-2.5 font-medium">Cierre esperado</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOpportunities.map(opp => {
                  const name = customerName(opp.customer);
                  const stageInfo = stages.find(s => s.key === opp.stage);
                  const urgency = urgencyInfo(opp, stageTypeByKey, firstStageKey);
                  const phone = bestPhone(opp.customer);
                  return (
                    <tr key={opp.id} onClick={() => navigate(`/customers/${opp.customer_id}`)}
                      className={`hover:bg-gray-50 cursor-pointer transition ${selectedIds.has(opp.id) ? 'bg-accent/[0.03]' : ''}`}>
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(opp.id)} onChange={() => toggleSelect(opp.id)} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 ${avatarColor(name)}`}>
                            {initialsOf(name)}
                          </div>
                          <span className="font-medium text-gray-800">{name}</span>
                          {opp.priority_score >= 70 && (
                            <Flame size={13} className="text-accent flex-shrink-0" />
                          )}
                          {urgency && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${urgency.cls}`}>{urgency.label}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span style={{ background: stageInfo?.color || DEFAULT_STAGE_COLOR }}
                          className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium text-white">
                          {stageInfo?.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 capitalize">{opp.source.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-700">{opp.expected_value > 0 ? COP(opp.expected_value) : '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{opp.owner ? `${opp.owner.first_name} ${opp.owner.last_name}` : '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{fmtDate(opp.expected_close_date)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          {canQuote(opp, stageTypeByKey) && (
                            <button type="button"
                              onClick={e => { e.stopPropagation(); navigate(buildQuoteUrl(opp)); }}
                              title="Generar cotización en Ventas y vincularla a esta oportunidad"
                              className="p-1.5 bg-accent/[0.08] text-accent rounded-full hover:bg-accent/[0.15] inline-flex">
                              <FileText size={12} />
                            </button>
                          )}
                          {hasWorkshop && canConvertToOT(opp, stageTypeByKey) && (
                            <button type="button"
                              onClick={e => { e.stopPropagation(); navigate(buildWorkOrderUrl(opp)); }}
                              title="Crear orden de trabajo en Taller y vincularla a esta oportunidad"
                              className="p-1.5 bg-orange-50 text-orange-600 rounded-full hover:bg-orange-100 inline-flex">
                              <Wrench size={12} />
                            </button>
                          )}
                          {phone && (
                            <a href={buildWaLink(phone, `Hola ${name.split(' ')[0]}, te escribo sobre tu solicitud.`)}
                              target="_blank" rel="noreferrer"
                              onClick={e => { e.stopPropagation(); trackWhatsAppInteraction(opp.customer_id, `Hola ${name.split(' ')[0]}, te escribo sobre tu solicitud.`, hasCrm); }}
                              title="Escribir por WhatsApp"
                              className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 inline-flex">
                              <MessageCircle size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Nueva oportunidad" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Cliente *</label>
              <button type="button" onClick={() => setNewCustomerMode(m => !m)}
                className="text-xs font-medium text-accent hover:underline">
                {newCustomerMode ? 'Buscar cliente existente' : '+ Cliente nuevo'}
              </button>
            </div>
            {newCustomerMode ? (
              <div className="space-y-3 border border-accent/15 bg-accent/[0.03] rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Input label="Nombre completo *" value={newCustomerForm.full_name}
                      onChange={e => setNewCustomerForm(f => ({ ...f, full_name: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select value={newCustomerForm.customer_type}
                      onChange={e => setNewCustomerForm(f => ({ ...f, customer_type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="individual">Persona Natural</option>
                      <option value="company">Empresa</option>
                    </select>
                  </div>
                  <Input label="Teléfono" value={newCustomerForm.phone}
                    onChange={e => setNewCustomerForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <Input label="Email" type="email" value={newCustomerForm.email}
                  onChange={e => setNewCustomerForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            ) : (
              <CustomerSearchInput customers={customers} value={form.customer_id}
                onChange={v => setForm(f => ({ ...f, customer_id: v }))} />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origen</label>
            <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="walk_in">Mostrador</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="llamada">Llamada</option>
              <option value="referido">Referido</option>
              <option value="redes">Redes sociales</option>
              <option value="web">Web</option>
              <option value="recompra_recurrente">Recompra recurrente</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor estimado" type="number" value={form.expected_value}
              onChange={e => setForm(f => ({ ...f, expected_value: e.target.value }))} />
            <Input label="Cierre esperado" type="date" value={form.expected_close_date}
              onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setCreateModal(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving}
              className="!bg-gradient-to-br !from-accent !to-accent-soft hover:!opacity-90 !shadow-sm !shadow-accent/30">
              {saving ? 'Guardando...' : 'Crear oportunidad'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!lostModal} onClose={() => setLostModal(null)} title="Motivo de pérdida" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ¿Por qué se perdió la oportunidad con <strong>{customerName(lostModal?.customer)}</strong>?
          </p>
          <div className="space-y-2">
            {lossReasons.map(r => (
              <label key={r.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="lost_reason" checked={lostReason === r.key}
                  onChange={() => setLostReason(r.key)} />
                {r.label}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setLostModal(null)}>Cancelar</Button>
            <Button type="button" variant="danger" onClick={confirmLost}>Confirmar pérdida</Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}