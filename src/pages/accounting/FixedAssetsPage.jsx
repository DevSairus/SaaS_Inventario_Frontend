// frontend/src/pages/accounting/FixedAssetsPage.jsx
//
// Activos Fijos — Fase 1 del plan de Contabilidad Pitbox: listado, alta,
// reporte resumido por categoría y disparo manual de depreciación
// (además del job automático mensual del backend).
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fixedAssetsAPI, chartOfAccountsAPI, FIXED_ASSET_CATEGORY_LABELS } from '../../api/accounting';
import { branchesService } from '../../api/branches';
import Layout from '../../components/layout/Layout';
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
};

const FixedAssetsPage = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [report, setReport] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('activo');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [showDispose, setShowDispose] = useState(null); // asset | null
  const [disposeForm, setDisposeForm] = useState({ disposal_date: new Date().toISOString().slice(0, 10), disposal_reason: '' });
  const [disposing, setDisposing] = useState(false);

  const [runningDepreciation, setRunningDepreciation] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [assetsRes, reportRes, accountsRes, branchesRes] = await Promise.all([
        fixedAssetsAPI.getAll(statusFilter ? { status: statusFilter } : {}),
        fixedAssetsAPI.getReport(),
        chartOfAccountsAPI.getAll(),
        branchesService.getAll(),
      ]);
      setAssets(assetsRes.data || []);
      setReport(reportRes.data || null);
      setAccounts((accountsRes.data || []).filter((a) => a.account_type === 'activo' && a.accepts_entries));
      setBranches(branchesRes.data || branchesRes || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando los activos fijos');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

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
    if (!form.useful_life_months || parseInt(form.useful_life_months, 10) <= 0) return toast.error('La vida útil (meses) debe ser mayor a 0');
    if (!form.asset_account_id || !form.accumulated_depreciation_account_id) return toast.error('Selecciona la cuenta del activo y la de depreciación acumulada');

    try {
      setSaving(true);
      await fixedAssetsAPI.create({
        ...form,
        branch_id: form.branch_id || null,
        salvage_value: form.salvage_value || 0,
      });
      toast.success('Activo fijo creado');
      setShowModal(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creando el activo fijo');
    } finally {
      setSaving(false);
    }
  };

  const openDispose = (asset) => {
    setDisposeForm({ disposal_date: new Date().toISOString().slice(0, 10), disposal_reason: '' });
    setShowDispose(asset);
  };

  const handleDispose = async (e) => {
    e.preventDefault();
    try {
      setDisposing(true);
      await fixedAssetsAPI.dispose(showDispose.id, disposeForm);
      toast.success('Activo dado de baja');
      setShowDispose(null);
      load();
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
      load();
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
            <p className="text-sm text-gray-500 mt-1">Depreciación en línea recta, con prorrateo del primer mes</p>
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
                {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>}
                {!loading && assets.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin activos fijos registrados</td></tr>
                )}
                {!loading && assets.map((a) => (
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
        </div>
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">Vida útil (meses)</label>
                    <input type="number" min="1" name="useful_life_months" value={form.useful_life_months} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
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
                <p className="text-xs text-amber-600">
                  Esto solo detiene la depreciación futura. El asiento contable de retiro del activo, si se necesita, debe registrarse manualmente en Asientos Contables.
                </p>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={() => setShowDispose(null)} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={disposing} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {disposing ? 'Guardando...' : 'Dar de baja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default FixedAssetsPage;
