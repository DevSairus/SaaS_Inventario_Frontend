// frontend/src/pages/accounting/FixedAssetDetailPage.jsx
//
// Detalle de un Activo Fijo: datos generales, histórico de depreciación
// (FixedAssetDepreciationEntry) y valor en libros actual.
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fixedAssetsAPI, FIXED_ASSET_CATEGORY_LABELS, DEPRECIATION_METHOD_LABELS } from '../../api/accounting';
import Layout from '../../components/layout/Layout';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowLeftIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import NumericInput from '../../components/inputs/NumericInput';

const STATUS_LABELS = {
  activo: { label: 'Activo', className: 'bg-green-100 text-green-800' },
  totalmente_depreciado: { label: 'Totalmente depreciado', className: 'bg-blue-100 text-blue-800' },
  dado_de_baja: { label: 'Dado de baja', className: 'bg-gray-200 text-gray-700' },
};

const FixedAssetDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [estimate, setEstimate] = useState(null); // { remaining_months, salvage_value, reason } | null
  const [savingEstimate, setSavingEstimate] = useState(false);
  const [impairForm, setImpairForm] = useState(null); // { impairment_date, amount, reason } | null
  const [usageForm, setUsageForm] = useState(null); // { period, units, notes } | null
  const [savingAux, setSavingAux] = useState(false);

  const saveAux = async (e, kind) => {
    e.preventDefault();
    try {
      setSavingAux(true);
      const res = kind === 'impair' ? await fixedAssetsAPI.impair(id, impairForm) : await fixedAssetsAPI.recordUsage(id, usageForm);
      toast.success(res.message || 'Guardado', { duration: 6000 });
      setImpairForm(null); setUsageForm(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSavingAux(false);
    }
  };

  const saveEstimate = async (e) => {
    e.preventDefault();
    try {
      setSavingEstimate(true);
      const res = await fixedAssetsAPI.changeEstimate(id, estimate);
      toast.success(res.message || 'Estimación actualizada', { duration: 6000 });
      setEstimate(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo cambiar la estimación');
    } finally {
      setSavingEstimate(false);
    }
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fixedAssetsAPI.getById(id);
      setAsset(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando el activo fijo');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-400">Cargando...</div>
      </Layout>
    );
  }

  if (!asset) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-400">Activo fijo no encontrado</div>
      </Layout>
    );
  }

  const depreciableBase = Number(asset.acquisition_cost) - Number(asset.salvage_value || 0);
  const progressPct = depreciableBase > 0 ? Math.min(100, ((Number(asset.accumulated_depreciation) + Number(asset.impaired || 0)) / depreciableBase) * 100) : 0;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/accounting/fixed-assets')} className="text-gray-400 hover:text-gray-700">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{asset.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{FIXED_ASSET_CATEGORY_LABELS[asset.category] || asset.category}</p>
          </div>
          {asset.status !== 'dado_de_baja' && (
            <div className="ml-auto flex flex-wrap gap-2">
              {asset.depreciation_method === 'unidades_produccion' && (
                <button onClick={() => setUsageForm({ period: new Date().toISOString().slice(0, 7), units: '', notes: '' })} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  Registrar uso del mes
                </button>
              )}
              <button onClick={() => setImpairForm({ impairment_date: new Date().toISOString().slice(0, 10), amount: '', reason: '', reverse: false })} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Registrar deterioro
              </button>
              {Number(asset.impaired) > 0 && (
                <button onClick={() => setImpairForm({ impairment_date: new Date().toISOString().slice(0, 10), amount: '', reason: '', reverse: true })} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  Revertir deterioro
                </button>
              )}
              {['linea_recta', 'saldos_decrecientes'].includes(asset.depreciation_method || 'linea_recta') && asset.category !== 'terrenos' && (
                <button
                  onClick={() => setEstimate({ remaining_months: '', salvage_value: String(asset.salvage_value ?? 0), reason: '' })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <AdjustmentsHorizontalIcon className="w-4 h-4" /> Cambiar vida útil
                </button>
              )}
            </div>
          )}
          <span className={`${asset.status === 'dado_de_baja' ? 'ml-auto ' : ''}text-xs font-medium px-2 py-1 rounded-full ${STATUS_LABELS[asset.status]?.className || 'bg-gray-100 text-gray-700'}`}>
            {STATUS_LABELS[asset.status]?.label || asset.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Costo de compra</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(asset.acquisition_cost)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Dep. acumulada</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(asset.accumulated_depreciation)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Valor en libros</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(asset.book_value)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Vida útil</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{asset.useful_life_months} meses</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progreso de depreciación</span>
            <span>{progressPct.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-500">Fecha de compra:</span> <span className="text-gray-900">{formatDate(asset.acquisition_date)}</span></div>
          <div><span className="text-gray-500">Valor residual:</span> <span className="text-gray-900">{formatCurrency(asset.salvage_value)}</span></div>
          <div><span className="text-gray-500">Método:</span> <span className="text-gray-900">{DEPRECIATION_METHOD_LABELS[asset.category === 'terrenos' ? 'no_deprecia' : (asset.depreciation_method || 'linea_recta')]}</span></div>
          {asset.depreciation_method === 'unidades_produccion' && (
            <div><span className="text-gray-500">Unidades totales:</span> <span className="text-gray-900">{Number(asset.total_units).toLocaleString('es-CO')} {asset.unit_label}</span></div>
          )}
          {(asset.fiscal_cost || asset.fiscal_salvage_value) && (
            <div><span className="text-gray-500">Base fiscal:</span> <span className="text-gray-900">{formatCurrency(asset.fiscal_cost ?? asset.acquisition_cost)} (residual fiscal {formatCurrency(asset.fiscal_salvage_value ?? asset.salvage_value)})</span></div>
          )}
          {Number(asset.impaired) > 0 && (
            <div><span className="text-gray-500">Deterioro acumulado:</span> <span className="text-gray-900">{formatCurrency(asset.impaired)}</span></div>
          )}
          <div><span className="text-gray-500">Cuenta del activo:</span> <span className="text-gray-900">{asset.asset_account ? `${asset.asset_account.code} — ${asset.asset_account.name}` : '—'}</span></div>
          <div><span className="text-gray-500">Cuenta dep. acumulada:</span> <span className="text-gray-900">{asset.accumulated_depreciation_account ? `${asset.accumulated_depreciation_account.code} — ${asset.accumulated_depreciation_account.name}` : '—'}</span></div>
          {asset.opening_period && (
            <div className="col-span-2 md:col-span-3"><span className="text-gray-500">Saldo inicial:</span> <span className="text-gray-900">{formatCurrency(asset.opening_accumulated_depreciation)} depreciados hasta {asset.opening_period} (fuera de Pitbox)</span></div>
          )}
          {asset.basis_period && Number(asset.basis_months) > 0 && (
            <div className="col-span-2 md:col-span-3"><span className="text-gray-500">Cuota desde {asset.basis_period}:</span> <span className="text-gray-900">{formatCurrency(Number(asset.basis_amount) / Number(asset.basis_months))} al mes durante {asset.basis_months} meses</span></div>
          )}
          {asset.status === 'dado_de_baja' && (
            <>
              <div><span className="text-gray-500">Fecha de baja:</span> <span className="text-gray-900">{formatDate(asset.disposal_date)} · {asset.disposal_type === 'venta' ? 'Venta' : 'Retiro'}</span></div>
              {asset.disposal_type === 'venta' && (
                <div><span className="text-gray-500">Valor de venta:</span> <span className="text-gray-900">{formatCurrency(asset.sale_amount)}{asset.sale_account ? ` → ${asset.sale_account.code}` : ''}</span></div>
              )}
              <div>
                <span className="text-gray-500">Resultado:</span>{' '}
                {(() => {
                  const r = Number(asset.sale_amount || 0) - Number(asset.book_value || 0);
                  return <span className={r >= 0 ? 'text-green-700' : 'text-red-700'}>{r >= 0 ? 'Utilidad' : 'Pérdida'} de {formatCurrency(Math.abs(r))}</span>;
                })()}
                {asset.disposal_entry && <> · <Link to="/accounting/journal-entries" className="text-indigo-600 hover:underline">{asset.disposal_entry.entry_number}</Link></>}
              </div>
              {asset.disposal_reason && <div className="col-span-2 md:col-span-3"><span className="text-gray-500">Motivo:</span> <span className="text-gray-900">{asset.disposal_reason}</span></div>}
            </>
          )}
        </div>

        {((asset.impairments || []).length > 0 || (asset.usage || []).length > 0) && (
          <div className="grid md:grid-cols-2 gap-4">
            {(asset.impairments || []).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 text-sm mb-2">Deterioro</h2>
                <ul className="text-sm text-gray-700 space-y-1">
                  {asset.impairments.map((i) => (
                    <li key={i.id}>{formatDate(i.impairment_date)} · {Number(i.amount) < 0 ? `Reversión ${formatCurrency(-Number(i.amount))}` : formatCurrency(i.amount)}{i.reason ? ` · ${i.reason}` : ''}{i.journal_entry ? <> · <Link to="/accounting/journal-entries" className="text-indigo-600 hover:underline">{i.journal_entry.entry_number}</Link></> : ''}</li>
                  ))}
                </ul>
              </div>
            )}
            {(asset.usage || []).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 text-sm mb-2">Uso registrado ({asset.unit_label})</h2>
                <ul className="text-sm text-gray-700 space-y-1">
                  {asset.usage.map((u) => <li key={u.id}>{u.period} · {Number(u.units).toLocaleString('es-CO')} {asset.unit_label}{u.notes ? ` · ${u.notes}` : ''}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {(asset.estimate_changes || []).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 text-sm mb-2">Cambios de vida útil o valor residual</h2>
            <ul className="text-sm text-gray-700 space-y-1">
              {asset.estimate_changes.map((c) => (
                <li key={c.at}>
                  {formatDate(c.at)} · desde {c.effective_period}: vida útil {c.before.useful_life_months} → {c.after.useful_life_months} meses
                  {Number(c.before.salvage_value) !== Number(c.after.salvage_value) && <>, valor residual {formatCurrency(c.before.salvage_value)} → {formatCurrency(c.after.salvage_value)}</>}
                  {' '}· nueva cuota {formatCurrency(c.after.monthly)}{c.reason ? ` · ${c.reason}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 text-sm">Histórico de depreciación</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Período', 'Monto', 'Saldo acumulado', 'Asiento'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(asset.depreciation_entries || []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Todavía no se ha generado depreciación para este activo</td></tr>
                )}
                {(asset.depreciation_entries || []).map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{entry.period}</td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{formatCurrency(entry.amount)}</td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{formatCurrency(entry.accumulated_after)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {entry.journal_entry ? (
                        <Link to="/accounting/journal-entries" className="text-indigo-600 hover:underline">{entry.journal_entry.entry_number}</Link>
                      ) : (
                        <span className="text-amber-600 text-xs">Sin asiento — falta mapear la cuenta de gasto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(impairForm || usageForm) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <form onSubmit={(e) => saveAux(e, impairForm ? 'impair' : 'usage')}>
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{impairForm ? (impairForm.reverse ? 'Revertir deterioro' : 'Registrar deterioro') : 'Registrar uso del mes'}</h3>
              </div>
              <div className="px-5 py-4 space-y-3 text-sm">
                {impairForm ? (
                  <>
                    {impairForm.reverse ? (
                      <p className="text-xs text-gray-600">
                        Cuando el valor recuperable vuelve a subir. Deterioro neto actual: {formatCurrency(asset.impaired)}. Se registra como ingreso por recuperación y la
                        depreciación siguiente se calcula sobre el nuevo valor. No puede dejar el activo por encima del valor que tendría sin el deterioro.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600">
                        Cuando el activo vale menos que su valor en libros ({formatCurrency(asset.book_value)}): por daño, obsolescencia o caída del precio.
                        Se registra el gasto y la depreciación siguiente se calcula sobre el nuevo valor. No es deducible fiscalmente hasta que el activo salga.
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                        <input type="date" value={impairForm.impairment_date} onChange={(e) => setImpairForm((f) => ({ ...f, impairment_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{impairForm.reverse ? 'Valor a revertir' : 'Valor del deterioro'}</label>
                        <NumericInput value={impairForm.amount} onChange={(e) => setImpairForm((f) => ({ ...f, amount: e.target.value }))} decimals={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                      </div>
                    </div>
                    {Number(impairForm.amount) > 0 && <p className="text-xs text-gray-700">Nuevo valor en libros: <strong>{formatCurrency(Number(asset.book_value) + (impairForm.reverse ? 1 : -1) * Number(impairForm.amount))}</strong></p>}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label>
                      <input value={impairForm.reason} onChange={(e) => setImpairForm((f) => ({ ...f, reason: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Ej. avalúo, daño, obsolescencia" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Mes</label>
                        <input type="month" value={usageForm.period} onChange={(e) => setUsageForm((f) => ({ ...f, period: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Uso ({asset.unit_label})</label>
                        <NumericInput value={usageForm.units} onChange={(e) => setUsageForm((f) => ({ ...f, units: e.target.value }))} decimals={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                      </div>
                    </div>
                    {Number(usageForm.units) > 0 && Number(asset.total_units) > 0 && (
                      <p className="text-xs text-gray-700">Depreciación aproximada del mes: <strong>{formatCurrency((Number(asset.acquisition_cost) - Number(asset.salvage_value || 0)) * Number(usageForm.units) / Number(asset.total_units))}</strong></p>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                      <input value={usageForm.notes} onChange={(e) => setUsageForm((f) => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Ej. lectura del horómetro" />
                    </div>
                  </>
                )}
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={() => { setImpairForm(null); setUsageForm(null); }} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={savingAux} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {savingAux ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {estimate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <form onSubmit={saveEstimate}>
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Cambiar vida útil o valor residual</h3>
              </div>
              <div className="px-5 py-4 space-y-3 text-sm">
                <p className="text-xs text-gray-600">
                  Se aplica hacia adelante: lo ya depreciado ({formatCurrency(asset.accumulated_depreciation)}) no cambia y el saldo por depreciar
                  se reparte en los meses que le quedan, desde el próximo mes sin depreciar.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Meses que le quedan de uso</label>
                    <input type="number" min="0" value={estimate.remaining_months} onChange={(e) => setEstimate((f) => ({ ...f, remaining_months: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Valor residual</label>
                    <NumericInput value={estimate.salvage_value} onChange={(e) => setEstimate((f) => ({ ...f, salvage_value: e.target.value }))} decimals={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
                {Number(estimate.remaining_months) > 0 && (
                  <p className="text-xs text-gray-700">
                    Nueva cuota aproximada: <strong>{formatCurrency(Math.max(0, Number(asset.acquisition_cost) - Number(estimate.salvage_value || 0) - Number(asset.accumulated_depreciation || 0)) / Number(estimate.remaining_months))}</strong> al mes.
                  </p>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Motivo (opcional)</label>
                  <input value={estimate.reason} onChange={(e) => setEstimate((f) => ({ ...f, reason: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Ej. revisión técnica: durará 2 años más" />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={() => setEstimate(null)} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={savingEstimate} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {savingEstimate ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default FixedAssetDetailPage;
