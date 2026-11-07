// frontend/src/pages/accounting/FixedAssetsPage.jsx
//
// Activos Fijos — Fase 1 del plan de Contabilidad Pitbox: listado, alta,
// reporte resumido por categoría y disparo manual de depreciación
// (además del job automático mensual del backend).
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fixedAssetsAPI, chartOfAccountsAPI, FIXED_ASSET_CATEGORY_LABELS, DEPRECIATION_METHOD_LABELS } from '../../api/accounting';
import ProjectSelect from '../../components/projects/ProjectSelect';
import { branchesService } from '../../api/branches';
import Layout from '../../components/layout/Layout';
import Pagination from '../../components/common/Pagination';
import usePaginatedList from '../../hooks/usePaginatedList';
import NumericInput from '../../components/inputs/NumericInput';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PlusIcon, ArrowPathIcon, ArchiveBoxXMarkIcon } from '@heroicons/react/24/outline';

const STATUS_LABELS = {
  activo: { label: 'Activo', className: 'bg-green-100 text-green-800' },
  totalmente_depreciado: { label: 'Totalmente depreciado', className: 'bg-blue-100 text-blue-800' },
  dado_de_baja: { label: 'Dado de baja', className: 'bg-gray-200 text-gray-700' },
};

const emptyForm = {
  name: '', category: 'otro', branch_id: '', acquisition_cost: '', acquisition_date: '',
  useful_life_months: '', salvage_value: '0', asset_account_id: '', accumulated_depreciation_account_id: '',
  has_opening: false, opening_accumulated_depreciation: '', opening_period: '', remaining_months: '',
  depreciation_method: 'linea_recta', project_id: null, total_units: '', unit_label: 'horas', fiscal_max_rate: '', fiscal_opening_accumulated: '',
  fiscal_cost: '', fiscal_salvage_value: '',
};

// Meses entre 'YYYY-MM' (o fecha) a y b, ambos inclusive.
const monthsInclusive = (a, b) => {
  if (!a || !b) return 0;
  const [ya, ma] = a.slice(0, 7).split('-').map(Number);
  const [yb, mb] = b.slice(0, 7).split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma) + 1;
};
const emptyDispose = () => ({ disposal_date: new Date().toISOString().slice(0, 10), disposal_reason: '', disposal_type: 'retiro', sale_amount: '', sale_account_id: '' });

const FixedAssetsPage = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('activo');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [showDispose, setShowDispose] = useState(null); // asset | null
  const [disposeForm, setDisposeForm] = useState(emptyDispose);
  const [disposing, setDisposing] = useState(false);

  const [runningDepreciation, setRunningDepreciation] = useState(false);
  const [faConfig, setFaConfig] = useState(null); // { uvt, low_value_limit, fiscal_max_rates }
  useEffect(() => { fixedAssetsAPI.getConfig().then((r) => setFaConfig(r.data)).catch(() => {}); }, []);
  const method = form.category === 'terrenos' ? 'no_deprecia' : form.depreciation_method;
  const needsLife = !['no_deprecia', 'menor_cuantia', 'unidades_produccion'].includes(method);

  const list = usePaginatedList(
    (params, opts) => fixedAssetsAPI.getAll(params, opts),
    { filters: { status: statusFilter }, onError: (error) => toast.error(error.response?.data?.message || 'Error cargando los activos fijos') },
  );
  const assets = list.rows;
  const tableLoading = list.loading && assets.length === 0;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [reportRes, accountsRes, branchesRes] = await Promise.all([
        fixedAssetsAPI.getReport(),
        chartOfAccountsAPI.getAll(),
        branchesService.getAll(),
      ]);
      setReport(reportRes.data || null);
      setAccounts((accountsRes.data || []).filter((a) => a.account_type === 'activo' && a.accepts_entries));
      setBranches(branchesRes.data || branchesRes || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando los activos fijos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Tras crear/dar de baja/pagar: reporte + listado.
  const refreshAll = () => { load(); list.reload(); };

  const openCreate = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('El nombre es obligatorio');
    if (!form.acquisition_cost || parseFloat(form.acquisition_cost) <= 0) return toast.error('El costo de adquisición debe ser mayor a 0');
    if (!form.acquisition_date) return toast.error('La fecha de adquisición es obligatoria');
    if (needsLife && (!form.useful_life_months || parseInt(form.useful_life_months, 10) <= 0)) return toast.error('La vida útil (meses) debe ser mayor a 0');
    if (!form.asset_account_id || !form.accumulated_depreciation_account_id) return toast.error('Selecciona la cuenta del activo y la de depreciación acumulada');

    try {
      setSaving(true);
      const { has_opening: hasOpening, ...rest } = form;
      const payload = { ...rest, depreciation_method: method, branch_id: form.branch_id || null, salvage_value: form.salvage_value || 0 };
      if (!hasOpening) {
        delete payload.opening_accumulated_depreciation; delete payload.opening_period; delete payload.remaining_months;
      }
      await fixedAssetsAPI.create(payload);
      toast.success('Activo fijo creado');
      setShowModal(false);
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creando el activo fijo');
    } finally {
      setSaving(false);
    }
  };

  const openDispose = (asset) => {
    setDisposeForm(emptyDispose());
    setShowDispose(asset);
  };

  const handleDispose = async (e) => {
    e.preventDefault();
    try {
      setDisposing(true);
      const res = await fixedAssetsAPI.dispose(showDispose.id, disposeForm);
      toast.success(res.message || 'Activo dado de baja', { duration: 6000 });
      setShowDispose(null);
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error dando de baja el activo');
    } finally {
      setDisposing(false);
    }
  };

  const handleRunDepreciation = async () => {
    try {
      setRunningDepreciation(true);
      const res = await fixedAssetsAPI.runDepreciation();
      toast.success(res.message || 'Depreciación generada');
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error generando la depreciación');
    } finally {
      setRunningDepreciation(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Activos Fijos</h1>
            <p className="text-sm text-gray-500 mt-1">Depreciación por línea recta, saldos decrecientes, unidades de producción o menor cuantía; deterioro, venta o retiro y conciliación fiscal</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRunDepreciation}
              disabled={runningDepreciation}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              title="Genera la depreciación pendiente hasta el último mes cerrado, sin esperar al job automático del día 1"
            >
              <ArrowPathIcon className={`w-4 h-4 ${runningDepreciation ? 'animate-spin' : ''}`} /> Generar depreciación pendiente
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <PlusIcon className="w-4 h-4" /> Nuevo Activo
            </button>
          </div>
        </div>

        {report && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Costo histórico</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(report.totals.acquisition_cost)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Depreciación acumulada</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(report.totals.accumulated_depreciation)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Valor en libros</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(report.totals.book_value)}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <label className="text-sm text-gray-600">Estado:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Todos</option>
            <option value="activo">Activo</option>
            <option value="totalmente_depreciado">Totalmente depreciado</option>
            <option value="dado_de_baja">Dado de baja</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Nombre', 'Categoría', 'Fecha compra', 'Costo', 'Dep. acumulada', 'Valor en libros', 'Estado', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>}
                {!list.loading && assets.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin activos fijos registrados</td></tr>
                )}
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/accounting/fixed-assets/${a.id}`)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-gray-600">{FIXED_ASSET_CATEGORY_LABELS[a.category] || a.category}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(a.acquisition_date)}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatCurrency(a.acquisition_cost)}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatCurrency(a.accumulated_depreciation)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{formatCurrency(a.book_value)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_LABELS[a.status]?.className || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[a.status]?.label || a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {a.status !== 'dado_de_baja' && (
                        <button onClick={() => openDispose(a)} className="text-gray-400 hover:text-red-600" title="Dar de baja">
                          <ArchiveBoxXMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-200">
            <Pagination {...list.paginationProps} />
          </div>
        </div>

        <FiscalReconciliation />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSave}>
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Nuevo Activo Fijo</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                  <input name="name" value={form.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                    <select name="category" value={form.category} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      {Object.entries(FIXED_ASSET_CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sede (opcional)</label>
                    <select name="branch_id" value={form.branch_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="">Sin sede específica</option>
                      {branches.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Método de depreciación</label>
                  <select name="depreciation_method" value={method} onChange={handleChange} disabled={form.category === 'terrenos'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50">
                    {Object.entries(DEPRECIATION_METHOD_LABELS).filter(([v]) => form.category === 'terrenos' || v !== 'no_deprecia').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  {method === 'menor_cuantia' && faConfig && (
                    <p className="text-xs text-gray-500 mt-1">Hasta 50 UVT ({formatCurrency(faConfig.low_value_limit)}): se deprecia completo en el mes de compra y se deduce en el mismo año.</p>
                  )}
                  {method === 'saldos_decrecientes' && <p className="text-xs text-gray-500 mt-1">Deprecia más al principio (valor en libros × 2 / vida útil) y pasa a línea recta al final para cerrar en el valor residual.</p>}
                  {form.category !== 'terrenos' && method === 'linea_recta' && faConfig && Number(form.acquisition_cost) > 0 && Number(form.acquisition_cost) <= faConfig.low_value_limit && (
                    <p className="text-xs text-indigo-700 mt-1">Este activo vale menos de 50 UVT: puedes usar "Menor cuantía".</p>
                  )}
                </div>
                {method === 'unidades_produccion' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Unidades totales que producirá</label>
                      <NumericInput name="total_units" value={form.total_units} onChange={handleChange} decimals={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Medida</label>
                      <select name="unit_label" value={form.unit_label} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        {['horas', 'km', 'unidades'].map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <p className="col-span-2 text-xs text-gray-500">Cada mes registras el uso en el detalle del activo; la depreciación del mes es proporcional a ese uso.</p>
                  </div>
                )}
                <ProjectSelect value={form.project_id} onChange={(id) => setForm((f) => ({ ...f, project_id: id }))} label="Proyecto (opcional)" hint="La depreciación se carga al proyecto." />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Costo de adquisición</label>
                    <NumericInput name="acquisition_cost" value={form.acquisition_cost} onChange={handleChange} decimals={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de compra</label>
                    <input type="date" name="acquisition_date" value={form.acquisition_date} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Vida útil (meses){needsLife ? '' : ' — no aplica'}</label>
                    <input type="number" min="1" name="useful_life_months" value={form.useful_life_months} onChange={handleChange} disabled={!needsLife} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" required={needsLife} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Valor residual</label>
                    <NumericInput name="salvage_value" value={form.salvage_value} onChange={handleChange} decimals={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta del activo (débito, ej. 1592/subcuenta bruta)</label>
                  <select name="asset_account_id" value={form.asset_account_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                    <option value="">Selecciona una cuenta...</option>
                    {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.code} — {acc.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta de depreciación acumulada (crédito)</label>
                  <select name="accumulated_depreciation_account_id" value={form.accumulated_depreciation_account_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                    <option value="">Selecciona una cuenta...</option>
                    {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.code} — {acc.name}</option>))}
                  </select>
                </div>
                <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="mt-0.5" checked={form.has_opening} onChange={(e) => setForm((f) => ({ ...f, has_opening: e.target.checked }))} />
                    <span>
                      Ya venía depreciándose (de otro sistema)
                      <span className="block text-xs text-gray-500">Registra lo depreciado hasta un mes de corte: Pitbox sigue desde el mes siguiente sin regenerar meses ya cerrados.</span>
                    </span>
                  </label>
                  {form.has_opening && (() => {
                    const elapsed = monthsInclusive(form.acquisition_date, form.opening_period);
                    const defaultRemaining = Math.max(0, (parseInt(form.useful_life_months, 10) || 0) - elapsed);
                    return (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Mes de corte</label>
                          <input type="month" name="opening_period" value={form.opening_period} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required={form.has_opening} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Depreciación acumulada</label>
                          <NumericInput name="opening_accumulated_depreciation" value={form.opening_accumulated_depreciation} onChange={handleChange} decimals={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Meses que le quedan</label>
                          <input type="number" min="0" name="remaining_months" value={form.remaining_months} onChange={handleChange} placeholder={String(defaultRemaining)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        {form.opening_period && form.acquisition_date && (
                          <p className="col-span-3 text-xs text-gray-500">
                            {elapsed} meses usados hasta el corte. Si dejas vacío "Meses que le quedan", se usa la vida útil menos esos meses ({defaultRemaining}).
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {form.category !== 'terrenos' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tasa fiscal máxima (% anual)</label>
                      <input type="number" step="0.01" min="0" max="100" name="fiscal_max_rate" value={form.fiscal_max_rate} onChange={handleChange}
                        placeholder={faConfig ? String(faConfig.fiscal_max_rates[form.category] ?? 10) : ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <p className="text-[11px] text-gray-400 mt-0.5">Art. 137 E.T.; vacío = la de la categoría.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Costo fiscal (si es distinto)</label>
                      <NumericInput name="fiscal_cost" value={form.fiscal_cost} onChange={handleChange} decimals={2} placeholder="Igual al contable" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valor residual fiscal</label>
                      <NumericInput name="fiscal_salvage_value" value={form.fiscal_salvage_value} onChange={handleChange} decimals={2} placeholder="Igual al contable" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    {form.has_opening && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Depreciación fiscal acumulada</label>
                        <NumericInput name="fiscal_opening_accumulated" value={form.fiscal_opening_accumulated} onChange={handleChange} decimals={2} placeholder="Igual a la contable" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  El gasto de depreciación se toma del mapeo "Activos Fijos — Depreciación" (por categoría) en Contabilidad → Mapeo de Cuentas.
                </p>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDispose && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <form onSubmit={handleDispose}>
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Dar de baja: {showDispose.name}</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de baja</label>
                  <input
                    type="date"
                    value={disposeForm.disposal_date}
                    onChange={(e) => setDisposeForm((f) => ({ ...f, disposal_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Motivo (opcional)</label>
                  <textarea
                    value={disposeForm.disposal_reason}
                    onChange={(e) => setDisposeForm((f) => ({ ...f, disposal_reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[['retiro', 'Retiro (sin venta)'], ['venta', 'Venta']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setDisposeForm((f) => ({ ...f, disposal_type: v }))}
                      className={`px-3 py-2 rounded-lg border text-sm ${disposeForm.disposal_type === v ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-700'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {disposeForm.disposal_type === 'venta' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valor de la venta (sin IVA)</label>
                      <NumericInput value={disposeForm.sale_amount} onChange={(e) => setDisposeForm((f) => ({ ...f, sale_amount: e.target.value }))} decimals={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">¿A dónde entra el dinero?</label>
                      <select value={disposeForm.sale_account_id} onChange={(e) => setDisposeForm((f) => ({ ...f, sale_account_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                        <option value="">Caja, bancos o cuenta por cobrar...</option>
                        {accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.code} — {acc.name}</option>))}
                      </select>
                    </div>
                  </>
                )}
                {(() => {
                  const book = Number(showDispose.book_value || 0);
                  const sale = disposeForm.disposal_type === 'venta' ? Number(disposeForm.sale_amount || 0) : 0;
                  const diff = sale - book;
                  return (
                    <p className="text-xs text-gray-600">
                      Valor en libros hoy: {formatCurrency(book)} (se deprecia hasta el día de la baja, así que puede bajar un poco).{' '}
                      {disposeForm.disposal_type === 'venta' && sale > 0
                        ? <>Resultado aproximado: <strong className={diff >= 0 ? 'text-green-700' : 'text-red-700'}>{diff >= 0 ? 'utilidad' : 'pérdida'} de {formatCurrency(Math.abs(diff))}</strong>.</>
                        : <>Al retirarlo, ese valor queda como pérdida.</>}
                      {' '}Se genera el asiento: sale el activo con su depreciación acumulada{disposeForm.disposal_type === 'venta' ? ', entra el dinero de la venta' : ''} y la diferencia queda como utilidad o pérdida.
                      {disposeForm.disposal_type === 'venta' && ' El IVA de la venta, si aplica, va en la factura.'}
                    </p>
                  );
                })()}
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={() => setShowDispose(null)} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={disposing} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {disposing ? 'Guardando...' : (disposeForm.disposal_type === 'venta' ? 'Registrar venta' : 'Dar de baja')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

/**
 * Conciliación contable-fiscal de la depreciación (formato 2516): por activo,
 * lo depreciado en libros y lo deducible en el año (tasas máximas del art. 137
 * E.T.), y la diferencia temporaria para el impuesto diferido.
 */
function FiscalReconciliation() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      setData((await fixedAssetsAPI.getFiscalReport(year)).data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error generando la conciliación fiscal');
    } finally {
      setLoading(false);
    }
  };
  const downloadCsv = () => {
    const head = ['Activo', 'Categoría', 'Costo', 'Tasa fiscal %', 'Dep. contable año', 'Dep. fiscal año', 'Diferencia año', 'Deterioro', 'Valor libros contable', 'Valor fiscal', 'Diferencia temporaria'];
    const lines = data.rows.map((r) => [r.name, FIXED_ASSET_CATEGORY_LABELS[r.category] || r.category, r.cost, r.fiscal_rate, r.accounting_year, r.fiscal_year, r.difference_year, r.impaired, r.book_accounting, r.book_fiscal, r.temporary_difference]);
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `conciliacion-fiscal-activos-${year}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="font-semibold text-gray-900 text-sm">Conciliación fiscal de la depreciación</h2>
          <p className="text-xs text-gray-500">Contable vs. deducible (tasas máximas del art. 137 E.T.) — insumo del formato 2516 y del impuesto diferido.</p>
        </div>
        <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
        <button onClick={load} disabled={loading} className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Calculando...' : 'Ver año'}</button>
        {data?.rows?.length > 0 && <button onClick={downloadCsv} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Descargar CSV</button>}
      </div>
      {data && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['Activo', 'Tasa fiscal', 'Dep. contable', 'Dep. fiscal', 'Diferencia', 'Valor contable', 'Valor fiscal', 'Dif. temporaria'].map((h) => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.rows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">Sin activos en {year}</td></tr>}
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2"><p className="font-medium text-gray-900">{r.name}</p><p className="text-xs text-gray-500">{FIXED_ASSET_CATEGORY_LABELS[r.category] || r.category}{r.disposed ? ` · salió el ${r.disposal_date}: resultado contable ${formatCurrency(r.accounting_result)}, fiscal ${formatCurrency(r.fiscal_result)}` : ''}</p></td>
                  <td className="px-3 py-2 whitespace-nowrap">{Number(r.fiscal_rate).toLocaleString('es-CO')} %</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">{formatCurrency(r.accounting_year)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">{formatCurrency(r.fiscal_year)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-right ${r.difference_year ? 'text-amber-700' : 'text-gray-500'}`}>{formatCurrency(r.difference_year)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">{formatCurrency(r.book_accounting)}{r.impaired > 0 && <span className="block text-[11px] text-gray-500">deterioro {formatCurrency(r.impaired)}</span>}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">{formatCurrency(r.book_fiscal)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right font-medium">{formatCurrency(r.temporary_difference)}</td>
                </tr>
              ))}
            </tbody>
            {data.rows.length > 0 && (
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td className="px-3 py-2" colSpan={2}>Total {year}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(data.totals.accounting_year)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(data.totals.fiscal_year)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(data.totals.difference_year)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(data.totals.book_accounting)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(data.totals.book_fiscal)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(data.totals.temporary_difference)}</td>
                </tr>
              </tfoot>
            )}
          </table>
          <p className="px-3 py-2 text-xs text-gray-500">
            Diferencia temporaria = valor fiscal − valor contable. Positiva: deducciones pendientes (activo por impuesto diferido); negativa: pasivo. El deterioro contable no es deducible hasta que el activo se vende o se retira.
          </p>
        </div>
      )}
    </div>
  );
}

export default FixedAssetsPage;
