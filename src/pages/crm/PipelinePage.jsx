import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import CrmSubNav from '../../components/crm/CrmSubNav';
import crmApi from '../../api/crm';
import { usersAPI } from '../../api/users';
import useAuthStore from '../../store/authStore';
import useTenantStore from '../../store/tenantStore';
import { buildWaLink, bestPhone, trackWhatsAppInteraction } from '../../utils/whatsapp';
import {
  Target, Plus, LayoutGrid, List, Clock, MessageCircle, Phone,
  Store, Users, Share2, Globe, RefreshCw, Megaphone, Inbox, Flame, FileText, Wrench,
  TrendingDown, SlidersHorizontal, X as XIcon, Maximize2, ArrowLeft, Search,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import NewDealModal from '../../components/crm/NewDealModal';
import DealModal from '../../components/crm/DealModal';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { notifyGoalMilestones } from '../../store/goalMilestoneStore';
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  MouseSensor, TouchSensor, useSensor, useSensors, closestCenter, MeasuringStrategy,
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

const NEW_DEAL_MESSAGES = [
  '¡Nuevo negocio en marcha! 🔥',
  '¡Eso es! Otro negocio al tablero 🚀',
  '¡Vas con toda! 💪',
  '¡Un paso más cerca de tu meta! 🎯',
];

function celebrateNewDeal(buttonEl) {
  const rect = buttonEl?.getBoundingClientRect();
  const origin = rect
    ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }
    : { y: 0.3 };
  confetti({
    particleCount: 60,
    spread: 55,
    startVelocity: 30,
    scalar: 0.9,
    origin,
    colors: ['#F97316', '#F43F5E', '#C026D3'],
    disableForReducedMotion: true,
  });
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

const MAX_VISIBLE_CARDS = 10;
const CHIP_DROP_PREFIX = 'chip:';
const stageKeyOf = (dropId) => String(dropId).replace(CHIP_DROP_PREFIX, '');
const normalizeSearch = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
const GRADIENT_BG = 'bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600';
const GRADIENT_TEXT = `${GRADIENT_BG} bg-clip-text text-transparent`;

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
      className={`group relative bg-white border border-gray-100 border-l-[3px] rounded-lg p-3 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_1px_1px_rgba(15,15,15,0.03)] cursor-grab active:cursor-grabbing hover:shadow-[0_8px_16px_-4px_rgba(15,15,15,0.10),0_2px_4px_-2px_rgba(15,15,15,0.06)] hover:-translate-y-0.5 transition-all duration-200 touch-manipulation ${
        isDragging && !overlay ? 'opacity-40 scale-95' : ''
      } ${overlay ? 'shadow-xl rotate-2 w-72' : ''}`}
    >
      {opp.priority_score >= 70 && (
        <div title="Prioridad alta — atender primero"
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-accent to-accent-soft flex items-center justify-center shadow-sm shadow-accent/40 ring-2 ring-white">
          <Flame size={11} className="text-white" />
        </div>
      )}
      <div className={`flex items-center gap-2.5 ${waLink || phone ? 'pr-14 lg:pr-0 lg:group-hover:pr-14' : ''}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm ${avatarColor(name)}`}>
          {initialsOf(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
            <SourceIcon size={11} />
            <span className="capitalize truncate">{opp.source.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 min-w-0">
        {opp.expected_value > 0
          ? <span className={`text-base font-extrabold tabular-nums truncate ${GRADIENT_TEXT}`}>{COP(opp.expected_value)}</span>
          : <span className="text-xs italic text-gray-400">Sin cotizar</span>}
        {urgency && (
          <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${urgency.cls}`}>
            <Clock size={9} /> {urgency.label}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-gray-400">
        <span className="truncate">
          {opp.owner ? `${opp.owner.first_name} ${opp.owner.last_name}` : '—'}
          {opp.expected_close_date && ` · ${fmtDate(opp.expected_close_date)}`}
        </span>
        {opp.quote_sale && (
          <span title={`Cotización #${opp.quote_sale.sale_number}`} className="flex items-center gap-1 min-w-0 font-medium text-gray-500">
            <FileText size={11} className="flex-shrink-0" />
            <span className="truncate max-w-[110px]">{opp.quote_sale.sale_number}</span>
          </span>
        )}
      </div>

      {opp.lost_reason && <p className="text-[11px] text-red-500 mt-1">Motivo: {opp.lost_reason.replace(/_/g, ' ')}</p>}
      {opp.work_order && <p className="text-[11px] text-orange-500 font-medium mt-1">OT #{opp.work_order.order_number}</p>}

      {(showQuoteAction || showWorkOrderAction) && (
        // Sin hover (táctil) las acciones quedan siempre visibles; en escritorio se despliegan sin reservar espacio.
        <div className="grid grid-rows-[1fr] lg:grid-rows-[0fr] lg:group-hover:grid-rows-[1fr] lg:group-focus-within:grid-rows-[1fr] transition-[grid-template-rows] duration-200 motion-reduce:transition-none">
          <div className="overflow-hidden">
            <div className="flex gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100">
              {showQuoteAction && (
                <button
                  type="button"
                  draggable={false}
                  onClick={e => { e.stopPropagation(); onQuote(); }}
                  title="Generar cotización y vincularla a esta oportunidad"
                  className={`flex-1 min-w-0 truncate !px-2 !py-1.5 rounded-md !text-[11px] font-semibold text-white ${GRADIENT_BG} hover:opacity-90 transition-opacity`}
                >
                  Cotizar
                </button>
              )}
              {showWorkOrderAction && (
                <button
                  type="button"
                  draggable={false}
                  onClick={e => { e.stopPropagation(); onWorkOrder(); }}
                  title="Crear orden de trabajo en Taller y vincularla a esta oportunidad"
                  className="flex-1 min-w-0 truncate !px-2 !py-1.5 rounded-md !text-[11px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Convertir a OT
                </button>
              )}
            </div>
          </div>
        </div>
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

// Chip de etapa: navega a la etapa y además es destino de drop, para mover
// un negocio cuando solo se ve una etapa (celular o modo enfoque).
function StageChip({ stage, count, active, isOver, onSelect }) {
  const { setNodeRef } = useDroppable({ id: `${CHIP_DROP_PREFIX}${stage.key}` });
  const color = stage.color || DEFAULT_STAGE_COLOR;
  return (
    <button ref={setNodeRef} type="button" onClick={() => onSelect(stage.key)} aria-pressed={active}
      className={`flex-none flex items-center gap-1.5 !px-3 !py-1.5 rounded-full !text-xs whitespace-nowrap border transition ${
        active
          ? `${GRADIENT_BG} text-white font-semibold border-transparent shadow-sm shadow-rose-500/30`
          : 'bg-white text-gray-600 font-medium border-gray-200 hover:border-gray-300'
      } ${isOver ? 'ring-2 ring-offset-1 ring-accent scale-105' : ''}`}>
      <span className="h-2 w-2 rounded-full" style={{ background: active ? '#fff' : color }} />
      {stage.label}
      <span className={`rounded-full px-1.5 text-[10px] font-semibold ${active ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
    </button>
  );
}

function StageBar({ stages, byStage, activeKey, overStage, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stages.map(stage => (
        <StageChip key={stage.key} stage={stage} count={(byStage[stage.key] || []).length}
          active={stage.key === activeKey} isOver={overStage === stage.key} onSelect={onSelect} />
      ))}
    </div>
  );
}

// A.2.1 — columna droppable de dnd-kit. Antes esta lógica vivía inline en
// PipelinePage con onDragOver/onDragLeave/onDrop nativos; ahora usa
// useDroppable, que sí participa del ciclo de eventos de dnd-kit (mouse y
// touch por igual) y nos da `isOver` gratis para el resaltado visual.
function KanbanColumn({ stage, items, collapsed, limit, onFocus, isOver, navigate, onOpenDeal, hasWorkshop, hasCrm, stageTypeByKey, firstStageKey, waTemplates, onSendWa }) {
  const { setNodeRef } = useDroppable({ id: stage.key });
  const total = items.reduce((s, o) => s + parseFloat(o.expected_value || 0), 0);
  const visibleItems = limit ? items.slice(0, limit) : items;
  const hiddenCount = items.length - visibleItems.length;

  if (collapsed) {
    return (
      <div ref={setNodeRef} title={`${stage.label}: sin negocios`}
        style={{ borderTopColor: stage.color || DEFAULT_STAGE_COLOR }}
        className="flex-none w-12 flex flex-col items-center gap-2 py-3 rounded-xl border border-gray-100 border-t-[3px] bg-gray-50/60">
        <span className="h-2 w-2 rounded-full" style={{ background: stage.color || DEFAULT_STAGE_COLOR }} />
        <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-1.5 py-0.5">0</span>
        <span className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap text-xs font-semibold text-gray-500">{stage.label}</span>
      </div>
    );
  }

  return (
    <div ref={setNodeRef}
      /* sm:[max-width] en vez de sm:max-w-*: index.css le mete margen a todo [class*="max-w-"] en celular */
      className={`w-full flex-none snap-start sm:w-auto sm:flex-1 sm:basis-0 sm:min-w-[240px] sm:[max-width:360px] flex flex-col rounded-xl border transition ${
        isOver ? 'border-accent/50 bg-accent/[0.04] ring-2 ring-accent/20' : 'border-gray-100 bg-gray-50/60'
      }`}>
      <div style={{ borderTopColor: stage.color || DEFAULT_STAGE_COLOR }}
        className="rounded-t-xl bg-white border-t-[3px] border-b border-b-gray-100 px-3 pt-2.5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: stage.color || DEFAULT_STAGE_COLOR }} />
            <span className="text-sm font-semibold text-gray-800 truncate">{stage.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{items.length}</span>
            {onFocus && (
              <button type="button" onClick={onFocus} title={`Abrir ${stage.label} a todo el ancho`} aria-label={`Enfocar ${stage.label}`}
                className="hidden sm:inline-flex !p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                <Maximize2 size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5 min-w-0">
          <span className={`text-lg font-extrabold tabular-nums truncate ${total > 0 ? GRADIENT_TEXT : 'text-gray-300'}`}>{COP(total)}</span>
          <span className="text-[11px] text-gray-400">estimado</span>
        </div>
      </div>
      <div className="flex-1 min-h-[120px] p-2 space-y-2">
        {visibleItems.map(opp => (
          <OpportunityCard
            key={opp.id}
            opp={opp}
            accentColor={stage.color}
            onOpen={() => onOpenDeal(opp)}
            onQuote={() => onOpenDeal(opp, true)}
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
        {hiddenCount > 0 && onFocus && (
          <button type="button" onClick={onFocus}
            className="w-full rounded-lg border border-dashed border-gray-300 bg-white py-2 text-xs font-semibold text-gray-600 hover:border-rose-300 hover:text-rose-600 transition">
            Ver todos (+{hiddenCount})
          </button>
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
  const newDealButtonRef = useRef(null);
  const [justCreated, setJustCreated] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState('');
  const [advisors, setAdvisors] = useState([]);
  // A.2.7 — selección para acciones masivas en la vista de lista.
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  // A.2.1 — sensores dnd-kit: MouseSensor cubre mouse/trackpad (requiere
  // moverse 8px para activar, así un clic normal no se confunde con drag);
  // TouchSensor usa un pequeño "delay" de mantener presionado antes de
  // activar, para no pelear con el gesto de scroll horizontal del tablero
  // en tablet/celular. Se usa MouseSensor y no PointerSensor porque este
  // último también escucha toques y arrancaba el drag en vez del swipe.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );
  const [activeDragOpp, setActiveDragOpp] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list' | 'funnel'
  const isMobile = useMediaQuery('(max-width: 639px)');
  const [focusStage, setFocusStage] = useState(null); // escritorio: etapa abierta a todo el ancho
  const [mobileStage, setMobileStage] = useState(null); // celular: etapa visible en el carrusel
  const boardRef = useRef(null);

  // A.2.5 — filtros combinables (antes solo existía el filtro por asesor).
  // Todo client-side sobre lo que ya trae listOpportunities, sin tocar el
  // controller — si el volumen por tenant crece mucho conviene moverlos a
  // query params del backend.
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  // Ganadas/perdidas: solo las cerradas en esta ventana (días). Las abiertas
  // siempre se ven; las cerradas crecen sin fin y el tablero las descargaba
  // todas. '' = todas.
  const [closedWindow, setClosedWindow] = useState('90');
  const [dateTo, setDateTo] = useState('');

  const [createModal, setCreateModal] = useState(false);
  const [dealOpp, setDealOpp] = useState(null);
  const [dealStartCreate, setDealStartCreate] = useState(false);
  const openDeal = (opp, startCreate = false) => { setDealStartCreate(startCreate); setDealOpp(opp); };

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
      if (closedWindow) params.closed_days = closedWindow;
      const res = await crmApi.listOpportunities(params);
      setOpportunities(res.data.data || []);
    } catch {
      toast.error('Error cargando el pipeline');
    } finally {
      setLoading(false);
    }
  }, [ownerFilter, closedWindow]);

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
      usersAPI.getAll({ limit: 200, is_active: true, has_system_access: true })
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
    const term = normalizeSearch(search.trim());
    const termDigits = term.replace(/\D/g, '');
    return opportunities.filter(o => {
      if (term) {
        const c = o.customer || {};
        const text = normalizeSearch(`${customerName(c)} ${o.quote_sale?.sale_number || ''}`);
        const phones = `${c.mobile || ''} ${c.phone || ''}`.replace(/\D/g, '');
        if (!text.includes(term) && !(termDigits.length >= 3 && phones.includes(termDigits))) return false;
      }
      if (sourceFilter && o.source !== sourceFilter) return false;
      if (priorityOnly && !(o.priority_score >= 70)) return false;
      if (dateFrom && new Date(o.createdAt) < new Date(dateFrom + 'T00:00:00')) return false;
      if (dateTo && new Date(o.createdAt) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [opportunities, search, sourceFilter, priorityOnly, dateFrom, dateTo]);

  const activeFilterCount = [search.trim(), sourceFilter, priorityOnly, dateFrom, dateTo].filter(Boolean).length;
  const clearFilters = () => { setSearch(''); setSourceFilter(''); setPriorityOnly(false); setDateFrom(''); setDateTo(''); };

  const byStage = useMemo(() => {
    const grouped = Object.fromEntries(stages.map(s => [s.key, []]));
    filteredOpportunities.forEach(o => { if (grouped[o.stage]) grouped[o.stage].push(o); });
    return grouped;
  }, [filteredOpportunities, stages]);

  const focusedStage = stages.find(s => s.key === focusStage) || null;
  const focusedItems = focusedStage ? byStage[focusedStage.key] || [] : [];
  const focusedTotal = focusedItems.reduce((s, o) => s + parseFloat(o.expected_value || 0), 0);

  // A.2.2 — datos del embudo: cuántas oportunidades pasaron por cada etapa
  // (abiertas + que ya avanzaron más allá), para mostrar el "ancho" real del
  // embudo y no solo lo que hay hoy parado en cada columna. Se calcula sobre
  // el histórico visible (todas las oportunidades cargadas), no solo abiertas.
  // Las ganadas cuentan solo dentro de la ventana de "Cerradas" elegida.
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

  const createdTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return opportunities.filter(o =>
      o.owner_user_id === user?.id && new Date(o.createdAt).toDateString() === today
    ).length;
  }, [opportunities, user?.id]);

  useEffect(() => {
    if (!justCreated) return;
    const t = setTimeout(() => setJustCreated(false), 1200);
    return () => clearTimeout(t);
  }, [justCreated]);

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

  const openCreate = () => setCreateModal(true);

  const handleCreated = ({ quoteCreated }) => {
    setCreateModal(false);
    if (quoteCreated) {
      const total = createdTodayCount + 1;
      const message = NEW_DEAL_MESSAGES[Math.floor(Math.random() * NEW_DEAL_MESSAGES.length)];
      toast.success(`${message} Llevas ${total} ${total === 1 ? 'negocio' : 'negocios'} hoy.`, { duration: 3500 });
      celebrateNewDeal(newDealButtonRef.current);
      setJustCreated(true);
    }
    load();
    // El backend mueve la oportunidad a "Cotizado" en un setImmediate tras
    // responder la cotización, así que la primera recarga puede llegar antes.
    setTimeout(load, 1500);
  };

  const moveStage = async (opportunity, stage, lost_reason) => {
    try {
      const res = await crmApi.updateOpportunityStage(opportunity.id, { stage, lost_reason });
      setOpportunities(prev => prev.map(o => o.id === opportunity.id ? { ...o, stage, lost_reason: lost_reason || null } : o));
      if (stageTypeByKey[stage] === 'won') {
        celebrateWin();
        toast.success('🎉 ¡Oportunidad ganada! Bien hecho.', { duration: 4000 });
        // Gamificación §4 — si el cierre cruzó un milestone de alguna meta
        // activa, el banner de celebración se encarga de mostrarlo (no
        // reemplaza el toast de arriba, es un reconocimiento aparte).
        notifyGoalMilestones(res.data.gamification);
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
    setOverStage(event.over ? stageKeyOf(event.over.id) : null);
  };
  const handleDndDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragOpp(null);
    setOverStage(null);
    if (!over) return;
    const opp = opportunities.find(o => o.id === active.id);
    handleDrop(stageKeyOf(over.id), opp);
  };

  // Celular: la etapa activa sale de la posición del carrusel (cada etapa
  // ocupa el ancho completo + el gap de 12px).
  const handleBoardScroll = () => {
    const el = boardRef.current;
    if (!el || !isMobile) return;
    const idx = Math.round(el.scrollLeft / (el.clientWidth + 12));
    setMobileStage(stages[idx]?.key || null);
  };
  const goToMobileStage = (key) => {
    const el = boardRef.current;
    const idx = stages.findIndex(s => s.key === key);
    if (!el || idx < 0) return;
    el.scrollTo({ left: idx * (el.clientWidth + 12), behavior: 'smooth' });
    setMobileStage(key);
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
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Negocios en curso</h1>
              <p className="text-sm text-gray-500">
                {viewMode === 'kanban' ? 'Arrastra las tarjetas entre etapas' : 'Vista de lista — clic en una fila para ver el cliente'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CrmSubNav badges={{ pipeline: unattendedCount }} />
          <div className="flex items-center gap-2 flex-wrap">
            {canFilterTeam && (
              <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Todo el equipo</option>
                {advisors.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-0.5 p-1 bg-gray-100 rounded-xl">
              {[['kanban', 'Vista Kanban', LayoutGrid], ['list', 'Vista de lista', List], ['funnel', 'Vista de embudo', TrendingDown]].map(([mode, title, Icon]) => (
                <button key={mode} onClick={() => setViewMode(mode)} title={title} aria-label={title}
                  className={`!p-1.5 rounded-lg transition ${viewMode === mode ? `${GRADIENT_BG} text-white shadow-sm shadow-rose-500/30` : 'text-gray-400 hover:text-gray-600'}`}>
                  <Icon size={16} />
                </button>
              ))}
            </div>
            <span title="Negocios que has creado hoy"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 ease-out motion-reduce:transition-none ${
                createdTodayCount > 0 ? 'bg-orange-50 text-accent ring-1 ring-orange-200' : 'bg-gray-50 text-gray-400 ring-1 ring-gray-200'
              } ${justCreated ? 'scale-125 ring-2 ring-accent/40' : 'scale-100'}`}>
              <Flame size={14} className={createdTodayCount > 0 ? 'fill-orange-300' : ''} />
              {createdTodayCount} hoy
            </span>
            <button ref={newDealButtonRef} onClick={openCreate}
              className="group relative overflow-hidden flex items-center gap-2.5 pl-2.5 pr-5 py-2.5 bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600 text-white rounded-2xl text-base font-semibold shadow-lg shadow-rose-500/30 ring-1 ring-white/20 hover:shadow-xl hover:shadow-fuchsia-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 ease-out motion-reduce:transition-none">
              <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-0 group-hover:translate-x-[300%] transition-transform duration-700 ease-out motion-reduce:hidden" />
              <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 group-hover:bg-white/30 transition-colors">
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300 ease-out" strokeWidth={2.5} />
              </span>
              <span className="relative whitespace-nowrap">Nuevo negocio</span>
            </button>
          </div>
        </div>

        {/* A.2.5 — filtros combinables: origen, solo prioritarias, rango de fecha */}
        <div className="flex items-center gap-2 flex-wrap bg-white border border-gray-100 rounded-xl px-3 py-2">
          <div className="relative flex-1 min-w-[200px] sm:flex-none sm:w-64">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente, teléfono o cotización…" aria-label="Buscar negocios"
              className="w-full border border-gray-200 rounded-lg pl-8 pr-2 py-1 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15" />
          </div>
          <SlidersHorizontal size={13} className="text-gray-400 flex-shrink-0" />
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600">
            <option value="">Todos los orígenes</option>
            {Object.keys(SOURCE_ICONS).map(key => (
              <option key={key} value={key}>{key.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button type="button" onClick={() => setPriorityOnly(p => !p)} aria-pressed={priorityOnly}
            className={`flex items-center gap-1.5 !px-3 !py-1 rounded-full text-xs transition ${
              priorityOnly
                ? `${GRADIENT_BG} text-white font-semibold shadow-sm shadow-rose-500/30`
                : 'border border-gray-200 text-gray-600 font-medium hover:border-orange-300'
            }`}>
            <Flame size={12} className={priorityOnly ? 'text-white' : 'text-accent'} /> Solo prioritarias
          </button>
          <select value={closedWindow} onChange={e => setClosedWindow(e.target.value)}
            title="Ganadas y perdidas a mostrar (las abiertas se ven siempre)"
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600">
            <option value="30">Cerradas: últimos 30 días</option>
            <option value="90">Cerradas: últimos 90 días</option>
            <option value="365">Cerradas: último año</option>
            <option value="">Cerradas: todas</option>
          </select>
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
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
                <Plus className="h-4 w-4" /> Nuevo negocio
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
            /* Las columnas vacías se expanden al iniciar el arrastre; hay que volver a medirlas. */
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            onDragStart={handleDndDragStart}
            onDragOver={handleDndDragOver}
            onDragEnd={handleDndDragEnd}
            onDragCancel={() => { setActiveDragOpp(null); setOverStage(null); }}
          >
            {(isMobile || focusedStage) && (
              <div className="mb-3">
                <StageBar stages={stages} byStage={byStage} overStage={overStage}
                  activeKey={isMobile ? (mobileStage || stages[0]?.key) : focusedStage.key}
                  onSelect={isMobile ? goToMobileStage : setFocusStage} />
              </div>
            )}
            {focusedStage && !isMobile ? (
              <div className="rounded-xl border border-gray-100 bg-gray-50/60">
                <div style={{ borderTopColor: focusedStage.color || DEFAULT_STAGE_COLOR }}
                  className="rounded-t-xl bg-white border-t-[3px] border-b border-b-gray-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button type="button" onClick={() => setFocusStage(null)}
                      className="flex items-center gap-1.5 !px-2.5 !py-1.5 rounded-lg border border-gray-200 !text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
                      <ArrowLeft size={13} /> Ver tablero
                    </button>
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: focusedStage.color || DEFAULT_STAGE_COLOR }} />
                    <span className="text-base font-semibold text-gray-800 truncate">{focusedStage.label}</span>
                    <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{focusedItems.length}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-extrabold tabular-nums ${focusedTotal > 0 ? GRADIENT_TEXT : 'text-gray-300'}`}>{COP(focusedTotal)}</span>
                    <span className="text-[11px] text-gray-400">estimado</span>
                  </div>
                </div>
                {focusedItems.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-12">Sin negocios en esta etapa</p>
                ) : (
                  <div className="p-3 grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                    {focusedItems.map(opp => (
                      <OpportunityCard
                        key={opp.id}
                        opp={opp}
                        accentColor={focusedStage.color}
                        onOpen={() => openDeal(opp)}
                        onQuote={() => openDeal(opp, true)}
                        onWorkOrder={() => navigate(buildWorkOrderUrl(opp))}
                        hasWorkshop={hasWorkshop}
                        hasCrm={hasCrm}
                        stageTypeByKey={stageTypeByKey}
                        firstStageKey={firstStageKey}
                        waTemplates={waTemplates}
                        onSendWa={handleSendWaTemplate}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div ref={boardRef} onScroll={handleBoardScroll} className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none">
                {stages.map(stage => (
                  <KanbanColumn
                    key={stage.key}
                    stage={stage}
                    items={byStage[stage.key] || []}
                    collapsed={!isMobile && !activeDragOpp && !(byStage[stage.key] || []).length}
                    limit={isMobile ? null : MAX_VISIBLE_CARDS}
                    onFocus={() => setFocusStage(stage.key)}
                    isOver={overStage === stage.key}
                    navigate={navigate}
                    onOpenDeal={openDeal}
                    hasWorkshop={hasWorkshop}
                    hasCrm={hasCrm}
                    stageTypeByKey={stageTypeByKey}
                    firstStageKey={firstStageKey}
                    waTemplates={waTemplates}
                    onSendWa={handleSendWaTemplate}
                  />
                ))}
              </div>
            )}
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
                    <tr key={opp.id} onClick={() => openDeal(opp)}
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
                              onClick={e => { e.stopPropagation(); openDeal(opp, true); }}
                              title="Generar cotización y vincularla a esta oportunidad"
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

      <NewDealModal isOpen={createModal} onClose={() => setCreateModal(false)} onCreated={handleCreated} />

      <DealModal opportunity={dealOpp} stage={stages.find(s => s.key === dealOpp?.stage)} startInCreate={dealStartCreate}
        onClose={() => setDealOpp(null)} onChanged={() => { load(); setTimeout(load, 1500); }} />

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