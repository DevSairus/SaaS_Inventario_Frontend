import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TrendingUp, TrendingDown, Lock, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { getCostAlerts, getCostAlertsStats, resolveCostAlert, ignoreCostAlert } from '../../api/costAlerts';
import useAuthStore from '../../store/authStore';
import { formatCurrency } from '../../utils/formatters';

const WRITE_ROLES = ['admin', 'manager', 'warehouse_keeper', 'super_admin'];

const TYPE_BADGES = {
  cost_increase: { label: 'Subió el costo', className: 'bg-red-100 text-red-800', Icon: TrendingUp },
  cost_decrease: { label: 'Bajó el costo', className: 'bg-green-100 text-green-800', Icon: TrendingDown },
  price_held: { label: 'Precio retenido', className: 'bg-amber-100 text-amber-800', Icon: Lock },
};

const STATUS_LABELS = { active: 'Activa', resolved: 'Resuelta', ignored: 'Ignorada' };

const money = (n) => (n === null || n === undefined ? '—' : formatCurrency(parseFloat(n), { decimals: 2 }));

export default function CostAlertsPanel() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canWrite = WRITE_ROLES.includes(user?.role);

  const [status, setStatus] = useState('active');
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ active: 0, price_held: 0 });
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, st] = await Promise.all([getCostAlerts({ status }), getCostAlertsStats()]);
      setAlerts(list?.data || []);
      setStats(st?.data || { active: 0, price_held: 0 });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al cargar las alertas de costo');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (alert, applyPrice) => {
    if (applyPrice && !window.confirm(
      `¿Cambiar el precio de venta de "${alert.product?.name}" de ${money(alert.product?.base_price)} a ${money(alert.suggested_price)}?`
    )) return;
    setBusyId(alert.id);
    try {
      const res = await resolveCostAlert(alert.id, { apply_price: applyPrice });
      toast.success(res?.message || 'Alerta resuelta');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al resolver la alerta');
    } finally {
      setBusyId(null);
    }
  };

  const handleIgnore = async (alert) => {
    setBusyId(alert.id);
    try {
      await ignoreCostAlert(alert.id);
      toast.success('Alerta ignorada');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al ignorar la alerta');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
          <p className="text-gray-600 text-sm font-medium">Alertas de costo activas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.active || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
          <p className="text-gray-600 text-sm font-medium">Precios retenidos por revisar</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.price_held || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-gray-600 flex-1">
          Se generan al recibir una compra o en una compra rápida cuando el costo cambia más del umbral configurado,
          o cuando el precio de venta por margen quedaría por debajo del actual (el precio nunca baja solo).
        </p>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="active">Activas</option>
          <option value="resolved">Resueltas</option>
          <option value="ignored">Ignoradas</option>
          <option value="all">Todas</option>
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading && alerts.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">Cargando…</p>
        ) : alerts.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No hay alertas de costo {status === 'active' ? 'activas' : 'en este estado'}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo anterior → nuevo</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio actual / sugerido</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Origen</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {alerts.map((a) => {
                  const badge = TYPE_BADGES[a.alert_type] || TYPE_BADGES.price_held;
                  const variation = a.variation_pct !== null && a.variation_pct !== undefined ? parseFloat(a.variation_pct) : null;
                  const pendingPrice = a.status === 'active' && a.price_held && parseFloat(a.suggested_price) > 0;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <p className="text-sm font-medium text-gray-900">{a.product?.name || '—'}</p>
                        <p className="text-xs text-gray-500">{a.product?.sku}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                          <badge.Icon className="w-3 h-3" /> {badge.label}
                        </span>
                        {a.price_held && a.alert_type !== 'price_held' && (
                          <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <Lock className="w-3 h-3" /> Precio retenido
                          </span>
                        )}
                        {a.severity === 'critical' && <p className="text-xs text-red-600 mt-0.5">Crítica</p>}
                        {a.status !== 'active' && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {STATUS_LABELS[a.status]}{a.price_applied ? ' · precio aplicado' : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-sm">
                        <p className="text-gray-500">{money(a.previous_cost)} → <span className="font-medium text-gray-900">{money(a.new_cost)}</span></p>
                        {variation !== null && (
                          <p className={`text-xs font-medium ${variation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {variation > 0 ? '+' : ''}{variation.toFixed(2)}%
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-sm">
                        <p className="font-medium text-gray-900">{money(a.product?.base_price)}</p>
                        {a.suggested_price !== null && (
                          <p className={`text-xs ${pendingPrice ? 'text-amber-700 font-medium' : 'text-gray-500'}`}>
                            Sugerido: {money(a.suggested_price)}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 hidden md:table-cell">
                        <p>{a.source_type === 'purchase' ? 'Compra' : 'Compra rápida'} {a.source_number}</p>
                        <p className="text-xs text-gray-400">{new Date(a.alert_date).toLocaleDateString('es-CO')}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/products/${a.product_id}`)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                            title="Ver producto"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canWrite && a.status === 'active' && (
                            <>
                              {pendingPrice && (
                                <button
                                  onClick={() => handleResolve(a, true)}
                                  disabled={busyId === a.id}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                                  title="Cambiar el precio de venta al sugerido y resolver la alerta"
                                >
                                  Aplicar precio
                                </button>
                              )}
                              <button
                                onClick={() => handleResolve(a, false)}
                                disabled={busyId === a.id}
                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50"
                                title={pendingPrice ? 'Marcar como revisada y conservar el precio actual' : 'Marcar como revisada'}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleIgnore(a)}
                                disabled={busyId === a.id}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                                title="Ignorar"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
