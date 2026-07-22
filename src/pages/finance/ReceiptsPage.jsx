// frontend/src/pages/finance/ReceiptsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { receiptsAPI } from '../../api/receipts';
import { formatCurrency } from '../../utils/formatters';
import Layout from '../../components/layout/Layout';
import { DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const SOURCE_LABELS = { sale: 'Venta', work_order: 'Taller' };

const toLocalDateString = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ReceiptsPage = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [total, setTotal] = useState(0);
  const [openingPdfId, setOpeningPdfId] = useState(null);

  const [filters, setFilters] = useState({
    from_date: toLocalDateString(new Date(new Date().setDate(1))),
    to_date: toLocalDateString(new Date()),
    source_type: '',
    search: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const params = {};
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (filters.source_type) params.source_type = filters.source_type;
      if (filters.search) params.search = filters.search;
      const res = await receiptsAPI.list(params);
      setReceipts(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      setLoadError(error.response?.data?.message || 'Error cargando los recibos');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const openPdf = async (receipt) => {
    try {
      setOpeningPdfId(receipt.id);
      const res = await receiptsAPI.getPdf(receipt.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      toast.error('Error al generar el PDF del recibo');
    } finally {
      setOpeningPdfId(null);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Recibos</h1>
          <p className="text-sm text-gray-500 mt-1">Recibos de caja emitidos por cada pago/abono de Ventas y Taller</p>
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {loadError}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">Periodo:</span>
          <input
            type="date"
            value={filters.from_date}
            onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400 text-sm">a</span>
          <input
            type="date"
            value={filters.to_date}
            onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
          <select
            value={filters.source_type}
            onChange={e => setFilters(f => ({ ...f, source_type: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todos los orígenes</option>
            <option value="sale">Venta</option>
            <option value="work_order">Taller</option>
          </select>
          <div className="relative flex-1 min-w-[180px]">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Buscar por número, referencia o cliente..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Recibos ({total})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Número', 'Fecha', 'Origen', 'Referencia', 'Cliente', 'Método', 'Monto', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
                ) : receipts.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Sin recibos en el periodo</td></tr>
                ) : (
                  receipts.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{r.receipt_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(r.payment_date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{SOURCE_LABELS[r.source_type] || r.source_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.reference || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.customer_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap capitalize">{r.method || '—'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(r.amount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'voided' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>
                          {r.status === 'voided' ? 'Anulado' : 'Activo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openPdf(r)}
                          disabled={openingPdfId === r.id}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          <DocumentTextIcon className="w-4 h-4" /> Ver PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReceiptsPage;
