import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import useTransfersStore from '../../store/transfersStore';

const TransferReceivePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTransfer, fetchTransferById, receiveTransfer, loading } = useTransfersStore();

  const [receivingNotes, setReceivingNotes] = useState('');
  const [items, setItems] = useState([]);
  const [hasDiscrepancies, setHasDiscrepancies] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTransferById(id);
    }
  }, [id]);

  useEffect(() => {
    if (currentTransfer?.items) {
      const initialItems = currentTransfer.items.map(item => ({
        ...item,
        quantity_received: parseFloat(item.quantity_sent),
        condition: 'good'
      }));
      setItems(initialItems);
      checkDiscrepancies(initialItems);
    }
  }, [currentTransfer]);

  const checkDiscrepancies = (itemsList) => {
    const hasDiscrep = itemsList.some(item => 
      parseFloat(item.quantity_received) !== parseFloat(item.quantity_sent)
    );
    setHasDiscrepancies(hasDiscrep);
  };

  const updateQuantityReceived = (index, value) => {
    const newItems = [...items];
    const quantity = parseFloat(value) || 0;
    newItems[index].quantity_received = quantity;
    setItems(newItems);
    checkDiscrepancies(newItems);
  };

  const updateCondition = (index, condition) => {
    const newItems = [...items];
    newItems[index].condition = condition;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación: al menos un producto debe tener cantidad recibida > 0
    const itemsWithQuantity = items.filter(item => parseFloat(item.quantity_received) > 0);
    if (itemsWithQuantity.length === 0) {
      alert('Debes recibir al menos un producto');
      return;
    }

    // Confirmación si hay discrepancias
    if (hasDiscrepancies) {
      const confirmed = window.confirm(
        '⚠️ Hay diferencias entre las cantidades enviadas y recibidas. ¿Deseas continuar?'
      );
      if (!confirmed) return;
    }

    try {
      await receiveTransfer(id, {
        receiving_notes: receivingNotes,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity_received: parseFloat(item.quantity_received),
          condition: item.condition
        }))
      });

      alert('Transferencia recibida exitosamente');
      navigate('/inventory/transfers');
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message || 'Error al recibir transferencia');
    }
  };

  if (!currentTransfer) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/inventory/transfers')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recibir Transferencia</h1>
            <p className="text-gray-600 mt-1">{currentTransfer.transfer_number}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transfer Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Información de Transferencia</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Bodega Origen</p>
                <p className="font-medium">{currentTransfer.fromWarehouse?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Bodega Destino</p>
                <p className="font-medium">{currentTransfer.toWarehouse?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha de Envío</p>
                <p className="font-medium">
                  {currentTransfer.sent_date 
                    ? new Date(currentTransfer.sent_date).toLocaleString()
                    : '-'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Número de Guía</p>
                <p className="font-medium">{currentTransfer.tracking_number || '-'}</p>
              </div>
              {currentTransfer.shipping_method && (
                <div>
                  <p className="text-sm text-gray-600">Método de Envío</p>
                  <p className="font-medium">{currentTransfer.shipping_method}</p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas de Recepción
              </label>
              <textarea
                value={receivingNotes}
                onChange={(e) => setReceivingNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Observaciones sobre la recepción, condición del empaque, etc..."
              />
            </div>
          </div>

          {/* Discrepancy Warning */}
          {hasDiscrepancies && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Diferencias detectadas</p>
                <p className="text-sm text-amber-700 mt-1">
                  Hay productos con cantidades recibidas diferentes a las enviadas. 
                  Verifica cuidadosamente antes de confirmar la recepción.
                </p>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Productos Recibidos</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enviado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recibido</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condición</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => {
                    const difference = parseFloat(item.quantity_received) - parseFloat(item.quantity_sent);
                    const hasDifference = difference !== 0;
                    
                    return (
                      <tr key={index} className={hasDifference ? 'bg-yellow-50' : ''}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.product?.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.product?.sku}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {parseFloat(item.quantity_sent).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity_received}
                            onChange={(e) => updateQuantityReceived(index, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.condition}
                            onChange={(e) => updateCondition(index, e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="good">Bueno</option>
                            <option value="damaged">Dañado</option>
                            <option value="missing">Faltante</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {hasDifference ? (
                            <span className={`text-sm font-medium ${
                              difference > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {difference > 0 ? '+' : ''}{difference.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Enviado</p>
                <p className="text-lg font-semibold text-gray-900">
                  {items.reduce((sum, item) => sum + parseFloat(item.quantity_sent), 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Total Recibido</p>
                <p className="text-lg font-semibold text-blue-900">
                  {items.reduce((sum, item) => sum + parseFloat(item.quantity_received), 0).toFixed(2)}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${hasDiscrepancies ? 'bg-amber-50' : 'bg-green-50'}`}>
                <p className={`text-sm ${hasDiscrepancies ? 'text-amber-600' : 'text-green-600'}`}>
                  Diferencia Total
                </p>
                <p className={`text-lg font-semibold ${hasDiscrepancies ? 'text-amber-900' : 'text-green-900'}`}>
                  {(
                    items.reduce((sum, item) => sum + parseFloat(item.quantity_received), 0) -
                    items.reduce((sum, item) => sum + parseFloat(item.quantity_sent), 0)
                  ).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/inventory/transfers')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              {loading ? 'Recibiendo...' : 'Confirmar Recepción'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default TransferReceivePage;