// frontend/src/pages/accounting/FiscalPeriodsPage.jsx
import React, { useState, useEffect } from 'react';
import { fiscalPeriodsAPI } from '../../api/accounting';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const STATUS_STYLES = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-gray-200 text-gray-700',
};
const STATUS_LABELS = { open: 'Abierto', closed: 'Cerrado' };

const FiscalPeriodsPage = () => {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [busyId, setBusyId] = useState(null);
  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopenReason, setReopenReason] = useState('');

  useEffect(() => { load(); }, [year]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fiscalPeriodsAPI.getAll({ year });
      setPeriods(res.data || []);
    } catch (error) {
      toast.error('Error cargando los períodos fiscales');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (period) => {
    if (!window.confirm(
      `¿Cerrar el período ${MONTH_NAMES[period.month - 1]} ${period.year}? Después de cerrarlo no se podrán crear ni postear asientos con fecha en ese mes, salvo que lo reabras.`
    )) return;

    try {
      setBusyId(period.id);
      await fiscalPeriodsAPI.close(period.id);
      toast.success(`Período ${MONTH_NAMES[period.month - 1]} ${period.year} cerrado`);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo cerrar el período');
    } finally {
      setBusyId(null);
    }
  };

  const handleReopenSubmit = async () => {
    if (!reopenReason.trim()) {
      toast.error('Escribe el motivo de la reapertura');
      return;
    }
    try {
      setBusyId(reopenTarget.id);
      await fiscalPeriodsAPI.reopen(reopenTarget.id, reopenReason.trim());
      toast.success(`Período ${MONTH_NAMES[reopenTarget.month - 1]} ${reopenTarget.year} reabierto`);
      setReopenTarget(null);
      setReopenReason('');
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'No se pudo reabrir el período');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Períodos Fiscales</h1>
            <p className="text-sm text-gray-500 mt-1">
              Cierra un mes cuando ya revisaste y posteaste todos sus asientos. Un período cerrado no admite
              asientos nuevos con fecha en ese mes hasta que lo reabras explícitamente.
            </p>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {[0, 1, 2].map((offset) => {
              const y = new Date().getFullYear() - offset;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando…</div>
        ) : periods.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Todavía no hay períodos generados para {year} — se crean automáticamente al registrar el primer asiento de cada mes.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {periods.map((period) => (
              <div key={period.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  {period.status === 'closed'
                    ? <LockClosedIcon className="h-5 w-5 text-gray-400" />
                    : <LockOpenIcon className="h-5 w-5 text-green-500" />}
                  <div>
                    <div className="font-medium text-gray-900">{MONTH_NAMES[period.month - 1]} {period.year}</div>
                    {period.status === 'closed' && period.closed_at && (
                      <div className="text-xs text-gray-500">Cerrado el {new Date(period.closed_at).toLocaleDateString('es-CO')}</div>
                    )}
                    {period.reopen_reason && (
                      <div className="text-xs text-amber-600">Reabierto — motivo: {period.reopen_reason}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[period.status]}`}>
                    {STATUS_LABELS[period.status]}
                  </span>
                  {period.status === 'open' ? (
                    <button
                      onClick={() => handleClose(period)}
                      disabled={busyId === period.id}
                      className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cerrar período
                    </button>
                  ) : (
                    <button
                      onClick={() => setReopenTarget(period)}
                      disabled={busyId === period.id}
                      className="text-sm px-3 py-1.5 rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      Reabrir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {reopenTarget && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-2">
                Reabrir {MONTH_NAMES[reopenTarget.month - 1]} {reopenTarget.year}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Es una acción excepcional. Escribe el motivo — queda registrado junto con el período.
              </p>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
                placeholder="Ej: se encontró una compra sin registrar de ese mes"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setReopenTarget(null); setReopenReason(''); }}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReopenSubmit}
                  disabled={busyId === reopenTarget.id}
                  className="px-3 py-1.5 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Reabrir período
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FiscalPeriodsPage;
