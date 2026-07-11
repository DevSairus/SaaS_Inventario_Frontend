// frontend/src/components/accounting/LibroAuxiliarModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { financialReportsAPI } from '../../api/accounting';
import useBranchStore from '../../store/branchStore';
import toast from 'react-hot-toast';
import { XMarkIcon, DocumentArrowDownIcon, TableCellsIcon } from '@heroicons/react/24/outline';

const toLocalDateString = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

/**
 * Modal de Libro Auxiliar por tercero — se dispara desde Clientes/Proveedores.
 * `thirdParty` = { id, type: 'customer'|'supplier', name, tax_id }.
 * Muestra saldo inicial + movimientos de cartera/cuentas por pagar con saldo
 * corrido y permite exportar a Excel/PDF con los mismos filtros.
 */
const LibroAuxiliarModal = ({ thirdParty, onClose }) => {
  const { branches, fetchBranches } = useBranchStore();
  const [branchId, setBranchId] = useState('');
  const [range, setRange] = useState({
    from: toLocalDateString(new Date(new Date().setDate(1))),
    to: toLocalDateString(new Date()),
  });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [downloading, setDownloading] = useState(null); // 'excel' | 'pdf' | null
  const requestIdRef = useRef(0);

  useEffect(() => { fetchBranches(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [thirdParty?.id]);

  const load = async () => {
    if (!thirdParty) return;
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setData(null);
      const branch_id = branchId || undefined;
      const res = await financialReportsAPI.libroAuxiliar({
        third_party_id: thirdParty.id, third_party_type: thirdParty.type,
        from: range.from, to: range.to, branch_id,
      });
      if (requestIdRef.current === requestId) setData(res.data);
    } catch (error) {
      if (requestIdRef.current === requestId) toast.error(error.response?.data?.message || 'Error generando el libro auxiliar');
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  };

  const handleExport = async (format) => {
    const branch_id = branchId || undefined;
    try {
      setDownloading(format);
      const response = await financialReportsAPI.exportLibroAuxiliar({
        third_party_id: thirdParty.id, third_party_type: thirdParty.type,
        from: range.from, to: range.to, branch_id,
      }, format);
      const url = URL.createObjectURL(response.data);
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const filename = `Libro-Auxiliar-${thirdParty.name}-${range.from}_${range.to}.${ext}`;

      if (format === 'pdf') {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error(`Error generando el ${format === 'pdf' ? 'PDF' : 'Excel'} del libro auxiliar`);
    } finally {
      setDownloading(null);
    }
  };

  if (!thirdParty) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Libro Auxiliar — {thirdParty.type === 'customer' ? 'Cliente' : 'Proveedor'}</h3>
            <p className="text-sm text-gray-500">{thirdParty.name}{thirdParty.tax_id ? ` - ${thirdParty.tax_id}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">Periodo:</span>
          <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
          <span className="text-gray-400 text-sm">a</span>
          <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
          <button onClick={load} className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Generar</button>
          {branches.length > 1 && (
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Todas las sedes</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          <div className="flex-1" />

          <button
            onClick={() => handleExport('excel')}
            disabled={downloading !== null || !data}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
          >
            <TableCellsIcon className="w-4 h-4" />
            {downloading === 'excel' ? 'Generando...' : 'Excel'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={downloading !== null || !data}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            {downloading === 'pdf' ? 'Generando...' : 'PDF'}
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading && <div className="text-center py-12 text-gray-400">Generando...</div>}

          {!loading && data && (
            <div className="p-5">
              <div className="flex justify-between text-sm text-gray-500 mb-3">
                <span>Saldo inicial: <span className="font-semibold text-gray-800">{formatCurrency(data.opening_balance)}</span></span>
                <span>{data.movement_count} {data.movement_count === 1 ? 'movimiento' : 'movimientos'}</span>
              </div>

              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Fecha', 'N° Asiento', 'Cuenta', 'Detalle', 'Débito', 'Crédito', 'Saldo'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.movements.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Sin movimientos en el periodo seleccionado</td></tr>
                  )}
                  {data.movements.map((m) => (
                    <tr key={m.line_id}>
                      <td className="px-3 py-2 text-sm text-gray-500">{m.entry_date}</td>
                      <td className="px-3 py-2 text-sm font-mono text-gray-500">{m.entry_number}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{m.account_code} - {m.account_name}</td>
                      <td className="px-3 py-2 text-sm text-gray-800">{m.description || '—'}</td>
                      <td className="px-3 py-2 text-sm text-right">{m.debit ? formatCurrency(m.debit) : ''}</td>
                      <td className="px-3 py-2 text-sm text-right">{m.credit ? formatCurrency(m.credit) : ''}</td>
                      <td className="px-3 py-2 text-sm text-right font-medium">{formatCurrency(m.running_balance)}</td>
                    </tr>
                  ))}
                </tbody>
                {data.movements.length > 0 && (
                  <tfoot>
                    <tr className="font-semibold border-t border-gray-200 bg-gray-50">
                      <td colSpan={4} className="px-3 py-2 text-sm">Total periodo / Saldo final</td>
                      <td className="px-3 py-2 text-sm text-right">{formatCurrency(data.totals.debit)}</td>
                      <td className="px-3 py-2 text-sm text-right">{formatCurrency(data.totals.credit)}</td>
                      <td className="px-3 py-2 text-sm text-right">{formatCurrency(data.closing_balance)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LibroAuxiliarModal;
