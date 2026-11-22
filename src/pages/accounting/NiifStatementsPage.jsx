// frontend/src/pages/accounting/NiifStatementsPage.jsx
//
// Estados financieros NIIF para Pymes (Grupo 2): situación financiera,
// resultado integral y cambios en el patrimonio, comparativos. Cada rubro
// se despliega para ver las cuentas que lo forman. El rubro de cada cuenta
// se ajusta en el Plan de Cuentas.
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronDownIcon, ChevronRightIcon, TableCellsIcon, ExclamationTriangleIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import Layout from '../../components/layout/Layout';
import { niifStatementsAPI } from '../../api/accounting';
import useBranchStore from '../../store/branchStore';
import { formatCurrency } from '../../utils/formatters';

const TABS = [
  { id: 'financial-position', label: 'Situación financiera' },
  { id: 'comprehensive-income', label: 'Resultado integral' },
  { id: 'equity-changes', label: 'Cambios en el patrimonio' },
  { id: 'notes', label: 'Notas' },
];

const pad = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

const money = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) < 0.005) return '—';
  return n < 0 ? `(${formatCurrency(Math.abs(n))})` : formatCurrency(n);
};

const thBase = 'px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap';
const th = `${thBase} text-right`;
const thLeft = `${thBase} text-left`;
const td = 'px-4 py-2 text-right text-sm tabular-nums whitespace-nowrap';

function RubroRows({ label, current, prior, accounts, sign = 1, open, onToggle }) {
  const canOpen = accounts?.length > 0;
  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
          <button type="button" onClick={canOpen ? onToggle : undefined} className="flex items-center gap-1 text-left">
            {canOpen ? (open ? <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400" />) : <span className="w-3.5" />}
            {label}
          </button>
        </td>
        <td className={td}>{money(sign * current)}</td>
        <td className={`${td} text-gray-500`}>{money(sign * prior)}</td>
      </tr>
      {open && accounts.map((a) => (
        <tr key={a.id || a.name} className="bg-gray-50/60 dark:bg-gray-800/30">
          <td className="pl-12 pr-4 py-1.5 text-xs text-gray-500 dark:text-gray-400">
            {a.code && <span className="font-mono mr-2">{a.code}</span>}{a.name}
          </td>
          <td className={`${td} text-xs text-gray-500`}>{money(sign * a.current)}</td>
          <td className={`${td} text-xs text-gray-400`}>{money(sign * a.prior)}</td>
        </tr>
      ))}
    </>
  );
}

function TotalRow({ label, current, prior, strong }) {
  return (
    <tr className={strong ? 'bg-gray-100 dark:bg-gray-800' : 'border-t border-gray-200 dark:border-gray-700'}>
      <td className={`px-4 py-2 text-sm ${strong ? 'font-bold' : 'font-semibold'} text-gray-900 dark:text-gray-100`}>{label}</td>
      <td className={`${td} ${strong ? 'font-bold' : 'font-semibold'}`}>{money(current)}</td>
      <td className={`${td} ${strong ? 'font-bold' : 'font-semibold'} text-gray-600 dark:text-gray-400`}>{money(prior)}</td>
    </tr>
  );
}

function FinancialPosition({ data, open, toggle }) {
  const groups = [
    { group: 'activo', total: 'TOTAL ACTIVO' },
    { group: 'pasivo', total: 'TOTAL PASIVO' },
    { group: 'patrimonio', total: 'TOTAL PATRIMONIO' },
  ];
  return (
    <>
      {data.unclassified?.length > 0 && (
        <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
          <span>
            {data.unclassified.length} cuenta(s) con saldo no tienen rubro NIIF claro ({data.unclassified.slice(0, 5).map((a) => a.code).join(', ')}
            {data.unclassified.length > 5 ? '…' : ''}) y quedaron en "otros". Asígnales un rubro en el{' '}
            <Link to="/accounting/chart-of-accounts" className="underline">Plan de Cuentas</Link>.
          </span>
        </div>
      )}
      {!data.totals.current.cuadra && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          El estado no cuadra: activo {money(data.totals.current.activo)} ≠ pasivo + patrimonio {money(data.totals.current.pasivo_patrimonio)}.
        </div>
      )}
      <table className="min-w-full">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className={thLeft}>Concepto</th>
            <th className={th}>{fmtDate(data.as_of)}</th>
            <th className={th}>{fmtDate(data.compare_as_of)}</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(({ group, total }) => (
            <React.Fragment key={group}>
              {data.sections.filter((s) => s.group === group).map((sec) => (
                <React.Fragment key={sec.code}>
                  <tr><td colSpan={3} className="px-4 pt-4 pb-1 text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-400">{sec.label}</td></tr>
                  {sec.rubros.length === 0 && <tr><td colSpan={3} className="px-4 py-1 text-xs text-gray-400">Sin saldos</td></tr>}
                  {sec.rubros.map((r) => (
                    <RubroRows key={r.code} {...r} open={!!open[r.code]} onToggle={() => toggle(r.code)} />
                  ))}
                  {group !== 'patrimonio' && <TotalRow label={`Total ${sec.label.toLowerCase()}`} current={sec.current} prior={sec.prior} />}
                </React.Fragment>
              ))}
              <TotalRow label={total} current={data.totals.current[group]} prior={data.totals.prior[group]} strong />
            </React.Fragment>
          ))}
          <TotalRow label="TOTAL PASIVO Y PATRIMONIO" current={data.totals.current.pasivo_patrimonio} prior={data.totals.prior.pasivo_patrimonio} strong />
        </tbody>
      </table>
    </>
  );
}

function ComprehensiveIncome({ data, open, toggle }) {
  return (
    <table className="min-w-full">
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          <th className={thLeft}>Concepto</th>
          <th className={th}>{fmtDate(data.from)} – {fmtDate(data.to)}</th>
          <th className={th}>{fmtDate(data.compare_from)} – {fmtDate(data.compare_to)}</th>
        </tr>
      </thead>
      <tbody>
        {data.lines.map((l) => (l.subtotal
          ? <TotalRow key={l.key} label={l.label} current={l.current} prior={l.prior} strong={l.strong} />
          : (
            <RubroRows
              key={l.key} label={l.label} current={l.current} prior={l.prior} accounts={l.accounts || []}
              sign={l.negative ? -1 : 1} open={!!open[l.key]} onToggle={() => toggle(l.key)}
            />
          )))}
      </tbody>
    </table>
  );
}

function EquityChanges({ data }) {
  if (!data.columns.length) return <p className="p-6 text-sm text-gray-500">No hay movimientos de patrimonio en el periodo.</p>;
  return (
    <table className="min-w-full">
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          <th className={thLeft}>Concepto</th>
          {data.columns.map((c) => <th key={c.code} className={`${th} whitespace-normal max-w-[10rem]`}>{c.label}</th>)}
          <th className={th}>Total patrimonio</th>
        </tr>
      </thead>
      <tbody>
        {data.rows.map((r) => (
          <tr key={r.key} className={r.strong ? 'bg-gray-100 dark:bg-gray-800 font-semibold' : 'border-t border-gray-100 dark:border-gray-800'}>
            <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">
              {r.key === 'saldo_inicial' ? `Saldo al ${fmtDate(data.opening_date)}` : r.key === 'saldo_final' ? `Saldo al ${fmtDate(data.to)}` : r.label}
            </td>
            {data.columns.map((c) => <td key={c.code} className={td}>{money(r.values[c.code])}</td>)}
            <td className={`${td} font-semibold`}>{money(r.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─────────────────────────── Notas ─────────────────────────── */

// "**Título.** texto" → título en negrita.
function Paragraph({ text }) {
  const m = /^\*\*(.+?)\*\*\s*([\s\S]*)$/.exec(text);
  return (
    <p className="text-sm text-gray-700 dark:text-gray-300 text-justify">
      {m ? <><strong>{m[1]}</strong> {m[2]}</> : text}
    </p>
  );
}

function NoteTable({ t }) {
  const isMoney = (i) => i >= (t.money_from ?? 99) && i <= (t.money_to ?? 99);
  const cell = (v, i) => (typeof v === 'number' && isMoney(i) ? money(v) : v);
  return (
    <div className="overflow-x-auto">
      {t.title && <p className="text-xs font-semibold text-gray-600 mb-1">{t.title}</p>}
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>{t.columns.map((c, i) => <th key={i} className={`px-2 py-1.5 font-medium text-gray-500 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {t.rows.map((r, j) => (
            <tr key={j}>{r.map((v, i) => <td key={i} className={`px-2 py-1 tabular-nums ${t.columns[i].align === 'right' ? 'text-right' : ''}`}>{cell(v, i)}</td>)}</tr>
          ))}
          {t.total && <tr className="font-semibold">{t.total.map((v, i) => <td key={i} className={`px-2 py-1 tabular-nums ${t.columns[i].align === 'right' ? 'text-right' : ''}`}>{cell(v, i)}</td>)}</tr>}
        </tbody>
      </table>
    </div>
  );
}

function NoteEditor({ note, year, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState(note.custom?.mode || 'append');
  const [body, setBody] = useState(note.custom?.body || '');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    try {
      setSaving(true);
      await niifStatementsAPI.saveNote(year, note.key, { mode, body });
      toast.success('Nota guardada');
      setEditing(false);
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error guardando la nota');
    } finally { setSaving(false); }
  };
  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-xs text-indigo-600 hover:underline">
        {note.custom ? 'Editar texto propio' : 'Agregar o reemplazar texto'}
      </button>
    );
  }
  return (
    <div className="space-y-2 border border-indigo-100 dark:border-indigo-900 rounded-lg p-3">
      <select value={mode} onChange={(e) => setMode(e.target.value)} className="px-2 py-1 border border-gray-300 rounded text-xs">
        <option value="append">Agregar al texto automático</option>
        <option value="replace">Reemplazar el texto automático (las tablas se mantienen)</option>
      </select>
      <textarea
        rows={5} value={body} onChange={(e) => setBody(e.target.value)}
        placeholder="Texto de la nota. Separe párrafos con una línea en blanco. Déjelo vacío y guarde para volver al texto automático."
        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded text-sm"
      />
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving} className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
        <button type="button" onClick={() => setEditing(false)} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
      </div>
    </div>
  );
}

const SIGNATURE_LABELS = [
  ['legal_rep_name', 'Representante legal'], ['legal_rep_id', 'Cédula'],
  ['accountant_name', 'Contador público'], ['accountant_tp', 'Tarjeta profesional'],
  ['auditor_name', 'Revisor fiscal (si aplica)'], ['auditor_tp', 'T.P. revisor fiscal'],
];

function Signatures({ data, onSaved }) {
  const [sig, setSig] = useState(data.signatures || {});
  const [saving, setSaving] = useState(false);
  const save = async () => {
    try {
      setSaving(true);
      await niifStatementsAPI.saveSignatures(data.year, sig);
      toast.success('Firmas guardadas');
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error guardando');
    } finally { setSaving(false); }
  };
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Quiénes certifican los estados {data.year}</p>
      <p className="text-xs text-gray-500 mb-2">Aparecen al pie de cada estado en el PDF (art. 37 de la Ley 222 de 1995).</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
        {SIGNATURE_LABELS.map(([k, label]) => (
          <div key={k}>
            <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
            <input value={sig[k] || ''} onChange={(e) => setSig((s) => ({ ...s, [k]: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded text-sm" />
          </div>
        ))}
      </div>
      <button type="button" onClick={save} disabled={saving} className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar firmas'}</button>
    </div>
  );
}

function Notes({ data, onSaved }) {
  return (
    <div>
      <Signatures data={data} onSaved={onSaved} />
      <div className="p-4 space-y-6">
        {data.notes.map((n) => (
          <section key={n.key} className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Nota {n.number}. {n.title}</h3>
            {n.custom?.mode !== 'replace' && (n.paragraphs || []).map((p, i) => <Paragraph key={i} text={p} />)}
            {n.custom?.body && n.custom.body.split(/\n\s*\n/).filter((p) => p.trim()).map((p, i) => (
              <div key={`c${i}`} className="border-l-2 border-indigo-200 pl-2"><Paragraph text={p.trim()} /></div>
            ))}
            {(n.tables || []).filter((t) => t.rows.length).map((t, i) => <NoteTable key={i} t={t} />)}
            <NoteEditor note={n} year={data.year} onSaved={onSaved} />
          </section>
        ))}
      </div>
    </div>
  );
}

const NiifStatementsPage = () => {
  const [tab, setTab] = useState('financial-position');
  const { branches, fetchBranches } = useBranchStore();
  const [branchId, setBranchId] = useState('');
  const year = new Date().getFullYear();
  const [filters, setFilters] = useState({ as_of: today(), compare_as_of: `${year - 1}-12-31`, from: `${year}-01-01`, to: today() });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [open, setOpen] = useState({});
  const reqRef = useRef(0);

  useEffect(() => { fetchBranches(); }, []);
  useEffect(() => { load(); }, [tab]);

  const params = () => {
    const branch_id = branchId || undefined;
    if (tab === 'financial-position') return { as_of: filters.as_of, compare_as_of: filters.compare_as_of || undefined, branch_id };
    if (tab === 'notes') return { as_of: filters.to, from: filters.from, compare_as_of: filters.compare_as_of || undefined };
    return { from: filters.from, to: filters.to, branch_id };
  };

  const load = async () => {
    const id = ++reqRef.current;
    try {
      setLoading(true);
      setData(null);
      const res = await niifStatementsAPI.get(tab, params());
      if (reqRef.current === id) setData(res.data);
    } catch (error) {
      if (reqRef.current === id) toast.error(error.response?.data?.message || 'Error generando el estado financiero');
    } finally {
      if (reqRef.current === id) setLoading(false);
    }
  };

  const exportExcel = async () => {
    try {
      setDownloading(true);
      const response = await niifStatementsAPI.exportExcel(tab, params());
      const url = URL.createObjectURL(response.data);
      const name = (response.headers?.['content-disposition'] || '').match(/filename="([^"]+)"/)?.[1] || `${tab}.xlsx`;
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Error generando el Excel');
    } finally {
      setDownloading(false);
    }
  };

  const openPdf = async (fn) => {
    try {
      setDownloading(true);
      const response = await fn();
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Error generando el PDF');
    } finally {
      setDownloading(false);
    }
  };
  const exportPdf = () => openPdf(() => niifStatementsAPI.exportPdf(tab, params()));
  // Juego completo al corte: el de la pestaña de situación financiera o el "hasta" de las demás.
  const exportPackage = () => openPdf(() => niifStatementsAPI.packagePdf({
    as_of: tab === 'financial-position' ? filters.as_of : filters.to,
    from: filters.from,
    compare_as_of: filters.compare_as_of || undefined,
    branch_id: branchId || undefined,
  }));

  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const input = 'px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg text-sm';
  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Estados Financieros NIIF</h1>
          <p className="text-sm text-gray-500 mt-1">
            NIIF para Pymes (Grupo 2), comparativos. Cada cuenta se presenta según su rubro NIIF, ajustable en el{' '}
            <Link to="/accounting/chart-of-accounts" className="text-indigo-600 hover:underline">Plan de Cuentas</Link>.
            El flujo de efectivo está en <Link to="/accounting/reports" className="text-indigo-600 hover:underline">Reportes Financieros</Link> y
            también va en el PDF de los estados completos.
          </p>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <nav className="flex gap-6 min-w-max">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setData(null); setOpen({}); setTab(t.id); }}
                className={`pb-3 text-sm font-medium border-b-2 ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-end gap-3">
          {tab === 'financial-position' ? (
            <>
              <div><label className="block text-xs text-gray-500 mb-1">Corte</label><input type="date" value={filters.as_of} onChange={setF('as_of')} className={input} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Comparar con</label><input type="date" value={filters.compare_as_of} onChange={setF('compare_as_of')} className={input} /></div>
            </>
          ) : (
            <>
              <div><label className="block text-xs text-gray-500 mb-1">Desde</label><input type="date" value={filters.from} onChange={setF('from')} className={input} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">{tab === 'notes' ? 'Hasta (corte)' : 'Hasta'}</label><input type="date" value={filters.to} onChange={setF('to')} className={input} /></div>
            </>
          )}
          {branches?.length > 1 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sede</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={input}>
                <option value="">Todas (consolidado)</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <button onClick={load} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Generar</button>
          <button
            onClick={exportExcel} disabled={downloading || !data || tab === 'notes'}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <TableCellsIcon className="w-4 h-4" /> {downloading ? 'Generando...' : 'Excel'}
          </button>
          <button
            onClick={exportPdf} disabled={downloading || !data}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={exportPackage} disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
            title="Situación financiera, resultado integral, cambios en el patrimonio, flujos de efectivo y notas, con firmas"
          >
            <DocumentArrowDownIcon className="w-4 h-4" /> Estados financieros completos (PDF)
          </button>
          {tab === 'comprehensive-income' && <p className="w-full text-xs text-gray-500">Se compara con el mismo rango del año anterior.</p>}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto space-y-3">
          {loading && <p className="p-8 text-center text-gray-400">Generando...</p>}
          {!loading && data && tab === 'financial-position' && <FinancialPosition data={data} open={open} toggle={toggle} />}
          {!loading && data && tab === 'comprehensive-income' && <ComprehensiveIncome data={data} open={open} toggle={toggle} />}
          {!loading && data && tab === 'equity-changes' && <EquityChanges data={data} />}
          {!loading && data && tab === 'notes' && <Notes data={data} onSaved={load} />}
        </div>
      </div>
    </Layout>
  );
};

export default NiifStatementsPage;
