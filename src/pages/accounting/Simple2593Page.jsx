import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ExclamationTriangleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Layout from '../../components/layout/Layout';
import { simple2593API } from '../../api/accounting';
import { formatCurrency } from '../../utils/formatters';
import useAuthStore from '../../store/authStore';

// Formulario 2593 — Recibo electrónico del SIMPLE (Resolución DIAN 000081 de
// 2024). Pitbox calcula las casillas del bimestre con la contabilidad; el
// recibo se diligencia y presenta en el servicio informático de la DIAN.

const STAFF_ROLES = ['admin', 'super_admin', 'accountant'];
const PERIOD_LABELS = ['Ene – feb', 'Mar – abr', 'May – jun', 'Jul – ago', 'Sep – oct', 'Nov – dic'];
const GROUP_OPTIONS = [
  { value: '1', label: 'Grupo 1' }, { value: '2', label: 'Grupo 2' }, { value: '3', label: 'Grupo 3' },
  { value: '3p', label: 'Grupo 3 (sic)' }, { value: '6', label: 'Grupo 6' },
];
// Casillas que se arrastran del bimestre anterior o que solo valen en el bimestre 1.
const PREV_INPUTS = ['prev_c48', 'prev_c57', 'prev_c65', 'prev_c75'];
const FIRST_PERIOD_INPUTS = ['c50', 'c68', 'c100'];

const money = (v) => formatCurrency(Number(v) || 0);
const cellInput = 'w-36 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500';

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  const out = { ...obj };
  let cur = out;
  keys.slice(0, -1).forEach((k) => { cur[k] = { ...(cur[k] || {}) }; cur = cur[k]; });
  cur[keys[keys.length - 1]] = value;
  return out;
}

export default function Simple2593Page() {
  const { user } = useAuthStore();
  const isStaff = STAFF_ROLES.includes(user?.role);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState(Math.max(1, Math.ceil((now.getMonth() + 1) / 2) - 1) || 1);
  const [receipts, setReceipts] = useState([]);
  const [data, setData] = useState(null);
  const [inputs, setInputs] = useState({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const result = data?.result;
  const receipt = data?.receipt;
  const presented = receipt?.status === 'presentado';
  const editable = isStaff && !presented;

  const loadList = async () => {
    try { setReceipts((await simple2593API.list(year)).data || []); } catch { /* informativo */ }
  };
  const load = async () => {
    setLoading(true);
    try {
      const res = await simple2593API.get(year, period);
      setData(res.data);
      setInputs(res.data.receipt?.inputs || {});
      setDirty(false);
    } catch (error) {
      setData(null);
      toast.error(error.response?.data?.message || 'Error calculando el formulario 2593');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [year, period]);
  useEffect(() => { loadList(); }, [year]);

  const apply = (res) => {
    setData((d) => ({ ...d, receipt: res.data.receipt, result: res.data.result }));
    setInputs(res.data.receipt?.inputs || {});
    setDirty(false);
    loadList();
  };

  const save = async () => {
    setBusy(true);
    try {
      apply(await simple2593API.save(year, period, inputs));
      toast.success('Borrador guardado y recalculado');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error guardando');
    } finally {
      setBusy(false);
    }
  };

  const present = async () => {
    const formNumber = window.prompt('Número del formulario 2593 que asignó la DIAN (opcional):', '');
    if (formNumber === null) return;
    setBusy(true);
    try {
      apply(await simple2593API.present(year, period, inputs, formNumber));
      toast.success('Recibo marcado como presentado');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error');
    } finally {
      setBusy(false);
    }
  };

  const reopen = async () => {
    if (!window.confirm('El recibo vuelve a borrador y se recalcula con la contabilidad actual. ¿Continuar?')) return;
    setBusy(true);
    try {
      apply(await simple2593API.reopen(year, period));
      toast.success('Recibo reabierto');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error');
    } finally {
      setBusy(false);
    }
  };

  const exportExcel = async () => {
    try {
      const blob = await simple2593API.exportExcel(year, period);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formulario_2593_${year}_bim${period}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error exportando');
    }
  };

  const change = (path, value) => { setInputs((i) => setPath(i, path, value)); setDirty(true); };

  // ¿Se puede digitar esta casilla en este bimestre?
  const canInput = (key) => {
    if (!editable || !key) return false;
    if (PREV_INPUTS.includes(key)) return period > 1 && !result?.sources?.previous_receipt;
    if (FIRST_PERIOD_INPUTS.includes(key)) return period === 1;
    return true;
  };

  const statusOf = (p) => receipts.find((r) => r.period === p)?.status;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Formulario 2593 — Recibo electrónico del SIMPLE</h1>
          <p className="text-sm text-gray-500 mt-1">
            Anticipo bimestral del Régimen Simple de Tributación (SIMPLE, IVA, impuesto al consumo e ICA consolidado), calculado con la contabilidad.
            El recibo se diligencia y se presenta en el portal de la DIAN; aquí tienes cada casilla lista para copiarla.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].filter((y) => y >= 2024).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="flex flex-wrap gap-1">
            {PERIOD_LABELS.map((label, idx) => {
              const p = idx + 1;
              const st = statusOf(p);
              return (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-2 rounded-md text-sm border ${period === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                  {String(p).padStart(2, '0')} · {label}
                  {st && <span className={`ml-2 text-xs ${period === p ? 'text-blue-100' : st === 'presentado' ? 'text-green-600' : 'text-amber-600'}`}>{st === 'presentado' ? '✓ presentado' : 'borrador'}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {loading && <p className="text-sm text-gray-500">Calculando…</p>}

        {!loading && result && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-700">
                <div>
                  <b>Bimestre {String(result.period).padStart(2, '0')}</b> ({result.period_label} {result.year}) · {result.date_from} a {result.date_to}
                </div>
                <div className="text-gray-500">
                  Estado: {presented ? <span className="text-green-700 font-medium">presentado{receipt.form_number ? ` · No. ${receipt.form_number}` : ''}</span> : <span className="text-amber-700 font-medium">borrador</span>}
                  {' · '}UVT {Number(result.uvt).toLocaleString('es-CO')} · ingresos del bimestre {Number(result.income_uvt).toLocaleString('es-CO')} UVT
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={exportExcel} className="flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50">
                  <ArrowDownTrayIcon className="h-4 w-4" /> Excel
                </button>
                {editable && (
                  <>
                    <button onClick={save} disabled={busy} className="px-3 py-2 rounded-md border border-blue-600 text-blue-700 text-sm disabled:opacity-50">
                      {dirty ? 'Guardar y recalcular' : 'Guardar borrador'}
                    </button>
                    <button onClick={present} disabled={busy} className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">Marcar presentado</button>
                  </>
                )}
                {isStaff && presented && (
                  <button onClick={reopen} disabled={busy} className="px-3 py-2 rounded-md border border-gray-300 text-sm disabled:opacity-50">Reabrir</button>
                )}
              </div>
            </div>

            {result.warnings?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
                {result.warnings.map((w) => (
                  <div key={w} className="flex gap-2"><ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" /> <span>{w}</span></div>
                ))}
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700 flex flex-wrap items-center gap-3">
              <span>Grupo para los ingresos sin grupo SIMPLE:</span>
              <select disabled={!editable} value={inputs.default_group || '2'} onChange={(e) => change('default_group', e.target.value)} className="border border-gray-300 rounded-md px-2 py-1 text-sm">
                {GROUP_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              <span className="text-gray-500">
                Tarifa aplicada: <b>{result.sheet1.boxes[36]}%</b> ({result.groups.find((g) => g.key === result.applied_group)?.label}).
                El grupo de cada actividad se configura en <Link to="/accounting/ica" className="text-blue-600 hover:underline">ICA → Configuración</Link>.
              </span>
            </div>

            <Sheet
              title="Hoja 1 — Liquidación del recibo electrónico SIMPLE"
              sections={data.layout.sheet1}
              boxes={result.sheet1.boxes}
              inputs={inputs}
              canInput={canInput}
              onChange={change}
              hints={{
                45: result.sources.employer_pension && `Calculado: ${money(result.sources.employer_pension.amount)} (aportes del empleador de ${result.sources.employer_pension.periods} periodo(s) de nómina con seguridad social pagada en el bimestre). Escribe otro valor solo si debes corregirlo.`,
              }}
              footer={(
                <tr className="bg-blue-50 font-semibold">
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2">Total a pagar (76 + 77 + 78 + 79)</td>
                  <td className="px-3 py-2 text-right">{money(result.sheet1.total_to_pay)}</td>
                </tr>
              )}
            />

            {result.sheet2.map((mun) => (
              <MunicipalitySheet key={mun.municipality_id} mun={mun} layout={data.layout.sheet2}
                inputs={inputs.municipalities?.[mun.municipality_id] || {}}
                canInput={canInput}
                onChange={(key, value) => change(`municipalities.${mun.municipality_id}.${key}`, value)} />
            ))}
          </>
        )}
      </div>
    </Layout>
  );
}

function Sheet({ title, sections, boxes, inputs, canInput, onChange, hints = {}, footer }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <h2 className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-900">{title}</h2>
      <table className="w-full text-sm">
        <tbody>
          {sections.map((section) => (
            <SectionRows key={section.title} section={section} boxes={boxes} inputs={inputs} canInput={canInput} onChange={onChange} hints={hints} />
          ))}
          {footer}
        </tbody>
      </table>
    </div>
  );
}

function SectionRows({ section, boxes, inputs, canInput, onChange, hints = {} }) {
  return (
    <>
      <tr className="bg-gray-50"><td colSpan={3} className="px-3 py-2 font-medium text-gray-700">{section.title}</td></tr>
      {section.boxes.map((b) => {
        const inputKey = b.input;
        const editableBox = canInput(inputKey?.startsWith('exterior.') ? 'exterior' : inputKey);
        const raw = inputKey ? getPath(inputs, inputKey) : undefined;
        return (
          <tr key={b.box} className="border-t border-gray-100 align-top">
            <td className="px-3 py-2 w-16 text-gray-500 font-mono">{b.box}</td>
            <td className="px-3 py-2 text-gray-700">
              {b.label}
              {hints[b.box] && <div className="text-xs text-gray-500 mt-1">{hints[b.box]}</div>}
            </td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              {editableBox ? (
                <input type="number" min="0" step="1000" value={raw ?? ''} placeholder={String(boxes[b.box] ?? 0)}
                  onChange={(e) => onChange(inputKey, e.target.value)} className={cellInput} />
              ) : (
                <span className={inputKey ? 'text-gray-900' : 'text-gray-900'}>{b.percent ? `${boxes[b.box]}%` : money(boxes[b.box])}</span>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}

function MunicipalitySheet({ mun, layout, inputs, canInput, onChange }) {
  const [showAccounts, setShowAccounts] = useState(false);
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Hoja 2 — ICA consolidado: {mun.city_name}</h2>
        <p className="text-xs text-gray-500 mt-1">
          82. Departamento {mun.department_code || '—'} · 83. Municipio {mun.city_code || '—'} (DIVIPOLA) · Sedes: {mun.branches}
          {' · '}<button onClick={() => setShowAccounts((s) => !s)} className="text-blue-600 hover:underline">{showAccounts ? 'Ocultar' : 'Ver'} cuentas de ingreso</button>
        </p>
      </div>
      {showAccounts && (
        <table className="w-full text-xs border-b border-gray-200">
          <thead className="bg-gray-50 text-gray-600"><tr><th className="px-3 py-1 text-left">Cuenta</th><th className="px-3 py-1 text-right">Créditos</th><th className="px-3 py-1 text-right">Débitos</th></tr></thead>
          <tbody>
            {mun.accounts.map((a) => (
              <tr key={a.code} className="border-t border-gray-100"><td className="px-3 py-1">{a.code} {a.name}</td><td className="px-3 py-1 text-right">{money(a.credit)}</td><td className="px-3 py-1 text-right">{money(a.debit)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <table className="w-full text-sm">
        <tbody>
          <SectionRows section={layout[0]} boxes={mun.boxes} inputs={inputs} canInput={canInput} onChange={onChange} />
          <tr className="bg-gray-50"><td colSpan={3} className="px-3 py-2 font-medium text-gray-700">Discriminación de actividades gravadas</td></tr>
          <tr>
            <td colSpan={3} className="px-3 py-2">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500"><tr><th className="text-left py-1">91. Código CIIU</th><th className="text-right py-1">92. Ingresos gravados</th><th className="text-right py-1">93. Tarifa (‰)</th><th className="text-right py-1">94. Impuesto</th></tr></thead>
                <tbody>
                  {mun.activities.map((a) => (
                    <tr key={a.activity_id} className="border-t border-gray-100">
                      <td className="py-1">{a.ciiu || 'sin CIIU'} — {a.description}{a.is_default ? ' (principal)' : ''}</td>
                      <td className="py-1 text-right">{money(a.c92)}</td>
                      <td className="py-1 text-right" title={a.rate_source === 'municipio' ? 'Tarifa consolidada adoptada por el municipio' : 'Tarifa del ICA más avisos y tableros y bomberil'}>{a.rate}</td>
                      <td className="py-1 text-right">{money(a.c94)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
          <SectionRows section={layout[1]} boxes={mun.boxes} inputs={inputs} canInput={canInput} onChange={onChange} />
          <SectionRows section={layout[2]} boxes={mun.boxes} inputs={inputs} canInput={canInput} onChange={onChange} />
          <tr className="border-t border-gray-100">
            <td className="px-3 py-2 text-gray-500 font-mono">107 / 108</td>
            <td className="px-3 py-2 text-gray-700" colSpan={2}>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" disabled={!canInput('c86')} checked={!!inputs.rate_informed_by_taxpayer}
                  onChange={(e) => onChange('rate_informed_by_taxpayer', e.target.checked)} />
                El municipio no adoptó o no informó la tarifa consolidada: la informa el contribuyente (casilla 108). Si no, casilla 107.
              </label>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
