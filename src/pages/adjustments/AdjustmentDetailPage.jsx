import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdjustmentsStore } from '../../store/adjustmentsStore';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';

const AdjustmentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    adjustment,
    isLoading,
    fetchAdjustmentById,
    confirmAdjustment,
    cancelAdjustment,
    clearAdjustment
  } = useAdjustmentsStore();

  useEffect(() => {
    fetchAdjustmentById(id);
    return () => clearAdjustment();
  }, [id]);

  const handleConfirm = async () => {
    if (window.confirm('¿Confirmar este ajuste? Esta acción actualizará el inventario y no podrá deshacerse.')) {
      const success = await confirmAdjustment(id);
      if (success) {
        toast.success('Ajuste confirmado exitosamente');
      }
    }
  };

  const handleCancel = async () => {
    if (window.confirm('¿Cancelar este ajuste?')) {
      const success = await cancelAdjustment(id);
      if (success) {
        toast.success('Ajuste cancelado exitosamente');
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    const labels = {
      draft: 'Borrador',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado'
    };
    return (
      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (isLoading || !adjustment) {
    return (
      <Layout>
        <div className="p-6 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const totals = {
    quantity: adjustment.items?.reduce((sum, item) => sum + parseFloat(item.quantity), 0) || 0,
    cost: adjustment.items?.reduce((sum, item) => sum + parseFloat(item.total_cost), 0) || 0
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/adjustments')}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Ajuste {adjustment.adjustment_number}</h1>
                <p className="text-gray-600 mt-1">{adjustment.reason}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {adjustment.status === 'draft' && (
                <>
                  <button
                    onClick={() => navigate(`/adjustments/edit/${id}`)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Info General */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Estado</h3>
            {getStatusBadge(adjustment.status)}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Tipo</h3>
            <p className="text-lg font-semibold text-gray-900 capitalize">{adjustment.adjustment_type}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Fecha</h3>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(adjustment.adjustment_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Productos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {adjustment.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.product?.name}</div>
                      <div className="text-sm text-gray-500">{item.product?.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">{formatCurrency(item.unit_cost)}</td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                      {formatCurrency(item.total_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">TOTALES</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{totals.quantity}</td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-blue-600">
                    {formatCurrency(totals.cost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notas */}
        {adjustment.notes && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Notas</h3>
            <p className="text-gray-700">{adjustment.notes}</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdjustmentDetailPage;