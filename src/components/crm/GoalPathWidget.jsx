// frontend/src/components/crm/GoalPathWidget.jsx
//
// CRM — Gamificación, Fase 3 (§5.1/§5.3). "Visual tipo camino/barra de
// progreso, con un ícono o personaje que avanza". Consume
// GET /crm/goals/progress (Fase 1, extendido en Fase 3 con `target_label`
// por entrada — ver goals.controller.js → attachTargetLabels). La meta
// `principal` se muestra grande arriba del dashboard; las `secundarias` en
// tarjetas más chicas debajo, a modo de refuerzo (§5.1). Cuando hay más de
// un vendedor/sede visible para una meta (board_visibility 'team'/'all'),
// las filas ordenadas por % funcionan como el tablero general sobrio que
// pide §5.3 — sin necesidad de una pantalla aparte.
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import crmApi from '../../api/crm';
import useAuthStore from '../../store/authStore';
import { Rocket, Flag, Trophy, Star, Car, Target, Users, Building2 } from 'lucide-react';

const ICON_BY_STYLE = { rocket: Rocket, flag: Flag, trophy: Trophy, star: Star, car: Car };

const AVATAR_COLORS = ['bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
function avatarColor(name) {
  const sum = [...(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
function initialsOf(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

const PERIOD_TYPE_LABEL = { weekly: 'Semanal', monthly: 'Mensual', custom: 'Campaña' };

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

function formatMetricValue(metric, value) {
  const n = Number(value) || 0;
  if (metric === 'revenue_won') return COP(n);
  if (metric === 'conversion_rate') return `${n.toFixed(0)}%`;
  return Math.round(n).toLocaleString('es-CO');
}

const MAX_ROWS_SHOWN = 6;

// Una fila del camino: avatar/ícono de sede + barra con marcas de hito +
// valor. `isSelf` resalta la fila del usuario actual dentro de un tablero
// compartido (§5.3), sin cambiar el orden.
function GoalRow({ goal, entry, metricLabel, isSelf }) {
  const clampedPercent = Math.min(100, Math.max(0, entry.percent || 0));
  const overTarget = entry.percent > 100;

  const label = goal.scope === 'tenant'
    ? goal.name
    : (entry.target_label || (goal.scope === 'branch' ? 'Sede' : 'Vendedor'));

  return (
    <div className={`flex items-center gap-3 py-2 ${isSelf ? 'bg-accent/5 -mx-2 px-2 rounded-lg' : ''}`}>
      {goal.scope === 'individual' ? (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${avatarColor(label)}`}>
          {initialsOf(label)}
        </div>
      ) : (
        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
          {goal.scope === 'branch'
            ? <Building2 size={13} className="text-gray-500 dark:text-gray-400" />
            : <Users size={13} className="text-gray-500 dark:text-gray-400" />}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={`text-xs truncate ${isSelf ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
            {isSelf ? 'Tú' : label}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0">
            {formatMetricValue(goal.metric, entry.current_value)} / {formatMetricValue(goal.metric, goal.target_value)} {metricLabel}
          </span>
        </div>
        <div className="relative h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${overTarget ? 'bg-emerald-500' : 'bg-accent'}`}
            style={{ width: `${clampedPercent}%` }}
          />
          {(goal.milestones || []).map((m, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-white/70 dark:bg-black/30"
              style={{ left: `${Math.min(100, m.percent)}%` }}
              title={`${m.percent}% — ${m.message || ''}`}
            />
          ))}
        </div>
      </div>

      <span className={`text-xs font-semibold flex-shrink-0 w-11 text-right ${overTarget ? 'text-emerald-600' : 'text-gray-700 dark:text-gray-300'}`}>
        {Math.round(entry.percent || 0)}%
      </span>
    </div>
  );
}

function GoalCard({ goal, metricLabel, currentUserId, big }) {
  const Icon = ICON_BY_STYLE[goal.icon_style] || Target;
  const sortedEntries = [...(goal.entries || [])].sort((a, b) => (b.percent || 0) - (a.percent || 0));
  const shown = sortedEntries.slice(0, MAX_ROWS_SHOWN);
  const extra = sortedEntries.length - shown.length;

  return (
    <div className={`bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] ${big ? 'p-5' : 'p-4'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`rounded-lg bg-gradient-to-br from-accent to-accent-soft flex items-center justify-center flex-shrink-0 ${big ? 'w-9 h-9' : 'w-7 h-7'}`}>
          <Icon size={big ? 18 : 14} className="text-white" />
        </div>
        <div className="min-w-0">
          <h3 className={`font-semibold text-gray-800 dark:text-gray-200 truncate ${big ? 'text-base' : 'text-sm'}`}>{goal.name}</h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {metricLabel} · {PERIOD_TYPE_LABEL[goal.period_type] || goal.period_type}
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-50 dark:divide-white/10 mt-2">
        {shown.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-3 text-center">Sin datos todavía en este período</p>
        ) : (
          shown.map(entry => (
            <GoalRow
              key={entry.target_id}
              goal={goal}
              entry={entry}
              metricLabel={metricLabel}
              isSelf={entry.target_id === currentUserId}
            />
          ))
        )}
      </div>

      {extra > 0 && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 text-right">+{extra} más</p>
      )}
    </div>
  );
}

export default function GoalPathWidget() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [goals, setGoals] = useState([]);
  const [metricsCatalog, setMetricsCatalog] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [progressRes, goalsRes] = await Promise.all([
        crmApi.getGoalsProgress(),
        crmApi.listGoals(),
      ]);
      setGoals(progressRes.data.data || []);
      setEnabled(progressRes.data.gamification_enabled !== false);
      setMetricsCatalog(goalsRes.data.metrics_catalog || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Confirma en tiempo real el progreso mostrado cuando el usuario vuelve
  // de otra pestaña/página tras completar una acción que mueve metas —
  // evita depender solo de la carga inicial del dashboard.
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Sin gamificación activa o falla el endpoint: no interrumpe el resto del
  // dashboard, simplemente no se muestra nada (mismo criterio que otros
  // bloques opcionales del dashboard, ej. forecast/campañas).
  if (error || !enabled) return null;

  const canManage = ['admin', 'manager', 'super_admin'].includes(user?.role);

  if (goals.length === 0) {
    if (!canManage) return null;
    return (
      <div className="bg-white dark:bg-graphite border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-5 text-center">
        <Trophy size={22} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Todavía no hay metas configuradas para el equipo</p>
        <button
          onClick={() => navigate('/crm/settings?tab=goals')}
          className="mt-2 text-xs text-accent hover:underline font-medium"
        >
          Configurar metas
        </button>
      </div>
    );
  }

  const metricLabelOf = (key) => metricsCatalog.find(m => m.key === key)?.label || key;
  const principal = goals.filter(g => g.goal_type === 'principal');
  const secondary = goals.filter(g => g.goal_type !== 'principal');

  return (
    <div className="space-y-4">
      {principal.map(goal => (
        <GoalCard key={goal.goal_id} goal={goal} metricLabel={metricLabelOf(goal.metric)} currentUserId={user?.id} big />
      ))}

      {secondary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {secondary.map(goal => (
            <GoalCard key={goal.goal_id} goal={goal} metricLabel={metricLabelOf(goal.metric)} currentUserId={user?.id} />
          ))}
        </div>
      )}
    </div>
  );
}
