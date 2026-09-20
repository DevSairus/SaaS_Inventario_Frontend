import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../../components/layout/Layout';
import { commissionApi } from '../../../api/workshop';
import { DollarSign, ArrowLeft, User, Calendar, Percent, FileText, Tag, Banknote, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

const PAYROLL_STATUS = {
  cargada_nomina:          { label: 'Cargada a nómina',                 color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: CheckCircle2 },
  sin_empleado_vinculado:  { label: 'Sin empleado de nómina vinculado',  color: 'bg-amber-50 border-amber-200 text-amber-700',       icon: AlertTriangle },
  pendiente_periodo:       { label: 'Sin período de nómina abierto',     color: 'bg-amber-50 border-amber-200 text-amber-700',       icon: AlertTriangle },
  not_applicable:          null, // tenant sin módulo de nómina, o comisión $0 -- no se muestra nada
};

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const fmt = (d) => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function CommissionSettlementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryMsg, setRetryMsg] = useState('');

  const loadSettlement = () => commissionApi.getById(id).then(r => setSettlement(r.data.data)).catch(() => {});

  useEffect(() => {
    loadSettlement().finally(() => setLoading(false));
  }, [id]);

  const handleRetryPayroll = async () => {
    setRetrying(true);
    setRetryMsg('');
    try {
      const res = await commissionApi.retryPayroll(id);
      setRetryMsg(res.data.message);
      await loadSettlement();
    } catch (e) {
      setRetryMsg(e?.response?.data?.message || 'Error al reintentar el cruce con nómina');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) return <Layout><div className="p-6 text-center text-gray-400">Cargando...</div></Layout>;
  if (!settlement) return <Layout><div className="p-6 text-center text-gray-400">Liquidación no encontrada</div></Layout>;

  const tech = settlement.technician;

  // Desglose por categoría (Frenos, Suspensión, Otros...) -- agregado a partir
  // de los ítems, que desde el plan de comisiones por sistema traen su propia
  // categoría/% congelados al momento de liquidar. Los ítems legados (sin
  // commission_category_id, de antes de esta funcionalidad) se agrupan aparte.
  const categoryBreakdown = Object.values(
    (settlement.items || []).reduce((acc, item) => {
      const key = item.commission_category_id || 'legacy';
      if (!acc[key]) {
        acc[key] = {
          key,
          name: item.commission_category?.name || 'Legado (sin categoría)',
          base_amount: 0,
          commission_amount: 0,
          percentage: item.commission_percentage,
        };
      }
      acc[key].base_amount += parseFloat(item.labor_amount || 0);
      acc[key].commission_amount += parseFloat(item.commission_amount ?? (item.labor_amount * settlement.commission_percentage / 100) ?? 0);
      return acc;
    }, {})
  );
  const hasCategoryBreakdown = categoryBreakdown.some(c => c.key !== 'legacy');

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">

        {/* Back */}
        <button onClick={() => navigate('/workshop/commission-settlements')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition">
          <ArrowLeft size={15} /> Liquidaciones
        </button>

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl">
              <DollarSign size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-mono">{settlement.settlement_number}</h1>
              <p className="text-sm text-gray-500">Liquidación de comisión</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">Total a pagar</p>
            <p className="text-3xl font-bold text-emerald-600">{COP(settlement.commission_amount)}</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { icon: User, label: 'Técnico', value: tech ? `${tech.first_name} ${tech.last_name}` : '—' },
            { icon: Percent, label: 'Porcentaje', value: `${settlement.commission_percentage}%` },
            { icon: DollarSign, label: 'Base mano de obra', value: COP(settlement.base_amount) },
            { icon: Calendar, label: 'Período', value: `${settlement.date_from || '—'} → ${settlement.date_to || '—'}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={13} className="text-gray-400" />
                <p className="text-xs text-gray-500">{label}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Cálculo visual */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-emerald-800">
            <span className="font-bold">{COP(settlement.base_amount)}</span>
            <span className="text-emerald-600 mx-2">×</span>
            <span className="font-bold">{settlement.commission_percentage}%</span>
            <span className="text-emerald-600 mx-2">=</span>
            <span className="text-xl font-bold text-emerald-700">{COP(settlement.commission_amount)}</span>
          </p>
          <p className="text-xs text-emerald-600">
            {hasCategoryBreakdown ? '% efectivo promedio ponderado · ' : ''}{settlement.items?.length || 0} línea(s) incluidas
          </p>
        </div>

        {/* Desglose por categoría de comisión */}
        {hasCategoryBreakdown && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-5">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-1.5">
              <Tag size={14} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Desglose por categoría</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {categoryBreakdown.map(c => (
                <div key={c.key} className="flex items-center justify-between px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{c.name}</span>
                    {c.percentage != null && <span className="text-xs text-gray-400">{c.percentage}%</span>}
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-xs text-gray-500">{COP(c.base_amount)}</span>
                    <span className="text-sm font-semibold text-emerald-600 w-24">{COP(c.commission_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cruce con nómina */}
        {PAYROLL_STATUS[settlement.payroll_status] && (
          <div className={`border rounded-xl p-4 mb-5 flex items-center justify-between flex-wrap gap-3 ${PAYROLL_STATUS[settlement.payroll_status].color}`}>
            <div className="flex items-center gap-2">
              <Banknote size={16} className="flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">{PAYROLL_STATUS[settlement.payroll_status].label}</p>
                {settlement.payroll_status === 'cargada_nomina' && settlement.employee && (
                  <p className="text-xs opacity-80">{settlement.employee.first_name} {settlement.employee.first_surname}</p>
                )}
                {settlement.payroll_error && settlement.payroll_status !== 'cargada_nomina' && (
                  <p className="text-xs opacity-80">{settlement.payroll_error}</p>
                )}
              </div>
            </div>
            {settlement.payroll_status !== 'cargada_nomina' && (
              <button onClick={handleRetryPayroll} disabled={retrying}
                className="flex items-center gap-1.5 bg-white/70 hover:bg-white px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50">
                <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} />
                {retrying ? 'Reintentando...' : 'Reintentar'}
              </button>
            )}
            {retryMsg && <p className="w-full text-xs opacity-80">{retryMsg}</p>}
          </div>
        )}

        {/* Notes */}
        {settlement.notes && (
          <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5 flex gap-3">
            <FileText size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600">{settlement.notes}</p>
          </div>
        )}

        {/* Items table */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700">Órdenes de trabajo incluidas</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{settlement.items?.length || 0}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {(settlement.items || []).map(item => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-mono text-sm font-medium text-gray-800">{item.order_number || item.sale_number}</p>
                    {item.commission_category && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-teal-100 text-teal-700">
                        {item.commission_category.name}{item.commission_percentage != null && ` · ${item.commission_percentage}%`}
                      </span>
                    )}
                  </div>
                  {item.work_order?.received_at && (
                    <p className="text-xs text-gray-400 mt-0.5">{fmt(item.work_order.received_at)}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-700">{COP(item.labor_amount)}</p>
                  {item.commission_amount != null && (
                    <p className="text-xs text-emerald-600">{COP(item.commission_amount)} comisión</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between">
            <p className="text-sm font-semibold text-gray-700">Total base</p>
            <p className="text-sm font-bold text-gray-900">{COP(settlement.base_amount)}</p>
          </div>
        </div>

        {/* Created by */}
        <p className="text-xs text-gray-400 mt-4 text-center">
          Creado por {settlement.creator_cs ? `${settlement.creator_cs.first_name} ${settlement.creator_cs.last_name}` : '—'}
          {' · '}{fmt(settlement.created_at)}
        </p>
      </div>
    </Layout>
  );
}