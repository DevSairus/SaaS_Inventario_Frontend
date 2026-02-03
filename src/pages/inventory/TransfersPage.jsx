import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Search, Eye, Send, CheckCircle, XCircle, Plus } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import useTransfersStore from '../../store/transfersStore';

const TransfersPage = () => {
  const navigate = useNavigate();
  const {
    transfers,
    loading,
    pagination,
    filters,
    setFilters,
    fetchTransfers,
    sendTransfer,
    cancelTransfer
  } = useTransfersStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [shippingNotes, setShippingNotes] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({ search: searchTerm, page: 1 });
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setFilters({ status: status, page: 1 });
  };

  const handleSend = async () => {
    try {
      await sendTransfer(selectedTransfer.id, shippingNotes);
      setShowSendModal(false);
      setShippingNotes('');
      setSelectedTransfer(null);
      alert('Transferencia enviada exitosamente');
    } catch (error) {
      alert(error.response?.data?.message || 'Error al enviar');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelTransfer(selectedTransfer.id, cancelNotes);
      setShowCancelModal(false);
      setCancelNotes('');
      setSelectedTransfer(null);
      alert('Transferencia cancelada');
    } catch (error) {
      alert(error.response?.data?.message || 'Error al cancelar');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      in_transit: 'bg-yellow-100 text-yellow-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    const labels = {
      draft: 'Borrador',
      sent: 'Enviado',
      in_transit: 'En Tránsito',
      received: 'Recibido',
      cancelled: 'Cancelado'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transferencias entre Bodegas</h1>
            <p className="text-gray-600 mt-1">Gestiona el movimiento de productos entre ubicaciones</p>
          </div>
          <button
            onClick={() => navigate('/inventory/transfers/new')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Nueva Transferencia
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
                  placeholder="Buscar por número o guía de transporte..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </form>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleStatusFilter('')}
                className={`px-4 py-2 rounded-lg ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Todos
              </button>
              <button
                onClick={() => handleStatusFilter('draft')}
                className={`px-4 py-2 rounded-lg ${statusFilter === 'draft' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Borradores
              </button>
              <button
                onClick={() => handleStatusFilter('sent')}
                className={`px-4 py-2 rounded-lg ${statusFilter === 'sent' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Enviados
              </button>
              <button
                onClick={() => handleStatusFilter('received')}
                className={`px-4 py-2 rounded-lg ${statusFilter === 'received' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Recibidos
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
          ) : transfers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay transferencias</h3>
              <p className="text-gray-600">Crea una nueva transferencia para comenzar</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desde</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hacia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guía</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{transfer.transfer_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{transfer.fromWarehouse?.name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{transfer.toWarehouse?.name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(transfer.transfer_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{transfer.tracking_number || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transfer.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/inventory/transfers/${transfer.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalle"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {transfer.status === 'draft' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedTransfer(transfer);
                                setShowSendModal(true);
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="Enviar"
                            >
                              <Send className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTransfer(transfer);
                                setShowCancelModal(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Cancelar"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {transfer.status === 'sent' && (
                          <button
                            onClick={() => navigate(`/inventory/transfers/${transfer.id}/receive`)}
                            className="text-green-600 hover:text-green-900"
                            title="Recibir"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Enviar Transferencia</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de enviar la transferencia {selectedTransfer?.transfer_number}?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Esto reducirá el stock en la bodega de origen.
            </p>
            <textarea
              value={shippingNotes}
              onChange={(e) => setShippingNotes(e.target.value)}
              placeholder="Notas de envío (opcional)"
              className="w-full border border-gray-300 rounded-lg p-2 mb-4"
              rows="3"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setShippingNotes('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Cancelar Transferencia</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de cancelar la transferencia {selectedTransfer?.transfer_number}?
            </p>
            <textarea
              value={cancelNotes}
              onChange={(e) => setCancelNotes(e.target.value)}
              placeholder="Motivo de cancelación (opcional)"
              className="w-full border border-gray-300 rounded-lg p-2 mb-4"
              rows="3"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelNotes('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Cancelar Transferencia
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TransfersPage;