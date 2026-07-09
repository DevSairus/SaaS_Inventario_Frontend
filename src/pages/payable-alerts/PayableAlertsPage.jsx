import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  TrashIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import usePayableAlertsStore from '../../store/payableAlertsStore';
import Layout from '../../components/layout/Layout';

const PayableAlertsPage = () => {
  const navigate = useNavigate();
  const {
    alerts = [],
    stats = {},
    filters = {},
    loading,
    fetchAlerts,
    fetchStats,
    setFilters,
    resolveAlert,
    ignoreAlert,
    reactivateAlert,
    deleteAlert,
    checkAlerts
  } = usePayableAlertsStore();

  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatMoney = (value) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  const handleResolveClick = (alert) => {
    setSelectedAlert(alert);
    setResolutionNotes('');
    setShowResolveModal(true);
  };

  const handleResolveConfirm = async () => {
    if (selectedAlert) {
      await resolveAlert(selectedAlert.id, resolutionNotes);
      setShowResolveModal(false);
      setSelectedAlert(null);
      setResolutionNotes('');
    }
  };

  const handleIgnore = async (alertId) => {
    if (window.confirm('¿Ignorar esta alerta? Dejará de aparecer en la campana de notificaciones.')) {
      await ignoreAlert(alertId);
    }
  };

  const handleReactivate = async (alertId) => {
    await reactivateAlert(alertId);
  };

  const handleDelete = async (alertId) => {
    if (window.confirm('¿Eliminar esta alerta permanentemente?')) {
      await deleteAlert(alertId);
    }
  };

  const handleCheckAlerts = async () => {
    setChecking(true);
    try {
      await checkAlerts();
    } finally {
      setChecking(false);
    }
  };

  const getDueLabel = (alert) => {
    if (alert.alert_type === 'overdue') {
      const days = Math.abs(alert.days_to_due);
      return `Vencida hace ${days} día${days === 1 ? '' : 's'}`;
    }
    if (alert.days_to_due === 0) return 'Vence hoy';
    return `Vence en ${alert.days_to_due} día${alert.days_to_due === 1 ? '' : 's'}`;
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alertas de Cuentas por Pagar</h1>
            <p className="text-sm text-gray-500 mt-1">
              Notificaciones internas de cuentas próximas a vencer o vencidas
            </p>
          </div>
          <button
            onClick={handleCheckAlerts}
            disabled={checking}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            Verificar alertas
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Alertas activas</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_active || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-500" /> Vencidas
            </p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.overdue || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5 text-orange-500" /> Por vencer
            </p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.due_soon || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <CurrencyDollarIcon className="w-3.5 h-3.5 text-gray-500" /> Saldo en riesgo
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatMoney(stats.total_balance_active)}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
          <select
            value={filters.status || 'active'}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="active">Activas</option>
            <option value="resolved">Resueltas</option>
            <option value="ignored">Ignoradas</option>
          </select>

          <select
            value={filters.alert_type || ''}
            onChange={(e) => handleFilterChange('alert_type', e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Todos los tipos</option>
            <option value="due_soon">Próxima a vencer</option>
            <option value="overdue">Vencida</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircleIcon className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-900">No hay alertas en este estado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compra</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {alert.purchase?.supplier?.name || 'Sin proveedor'}
                        </p>
                        <p className="text-xs text-gray-500">{alert.purchase?.supplier?.phone || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => alert.purchase?.id && navigate(`/purchases/${alert.purchase.id}`)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {alert.purchase?.purchase_number || '-'}
                        </button>
                        {alert.purchase?.invoice_number && (
                          <p className="text-xs text-gray-500">Fact: {alert.purchase.invoice_number}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(alert.due_date)}
                        <p className={`text-xs font-medium ${alert.alert_type === 'overdue' ? 'text-red-600' : 'text-orange-600'}`}>
                          {getDueLabel(alert)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            alert.alert_type === 'overdue'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {alert.alert_type === 'overdue' ? 'VENCIDA' : 'PRÓXIMA A VENCER'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {formatMoney(alert.balance)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {alert.status === 'active' && (
                            <>
                              <button
                                onClick={() => handleResolveClick(alert)}
                                title="Marcar como resuelta"
                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleIgnore(alert.id)}
                                title="Ignorar"
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                              >
                                <EyeSlashIcon className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {alert.status !== 'active' && (
                            <button
                              onClick={() => handleReactivate(alert.id)}
                              title="Reactivar"
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                            >
                              <ArrowPathIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(alert.id)}
                            title="Eliminar"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Resolver */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Resolver alerta</h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedAlert?.purchase?.supplier?.name} · {selectedAlert?.purchase?.purchase_number}
            </p>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Notas (opcional): ej. pago registrado, acordado con el proveedor, etc."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleResolveConfirm}
                className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PayableAlertsPage;
