import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Trash2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import useCustomerReturnsStore from '../../store/customerReturnsStore';
import api from '../../api/axios';

const CustomerReturnFormPage = () => {
  const navigate = useNavigate();
  const { createReturn, loading } = useCustomerReturnsStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [loadingSales, setLoadingSales] = useState(false);
  
  const [formData, setFormData] = useState({
    sale_id: '',
    reason: 'defective',
    notes: '',
    items: []
  });

  // Buscar ventas
  const searchSales = async () => {
    if (!searchTerm) return;
    
    setLoadingSales(true);
    try {
      const response = await api.get('/sales', {
        params: { search: searchTerm, status: 'completed', limit: 10 }
      });
      setSales(response.data.data || []);
    } catch (error) {
      console.error('Error buscando ventas:', error);
      alert('Error al buscar ventas');
    } finally {
      setLoadingSales(false);
    }
  };

  // Seleccionar venta
  const handleSelectSale = async (sale) => {
    try {
      const response = await api.get(`/sales/${sale.id}`);
      const saleData = response.data.data;
      
      setSelectedSale(saleData);
      setFormData(prev => ({
        ...prev,
        sale_id: saleData.id,
        items: saleData.items.map(item => ({
          sale_item_id: item.id,
          product_id: item.product_id,
          product_name: item.product_name || item.product?.name,
          quantity_sold: parseFloat(item.quantity),
          quantity_to_return: 0,
          unit_price: parseFloat(item.unit_price),
          condition: 'used'
        }))
      }));
    } catch (error) {
      console.error('Error obteniendo venta:', error);
      alert('Error al cargar la venta');
    }
  };

  // Actualizar cantidad a devolver
  const updateItemQuantity = (index, value) => {
    const newItems = [...formData.items];
    const quantity = parseFloat(value) || 0;
    
    if (quantity > newItems[index].quantity_sold) {
      alert('No puedes devolver más de lo vendido');
      return;
    }
    
    newItems[index].quantity_to_return = quantity;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  // Actualizar condición
  const updateItemCondition = (index, condition) => {
    const newItems = [...formData.items];
    newItems[index].condition = condition;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Filtrar solo items con cantidad > 0
    const itemsToReturn = formData.items
      .filter(item => item.quantity_to_return > 0)
      .map(item => ({
        sale_item_id: item.sale_item_id,
        quantity: item.quantity_to_return,
        condition: item.condition
      }));

    if (itemsToReturn.length === 0) {
      alert('Debes seleccionar al menos un producto para devolver');
      return;
    }

    try {
      await createReturn({
        sale_id: formData.sale_id,
        reason: formData.reason,
        notes: formData.notes,
        items: itemsToReturn
      });
      
      alert('Devolución creada exitosamente');
      navigate('/sales/customer-returns');
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message || 'Error al crear devolución');
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/sales/customer-returns')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nueva Devolución de Cliente</h1>
            <p className="text-gray-600 mt-1">Selecciona una venta y los productos a devolver</p>
          </div>
        </div>

        {/* Search Sale */}
        {!selectedSale && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Buscar Venta</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Buscar por número de venta o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchSales()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={searchSales}
                disabled={loadingSales}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingSales ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Sales List */}
            {sales.length > 0 && (
              <div className="mt-4 space-y-2">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => handleSelectSale(sale)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{sale.sale_number}</p>
                        <p className="text-sm text-gray-600">{sale.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${parseFloat(sale.total_amount).toFixed(2)}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        {selectedSale && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sale Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Venta: {selectedSale.sale_number}</h2>
                  <p className="text-gray-600">Cliente: {selectedSale.customer_name}</p>
                  <p className="text-sm text-gray-500">
                    Fecha: {new Date(selectedSale.sale_date).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSale(null);
                    setSales([]);
                    setSearchTerm('');
                    setFormData({ sale_id: '', reason: 'defective', notes: '', items: [] });
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Cambiar venta
                </button>
              </div>

              {/* Reason */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo de Devolución *
                  </label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="defective">Producto Defectuoso</option>
                    <option value="wrong_item">Producto Incorrecto</option>
                    <option value="changed_mind">Cliente Cambió de Opinión</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
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

            {/* Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Productos a Devolver</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Producto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Vendido
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        A Devolver
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Condición
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Precio Unit.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {item.product_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.quantity_sold}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max={item.quantity_sold}
                            step="0.01"
                            value={item.quantity_to_return}
                            onChange={(e) => updateItemQuantity(index, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.condition}
                            onChange={(e) => updateItemCondition(index, e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            disabled={item.quantity_to_return === 0}
                          >
                            <option value="new">Nuevo</option>
                            <option value="used">Usado</option>
                            <option value="defective">Defectuoso</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ${parseFloat(item.unit_price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          ${(item.quantity_to_return * item.unit_price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="mt-4 flex justify-end">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-lg font-semibold">
                    Total a Devolver: $
                    {formData.items
                      .reduce((sum, item) => sum + (item.quantity_to_return * item.unit_price), 0)
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/sales/customer-returns')}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Devolución'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default CustomerReturnFormPage;