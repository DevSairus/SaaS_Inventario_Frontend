import { useState, useEffect, useCallback } from 'react';
import Layout from '../../../components/layout/Layout';
import { commissionApi } from '../../../api/workshop';
import {
  Package, Search, Calendar, ChevronDown, ChevronRight,
  Loader2, AlertCircle, User, Percent, TrendingUp,
  Download, CheckCircle, Clock, History,
} from 'lucide-react';
import toast from 'react-hot-toast';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const today = new Date();
const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
const todayStr = today.toISOString().split('T')[0];

const ROLE_LABEL = {
  technician: 'Técnico', admin: 'Administrador', cashier: 'Cajero',
  sales: 'Vendedor', warehouse: 'Bodeguero',
};
const STATUS_COLOR = {
  recibido: 'bg-blue-100 text-blue-700', en_proceso: 'bg-yellow-100 text-yellow-700',
  en_espera: 'bg-orange-100 text-orange-700', listo: 'bg-purple-100 text-purple-700',
  entregado: 'bg-green-100 text-green-700', cancelado: 'bg-red-100 text-red-600',
};
const STATUS_LABEL = {
  recibido: 'Recibido', en_proceso: 'En proceso', en_espera: 'En espera',
  listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado',
};

// ─── Tab: Pendientes + liquidar ───────────────────────────────────────────────
function ReportTab({ users }) {
  const [userId, setUserId]         = useState('');
  const [dateFrom, setDateFrom]     = useState(firstOfMonth);
  const [dateTo, setDateTo]         = useState(todayStr);
  const [percentage, setPercentage] = useState('');
  const [report, setReport]         = useState(null);
  const [summary, setSummary]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [settling, setSettling]     = useState(false);
  const [error, setError]           = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [previewData, setPreviewData]   = useState(null);
  const [previewUser, setPreviewUser]   = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [notes, setNotes] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true); setError(''); setReport(null); setSummary(null);
    try {
      const params = { date_from: dateFrom, date_to: dateTo };
      if (userId)     params.user_id = userId;
      if (percentage) params.commission_percentage = percentage;
      const res = await commissionApi.getProductsReport(params);
      setReport(res.data.data || []);
      setSummary(res.data.summary || null);
    } catch (e) {
      setError(e?.response?.data?.message || 'Error al generar el informe');
    } finally { setLoading(false); }
  }, [userId, dateFrom, dateTo, percentage]);

  const openSettleModal = async (u) => {
    if (!percentage) { toast.error('Ingresa el % de comisión antes de liquidar'); return; }
    setPreviewUser(u);
    setLoadingPreview(true);
    try {
      const res = await commissionApi.productPreview({
        user_id: u.user_id, date_from: dateFrom, date_to: dateTo,
        commission_percentage: percentage,
      });
      setPreviewData(res.data.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al calcular preview');
      setPreviewUser(null);
    } finally { setLoadingPreview(false); }
  };

  const confirmSettle = async () => {
    if (!previewUser || !previewData) return;
    setSettling(true);
    try {
      await commissionApi.createProductSettlement({
        user_id: previewUser.user_id,
        date_from: dateFrom, date_to: dateTo,
        commission_percentage: percentage,
        notes: notes || undefined,
      });
      toast.success(`Liquidación creada para ${previewUser.user_name}`);
      setPreviewData(null); setPreviewUser(null); setNotes('');
      loadReport();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al liquidar');
    } finally { setSettling(false); }
  };

  const exportCSV = () => {
    if (!report?.length) return;
    const rows = [['Usuario','Rol','OTs','Repuestos','Mano de Obra','Total','% Comisión','Comisión']];
    report.forEach(u => rows.push([
      u.user_name, ROLE_LABEL[u.role] || u.role, u.orders.length,
      u.total_products, u.total_labor, u.total_grand,
      u.commission_percentage, u.commission_on_products,
    ]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `comisiones-productos-${dateFrom}-${dateTo}.csv`;
    a.click();
  };

  return (
    <>
      {/* Filtros */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4 mb-5">
        <h2 className="text-sm font-semibold text-gray-700">Filtros — órdenes <span className="text-indigo-600">no liquidadas</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Usuario</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select value={userId} onChange={e => setUserId(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">Todos los usuarios</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}{u.role ? ` (${ROLE_LABEL[u.role] || u.role})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <Calendar size={11} className="inline mr-1" />Desde
            </label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              <Percent size={11} className="inline mr-1" />% Comisión
            </label>
            <input type="number" min="0" max="100" step="0.5" placeholder="Ej: 10"
              value={percentage} onChange={e => setPercentage(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={loadReport} disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {loading ? 'Generando...' : 'Generar informe'}
          </button>
          {report?.length > 0 && (
            <button onClick={exportCSV}
              className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              <Download size={15} /> CSV
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Usuarios',       value: summary.total_users,              color: 'text-indigo-600' },
            { label: 'Órdenes',        value: summary.total_orders,             color: 'text-blue-600' },
            { label: 'Total Repuestos',value: COP(summary.total_products),      color: 'text-emerald-600' },
            { label: 'Comisión Total', value: COP(summary.commission_on_products), color: 'text-amber-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {report && report.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
          <CheckCircle size={40} className="mx-auto mb-3 text-green-300" />
          <p className="text-gray-400 text-sm font-medium">No hay órdenes pendientes de liquidar</p>
          <p className="text-xs text-gray-300 mt-1">Todo está al día 🎉</p>
        </div>
      )}

      {report && report.length > 0 && (
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">Usuario / Rol</div>
            <div className="col-span-2 text-right">OTs</div>
            <div className="col-span-2 text-right">Repuestos</div>
            <div className="col-span-2 text-right">Mano de Obra</div>
            <div className="col-span-2 text-right">Acción</div>
          </div>

          {report.map((u) => {
            const isExpanded = expandedUser === u.user_id;
            return (
              <div key={u.user_id || '__sin__'}
                className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-indigo-200 transition">
                <div className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center">
                  <button onClick={() => setExpandedUser(p => p === u.user_id ? null : u.user_id)}
                    className="col-span-12 sm:col-span-4 flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                      {(u.user_name?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.user_name}</p>
                      <p className="text-xs text-gray-400">{ROLE_LABEL[u.role] || u.role}</p>
                    </div>
                    {isExpanded
                      ? <ChevronDown size={14} className="text-gray-400 ml-1 shrink-0" />
                      : <ChevronRight size={14} className="text-gray-400 ml-1 shrink-0" />}
                  </button>
                  <div className="hidden sm:flex col-span-2 justify-end">
                    <span className="text-sm text-gray-600 font-medium">{u.orders.length}</span>
                  </div>
                  <div className="hidden sm:flex col-span-2 justify-end">
                    <span className="text-sm font-semibold text-emerald-700">{COP(u.total_products)}</span>
                  </div>
                  <div className="hidden sm:flex col-span-2 justify-end">
                    <span className="text-sm text-gray-500">{COP(u.total_labor)}</span>
                  </div>
                  <div className="hidden sm:flex col-span-2 justify-end">
                    {u.user_id && (
                      <button
                        onClick={() => openSettleModal(u)}
                        disabled={loadingPreview && previewUser?.user_id === u.user_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                        {loadingPreview && previewUser?.user_id === u.user_id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <CheckCircle size={12} />}
                        Liquidar
                      </button>
                    )}
                  </div>
                </div>

                {/* Móvil */}
                <div className="sm:hidden grid grid-cols-4 gap-2 px-4 pb-3 text-center items-center">
                  <div><p className="text-xs text-gray-400">OTs</p><p className="text-sm font-semibold">{u.orders.length}</p></div>
                  <div><p className="text-xs text-gray-400">Repuestos</p><p className="text-sm font-semibold text-emerald-700">{COP(u.total_products)}</p></div>
                  <div><p className="text-xs text-gray-400">Comisión</p><p className="text-sm font-semibold text-indigo-700">{percentage ? COP(u.commission_on_products) : '—'}</p></div>
                  {u.user_id && (
                    <div>
                      <button onClick={() => openSettleModal(u)}
                        className="w-full px-2 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition">
                        Liquidar
                      </button>
                    </div>
                  )}
                </div>

                {/* Detalle expandido */}
                {isExpanded && u.orders.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/60">
                    <div className="px-4 py-2 grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      <div className="col-span-3">Orden</div>
                      <div className="col-span-3">Fecha</div>
                      <div className="col-span-2">Estado</div>
                      <div className="col-span-2 text-right">Repuestos</div>
                      <div className="col-span-2 text-right">Mano Obra</div>
                    </div>
                    {u.orders.map(o => (
                      <div key={o.order_number}
                        className="px-4 py-2.5 grid grid-cols-12 gap-2 text-sm border-b border-gray-100 last:border-0 hover:bg-white transition">
                        <div className="col-span-3 font-mono text-xs font-bold text-gray-800">{o.order_number}</div>
                        <div className="col-span-3 text-xs text-gray-500">
                          {o.received_at ? new Date(o.received_at).toLocaleDateString('es-CO') : '—'}
                        </div>
                        <div className="col-span-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABEL[o.status] || o.status}
                          </span>
                        </div>
                        <div className="col-span-2 text-right text-xs font-semibold text-emerald-700">{COP(o.product_amount)}</div>
                        <div className="col-span-2 text-right text-xs text-gray-500">{COP(o.labor_amount)}</div>
                      </div>
                    ))}
                    <div className="px-4 py-2.5 grid grid-cols-12 gap-2 bg-indigo-50/60 border-t border-indigo-100">
                      <div className="col-span-8 text-xs font-semibold text-indigo-700">
                        Subtotal · {u.orders.length} {u.orders.length === 1 ? 'orden' : 'órdenes'}
                      </div>
                      <div className="col-span-2 text-right text-xs font-bold text-emerald-700">{COP(u.total_products)}</div>
                      <div className="col-span-2 text-right text-xs text-gray-500">{COP(u.total_labor)}</div>
                    </div>
                    {percentage > 0 && (
                      <div className="px-4 py-2 bg-indigo-100/40 flex items-center justify-between">
                        <p className="text-xs text-indigo-600">
                          <TrendingUp size={12} className="inline mr-1" />
                          Comisión {u.commission_percentage}% sobre repuestos
                        </p>
                        <p className="text-sm font-bold text-indigo-700">{COP(u.commission_on_products)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal confirmación de liquidación ── */}
      {previewUser && !loadingPreview && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle size={20} /> Confirmar liquidación
              </h2>
              <p className="text-indigo-200 text-sm mt-0.5">{previewUser.user_name}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Órdenes',          value: String(previewData.total_orders),          color: 'text-blue-600' },
                  { label: 'Base Repuestos',    value: COP(previewData.base_amount),              color: 'text-emerald-600' },
                  { label: `Comisión (${previewData.commission_percentage}%)`, value: COP(previewData.commission_amount), color: 'text-indigo-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className={`text-sm font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="max-h-44 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                {previewData.orders.map(o => (
                  <div key={o.order_number} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div>
                      <span className="font-mono font-bold text-gray-800 mr-2">{o.order_number}</span>
                      <span className="text-gray-400">
                        {o.received_at ? new Date(o.received_at).toLocaleDateString('es-CO') : ''}
                      </span>
                    </div>
                    <span className="font-semibold text-emerald-700">{COP(o.product_amount)}</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="Observaciones de la liquidación..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠ Al confirmar, estas órdenes quedarán marcadas como liquidadas y no aparecerán en futuros informes de pendientes.
              </p>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => { setPreviewData(null); setPreviewUser(null); setNotes(''); }}
                disabled={settling}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition">
                Cancelar
              </button>
              <button onClick={confirmSettle} disabled={settling}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                {settling ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                {settling ? 'Liquidando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Tab: Historial ───────────────────────────────────────────────────────────
function HistoryTab({ users }) {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [userId, setUserId]           = useState('');
  const [selected, setSelected]       = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await commissionApi.listProductSettlements({ user_id: userId || undefined, limit: 50 });
      setSettlements(res.data.data || []);
    } catch { setSettlements([]); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadList(); }, [loadList]);

  const openDetail = async (s) => {
    setLoadingDetail(true);
    try {
      const res = await commissionApi.getProductSettlementById(s.id);
      setSelected(res.data.data);
    } catch { toast.error('Error al cargar detalle'); }
    finally { setLoadingDetail(false); }
  };

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4 flex items-center gap-3">
        <User size={14} className="text-gray-400 shrink-0" />
        <select value={userId} onChange={e => setUserId(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">Todos los usuarios</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
        </div>
      ) : settlements.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
          <History size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">No hay liquidaciones de productos registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {settlements.map(s => (
            <button key={s.id} onClick={() => openDetail(s)}
              className="w-full bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-indigo-200 transition">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-indigo-700">{s.settlement_number}</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Liquidado</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">
                    {s.user_pcs?.first_name} {s.user_pcs?.last_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.date_from && s.date_to ? `${s.date_from} → ${s.date_to} · ` : ''}
                    {new Date(s.created_at).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Base repuestos</p>
                  <p className="text-sm font-bold text-emerald-700">{COP(s.base_amount)}</p>
                  <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                    Comisión: {COP(s.commission_amount)} ({s.commission_percentage}%)
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal detalle */}
      {(selected || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <p className="font-bold text-gray-900">{selected?.settlement_number}</p>
                <p className="text-sm text-gray-500">
                  {selected?.user_pcs?.first_name} {selected?.user_pcs?.last_name}
                </p>
              </div>
              <button onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {loadingDetail ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="animate-spin text-indigo-500" />
              </div>
            ) : selected && (
              <div className="overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Período', value: selected.date_from ? `${selected.date_from} → ${selected.date_to}` : '—' },
                    { label: 'Base Repuestos', value: COP(selected.base_amount) },
                    { label: `Comisión (${selected.commission_percentage}%)`, value: COP(selected.commission_amount) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-xs font-bold text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>
                {selected.notes && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{selected.notes}</p>
                )}
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-4">Orden</div>
                    <div className="col-span-4">Fecha</div>
                    <div className="col-span-4 text-right">Repuestos</div>
                  </div>
                  {selected.items?.map(item => (
                    <div key={item.id} className="px-4 py-2.5 grid grid-cols-12 gap-2 border-t border-gray-50 hover:bg-gray-50">
                      <div className="col-span-4 font-mono text-xs font-bold text-gray-800">{item.order_number}</div>
                      <div className="col-span-4 text-xs text-gray-500">
                        {item.work_order?.received_at ? new Date(item.work_order.received_at).toLocaleDateString('es-CO') : '—'}
                      </div>
                      <div className="col-span-4 text-right text-xs font-semibold text-emerald-700">{COP(item.product_amount)}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3">
                  <span className="text-sm font-semibold text-indigo-700">Total comisión a pagar</span>
                  <span className="text-lg font-bold text-indigo-700">{COP(selected.commission_amount)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Page principal ───────────────────────────────────────────────────────────
export default function CommissionProductsReportPage() {
  const [tab, setTab]     = useState('report');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    commissionApi.getTechnicians()
      .then(r => setUsers(r.data.data || []))
      .catch(() => {});
  }, []);

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <Package size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Comisiones por Productos</h1>
            <p className="text-sm text-gray-500">Liquidaciones de repuestos por usuario</p>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
          {[
            { id: 'report',  label: 'Pendientes', icon: Clock },
            { id: 'history', label: 'Historial',  icon: History },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {tab === 'report'  && <ReportTab  users={users} />}
        {tab === 'history' && <HistoryTab users={users} />}
      </div>
    </Layout>
  );
}