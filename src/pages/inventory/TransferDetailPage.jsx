import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, XCircle, Package, Calendar, Warehouse, Lock } from 'lucide-react';
import { usePermissions } from '../../store/tenantPermissionsStore';
import AttachmentsPanel from '../../components/attachments/AttachmentsPanel';
import Layout from '../../components/layout/Layout';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatNumber } from '../../utils/formatters';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TransferDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [shippingNotes, setShippingNotes] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelNotes, setCancelNotes] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const can = usePermissions();
  const userName = (u) => (u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : null);

  useEffect(() => {
    loadTransfer();
  }, [id]);

  const loadTransfer = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/inventory/transfers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransfer(response.data.data);
    } catch (error) {
      toast.error('Error al cargar la transferencia');
      navigate('/inventory/transfers');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE}/inventory/transfers/${id}/send`, 
        { shipping_notes: shippingNotes },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setShowSendModal(false);
      setShippingNotes('');
      toast.success('Transferencia enviada exitosamente');
      loadTransfer();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al enviar');
    }
  };

  const handleCancel = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE}/inventory/transfers/${id}/cancel`,
        { notes: cancelNotes || undefined },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setShowCancelModal(false);
      setCancelNotes('');
      toast.success('Transferencia cancelada');
      loadTransfer();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cancelar');
    }
  };

  const handleReceive = () => {
    navigate(`/inventory/transfers/${id}/receive`);
  };

  const handleClose = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE}/inventory/transfers/${id}/close`, { notes: closeNotes || undefined }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Transferencia cerrada');
      setShowCloseModal(false);
      setCloseNotes('');
      loadTransfer();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cerrar');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      received: 'bg-green-100 text-green-800',
      closed: 'bg-slate-200 text-slate-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    const labels = {
      draft: 'Borrador',
      sent: 'En tránsito',
      received: 'Recibido',
      closed: 'Cerrado',
      cancelled: 'Cancelado'
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

  if (!transfer) {
    return (
      <Layout>
        <div className="space-y-5">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Transferencia no encontrada</h2>
            <button
              onClick={() => navigate('/inventory/transfers')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Volver a transferencias
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
            onClick={() => navigate('/inventory/transfers')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver a transferencias
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{transfer.transfer_number}</h1>
              <p className="text-gray-600 mt-1">
                Detalle de transferencia
                {transfer.project && <> · Proyecto <Link to={`/projects/${transfer.project.id}`} className="text-blue-600 hover:underline">{transfer.project.code} · {transfer.project.name}</Link></>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(transfer.status)}
              {transfer.status === 'draft' && (
                <button
                  onClick={() => setShowSendModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Send className="w-5 h-5" />
                  Enviar
                </button>
              )}
              {transfer.status === 'sent' && (
                <button
                  onClick={handleReceive}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="w-5 h-5" />
                  Recibir
                </button>
              )}
              {transfer.status === 'received' && can('inventory.transfers.close') && (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800"
                >
                  <Lock className="w-5 h-5" />
                  Cerrar
                </button>
              )}
              {(transfer.status === 'draft' || transfer.status === 'sent') && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center gap-2 border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
                >
                  <XCircle className="w-5 h-5" />
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* From Warehouse */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Warehouse className="w-6 h-6 text-red-600" />
              <h2 className="text-lg font-semibold">Bodega Origen</h2>
            </div>
            <p className="font-medium text-lg">{transfer.fromWarehouse?.name || transfer.from_warehouse?.name || 'N/A'}</p>
          </div>

          {/* To Warehouse */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Warehouse className="w-6 h-6 text-green-600" />
              <h2 className="text-lg font-semibold">Bodega Destino</h2>
            </div>
            <p className="font-medium text-lg">{transfer.toWarehouse?.name || transfer.to_warehouse?.name || 'N/A'}</p>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold">Fechas</h2>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Creada</p>
                <p className="font-medium">
                  {new Date(transfer.transfer_date).toLocaleDateString()}
                </p>
              </div>
              {[['Enviada', transfer.sent_date], ['Recibida', transfer.received_date], ['Cerrada', transfer.closed_at]].filter(([, d]) => d).map(([label, d]) => (
                <div key={label}>
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className="font-medium">{new Date(d).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notes */}
        {transfer.notes && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Notas</h2>
            <p className="text-gray-700">{transfer.notes}</p>
          </div>
        )}

        {/* Shipping Notes */}
        {transfer.shipping_notes && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3">Notas de Envío</h2>
            <p className="text-gray-700">{transfer.shipping_notes}</p>
          </div>
        )}

        {(transfer.receiving_notes || transfer.closing_notes) && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 space-y-3">
            {transfer.receiving_notes && (<div><h2 className="text-lg font-semibold mb-1">Notas de recepción</h2><p className="text-gray-700">{transfer.receiving_notes}</p></div>)}
            {transfer.closing_notes && (<div><h2 className="text-lg font-semibold mb-1">Notas de cierre</h2><p className="text-gray-700">{transfer.closing_notes}</p></div>)}
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Productos</h2>
          </div>
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cant. Enviada</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cant. Recibida</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transfer.items?.map((item) => (
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
                    {item.quantity_sent}
                  </td>
                  <td className={`px-6 py-4 text-right text-sm ${item.quantity_received !== null && item.quantity_received !== undefined && parseFloat(item.quantity_received) !== parseFloat(item.quantity_sent) ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                    {item.quantity_received !== null && item.quantity_received !== undefined ? item.quantity_received : '-'}
                    {item.quantity_received !== null && item.quantity_received !== undefined && parseFloat(item.quantity_received) < parseFloat(item.quantity_sent) && (
                      <span className="block text-xs">faltan {formatNumber(parseFloat(item.quantity_sent) - parseFloat(item.quantity_received), 2)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    ${formatNumber(parseFloat(item.unit_cost), 2)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    ${formatNumber(parseFloat(item.quantity_sent) * parseFloat(item.unit_cost), 2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="5" className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                  Total:
                </td>
                <td className="px-6 py-4 text-right text-lg font-bold text-blue-600">
                  ${formatNumber(transfer.items?.reduce((sum, item) =>
                    sum + (parseFloat(item.quantity_sent) * parseFloat(item.unit_cost)), 0
                  ), 2)}
                </td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Información de Usuarios</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Creado por</p>
              <p className="font-medium">{userName(transfer.creator) || 'N/A'}</p>
            </div>
            {transfer.sender && (
              <div>
                <p className="text-sm text-gray-600">Enviado por</p>
                <p className="font-medium">{userName(transfer.sender)}</p>
              </div>
            )}
            {transfer.receiver && (
              <div>
                <p className="text-sm text-gray-600">Recibido por</p>
                <p className="font-medium">{userName(transfer.receiver)}</p>
              </div>
            )}
            {transfer.closer && (
              <div>
                <p className="text-sm text-gray-600">Cerrado por</p>
                <p className="font-medium">{userName(transfer.closer)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">Cerrar {transfer.transfer_number}</h3>
            <p className="text-gray-600 mb-3 text-sm">
              Queda conciliada y bloqueada: no se podrá editar, anular ni cambiar sus soportes.
              {transfer.items?.some((i) => parseFloat(i.quantity_received ?? i.quantity_sent) !== parseFloat(i.quantity_sent)) &&
                ' Llegó distinto de lo enviado: explica la diferencia (ajuste registrado, reclamo al transportador...).'}
            </p>
            <textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} rows={3} placeholder="Notas de cierre"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCloseModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Volver</button>
              <button onClick={handleClose} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800">Cerrar traslado</button>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Enviar Transferencia</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de enviar la transferencia {transfer.transfer_number}?
              Se reducirá el stock en la bodega origen.
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Cancelar Transferencia</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de cancelar la transferencia {transfer.transfer_number}?
              {transfer.status === 'sent' && ' La mercancía ya salió: el stock vuelve a la bodega origen.'}
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
                Cancelar transferencia
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto mt-6">
        <AttachmentsPanel entityType="transfer" entityId={transfer.id} title="Soportes del traslado (remisión firmada, fotos)" defaultKind="delivery_note" />
      </div>
    </Layout>
  );
};

export default TransferDetailPage;