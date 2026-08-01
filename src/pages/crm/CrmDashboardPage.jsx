import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import CrmSubNav from '../../components/crm/CrmSubNav';
import crmApi from '../../api/crm';
import StatsCard from '../../components/common/StatsCard';
import {
  BarChart3, TrendingUp, TrendingDown, Clock, AlertTriangle, RefreshCw, ListTodo, Inbox, Target, Wallet, Megaphone,
  Activity, UserPlus, CheckCircle2, MessageCircle, Trophy, XCircle, ArrowRightCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—';
const pct = n => n == null ? '—' : `${Math.round(n * 100)}%`;
const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const LOST_REASON_LABEL = {
  precio: 'Precio', tiempo: 'Tiempo', competencia: 'Competencia',
  no_respondio: 'No respondió', otro: 'Otro',
};

const SOURCE_LABEL = {
  walk_in: 'Mostrador', whatsapp: 'WhatsApp', llamada: 'Llamada', referido: 'Referido',
  redes: 'Redes sociales', web: 'Web', recompra_recurrente: 'Recompra automática', meta_ads: 'Meta Ads',
};

function customerName(c) {
  if (!c) return 'Cliente';
  return c.business_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Cliente';
}

// B.5 — feed de actividad de equipo
const timeAgo = (d) => {
  if (!d) return '';
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
};

const INTERACTION_TYPE_LABEL = {
  llamada: 'llamada', whatsapp: 'WhatsApp', email: 'email', visita: 'visita', nota: 'nota', reunion: 'reunión',
};

function activityContent(item) {
  switch (item.type) {
    case 'opportunity_created':
      return { Icon: UserPlus, iconCls: 'text-blue-500 bg-blue-50', text: `creó una oportunidad para ${item.customer}` };
    case 'opportunity_stage_changed': {
      const Icon = item.stage_type === 'won' ? Trophy : item.stage_type === 'lost' ? XCircle : ArrowRightCircle;
      const iconCls = item.stage_type === 'won' ? 'text-green-500 bg-green-50' : item.stage_type === 'lost' ? 'text-red-500 bg-red-50' : 'text-orange-500 bg-orange-50';
      return { Icon, iconCls, text: `movió a ${item.customer} a "${item.stage_label}"` };
    }
    case 'followup_completed':
      return { Icon: CheckCircle2, iconCls: 'text-emerald-500 bg-emerald-50', text: `completó un seguimiento con ${item.customer}` };
    case 'interaction_logged':
      return { Icon: MessageCircle, iconCls: 'text-purple-500 bg-purple-50', text: `registró ${INTERACTION_TYPE_LABEL[item.interaction_type] || 'una interacción'} con ${item.customer}` };
    default:
      return { Icon: Activity, iconCls: 'text-gray-400 bg-gray-50', text: `actualizó a ${item.customer}` };
  }
}

// Delta simple entre el período actual y el anterior — solo para decorar
// la StatsCard con una flecha y un "+N%"; no reemplaza la cifra absoluta.
function delta(current, previous) {
  if (previous == null || previous === 0) return null;
  const diff = ((current - previous) / previous) * 100;
  if (Math.abs(diff) < 1) return null;
  return { trend: diff > 0 ? 'up' : 'down', label: `${diff > 0 ? '+' : ''}${Math.round(diff)}% vs. período anterior` };
}

function TrendChart({ trend }) {
  if (!trend || trend.length === 0) return null;
  const max = Math.max(1, ...trend.map(t => Math.max(t.created, t.won)));
  const w = 100 / trend.length;
  return (
    <div className="flex items-end gap-1 h-16">
      {trend.map((t, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5 group relative" style={{ maxWidth: `${w}%` }}>
          <div className="w-full flex items-end justify-center gap-0.5 h-full">
            <div className="w-1/2 bg-accent/25 rounded-t group-hover:bg-accent/40 transition-colors"
              style={{ height: `${Math.max(4, (t.created / max) * 100)}%` }} title={`${t.created} creadas`} />
            <div className="w-1/2 bg-emerald-400 rounded-t group-hover:bg-emerald-500 transition-colors"
              style={{ height: `${Math.max(4, (t.won / max) * 100)}%` }} title={`${t.won} ganadas`} />
          </div>
          <span className="text-[9px] text-gray-300 whitespace-nowrap">{t.label}</span>
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="h-9 w-64 bg-gray-100 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );
}

export default function CrmDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmApi.getDashboard({ days });
      setData(res.data.data);
    } catch {
      toast.error('Error cargando el dashboard CRM');
    } finally {
      setLoading(false);
    }
  }, [days]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await crmApi.getActivityFeed({ limit: 20 });
      setActivity(res.data.data);
    } catch {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadActivity(); }, [loadActivity]);

  if (loading || !data) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  const maxLostCount = Math.max(1, ...data.lost_reasons.map(r => r.count));
  const followUps = data.follow_up_load || {};
  const previous = data.previous || {};

  const conversionDelta = delta(
    data.conversion.conversion_rate != null ? data.conversion.conversion_rate * 100 : null,
    previous.conversion_rate != null ? previous.conversion_rate * 100 : null
  );
  const createdDelta = delta(data.conversion.created, previous.created);

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-accent to-accent-soft rounded-xl shadow-sm shadow-accent/30">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Dashboard CRM</h1>
              <p className="text-sm text-gray-500">Conversión, motivos de pérdida y clientes a los que llamar hoy</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
            <button onClick={load} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <RefreshCw size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        <CrmSubNav badges={{ followups: followUps.vencida || 0 }} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Tasa de conversión" value={pct(data.conversion.conversion_rate)}
            icon={TrendingUp} color="accent" isGradient trend={conversionDelta?.trend}
            subtitle={conversionDelta?.label || `${data.conversion.won} ganadas / ${data.conversion.lost} perdidas`} />
          <StatsCard title="Oportunidades nuevas" value={data.conversion.created} icon={BarChart3} color="gray"
            trend={createdDelta?.trend} subtitle={createdDelta?.label} />
          <StatsCard title="Tiempo prom. de cierre"
            value={data.avg_time_to_close_days != null ? `${data.avg_time_to_close_days.toFixed(1)} días` : '—'}
            icon={Clock} color="gray" />
          <StatsCard title="Seguimientos vencidos" value={followUps.vencida || 0} icon={AlertTriangle}
            color={followUps.vencida > 0 ? 'red' : 'gray'}
            subtitle={`${followUps.pendiente || 0} pendientes`} />
        </div>

        {/* Forecast de cierre — Fase B.1: usa expected_value/probability que
            ya existían en el modelo y no se estaban mostrando en ningún lado. */}
        {data.forecast && data.forecast.open_count > 0 && (
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target size={15} className="text-accent-soft" />
              <h2 className="font-semibold text-sm text-white">Forecast de cierre</h2>
              <span className="text-[11px] text-gray-400">— {data.forecast.open_count} oportunidades abiertas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Cierre proyectado este mes</p>
                <p className="text-2xl font-bold text-white">{COP(data.forecast.this_month)}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Ponderado por probabilidad de cierre</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Pipeline abierto (ponderado)</p>
                <p className="text-xl font-semibold text-gray-100">{COP(data.forecast.total_open_weighted)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Pipeline abierto (bruto)</p>
                <p className="text-xl font-semibold text-gray-100 flex items-center gap-1.5">
                  <Wallet size={15} className="text-gray-500" /> {COP(data.forecast.total_open_value)}
                </p>
              </div>
            </div>
          </div>
        )}

        {data.trend && data.trend.length > 1 && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm text-gray-800">Oportunidades creadas vs. ganadas</h2>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-accent/30 inline-block" /> Creadas</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" /> Ganadas</span>
              </div>
            </div>
            <TrendChart trend={data.trend} />
          </div>
        )}

        {/* Retorno de campañas — C.5: de los leads de Meta Ads que entraron
            en el período, cuántos ya se ganaron hasta hoy (no solo los
            ganados dentro del período — la pregunta es "¿valió la pena
            pautar?", no "¿cuánto cerró esta quincena?"). El resto de
            canales queda como comparación, sin ser el foco. */}
        {data.campaign_return && (data.campaign_return.meta_ads || data.campaign_return.other_sources.length > 0) && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone size={15} className="text-purple-500" />
              <h2 className="font-semibold text-sm text-gray-800">Retorno de campañas</h2>
            </div>

            {data.campaign_return.meta_ads ? (
              <div className="flex flex-wrap items-center gap-4 sm:gap-8 bg-purple-50/60 border border-purple-100 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  <Megaphone size={16} className="text-purple-500" />
                  <span className="text-sm font-semibold text-gray-800">Meta Ads</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{data.campaign_return.meta_ads.created}</p>
                  <p className="text-[11px] text-gray-500">Leads en el período</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{data.campaign_return.meta_ads.won}</p>
                  <p className="text-[11px] text-gray-500">Ya ganados</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-700">{pct(data.campaign_return.meta_ads.conversion_rate)}</p>
                  <p className="text-[11px] text-gray-500">Conversión a venta</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-3">Sin leads de Meta Ads en este período — conecta la integración desde Ajustes si todavía no lo has hecho.</p>
            )}

            {data.campaign_return.other_sources.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-gray-400 mb-1">Otros canales, para comparar</p>
                {data.campaign_return.other_sources.map(s => (
                  <div key={s.source} className="flex items-center gap-3 text-xs">
                    <span className="w-32 flex-shrink-0 text-gray-600 truncate">{SOURCE_LABEL[s.source] || s.source}</span>
                    <span className="text-gray-400">{s.created} leads</span>
                    <span className="text-emerald-600">{s.won} ganados</span>
                    <span className="text-gray-400 ml-auto">{pct(s.conversion_rate)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Motivos de pérdida */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={15} className="text-red-500" />
              <h2 className="font-semibold text-sm text-gray-800">Motivos de pérdida</h2>
            </div>
            {data.lost_reasons.length === 0 ? (
              <div className="text-center py-8">
                <Inbox size={24} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">Sin oportunidades perdidas en el período</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.lost_reasons
                  .sort((a, b) => b.count - a.count)
                  .map(r => (
                    <div key={r.reason} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-28 flex-shrink-0">{LOST_REASON_LABEL[r.reason] || r.reason}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-red-400 h-2 rounded-full transition-all duration-500" style={{ width: `${(r.count / maxLostCount) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-6 text-right">{r.count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Carga de seguimiento */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <ListTodo size={15} className="text-accent" />
              <h2 className="font-semibold text-sm text-gray-800">Carga de seguimiento</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'pendiente', label: 'Pendientes', cls: 'text-accent bg-accent/10' },
                { key: 'vencida', label: 'Vencidas', cls: 'text-red-600 bg-red-50' },
                { key: 'hecha', label: 'Hechas', cls: 'text-emerald-600 bg-emerald-50' },
                { key: 'cancelada', label: 'Canceladas', cls: 'text-gray-500 bg-gray-50' },
              ].map(s => (
                <div key={s.key} className={`rounded-lg p-3 ${s.cls}`}>
                  <p className="text-lg font-bold">{followUps[s.key] || 0}</p>
                  <p className="text-xs">{s.label}</p>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/crm/followups')} className="mt-3 w-full text-center text-xs text-accent hover:underline py-1">
              Ver bandeja de seguimiento
            </button>
          </div>

          {/* Clientes en riesgo */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-amber-500" />
              <h2 className="font-semibold text-sm text-gray-800">Clientes en riesgo</h2>
            </div>
            {data.at_risk_customers.length === 0 ? (
              <div className="text-center py-8">
                <Inbox size={24} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">Sin clientes en riesgo</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.at_risk_customers.map(c => (
                  <div key={c.id} onClick={() => navigate(`/customers/${c.id}`)}
                    className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-lg px-1 transition">
                    <span className="text-sm text-gray-700">{customerName(c)}</span>
                    <span className="text-xs text-gray-400">Últ. contacto: {fmtDate(c.last_interaction_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próxima recompra / mantenimiento */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={15} className="text-orange-500" />
              <h2 className="font-semibold text-sm text-gray-800">Próxima recompra / mantenimiento</h2>
            </div>
            {data.upcoming_repurchase.length === 0 ? (
              <div className="text-center py-8">
                <Inbox size={24} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">Sin disparadores de recompra próximos</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.upcoming_repurchase.map(c => (
                  <div key={c.id} onClick={() => navigate(`/customers/${c.id}`)}
                    className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-lg px-1 transition">
                    <span className="text-sm text-gray-700">{customerName(c)}</span>
                    <span className="text-xs text-orange-600 font-medium">{fmtDate(c.next_vehicle_service_due)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* B.5 — Feed de actividad de equipo: qué movió el equipo hoy,
            reutilizando los mismos eventos que el CRM ya registra con
            actor y fecha (oportunidades, seguimientos, interacciones). */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={15} className="text-accent" />
            <h2 className="font-semibold text-sm text-gray-800">Actividad del equipo</h2>
          </div>
          {activityLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}
            </div>
          ) : !activity || activity.length === 0 ? (
            <div className="text-center py-8">
              <Inbox size={24} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Sin actividad reciente del equipo</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activity.map((item, i) => {
                const { Icon, iconCls, text } = activityContent(item);
                return (
                  <div
                    key={i}
                    onClick={() => item.customer_id && navigate(`/customers/${item.customer_id}`)}
                    className={`flex items-center gap-3 py-2.5 px-1 rounded-lg ${item.customer_id ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  >
                    <div className={`p-1.5 rounded-full flex-shrink-0 ${iconCls}`}>
                      <Icon size={13} />
                    </div>
                    <p className="text-sm text-gray-600 flex-1 min-w-0 truncate">
                      <span className="font-medium text-gray-800">{item.actor || 'Alguien'}</span> {text}
                    </p>
                    <span className="text-xs text-gray-300 flex-shrink-0">{timeAgo(item.at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}