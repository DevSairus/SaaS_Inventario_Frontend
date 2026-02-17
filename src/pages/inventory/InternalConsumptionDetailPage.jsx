import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Package, Calendar, Warehouse } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const InternalConsumptionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [consumption, setConsumption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadConsumption();
  }, [id]);

  const loadConsumption = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/inventory/internal-consumptions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConsumption(response.data.data);
    } catch (error) {
      console.error('Error loading consumption:', error);
      alert('Error al cargar el consumo');
      navigate('/inventory/internal-consumptions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE}/inventory/internal-consumptions/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowApproveModal(false);
      alert('Consumo aprobado exitosamente');
      loadConsumption();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al aprobar');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Debe indicar el motivo del rechazo');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE}/inventory/internal-consumptions/${id}/reject`, 
        { rejection_reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setShowRejectModal(false);
      setRejectionReason('');
      alert('Consumo rechazado');
      loadConsumption();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al rechazar');
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
      approved: 'Aprobado',
      rejected: 'Rechazado'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status]}`}>
        {labels[status]}
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

  if (!consumption) {
    return (
      <Layout>
        <div className="space-y-5">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Consumo no encontrado</h2>
            <button
              onClick={() => navigate('/inventory/internal-consumptions')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Volver a consumos internos
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
            onClick={() => navigate('/inventory/internal-consumptions')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver a consumos
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{consumption.consumption_number}</h1>
              <p className="text-gray-600 mt-1">Detalle del consumo interno</p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(consumption.status)}
              {consumption.status === 'pending' && (
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
          {/* Warehouse Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Warehouse className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold">Bodega</h2>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-medium">{consumption.warehouse?.name || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Department Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold">Información</h2>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Departamento</p>
                <p className="font-medium">{consumption.department || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Propósito</p>
                <p className="font-medium">{consumption.purpose || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha</p>
                <p className="font-medium">
                  {new Date(consumption.consumption_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Cost */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold">Costo Total</h2>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              ${parseFloat(consumption.total_cost || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Notes */}
        {consumption.notes && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Notas</h2>
            <p className="text-gray-700">{consumption.notes}</p>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Productos Consumidos</h2>
          </div>
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {consumption.items?.map((item) => (
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
                    ${parseFloat(item.unit_cost).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    ${parseFloat(item.total_cost).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>

        {/* Approval/Rejection Info */}
        {(consumption.status === 'approved' || consumption.status === 'rejected') && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">
              {consumption.status === 'approved' ? 'Información de Aprobación' : 'Información de Rechazo'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  {consumption.status === 'approved' ? 'Aprobado por' : 'Rechazado por'}
                </p>
                <p className="font-medium">
                  {consumption.status === 'approved' 
                    ? consumption.approved_by_user?.name 
                    : consumption.rejected_by_user?.name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha</p>
                <p className="font-medium">
                  {new Date(
                    consumption.status === 'approved' 
                      ? consumption.approved_at 
                      : consumption.rejected_at
                  ).toLocaleString()}
                </p>
              </div>
            </div>
            {consumption.status === 'rejected' && consumption.rejection_reason && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Motivo</p>
                <p className="font-medium">{consumption.rejection_reason}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Aprobar Consumo Interno</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de aprobar el consumo {consumption.consumption_number}?
              Se reducirá el stock de los productos.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowApproveModal(false)}
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
            <h3 className="text-lg font-bold mb-4">Rechazar Consumo Interno</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de rechazar el consumo {consumption.consumption_number}?
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
                disabled={!rejectionReason.trim()}
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

export default InternalConsumptionDetailPage;