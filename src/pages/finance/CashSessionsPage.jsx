// frontend/src/pages/finance/CashSessionsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { cashSessionsAPI } from '../../api/cashSessions';
import { formatCurrency, toLocalDateString } from '../../utils/formatters';
import useBranchStore from '../../store/branchStore';
import Layout from '../../components/layout/Layout';
import {
  LockOpenIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const METHODS = [
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'tarjeta', label: 'Tarjeta' },
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'otro', label: 'Otro' },
];

const emptyAmounts = { efectivo: 0, tarjeta: 0, transferencia: 0, otro: 0 };

const CashSessionsPage = () => {
  const { branches, activeBranchId, fetchBranches, loaded: branchesLoaded } = useBranchStore();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [history, setHistory] = useState([]);

  // Modal de apertura
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [savingOpen, setSavingOpen] = useState(false);

  // Modal de cierre
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [summary, setSummary] = useState(null);
  const [counted, setCounted] = useState(emptyAmounts);
  const [closingNotes, setClosingNotes] = useState('');
  const [savingClose, setSavingClose] = useState(false);

  const activeBranch = branches.find(b => b.id === activeBranchId);

  useEffect(() => {
    if (!branchesLoaded) fetchBranches();
  }, [branchesLoaded, fetchBranches]);

  const loadData = useCallback(async () => {
    if (!activeBranchId) return;
    try {
      setLoading(true);
      setLoadError(null);
      const [currentRes, historyRes] = await Promise.all([
        cashSessionsAPI.getCurrent(activeBranchId),
        cashSessionsAPI.list({ branch_id: activeBranchId }),
      ]);
      setCurrentSession(currentRes.data.data);
      setHistory(historyRes.data.data || []);
    } catch (error) {
      setLoadError(error.response?.data?.message || 'Error cargando la información de caja');
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOpen = async () => {
    if (openingAmount === '' || isNaN(parseFloat(openingAmount)) || parseFloat(openingAmount) < 0) {
      toast.error('Ingresa una base de apertura válida');
      return;
    }
    try {
      setSavingOpen(true);
      await cashSessionsAPI.open({
        branch_id: activeBranchId,
        session_date: toLocalDateString(),
        opening_amount: parseFloat(openingAmount),
        notes: openingNotes || null,
      });
      toast.success('Caja abierta');
      setShowOpenModal(false);
      setOpeningAmount('');
      setOpeningNotes('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error abriendo la caja');
    } finally {
      setSavingOpen(false);
    }
  };

  const openCloseModal = async () => {
    if (!currentSession) return;
    setShowCloseModal(true);
    setCounted(emptyAmounts);
    setClosingNotes('');
    try {
      const res = await cashSessionsAPI.getSummary(currentSession.id);
      setSummary(res.data.data);
    } catch (error) {
      toast.error('Error calculando el cuadre esperado');
      setShowCloseModal(false);
    }
  };

  const handleClose = async () => {
    try {
      setSavingClose(true);
      await cashSessionsAPI.close(currentSession.id, { counted_amounts: counted, notes: closingNotes || null });
      toast.success('Caja cerrada');
      setShowCloseModal(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cerrando la caja');
    } finally {
      setSavingClose(false);
    }
  };

  const totalCounted = METHODS.reduce((sum, m) => sum + (parseFloat(counted[m.key]) || 0), 0);
  const totalExpected = summary
    ? METHODS.reduce((sum, m) => sum + (summary.expected_amounts?.[m.key] || 0), 0)
    : 0;
  const totalDiff = totalCounted - totalExpected;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Cajas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Apertura y cierre diario de caja, por sede
            {activeBranch ? ` — ${activeBranch.name}` : ''}
          </p>
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {loadError}
          </div>
        )}

        {!activeBranchId && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3">
            Selecciona una sede activa (arriba a la derecha) para ver o abrir su caja.
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : (
          activeBranchId && (
            <>
              {/* Estado actual */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                {currentSession ? (
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <LockOpenIcon className="w-5 h-5 text-green-700" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-700">Caja abierta</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Abierta por {currentSession.opener?.first_name} {currentSession.opener?.last_name} ·{' '}
                          {new Date(currentSession.opened_at).toLocaleString('es-CO')}
                        </p>
                        <p className="text-sm text-gray-700 mt-2">
                          Base de apertura: <span className="font-semibold">{formatCurrency(currentSession.opening_amount)}</span>
                        </p>
                        {currentSession.live_expected_amounts && (
                          <p className="text-xs text-gray-500 mt-1">
                            Esperado hasta ahora (efectivo): {formatCurrency(currentSession.live_expected_amounts.efectivo)}
                            {' · '}{currentSession.transaction_count} movimiento{currentSession.transaction_count === 1 ? '' : 's'} hoy
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={openCloseModal}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-800 rounded-lg hover:bg-red-900"
                    >
                      <LockClosedIcon className="w-4 h-4" /> Cerrar caja
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <LockClosedIcon className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Caja cerrada</p>
                        <p className="text-xs text-gray-500 mt-0.5">No hay una caja abierta en esta sede</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowOpenModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800"
                    >
                      <LockOpenIcon className="w-4 h-4" /> Abrir caja
                    </button>
                  </div>
                )}
              </div>

              {/* Historial */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">Historial de cajas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Fecha', 'Estado', 'Apertura', 'Abierta por', 'Cerrada por', 'Diferencia total'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin cajas registradas</td></tr>
                      )}
                      {history.map(s => {
                        const diffTotal = s.differences
                          ? METHODS.reduce((sum, m) => sum + (s.differences[m.key] || 0), 0)
                          : null;
                        return (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600">{s.session_date}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                                {s.status === 'open' ? 'Abierta' : 'Cerrada'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(s.opening_amount)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {s.opener ? `${s.opener.first_name} ${s.opener.last_name}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {s.closer ? `${s.closer.first_name} ${s.closer.last_name}` : '—'}
                            </td>
                            <td className={`px-4 py-3 text-sm font-semibold ${
                              diffTotal === null ? 'text-gray-400' : diffTotal === 0 ? 'text-gray-600' : diffTotal > 0 ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              {diffTotal === null ? '—' : `${diffTotal > 0 ? '+' : ''}${formatCurrency(diffTotal)}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        )}

        {/* ── Modal: Abrir caja ─────────────────────────────── */}
        {showOpenModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Abrir caja</h3>
              <p className="text-xs text-gray-500 mb-4">{activeBranch?.name} · {toLocalDateString()}</p>

              <label className="block text-sm font-medium text-gray-700 mb-1">Base de apertura (efectivo)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                autoFocus
                value={openingAmount}
                onChange={e => setOpeningAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
              />

              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea
                value={openingNotes}
                onChange={e => setOpeningNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4"
              />

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowOpenModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                  Cancelar
                </button>
                <button
                  onClick={handleOpen}
                  disabled={savingOpen}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-50"
                >
                  {savingOpen ? 'Abriendo...' : 'Abrir caja'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Cerrar caja ────────────────────────────── */}
        {showCloseModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Cerrar caja</h3>
              <p className="text-xs text-gray-500 mb-4">{activeBranch?.name} · {currentSession?.session_date}</p>

              {!summary ? (
                <div className="text-center py-8 text-gray-400 text-sm">Calculando cuadre esperado...</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide px-1 mb-1">
                    <span>Método</span>
                    <span className="text-right">Esperado</span>
                    <span className="text-right">Contado</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    {METHODS.map(m => {
                      const expected = summary.expected_amounts?.[m.key] || 0;
                      const countedVal = counted[m.key];
                      const diff = (parseFloat(countedVal) || 0) - expected;
                      return (
                        <div key={m.key} className="grid grid-cols-3 gap-2 items-center bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm font-medium text-gray-700">{m.label}</span>
                          <span className="text-sm text-gray-600 text-right">{formatCurrency(expected)}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={countedVal}
                            onChange={e => setCounted(c => ({ ...c, [m.key]: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                          />
                          {diff !== 0 && (
                            <span className={`col-span-3 text-xs text-right -mt-1 ${diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {diff > 0 ? `Sobrante: +${formatCurrency(diff)}` : `Faltante: ${formatCurrency(diff)}`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className={`rounded-lg px-3 py-2.5 mb-4 flex items-center justify-between ${
                    totalDiff === 0 ? 'bg-gray-50' : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      {totalDiff !== 0 && <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />}
                      Diferencia total
                    </span>
                    <span className={`text-sm font-bold ${totalDiff === 0 ? 'text-gray-700' : totalDiff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {totalDiff > 0 ? '+' : ''}{formatCurrency(totalDiff)}
                    </span>
                  </div>

                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                  <textarea
                    value={closingNotes}
                    onChange={e => setClosingNotes(e.target.value)}
                    rows={2}
                    placeholder="Ej: faltante por vueltas mal dadas, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4"
                  />

                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowCloseModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                      Cancelar
                    </button>
                    <button
                      onClick={handleClose}
                      disabled={savingClose}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-800 rounded-lg hover:bg-red-900 disabled:opacity-50"
                    >
                      {savingClose ? 'Cerrando...' : 'Confirmar cierre'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CashSessionsPage;