import { useState, useEffect, useCallback } from 'react';
import Layout from '../../../components/layout/Layout';
import { commissionApi } from '../../../api/workshop';
import {
  Package, Search, Calendar, ChevronDown, ChevronRight,
  Loader2, AlertCircle, User, Percent, TrendingUp, Download
} from 'lucide-react';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const today = new Date();
const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
const todayStr = today.toISOString().split('T')[0];

const ROLE_LABEL = {
  technician: 'Técnico',
  admin:      'Administrador',
  cashier:    'Cajero',
  sales:      'Vendedor',
  warehouse:  'Bodeguero',
};

const STATUS_COLOR = {
  recibido:   'bg-blue-100 text-blue-700',
  en_proceso: 'bg-yellow-100 text-yellow-700',
  en_espera:  'bg-orange-100 text-orange-700',
  listo:      'bg-purple-100 text-purple-700',
  entregado:  'bg-green-100 text-green-700',
  cancelado:  'bg-red-100 text-red-600',
};
const STATUS_LABEL = {
  recibido: 'Recibido', en_proceso: 'En proceso', en_espera: 'En espera',
  listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado',
};

export default function CommissionProductsReportPage() {
  const [users, setUsers]           = useState([]);
  const [userId, setUserId]         = useState('');
  const [dateFrom, setDateFrom]     = useState(firstOfMonth);
  const [dateTo, setDateTo]         = useState(todayStr);
  const [percentage, setPercentage] = useState('');
  const [report, setReport]         = useState(null);
  const [summary, setSummary]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [expandedUser, setExpandedUser] = useState(null);

  // Cargar todos los usuarios
  useEffect(() => {
    commissionApi.getTechnicians()
      .then(r => setUsers(r.data.data || []))
      .catch(() => {});
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    setReport(null);
    setSummary(null);
    try {
      const params = { date_from: dateFrom, date_to: dateTo };
      if (userId) params.user_id = userId;
      if (percentage) params.commission_percentage = percentage;
      const res = await commissionApi.getProductsReport(params);
      setReport(res.data.data || []);
      setSummary(res.data.summary || null);
    } catch (e) {
      setError(e?.response?.data?.message || 'Error al generar el informe');
    } finally {
      setLoading(false);
    }
  }, [userId, dateFrom, dateTo, percentage]);

  const toggleUser = (uid) => setExpandedUser(p => p === uid ? null : uid);

  const exportCSV = () => {
    if (!report?.length) return;
    const rows = [['Usuario', 'Rol', 'OTs', 'Repuestos/Productos', 'Mano de Obra', 'Total', '% Comisión', 'Comisión sobre Productos']];
    report.forEach(u => {
      rows.push([
        u.user_name, ROLE_LABEL[u.role] || u.role,
        u.orders.length, u.total_products, u.total_labor, u.total_grand,
        u.commission_percentage, u.commission_on_products,
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `comisiones-productos-${dateFrom}-${dateTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedUser = users.find(u => u.id === userId);

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <Package size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Comisiones por Productos</h1>
            <p className="text-sm text-gray-500">Informe de ventas de repuestos por usuario · todos los perfiles</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4 mb-5">
          <h2 className="text-sm font-semibold text-gray-700">Filtros del informe</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Usuario */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Usuario</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Todos los usuarios</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} {u.role ? `(${ROLE_LABEL[u.role] || u.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Desde */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <Calendar size={11} className="inline mr-1" />Desde
              </label>
              <input type="date" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* Hasta */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
              <input type="date" value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* % Comisión */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <Percent size={11} className="inline mr-1" />% Comisión (opcional)
              </label>
              <input type="number" min="0" max="100" step="0.5"
                placeholder="Ej: 10"
                value={percentage}
                onChange={e => setPercentage(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={loadReport}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {loading ? 'Generando...' : 'Generar informe'}
            </button>
            {report?.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                <Download size={15} /> Exportar CSV
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Resumen general */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Usuarios', value: summary.total_users, color: 'text-indigo-600' },
              { label: 'Órdenes', value: summary.total_orders, color: 'text-blue-600' },
              { label: 'Total Repuestos', value: COP(summary.total_products), color: 'text-emerald-600' },
              { label: 'Comisión Total', value: COP(summary.commission_on_products), color: 'text-amber-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabla resultados */}
        {report && report.length === 0 && (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
            <Package size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 text-sm">No se encontraron órdenes con productos en el período seleccionado</p>
          </div>
        )}

        {report && report.length > 0 && (
          <div className="space-y-2">
            {/* Cabecera */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-4">Usuario / Rol</div>
              <div className="col-span-2 text-right">OTs</div>
              <div className="col-span-2 text-right">Repuestos</div>
              <div className="col-span-2 text-right">Mano de Obra</div>
              <div className="col-span-2 text-right">
                {percentage ? `Comisión (${percentage}%)` : 'Comisión'}
              </div>
            </div>

            {report.map((u) => {
              const isExpanded = expandedUser === u.user_id;
              return (
                <div key={u.user_id || '__sin_usuario__'}
                  className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-indigo-200 transition">

                  {/* Fila usuario */}
                  <button
                    onClick={() => toggleUser(u.user_id)}
                    className="w-full grid grid-cols-12 gap-2 px-4 py-3.5 text-left hover:bg-gray-50 transition"
                  >
                    <div className="col-span-12 sm:col-span-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                        {(u.user_name?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.user_name}</p>
                        <p className="text-xs text-gray-400">{ROLE_LABEL[u.role] || u.role}</p>
                      </div>
                      {isExpanded
                        ? <ChevronDown size={14} className="text-gray-400 ml-auto sm:hidden" />
                        : <ChevronRight size={14} className="text-gray-400 ml-auto sm:hidden" />
                      }
                    </div>
                    <div className="hidden sm:flex col-span-2 items-center justify-end">
                      <span className="text-sm text-gray-600 font-medium">{u.orders.length}</span>
                    </div>
                    <div className="hidden sm:flex col-span-2 items-center justify-end">
                      <span className="text-sm font-semibold text-emerald-700">{COP(u.total_products)}</span>
                    </div>
                    <div className="hidden sm:flex col-span-2 items-center justify-end">
                      <span className="text-sm text-gray-500">{COP(u.total_labor)}</span>
                    </div>
                    <div className="hidden sm:flex col-span-2 items-center justify-end gap-2">
                      {percentage ? (
                        <span className="text-sm font-bold text-indigo-700">{COP(u.commission_on_products)}</span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sin % ingresado</span>
                      )}
                      {isExpanded
                        ? <ChevronDown size={14} className="text-gray-300" />
                        : <ChevronRight size={14} className="text-gray-300" />
                      }
                    </div>
                  </button>

                  {/* Resumen móvil */}
                  <div className="sm:hidden grid grid-cols-3 gap-2 px-4 pb-3 text-center">
                    <div>
                      <p className="text-xs text-gray-400">OTs</p>
                      <p className="text-sm font-semibold">{u.orders.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Repuestos</p>
                      <p className="text-sm font-semibold text-emerald-700">{COP(u.total_products)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Comisión</p>
                      <p className="text-sm font-semibold text-indigo-700">
                        {percentage ? COP(u.commission_on_products) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Detalle órdenes expandido */}
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
                          <div className="col-span-3">
                            <span className="font-mono text-xs font-bold text-gray-800">{o.order_number}</span>
                          </div>
                          <div className="col-span-3 text-xs text-gray-500">
                            {o.received_at ? new Date(o.received_at).toLocaleDateString('es-CO') : '—'}
                          </div>
                          <div className="col-span-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABEL[o.status] || o.status}
                            </span>
                          </div>
                          <div className="col-span-2 text-right text-xs font-semibold text-emerald-700">
                            {COP(o.product_amount)}
                          </div>
                          <div className="col-span-2 text-right text-xs text-gray-500">
                            {COP(o.labor_amount)}
                          </div>
                        </div>
                      ))}

                      {/* Subtotal usuario */}
                      <div className="px-4 py-2.5 grid grid-cols-12 gap-2 bg-indigo-50/60 border-t border-indigo-100">
                        <div className="col-span-8 text-xs font-semibold text-indigo-700">
                          Subtotal · {u.orders.length} {u.orders.length === 1 ? 'orden' : 'órdenes'}
                        </div>
                        <div className="col-span-2 text-right text-xs font-bold text-emerald-700">
                          {COP(u.total_products)}
                        </div>
                        <div className="col-span-2 text-right text-xs text-gray-500">
                          {COP(u.total_labor)}
                        </div>
                      </div>
                      {percentage > 0 && (
                        <div className="px-4 py-2 bg-indigo-100/40 flex items-center justify-between">
                          <p className="text-xs text-indigo-600">
                            <TrendingUp size={12} className="inline mr-1" />
                            Comisión del {u.commission_percentage}% sobre repuestos
                          </p>
                          <p className="text-sm font-bold text-indigo-700">{COP(u.commission_on_products)}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {isExpanded && u.orders.length === 0 && (
                    <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
                      Sin órdenes con productos en este período
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}