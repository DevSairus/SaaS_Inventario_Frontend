import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, XCircle, Eye, RefreshCw, Package, ShoppingCart, TrendingDown, Award } from 'lucide-react';
import useStockAlertsStore from '../../store/stockAlertsStore';
import Layout from '../../components/layout/Layout';

const StockAlertsPage = () => {
  const navigate = useNavigate();
  const {
    alerts = [],
    stats = {},
    pagination = {},
    filters = {},
    loading,
    error,
    fetchAlerts,
    fetchStats,
    setFilters,
    resolveAlert,
    ignoreAlert,
    checkAlerts
  } = useStockAlertsStore();

  const [showSuppliersModal, setShowSuppliersModal] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');


  // Cargar alertas y stats al montar el componente
  useEffect(() => {
    console.log('📊 StockAlertsPage montado - cargando datos...');
    if (fetchAlerts) fetchAlerts();
    if (fetchStats) fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debug: Monitorear cambios en alerts
  useEffect(() => {
    console.log('🔔 Alerts actualizadas:', alerts);
    console.log('🔔 Número de alertas:', alerts?.length || 0);
    console.log('🔔 Es array?:', Array.isArray(alerts));
  }, [alerts]);

  const handleFilterChange = (field, value) => {
    if (setFilters) {
      setFilters({ ...filters, [field]: value, page: 1 });
    }
  };

  const handlePageChange = (newPage) => {
    if (setFilters) {
      setFilters({ ...filters, page: newPage });
    }
  };

  const handleResolve = (alert) => {
    setSelectedAlert(alert);
    setShowResolveModal(true);
  };

  const handleResolveConfirm = async () => {
    if (selectedAlert && resolveAlert) {
      await resolveAlert(selectedAlert.id, resolutionNotes);
      setShowResolveModal(false);
      setSelectedAlert(null);
      setResolutionNotes('');
      if (fetchAlerts) fetchAlerts();
      if (fetchStats) fetchStats();
    }
  };

  const handleIgnore = async (alertId) => {
    if (window.confirm('¿Estás seguro de ignorar esta alerta?')) {
      if (ignoreAlert) {
        await ignoreAlert(alertId);
        if (fetchAlerts) fetchAlerts();
        if (fetchStats) fetchStats();
      }
    }
  };

  const handleCheckAlerts = async () => {
    if (checkAlerts) {
      await checkAlerts();
      if (fetchAlerts) fetchAlerts();
      if (fetchStats) fetchStats();
    }
  };

  const handleCreatePurchaseOrder = (supplier) => {
    navigate('/purchases/new', {
      state: {
        prefilledData: {
          supplier_id: supplier.id,
          supplier_name: supplier.business_name || supplier.name,
          product: {
            id: selectedAlert?.product?.id,
            name: selectedAlert?.product?.name,
            sku: selectedAlert?.product?.sku,
            current_stock: selectedAlert?.product?.current_stock,
            min_stock: selectedAlert?.product?.min_stock,
            last_price: supplier.last_price || 0
          },
          suggested_quantity: Math.max(
            (selectedAlert?.product?.min_stock || 0) - (selectedAlert?.product?.current_stock || 0),
            0
          )
        }
      }
    });
  };

  const fetchSuppliersForProduct = async (productId) => {
    if (!productId) {
      console.error('No product ID provided');
      setSuppliers([]);
      return;
    }

    try {
      setLoadingSuppliers(true);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/products/${productId}/suppliers`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!res.ok) {
        throw new Error('Error al cargar proveedores');
      }

      const data = await res.json();
      console.log('Proveedores cargados:', data);
      
      // Asegurar que siempre sea un array
      const suppliersData = Array.isArray(data?.data) ? data.data : [];
      setSuppliers(suppliersData);
    } catch (err) {
      console.error('Error cargando proveedores:', err);
      setSuppliers([]);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  // Ordenar proveedores por precio (mejor primero)
  const sortedSuppliers = useMemo(() => {
    // Validación robusta
    if (!Array.isArray(suppliers) || suppliers.length === 0) {
      return [];
    }
    
    try {
      // Filtrar solo proveedores con precio válido
      const suppliersWithPrice = suppliers.filter(s => {
        const price = s?.last_price;
        return price && !isNaN(parseFloat(price)) && parseFloat(price) > 0;
      });
      
      const suppliersWithoutPrice = suppliers.filter(s => {
        const price = s?.last_price;
        return !price || isNaN(parseFloat(price)) || parseFloat(price) === 0;
      });
      
      // Ordenar por precio ascendente
      const sorted = [...suppliersWithPrice].sort((a, b) => 
        parseFloat(a.last_price) - parseFloat(b.last_price)
      );
      
      return [...sorted, ...suppliersWithoutPrice];
    } catch (error) {
      console.error('Error sorting suppliers:', error);
      return suppliers;
    }
  }, [suppliers]);

  // Identificar el mejor precio
  const bestPrice = useMemo(() => {
    try {
      if (!Array.isArray(sortedSuppliers) || sortedSuppliers.length === 0) {
        return null;
      }
      
      const withPrices = sortedSuppliers.filter(s => {
        const price = s?.last_price;
        return price && !isNaN(parseFloat(price)) && parseFloat(price) > 0;
      });
      
      if (withPrices.length === 0) return null;
      
      return parseFloat(withPrices[0].last_price);
    } catch (error) {
      console.error('Error calculating best price:', error);
      return null;
    }
  }, [sortedSuppliers]);

  const getSeverityBadge = (severity) => {
    const badges = {
      critical: 'bg-red-100 text-red-800 border border-red-200',
      warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      info: 'bg-blue-100 text-blue-800 border border-blue-200'
    };
    return badges[severity] || badges.info;
  };

  const getTypeBadge = (type) => {
    const badges = {
      out_of_stock: 'bg-red-500 text-white',
      low_stock: 'bg-yellow-500 text-white',
      overstock: 'bg-blue-500 text-white'
    };
    return badges[type] || badges.info;
  };

  const getTypeLabel = (type) => {
    const labels = {
      out_of_stock: 'Sin Stock',
      low_stock: 'Stock Bajo',
      overstock: 'Sobre Stock'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-orange-100 text-orange-800',
      resolved: 'bg-green-100 text-green-800',
      ignored: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || badges.active;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-10 h-10" />
                <h1 className="text-3xl font-bold">Alertas de Stock</h1>
              </div>
              <p className="text-orange-100">Gestión de alertas de inventario</p>
            </div>
            <button
              onClick={handleCheckAlerts}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Verificar Stock
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Activas</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.total_active || 0}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Críticas</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.critical || 0}</p>
              </div>
              <XCircle className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Stock Bajo</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.low_stock || 0}</p>
              </div>
              <Package className="w-12 h-12 text-yellow-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Sobre Stock</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.overstock || 0}</p>
              </div>
              <Package className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Resueltas</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.resolved || 0}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severidad</label>
              <select
                value={filters?.severity || ''}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                <option value="critical">Crítica</option>
                <option value="warning">Advertencia</option>
                <option value="info">Información</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                value={filters?.alert_type || ''}
                onChange={(e) => handleFilterChange('alert_type', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="out_of_stock">Sin Stock</option>
                <option value="low_stock">Stock Bajo</option>
                <option value="overstock">Sobre Stock</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filters?.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="active">Activo</option>
                <option value="resolved">Resuelto</option>
                <option value="ignored">Ignorado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Búsqueda</label>
              <input
                type="text"
                value={filters?.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Buscar producto..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Tabla de alertas */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Banner informativo si hay paginación */}
          {pagination?.total > pagination?.limit && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
              <p className="text-sm text-yellow-800">
                ℹ️ Mostrando <strong>{alerts.length}</strong> de <strong>{pagination.total}</strong> alertas totales. 
                {pagination.pages > 1 && (
                  <span> Estás en la página {pagination.page} de {pagination.pages}.</span>
                )}
              </p>
            </div>
          )}
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              <p className="mt-4 text-gray-600">Cargando alertas...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600">
              <XCircle className="w-12 h-12 mx-auto mb-4" />
              <p>{error}</p>
            </div>
          ) : !Array.isArray(alerts) || alerts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay alertas que coincidan con los filtros</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                        Producto
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Severidad
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {alerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                        {/* Columna de Producto - Truncada */}
                        <td className="px-4 py-3">
                          <div className="max-w-xs">
                            <div 
                              className="font-medium text-gray-900 truncate" 
                              title={alert.product?.name}
                            >
                              {alert.product?.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              SKU: {alert.product?.sku}
                            </div>
                          </div>
                        </td>
                        
                        {/* Columna de Tipo - Compacta */}
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(alert.alert_type)}`}>
                            {getTypeLabel(alert.alert_type)}
                          </span>
                        </td>
                        
                        {/* Columna de Stock - Compacta */}
                        <td className="px-3 py-3">
                          <div className="text-sm">
                            <div className="text-gray-900 font-medium">
                              {alert.product?.current_stock || 0}
                            </div>
                            <div className="text-xs text-gray-500">
                              Min: {alert.product?.min_stock || 0}
                            </div>
                          </div>
                        </td>
                        
                        {/* Columna de Severidad - Oculta en móvil */}
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-lg ${getSeverityBadge(alert.severity)}`}>
                            {alert.severity === 'critical' ? '🔴 Crítica' : alert.severity === 'warning' ? '⚠️ Alerta' : 'ℹ️ Info'}
                          </span>
                        </td>
                        
                        {/* Columna de Fecha - Oculta en tablet */}
                        <td className="px-3 py-3 hidden md:table-cell text-sm text-gray-500">
                          {new Date(alert.created_at).toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </td>
                        
                        {/* Columna de Acciones - Compacta */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {alert.status === 'active' && (
                              <>
                                <button
                                  onClick={() => handleResolve(alert)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Resolver"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleIgnore(alert.id)}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Ignorar"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                console.log('Opening suppliers modal for alert:', alert);
                                setSelectedAlert(alert);
                                fetchSuppliersForProduct(alert.product?.id);
                                setShowSuppliersModal(true);
                              }}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Ver Proveedores"
                            >
                              <Package className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación - Siempre mostrar contador */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-600">
                      Mostrando <span className="font-medium">{alerts.length}</span> de{' '}
                      <span className="font-medium">{pagination?.total || 0}</span> alertas totales
                    </p>
                    {pagination?.pages > 1 && (
                      <span className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded">
                        Página {pagination?.page || 1} de {pagination?.pages}
                      </span>
                    )}
                  </div>
                  {pagination?.pages > 1 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange((pagination?.page || 1) - 1)}
                        disabled={(pagination?.page || 1) === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => handlePageChange((pagination?.page || 1) + 1)}
                        disabled={(pagination?.page || 1) >= (pagination?.pages || 1)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal de Proveedores */}
        {showSuppliersModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Proveedores sugeridos
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Producto: <strong>{selectedAlert?.product?.name || 'N/A'}</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Stock actual: <span className="font-semibold text-orange-600">{selectedAlert?.product?.current_stock || 0}</span> | 
                    Stock mínimo: <span className="font-semibold">{selectedAlert?.product?.min_stock || 0}</span>
                  </p>
                  {bestPrice && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                      <TrendingDown className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        Mejor precio: ${bestPrice.toLocaleString('es-CO')}
                      </span>
                    </div>
                  )}
                </div>

                {selectedAlert?.severity === 'critical' && (
                  <span className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                    Alerta Crítica
                  </span>
                )}
              </div>

              {loadingSuppliers ? (
                <div className="py-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-3 text-gray-600">Cargando proveedores...</p>
                </div>
              ) : sortedSuppliers.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 mb-2">No hay proveedores registrados para este producto.</p>
                  <p className="text-sm text-gray-500">Agrega proveedores en la ficha del producto para poder crear órdenes de compra rápidamente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedSuppliers.map((supplier, index) => {
                    const supplierPrice = supplier?.last_price ? parseFloat(supplier.last_price) : null;
                    const isBestPrice = supplierPrice && bestPrice && supplierPrice === bestPrice;
                    
                    return (
                      <div
                        key={supplier.id}
                        className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                          isBestPrice 
                            ? 'border-green-400 bg-green-50 ring-2 ring-green-200' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900 text-lg">
                                {supplier.business_name || supplier.name}
                              </h4>
                              {isBestPrice && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded-full text-xs font-bold">
                                  <Award className="w-3 h-3" />
                                  MEJOR PRECIO
                                </div>
                              )}
                              {index === 0 && !isBestPrice && supplierPrice && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                  Recomendado
                                </span>
                              )}
                            </div>

                            <div className="text-sm text-gray-600 mt-2 space-y-1">
                              {supplier.contact_name && (
                                <p>👤 Contacto: {supplier.contact_name}</p>
                              )}
                              {supplier.phone && <p>📞 Tel: {supplier.phone}</p>}
                              {supplier.email && <p>📧 Email: {supplier.email}</p>}
                              {supplierPrice ? (
                                <p className={`font-bold text-lg ${isBestPrice ? 'text-green-700' : 'text-gray-800'}`}>
                                  💰 ${supplierPrice.toLocaleString('es-CO')}
                                  {isBestPrice && <span className="ml-2 text-xs font-normal text-green-600">(¡Precio más bajo!)</span>}
                                </p>
                              ) : (
                                <p className="text-gray-400 italic">Sin precio registrado</p>
                              )}
                              {supplier.last_purchase_date && (
                                <p className="text-xs text-gray-500">
                                  📅 Última compra: {new Date(supplier.last_purchase_date).toLocaleDateString('es-CO', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => {
                              handleCreatePurchaseOrder(supplier);
                              setShowSuppliersModal(false);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium ${
                              isBestPrice
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                            }`}
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Crear Orden de Compra
                          </button>

                          {supplier.phone && (
                            <a
                              href={`tel:${supplier.phone}`}
                              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Llamar
                            </a>
                          )}
                          {supplier.email && (
                            <a
                              href={`mailto:${supplier.email}`}
                              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Email
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex justify-end border-t border-gray-200 pt-4">
                <button
                  onClick={() => {
                    setShowSuppliersModal(false);
                    setSuppliers([]);
                    setSelectedAlert(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Resolución */}
        {showResolveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Resolver Alerta</h3>
              <p className="text-gray-600 mb-4">
                ¿Cómo se resolvió esta alerta de stock para <strong>{selectedAlert?.product?.name}</strong>?
              </p>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Ej: Se realizó pedido al proveedor, Se ajustó el stock mínimo, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows="4"
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowResolveModal(false);
                    setSelectedAlert(null);
                    setResolutionNotes('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResolveConfirm}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  Resolver
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StockAlertsPage;