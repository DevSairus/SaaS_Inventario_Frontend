import { useEffect, useState } from 'react';
import useProductsStore from '../../store/productsStore';
import useAuthStore from '../../store/authStore';
import useCategoriesStore from '../../store/categoriesStore';
import ProductFormModal from '../../components/products/ProductFormModal';
import ImportProductsModal from '../../components/products/ImportProductsModal';
import Layout from '../../components/layout/Layout';
import { exportProductsToExcel } from '../../utils/excelExport';

function ProductsPage() {
  const { user } = useAuthStore();
  const { categories, fetchCategories } = useCategoriesStore();
  const {
    products,
    stats,
    pagination,
    filters,
    isLoading,
    error,
    fetchProducts,
    fetchStats,
    setFilters,
    setPage,
    deleteProduct,
    deactivateProduct,
    createProduct,
    updateProduct,
    clearError
  } = useProductsStore();

  const [searchInput, setSearchInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // ✅ Refresh al entrar a la página
  useEffect(() => {
    fetchProducts(true);
    fetchStats();
    fetchCategories();
  }, []); // ← Sin dependencias = se ejecuta siempre al montar

  // Refresh cuando cambian filtros
  useEffect(() => {
    fetchProducts();
  }, [filters.search, filters.category_id, filters.is_active, filters.sort_by, filters.sort_order, pagination.page]);

  // Búsqueda en tiempo real con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters({ search: searchInput });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDeactivate = async (id, name) => {
    if (window.confirm(`¿Desactivar el producto "${name}"?\n\nPodrás reactivarlo después.`)) {
      const success = await deactivateProduct(id);
      if (success) {
        fetchStats();
      }
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`⚠️ ¿ELIMINAR PERMANENTEMENTE "${name}"?\n\nEsta acción NO se puede deshacer.`)) {
      const success = await deleteProduct(id);
      if (success) {
        fetchStats();
      }
    }
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (productData) => {
    let success;
    if (editingProduct) {
      success = await updateProduct(editingProduct.id, productData);
    } else {
      success = await createProduct(productData);
    }

    if (success) {
      setIsModalOpen(false);
      setEditingProduct(null);
      fetchStats();
    }
  };

  const handleExport = () => {
    exportProductsToExcel(products, 'inventario');
  };

  // Mapear unidades de español a los valores aceptados por la BD
  const mapUnitOfMeasure = (unit) => {
    if (!unit) return 'unit';
    
    const unitMap = {
      // Español → Inglés (BD)
      'pieza': 'unit',
      'unidad': 'unit',
      'kg': 'kg',
      'kilogramo': 'kg',
      'g': 'g',
      'gramo': 'g',
      'lb': 'lb',
      'libra': 'lb',
      'oz': 'oz',
      'onza': 'oz',
      'l': 'l',
      'litro': 'l',
      'ml': 'ml',
      'mililitro': 'ml',
      'gal': 'gal',
      'galon': 'gal',
      'm': 'm',
      'metro': 'm',
      'cm': 'cm',
      'centimetro': 'cm',
      'ft': 'ft',
      'pie': 'ft',
      'box': 'box',
      'caja': 'box',
      'pack': 'pack',
      'paquete': 'pack',
      'dozen': 'dozen',
      'docena': 'dozen'
    };

    const normalized = unit.toLowerCase().trim();
    return unitMap[normalized] || 'unit'; // Default a 'unit' si no se encuentra
  };

  const handleImport = async (productsData) => {
    try {
      let successCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errors = [];
      const skipped = [];
      const imported = [];

      console.log(`📦 Iniciando importación de ${productsData.length} productos...`);

      for (const productData of productsData) {
        try {
          // Mapear los datos al formato esperado por el API
          const mappedData = {
            sku: productData.sku,
            name: productData.name,
            description: null,
            category_id: null,
            unit_of_measure: 'unidad',
            current_stock: parseFloat(productData.current_stock) || 0,
            min_stock: parseFloat(productData.min_stock) || 0,
            max_stock: null,
            base_price: parseFloat(productData.base_price) || 0,
            average_cost: parseFloat(productData.average_cost) || 0,
            profit_margin_percentage: parseFloat(productData.profit_margin_percentage) || 30,
            track_inventory: true,
            location: null,
            is_active: true,
            is_for_sale: true,
            is_for_purchase: true,
            reserved_stock: 0
          };

          console.log(`🔍 Importando: ${mappedData.sku} - ${mappedData.name}`);
          
          await createProduct(mappedData);
          
          successCount++;
          imported.push(productData.sku);
          console.log(`✅ Importado: ${productData.sku}`);
          
        } catch (error) {
          console.error(`❌ Error con ${productData.sku}:`, error);
          
          const errorMsg = error.message || error.response?.data?.message || 'Error desconocido';
          
          // Verificar si es un error de código duplicado
          if (errorMsg.includes('ya existe') || 
              errorMsg.includes('duplicate') || 
              errorMsg.includes('unique') ||
              errorMsg.includes('duplicado')) {
            
            skippedCount++;
            skipped.push(productData.sku);
            console.log(`⏭️ Omitido (duplicado): ${productData.sku}`);
            
          } else {
            // Error real
            errorCount++;
            errors.push({
              sku: productData.sku,
              name: productData.name,
              error: errorMsg
            });
            console.log(`❌ Error real: ${productData.sku} - ${errorMsg}`);
          }
        }
      }

      // ========================================
      // MOSTRAR RESUMEN COMPLETO
      // ========================================
      
      console.log('\n========================================');
      console.log('📊 RESUMEN DE IMPORTACIÓN');
      console.log('========================================');
      console.log(`Total procesados: ${productsData.length}`);
      console.log(`✅ Importados: ${successCount}`);
      console.log(`⏭️ Omitidos (duplicados): ${skippedCount}`);
      console.log(`❌ Errores: ${errorCount}`);
      console.log('========================================\n');

      // Construir mensaje para el usuario
      let message = '📊 RESUMEN DE IMPORTACIÓN\n\n';
      message += `Total procesados: ${productsData.length}\n\n`;
      
      if (successCount > 0) {
        message += `✅ ${successCount} productos importados correctamente\n`;
        if (imported.length <= 5) {
          message += `   ${imported.join(', ')}\n`;
        } else {
          message += `   ${imported.slice(0, 5).join(', ')} y ${imported.length - 5} más\n`;
        }
        message += '\n';
      }
      
      if (skippedCount > 0) {
        message += `⏭️ ${skippedCount} productos omitidos (códigos duplicados)\n`;
        if (skipped.length <= 5) {
          message += `   ${skipped.join(', ')}\n`;
        } else {
          message += `   ${skipped.slice(0, 5).join(', ')} y ${skipped.length - 5} más\n`;
        }
        message += '\n';
      }
      
      if (errorCount > 0) {
        message += `❌ ${errorCount} productos con errores\n\n`;
        message += 'Detalles de errores:\n';
        errors.slice(0, 3).forEach(err => {
          message += `• ${err.sku}: ${err.error}\n`;
        });
        
        if (errors.length > 3) {
          message += `\n... y ${errors.length - 3} errores más`;
        }
      }
      
      if (successCount === 0 && skippedCount === 0 && errorCount === 0) {
        message = '⚠️ No se procesaron productos';
      }

      // Mostrar el resumen
      alert(message);
      
      // Refrescar la lista si hubo al menos un producto importado
      if (successCount > 0) {
        console.log('🔄 Refrescando lista de productos...');
        fetchProducts();
        fetchStats();
      }
      
    } catch (error) {
      console.error('❌ Error general en importación:', error);
      alert('Error al importar productos: ' + error.message);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const getStockBadgeColor = (current, min) => {
    const stock = parseFloat(current);
    const minStock = parseFloat(min);
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock <= minStock) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <Layout>
      <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona el catálogo de productos y control de inventario</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Importar
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar
          </button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="space-y-5">
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Productos</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_products || 0}</p>
                </div>
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">{stats.low_stock_products || 0}</p>
                </div>
                <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sin Stock</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{stats.out_of_stock_products || 0}</p>
                </div>
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Valor Total</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {formatCurrency(stats.total_inventory_value)}
                  </p>
                </div>
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar por nombre, SKU o código de barras..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={filters.category_id}
                onChange={(e) => setFilters({ category_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las categorías</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filters.is_active}
                onChange={(e) => setFilters({ is_active: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
                <option value="">Todos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Cargando productos...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-4 text-gray-600">No hay productos para mostrar</p>
              <button
                onClick={handleCreate}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Crear el primer producto
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU / Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{product.sku}</div>
                          {product.barcode && (
                            <div className="text-xs text-gray-500">{product.barcode}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {product.category?.name || 'Sin categoría'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockBadgeColor(product.current_stock, product.min_stock)}`}>
                            {parseFloat(product.current_stock)} {product.unit}
                          </span>
                          {product.track_inventory && (
                            <div className="text-xs text-gray-500 mt-1">
                              Mín: {parseFloat(product.min_stock)} {product.unit}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(product.base_price)}
                          </div>
                          {product.average_cost > 0 && (
                            <div className="text-xs text-gray-500">
                              Costo: {formatCurrency(product.average_cost)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {product.is_active ? (
                              <button
                                onClick={() => handleDeactivate(product.id, product.name)}
                                className="text-orange-600 hover:text-orange-900"
                                title="Desactivar"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDelete(product.id, product.name)}
                                className="text-red-600 hover:text-red-900"
                                title="Eliminar permanentemente"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  {/* Mobile */}
                  <div className="flex justify-between sm:hidden mb-3">
                    <button
                      onClick={() => setPage(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-700">
                      Pág. {pagination.page} de {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPage(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> a{' '}
                        <span className="font-medium">
                          {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span>{' '}
                        de <span className="font-medium">{pagination.total}</span> productos
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Primera página */}
                      <button
                        onClick={() => setPage(1)}
                        disabled={pagination.page === 1}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Primera página"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Anterior */}
                      <button
                        onClick={() => setPage(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Números de página con ellipsis */}
                      {(() => {
                        const pages = [];
                        const delta = 2; // páginas a cada lado
                        const start = Math.max(1, pagination.page - delta);
                        const end = Math.min(pagination.totalPages, pagination.page + delta);

                        // Primera página
                        if (start > 1) {
                          pages.push(
                            <button
                              key={1}
                              onClick={() => setPage(1)}
                              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              1
                            </button>
                          );
                          if (start > 2) {
                            pages.push(<span key="ellipsis1" className="px-2 py-2 text-gray-500">...</span>);
                          }
                        }

                        // Páginas del rango
                        for (let i = start; i <= end; i++) {
                          pages.push(
                            <button
                              key={i}
                              onClick={() => setPage(i)}
                              className={`px-3 py-2 border rounded-lg text-sm font-medium ${
                                pagination.page === i
                                  ? 'bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {i}
                            </button>
                          );
                        }

                        // Última página
                        if (end < pagination.totalPages) {
                          if (end < pagination.totalPages - 1) {
                            pages.push(<span key="ellipsis2" className="px-2 py-2 text-gray-500">...</span>);
                          }
                          pages.push(
                            <button
                              key={pagination.totalPages}
                              onClick={() => setPage(pagination.totalPages)}
                              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              {pagination.totalPages}
                            </button>
                          );
                        }

                        return pages;
                      })()}

                      {/* Siguiente */}
                      <button
                        onClick={() => setPage(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Última página */}
                      <button
                        onClick={() => setPage(pagination.totalPages)}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Última página"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        product={editingProduct}
        categories={categories}
      />

      <ImportProductsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
      />
      </div>
    </Layout>
  );
}

export default ProductsPage;