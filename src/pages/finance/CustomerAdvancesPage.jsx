// frontend/src/pages/finance/CustomerAdvancesPage.jsx
//
// Fase 3 (frontend) de Anticipos de Clientes -- listado + informe (§9 del
// plan). Vive en Cartera, junto a Cuentas por Cobrar, mismo estilo que
// AccountsReceivablePage.jsx.
import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import {
  CurrencyDollarIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
  BanknotesIcon,
  ArrowPathIcon,
  FunnelIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/formatters';
import NumericInput from '../../components/inputs/NumericInput';
import { customerAdvancesAPI } from '../../api/customerAdvances';
import RegisterAdvanceModal from '../../components/finance/RegisterAdvanceModal';

const STATUS_LABELS = {
  active: { label: 'Activo', cls: 'bg-blue-100 text-blue-800' },
  fully_applied: { label: 'Aplicado', cls: 'bg-green-100 text-green-800' },
  fully_refunded: { label: 'Devuelto', cls: 'bg-gray-100 text-gray-600' },
  voided: { label: 'Anulado', cls: 'bg-red-100 text-red-700' },
};

const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const CustomerAdvancesPage = () => {
  const [loading, setLoading] = useState(true);
  const [advances, setAdvances] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', from_date: '', to_date: '' });

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [refundTarget, setRefundTarget] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundSaving, setRefundSaving] = useState(false);

  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidSaving, setVoidSaving] = useState(false);

  useEffect(() => { loadData(); }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await customerAdvancesAPI.list(filters);
      setAdvances(res.data.data || []);
      setSummary(res.data.summary || null);
    } catch {
      toast.error('Error cargando anticipos');
    } finally {
      setLoading(false);
    }
  };

  const toggleDetail = async (advance) => {
    if (expandedId === advance.id) { setExpandedId(null); setDetail(null); return; }
    setExpandedId(advance.id);
    setLoadingDetail(true);
    try {
      const res = await customerAdvancesAPI.getById(advance.id);
      setDetail(res.data.data);
    } catch {
      toast.error('Error cargando el detalle del anticipo');
    } finally {
      setLoadingDetail(false);
    }
  };

  const openRefund = (advance) => {
    setRefundTarget(advance);
    setRefundAmount(advance.balance);
    setRefundReason('');
  };

  const handleRefund = async () => {
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setRefundSaving(true);
    try {
      await customerAdvancesAPI.refund(refundTarget.id, {
        amount: parseFloat(refundAmount),
        reason: refundReason || undefined,
      });
      toast.success('Anticipo devuelto exitosamente');
      setRefundTarget(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error devolviendo el anticipo');
    } finally {
      setRefundSaving(false);
    }
  };

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      toast.error('El motivo es obligatorio');
      return;
    }
    setVoidSaving(true);
    try {
      await customerAdvancesAPI.void(voidTarget.id, { reason: voidReason });
      toast.success('Anticipo anulado exitosamente');
      setVoidTarget(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error anulando el anticipo');
    } finally {
      setVoidSaving(false);
    }
  };

  const customerName = (adv) =>
    adv.customer?.business_name ||
    `${adv.customer?.first_name || ''} ${adv.customer?.last_name || ''}`.trim() ||
    '—';

  const searchLower = search.toLowerCase().trim();
  const filteredAdvances = searchLower
    ? advances.filter((a) =>
        customerName(a).toLowerCase().includes(searchLower) ||
        (a.customer?.tax_id || '').toLowerCase().includes(searchLower) ||
        (a.advance_number || '').toLowerCase().includes(searchLower) ||
        (a.reference_note || '').toLowerCase().includes(searchLower)
      )
    : advances;

  if (loading && advances.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2">Cargando anticipos...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Anticipos de Clientes</h1>
            <p className="mt-1 text-sm text-gray-500">
              Dinero recibido a cuenta, disponible para aplicar en futuras facturas
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Actualizar
            </button>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Registrar Anticipo
            </button>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5 flex items-center">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Pasivo Activo (por aplicar)</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatCurrency(summary?.active_balance)}</dd>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5 flex items-center">
              <BanknotesIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Recibido</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatCurrency(summary?.total_received)}</dd>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5 flex items-center">
              <ArrowUpCircleIcon className="h-6 w-6 text-indigo-600 flex-shrink-0" />
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Aplicado</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatCurrency(summary?.total_applied)}</dd>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5 flex items-center">
              <ArrowDownCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Devuelto</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatCurrency(summary?.total_refunded)}</dd>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, documento o número de anticipo..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="border border-gray-300 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="fully_applied">Aplicado</option>
            <option value="fully_refunded">Devuelto</option>
            <option value="voided">Anulado</option>
          </select>
          <input
            type="date"
            value={filters.from_date}
            onChange={(e) => setFilters((f) => ({ ...f, from_date: e.target.value }))}
            className="border border-gray-300 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="date"
            value={filters.to_date}
            onChange={(e) => setFilters((f) => ({ ...f, to_date: e.target.value }))}
            className="border border-gray-300 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {(search || filters.status || filters.from_date || filters.to_date) && (
            <button
              onClick={() => { setSearch(''); setFilters({ status: '', from_date: '', to_date: '' }); }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anticipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aplicado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devuelto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdvances.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-sm text-gray-400">
                      {search ? 'No hay resultados para la búsqueda.' : 'No hay anticipos registrados.'}
                    </td>
                  </tr>
                )}
                {filteredAdvances.map((adv) => {
                  const st = STATUS_LABELS[adv.status] || STATUS_LABELS.active;
                  return (
                    <React.Fragment key={adv.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{adv.advance_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customerName(adv)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(adv.received_date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(adv.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(adv.applied_amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(adv.refunded_amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{formatCurrency(adv.balance)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                          <button onClick={() => toggleDetail(adv)} className="text-blue-600 hover:text-blue-900">
                            {expandedId === adv.id ? 'Ocultar' : 'Ver detalle'}
                          </button>
                          {adv.status === 'active' && parseFloat(adv.balance) > 0 && (
                            <button onClick={() => openRefund(adv)} className="text-orange-600 hover:text-orange-900">Devolver</button>
                          )}
                          {adv.status === 'active' && parseFloat(adv.applied_amount) === 0 && parseFloat(adv.refunded_amount) === 0 && (
                            <button onClick={() => { setVoidTarget(adv); setVoidReason(''); }} className="text-red-600 hover:text-red-900">Anular</button>
                          )}
                        </td>
                      </tr>
                      {expandedId === adv.id && (
                        <tr>
                          <td colSpan="9" className="px-6 py-4 bg-gray-50">
                            {loadingDetail ? (
                              <div className="text-sm text-gray-400">Cargando...</div>
                            ) : (
                              <div className="space-y-3">
                                {adv.reference_note && (
                                  <p className="text-sm text-gray-600 italic">"{adv.reference_note}"</p>
                                )}
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Aplicaciones a facturas</p>
                                  {!detail?.applications || detail.applications.length === 0 ? (
                                    <p className="text-sm text-gray-400">Sin aplicaciones registradas.</p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {detail.applications.map((app) => (
                                        <div key={app.id} className="flex items-center justify-between bg-white p-2.5 rounded border text-sm">
                                          <div>
                                            <span className="font-medium">{app.sale?.sale_number || app.sale_id}</span>
                                            <span className="text-gray-400 ml-2">{formatDate(app.application_date)}</span>
                                            {app.status === 'reversed' && (
                                              <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Revertida</span>
                                            )}
                                          </div>
                                          <span className="font-medium text-gray-900">{formatCurrency(app.amount)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {adv.status === 'voided' && adv.voided_reason && (
                                  <p className="text-sm text-red-600">Anulado: {adv.voided_reason}</p>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Registrar */}
      <RegisterAdvanceModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={loadData}
      />

      {/* Devolver */}
      {refundTarget && (
        <div className="fixed z-50 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setRefundTarget(null)} />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Devolver Anticipo — {refundTarget.advance_number}</h3>
                  <button onClick={() => setRefundTarget(null)} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Disponible: <span className="font-bold text-blue-600">{formatCurrency(refundTarget.balance)}</span>
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monto a devolver</label>
                    <NumericInput
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Motivo (opcional)</label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      rows={2}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleRefund}
                  disabled={refundSaving}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {refundSaving ? 'Devolviendo...' : 'Confirmar Devolución'}
                </button>
                <button
                  onClick={() => setRefundTarget(null)}
                  disabled={refundSaving}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anular */}
      {voidTarget && (
        <div className="fixed z-50 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setVoidTarget(null)} />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Anular Anticipo — {voidTarget.advance_number}</h3>
                  <button onClick={() => setVoidTarget(null)} className="text-gray-400 hover:text-gray-500">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-red-600 mb-4">Esta acción anula el anticipo por error de digitación. No se puede deshacer.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Motivo *</label>
                  <textarea
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    rows={2}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleVoid}
                  disabled={voidSaving}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {voidSaving ? 'Anulando...' : 'Confirmar Anulación'}
                </button>
                <button
                  onClick={() => setVoidTarget(null)}
                  disabled={voidSaving}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CustomerAdvancesPage;
