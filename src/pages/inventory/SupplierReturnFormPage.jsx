import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const SupplierReturnFormPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [purchases, setPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  
  const [formData, setFormData] = useState({
    purchase_id: '',
    reason: 'defective',
    notes: '',
    credit_note_number: '',
    items: []
  });

  const searchPurchases = async () => {
    if (!searchTerm) return;
    
    setLoadingPurchases(true);
    try {
      const response = await api.get('/inventory/purchases', {
        params: { search: searchTerm, status: 'completed', limit: 10 }
      });
      setPurchases(response.data.data || []);
    } catch (error) {
      toast.error('Error al buscar compras');
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handleSelectPurchase = async (purchase) => {
    try {
      const response = await api.get(`/inventory/purchases/${purchase.id}`);
      const purchaseData = response.data.data;
      
      setSelectedPurchase(purchaseData);
      setFormData(prev => ({
        ...prev,
        purchase_id: purchaseData.id,
        items: purchaseData.items.map(item => ({
          purchase_item_id: item.id,
          product_id: item.product_id,
          product_name: item.product?.name,
          quantity_purchased: parseFloat(item.quantity),
          quantity_to_return: 0,
          unit_cost: parseFloat(item.unit_cost)
        }))
      }));
    } catch (error) {
      toast.error('Error al cargar la compra');
    }
  };

  const updateItemQuantity = (index, value) => {
    const newItems = [...formData.items];
    const quantity = parseFloat(value) || 0;
    
    if (quantity > newItems[index].quantity_purchased) {
      toast('No puedes devolver más de lo comprado');
      return;
    }
    
    newItems[index].quantity_to_return = quantity;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const itemsToReturn = formData.items
      .filter(item => item.quantity_to_return > 0)
      .map(item => ({
        purchase_item_id: item.purchase_item_id,
        quantity: item.quantity_to_return
      }));

    if (itemsToReturn.length === 0) {
      toast('Debes seleccionar al menos un producto para devolver');
      return;
    }

    setLoading(true);
    try {
      await api.post('/inventory/supplier-returns', {
        purchase_id: formData.purchase_id,
        reason: formData.reason,
        notes: formData.notes,
        credit_note_number: formData.credit_note_number,
        items: itemsToReturn
      });
      
      toast.success('Devolución a proveedor creada exitosamente');
      navigate('/inventory/supplier-returns');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear devolución');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/inventory/supplier-returns')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nueva Devolución a Proveedor</h1>
            <p className="text-gray-600 mt-1">Selecciona una compra y los productos a devolver</p>
          </div>
        </div>

        {!selectedPurchase && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Buscar Compra</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Buscar por número de compra o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchPurchases()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={searchPurchases}
                disabled={loadingPurchases}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingPurchases ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
            </div>

            {purchases.length > 0 && (
              <div className="mt-4 space-y-2">
                {purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    onClick={() => handleSelectPurchase(purchase)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{purchase.purchase_number}</p>
                        <p className="text-sm text-gray-600">{purchase.supplier?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${parseFloat(purchase.total_amount).toFixed(2)}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(purchase.purchase_date + 'T12:00:00').toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedPurchase && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Compra: {selectedPurchase.purchase_number}</h2>
                  <p className="text-gray-600">Proveedor: {selectedPurchase.supplier?.name}</p>
                  <p className="text-sm text-gray-500">
                    Fecha: {new Date(selectedPurchase.purchase_date + 'T12:00:00').toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPurchase(null);
                    setPurchases([]);
                    setSearchTerm('');
                    setFormData({ purchase_id: '', reason: 'defective', notes: '', credit_note_number: '', items: [] });
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Cambiar compra
                </button>
              </div>

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
                    <option value="incorrect">Producto Incorrecto</option>
                    <option value="excess">Exceso de Inventario</option>
                    <option value="damaged">Dañado en Tránsito</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Nota de Crédito
                  </label>
                  <input
                    type="text"
                    value={formData.credit_note_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, credit_note_number: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="NC-12345 (opcional)"
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

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Productos a Devolver</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comprado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">A Devolver</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.product_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.quantity_purchased}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max={item.quantity_purchased}
                            step="0.01"
                            value={item.quantity_to_return}
                            onChange={(e) => updateItemQuantity(index, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ${parseFloat(item.unit_cost).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          ${(item.quantity_to_return * item.unit_cost).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-lg font-semibold">
                    Total a Devolver: $
                    {formData.items
                      .reduce((sum, item) => sum + (item.quantity_to_return * item.unit_cost), 0)
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/inventory/supplier-returns')}
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

export default SupplierReturnFormPage;