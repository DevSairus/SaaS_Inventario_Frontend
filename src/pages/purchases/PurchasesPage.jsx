import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePurchasesStore } from '../../store/purchasesStore';
import { useSuppliersStore } from '../../store/suppliersStore';
import Layout from '../../components/layout/Layout';
import InvoiceImportModal from '../../components/purchases/InvoiceImportModal';
import { 
  FileUp, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  DollarSign
} from 'lucide-react';

const PurchasesPage = () => {
  const navigate = useNavigate();
  
  const {
    purchases,
    stats,
    isLoading,
    pagination,
    filters,
    fetchPurchases,
    fetchStats,
    setFilters,
    setPage,
    deletePurchase
  } = usePurchasesStore();

  const { fetchSuppliers, suppliers } = useSuppliersStore();

  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    fetchPurchases();
    fetchStats();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [filters, pagination.page]);

  const handleSearch = (e) => {
    setFilters({ search: e.target.value });
    setPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters({ [key]: value });
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar esta compra?')) {
      const success = await deletePurchase(id);
      if (success) {
        fetchPurchases();
        fetchStats();
      }
    }
  };

  const handleViewDetails = (id) => {
    navigate(`/purchases/${id}`);
  };

  const handleEdit = (id) => {
    navigate(`/purchases/${id}/edit`);
  };

  const handleNewPurchase = () => {
    navigate('/purchases/new');
  };

  const handleImportSuccess = (purchase) => {
    fetchPurchases();
    fetchStats();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { 
        bg: 'bg-gray-50', 
        text: 'text-gray-700', 
        border: 'border-gray-200',
        icon: Clock,
        label: 'Borrador' 
      },
      confirmed: { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        icon: CheckCircle,
        label: 'Confirmada' 
      },
      received: { 
        bg: 'bg-green-50', 
        text: 'text-green-700', 
        border: 'border-green-200',
        icon: Package,
        label: 'Recibida' 
      },
      cancelled: { 
        bg: 'bg-red-50', 
        text: 'text-red-700', 
        border: 'border-red-200',
        icon: XCircle,
        label: 'Cancelada' 
      }
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    // Asegurarse de que sea un número
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return '$0';
    
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header Mejorado */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                    <ShoppingCart className="w-8 h-8 text-white" />
                  </div>
                  Compras
                </h1>
                <p className="text-gray-600 mt-2 text-lg">
                  Gestiona las órdenes de compra a proveedores
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <FileUp className="w-5 h-5" />
                  Importar Factura
                </button>
                
                <button
                  onClick={handleNewPurchase}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5" />
                  Nueva Compra
                </button>
              </div>
            </div>

            {/* Stats Cards Mejoradas */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Total Compras */}
                <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <ShoppingCart className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm font-medium mb-1">Total Compras</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total || 0}</p>
                </div>

                {/* Borradores */}
                <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <Clock className="w-6 h-6 text-gray-600" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm font-medium mb-1">Borradores</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.draft || 0}</p>
                </div>

                {/* Confirmadas */}
                <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm font-medium mb-1">Confirmadas</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.confirmed || 0}</p>
                </div>

                {/* Recibidas */}
                <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-green-50 rounded-xl">
                      <Package className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm font-medium mb-1">Recibidas</p>
                  <p className="text-3xl font-bold text-green-600">{stats.received || 0}</p>
                </div>

                {/* Este Mes */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <TrendingUp className="w-5 h-5 text-white/80" />
                  </div>
                  <p className="text-green-100 text-sm font-medium mb-1">Este Mes</p>
                  <p className="text-xl font-bold break-words">
                    {formatCurrency(stats.total_this_month || 0)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Filtros y Búsqueda */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por número de compra o factura..."
                  value={filters.search || ''}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Filtro Proveedor */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filters.supplier_id || ''}
                  onChange={(e) => handleFilterChange('supplier_id', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all appearance-none bg-white"
                >
                  <option value="">Todos los proveedores</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Estado */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all appearance-none bg-white"
                >
                  <option value="">Todos los estados</option>
                  <option value="draft">Borrador</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="received">Recibida</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla Mejorada */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : purchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                <ShoppingCart className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-xl font-medium">No hay compras registradas</p>
                <p className="text-sm text-gray-400 mt-2">Crea una nueva compra o importa una factura</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Número
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Proveedor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Factura
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchases.map((purchase) => (
                      <tr 
                        key={purchase.id} 
                        className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                        onClick={() => handleViewDetails(purchase.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {purchase.purchase_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {purchase.supplier?.name || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {formatDate(purchase.purchase_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {purchase.invoice_number || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(purchase.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(purchase.total_amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleViewDetails(purchase.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {purchase.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => handleEdit(purchase.id)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(purchase.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {!isLoading && purchases.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando <span className="font-semibold">{((pagination.page - 1) * pagination.limit) + 1}</span> a{' '}
                    <span className="font-semibold">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    de <span className="font-semibold">{pagination.total}</span> resultados
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Importación */}
      <InvoiceImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </Layout>
  );
};

export default PurchasesPage; 