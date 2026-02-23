import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function StockAlerts() {
  const [isOpen, setIsOpen] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchAllLowStockProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Usar el endpoint dedicado de alertas de stock en lugar de traer todos los productos
      const { getStockAlerts } = await import('../../api/stockAlerts');
      const response = await getStockAlerts({ status: 'active', limit: 500 });
      if (response && response.success) {
        // Mapear alertas a formato de producto para compatibilidad con el resto del componente
        const products = (response.data || [])
          .filter(a => a.product)
          .map(a => a.product);
        setAllProducts(products);
      }
    } catch (error) {
      console.error('Error al cargar alertas de stock:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar productos al montar el componente
  useEffect(() => {
    fetchAllLowStockProducts();
  }, [fetchAllLowStockProducts]);

  // Recargar productos cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      fetchAllLowStockProducts();
    }
  }, [isOpen, fetchAllLowStockProducts]);

  /* -----------------------------
     Helpers
  ----------------------------- */

  const getSLA = (date) => {
    if (!date) return '-';
    const diffMs = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    return days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;
  };

  const getSLAColor = (hours) => {
    if (hours >= 72) return 'text-red-600';
    if (hours >= 24) return 'text-orange-600';
    return 'text-gray-600';
  };

  /* -----------------------------
     Alertas calculadas de TODOS los productos
  ----------------------------- */

  const alerts = useMemo(() => {
    return allProducts
      .filter(p => p.track_inventory)
      .map(p => {
        const current = parseFloat(p.current_stock) || 0;
        const min = parseFloat(p.min_stock) || 0;

        if (current === 0) {
          return { ...p, severity: 'critical' };
        }

        if (current <= min) {
          return { ...p, severity: 'warning' };
        }

        return null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.severity === b.severity) return 0;
        return a.severity === 'critical' ? -1 : 1;
      });
  }, [allProducts]);

  // No mostrar el botón si no hay alertas Y no está cargando
  if (alerts.length === 0 && !isLoading) return null;

  return (
    <div className="relative">
      {/* Botón */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-xl z-50 border border-gray-200 flex flex-col max-h-[32rem]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b bg-gradient-to-r from-orange-50 to-red-50">
              <h3 className="text-sm font-semibold text-gray-900">
                Alertas de stock ({alerts.length})
              </h3>
              <p className="text-xs text-gray-600">
                Prioridad por criticidad y tiempo
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
                  <p className="text-sm font-medium text-gray-900">¡Todo bien!</p>
                  <p className="text-xs text-gray-500 mt-1">No hay productos con stock bajo</p>
                </div>
              ) : (
                alerts.map(product => {
                  const baseDate = product.alert_date || product.updated_at;
                  const hours =
                    (Date.now() - new Date(baseDate).getTime()) / (1000 * 60 * 60);

                  return (
                    <div
                      key={product.id}
                      className="px-4 py-3 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            SKU: {product.sku}
                          </p>
                        </div>

                        <span
                          className={`text-xs font-semibold ${
                            product.severity === 'critical'
                              ? 'text-red-600'
                              : 'text-orange-600'
                          }`}
                        >
                          {product.severity === 'critical'
                            ? 'SIN STOCK'
                            : 'STOCK BAJO'}
                        </span>
                      </div>

                      <div className="flex justify-between mt-2 text-xs">
                        <span className="text-gray-600">
                          Stock: {product.current_stock} / Min: {product.min_stock}
                        </span>
                        <span className={getSLAColor(hours)}>
                          SLA: {getSLA(baseDate)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t bg-gray-50">
              <button
                onClick={() => {
                  navigate('/stock-alerts');
                  setIsOpen(false);
                }}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium py-2 rounded-lg hover:from-orange-600 hover:to-red-600"
              >
                Gestionar alertas de stock
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default StockAlerts;