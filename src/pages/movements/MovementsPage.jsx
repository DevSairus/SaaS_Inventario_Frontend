import React, { useEffect, useState } from 'react';
import { useMovementsStore } from '../../store/movementsStore';
import useProductsStore from '../../store/productsStore';
import Layout from '../../components/layout/Layout';

const MovementsPage = () => {
  const {
    movements,
    kardex,
    isLoading,
    pagination,
    filters,
    fetchMovements,
    fetchKardex,
    setFilters,
    setPage,
    clearKardex
  } = useMovementsStore();

  const { products, fetchProducts } = useProductsStore();
  const [localFilters, setLocalFilters] = useState(filters);
  const [showKardex, setShowKardex] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchMovements();
  }, [fetchMovements, filters, pagination.page]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(localFilters);
    setPage(1);
  };

  const handleViewKardex = async (productId) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product);
    await fetchKardex(productId, {
      start_date: localFilters.start_date,
      end_date: localFilters.end_date
    });
    setShowKardex(true);
  };

  const closeKardex = () => {
    setShowKardex(false);
    setSelectedProduct(null);
    clearKardex();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTypeBadge = (type) => {
    const badges = {
      entrada: 'bg-green-100 text-green-800',
      salida: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[type]}`}>
        {type === 'entrada' ? 'Entrada' : 'Salida'}
      </span>
    );
  };

  const getReasonLabel = (reason) => {
    const labels = {
      sale: 'Venta',
      sale_reversal: 'Reversión Venta',
      purchase_receipt: 'Recepción Compra',
      purchase_reversal: 'Reversión Compra',
      adjustment_in: 'Ajuste Entrada',
      adjustment_out: 'Ajuste Salida',
      transfer_in: 'Transferencia Entrada',
      transfer_out: 'Transferencia Salida',
      initial_stock: 'Stock Inicial'
    };
    return labels[reason] || reason;
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Movimientos de Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">Historial completo de entradas y salidas</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4">
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <select
                  name="product_id"
                  value={localFilters.product_id}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los productos</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="movement_type"
                  value={localFilters.movement_type}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los tipos</option>
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                </select>
              </div>

              <div>
                <select
                  name="movement_reason"
                  value={localFilters.movement_reason}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las razones</option>
                  <option value="sale">Venta</option>
                  <option value="sale_reversal">Reversión Venta</option>
                  <option value="purchase_receipt">Recepción Compra</option>
                  <option value="adjustment_in">Ajuste Entrada</option>
                  <option value="adjustment_out">Ajuste Salida</option>
                </select>
              </div>

              <div>
                <input
                  type="date"
                  name="start_date"
                  value={localFilters.start_date}
                  onChange={handleFilterChange}
                  placeholder="Fecha inicial"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <input
                  type="date"
                  name="end_date"
                  value={localFilters.end_date}
                  onChange={handleFilterChange}
                  placeholder="Fecha final"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Buscar
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razón</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock Anterior</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock Nuevo</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(movement.movement_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {movement.movement_number}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{movement.product?.name}</div>
                        <div className="text-sm text-gray-500">{movement.product?.sku}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(movement.movement_type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{getReasonLabel(movement.movement_reason)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {movement.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {movement.previous_stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        {movement.new_stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleViewKardex(movement.product_id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver Kardex"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de Kardex */}
        {showKardex && kardex && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Kardex - {selectedProduct.name}</h2>
                  <p className="text-gray-600">SKU: {selectedProduct.sku}</p>
                </div>
                <button
                  onClick={closeKardex}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Resumen */}
              <div className="p-6 bg-gray-50 grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Movimientos</p>
                  <p className="text-xl font-bold text-gray-900">{kardex.summary.total_movements}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Entradas</p>
                  <p className="text-xl font-bold text-green-600">{kardex.summary.total_entradas}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Salidas</p>
                  <p className="text-xl font-bold text-red-600">{kardex.summary.total_salidas}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Stock Actual</p>
                  <p className="text-xl font-bold text-blue-600">{kardex.summary.stock_actual}</p>
                </div>
              </div>

              {/* Movimientos */}
              <div className="p-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tipo</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Razón</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Entrada</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Salida</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {kardex.movements.map((mov) => (
                      <tr key={mov.id}>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {new Date(mov.movement_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2">{getTypeBadge(mov.movement_type)}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{mov.movement_reason}</td>
                        <td className="px-4 py-2 text-right text-sm font-medium text-green-600">
                          {mov.movement_type === 'entrada' ? mov.quantity : '-'}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-medium text-red-600">
                          {mov.movement_type === 'salida' ? mov.quantity : '-'}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                          {mov.new_stock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MovementsPage;