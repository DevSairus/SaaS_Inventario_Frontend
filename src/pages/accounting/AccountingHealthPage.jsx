// frontend/src/pages/accounting/AccountingHealthPage.jsx
//
// 4.2 del análisis contable: el backend ya tenía journalIntegrity.service.js
// completo (huecos de integridad, borradores viejos, descuadres), pero
// solo lo podía consultar el asistente de IA (NEXA) — no había pantalla.
// Esta página solo expone lo que ya existía.
import React, { useState, useEffect } from 'react';
import { accountingHealthAPI, journalEntriesAPI } from '../../api/accounting';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon, ExclamationTriangleIcon, ClockIcon, ScaleIcon,
} from '@heroicons/react/24/outline';

const toLocalDateString = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const AccountingHealthPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [range, setRange] = useState({
    from: toLocalDateString(new Date(new Date().setDate(1))),
    to: toLocalDateString(new Date()),
  });
  const [olderThanDays, setOlderThanDays] = useState(7);
  const [busyKey, setBusyKey] = useState(null); // id del item en proceso, o 'bulk'

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await accountingHealthAPI.summary({ from: range.from, to: range.to, older_than_days: olderThanDays });
      setData(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error calculando la salud contable');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOne = async (item) => {
    const key = `${item.source_type}:${item.source_id}`;
    try {
      setBusyKey(key);
      const res = await accountingHealthAPI.generateEntry(item.source_type, item.source_id);
      toast.success(res.message || 'Asiento generado');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo generar el asiento — revisa el Mapeo de Cuentas');
    } finally {
      setBusyKey(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!data?.missing_entries?.items?.length) return;
    if (!window.confirm(
      `Se intentará generar el asiento de ${data.missing_entries.items.length} movimiento(s)${data.missing_entries.truncated ? ` (de ${data.missing_entries.total_missing} en total — solo los que se están mostrando)` : ''}. Quedarán en borrador para revisar antes de postear. ¿Continuar?`
    )) return;
    try {
      setBusyKey('bulk');
      const res = await accountingHealthAPI.generateAllEntries(
        data.missing_entries.items.map((i) => ({ source_type: i.source_type, source_id: i.source_id }))
      );
      toast.success(res.message);
      if (res.data.failed.length > 0) {
        toast.error(`${res.data.failed.length} no se pudieron generar — revisa el detalle abajo`, { duration: 6000 });
      }
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error generando los asientos en lote');
    } finally {
      setBusyKey(null);
    }
  };

  const handlePostDraft = async (item) => {
    try {
      setBusyKey(item.id);
      await journalEntriesAPI.post(item.id);
      toast.success(`Asiento ${item.entry_number} posteado`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo postear el asiento');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Salud Contable</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tres chequeos automáticos: movimientos sin asiento, borradores sin revisar y descuadres de cabecera vs. líneas.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">Periodo (huecos y consistencia):</span>
          <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
          <span className="text-gray-400 text-sm">a</span>
          <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
          <span className="text-sm text-gray-500 ml-2">Borradores con más de</span>
          <input type="number" min={0} value={olderThanDays} onChange={(e) => setOlderThanDays(e.target.value)} className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
          <span className="text-sm text-gray-500">días</span>
          <button onClick={load} className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Revisar</button>
        </div>

        {loading && <div className="text-center py-12 text-gray-400">Calculando…</div>}

        {!loading && data && (
          <>
            <div className={`rounded-xl border p-4 flex items-center gap-3 ${data.is_healthy ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              {data.is_healthy
                ? <CheckCircleIcon className="h-6 w-6 text-green-600 shrink-0" />
                : <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 shrink-0" />}
              <span className={`text-sm font-medium ${data.is_healthy ? 'text-green-800' : 'text-amber-800'}`}>
                {data.is_healthy
                  ? 'Sin hallazgos: no hay huecos, borradores pendientes ni descuadres en el rango seleccionado.'
                  : 'Hay hallazgos que conviene revisar antes de cerrar el período.'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                  <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" /> Movimientos sin asiento
                </div>
                <div className="text-2xl font-bold text-gray-900">{data.missing_entries.total_missing}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {Object.entries(data.missing_entries.by_type || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'Sin huecos'}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                  <ClockIcon className="h-4 w-4 text-amber-500" /> Borradores sin revisar
                </div>
                <div className="text-2xl font-bold text-gray-900">{data.drafts_pending.total}</div>
                <div className="text-xs text-gray-500 mt-1">Más de {data.drafts_pending.older_than_days} días desde su creación</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                  <ScaleIcon className="h-4 w-4 text-amber-500" /> Descuadres
                </div>
                <div className="text-2xl font-bold text-gray-900">{data.consistency.total_inconsistent}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Diferencia global: {formatCurrency(data.consistency.global?.difference)}
                </div>
              </div>
            </div>

            {data.missing_entries.total_missing > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    Movimientos sin asiento contable {data.missing_entries.truncated && <span className="text-xs font-normal text-gray-400">(mostrando {data.missing_entries.shown} de {data.missing_entries.total_missing})</span>}
                  </span>
                  <button
                    onClick={handleGenerateAll}
                    disabled={busyKey !== null}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {busyKey === 'bulk' ? 'Generando…' : `Generar los ${data.missing_entries.shown} mostrados`}
                  </button>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>{['Fecha', 'Origen', 'Detalle', 'Valor', ''].map((h) => <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.missing_entries.items.map((item) => {
                      const key = `${item.source_type}:${item.source_id}`;
                      return (
                        <tr key={key}>
                          <td className="px-4 py-2 text-sm text-gray-500">{item.date}</td>
                          <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{item.source_type}</span></td>
                          <td className="px-4 py-2 text-sm text-gray-800">{item.label}</td>
                          <td className="px-4 py-2 text-sm text-right">{item.amount != null ? formatCurrency(item.amount) : '—'}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => handleGenerateOne(item)}
                              disabled={busyKey !== null}
                              className="text-xs px-2.5 py-1 rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                            >
                              {busyKey === key ? 'Generando…' : 'Generar asiento'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {data.drafts_pending.total > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">
                  Borradores pendientes de revisión {data.drafts_pending.truncated && <span className="text-xs font-normal text-gray-400">(mostrando {data.drafts_pending.shown} de {data.drafts_pending.total})</span>}
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>{['N° Asiento', 'Fecha', 'Origen', 'Detalle', 'Días pendiente', 'Débito/Crédito', ''].map((h) => <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.drafts_pending.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm font-mono text-gray-500">{item.entry_number}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{item.entry_date}</td>
                        <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{item.source_type}</span></td>
                        <td className="px-4 py-2 text-sm text-gray-800">{item.description || '—'}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.days_pending}</td>
                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.total_debit)}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handlePostDraft(item)}
                            disabled={busyKey !== null}
                            className="text-xs px-2.5 py-1 rounded-md border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50"
                          >
                            {busyKey === item.id ? 'Posteando…' : 'Postear'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.consistency.total_inconsistent > 0 && (
              <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 text-sm font-semibold text-red-700">
                  Asientos descuadrados — revisar de inmediato
                </div>
                <div className="px-4 py-2 text-xs text-red-600 bg-red-50/50 border-b border-red-100">
                  Esto no debería pasar nunca (createDraftEntry ya valida el cuadre antes de crear el asiento) — indica corrupción de datos, no un hueco normal. No se ofrece autocorrección: requiere revisión manual caso por caso.
                </div>
                <div className="divide-y divide-gray-100">
                  {data.consistency.inconsistent_entries.map((e) => (
                    <div key={e.entry_id} className="px-4 py-3">
                      <div className="text-sm font-mono text-gray-700">{e.entry_number} · {e.entry_date}</div>
                      <ul className="text-xs text-red-600 list-disc pl-5 mt-1">
                        {e.problems.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default AccountingHealthPage;
