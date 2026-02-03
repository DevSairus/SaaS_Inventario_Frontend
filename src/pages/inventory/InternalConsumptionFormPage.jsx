import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, X } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import useInternalConsumptionsStore from '../../store/internalConsumptionsStore';
import api from '../../api/axios';

const InternalConsumptionFormPage = () => {
  const navigate = useNavigate();
  const { createConsumption, loading } = useInternalConsumptionsStore();

  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [formData, setFormData] = useState({
    warehouse_id: '',
    department: '',
    purpose: '',
    notes: '',
    items: []
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/inventory/warehouses');
      setWarehouses(response.data.data || []);
    } catch (error) {
      console.error('Error cargando bodegas:', error);
    }
  };

  const searchProducts = async () => {
    if (!searchProduct.trim()) {
      setSearchError('Ingresa un término de búsqueda');
      return;
    }

    if (!formData.warehouse_id) {
      setSearchError('Primero selecciona la bodega');
      return;
    }

    setSearchError('');
    try {
      const response = await api.get('/products', {
        params: { 
          search: searchProduct, 
          is_active: true,
          warehouse_id: formData.warehouse_id,
          limit: 20 
        }
      });
      
      const productsData = response.data.data || [];
      
      // Filtrar solo productos con stock
      const productsWithStock = productsData.filter(p => 
        parseFloat(p.available_stock || 0) > 0
      );
      
      if (productsWithStock.length === 0) {
        setSearchError('No se encontraron productos con stock disponible');
      }
      
      setProducts(productsWithStock);
    } catch (error) {
      console.error('Error buscando productos:', error);
      setSearchError('Error al buscar productos');
    }
  };

  const addProduct = (product) => {
    if (formData.items.find(item => item.product_id === product.id)) {
      alert('Este producto ya está en la lista');
      return;
    }

    const availableStock = parseFloat(product.available_stock || 0);
    if (availableStock <= 0) {
      alert('Este producto no tiene stock disponible');
      return;
    }

    // ✅ Obtener el costo unitario del producto correctamente
    const unitCost = parseFloat(product.average_cost || product.unit_cost || product.cost || 0);

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        available_stock: availableStock,
        unit_cost: unitCost,
        quantity: 0,
        notes: ''
      }]
    }));
    
    setSearchProduct('');
    setProducts([]);
    setShowProductSearch(false);
    setSearchError('');
  };

  const removeProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateQuantity = (index, value) => {
    const newItems = [...formData.items];
    const quantity = parseFloat(value) || 0;

    if (quantity > newItems[index].available_stock) {
      alert(`Stock máximo disponible: ${newItems[index].available_stock}`);
      return;
    }

    newItems[index].quantity = quantity;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const updateItemNotes = (index, value) => {
    const newItems = [...formData.items];
    newItems[index].notes = value;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitCost = parseFloat(item.unit_cost) || 0;
      return sum + (quantity * unitCost);
    }, 0);
  };

  const handleWarehouseChange = (value) => {
    setFormData(prev => ({ 
      ...prev, 
      warehouse_id: value,
      items: [] // Limpiar items si cambia la bodega
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      alert('Debes agregar al menos un producto');
      return;
    }

    const itemsWithQuantity = formData.items.filter(item => item.quantity > 0);
    if (itemsWithQuantity.length === 0) {
      alert('Debes especificar cantidades para los productos');
      return;
    }

    try {
      await createConsumption({
        ...formData,
        items: itemsWithQuantity.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes
        }))
      });

      alert('Consumo interno creado exitosamente');
      navigate('/inventory/internal-consumptions');
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message || 'Error al crear consumo');
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/inventory/internal-consumptions')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nuevo Consumo Interno</h1>
            <p className="text-gray-600 mt-1">Registra el uso de productos para operaciones internas</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Información del Consumo</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bodega *
                </label>
                <select
                  value={formData.warehouse_id}
                  onChange={(e) => handleWarehouseChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar bodega</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                {formData.warehouse_id && formData.items.length > 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    ⚠️ Cambiar la bodega borrará los productos agregados
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departamento *
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Producción, Mantenimiento, Marketing"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Propósito
                </label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Muestras para clientes, Uso en evento"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Información adicional..."
                />
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Productos a Consumir</h2>
              <button
                type="button"
                onClick={() => setShowProductSearch(true)}
                disabled={!formData.warehouse_id}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Agregar Producto
              </button>
            </div>

            {!formData.warehouse_id && (
              <div className="text-center py-8 text-amber-600 bg-amber-50 rounded-lg">
                ⚠️ Primero selecciona la bodega para agregar productos
              </div>
            )}

            {formData.warehouse_id && formData.items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay productos agregados. Haz clic en "Agregar Producto" para comenzar.
              </div>
            )}

            {formData.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.product_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.product_sku}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.available_stock}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max={item.available_stock}
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(index, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ${item.unit_cost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          ${(item.quantity * item.unit_cost).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => updateItemNotes(index, e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="Opcional"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeProduct(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {formData.items.length > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-lg font-semibold">
                    Costo Total: ${calculateTotal().toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/inventory/internal-consumptions')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || formData.items.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Consumo'}
            </button>
          </div>
        </form>

        {/* Product Search Modal */}
        {showProductSearch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Buscar Producto</h3>
                <button
                  onClick={() => {
                    setShowProductSearch(false);
                    setSearchProduct('');
                    setProducts([]);
                    setSearchError('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchProduct}
                  onChange={(e) => {
                    setSearchProduct(e.target.value);
                    setSearchError('');
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && searchProducts()}
                  placeholder="Buscar por nombre o SKU..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={searchProducts}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>

              {searchError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {searchError}
                </div>
              )}

              {products.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {products.map(product => (
                    <div
                      key={product.id}
                      onClick={() => addProduct(product)}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">Stock: {product.available_stock}</p>
                          <p className="text-sm text-gray-600">
                            Costo: ${parseFloat(product.average_cost || product.unit_cost || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowProductSearch(false);
                    setSearchProduct('');
                    setProducts([]);
                    setSearchError('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InternalConsumptionFormPage;