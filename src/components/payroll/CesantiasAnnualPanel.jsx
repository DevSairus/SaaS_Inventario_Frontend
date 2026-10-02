// frontend/src/components/payroll/CesantiasAnnualPanel.jsx
//
// Cierre anual de cesantías e intereses (ver payrollAccountingService.js):
//  - Cierre al 31-dic según la configuración: causación en bloque
//    (year_end) o ajuste de lo provisionado contra el valor legal (monthly).
//  - Consignación de las cesantías del año a cada fondo, desde el banco.
// Los intereses no se consignan: se pagan al empleado en la nómina de enero
// (novedad "Cesantías e intereses") y ese comprobante ya descuenta la provisión.
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { payrollAccountingAPI } from '../../api/payroll';
import { bankAccountsAPI } from '../../api/accounting';
import { ArrowPathIcon, BanknotesIcon, CalculatorIcon } from '@heroicons/react/24/outline';

const formatCurrencyCOP = (value) =>
  Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const inputClass = 'px-3 py-1.5 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const CesantiasAnnualPanel = ({ mode }) => {
  // Por defecto el año anterior: el cierre y la consignación se hacen en
  // enero/febrero sobre el año que terminó.
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [consigning, setConsigning] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [form, setForm] = useState({ payment_date: `${new Date().getFullYear()}-02-14`, bank_account_id: '', reference: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollAccountingAPI.getCesantiasAnnual(year);
      setData(res.data);
      setSelected(new Set(res.data.employees.filter((r) => r.pendiente > 0).map((r) => r.employee_id)));
    } catch (error) {
      setData(null);
      toast.error(error.response?.data?.message || 'Error cargando las cesantías del año');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    bankAccountsAPI.getAll()
      .then((res) => {
        const list = (res.data || []).filter((b) => b.is_active !== false);
        setBankAccounts(list);
        if (list[0]) setForm((f) => ({ ...f, bank_account_id: f.bank_account_id || list[0].id }));
      })
      .catch(() => setBankAccounts([]));
  }, []);

  const closeLabel = mode === 'year_end' ? 'Causar cesantías e intereses al 31 de diciembre' : 'Ajustar provisiones al 31 de diciembre';
  const closeHint = mode === 'year_end'
    ? 'Registra en un solo asiento las cesantías e intereses del año de cada empleado.'
    : 'Compara lo provisionado en el año con el valor legal (los intereses se provisionan al 12% y el valor legal depende de los días trabajados) y registra la diferencia.';

  const handleClose = async () => {
    if (!window.confirm(`${closeLabel} de ${year}. ¿Continuar?`)) return;
    setClosing(true);
    try {
      const res = await payrollAccountingAPI.closeCesantiasYear(year);
      toast.success(res.message || 'Cierre registrado');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo hacer el cierre anual');
    } finally {
      setClosing(false);
    }
  };

  const toggle = (employeeId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId); else next.add(employeeId);
      return next;
    });
  };

  const pendientes = (data?.employees || []).filter((r) => r.pendiente > 0);
  const totalSeleccionado = pendientes.filter((r) => selected.has(r.employee_id)).reduce((s, r) => s + r.pendiente, 0);

  const handleConsign = async () => {
    if (selected.size === 0) {
      toast.error('Seleccione al menos un empleado');
      return;
    }
    if (!window.confirm(`Registrar la consignación de ${formatCurrencyCOP(totalSeleccionado)} en cesantías de ${year}?`)) return;
    setConsigning(true);
    try {
      const res = await payrollAccountingAPI.consignCesantias({
        year,
        payment_date: form.payment_date,
        bank_account_id: form.bank_account_id || null,
        reference: form.reference || undefined,
        employee_ids: [...selected],
      });
      toast.success(`Consignación registrada (${res.data?.entry_number})`);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo registrar la consignación');
    } finally {
      setConsigning(false);
    }
  };

  const handleVoid = async (payment) => {
    if (!window.confirm(`¿Anular la consignación por ${formatCurrencyCOP(payment.amount)}? Se reversa su asiento contable.`)) return;
    try {
      await payrollAccountingAPI.voidCesantiasPayment(payment.id);
      toast.success('Consignación anulada');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo anular la consignación');
    }
  };

  return (
    <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cierre anual de cesantías</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Los intereses se pagan al empleado en la nómina de enero (novedad "Cesantías e intereses"); las cesantías se consignan al fondo a más tardar el 14 de febrero.
          </p>
        </div>
        <label className="text-sm text-gray-600 dark:text-gray-400">
          Año{' '}
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inputClass} w-24`} />
        </label>
      </div>

      <div className="p-4 space-y-5">
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
          <p className="flex-1 min-w-[16rem] text-sm text-amber-800 dark:text-amber-300">{closeHint}</p>
          <button
            type="button"
            onClick={handleClose}
            disabled={closing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {closing ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CalculatorIcon className="h-4 w-4" />}
            {closeLabel}
          </button>
        </div>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Consignación a fondos — cesantías de {year}</h3>
          {loading && <div className="py-6 text-center text-sm text-gray-400">Cargando...</div>}
          {!loading && data && data.employees.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No hay cesantías causadas para {year}. Haga primero el cierre anual o revise que la nómina del año esté contabilizada.</p>
          )}
          {!loading && data && data.employees.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-graphite-2">
                    <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                      <th className="px-3 py-2" />
                      <th className="px-3 py-2 font-medium">Empleado</th>
                      <th className="px-3 py-2 font-medium">Fondo</th>
                      <th className="px-3 py-2 font-medium text-right">Saldo al 31-dic</th>
                      <th className="px-3 py-2 font-medium text-right">Consignado</th>
                      <th className="px-3 py-2 font-medium text-right">Pendiente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300">
                    {data.employees.map((r) => (
                      <tr key={r.employee_id}>
                        <td className="px-3 py-2">
                          {r.pendiente > 0 && (
                            <input type="checkbox" checked={selected.has(r.employee_id)} onChange={() => toggle(r.employee_id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {r.employee_name}
                          <span className="block text-xs text-gray-400">{r.employee_document}</span>
                        </td>
                        <td className="px-3 py-2">{r.fund_name || <span className="text-red-500 text-xs">Sin fondo asignado</span>}</td>
                        <td className="px-3 py-2 text-right">{formatCurrencyCOP(r.saldo_corte)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrencyCOP(r.consignado)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${r.pendiente < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{formatCurrencyCOP(r.pendiente)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pendientes.length > 0 && (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Fecha
                    <input type="date" value={form.payment_date} onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))} className={`${inputClass} block mt-1`} />
                  </label>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Cuenta de origen
                    <select value={form.bank_account_id} onChange={(e) => setForm((f) => ({ ...f, bank_account_id: e.target.value }))} className={`${inputClass} block mt-1`}>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>{b.bank_name} {b.account_alias || b.account_number}</option>
                      ))}
                      <option value="">Cuenta de bancos por defecto (Mapeo de Cuentas)</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Referencia
                    <input type="text" maxLength={100} value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="N° de planilla/transferencia" className={`${inputClass} block mt-1`} />
                  </label>
                  <button
                    type="button"
                    onClick={handleConsign}
                    disabled={consigning || selected.size === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {consigning ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <BanknotesIcon className="h-4 w-4" />}
                    Consignar {formatCurrencyCOP(totalSeleccionado)}
                  </button>
                </div>
              )}
            </>
          )}

          {data?.payments?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Consignaciones registradas</p>
              <ul className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
                {data.payments.map((p) => (
                  <li key={p.id} className={`flex flex-wrap items-center gap-x-4 py-1.5 ${p.status === 'voided' ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                    <span>{formatDate(p.payment_date)}</span>
                    <span>{p.bank || 'Bancos (mapeo)'}</span>
                    <span>{p.reference || '—'}</span>
                    <span className="ml-auto font-medium">{formatCurrencyCOP(p.amount)}</span>
                    {p.status === 'active'
                      ? <button type="button" onClick={() => handleVoid(p)} className="text-xs text-red-600 hover:underline dark:text-red-400">Anular</button>
                      : <span className="text-xs no-underline">Anulada</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CesantiasAnnualPanel;
