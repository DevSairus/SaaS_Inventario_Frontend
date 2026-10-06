// frontend/src/pages/accounting/IcaPage.jsx
//
// ICA por municipio: pre-liquidación (base por actividad CIIU, avisos y
// tableros, bomberil, ReteICA recibida, autorretención), causación contable y
// configuración. Ver backend/src/services/tax/ica.service.js.
import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import { ExclamationTriangleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { icaAPI } from '../../api/accounting';
import { formatCurrency } from '../../utils/formatters';
import useAuthStore from '../../store/authStore';
import DivipolaCitySelect from '../../components/common/DivipolaCitySelect';

const STAFF_ROLES = ['admin', 'super_admin', 'accountant'];
const PERIODICITY_LABELS = { mensual: 'Mensual', bimestral: 'Bimestral', anual: 'Anual' };
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const pad = (n) => String(n).padStart(2, '0');
const lastDay = (y, m) => new Date(y, m, 0).getDate();

// Períodos del año según la periodicidad del municipio.
function periodsFor(periodicity, year) {
  if (periodicity === 'anual') return [{ label: `Año ${year}`, from: `${year}-01-01`, to: `${year}-12-31` }];
  const size = periodicity === 'mensual' ? 1 : 2;
  const list = [];
  for (let m = 1; m <= 12; m += size) {
    const end = m + size - 1;
    list.push({
      label: size === 1 ? `${MONTHS[m - 1]} ${year}` : `${MONTHS[m - 1]}–${MONTHS[end - 1]} ${year}`,
      from: `${year}-${pad(m)}-01`,
      to: `${year}-${pad(end)}-${pad(lastDay(year, end))}`,
    });
  }
  return list;
}

const inputCls = 'mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const EMPTY_MUN = { city_name: '', city_code: '', periodicity: 'bimestral', avisos_tableros: false, avisos_pct: 15, bomberil_pct: 0, autoica_enabled: false, round_thousands: true, excluded_account_prefixes: '', is_active: true };

const IcaPage = () => {
  const { user } = useAuthStore();
  const isStaff = STAFF_ROLES.includes(user?.role);
  const [tab, setTab] = useState('liquidacion');
  const [config, setConfig] = useState({ municipalities: [], branches: [] });
  const [loadingConfig, setLoadingConfig] = useState(true);

  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await icaAPI.getConfig();
      setConfig(res.data);
    } catch {
      toast.error('Error cargando la configuración de ICA');
    } finally {
      setLoadingConfig(false);
    }
  };
  useEffect(() => { loadConfig(); }, []);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">ICA — Industria y Comercio</h1>
          <p className="text-sm text-gray-500 mt-1">
            Liquidación del impuesto por municipio sobre los ingresos contabilizados, con ReteICA recibida, autorretención y su causación contable.
          </p>
        </div>

        <div className="flex gap-2 border-b border-gray-200">
          {[['liquidacion', 'Liquidación'], ['configuracion', 'Configuración']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loadingConfig ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : tab === 'liquidacion' ? (
          <Liquidacion municipalities={config.municipalities.filter((m) => m.is_active)} isStaff={isStaff} onGoConfig={() => setTab('configuracion')} />
        ) : (
          <Configuracion config={config} isStaff={isStaff} onSaved={loadConfig} />
        )}
      </div>
    </Layout>
  );
};

/* ───────────────────────── Liquidación ───────────────────────── */

function Liquidacion({ municipalities, isStaff, onGoConfig }) {
  const [munId, setMunId] = useState(municipalities[0]?.id || '');
  const mun = municipalities.find((m) => m.id === munId);
  const [year, setYear] = useState(new Date().getFullYear());
  const periods = useMemo(() => periodsFor(mun?.periodicity || 'bimestral', year), [mun?.periodicity, year]);
  const [periodIdx, setPeriodIdx] = useState(0);
  const period = periods[Math.min(periodIdx, periods.length - 1)];
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settlements, setSettlements] = useState([]);

  const loadSettlements = async () => {
    if (!munId) return;
    try {
      const res = await icaAPI.listSettlements({ municipality_id: munId });
      setSettlements(res.data || []);
    } catch { /* informativo */ }
  };

  const loadReport = async () => {
    if (!munId || !period) return;
    setLoading(true);
    try {
      const res = await icaAPI.report({ municipality_id: munId, date_from: period.from, date_to: period.to });
      setReport(res.data);
    } catch (error) {
      setReport(null);
      toast.error(error.response?.data?.message || 'Error calculando el ICA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); loadSettlements(); }, [munId, period?.from, period?.to]);

  if (!municipalities.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-600">
        Aún no hay municipios configurados.{' '}
        <button onClick={onGoConfig} className="text-blue-600 hover:underline">Configurar municipios y actividades</button>
      </div>
    );
  }

  const cause = async (kind) => {
    const what = kind === 'autoica' ? 'la autorretención de ICA' : 'el ICA del período (con el cruce de retenciones)';
    if (!window.confirm(`Se contabilizará ${what} de ${mun.city_name}, ${period.label}. ¿Continuar?`)) return;
    setBusy(true);
    try {
      const res = await icaAPI.createSettlement({ kind, municipality_id: munId, date_from: period.from, date_to: period.to });
      toast.success(res.message);
      loadReport();
      loadSettlements();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al causar');
    } finally {
      setBusy(false);
    }
  };

  const voidOne = async (s) => {
    const reason = window.prompt('Motivo de la anulación');
    if (!reason) return;
    try {
      await icaAPI.voidSettlement(s.id, reason);
      toast.success('Causación anulada');
      loadReport();
      loadSettlements();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error anulando');
    }
  };

  const t = report?.totals;
  const hasIcaSettlement = report?.settlements?.some((s) => s.kind === 'ica');
  const row = (label, value, strong = false) => (
    <div className={`flex justify-between text-sm ${strong ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
      <span>{label}</span><span>{formatCurrency(value)}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Municipio</span>
          <select value={munId} onChange={(e) => { setMunId(e.target.value); setPeriodIdx(0); }} className={inputCls}>
            {municipalities.map((m) => <option key={m.id} value={m.id}>{m.city_name} ({PERIODICITY_LABELS[m.periodicity]})</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Año</span>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())} className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Período</span>
          <select value={periodIdx} onChange={(e) => setPeriodIdx(Number(e.target.value))} className={inputCls}>
            {periods.map((p, i) => <option key={p.from} value={i}>{p.label}</option>)}
          </select>
        </label>
      </div>

      {loading && <p className="text-sm text-gray-500">Calculando…</p>}

      {report && !loading && (
        <>
          {report.draft_income_entries > 0 && (
            <Warning>Hay {report.draft_income_entries} asiento(s) en borrador con ingresos en el período: no se incluyen en la base hasta contabilizarlos.</Warning>
          )}
          {report.unassigned_accounts.length > 0 && (
            <Warning>Hay ingresos sin actividad asignada ({report.unassigned_accounts.map((a) => a.code).join(', ')}). Marque una actividad por defecto o agregue sus prefijos.</Warning>
          )}

          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Actividad</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Base gravable</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Tarifa</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">ICA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.activities.map((a) => (
                  <tr key={a.activity_id}>
                    <td className="px-4 py-2 text-gray-900">
                      {a.ciiu_code && <span className="font-mono text-xs text-gray-500 mr-2">{a.ciiu_code}</span>}
                      {a.description}
                      {a.accounts.length > 0 && <div className="text-xs text-gray-400">{a.accounts.map((x) => x.code).join(', ')}</div>}
                    </td>
                    <td className="px-4 py-2 text-right">{formatCurrency(a.base)}</td>
                    <td className="px-4 py-2 text-right">{a.rate}‰</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(a.ica)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.excluded_accounts.length > 0 && (
              <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                Ingresos no gravados excluidos: {report.excluded_accounts.map((a) => `${a.code} (${formatCurrency(a.amount)})`).join(', ')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-2">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Declaración de ICA</h2>
              {row('Base gravable', t.base)}
              {row('Impuesto de industria y comercio', t.ica)}
              {report.municipality.avisos_tableros && row(`Avisos y tableros (${report.municipality.avisos_pct}%)`, t.avisos)}
              {t.bomberil > 0 && row(`Sobretasa bomberil (${report.municipality.bomberil_pct}%)`, t.bomberil)}
              {row('Total impuesto', t.total_tax, true)}
              {row('(−) ReteICA que le practicaron', t.retentions)}
              {row('(−) Autorretenciones del período', t.autoica)}
              <div className="border-t border-gray-200 pt-2">
                {row(t.balance >= 0 ? 'Saldo a pagar' : 'Saldo a favor', Math.abs(t.balance), true)}
              </div>
              {t.rounding_adjustment !== 0 && (
                <p className="text-xs text-gray-400">Ajuste por aproximación al mil: {formatCurrency(t.rounding_adjustment)} (se lleva al gasto del ICA).</p>
              )}
              <p className="text-xs text-gray-400">Sedes: {report.branches}. Verifique descuentos propios del formulario municipal.</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-2">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Declaración de ReteICA</h2>
              {row('ReteICA practicada a proveedores', report.reteica_declaration.practiced)}
              {row('Autorretención de ICA', report.reteica_declaration.autoica)}
              {row('Total a declarar', report.reteica_declaration.total, true)}
              {report.municipality.autoica_enabled && (
                <p className="text-xs text-gray-500 pt-2">
                  Autorretención calculada para el período: {formatCurrency(report.autoica_expected)}
                  {report.autoica_pending > 0 && ` (pendiente por causar ${formatCurrency(report.autoica_pending)})`}
                </p>
              )}
            </div>
          </div>

          {isStaff && (
            <div className="flex flex-wrap justify-end gap-2">
              {report.municipality.autoica_enabled && report.autoica_pending > 0 && !hasIcaSettlement && (
                <button onClick={() => cause('autoica')} disabled={busy} className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  Causar autorretención
                </button>
              )}
              {!hasIcaSettlement && t.total_tax > 0 && (
                <button onClick={() => cause('ica')} disabled={busy} className="px-4 py-2 rounded-md bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  Causar ICA del período
                </button>
              )}
            </div>
          )}
        </>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100"><h2 className="text-sm font-semibold text-gray-700">Causaciones de {mun?.city_name}</h2></div>
        {settlements.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">Sin causaciones registradas.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {settlements.map((s) => (
              <li key={s.id} className="px-5 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium text-gray-900">{s.kind === 'autoica' ? 'Autorretención' : 'ICA'}</span>
                  <span className="text-gray-500 ml-2">{s.date_from} a {s.date_to}</span>
                  {s.status === 'anulado' && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Anulada</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">{formatCurrency(s.kind === 'autoica' ? s.tax_amount : s.balance_amount)}</span>
                  {isStaff && s.status === 'causado' && (
                    <button onClick={() => voidOne(s)} className="text-red-600 hover:text-red-800 text-xs">Anular</button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
      <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/* ───────────────────────── Configuración ───────────────────────── */

function Configuracion({ config, isStaff, onSaved }) {
  const [editing, setEditing] = useState(null); // municipio en edición (objeto) o null

  const saveBranch = async (branchId, municipalityId) => {
    try {
      await icaAPI.assignBranches([{ branch_id: branchId, municipality_id: municipalityId || null }]);
      toast.success('Sede actualizada');
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error asignando la sede');
    }
  };

  const remove = async (m) => {
    if (!window.confirm(`¿Eliminar ${m.city_name} y sus actividades?`)) return;
    try {
      await icaAPI.deleteMunicipality(m.id);
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error eliminando');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Municipios donde declara</h2>
          {isStaff && (
            <button onClick={() => setEditing({ ...EMPTY_MUN, activities: [] })} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
              <PlusIcon className="h-4 w-4" /> Agregar municipio
            </button>
          )}
        </div>
        {config.municipalities.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">Sin municipios configurados.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {config.municipalities.map((m) => (
              <li key={m.id} className="px-5 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-900">
                    {m.city_name} {m.city_code && <span className="text-gray-400 font-normal">({m.city_code})</span>}
                    {!m.is_active && <span className="ml-2 text-xs text-gray-400">inactivo</span>}
                  </span>
                  {isStaff && (
                    <span className="flex gap-3">
                      <button onClick={() => setEditing({ ...m, excluded_account_prefixes: (m.excluded_account_prefixes || []).join(', ') })} className="text-blue-600 hover:text-blue-800">Editar</button>
                      <button onClick={() => remove(m)} className="text-red-600 hover:text-red-800">Eliminar</button>
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {PERIODICITY_LABELS[m.periodicity]}
                  {m.avisos_tableros && ` · Avisos y tableros ${Number(m.avisos_pct)}%`}
                  {Number(m.bomberil_pct) > 0 && ` · Bomberil ${Number(m.bomberil_pct)}%`}
                  {m.autoica_enabled && ' · Autorretención'}
                  {' · '}{(m.activities || []).map((a) => `${a.ciiu_code || ''} ${a.description} ${Number(a.rate)}‰`).join(' / ') || 'sin actividades'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {config.municipalities.length > 1 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Sede → municipio</h2>
            <p className="text-xs text-gray-500">Los ingresos de cada sede se declaran en su municipio. Los asientos sin sede van al municipio de la sede principal.</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {config.branches.map((b) => (
              <li key={b.id} className="px-5 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
                <span>{b.name}{b.is_main && <span className="ml-2 text-xs text-gray-400">principal</span>}</span>
                <select
                  value={b.ica_municipality_id || ''}
                  disabled={!isStaff}
                  onChange={(e) => saveBranch(b.id, e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                >
                  <option value="">Sin asignar</option>
                  {config.municipalities.map((m) => <option key={m.id} value={m.id}>{m.city_name}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && <MunicipalityEditor initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onSaved(); }} />}
    </div>
  );
}

function MunicipalityEditor({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  // Departamento elegido antes de escoger la ciudad (la ciudad trae el suyo).
  const [deptCode, setDeptCode] = useState(initial.city_code ? String(initial.city_code).substring(0, 2) : '');
  const [activities, setActivities] = useState(
    (initial.activities || []).map((a) => ({ ...a, account_prefixes: (a.account_prefixes || []).join(', '), autoica_rate: a.autoica_rate ?? '' }))
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setAct = (i, k, v) => setActivities((list) => list.map((a, idx) => (idx === i ? { ...a, [k]: v } : (k === 'is_default' && v ? { ...a, is_default: false } : a))));

  const save = async () => {
    if (!form.city_code || !form.city_name.trim()) { toast.error('Seleccione el municipio'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.activities;
      const res = form.id ? await icaAPI.updateMunicipality(form.id, payload) : await icaAPI.createMunicipality(payload);
      await icaAPI.setActivities(res.data.id, activities);
      toast.success('Municipio guardado');
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl my-8 space-y-4">
        <h2 className="text-lg font-semibold">{form.id ? 'Editar municipio' : 'Nuevo municipio'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <span className="text-sm text-gray-700">Municipio (DIVIPOLA)</span>
            <DivipolaCitySelect
              departmentCode={deptCode}
              cityCode={form.city_code || ''}
              required
              onChange={({ departmentCode, cityCode, cityName }) => {
                setDeptCode(departmentCode || '');
                setForm((f) => ({ ...f, city_code: cityCode || '', city_name: cityName || '' }));
              }}
            />
            {form.city_code && <p className="text-xs text-gray-400 mt-1">Código DIVIPOLA {form.city_code}</p>}
          </div>
          <label className="block"><span className="text-sm text-gray-700">Periodicidad</span>
            <select value={form.periodicity} onChange={(e) => set('periodicity', e.target.value)} className={inputCls}>
              {Object.entries(PERIODICITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></label>
          <label className="block"><span className="text-sm text-gray-700">Sobretasa bomberil (% sobre ICA)</span>
            <input type="number" step="0.01" min="0" value={form.bomberil_pct} onChange={(e) => set('bomberil_pct', e.target.value)} className={inputCls} /></label>
          <label className="block"><span className="text-sm text-gray-700">Ingresos no gravados (prefijos)</span>
            <input value={form.excluded_account_prefixes} onChange={(e) => set('excluded_account_prefixes', e.target.value)} className={inputCls} placeholder="4210, 4245" /></label>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-gray-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.avisos_tableros} onChange={(e) => set('avisos_tableros', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            Avisos y tableros
            {form.avisos_tableros && (
              <input type="number" step="0.01" value={form.avisos_pct} onChange={(e) => set('avisos_pct', e.target.value)} className="w-16 border border-gray-300 rounded px-1 py-0.5 text-right" />
            )}
            {form.avisos_tableros && '%'}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.autoica_enabled} onChange={(e) => set('autoica_enabled', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            Autorretenedor de ICA en este municipio
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.round_thousands} onChange={(e) => set('round_thousands', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            Aproximar al múltiplo de mil
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            Activo
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Actividades (CIIU)</h3>
            <button onClick={() => setActivities((l) => [...l, { ciiu_code: '', description: '', rate: '', autoica_rate: '', account_prefixes: '', is_default: l.length === 0 }])}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"><PlusIcon className="h-4 w-4" /> Agregar</button>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Prefijos de cuentas de ingreso de cada actividad (p.ej. 4135 comercio, 4155 servicios). Las cuentas sin prefijo coincidente van a la actividad por defecto.
          </p>
          <div className="space-y-2">
            {activities.map((a, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end border border-gray-100 rounded-md p-2">
                <label className="sm:col-span-2 text-xs text-gray-600">CIIU<input value={a.ciiu_code || ''} onChange={(e) => setAct(i, 'ciiu_code', e.target.value)} className={inputCls} /></label>
                <label className="col-span-2 sm:col-span-4 text-xs text-gray-600">Descripción<input value={a.description} onChange={(e) => setAct(i, 'description', e.target.value)} className={inputCls} /></label>
                <label className="sm:col-span-1 text-xs text-gray-600">Tarifa ‰<input type="number" step="0.01" value={a.rate} onChange={(e) => setAct(i, 'rate', e.target.value)} className={inputCls} /></label>
                <label className="sm:col-span-1 text-xs text-gray-600" title="Vacío = misma tarifa del ICA">Autorret. ‰<input type="number" step="0.01" value={a.autoica_rate} onChange={(e) => setAct(i, 'autoica_rate', e.target.value)} className={inputCls} /></label>
                <label className="sm:col-span-2 text-xs text-gray-600">Prefijos<input value={a.account_prefixes} onChange={(e) => setAct(i, 'account_prefixes', e.target.value)} className={inputCls} placeholder="4155" /></label>
                <label className="sm:col-span-1 flex items-center gap-1 text-xs text-gray-600 pb-2">
                  <input type="radio" checked={!!a.is_default} onChange={() => setAct(i, 'is_default', true)} /> Defecto
                </label>
                <button onClick={() => setActivities((l) => l.filter((_, idx) => idx !== i))} className="sm:col-span-1 text-red-500 hover:text-red-700 pb-2 justify-self-end" aria-label="Quitar actividad">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 text-sm">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

export default IcaPage;
