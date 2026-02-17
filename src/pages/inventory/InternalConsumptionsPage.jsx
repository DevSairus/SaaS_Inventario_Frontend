import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Search, Eye, CheckCircle, XCircle, Plus } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import useInternalConsumptionsStore from '../../store/internalConsumptionsStore';

const InternalConsumptionsPage = () => {
  const navigate = useNavigate();
  const {
    consumptions,
    loading,
    pagination,
    filters,
    setFilters,
    fetchConsumptions,
    approveConsumption,
    rejectConsumption,
    deleteConsumption
  } = useInternalConsumptionsStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedConsumption, setSelectedConsumption] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchConsumptions();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({ search: searchTerm, page: 1 });
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setFilters({ status: status, page: 1 });
  };

  const handleApprove = async () => {
    try {
      await approveConsumption(selectedConsumption.id);
      setShowApproveModal(false);
      setSelectedConsumption(null);
      alert('Consumo aprobado exitosamente');
    } catch (error) {
      alert(error.response?.data?.message || 'Error al aprobar');
    }
  };

  const handleReject = async () => {
    try {
      await rejectConsumption(selectedConsumption.id, rejectionReason);
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedConsumption(null);
      alert('Consumo rechazado');
    } catch (error) {
      alert(error.response?.data?.message || 'Error al rechazar');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este consumo?')) {
      try {
        await deleteConsumption(id);
        alert('Consumo eliminado');
      } catch (error) {
        alert(error.response?.data?.message || 'Error al eliminar');
      }
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Consumos Internos</h1>
            <p className="text-gray-600 mt-1">Gestiona el uso de productos para operaciones internas</p>
          </div>
          <button
            onClick={() => navigate('/inventory/internal-consumptions/new')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Nuevo Consumo
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por número o departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </form>

            {/* Status Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusFilter('')}
                className={`px-4 py-2 rounded-lg ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Todos
              </button>
              <button
                onClick={() => handleStatusFilter('pending')}
                className={`px-4 py-2 rounded-lg ${statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Pendientes
              </button>
              <button
                onClick={() => handleStatusFilter('approved')}
                className={`px-4 py-2 rounded-lg ${statusFilter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Aprobados
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : consumptions.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay consumos internos</h3>
              <p className="text-gray-600">Crea un nuevo consumo para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departamento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bodega</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propósito</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costo Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {consumptions.map((consumption) => (
                  <tr key={consumption.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{consumption.consumption_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{consumption.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{consumption.warehouse?.name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(consumption.consumption_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {consumption.purpose || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${parseFloat(consumption.total_cost).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(consumption.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/inventory/internal-consumptions/${consumption.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalle"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {consumption.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedConsumption(consumption);
                                setShowApproveModal(true);
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="Aprobar"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedConsumption(consumption);
                                setShowRejectModal(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Rechazar"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setFilters({ page })}
                className={`px-4 py-2 rounded-lg ${
                  pagination.page === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Aprobar Consumo Interno</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de aprobar el consumo {selectedConsumption?.consumption_number}?
            </p>
            <p className="text-sm text-red-600 mb-4">
              Esto reducirá el stock de los productos en la bodega.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedConsumption(null);
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
            <h3 className="text-lg font-bold mb-4">Rechazar Consumo</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de rechazar el consumo {selectedConsumption?.consumption_number}?
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

export default InternalConsumptionsPage;