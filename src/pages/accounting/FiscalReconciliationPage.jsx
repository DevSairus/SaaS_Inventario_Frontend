// frontend/src/pages/accounting/FiscalReconciliationPage.jsx
//
// Conciliación fiscal del año (soporte del formato 2516): patrimonial
// (valor contable NIIF → ajustes → valor fiscal) y de renta líquida
// (resultado contable → diferencias temporarias y permanentes → renta
// líquida). Los ajustes automáticos los calcula Pitbox; el contador agrega
// los manuales. Las diferencias temporarias alimentan el impuesto diferido
// (Ajustes NIIF de cierre).
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TableCellsIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Layout from '../../components/layout/Layout';
import { fiscalReconciliationAPI, chartOfAccountsAPI } from '../../api/accounting';
import { formatCurrency } from '../../utils/formatters';

const money = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) < 0.005) return '—';
  return n < 0 ? `(${formatCurrency(-n)})` : formatCurrency(n);
};
const input = 'px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg text-sm';
const th = 'px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap';
const td = 'px-3 py-2 text-sm whitespace-nowrap tabular-nums';
const box = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl';

const METHODS = {
  general: 'General: 5% vencida > 3 meses, 10% > 6 meses, 15% > 1 año',
  individual: 'Individual: 33% de lo vencido > 1 año',
  none: 'Sin provisión fiscal de cartera',
};

function SettingsPanel({ year, settings, setSettings, onSaved }) {
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setSettings((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const save = async () => {
    try {
      setSaving(true);
      await fiscalReconciliationAPI.saveSettings(year, settings);
      toast.success('Parámetros guardados');
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error guardando');
    } finally { setSaving(false); }
  };
  return (
    <div className={`${box} p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end`}>
      <div className="md:col-span-2">
        <label className="block text-xs text-gray-500 mb-1">Provisión fiscal de cartera (art. 145 E.T.)</label>
        <select value={settings.receivable_method} onChange={set('receivable_method')} className={`${input} w-full`}>
          {Object.entries(METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Plazo de crédito (días)</label>
        <input type="number" min="0" value={settings.credit_days} onChange={set('credit_days')} className={`${input} w-full`} title="La factura se considera vencida desde su fecha más este plazo" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tarifa de renta (%)</label>
        <input type="number" min="0" max="100" step="0.01" value={settings.tax_rate} onChange={set('tax_rate')} className={`${input} w-full`} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Pérdidas fiscales por compensar</label>
        <input type="number" min="0" value={settings.tax_losses} onChange={set('tax_losses')} className={`${input} w-full`} />
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={!!settings.recognize_dta} onChange={set('recognize_dta')} />
          Reconocer activo diferido (hay renta futura probable)
        </label>
        <button onClick={save} disabled={saving} className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar parámetros'}
        </button>
      </div>
    </div>
  );
}

function EsfTab({ data, open, toggle, onDelete }) {
  return (
    <div className={`${box} overflow-x-auto`}>
      <table className="min-w-full">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className={`${th} text-left`}>Concepto</th>
            <th className={`${th} text-right`}>Valor contable</th>
            <th className={`${th} text-right`}>Ajustes</th>
            <th className={`${th} text-right`}>Valor fiscal</th>
          </tr>
        </thead>
        <tbody>
          {['activo', 'pasivo'].map((g) => (
            <React.Fragment key={g}>
              <tr><td colSpan={4} className="px-3 pt-4 pb-1 text-xs font-bold uppercase tracking-wide text-indigo-700">{g === 'activo' ? 'Activos' : 'Pasivos'}</td></tr>
              {data.rubros.filter((r) => r.group === g).map((r) => (
                <React.Fragment key={r.code}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2 text-sm">
                      <button type="button" onClick={() => toggle(r.code)} className="flex items-center gap-1 text-left">
                        {open[r.code] ? <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400" />}
                        {r.label}
                        {r.adjustments.length > 0 && <span className="ml-1 text-[10px] px-1.5 rounded bg-amber-50 text-amber-700">{r.adjustments.length} ajuste(s)</span>}
                      </button>
                    </td>
                    <td className={`${td} text-right`}>{money(r.book)}</td>
                    <td className={`${td} text-right ${r.adjustment ? 'text-amber-700 font-medium' : ''}`}>{money(r.adjustment)}</td>
                    <td className={`${td} text-right font-medium`}>{money(r.fiscal)}</td>
                  </tr>
                  {open[r.code] && r.accounts.map((a) => (
                    <tr key={a.id} className="bg-gray-50/60 dark:bg-gray-800/30">
                      <td className="pl-10 pr-3 py-1 text-xs text-gray-500"><span className="font-mono mr-2">{a.code}</span>{a.name}</td>
                      <td className={`${td} text-xs text-right text-gray-500`}>{money(a.book)}</td>
                      <td colSpan={2} />
                    </tr>
                  ))}
                  {open[r.code] && r.adjustments.map((a) => (
                    <tr key={a.key} className="bg-amber-50/40 dark:bg-amber-900/10">
                      <td className="pl-10 pr-3 py-1 text-xs text-gray-700 dark:text-gray-300 whitespace-normal">
                        <span className={`mr-2 text-[10px] px-1.5 rounded ${a.source === 'auto' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{a.source === 'auto' ? 'automático' : 'manual'}</span>
                        <span className="mr-2 text-[10px] text-gray-500">{a.type}</span>{a.label}
                        {a.source === 'manual' && <button onClick={() => onDelete(a.id)} className="ml-2 text-gray-400 hover:text-red-600 align-middle"><TrashIcon className="w-3.5 h-3.5 inline" /></button>}
                      </td>
                      <td />
                      <td className={`${td} text-xs text-right text-amber-800`}>{money(a.amount)}</td>
                      <td />
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr className="bg-gray-100 dark:bg-gray-800 font-semibold">
                <td className="px-3 py-2 text-sm">Total {g === 'activo' ? 'activos' : 'pasivos'}</td>
                <td className={`${td} text-right`}>{money(data.totals.book[g])}</td>
                <td className={`${td} text-right`}>{money(data.totals.adjustment[g])}</td>
                <td className={`${td} text-right`}>{money(data.totals.fiscal[g])}</td>
              </tr>
            </React.Fragment>
          ))}
          <tr className="bg-gray-200 dark:bg-gray-700 font-bold">
            <td className="px-3 py-2 text-sm">Patrimonio (activos − pasivos)</td>
            <td className={`${td} text-right`}>{money(data.totals.book.patrimonio)}</td>
            <td className={`${td} text-right`}>{money(data.totals.adjustment.patrimonio)}</td>
            <td className={`${td} text-right`}>{money(data.totals.fiscal.patrimonio)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function EriTab({ data, onDelete }) {
  const Row = ({ label, value, strong, indent, children }) => (
    <tr className={strong ? 'bg-gray-100 dark:bg-gray-800 font-semibold' : 'border-t border-gray-100 dark:border-gray-800'}>
      <td className={`px-3 py-2 text-sm ${indent ? 'pl-8 text-gray-700 dark:text-gray-300' : ''} whitespace-normal`}>{label}{children}</td>
      <td className={`${td} text-right`}>{money(value)}</td>
    </tr>
  );
  const t = data.totals;
  return (
    <div className={`${box} overflow-x-auto`}>
      <table className="min-w-full">
        <tbody>
          <Row label="Resultado contable antes de impuestos" value={data.resultado_antes_impuestos} strong />
          <tr><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-bold uppercase text-indigo-700">Diferencias temporarias (variación en el año)</td></tr>
          {data.temporary.length === 0 && <tr><td colSpan={2} className="px-8 py-1 text-xs text-gray-400">Sin variaciones</td></tr>}
          {data.temporary.map((r) => <Row key={r.key} label={r.label} value={r.effect} indent />)}
          <Row label="Total diferencias temporarias" value={t.temporary} strong />
          <tr><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-bold uppercase text-indigo-700">Diferencias permanentes y otros ajustes</td></tr>
          {data.permanent.length === 0 && <tr><td colSpan={2} className="px-8 py-1 text-xs text-gray-400">Agrégalas abajo (gastos no deducibles, ingresos no gravados...)</td></tr>}
          {data.permanent.map((r) => (
            <Row key={r.id} label={r.label} value={r.effect} indent>
              <button onClick={() => onDelete(r.id)} className="ml-2 text-gray-400 hover:text-red-600"><TrashIcon className="w-3.5 h-3.5 inline" /></button>
            </Row>
          ))}
          <Row label="Total diferencias permanentes" value={t.permanent} strong />
          <Row label={t.renta_liquida < 0 ? 'Pérdida fiscal del año' : 'Renta líquida'} value={t.renta_liquida} strong />
          <Row label="Compensación de pérdidas fiscales" value={-t.compensacion_perdidas} indent />
          <Row label="Renta líquida gravable" value={t.renta_liquida_gravable} strong />
          <Row label={`Impuesto de renta estimado (${data.settings.tax_rate}%)`} value={t.impuesto_estimado} strong />
          <Row label="Impuesto de renta contabilizado en el año (corriente + diferido)" value={data.impuesto_contabilizado} indent />
        </tbody>
      </table>
    </div>
  );
}

function AdjustmentForm({ year, rubros, accounts, onCreated }) {
  const empty = { statement: 'eri', difference_type: 'permanente', target: '', amount: '', description: '' };
  const [f, setF] = useState(empty);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const payload = { statement: f.statement, difference_type: f.difference_type, amount: f.amount, description: f.description };
    if (f.statement === 'esf') {
      if (!f.target) return toast.error('Elige el rubro o la cuenta');
      if (f.target.startsWith('acc:')) payload.account_id = f.target.slice(4); else payload.rubro = f.target.slice(4);
    }
    try {
      await fiscalReconciliationAPI.createAdjustment(year, payload);
      toast.success('Ajuste agregado');
      setF(empty);
      onCreated();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error');
    }
  };
  return (
    <form onSubmit={submit} className={`${box} p-4 space-y-3`}>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Agregar ajuste manual {year}</p>
      <div className="flex flex-wrap gap-2 items-end">
        <select value={f.statement} onChange={(e) => setF((x) => ({ ...x, statement: e.target.value, difference_type: e.target.value === 'esf' ? 'temporaria' : 'permanente', target: '' }))} className={input}>
          <option value="eri">Renta líquida (+ suma a la renta, − resta)</option>
          <option value="esf">Patrimonial (valor fiscal − valor contable)</option>
        </select>
        {f.statement === 'esf' && (
          <select value={f.target} onChange={set('target')} className={`${input} w-72`}>
            <option value="">Rubro o cuenta...</option>
            <optgroup label="Rubros">
              {rubros.filter((r) => r.statement === 'esf' && r.section !== 'patrimonio').map((r) => <option key={r.code} value={`rub:${r.code}`}>{r.label}</option>)}
            </optgroup>
            <optgroup label="Cuentas">
              {accounts.map((a) => <option key={a.id} value={`acc:${a.id}`}>{a.code} — {a.name}</option>)}
            </optgroup>
          </select>
        )}
        <select value={f.difference_type} onChange={set('difference_type')} className={input}>
          <option value="temporaria">Temporaria</option>
          <option value="permanente">Permanente</option>
        </select>
        <input type="number" step="0.01" placeholder="Valor (+/−)" value={f.amount} onChange={set('amount')} className={`${input} w-36`} required />
        <input placeholder="Descripción y soporte (p. ej. GMF 50% no deducible, art. 115)" value={f.description} onChange={set('description')} className={`${input} flex-1 min-w-[16rem]`} required />
        <button type="submit" className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Agregar</button>
      </div>
      <p className="text-xs text-gray-500">
        Temporaria = se revierte en años siguientes (genera impuesto diferido si es patrimonial). Permanente = nunca se revierte
        (multas, GMF no deducible, ingresos no constitutivos de renta).
      </p>
    </form>
  );
}

const FiscalReconciliationPage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [tab, setTab] = useState('esf');
  const [settings, setSettings] = useState(null);
  const [esf, setEsf] = useState(null);
  const [eri, setEri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState({});
  const [rubros, setRubros] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    chartOfAccountsAPI.niifRubros().then((r) => setRubros(r.data || [])).catch(() => {});
    chartOfAccountsAPI.getAll().then((r) => setAccounts((r.data || []).filter((a) => a.accepts_entries && ['activo', 'pasivo'].includes(a.account_type)))).catch(() => {});
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [s, e, r] = await Promise.all([fiscalReconciliationAPI.getSettings(year), fiscalReconciliationAPI.esf(year), fiscalReconciliationAPI.eri(year)]);
      setSettings(s.data); setEsf(e.data); setEri(r.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error generando la conciliación');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [year]);

  const del = async (id) => {
    if (!window.confirm('¿Eliminar este ajuste manual?')) return;
    try { await fiscalReconciliationAPI.deleteAdjustment(id); load(); } catch { toast.error('Error eliminando'); }
  };
  const copyPrev = async () => {
    try {
      const r = await fiscalReconciliationAPI.copyPrevious(year);
      toast.success(`${r.data.copied} ajuste(s) copiados de ${year - 1}`);
      load();
    } catch (error) { toast.error(error.response?.data?.message || 'Error'); }
  };
  const exportExcel = async () => {
    try {
      setDownloading(true);
      const res = await fiscalReconciliationAPI.exportExcel(year);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `Conciliacion-Fiscal-${year}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { toast.error('Error generando el Excel'); } finally { setDownloading(false); }
  };

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Conciliación fiscal</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-3xl">
              Del valor contable NIIF al valor fiscal (soporte para diligenciar el formato 2516 y la declaración de renta). Las diferencias
              temporarias son la base del impuesto diferido, que se contabiliza en{' '}
              <Link to="/accounting/niif-measurements" className="text-indigo-600 hover:underline">Ajustes NIIF de cierre</Link>.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Año gravable</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${input} py-2`}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={exportExcel} disabled={downloading} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <TableCellsIcon className="w-4 h-4" /> {downloading ? 'Generando...' : 'Excel'}
            </button>
          </div>
        </div>

        {settings && <SettingsPanel year={year} settings={settings} setSettings={setSettings} onSaved={load} />}

        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-6">
            {[['esf', 'Patrimonial'], ['eri', 'Renta líquida']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`pb-3 text-sm font-medium border-b-2 ${tab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </nav>
        </div>

        {loading && <p className="p-6 text-center text-gray-400">Generando...</p>}
        {!loading && tab === 'esf' && esf && <EsfTab data={esf} open={open} toggle={(k) => setOpen((o) => ({ ...o, [k]: !o[k] }))} onDelete={del} />}
        {!loading && tab === 'eri' && eri && <EriTab data={eri} onDelete={del} />}

        <AdjustmentForm year={year} rubros={rubros} accounts={accounts} onCreated={load} />
        <div className="flex justify-end">
          <button onClick={copyPrev} className="text-sm text-indigo-600 hover:underline">
            Copiar los ajustes patrimoniales temporarios de {year - 1}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default FiscalReconciliationPage;
