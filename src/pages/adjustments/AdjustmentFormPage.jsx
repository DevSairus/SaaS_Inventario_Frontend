import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAdjustmentsStore } from '../../store/adjustmentsStore';
import useProductsStore from '../../store/productsStore';
import Layout from '../../components/layout/Layout';
import { 
  formatCurrency, 
  toInteger, 
  toNumber, 
  INPUT_CONFIG 
} from '../../utils/numberUtils';

const AdjustmentFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  
  const { createAdjustment, updateAdjustment, getAdjustmentById, isLoading } = useAdjustmentsStore();
  const { products, fetchProducts } = useProductsStore();

  const [formData, setFormData] = useState({
    adjustment_type: 'entrada',
    reason: '',
    warehouse_id: null,
    adjustment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    quantity: 1,
    unit_cost: 0,
    reason: '',
    notes: ''
  });

  // Estados para búsqueda de productos
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Cargar datos en modo edición
  useEffect(() => {
    const loadAdjustmentData = async () => {
      if (isEditMode && id) {
        try {
          const adjustment = await getAdjustmentById(id);
          
          if (adjustment.status !== 'draft') {
            alert('Solo se pueden editar ajustes en estado borrador');
            navigate(`/adjustments/${id}`);
            return;
          }

          setFormData({
            adjustment_type: adjustment.adjustment_type || 'entrada',
            reason: adjustment.reason || '',
            warehouse_id: adjustment.warehouse_id || null,
            adjustment_date: adjustment.adjustment_date || '',
            notes: adjustment.notes || ''
          });

          if (adjustment.items && adjustment.items.length > 0) {
            const loadedItems = adjustment.items.map(item => {
              const product = products.find(p => p.id === item.product_id);
              return {
                product_id: item.product_id,
                quantity: toInteger(item.quantity, 1),
                unit_cost: toInteger(item.unit_cost, 0),
                reason: item.reason || '',
                notes: item.notes || '',
                product_name: item.product?.name || product?.name || 'Producto desconocido',
                product_sku: item.product?.sku || product?.sku || '',
                total_cost: toInteger(item.total_cost, 0)
              };
            });
            setItems(loadedItems);
          }
        } catch (error) {
          console.error('Error cargando ajuste:', error);
          alert('Error al cargar los datos del ajuste');
          navigate('/adjustments');
        }
      }
    };

    if (products.length > 0) {
      loadAdjustmentData();
    }
  }, [isEditMode, id, navigate, getAdjustmentById, products]);

  // Filtrar productos
  useEffect(() => {
    if (productSearch.trim() === '') {
      setFilteredProducts(products.slice(0, 50));
    } else {
      const search = productSearch.toLowerCase();
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search)
      ).slice(0, 50);
      setFilteredProducts(filtered);
    }
  }, [productSearch, products]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProductDropdown && !event.target.closest('.product-search-container')) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProductDropdown]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    
    let numValue = value;
    if (name === 'quantity') {
      numValue = toInteger(value, 1);
    } else if (name === 'unit_cost') {
      numValue = toInteger(value, 0);
    }
    
    setCurrentItem(prev => ({ ...prev, [name]: numValue }));
  };

  const handleProductSearch = (e) => {
    setProductSearch(e.target.value);
    setShowProductDropdown(true);
  };

  const selectProduct = (product) => {
    setCurrentItem(prev => ({ 
      ...prev, 
      product_id: product.id,
      unit_cost: toInteger(product.average_cost, 0)
    }));
    setProductSearch(`${product.sku} - ${product.name}`);
    setShowProductDropdown(false);
  };

  const clearProductSelection = () => {
    setCurrentItem(prev => ({ ...prev, product_id: '', unit_cost: 0 }));
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const addItem = () => {
    if (!currentItem.product_id || !currentItem.quantity) {
      alert('Por favor seleccione un producto y cantidad');
      return;
    }

    const existingItemIndex = items.findIndex(item => item.product_id === currentItem.product_id);
    
    if (existingItemIndex >= 0) {
      alert('Este producto ya está en la lista');
      return;
    }

    const product = products.find(p => p.id === currentItem.product_id);
    const quantity = toInteger(currentItem.quantity, 1);
    const unit_cost = toInteger(currentItem.unit_cost, 0);
    const total_cost = quantity * unit_cost;

    const newItem = {
      product_id: currentItem.product_id,
      quantity,
      unit_cost,
      reason: currentItem.reason,
      notes: currentItem.notes,
      product_name: product?.name || '',
      product_sku: product?.sku || '',
      total_cost
    };

    setItems([...items, newItem]);
    
    setCurrentItem({
      product_id: '',
      quantity: 1,
      unit_cost: 0,
      reason: '',
      notes: ''
    });
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const totalQuantity = items.reduce((sum, item) => sum + toInteger(item.quantity, 0), 0);
    const totalCost = items.reduce((sum, item) => sum + toInteger(item.total_cost, 0), 0);
    return { totalQuantity, totalCost };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.adjustment_type || !formData.reason) {
      alert('Por favor complete el tipo y razón del ajuste');
      return;
    }

    if (items.length === 0) {
      alert('Debe agregar al menos un producto');
      return;
    }

    const adjustmentData = {
      ...formData,
      items: items.map(item => ({
        product_id: item.product_id,
        quantity: toInteger(item.quantity),
        unit_cost: toInteger(item.unit_cost),
        reason: item.reason || null,
        notes: item.notes || null
      }))
    };

    try {
      if (isEditMode) {
        await updateAdjustment(id, adjustmentData);
        alert('Ajuste actualizado exitosamente');
        navigate(`/adjustments/${id}`);
      } else {
        const result = await createAdjustment(adjustmentData);
        alert('Ajuste creado exitosamente');
        navigate(`/adjustments/${result.id}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert(isEditMode ? 'Error al actualizar el ajuste' : 'Error al crear el ajuste');
    }
  };

  const totals = calculateTotals();

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {isEditMode ? 'Editar Ajuste de Inventario' : 'Nuevo Ajuste de Inventario'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEditMode ? 'Modifica los datos del ajuste' : 'Crea un nuevo ajuste de entrada o salida'}
            </p>
          </div>
          <button
            onClick={() => navigate('/adjustments')}
            className="text-gray-600 hover:text-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Información General */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Información General</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Ajuste <span className="text-red-500">*</span>
                </label>
                <select
                  name="adjustment_type"
                  value={formData.adjustment_type}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="entrada">Entrada (Aumentar Stock)</option>
                  <option value="salida">Salida (Disminuir Stock)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón del Ajuste <span className="text-red-500">*</span>
                </label>
                <select
                  name="reason"
                  value={formData.reason}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccione una razón</option>
                  <optgroup label="Entrada">
                    <option value="Sobrante">Sobrante</option>
                    <option value="Devolución">Devolución</option>
                    <option value="Inventario físico">Inventario físico</option>
                    <option value="Corrección">Corrección</option>
                  </optgroup>
                  <optgroup label="Salida">
                    <option value="Merma">Merma</option>
                    <option value="Daño">Daño</option>
                    <option value="Robo">Robo</option>
                    <option value="Pérdida">Pérdida</option>
                    <option value="Vencimiento">Vencimiento</option>
                    <option value="Uso interno">Uso interno</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha del Ajuste <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="adjustment_date"
                  value={formData.adjustment_date}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detalles adicionales sobre el ajuste..."
              />
            </div>
          </div>

          {/* Agregar Producto */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Agregar Productos</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div className="md:col-span-2 relative product-search-container">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Producto
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={handleProductSearch}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Buscar por SKU o nombre..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {currentItem.product_id && (
                    <button
                      type="button"
                      onClick={clearProductSelection}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {showProductDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        No se encontraron productos
                      </div>
                    ) : (
                      <div>
                        {filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => selectProduct(product)}
                            className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">
                              SKU: {product.sku} | Stock: {product.current_stock}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={currentItem.quantity}
                  onChange={handleItemChange}
                  {...INPUT_CONFIG.quantity}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo Unitario
                </label>
                <input
                  type="number"
                  name="unit_cost"
                  value={currentItem.unit_cost}
                  onChange={handleItemChange}
                  {...INPUT_CONFIG.price}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={addItem}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar Producto
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Productos */}
          {items.length > 0 && (
            <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Productos Agregados</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                          <div className="text-sm text-gray-500">{item.product_sku}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">${formatCurrency(item.unit_cost)}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                          ${formatCurrency(item.total_cost)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">TOTALES</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{totals.totalQuantity}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">
                        ${formatCurrency(totals.totalCost)}
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/adjustments')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isLoading || items.length === 0}
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              )}
              {isLoading 
                ? (isEditMode ? 'Actualizando...' : 'Creando...') 
                : (isEditMode ? 'Actualizar Ajuste' : 'Crear Ajuste')
              }
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AdjustmentFormPage;