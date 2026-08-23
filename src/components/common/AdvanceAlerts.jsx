import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdvanceAlerts } from '../../api/customerAdvanceAlerts';

function AdvanceAlerts() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchActiveAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getAdvanceAlerts({ status: 'active', limit: 500, sort_by: 'days_since_received', sort_order: 'DESC' });
      if (response && response.success) {
        setAlerts(response.data || []);
      }
    } catch (error) {
      // silencioso, igual que el resto de campanitas de alertas
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

  const getCustomerName = (customer) => {
    if (!customer) return 'Cliente sin nombre';
    return customer.business_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Cliente sin nombre';
  };

  // No mostrar el botón si no hay alertas y no está cargando
  if (alerts.length === 0 && !isLoading) return null;

  return (
    <div className="relative">
      {/* Botón */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"
        aria-label="Alertas de anticipos sin aplicar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 7h6m-6 4h6m-6 4h4M5 5h14a1 1 0 011 1v13l-4-3H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
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
            className="absolute right-0 mt-3 w-96 bg-white dark:bg-graphite rounded-xl shadow-xl z-50 border border-gray-200 dark:border-white/10 flex flex-col max-h-[32rem]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b dark:border-white/10 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Anticipos sin aplicar hace tiempo ({alerts.length})
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Ordenados por antigüedad
              </p>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1 divide-y dark:divide-white/10">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Cargando alertas...</span>
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">¡Todo al día!</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">No hay anticipos acumulando antigüedad</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {getCustomerName(alert.customer)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Anticipo: {alert.advance?.advance_number || '-'}
                        </p>
                      </div>

                      <span
                        className={`text-xs font-semibold whitespace-nowrap ml-2 ${
                          alert.alert_type === 'very_stale' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                        }`}
                      >
                        {alert.alert_type === 'very_stale' ? 'MUY ANTIGUO' : 'SIN APLICAR'}
                      </span>
                    </div>

                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        Saldo: {formatMoney(alert.balance)}
                      </span>
                      <span className={alert.alert_type === 'very_stale' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-orange-600 dark:text-orange-400 font-medium'}>
                        Hace {alert.days_since_received} días
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t dark:border-white/10 bg-gray-50 dark:bg-graphite-2">
              <button
                onClick={() => {
                  navigate('/customer-advance-alerts');
                  setIsOpen(false);
                }}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium py-2 rounded-lg hover:from-orange-600 hover:to-red-600"
              >
                Gestionar alertas de anticipos
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdvanceAlerts;
