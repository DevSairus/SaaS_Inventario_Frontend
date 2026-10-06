// frontend/src/pages/accounting/AccountMigrationsPage.jsx
//
// Migración de movimientos de una cuenta a otra -- solo contabilidad
// (admin/accountant; el backend lo valida con checkRole). Ver
// backend/src/services/accounting/accountMigration.service.js.
import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import { ArrowRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { chartOfAccountsAPI, accountMigrationsAPI } from '../../api/accounting';
import { formatCurrency } from '../../utils/formatters';

const MODES = [
  {
    value: 'reclassification',
    label: 'Reclasificación (asiento de ajuste)',
    hint: 'Crea un asiento contabilizado que traslada el saldo neto por tercero. No modifica los asientos originales y funciona aunque haya períodos cerrados.',
  },
  {
    value: 'direct',
    label: 'Migración directa de movimientos',
    hint: 'Cambia la cuenta de cada movimiento existente: el auxiliar queda como si siempre se hubiera registrado en la cuenta destino. Solo con todos los períodos afectados abiertos.',
  },
];

const today = () => new Date().toISOString().slice(0, 10);
const firstOfYear = () => `${new Date().getFullYear()}-01-01`;
const accountLabel = (a) => (a ? `${a.code} — ${a.name}` : '');

const AccountMigrationsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({
    mode: 'reclassification',
    from_account_id: '',
    to_account_id: '',
    date_from: firstOfYear(),
    date_to: today(),
    entry_date: today(),
    update_mappings: false,
    reason: '',
  });
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    chartOfAccountsAPI.getAll()
      .then((res) => setAccounts((res.data || []).filter((a) => a.accepts_entries).sort((a, b) => a.code.localeCompare(b.code))))
      .catch(() => toast.error('Error cargando el plan de cuentas'));
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await accountMigrationsAPI.list();
      setHistory(res.data || []);
    } catch {
      // El historial es informativo; si falla no bloquea la página.
    }
  };

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Cualquier cambio de filtros invalida la vista previa.
    if (key !== 'reason' && key !== 'update_mappings' && key !== 'entry_date') setPreview(null);
  };

  const handlePreview = async () => {
    if (!form.from_account_id || !form.to_account_id) { toast.error('Selecciona la cuenta origen y la cuenta destino'); return; }
    setLoadingPreview(true);
    try {
      const res = await accountMigrationsAPI.preview(form);
      setPreview(res.data);
      if (!res.data.rows.length) toast('No hay movimientos con esos filtros', { icon: 'ℹ️' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error calculando la vista previa');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExecute = async () => {
    if (!form.reason.trim()) { toast.error('El motivo es obligatorio'); return; }
    const msg = form.mode === 'direct'
      ? `Se cambiará la cuenta de ${preview.totals.lines_count} movimientos de ${accountLabel(preview.from_account)} a ${accountLabel(preview.to_account)}. ¿Continuar?`
      : `Se contabilizará un asiento de reclasificación de ${accountLabel(preview.from_account)} a ${accountLabel(preview.to_account)} con fecha ${form.entry_date}. ¿Continuar?`;
    if (!window.confirm(msg)) return;

    setExecuting(true);
    try {
      const res = await accountMigrationsAPI.execute(form);
      toast.success(res.message || 'Migración ejecutada');
      setPreview(null);
      setForm((f) => ({ ...f, reason: '' }));
      loadHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error ejecutando la migración');
    } finally {
      setExecuting(false);
    }
  };

  const inputCls = 'mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Migración de cuentas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Traslada los movimientos de una cuenta a otra. Solo personal de contabilidad. Cada ejecución queda registrada con su motivo.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5">
          <fieldset>
            <legend className="text-sm font-medium text-gray-700">Modo</legend>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              {MODES.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer ${form.mode === m.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <input type="radio" name="mode" checked={form.mode === m.value} onChange={() => setField('mode', m.value)} className="mt-0.5 h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-700">
                    {m.label}
                    <span className="block text-xs text-gray-500 mt-0.5">{m.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Cuenta origen</label>
              <select value={form.from_account_id} onChange={(e) => setField('from_account_id', e.target.value)} className={inputCls}>
                <option value="">Seleccione…</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
              </select>
            </div>
            <ArrowRightIcon className="hidden md:block h-5 w-5 text-gray-400 mb-2.5" />
            <div>
              <label className="block text-sm font-medium text-gray-700">Cuenta destino</label>
              <select value={form.to_account_id} onChange={(e) => setField('to_account_id', e.target.value)} className={inputCls}>
                <option value="">Seleccione…</option>
                {accounts.filter((a) => a.id !== form.from_account_id && a.is_active).map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Movimientos desde</label>
              <input type="date" value={form.date_from} onChange={(e) => setField('date_from', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Movimientos hasta</label>
              <input type="date" value={form.date_to} onChange={(e) => setField('date_to', e.target.value)} className={inputCls} />
            </div>
            {form.mode === 'reclassification' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha del asiento</label>
                <input type="date" value={form.entry_date} onChange={(e) => setField('entry_date', e.target.value)} className={inputCls} />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handlePreview}
              disabled={loadingPreview}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingPreview ? 'Calculando…' : 'Vista previa'}
            </button>
          </div>
        </div>

        {preview && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Vista previa</h2>

            {preview.warnings.map((w) => (
              <div key={w} className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                <span>{w}</span>
              </div>
            ))}

            {preview.rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Tercero</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">Movimientos</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">Débito</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">Crédito</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">Saldo neto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.rows.map((r) => (
                      <tr key={`${r.branch_id}-${r.third_party_id}`}>
                        <td className="px-4 py-2 text-gray-900">{r.third_party_name || <span className="text-gray-400">Sin tercero</span>}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{r.lines_count}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(r.debit)}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(r.credit)}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(r.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium">
                    <tr>
                      <td className="px-4 py-2">Total</td>
                      <td className="px-4 py-2 text-right">{preview.totals.lines_count}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(preview.totals.debit)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(preview.totals.credit)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(preview.totals.net)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {preview.can_execute && (
              <div className="space-y-3 border-t border-gray-100 pt-4">
                {preview.mappings.length > 0 && (
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={form.update_mappings}
                      onChange={(e) => setField('update_mappings', e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">
                      Repuntar también los mapeos que usan la cuenta origen ({preview.mappings.join(', ')})
                      <span className="block text-xs text-gray-500">Así los movimientos nuevos se registran directamente en la cuenta destino.</span>
                    </span>
                  </label>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Motivo</label>
                  <textarea rows={2} value={form.reason} onChange={(e) => setField('reason', e.target.value)} className={inputCls}
                    placeholder="Ej: el mapeo de comisiones apuntaba a la cuenta de gasto en vez del costo" />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleExecute}
                    disabled={executing}
                    className="px-4 py-2 rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {executing ? 'Ejecutando…' : form.mode === 'direct' ? 'Migrar movimientos' : 'Contabilizar reclasificación'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Historial</h2>
          </div>
          {history.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400">Sin migraciones registradas.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {history.map((h) => (
                <li key={h.id} className="px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-gray-900">
                      {accountLabel(h.from_account)} → {accountLabel(h.to_account)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(h.created_at).toLocaleString('es-CO')}
                      {h.created_by_user && ` · ${h.created_by_user.first_name} ${h.created_by_user.last_name || ''}`}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {h.mode === 'direct' ? `Migración directa · ${h.lines_count} movimientos` : 'Reclasificación'}
                    {` · ${h.date_from} a ${h.date_to}`}
                    {h.mappings_updated?.length > 0 && ` · mapeos repuntados: ${h.mappings_updated.join(', ')}`}
                  </div>
                  <div className="text-xs text-gray-600 italic mt-0.5">{h.reason}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AccountMigrationsPage;
