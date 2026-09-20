// frontend/src/pages/crm/RewardsPage.jsx
//
// CRM — Gamificación, Fase 5 (§10.5). Pantalla de consulta de recompensas +
// configuración de sus reglas. Va en una página propia y no como pestaña de
// CrmSettingsPage porque no es solo configuración: el grueso del uso diario
// es consultar qué se ganó, aprobar lo pendiente y destrabar lo que no pudo
// cargarse a nómina.
//
// Tres vistas:
//   Recompensas — tabla vendedor → meta → período → nivel → monto → estado.
//                 "Pagada" NO es un estado guardado: viene derivado del
//                 PayrollPeriod vinculado (§10.4), por eso se muestra como
//                 sello aparte y no como una opción más del selector.
//   Insignias   — vitrina de logros no monetarios (§10.7), con la
//                 visibilidad del tablero, no la restringida del dinero.
//   Reglas      — solo admin/manager: condición, niveles y reparto.
import { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import CrmSubNav from '../../components/crm/CrmSubNav';
import crmApi from '../../api/crm';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import {
  Gift, Award, Settings2, RefreshCw, CheckCircle2, AlertTriangle, Link2,
  Wallet, Inbox, Plus, Trash2, Pencil, X, Trophy,
} from 'lucide-react';

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = d => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');

const STATUS_META = {
  pendiente_aprobacion: { label: 'Pendiente de aprobación', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  aprobada: { label: 'Aprobada', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  sin_empleado_vinculado: { label: 'Sin empleado vinculado', cls: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  aprobada_pendiente_nomina: { label: 'Esperando período de nómina', cls: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  cargada_nomina: { label: 'Cargada a nómina', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  otorgada: { label: 'Otorgada', cls: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
};

const REWARD_TYPE_LABEL = {
  monto_fijo: 'Monto fijo',
  porcentaje_sobre_revenue_won: '% sobre ingresos ganados',
  insignia: 'Insignia',
  titulo: 'Título',
};

const CONDITION_LABEL = {
  meta_cumplida: 'Meta cumplida',
  racha: 'Racha de períodos',
  superacion: 'Superación del objetivo',
};

const DISTRIBUTION_LABEL = {
  individual: 'Individual',
  equitativo: 'Equitativo entre la sede',
  proporcional: 'Proporcional al aporte',
  monto_fijo_por_persona: 'Monto fijo por persona',
};

const TIER_PRESETS = [
  { condition: 'cumplida_1_periodo', label: 'Cumplió el período' },
  { condition: 'racha_2_periodos', label: 'Racha de 2 períodos' },
  { condition: 'racha_3_o_mas', label: 'Racha de 3 o más' },
  { condition: 'superacion_120', label: 'Superó el 120%' },
];

function StatusPill({ status, paid }) {
  const meta = STATUS_META[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
      {paid && (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-600 text-white">Pagada</span>
      )}
    </span>
  );
}

// ── Vista: recompensas ───────────────────────────────────────────────────
function RewardsTab({ canManage }) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [unmatched, setUnmatched] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.listRewards(statusFilter ? { status: statusFilter } : {});
      setRows(res.data.data || []);
      setSummary(res.data.summary || null);
    } catch {
      toast.error('Error cargando las recompensas');
    } finally {
      setLoading(false);
    }

    if (canManage) {
      try {
        const res = await crmApi.getUnmatchedRewardUsers();
        setUnmatched(res.data.data || []);
      } catch {
        setUnmatched([]);
      }
    }
  }, [statusFilter, canManage]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, fn, okMsg) => {
    setBusyId(id);
    try {
      const res = await fn(id);
      if (res.data.matched === false) toast(res.data.message);
      else toast.success(res.data.message || okMsg);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo completar la acción');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="h-48 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Recompensas', value: summary.total, Icon: Gift },
            { label: 'Por aprobar', value: summary.pendientes_aprobacion, Icon: AlertTriangle },
            { label: 'Trabadas en nómina', value: summary.sin_empleado + summary.pendientes_nomina, Icon: Link2 },
            { label: 'Monto total', value: COP(summary.monto_total), Icon: Wallet },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 mb-1">
                <Icon size={12} /> {label}
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
            </div>
          ))}
        </div>
      )}

      {canManage && unmatched.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle size={14} /> {unmatched.length} vendedor(es) sin empleado de nómina vinculado
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400/90 mt-1">
            El vínculo se resuelve solo cuando el email o el documento coinciden en ambos lados. Corrige el dato antes de
            que cierre el período para que la recompensa no quede trabada: {unmatched.slice(0, 5).map(u => u.name || u.email).join(', ')}
            {unmatched.length > 5 ? ` y ${unmatched.length - 5} más` : ''}.
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/10 flex-wrap">
          <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Recompensas otorgadas</h2>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1 text-xs"
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_META).map(([key, m]) => (
                <option key={key} value={key}>{m.label}</option>
              ))}
            </select>
            <button onClick={load} className="p-1.5 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
              <RefreshCw size={14} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-12">
            <Inbox size={24} className="mx-auto mb-2 text-gray-200 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Todavía no hay recompensas otorgadas</p>
            <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">
              Se evalúan cuando cierra el período de la meta, no durante el período en curso.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-[11px] text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-white/10">
                  <th className="text-left font-medium px-4 py-2">Vendedor</th>
                  <th className="text-left font-medium px-4 py-2">Meta / Regla</th>
                  <th className="text-left font-medium px-4 py-2">Período</th>
                  <th className="text-left font-medium px-4 py-2">Nivel</th>
                  <th className="text-right font-medium px-4 py-2">Monto</th>
                  <th className="text-left font-medium px-4 py-2">Estado</th>
                  <th className="text-right font-medium px-4 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/10">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                      {r.user_label || '—'}
                      {r.distribution_group_id && (
                        <span className="block text-[10px] text-gray-400">Reparto de equipo</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-gray-700 dark:text-gray-300">{r.goal_name || '—'}</span>
                      <span className="block text-[11px] text-gray-400 dark:text-gray-500">{r.rule_name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500 dark:text-gray-400">{r.tier_applied || '—'}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap font-semibold text-gray-800 dark:text-gray-200">
                      {r.amount == null
                        ? <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium"><Trophy size={12} />{r.badge_config?.label || 'Reconocimiento'}</span>
                        : COP(r.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={r.status} paid={r.paid} />
                      {r.last_error && (
                        <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-1 max-w-[220px]">{r.last_error}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {canManage && (
                        <div className="inline-flex items-center gap-1">
                          {r.status === 'pendiente_aprobacion' && (
                            <button
                              disabled={busyId === r.id}
                              onClick={() => act(r.id, crmApi.approveReward, 'Recompensa aprobada')}
                              className="text-[11px] px-2 py-1 rounded-lg bg-accent text-white hover:opacity-90 disabled:opacity-50"
                            >
                              <CheckCircle2 size={12} className="inline mr-1" />Aprobar
                            </button>
                          )}
                          {r.status === 'aprobada_pendiente_nomina' && (
                            <button
                              disabled={busyId === r.id}
                              onClick={() => act(r.id, crmApi.chargeRewardToPayroll, 'Cargada a nómina')}
                              className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
                            >
                              Reintentar nómina
                            </button>
                          )}
                          {r.status === 'sin_empleado_vinculado' && (
                            <button
                              disabled={busyId === r.id}
                              onClick={() => act(r.id, crmApi.relinkRewardEmployee, 'Empleado vinculado')}
                              className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
                            >
                              <Link2 size={12} className="inline mr-1" />Revincular
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Vista: insignias ─────────────────────────────────────────────────────
function BadgesTab() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await crmApi.listRewardBadges();
        setBadges(res.data.data || []);
      } catch {
        setBadges([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />;

  if (badges.length === 0) {
    return (
      <div className="bg-white dark:bg-graphite border border-dashed border-gray-200 dark:border-white/10 rounded-xl py-12 text-center">
        <Award size={22} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400 dark:text-gray-500">Todavía no hay insignias ni títulos otorgados</p>
      </div>
    );
  }

  // Agrupadas por persona: la vitrina es de la persona, no del período
  // (§10.7 — se acumulan sin límite en el tiempo).
  const byUser = badges.reduce((acc, b) => {
    const key = b.user_id;
    (acc[key] = acc[key] || { label: b.user_label, items: [] }).items.push(b);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Object.entries(byUser).map(([userId, group]) => (
        <div key={userId} className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{group.label || 'Vendedor'}</h3>
          <div className="flex flex-wrap gap-2">
            {group.items.map(b => (
              <span
                key={b.id}
                title={`${fmtDate(b.period_start)} – ${fmtDate(b.period_end)}`}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: `${b.badge_config?.color || '#8B5CF6'}1A`,
                  color: b.badge_config?.color || '#8B5CF6',
                }}
              >
                <Trophy size={12} />
                {b.badge_config?.label || 'Reconocimiento'}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Vista: reglas ────────────────────────────────────────────────────────
const EMPTY_RULE = {
  goal_id: '',
  name: '',
  condition_type: 'meta_cumplida',
  condition_config: {},
  tiers: [{ condition: 'cumplida_1_periodo', reward_value: 100000 }],
  reward_type: 'monto_fijo',
  badge_config: { label: '', icon: 'trophy', color: '#F59E0B' },
  auto_approve: false,
  bonus_salary_type: 'no_salarial',
  distribution_mode: 'equitativo',
  payroll_concept_id: '',
};

function RuleModal({ rule, goals, concepts, onClose, onSaved }) {
  const [form, setForm] = useState(rule ? { ...EMPTY_RULE, ...rule, badge_config: rule.badge_config || EMPTY_RULE.badge_config } : EMPTY_RULE);
  const [saving, setSaving] = useState(false);

  const isMonetary = ['monto_fijo', 'porcentaje_sobre_revenue_won'].includes(form.reward_type);
  const goal = goals.find(g => g.id === form.goal_id);
  const isTeamGoal = goal && goal.scope !== 'individual';

  const set = (patch) => setForm(prev => ({ ...prev, ...patch }));

  const setTier = (i, patch) => set({
    tiers: form.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
  });

  const save = async () => {
    if (!form.goal_id || !form.name) return toast.error('Elige una meta y ponle nombre a la regla');
    setSaving(true);
    try {
      const payload = {
        ...form,
        tiers: form.tiers.map(t => ({ condition: t.condition, reward_value: parseFloat(t.reward_value) || 0 })),
        payroll_concept_id: form.payroll_concept_id || null,
      };
      if (rule) await crmApi.updateRewardRule(rule.id, payload);
      else await crmApi.createRewardRule(payload);
      toast.success(rule ? 'Regla actualizada' : 'Regla creada');
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo guardar la regla');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-graphite rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10 sticky top-0 bg-white dark:bg-graphite">
          <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{rule ? 'Editar regla' : 'Nueva regla de recompensa'}</h3>
          <button onClick={onClose}><X size={16} className="text-gray-400" /></button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] text-gray-500 dark:text-gray-400">Meta a la que aplica</label>
            <select
              value={form.goal_id}
              onChange={e => set({ goal_id: e.target.value })}
              className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm"
            >
              <option value="">Elegir meta…</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.scope})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-gray-500 dark:text-gray-400">Nombre</label>
            <input
              value={form.name}
              onChange={e => set({ name: e.target.value })}
              placeholder="Bono por cumplimiento mensual"
              className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 dark:text-gray-400">Condición</label>
              <select
                value={form.condition_type}
                onChange={e => set({ condition_type: e.target.value })}
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm"
              >
                {Object.entries(CONDITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 dark:text-gray-400">Tipo de recompensa</label>
              <select
                value={form.reward_type}
                onChange={e => set({ reward_type: e.target.value })}
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm"
              >
                {Object.entries(REWARD_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {form.condition_type === 'racha' && (
            <div>
              <label className="text-[11px] text-gray-500 dark:text-gray-400">Períodos seguidos mínimos</label>
              <input
                type="number" min={2}
                value={form.condition_config?.min_periods ?? 2}
                onChange={e => set({ condition_config: { ...form.condition_config, min_periods: parseInt(e.target.value, 10) || 2 } })}
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          )}
          {form.condition_type === 'superacion' && (
            <div>
              <label className="text-[11px] text-gray-500 dark:text-gray-400">% mínimo de cumplimiento</label>
              <input
                type="number" min={100}
                value={form.condition_config?.min_percent ?? 120}
                onChange={e => set({ condition_config: { ...form.condition_config, min_percent: parseInt(e.target.value, 10) || 120 } })}
                className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
          )}

          {/* Niveles apilables (§10.2): "si cumplió el período pasado y este
              también, el incentivo es mayor". */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-gray-500 dark:text-gray-400">
                Niveles {isMonetary ? '(monto en COP, o % si es sobre ingresos)' : '(el valor no se usa en insignias)'}
              </label>
              <button
                onClick={() => set({ tiers: [...form.tiers, { condition: 'racha_2_periodos', reward_value: 0 }] })}
                className="text-[11px] text-accent hover:underline"
              >
                <Plus size={11} className="inline" /> Agregar nivel
              </button>
            </div>
            <div className="space-y-2">
              {form.tiers.map((tier, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={tier.condition}
                    onChange={e => setTier(i, { condition: e.target.value })}
                    className="flex-1 border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm"
                  >
                    {TIER_PRESETS.map(p => <option key={p.condition} value={p.condition}>{p.label}</option>)}
                    {!TIER_PRESETS.some(p => p.condition === tier.condition) && (
                      <option value={tier.condition}>{tier.condition}</option>
                    )}
                  </select>
                  <input
                    type="number"
                    value={tier.reward_value}
                    onChange={e => setTier(i, { reward_value: e.target.value })}
                    className="w-32 border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm"
                  />
                  {form.tiers.length > 1 && (
                    <button onClick={() => set({ tiers: form.tiers.filter((_, idx) => idx !== i) })}>
                      <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isMonetary ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500 dark:text-gray-400">Tipo de bonificación</label>
                  <select
                    value={form.bonus_salary_type}
                    onChange={e => set({ bonus_salary_type: e.target.value })}
                    className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="no_salarial">No salarial</option>
                    <option value="salarial">Salarial</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 dark:text-gray-400">Concepto de nómina</label>
                  <select
                    value={form.payroll_concept_id || ''}
                    onChange={e => set({ payroll_concept_id: e.target.value })}
                    className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="">Sin concepto específico</option>
                    {concepts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {isTeamGoal && (
                <div>
                  <label className="text-[11px] text-gray-500 dark:text-gray-400">Reparto entre el equipo de la sede</label>
                  <select
                    value={form.distribution_mode}
                    onChange={e => set({ distribution_mode: e.target.value })}
                    className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm"
                  >
                    {Object.entries(DISTRIBUTION_LABEL).filter(([k]) => k !== 'individual').map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={!!form.auto_approve} onChange={e => set({ auto_approve: e.target.checked })} />
                Aprobar automáticamente al cerrar el período
              </label>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-500 dark:text-gray-400">Texto de la insignia</label>
                <input
                  value={form.badge_config?.label || ''}
                  onChange={e => set({ badge_config: { ...form.badge_config, label: e.target.value } })}
                  placeholder="Vendedor del mes"
                  className="w-full border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 dark:text-gray-400">Color</label>
                <input
                  type="color"
                  value={form.badge_config?.color || '#F59E0B'}
                  onChange={e => set({ badge_config: { ...form.badge_config, color: e.target.value } })}
                  className="w-full h-[34px] border border-gray-200 dark:border-white/10 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-white/10">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="text-sm px-3 py-1.5 rounded-lg bg-accent text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RulesTab() {
  const [rules, setRules] = useState([]);
  const [goals, setGoals] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | rule

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, goalsRes] = await Promise.all([crmApi.listRewardRules(), crmApi.listGoals()]);
      setRules(rulesRes.data.data || []);
      setConcepts(rulesRes.data.payroll_concepts || []);
      setGoals(goalsRes.data.data || []);
    } catch {
      toast.error('Error cargando las reglas de recompensa');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (rule) => {
    try {
      const res = await crmApi.removeRewardRule(rule.id);
      toast.success(res.data.message || 'Regla desactivada');
      load();
    } catch {
      toast.error('No se pudo desactivar la regla');
    }
  };

  if (loading) return <div className="h-40 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          Las reglas se evalúan cuando cierra el período de su meta, nunca durante el período en curso.
        </p>
        <button
          onClick={() => setEditing('new')}
          className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:opacity-90"
        >
          <Plus size={12} className="inline mr-1" />Nueva regla
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="bg-white dark:bg-graphite border border-dashed border-gray-200 dark:border-white/10 rounded-xl py-12 text-center">
          <Settings2 size={22} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Sin reglas de recompensa configuradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div key={rule.id} className={`bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-3 ${rule.active ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{rule.name}</h3>
                    {!rule.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-400">Inactiva</span>}
                    {rule.auto_approve && ['monto_fijo', 'porcentaje_sobre_revenue_won'].includes(rule.reward_type) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Auto-aprueba</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">
                    {rule.goal ? rule.goal.name : 'Meta eliminada'} · {CONDITION_LABEL[rule.condition_type]} ·{' '}
                    {REWARD_TYPE_LABEL[rule.reward_type]}
                    {rule.goal && rule.goal.scope !== 'individual' ? ` · ${DISTRIBUTION_LABEL[rule.distribution_mode]}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(rule.tiers || []).map((t, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400">
                        {t.condition} → {['monto_fijo'].includes(rule.reward_type) ? COP(t.reward_value) : t.reward_value}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(rule)} className="p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                    <Pencil size={13} className="text-gray-400" />
                  </button>
                  {rule.active && (
                    <button onClick={() => remove(rule)} className="p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                      <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <RuleModal
          rule={editing === 'new' ? null : editing}
          goals={goals}
          concepts={concepts}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────
export default function RewardsPage() {
  const user = useAuthStore(s => s.user);
  const canManage = ['admin', 'manager', 'super_admin'].includes(user?.role);
  const [tab, setTab] = useState('rewards');

  const TABS = [
    { key: 'rewards', label: 'Recompensas', Icon: Gift },
    { key: 'badges', label: 'Insignias', Icon: Award },
    ...(canManage ? [{ key: 'rules', label: 'Reglas', Icon: Settings2 }] : []),
  ];

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-accent to-accent-soft rounded-xl shadow-sm shadow-accent/30">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Recompensas</h1>
            <p className="text-sm text-gray-500 dark:text-gray-500">Incentivos por cumplimiento de metas y su estado en nómina</p>
          </div>
        </div>

        <CrmSubNav />

        <div className="flex items-center gap-1 p-1 bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl w-fit">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                tab === key
                  ? 'bg-gradient-to-br from-accent to-accent-soft text-white shadow-sm shadow-accent/30'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
            >
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {tab === 'rewards' && <RewardsTab canManage={canManage} />}
        {tab === 'badges' && <BadgesTab />}
        {tab === 'rules' && canManage && <RulesTab />}
      </div>
    </Layout>
  );
}