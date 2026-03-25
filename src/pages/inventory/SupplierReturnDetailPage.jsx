import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Package, RotateCcw } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const REASON_LABELS = {
  defective:  'Producto Defectuoso',
  incorrect:  'Producto Incorrecto',
  excess:     'Exceso de Inventario',
  damaged:    'Dañado en Tránsito',
  other:      'Otro',
};

const STATUS_CONFIG = {
  pending:  { label: 'Pendiente',  cls: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprobada',   cls: 'bg-green-100 text-green-800'  },
  rejected: { label: 'Rechazada',  cls: 'bg-red-100 text-red-800'      },
};

const SupplierReturnDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [supplierReturn, setSupplierReturn] = useState(null);
  const [loading, setLoading]               = useState(true);
  const [actionLoading, setActionLoading]   = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal,  setShowRejectModal]  = useState(false);
  const [rejectionReason,  setRejectionReason]  = useState('');

  useEffect(() => { loadReturn(); }, [id]);

  const loadReturn = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/inventory/supplier-returns/${id}`);
      setSupplierReturn(res.data.data);
    } catch {
      toast.error('Error al cargar la devolución');
      navigate('/inventory/supplier-returns');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.put(`/inventory/supplier-returns/${id}/approve`);
      toast.success('Devolución aprobada. Stock actualizado.');
      setShowApproveModal(false);
      loadReturn();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aprobar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Debe indicar el motivo del rechazo');
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/inventory/supplier-returns/${id}/reject`, { rejection_reason: rejectionReason });
      toast.success('Devolución rechazada');
      setShowRejectModal(false);
      setRejectionReason('');
      loadReturn();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al rechazar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar esta devolución? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/inventory/supplier-returns/${id}`);
      toast.success('Devolución eliminada');
      navigate('/inventory/supplier-returns');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!supplierReturn) return null;

  const sc = STATUS_CONFIG[supplierReturn.status] || STATUS_CONFIG.pending;
  const isPending = supplierReturn.status === 'pending';

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventory/supplier-returns')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{supplierReturn.return_number}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.cls}`}>
                  {sc.label}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-0.5">
                Devolución a proveedor · {new Date(supplierReturn.return_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 flex-wrap">
            {isPending && (
              <>
                <button
                  onClick={() => setShowApproveModal(true)}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  <CheckCircle size={16} /> Aprobar
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  <XCircle size={16} /> Rechazar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Proveedor */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Proveedor</p>
            <p className="font-semibold text-gray-900">{supplierReturn.supplier?.name || supplierReturn.supplier?.business_name || '—'}</p>
            {supplierReturn.supplier?.email && <p className="text-sm text-gray-500 mt-1">{supplierReturn.supplier.email}</p>}
            {supplierReturn.supplier?.phone && <p className="text-sm text-gray-500">{supplierReturn.supplier.phone}</p>}
          </div>

          {/* Compra origen */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Compra Origen</p>
            <button
              onClick={() => navigate(`/purchases/${supplierReturn.purchase?.id}`)}
              className="font-semibold text-blue-600 hover:underline"
            >
              {supplierReturn.purchase?.purchase_number || '—'}
            </button>
            {supplierReturn.purchase?.purchase_date && (
              <p className="text-sm text-gray-500 mt-1">
                {new Date(supplierReturn.purchase.purchase_date).toLocaleDateString('es-CO')}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Motivo: <span className="font-medium text-gray-600">{REASON_LABELS[supplierReturn.reason] || supplierReturn.reason}</span>
            </p>
          </div>

          {/* Totales */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Total Devolución</p>
            <p className="text-2xl font-bold text-gray-900">{COP(supplierReturn.total_amount)}</p>
            <div className="mt-2 space-y-1 text-sm text-gray-500">
              <div className="flex justify-between"><span>Subtotal</span><span>{COP(supplierReturn.subtotal)}</span></div>
              <div className="flex justify-between"><span>IVA</span><span>{COP(supplierReturn.tax)}</span></div>
            </div>
          </div>
        </div>

        {/* Nota de crédito */}
        {supplierReturn.credit_note_number && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 text-sm text-blue-800">
            <span className="font-semibold">Nota de crédito: </span>{supplierReturn.credit_note_number}
          </div>
        )}

        {/* Notas */}
        {supplierReturn.notes && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Notas</p>
            <p className="text-gray-700 whitespace-pre-wrap">{supplierReturn.notes}</p>
          </div>
        )}

        {/* Ítems */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Package size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-800">Productos Devueltos</h2>
            <span className="ml-auto text-sm text-gray-400">{supplierReturn.items?.length || 0} ítem(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">IVA</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {supplierReturn.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{item.product?.name || '—'}</p>
                      <p className="text-xs text-gray-400">{item.product?.sku}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-700">{parseFloat(item.quantity)}</td>
                    <td className="px-5 py-3 text-right text-sm text-gray-700">{COP(item.unit_cost)}</td>
                    <td className="px-5 py-3 text-right text-sm text-gray-700">{COP(item.subtotal)}</td>
                    <td className="px-5 py-3 text-right text-sm text-gray-700">{COP(item.tax)}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">{COP(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-5 py-3 text-right text-sm font-semibold text-gray-700">Total:</td>
                  <td className="px-5 py-3 text-right text-base font-bold text-gray-900">{COP(supplierReturn.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Info aprobación / rechazo */}
        {supplierReturn.status === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={18} className="text-green-600" />
              <h3 className="font-semibold text-green-800">Aprobada</h3>
            </div>
            <p className="text-sm text-green-700">
              {supplierReturn.approved_at && new Date(supplierReturn.approved_at).toLocaleString('es-CO')}
            </p>
            <p className="text-xs text-green-600 mt-1">El stock fue reducido al momento de la aprobación.</p>
          </div>
        )}

        {supplierReturn.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <XCircle size={18} className="text-red-600" />
              <h3 className="font-semibold text-red-800">Rechazada</h3>
            </div>
            {supplierReturn.rejection_reason && (
              <p className="text-sm text-red-700"><span className="font-medium">Motivo: </span>{supplierReturn.rejection_reason}</p>
            )}
            {supplierReturn.rejected_at && (
              <p className="text-xs text-red-500 mt-1">{new Date(supplierReturn.rejected_at).toLocaleString('es-CO')}</p>
            )}
          </div>
        )}
      </div>

      {/* Modal Aprobar */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-2 rounded-full">
                <RotateCcw size={20} className="text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Aprobar Devolución</h3>
            </div>
            <p className="text-gray-600 mb-2">
              ¿Confirmas la aprobación de <span className="font-semibold">{supplierReturn.return_number}</span>?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-800">
              ⚠️ Al aprobar se <strong>reducirá el stock</strong> de los productos devueltos. Esta acción no se puede deshacer.
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazar */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <XCircle size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Rechazar Devolución</h3>
            </div>
            <p className="text-gray-600 mb-3">
              Indica el motivo del rechazo de <span className="font-semibold">{supplierReturn.return_number}</span>:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="Motivo del rechazo..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent mb-5"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}
                disabled={actionLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SupplierReturnDetailPage;