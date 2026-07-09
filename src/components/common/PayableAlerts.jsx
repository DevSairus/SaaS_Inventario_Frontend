import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPayableAlerts } from '../../api/payableAlerts';

function PayableAlerts() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchActiveAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getPayableAlerts({ status: 'active', limit: 500, sort_by: 'days_to_due', sort_order: 'ASC' });
      if (response && response.success) {
        setAlerts(response.data || []);
      }
    } catch (error) {
      // silencioso, igual que el componente de alertas de stock
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar alertas al montar y refrescar periódicamente
  useEffect(() => {
    fetchActiveAlerts();
    const interval = setInterval(fetchActiveAlerts, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchActiveAlerts]);

  // Recargar cada vez que se abre el dropdown
  useEffect(() => {
    if (isOpen) {
      fetchActiveAlerts();
    }
  }, [isOpen, fetchActiveAlerts]);

  const formatMoney = (value) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDueLabel = (alert) => {
    if (alert.alert_type === 'overdue') {
      const days = Math.abs(alert.days_to_due);
      return `Vencida hace ${days} día${days === 1 ? '' : 's'}`;
    }
    if (alert.days_to_due === 0) return 'Vence hoy';
    return `Vence en ${alert.days_to_due} día${alert.days_to_due === 1 ? '' : 's'}`;
  };

  // No mostrar el botón si no hay alertas y no está cargando
  if (alerts.length === 0 && !isLoading) return null;

  return (
    <div className="relative">
      {/* Botón */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        aria-label="Alertas de cuentas por pagar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>

        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {alerts.length}
          </span>
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div
            className="absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-xl z-50 border border-gray-200 flex flex-col max-h-[32rem]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b bg-gradient-to-r from-orange-50 to-red-50">
              <h3 className="text-sm font-semibold text-gray-900">
                Cuentas por pagar próximas a vencer ({alerts.length})
              </h3>
              <p className="text-xs text-gray-600">
                Ordenadas por urgencia
              </p>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1 divide-y">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-sm text-gray-600">Cargando alertas...</span>
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <svg className="w-16 h-16 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-900">¡Todo al día!</p>
                  <p className="text-xs text-gray-500 mt-1">No hay cuentas por pagar próximas a vencer</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {alert.purchase?.supplier?.name || 'Proveedor sin nombre'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Compra: {alert.purchase?.purchase_number || '-'}
                          {alert.purchase?.invoice_number ? ` · Fact: ${alert.purchase.invoice_number}` : ''}
                        </p>
                      </div>

                      <span
                        className={`text-xs font-semibold whitespace-nowrap ml-2 ${
                          alert.alert_type === 'overdue' ? 'text-red-600' : 'text-orange-600'
                        }`}
                      >
                        {alert.alert_type === 'overdue' ? 'VENCIDA' : 'PRÓXIMA A VENCER'}
                      </span>
                    </div>

                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-gray-600">
                        Saldo: {formatMoney(alert.balance)}
                      </span>
                      <span className={alert.alert_type === 'overdue' ? 'text-red-600 font-medium' : 'text-orange-600 font-medium'}>
                        {getDueLabel(alert)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      Vence: {formatDate(alert.due_date)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t bg-gray-50">
              <button
                onClick={() => {
                  navigate('/payable-alerts');
                  setIsOpen(false);
                }}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium py-2 rounded-lg hover:from-orange-600 hover:to-red-600"
              >
                Gestionar alertas de cuentas por pagar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PayableAlerts;
