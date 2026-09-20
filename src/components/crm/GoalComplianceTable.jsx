// frontend/src/components/crm/GoalComplianceTable.jsx
//
// CRM — Gamificación, Fase 4 (§6). "Cumplimiento de metas": la vista de
// decisiones del admin. A diferencia de GoalPathWidget (§5.1, que celebra
// el avance de hoy), acá la pregunta es otra — qué tan cerca está cada
// vendedor/sede de su meta, cómo viene respecto del período anterior y qué
// tan seguido cumple. Consume GET /crm/goals/compliance, que ya devuelve
// solo los targets visibles para el usuario (mismo resolveVisibleTargets
// que /goals/progress), así que acá no se reimplementa ninguna regla de
// visibilidad: un vendedor ve su propio histórico, un manager el de sus
// sedes, admin/super_admin todo.
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import crmApi from '../../api/crm';
import useAuthStore from '../../store/authStore';
import {
  ClipboardCheck, TrendingUp, TrendingDown, Minus, RefreshCw, Download,
  ChevronDown, ChevronRight, Flame, Building2, Users, Inbox,
} from 'lucide-react';

const PERIOD_TYPE_LABEL = { weekly: 'Semanal', monthly: 'Mensual', custom: 'Campaña' };

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

// Mismo criterio de formato que GoalPathWidget, para que el mismo número no
// se vea distinto en dos bloques del mismo dashboard.
function formatMetricValue(metric, value) {
  if (value == null) return '—';
  const n = Number(value) || 0;
  if (metric === 'revenue_won') return COP(n);
  if (metric === 'conversion_rate') return `${n.toFixed(0)}%`;
  return Math.round(n).toLocaleString('es-CO');
}

const fmtPeriod = (start, end) => {
  const opts = { day: '2-digit', month: 'short' };
  const s = new Date(`${start}T12:00:00`).toLocaleDateString('es-CO', opts);
  const e = new Date(`${end}T12:00:00`).toLocaleDateString('es-CO', opts);
  return `${s} – ${e}`;
};

const fmtPeriodShort = (start) => new Date(`${start}T12:00:00`)
  .toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

function percentClass(percent) {
  if (percent == null) return 'text-gray-400 dark:text-gray-500';
  if (percent >= 100) return 'text-emerald-600 dark:text-emerald-400';
  if (percent >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

// Franja de períodos cerrados: un cuadrito por período, verde cumplido /
// rojo no cumplido / gris sin dato. Es el "histórico de períodos cerrados
// (cumplidos / no cumplidos)" de §6, en el espacio de una celda.
function HistoryStrip({ history, metric }) {
  if (!history || history.length === 0) return <span className="text-xs text-gray-300">—</span>;
  return (
    <div className="flex items-center gap-1">
      {history.map((h) => {
        const cls = h.percent == null
          ? 'bg-gray-100 dark:bg-white/10'
          : h.achieved
            ? 'bg-emerald-400'
            : 'bg-red-300 dark:bg-red-400/70';
        return (
          <span
            key={h.period_start}
            title={`${fmtPeriodShort(h.period_start)}${h.is_current ? ' (en curso)' : ''} — ${
              h.percent == null ? 'sin datos' : `${Math.round(h.percent)}% · ${formatMetricValue(metric, h.current_value)}`
            }`}
            className={`h-4 w-2.5 rounded-sm ${cls} ${h.is_current ? 'ring-1 ring-accent ring-offset-1 dark:ring-offset-graphite' : ''}`}
          />
        );
      })}
    </div>
  );
}

function TrendCell({ trend, delta }) {
  if (trend == null) {
    return <span className="text-[11px] text-gray-300 dark:text-gray-600">Sin comparación</span>;
  }
  const map = {
    up: { Icon: TrendingUp, cls: 'text-emerald-600 dark:text-emerald-400' },
    down: { Icon: TrendingDown, cls: 'text-red-500 dark:text-red-400' },
    flat: { Icon: Minus, cls: 'text-gray-400 dark:text-gray-500' },
  };
  const { Icon, cls } = map[trend] || map.flat;
  const sign = delta > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${cls}`}>
      <Icon size={13} />
      {sign}{Math.round(delta)} pts
    </span>
  );
}

function GoalBlock({ goal, currentUserId, expanded, onToggle }) {
  const ScopeIcon = goal.scope === 'branch' ? Building2 : Users;
  const rows = expanded ? goal.entries : goal.entries.slice(0, 5);
  const hidden = goal.entries.length - rows.length;

  return (
    <div className="border border-gray-100 dark:border-white/10 rounded-lg overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-3 py-2.5 bg-gray-50/70 dark:bg-white/5 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{goal.name}</h3>
            {goal.goal_type === 'principal' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/10 text-accent">Principal</span>
            )}
            {!goal.active && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-400">Inactiva</span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">
            {goal.metric_label} · Objetivo {formatMetricValue(goal.metric, goal.target_value)} ·{' '}
            {PERIOD_TYPE_LABEL[goal.period_type] || goal.period_type} ·{' '}
            {fmtPeriod(goal.current_period.period_start, goal.current_period.period_end)}
            {!goal.current_period.is_current && ' (cerrado)'}
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 flex-shrink-0">
          <span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {goal.summary.achieved_now}/{goal.summary.targets}
            </span>{' '}
            cumpliendo
          </span>
          {goal.summary.avg_percent != null && (
            <span>
              Promedio <span className={`font-semibold ${percentClass(goal.summary.avg_percent)}`}>{Math.round(goal.summary.avg_percent)}%</span>
            </span>
          )}
          {goal.summary.historic_achievement_rate != null && (
            <span className="hidden sm:inline">
              Histórico <span className="font-semibold text-gray-800 dark:text-gray-200">{Math.round(goal.summary.historic_achievement_rate)}%</span>
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[620px]">
          <thead>
            <tr className="text-[11px] text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-white/10">
              <th className="text-left font-medium px-3 py-1.5">{goal.scope === 'branch' ? 'Sede' : goal.scope === 'tenant' ? 'Negocio' : 'Vendedor'}</th>
              <th className="text-right font-medium px-3 py-1.5">Alcanzado</th>
              <th className="text-right font-medium px-3 py-1.5">%</th>
              <th className="text-left font-medium px-3 py-1.5">vs. anterior</th>
              <th className="text-left font-medium px-3 py-1.5">Histórico</th>
              <th className="text-right font-medium px-3 py-1.5">Racha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-white/10">
            {rows.map((entry) => {
              const isSelf = entry.target_id === currentUserId;
              const label = goal.scope === 'tenant'
                ? 'Todo el negocio'
                : (entry.target_label || (goal.scope === 'branch' ? 'Sede sin nombre' : 'Vendedor'));
              return (
                <tr key={entry.target_id} className={isSelf ? 'bg-accent/5' : ''}>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      {goal.scope !== 'individual' && <ScopeIcon size={13} className="text-gray-400 flex-shrink-0" />}
                      <span className="truncate">{isSelf ? 'Tú' : label}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {formatMetricValue(goal.metric, entry.current_value)}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${percentClass(entry.percent)}`}>
                    {entry.percent == null ? '—' : `${Math.round(entry.percent)}%`}
                  </td>
                  <td className="px-3 py-2">
                    <TrendCell trend={entry.trend} delta={entry.delta_percent} />
                  </td>
                  <td className="px-3 py-2">
                    <HistoryStrip history={entry.history} metric={goal.metric} />
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {entry.streak > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <Flame size={12} /> {entry.streak}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(hidden > 0 || expanded) && goal.entries.length > 5 && (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] text-accent hover:bg-gray-50 dark:hover:bg-white/5 transition"
        >
          {expanded
            ? <><ChevronDown size={12} /> Ver menos</>
            : <><ChevronRight size={12} /> Ver {hidden} más</>}
        </button>
      )}
    </div>
  );
}

// Exportar lo que se está viendo, sin pasar por el backend: el admin ya
// tiene los datos en pantalla y suele querer llevarlos a una reunión o
// cruzarlos en Excel. Una fila por (meta, vendedor/sede, período).
function exportCsv(data) {
  const header = ['Meta', 'Tipo', 'Métrica', 'Alcance', 'Objetivo', 'Vendedor/Sede', 'Período inicio', 'Período fin', 'En curso', 'Alcanzado', '% cumplimiento', 'Cumplida'];
  const lines = [header.join(';')];

  data.forEach((goal) => {
    goal.entries.forEach((entry) => {
      const label = goal.scope === 'tenant' ? 'Todo el negocio' : (entry.target_label || entry.target_id);
      entry.history.forEach((h) => {
        lines.push([
          goal.name, goal.goal_type, goal.metric_label, goal.scope, goal.target_value,
          label, h.period_start, h.period_end,
          h.is_current ? 'sí' : 'no',
          h.current_value == null ? '' : h.current_value,
          h.percent == null ? '' : h.percent,
          h.achieved == null ? '' : (h.achieved ? 'sí' : 'no'),
        ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'));
      });
    });
  });

  const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cumplimiento-metas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GoalComplianceTable() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [periods, setPeriods] = useState(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await crmApi.getGoalsCompliance({ periods });
      setData(res.data.data || []);
      setEnabled(res.data.gamification_enabled !== false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [periods]);

  useEffect(() => { load(); }, [load]);

  const canManage = ['admin', 'manager', 'super_admin'].includes(user?.role);

  if (loading) {
    return <div className="h-40 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />;
  }

  // Mismo criterio que GoalPathWidget: si la gamificación está apagada o el
  // endpoint falla, el bloque desaparece sin romper el resto del dashboard.
  if (error || !enabled) return null;
  // Sin metas configuradas el vacío ya lo comunica GoalPathWidget arriba —
  // no tiene sentido repetir el mismo llamado a la acción dos veces.
  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={15} className="text-accent" />
          <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Cumplimiento de metas</h2>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:inline">
            — qué tan cerca está cada quien y cómo viene respecto del período anterior
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={periods}
            onChange={e => setPeriods(Number(e.target.value))}
            className="border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1 text-xs"
          >
            <option value={3}>Últimos 3 períodos</option>
            <option value={6}>Últimos 6 períodos</option>
            <option value={12}>Últimos 12 períodos</option>
          </select>
          {canManage && (
            <button
              onClick={() => exportCsv(data)}
              title="Exportar a CSV"
              className="p-1.5 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              <Download size={14} className="text-gray-500 dark:text-gray-400" />
            </button>
          )}
          <button
            onClick={load}
            title="Actualizar"
            className="p-1.5 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition"
          >
            <RefreshCw size={14} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {data.map(goal => (
          <GoalBlock
            key={goal.goal_id}
            goal={goal}
            currentUserId={user?.id}
            expanded={!!expanded[goal.goal_id]}
            onToggle={() => setExpanded(prev => ({ ...prev, [goal.goal_id]: !prev[goal.goal_id] }))}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
        <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1"><span className="h-3 w-2 rounded-sm bg-emerald-400 inline-block" /> Cumplida</span>
          <span className="flex items-center gap-1"><span className="h-3 w-2 rounded-sm bg-red-300 dark:bg-red-400/70 inline-block" /> No cumplida</span>
          <span className="flex items-center gap-1"><span className="h-3 w-2 rounded-sm bg-gray-100 dark:bg-white/10 inline-block" /> Sin datos</span>
          <span className="flex items-center gap-1"><Flame size={11} /> Períodos cumplidos seguidos</span>
        </div>
        {canManage && (
          <button onClick={() => navigate('/crm/settings?tab=goals')} className="text-[11px] text-accent hover:underline font-medium">
            Ajustar metas
          </button>
        )}
      </div>
    </div>
  );
}

// Estado vacío reutilizable si en el futuro esta vista se monta en una
// pestaña propia (§6 lo deja abierto) y deja de apoyarse en el vacío que
// hoy pinta GoalPathWidget.
export function GoalComplianceEmpty() {
  return (
    <div className="text-center py-8">
      <Inbox size={24} className="mx-auto mb-2 text-gray-200 dark:text-gray-700" />
      <p className="text-sm text-gray-400 dark:text-gray-500">Todavía no hay metas con histórico para analizar</p>
    </div>
  );
}