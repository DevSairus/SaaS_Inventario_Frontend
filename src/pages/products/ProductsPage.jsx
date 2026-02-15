import { useEffect, useState } from 'react';
import useProductsStore from '../../store/productsStore';
import useAuthStore from '../../store/authStore';
import useCategoriesStore from '../../store/categoriesStore';
import ProductFormModal from '../../components/products/ProductFormModal';
import ImportProductsModal from '../../components/products/ImportProductsModal';
import Layout from '../../components/layout/Layout';
import { exportProductsToExcel } from '../../utils/excelExport';
import SmartTable from '../../components/common/SmartTable';
import { formatCurrency, toInteger, toNumber } from '../../utils/numberUtils';

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
  }, []);

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
    return unitMap[normalized] || 'unit';
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
          const mappedData = {
            sku: productData.sku,
            name: productData.name,
            description: null,
            category_id: null,
            unit_of_measure: 'unidad',
            current_stock: toInteger(productData.current_stock, 0),
            min_stock: toInteger(productData.min_stock, 0),
            max_stock: null,
            base_price: toInteger(productData.base_price, 0),
            average_cost: toInteger(productData.average_cost, 0),
            profit_margin_percentage: toInteger(productData.profit_margin_percentage, 30),
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
          
          if (errorMsg.includes('ya existe') || 
              errorMsg.includes('duplicate') || 
              errorMsg.includes('unique') ||
              errorMsg.includes('duplicado')) {
            
            skippedCount++;
            skipped.push(productData.sku);
            console.log(`⏭️ Omitido (duplicado): ${productData.sku}`);
            
          } else {
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

      console.log('\n========================================');
      console.log('📊 RESUMEN DE IMPORTACIÓN');
      console.log('========================================');
      console.log(`Total procesados: ${productsData.length}`);
      console.log(`✅ Importados: ${successCount}`);
      console.log(`⏭️ Omitidos (duplicados): ${skippedCount}`);
      console.log(`❌ Errores: ${errorCount}`);
      console.log('========================================\n');

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

      alert(message);
      
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

  const getStockBadgeColor = (current, min) => {
    const stock = toInteger(current, 0);
    const minStock = toInteger(min, 0);
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock <= minStock) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const columns = [
    {
      key: 'sku',
      label: 'SKU',
      sortable: true,
      className: 'font-mono text-xs'
    },
    {
      key: 'name',
      label: 'Producto',
      sortable: true,
      render: (product) => (
        <div>
          <div className="font-medium text-gray-900">{product.name}</div>
          {product.category?.name && (
            <div className="text-xs text-gray-500">{product.category.name}</div>
          )}
        </div>
      )
    },
    {
      key: 'current_stock',
      label: 'Stock',
      sortable: true,
      align: 'center',
      render: (product) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockBadgeColor(product.current_stock, product.min_stock)}`}>
          {toInteger(product.current_stock, 0)}
        </span>
      )
    },
    {
      key: 'base_price',
      label: 'Precio',
      sortable: true,
      align: 'right',
      render: (product) => (
        <span className="font-medium">${formatCurrency(product.base_price)}</span>
      )
    },
    {
      key: 'average_cost',
      label: 'Costo Prom.',
      sortable: true,
      align: 'right',
      render: (product) => (
        <span className="text-gray-600">${formatCurrency(product.average_cost)}</span>
      )
    },
    {
      key: 'is_active',
      label: 'Estado',
      align: 'center',
      render: (product) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          product.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {product.is_active ? 'Activo' : 'Inactivo'}
        </span>
      )
    }
  ];

  const actions = [
    {
      label: 'Editar',
      onClick: handleEdit,
      className: 'text-blue-600 hover:text-blue-900'
    },
    {
      label: 'Desactivar',
      onClick: (product) => handleDeactivate(product.id, product.name),
      condition: (product) => product.is_active,
      className: 'text-orange-600 hover:text-orange-900'
    },
    {
      label: 'Eliminar',
      onClick: (product) => handleDelete(product.id, product.name),
      className: 'text-red-600 hover:text-red-900',
      requiresPermission: 'delete_product'
    }
  ];

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gestiona tu catálogo de productos
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Productos
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.total_products || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Activos
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.active_products || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Stock Bajo
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.low_stock_products || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Valor Inventario
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      ${formatCurrency(stats.total_inventory_value)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}

        <SmartTable
          data={products}
          columns={columns}
          actions={actions}
          isLoading={isLoading}
          pagination={{
            currentPage: pagination.page,
            totalPages: pagination.total_pages,
            totalItems: pagination.total,
            onPageChange: setPage
          }}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          filters={[
            {
              key: 'category_id',
              label: 'Categoría',
              type: 'select',
              options: [
                { value: '', label: 'Todas' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ],
              value: filters.category_id,
              onChange: (value) => setFilters({ category_id: value })
            },
            {
              key: 'is_active',
              label: 'Estado',
              type: 'select',
              options: [
                { value: '', label: 'Todos' },
                { value: 'true', label: 'Activos' },
                { value: 'false', label: 'Inactivos' }
              ],
              value: filters.is_active,
              onChange: (value) => setFilters({ is_active: value })
            }
          ]}
          onCreateNew={handleCreate}
          createNewLabel="Nuevo Producto"
          onExport={handleExport}
          onImport={() => setIsImportModalOpen(true)}
        />

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