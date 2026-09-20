// frontend/src/pages/accounting/BankReconciliationPage.jsx
//
// Conciliación Bancaria — Fase 3 del plan de Contabilidad Pitbox: import de
// extracto (con mapeo de columnas la primera vez por banco) + vista de dos
// columnas (movimientos del banco / candidatos contables) para conciliar
// manualmente lo que el matching automático no pudo resolver solo.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { bankAccountsAPI, RECONCILIATION_STATUS_LABELS } from '../../api/accounting';
import Layout from '../../components/layout/Layout';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ArrowUpTrayIcon, ArrowPathIcon, LinkIcon, XMarkIcon, NoSymbolIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const DATE_FORMAT_OPTIONS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD'];

const emptyMapping = { fecha: '', descripcion: '', referencia: '', modo: 'unico', valor: '', debito: '', credito: '' };

const BankReconciliationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [view, setView] = useState(null); // { bank_account, bank_transactions, accounting_candidates }
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pendiente');
  const [running, setRunning] = useState(false);

  // Import en curso
  const [pendingFile, setPendingFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null); // { headers, preview_rows, existing_template, file_signature }
  const [mapping, setMapping] = useState(emptyMapping);
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [decimalSeparator, setDecimalSeparator] = useState(',');
  const [importing, setImporting] = useState(false);

  // Selección para conciliar manualmente (click-to-pair)
  const [selectedTxId, setSelectedTxId] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bankAccountsAPI.getReconciliation(id, statusFilter ? { status: statusFilter } : {});
      setView(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando la conciliación');
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // permite re-seleccionar el mismo archivo después
    setPendingFile(file);
    try {
      const res = await bankAccountsAPI.previewImport(id, file);
      setImportPreview(res.data);
      if (!res.data.existing_template) {
        setMapping(emptyMapping);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error leyendo el archivo');
      setPendingFile(null);
    }
  };

  const closeImportModal = () => {
    setPendingFile(null);
    setImportPreview(null);
    setMapping(emptyMapping);
  };

  const handleConfirmImport = async () => {
    if (!pendingFile) return;
    const usingExistingTemplate = !!importPreview?.existing_template;

    if (!usingExistingTemplate) {
      if (!mapping.fecha) return toast.error('Selecciona la columna de fecha');
      if (mapping.modo === 'unico' && !mapping.valor) return toast.error('Selecciona la columna de valor');
      if (mapping.modo === 'debito_credito' && (!mapping.debito || !mapping.credito)) {
        return toast.error('Selecciona las columnas de débito y crédito');
      }
    }

    try {
      setImporting(true);
      const res = await bankAccountsAPI.runImport(id, pendingFile, usingExistingTemplate ? {} : {
        columnMapping: mapping,
        dateFormat,
        amountFormat: { decimal_separator: decimalSeparator, mode: mapping.modo },
      });
      const d = res.data;
      toast.success(res.message || 'Extracto importado');
      if (d.row_errors?.length) {
        toast.error(`${d.row_errors.length} fila(s) no se pudieron leer — revisa el formato de fecha/monto`, { duration: 6000 });
      }
      closeImportModal();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error importando el extracto');
    } finally {
      setImporting(false);
    }
  };

  const handleRunAutoMatch = async () => {
    try {
      setRunning(true);
      const res = await bankAccountsAPI.runAutoMatch(id);
      toast.success(res.message || 'Matching automático ejecutado');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error corriendo el matching automático');
    } finally {
      setRunning(false);
    }
  };

  const handleManualMatch = async () => {
    if (!selectedTxId || !selectedLineId) return;
    try {
      await bankAccountsAPI.matchManually(id, selectedTxId, selectedLineId);
      toast.success('Movimiento conciliado');
      setSelectedTxId(null);
      setSelectedLineId(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error conciliando');
    }
  };

  const handleUnmatch = async (txId) => {
    try {
      await bankAccountsAPI.unmatch(id, txId);
      toast.success('Conciliación deshecha');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error deshaciendo la conciliación');
    }
  };

  const handleIgnore = async (txId) => {
    try {
      await bankAccountsAPI.ignore(id, txId);
      toast.success('Movimiento ignorado');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error ignorando el movimiento');
    }
  };

  const bankAccount = view?.bank_account;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/accounting/bank-accounts')} className="text-gray-400 hover:text-gray-600">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                Conciliación — {bankAccount?.bank_name || 'Cargando...'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {bankAccount ? `${bankAccount.account_number}${bankAccount.account_alias ? ` (${bankAccount.account_alias})` : ''}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <ArrowUpTrayIcon className="w-4 h-4" /> Subir Extracto
            </button>
            <button
              onClick={handleRunAutoMatch}
              disabled={running}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} /> Correr Matching Automático
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <label className="text-sm text-gray-600">Estado:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="conciliada">Conciliada</option>
            <option value="ignorada">Ignorada</option>
          </select>
          {selectedTxId && selectedLineId && (
            <button onClick={handleManualMatch} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
              <LinkIcon className="w-4 h-4" /> Conciliar par seleccionado
            </button>
          )}
        </div>

        {loading && <p className="text-center text-gray-400 py-8">Cargando...</p>}

        {!loading && view && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Columna banco */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">Movimientos del banco ({view.bank_transactions.length})</h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
                {view.bank_transactions.length === 0 && (
                  <p className="text-center text-gray-400 py-8 text-sm">Sin movimientos en este filtro</p>
                )}
                {view.bank_transactions.map((tx) => {
                  const isPending = tx.reconciliation_status === 'pendiente';
                  const isSelected = selectedTxId === tx.id;
                  const statusInfo = RECONCILIATION_STATUS_LABELS[tx.reconciliation_status];
                  return (
                    <div
                      key={tx.id}
                      onClick={() => isPending && setSelectedTxId(isSelected ? null : tx.id)}
                      className={`px-4 py-3 flex items-center justify-between gap-3 ${isPending ? 'cursor-pointer hover:bg-indigo-50' : ''} ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-300' : ''}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{tx.description || 'Sin descripción'}</p>
                        <p className="text-xs text-gray-500">{formatDate(tx.transaction_date)}{tx.reference ? ` · ${tx.reference}` : ''}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold whitespace-nowrap ${tx.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatCurrency(Math.abs(tx.amount), { decimals: 2 })} {tx.amount >= 0 ? '↓' : '↑'}
                        </p>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusInfo?.className}`}>{statusInfo?.label}</span>
                          {tx.reconciliation_status === 'conciliada' && (
                            <button onClick={(e) => { e.stopPropagation(); handleUnmatch(tx.id); }} title="Deshacer conciliación" className="text-gray-400 hover:text-red-600">
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          )}
                          {isPending && (
                            <button onClick={(e) => { e.stopPropagation(); handleIgnore(tx.id); }} title="Marcar como ignorada" className="text-gray-400 hover:text-gray-700">
                              <NoSymbolIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Columna contable */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">Movimientos contables sin conciliar ({view.accounting_candidates.length})</h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
                {view.accounting_candidates.length === 0 && (
                  <p className="text-center text-gray-400 py-8 text-sm">Sin movimientos contables pendientes en este filtro</p>
                )}
                {view.accounting_candidates.map((line) => {
                  const isSelected = selectedLineId === line.id;
                  const amount = Number(line.debit) > 0 ? Number(line.debit) : Number(line.credit);
                  const isEntrada = Number(line.debit) > 0;
                  return (
                    <div
                      key={line.id}
                      onClick={() => setSelectedLineId(isSelected ? null : line.id)}
                      className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-indigo-50 ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-300' : ''}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{line.description || 'Sin descripción'}</p>
                        <p className="text-xs text-gray-500">{formatDate(line.entry_date)} · {line.entry_number}</p>
                      </div>
                      <p className={`text-sm font-semibold whitespace-nowrap flex-shrink-0 ${isEntrada ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(amount, { decimals: 2 })} {isEntrada ? '↓' : '↑'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de import + mapeo de columnas */}
      {pendingFile && importPreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Importar extracto — {pendingFile.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{importPreview.total_rows} fila(s) detectada(s)</p>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>{importPreview.headers.map((h) => <th key={h} className="px-2 py-1.5 text-left font-medium text-gray-500">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importPreview.preview_rows.map((row, i) => (
                      <tr key={i}>{importPreview.headers.map((h) => <td key={h} className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{String(row[h] ?? '')}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importPreview.existing_template ? (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  Ya reconocemos el formato de este banco — se usará el mapeo guardado anteriormente.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Primera vez con este banco — indica a qué campo corresponde cada columna:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Columna de fecha</label>
                      <select value={mapping.fecha} onChange={(e) => setMapping((m) => ({ ...m, fecha: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
                        <option value="">Seleccionar...</option>
                        {importPreview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Formato de fecha</label>
                      <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
                        {DATE_FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Columna de descripción</label>
                      <select value={mapping.descripcion} onChange={(e) => setMapping((m) => ({ ...m, descripcion: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
                        <option value="">(ninguna)</option>
                        {importPreview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Columna de referencia</label>
                      <select value={mapping.referencia} onChange={(e) => setMapping((m) => ({ ...m, referencia: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
                        <option value="">(ninguna)</option>
                        {importPreview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Separador decimal</label>
                      <select value={decimalSeparator} onChange={(e) => setDecimalSeparator(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
                        <option value=",">Coma (1.234,56)</option>
                        <option value=".">Punto (1,234.56)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">¿Cómo viene el monto?</label>
                      <select value={mapping.modo} onChange={(e) => setMapping((m) => ({ ...m, modo: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
                        <option value="unico">Una columna con signo</option>
                        <option value="debito_credito">Dos columnas (débito/crédito)</option>
                      </select>
                    </div>
                    {mapping.modo === 'unico' ? (
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Columna de valor</label>
                        <select value={mapping.valor} onChange={(e) => setMapping((m) => ({ ...m, valor: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
                          <option value="">Seleccionar...</option>
                          {importPreview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Columna de débito (entradas)</label>
                          <select value={mapping.debito} onChange={(e) => setMapping((m) => ({ ...m, debito: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
                            <option value="">Seleccionar...</option>
                            {importPreview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Columna de crédito (salidas)</label>
                          <select value={mapping.credito} onChange={(e) => setMapping((m) => ({ ...m, credito: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
                            <option value="">Seleccionar...</option>
                            {importPreview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button type="button" onClick={closeImportModal} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancelar</button>
              <button onClick={handleConfirmImport} disabled={importing} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {importing ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BankReconciliationPage;
