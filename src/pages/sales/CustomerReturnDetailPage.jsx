import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Package, Calendar, User, FileText } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import useCustomerReturnsStore from '../../store/customerReturnsStore';
import toast from 'react-hot-toast';

const CustomerReturnDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getReturnById, approveReturn, rejectReturn } = useCustomerReturnsStore();
  
  const [customerReturn, setCustomerReturn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadReturnDetail();
  }, [id]);

  const loadReturnDetail = async () => {
    try {
      setLoading(true);
      const data = await getReturnById(id);
      setCustomerReturn(data);
    } catch (error) {
      toast.error('Error al cargar la devolución');
      navigate('/sales/customer-returns');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await approveReturn(id, approvalNotes);
      setShowApproveModal(false);
      setApprovalNotes('');
      toast.success('Devolución aprobada exitosamente');
      loadReturnDetail();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al aprobar');
    }
  };

  const handleReject = async () => {
    try {
      await rejectReturn(id, rejectionReason);
      setShowRejectModal(false);
      setRejectionReason('');
      toast.success('Devolución rechazada');
      loadReturnDetail();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al rechazar');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getDestinationBadge = (destination) => {
    const badges = {
      inventory: 'bg-blue-100 text-blue-800',
      discard: 'bg-red-100 text-red-800',
      repair: 'bg-yellow-100 text-yellow-800'
    };
    const labels = {
      inventory: 'Inventario',
      discard: 'Descartar',
      repair: 'Reparación'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badges[destination]}`}>
        {labels[destination]}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!customerReturn) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Devolución no encontrada</h2>
            <button
              onClick={() => navigate('/sales/customer-returns')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Volver a devoluciones
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/sales/customer-returns')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver a devoluciones
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{customerReturn.return_number}</h1>
              <p className="text-gray-600 mt-1">Detalle de devolución de cliente</p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(customerReturn.status)}
              {customerReturn.status === 'pending' && (
                <>
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    <XCircle className="w-5 h-5" />
                    Rechazar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold">Cliente</h2>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-medium">
                  {customerReturn.customer?.business_name || 
                   `${customerReturn.customer?.first_name || ''} ${customerReturn.customer?.last_name || ''}`.trim() || 
                   'N/A'}
                </p>
              </div>
              {customerReturn.customer?.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{customerReturn.customer.email}</p>
                </div>
              )}
              {customerReturn.customer?.phone && (
                <div>
                  <p className="text-sm text-gray-600">Teléfono</p>
                  <p className="font-medium">{customerReturn.customer.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Return Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold">Información</h2>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Venta Original</p>
                <p className="font-medium">{customerReturn.sale?.sale_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha de Devolución</p>
                <p className="font-medium">
                  {new Date(customerReturn.return_date + 'T12:00:00').toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Creado por</p>
                <p className="font-medium">{customerReturn.created_by_user?.name || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold">Resumen</h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <p className="text-sm text-gray-600">Subtotal</p>
                <p className="font-medium">${parseFloat(customerReturn.subtotal || 0).toFixed(2)}</p>
              </div>
              {customerReturn.discount_amount > 0 && (
                <div className="flex justify-between">
                  <p className="text-sm text-gray-600">Descuento</p>
                  <p className="font-medium text-red-600">
                    -${parseFloat(customerReturn.discount_amount).toFixed(2)}
                  </p>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <p className="text-base font-semibold">Total</p>
                <p className="text-xl font-bold text-blue-600">
                  ${parseFloat(customerReturn.total_amount).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reason */}
        {customerReturn.reason && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold">Motivo de la Devolución</h2>
            </div>
            <p className="text-gray-700">{customerReturn.reason}</p>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Productos Devueltos</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Destino</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razón</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customerReturn.items?.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {item.product?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.product?.sku || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    ${parseFloat(item.unit_price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    ${parseFloat(item.subtotal).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getDestinationBadge(item.destination)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Approval/Rejection Info */}
        {(customerReturn.status === 'approved' || customerReturn.status === 'rejected') && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">
              {customerReturn.status === 'approved' ? 'Información de Aprobación' : 'Información de Rechazo'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  {customerReturn.status === 'approved' ? 'Aprobado por' : 'Rechazado por'}
                </p>
                <p className="font-medium">
                  {customerReturn.status === 'approved' 
                    ? customerReturn.approved_by_user?.name 
                    : customerReturn.rejected_by_user?.name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha</p>
                <p className="font-medium">
                  {new Date(
                    customerReturn.status === 'approved' 
                      ? customerReturn.approved_at 
                      : customerReturn.rejected_at
                  ).toLocaleString()}
                </p>
              </div>
            </div>
            {((customerReturn.status === 'approved' && customerReturn.approval_notes) ||
              (customerReturn.status === 'rejected' && customerReturn.rejection_reason)) && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Notas</p>
                <p className="font-medium">
                  {customerReturn.status === 'approved' 
                    ? customerReturn.approval_notes 
                    : customerReturn.rejection_reason}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Aprobar Devolución</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de aprobar la devolución {customerReturn.return_number}?
              El stock de los productos se actualizará según el destino configurado.
            </p>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Notas (opcional)"
              className="w-full border border-gray-300 rounded-lg p-2 mb-4"
              rows="3"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovalNotes('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Rechazar Devolución</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de rechazar la devolución {customerReturn.return_number}?
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Motivo del rechazo (requerido)"
              className="w-full border border-gray-300 rounded-lg p-2 mb-4"
              rows="3"
              required
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CustomerReturnDetailPage;