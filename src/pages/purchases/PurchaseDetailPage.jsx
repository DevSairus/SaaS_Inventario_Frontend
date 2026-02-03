import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePurchasesStore } from '../../store/purchasesStore';
import Layout from '../../components/layout/Layout';

const PurchaseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const {
    purchase,
    isLoading,
    fetchPurchaseById,
    confirmPurchase,
    receivePurchase,
    cancelPurchase
  } = usePurchasesStore();

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [receivedItems, setReceivedItems] = useState([]);
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    if (id) {
      fetchPurchaseById(id);
    }
  }, [id]);

  useEffect(() => {
    if (purchase && purchase.items) {
      setReceivedItems(
        purchase.items.map(item => ({
          item_id: item.id,
          received_quantity: item.quantity
        }))
      );
    }
  }, [purchase]);

  const handleConfirm = async () => {
    if (window.confirm('¿Está seguro de confirmar esta compra? Ya no podrá editarla.')) {
      const success = await confirmPurchase(id);
      if (success) {
        alert('Compra confirmada exitosamente');
      }
    }
  };

  const handleReceive = async () => {
    const success = await receivePurchase(id, receivedItems);
    if (success) {
      alert('Compra recibida exitosamente. El stock ha sido actualizado.');
      setShowReceiveModal(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      alert('Por favor ingrese un motivo de cancelación');
      return;
    }

    const success = await cancelPurchase(id, cancellationReason);
    if (success) {
      alert('Compra cancelada exitosamente');
      setShowCancelModal(false);
    }
  };

  const updateReceivedQuantity = (itemId, quantity) => {
    setReceivedItems(prev =>
      prev.map(item =>
        item.item_id === itemId
          ? { ...item, received_quantity: parseFloat(quantity) || 0 }
          : item
      )
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Borrador' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmada' },
      received: { bg: 'bg-green-100', text: 'text-green-800', label: 'Recibida' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading || !purchase) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Cargando detalles de la compra...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/purchases')}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Orden de Compra {purchase.purchase_number}
              </h1>
              <p className="text-gray-600 mt-1">
                {formatDate(purchase.purchase_date)}
              </p>
            </div>
          </div>
          <div>
            {getStatusBadge(purchase.status)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {purchase.status === 'draft' && (
            <>
              <button
                onClick={handleConfirm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Confirmar Compra
              </button>
              <button
                onClick={() => navigate(`/purchases/edit/${id}`)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
            </>
          )}

          {purchase.status === 'confirmed' && (
            <button
              onClick={() => setShowReceiveModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Recibir Compra
            </button>
          )}

          {(purchase.status === 'draft' || purchase.status === 'confirmed') && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Información del Proveedor</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-medium text-gray-900">{purchase.supplier?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Razón Social</p>
                <p className="font-medium text-gray-900">{purchase.supplier?.business_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">NIT/RUT</p>
                <p className="font-medium text-gray-900">{purchase.supplier?.tax_id || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{purchase.supplier?.email || '-'}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Productos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    {purchase.status === 'received' && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Recibido</th>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">IVA</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Desc.</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchase.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.product?.name || '-'}</div>
                        <div className="text-sm text-gray-500">{item.product?.sku || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">{item.quantity}</td>
                      {purchase.status === 'received' && (
                        <td className="px-6 py-4 text-right text-sm">
                          <span className="font-medium text-green-600">{item.received_quantity}</span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-right text-sm text-gray-900">{formatCurrency(item.unit_cost)}</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">{item.tax_rate}%</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">{item.discount_percentage}%</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {(purchase.notes || purchase.internal_notes) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Notas</h2>
              {purchase.notes && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Notas</p>
                  <p className="text-gray-900">{purchase.notes}</p>
                </div>
              )}
              {purchase.internal_notes && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Notas Internas</p>
                  <p className="text-gray-900">{purchase.internal_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Totals */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Resumen</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(purchase.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IVA:</span>
                <span className="font-medium">{formatCurrency(purchase.tax_amount)}</span>
              </div>
              {purchase.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Descuento:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(purchase.discount_amount)}</span>
                </div>
              )}
              {purchase.shipping_cost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Envío:</span>
                  <span className="font-medium">{formatCurrency(purchase.shipping_cost)}</span>
                </div>
              )}
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-blue-600">{formatCurrency(purchase.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Información Adicional</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Fecha de Compra</p>
                <p className="font-medium text-gray-900">{formatDate(purchase.purchase_date)}</p>
              </div>
              {purchase.expected_delivery_date && (
                <div>
                  <p className="text-sm text-gray-600">Entrega Esperada</p>
                  <p className="font-medium text-gray-900">{formatDate(purchase.expected_delivery_date)}</p>
                </div>
              )}
              {purchase.received_date && (
                <div>
                  <p className="text-sm text-gray-600">Fecha de Recepción</p>
                  <p className="font-medium text-green-600">{formatDate(purchase.received_date)}</p>
                </div>
              )}
              {purchase.payment_method && (
                <div>
                  <p className="text-sm text-gray-600">Método de Pago</p>
                  <p className="font-medium text-gray-900">{purchase.payment_method}</p>
                </div>
              )}
              {purchase.invoice_number && (
                <div>
                  <p className="text-sm text-gray-600">Número de Factura</p>
                  <p className="font-medium text-gray-900">{purchase.invoice_number}</p>
                </div>
              )}
              {purchase.reference && (
                <div>
                  <p className="text-sm text-gray-600">Referencia</p>
                  <p className="font-medium text-gray-900">{purchase.reference}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cancellation Info */}
          {purchase.status === 'cancelled' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-4">Información de Cancelación</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-red-600">Fecha de Cancelación</p>
                  <p className="font-medium text-red-900">{formatDate(purchase.cancelled_at)}</p>
                </div>
                {purchase.cancellation_reason && (
                  <div>
                    <p className="text-sm text-red-600">Motivo</p>
                    <p className="font-medium text-red-900">{purchase.cancellation_reason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Recibir Compra</h2>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Al recibir esta compra se actualizará el stock y costo promedio de los productos
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Verifique las cantidades recibidas antes de confirmar.
                    </p>
                  </div>
                </div>
              </div>

              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad Pedida</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad Recibida</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchase.items?.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.product?.name}</div>
                        <div className="text-sm text-gray-500">{item.product?.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          value={receivedItems[index]?.received_quantity || 0}
                          onChange={(e) => updateReceivedQuantity(item.id, e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReceive}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Confirmar Recepción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-800">Cancelar Compra</h2>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                ¿Está seguro de cancelar esta compra? Esta acción no se puede deshacer.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo de Cancelación <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ingrese el motivo de la cancelación"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Cancelar Compra
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
};

export default PurchaseDetailPage;