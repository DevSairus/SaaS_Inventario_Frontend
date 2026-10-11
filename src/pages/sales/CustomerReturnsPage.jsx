// frontend/src/pages/sales/CustomerReturnsPage.jsx
// Lista de devoluciones de clientes. Antes esta ruta mostraba una copia del
// formulario de creación y las devoluciones existentes no se podían ver
// (solo escribiendo /sales/customer-returns/:id a mano).
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Eye, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Pagination from '../../components/common/Pagination';
import { customerReturnsApi } from '../../api/customerReturns';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import useIsManagement from '../../hooks/useIsManagement';
import { CUSTOMER_RETURN_REASONS, labelOf } from '../../utils/returnLabels';
import ApproveCustomerReturnModal from '../../components/sales/ApproveCustomerReturnModal';

const PAGE_SIZE = 20;

const STATUS_BADGES = {
  pending: { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprobada', cls: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rechazada', cls: 'bg-red-100 text-red-800' },
  reversed: { label: 'Reversada', cls: 'bg-gray-200 text-gray-700' },
};

const customerName = (c) =>
  c?.business_name || `${c?.first_name || ''} ${c?.last_name || ''}`.trim() || 'Sin cliente';

const CustomerReturnsPage = () => {
  const navigate = useNavigate();
  // Aprobar/rechazar: checkRole('admin', 'manager', 'accountant') en el backend.
  const canManage = useIsManagement();

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const loadSeq = useRef(0);

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, status]);
  useEffect(() => { fetchReturns(); }, [debouncedSearch, status, page]);

  const fetchReturns = async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const res = await customerReturnsApi.getAll({
        search: debouncedSearch || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
      });
      if (seq !== loadSeq.current) return;
      setReturns(res.data || []);
      setPagination(res.pagination || { total: 0, pages: 0 });
    } catch (error) {
      if (seq === loadSeq.current) toast.error(error.response?.data?.message || 'Error cargando las devoluciones');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  };

  const handleDelete = async (ret) => {
    if (!window.confirm(`¿Eliminar la devolución ${ret.return_number}? Solo se pueden eliminar devoluciones pendientes.`)) return;
    try {
      await customerReturnsApi.delete(ret.id);
      toast.success('Devolución eliminada');
      fetchReturns();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      await customerReturnsApi.reject(rejectTarget.id, rejectionReason);
      toast.success('Devolución rechazada');
      setRejectTarget(null);
      setRejectionReason('');
      fetchReturns();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al rechazar');
    } finally {
      setActing(false);
    }
  };

  const statusFilters = [
    { value: '', label: 'Todas', active: 'bg-blue-600 text-white' },
    { value: 'pending', label: 'Pendientes', active: 'bg-yellow-600 text-white' },
    { value: 'approved', label: 'Aprobadas', active: 'bg-green-600 text-white' },
    { value: 'rejected', label: 'Rechazadas', active: 'bg-red-600 text-white' },
    { value: 'reversed', label: 'Reversadas', active: 'bg-gray-600 text-white' },
  ];

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Devoluciones de Clientes</h1>
            <p className="text-gray-600 mt-1">Mercancía devuelta por clientes sobre sus ventas</p>
          </div>
          <button
            onClick={() => navigate('/sales/customer-returns/new')}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Nueva Devolución
          </button>
        </div>

        {!canManage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3">
            Puedes registrar y consultar devoluciones. Las pendientes las aprueba un administrador, gerente o contador.
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por número, cliente o venta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusFilters.map((f) => (
                <button
                  key={f.value || 'all'}
                  onClick={() => setStatus(f.value)}
                  className={`px-4 py-2 rounded-lg text-sm ${status === f.value ? f.active : 'bg-gray-100 text-gray-700'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Devoluciones ({pagination.total || 0})</h3>
          </div>
          {loading && returns.length === 0 ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : returns.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-14 h-14 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No hay devoluciones</h3>
              <p className="text-gray-600 text-sm">
                {debouncedSearch || status ? 'No hay resultados con estos filtros.' : 'Registra una devolución desde "Nueva Devolución".'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Número', 'Cliente', 'Venta', 'Fecha', 'Motivo', 'Total', 'Estado', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {returns.map((ret) => {
                    const badge = STATUS_BADGES[ret.status] || { label: ret.status, cls: 'bg-gray-100 text-gray-700' };
                    return (
                      <tr key={ret.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{ret.return_number}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{customerName(ret.customer)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{ret.sale?.sale_number || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {ret.return_date ? new Date(ret.return_date).toLocaleDateString('es-CO') : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{labelOf(CUSTOMER_RETURN_REASONS, ret.reason)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(ret.total_amount)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/sales/customer-returns/${ret.id}`)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver detalle"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            {canManage && ret.status === 'pending' && (
                              <>
                                <button onClick={() => setApproveTarget(ret)} className="text-green-600 hover:text-green-900" title="Aprobar">
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button onClick={() => { setRejectTarget(ret); setRejectionReason(''); }} className="text-red-600 hover:text-red-900" title="Rechazar">
                                  <XCircle className="w-5 h-5" />
                                </button>
                                <button onClick={() => handleDelete(ret)} className="text-gray-400 hover:text-red-600" title="Eliminar">
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <Pagination currentPage={page} totalPages={pagination.pages} onPageChange={setPage} />
            </div>
          )}
        </div>

        {approveTarget && (
          <ApproveCustomerReturnModal
            customerReturn={approveTarget}
            onClose={() => setApproveTarget(null)}
            onApproved={() => { setApproveTarget(null); fetchReturns(); }}
          />
        )}

        {rejectTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-3">Rechazar Devolución {rejectTarget.return_number}</h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Motivo del rechazo (requerido)"
                className="w-full border border-gray-300 rounded-lg p-2 mb-4"
                rows="3"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setRejectTarget(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim() || acting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CustomerReturnsPage;
