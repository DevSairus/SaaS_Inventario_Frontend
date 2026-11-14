// frontend/src/pages/accounting/RoundingAdjustmentsPage.jsx
//
// 5.1 — Ajuste al peso: activación y tope por empresa, y bitácora de los
// ajustes que el sistema agregó solo a asientos que no cuadraban por redondeo.
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { roundingAdjustmentAPI } from '../../api/accounting';
import Layout from '../../components/layout/Layout';
import { formatCurrency } from '../../utils/formatters';

const SOURCE_LABELS = {
  sale: 'Venta', purchase: 'Compra', expense: 'Gasto', ica_settlement: 'Causación de ICA',
  credit_note: 'Nota crédito', debit_note: 'Nota débito', customer_return: 'Devolución de cliente',
  supplier_return: 'Devolución a proveedor', payroll: 'Nómina',
};

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;

const RoundingAdjustmentsPage = () => {
  const [config, setConfig] = useState({ enabled: true, max_amount: 1 });
  const [savingConfig, setSavingConfig] = useState(false);
  const [range, setRange] = useState({ date_from: monthStart(), date_to: today() });
  const [data, setData] = useState({ rows: [], totals: { a_favor: 0, en_contra: 0, neto: 0 } });
  const [loading, setLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    try {
      const res = await roundingAdjustmentAPI.getConfig();
      if (res?.data) setConfig(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando la configuración');
    }
  }, []);

  const loadLog = useCallback(async () => {
    try {
      setLoading(true);
      const res = await roundingAdjustmentAPI.list(range);
      if (res?.data) setData(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando la bitácora');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { loadLog(); }, [loadLog]);

  const saveConfig = async (e) => {
    e.preventDefault();
    const max = Number(config.max_amount);
    if (!Number.isFinite(max) || max < 0 || max > 1000) return toast.error('El tope debe estar entre 0 y 1.000 pesos');
    try {
      setSavingConfig(true);
      const res = await roundingAdjustmentAPI.updateConfig({ enabled: config.enabled, max_amount: max });
      if (res?.data) setConfig(res.data);
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error guardando la configuración');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Ajuste al peso</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cuando un asiento automático no cuadra por redondeo de impuestos, el sistema agrega una línea para cuadrarlo:
            a favor va a la cuenta 429581 y en contra a la 529581 (cambie la cuenta en Mapeo de cuentas si su contador usa la 519581).
          </p>
        </div>

        <form onSubmit={saveConfig} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 max-w-xl">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <input type="checkbox" checked={!!config.enabled} onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))} />
            Ajustar automáticamente los descuadres por redondeo
          </label>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tope por asiento (pesos)</label>
            <input
              type="number" min="0" max="1000" step="0.01" value={config.max_amount}
              onChange={(e) => setConfig((c) => ({ ...c, max_amount: e.target.value }))}
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Un descuadre mayor al tope no se ajusta: el asiento se rechaza porque es un error real.</p>
          </div>
          <button type="submit" disabled={savingConfig} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {savingConfig ? 'Guardando...' : 'Guardar'}
          </button>
        </form>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 flex flex-wrap items-end gap-3 border-b border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
              <input type="date" value={range.date_from} onChange={(e) => setRange((r) => ({ ...r, date_from: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
              <input type="date" value={range.date_to} onChange={(e) => setRange((r) => ({ ...r, date_to: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="ml-auto text-sm text-gray-600 flex gap-4 flex-wrap">
              <span>A favor: <b>{formatCurrency(data.totals.a_favor, { decimals: 2 })}</b></span>
              <span>En contra: <b>{formatCurrency(data.totals.en_contra, { decimals: 2 })}</b></span>
              <span>Neto: <b>{formatCurrency(data.totals.neto, { decimals: 2 })}</b></span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Fecha', 'Asiento', 'Origen', 'Cuenta', 'Sentido', 'Valor'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>}
                {!loading && data.rows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay ajustes al peso en el período</td></tr>
                )}
                {!loading && data.rows.map((r) => (
                  <tr key={`${r.entry_id}-${r.account_code}-${r.direction}-${r.amount}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.entry_date}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.entry_number}</td>
                    <td className="px-4 py-3 text-gray-600">{SOURCE_LABELS[r.source_type] || r.source_type}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.account_code} — {r.account_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.direction === 'a_favor' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {r.direction === 'a_favor' ? 'A favor' : 'En contra'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{formatCurrency(r.amount, { decimals: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RoundingAdjustmentsPage;
