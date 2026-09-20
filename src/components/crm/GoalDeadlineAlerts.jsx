// frontend/src/components/crm/GoalDeadlineAlerts.jsx
//
// CRM — Gamificación, Fase 6. Ver gamificacion-crm-diseno.md §15. Banner
// destacado con las metas propias cuyo período está por vencer y cuánto le
// falta al asesor para alcanzarlas. Complementa (no reemplaza) la campana
// de CrmNotifications: la campana es para enterarse de pasada, este banner
// es para no poder ignorarlo al entrar al dashboard.
//
// Consume el mismo GET /crm/goals/progress... no: usa GET /crm/goals/alerts
// (goals.controller.js → getGoalAlerts), que ya resuelve "mis propios
// targets" (individual/sede/tenant) y aplica el criterio de urgencia
// relativo a la duración del período (utils/crmGoalAlerts.js) — el
// componente solo pinta lo que el backend ya decidió que es urgente.
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import crmApi from '../../api/crm';
import { AlertTriangle, Flag, Clock, ChevronDown, ChevronUp, X } from 'lucide-react';

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

function formatMetricValue(metric, value) {
  if (value == null) return null;
  const n = Number(value) || 0;
  if (metric === 'revenue_won') return COP(n);
  if (metric === 'conversion_rate') return `${n.toFixed(0)}%`;
  return Math.round(n).toLocaleString('es-CO');
}

const PERIOD_NOUN = { weekly: 'la semana', monthly: 'el mes', custom: 'la campaña' };

function AlertRow({ alert, onGoTo }) {
  const isCritical = alert.urgency === 'critica';
  const remaining = formatMetricValue(alert.metric, alert.remaining_value);

  return (
    <button
      onClick={onGoTo}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
        isCritical
          ? 'bg-red-50/70 hover:bg-red-50 dark:bg-red-900/20 dark:hover:bg-red-900/30'
          : 'bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-900/15 dark:hover:bg-amber-900/25'
      }`}
    >
      <div className={`p-1.5 rounded-full flex-shrink-0 ${
        isCritical
          ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
          : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300'
      }`}>
        {isCritical ? <AlertTriangle size={14} /> : <Clock size={14} />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {alert.name}
          {alert.goal_type === 'principal' && (
            <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/10 text-accent align-middle">Principal</span>
          )}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {remaining
            ? `Te faltan ${remaining} para cumplir ${PERIOD_NOUN[alert.period_type] || 'el período'}`
            : `Vas en ${Math.round(alert.percent)}% de cumplimiento`}
        </p>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className={`text-xs font-bold ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {alert.days_remaining === 0 ? 'Vence hoy' : `${alert.days_remaining} día${alert.days_remaining === 1 ? '' : 's'}`}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">{Math.round(alert.percent)}% hecho</p>
      </div>
    </button>
  );
}

const DISMISS_KEY = 'crm_goal_alerts_dismissed_at';
const DISMISS_TTL_MS = 4 * 60 * 60 * 1000; // 4h — reaparece en la próxima sesión larga, no se pierde para siempre

export default function GoalDeadlineAlerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState(null); // null = todavía no cargó
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await crmApi.getGoalAlerts();
      setAlerts(res.data.gamification_enabled === false ? [] : (res.data.data || []));
    } catch {
      setAlerts([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw && Date.now() - parseInt(raw, 10) < DISMISS_TTL_MS) setDismissed(true);
    } catch {
      // localStorage puede fallar en modo incógnito; sin persistencia, no pasa nada grave
    }
  }, []);

  if (!alerts || alerts.length === 0 || dismissed) return null;

  const critical = alerts.filter(a => a.urgency === 'critica');
  const high = alerts.filter(a => a.urgency !== 'critica');
  const shown = expanded ? alerts : alerts.slice(0, 3);
  const hiddenCount = alerts.length - shown.length;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignorar */ }
  };

  return (
    <div className="bg-white dark:bg-graphite border border-amber-200 dark:border-amber-800/40 rounded-xl p-3.5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Flag size={14} className="text-amber-600 dark:text-amber-400" />
          <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
            {critical.length > 0
              ? `${critical.length} meta${critical.length === 1 ? '' : 's'} por vencer`
              : `${high.length} meta${high.length === 1 ? '' : 's'} entrando en la recta final`}
          </h2>
        </div>
        <button onClick={dismiss} title="Ocultar por ahora" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10">
          <X size={13} className="text-gray-400" />
        </button>
      </div>

      <div className="space-y-1.5">
        {shown.map(alert => (
          <AlertRow key={alert.goal_id} alert={alert} onGoTo={() => navigate('/crm/dashboard')} />
        ))}
      </div>

      {alerts.length > 3 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-center gap-1 mt-1.5 py-1 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          {expanded ? <><ChevronUp size={12} /> Ver menos</> : <><ChevronDown size={12} /> Ver {hiddenCount} más</>}
        </button>
      )}
    </div>
  );
}