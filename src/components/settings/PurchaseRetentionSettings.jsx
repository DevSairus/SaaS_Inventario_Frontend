// frontend/src/components/settings/PurchaseRetentionSettings.jsx
//
// Retenciones que tu empresa PRACTICA en compras y gastos:
//  - Perfil tributario (régimen, gran contribuyente, agente de ReteIVA, UVT)
//  - Catálogo de conceptos de retención en la fuente (tarifa según quién
//    recibe el pago y base mínima en UVT), asignables a productos,
//    categorías y proveedores
//  - Concepto sugerido por categoría de gasto
// Se guarda dentro de tenant.tax_config (fiscal_profile, retention_concepts,
// expense_category_concepts). El cálculo lo hace el backend
// (retentionEngine.service.js).
import { useEffect, useState } from 'react';
import { chartOfAccountsAPI } from '../../api/accounting';
import { EXPENSE_CATEGORIES } from '../../api/expenses';
import useRetentionCatalog from '../../hooks/useRetentionCatalog';

const money = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const Toggle = ({ checked, onChange, color = 'bg-blue-600' }) => (
  <button type="button" onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${checked ? color : 'bg-gray-300'}`}>
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

export default function PurchaseRetentionSettings({ config, onChange }) {
  const { catalog } = useRetentionCatalog();
  const [accounts, setAccounts] = useState([]);
  // Los conceptos poco comunes se pliegan para no abrumar.
  const [showAllConcepts, setShowAllConcepts] = useState(false);
  const COMMON = ['compras', 'servicios', 'honorarios'];

  useEffect(() => {
    chartOfAccountsAPI.getAll()
      .then((res) => setAccounts((res?.data || []).filter((a) => a.accepts_entries !== false && String(a.code).startsWith('2365'))))
      .catch(() => {});
  }, []);

  const defaults = catalog?.defaults;
  const fp = {
    regime: 'ordinario', is_gran_contribuyente: false, is_agente_reteiva: catalog?.profile?.is_agente_reteiva ?? false,
    reteiva_rate: 15, uvt_value: defaults?.uvt_value || 52374, ...(config.fiscal_profile || {}),
  };
  const concepts = config.retention_concepts || catalog?.concepts || [];
  const expenseMap = { ...(defaults?.expense_category_concepts || {}), ...(catalog?.expense_category_concepts || {}), ...(config.expense_category_concepts || {}) };

  const setFp = (field, value) => onChange({ ...config, fiscal_profile: { ...fp, [field]: value } });
  const setConcepts = (list) => onChange({ ...config, retention_concepts: list });
  const updateConcept = (idx, field, value) => setConcepts(concepts.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  // El id queda fijo al crearlo: productos, categorías y proveedores lo referencian.
  const addConcept = () => setConcepts([...concepts, { id: `concepto_${Date.now().toString(36)}`, name: '', rate_juridica: 0, rate_natural_declarante: 0, rate_natural_no_declarante: 0, min_base_uvt: 0 }]);
  const removeConcept = (idx) => setConcepts(concepts.filter((_, i) => i !== idx));
  const setExpenseConcept = (category, conceptId) => onChange({ ...config, expense_category_concepts: { ...expenseMap, [category]: conceptId || null } });

  const num = (v) => (v === '' ? '' : parseFloat(v) || 0);
  const cell = 'w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className="space-y-6">
      {/* Perfil tributario */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">
          Retenciones que practica tu empresa en compras
          <span className="ml-2 align-middle text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Para tu contador</span>
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Define tu rol tributario como comprador. Con esto, cada compra calcula sola qué retenciones aplican según el
          proveedor y el concepto de lo que compras.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-900 mb-1">Régimen tributario</label>
            <select value={fp.regime} onChange={(e) => setFp('regime', e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg">
              <option value="ordinario">Régimen Ordinario / Persona Jurídica</option>
              <option value="simple">Régimen Simple de Tributación (RST)</option>
            </select>
            {fp.regime === 'simple' && (
              <p className="text-xs text-purple-700 mt-1">En el RST no se practica retención en la fuente por renta en compras.</p>
            )}
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-gray-900">Gran contribuyente</div>
              <div className="text-xs text-gray-500">Designado por la DIAN.</div>
            </div>
            <Toggle checked={!!fp.is_gran_contribuyente} onChange={(v) => onChange({ ...config, fiscal_profile: { ...fp, is_gran_contribuyente: v, is_agente_reteiva: v ? true : fp.is_agente_reteiva } })} />
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-gray-900">Agente de retención de IVA</div>
              <div className="text-xs text-gray-500">Grandes contribuyentes, entidades públicas o designados. Si no lo eres, no practicas ReteIVA.</div>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" min="0" step="0.01" value={fp.reteiva_rate} disabled={!fp.is_agente_reteiva}
                onChange={(e) => setFp('reteiva_rate', num(e.target.value))} className="w-16 px-2 py-1 text-sm text-right border border-gray-300 rounded disabled:bg-gray-100" />
              <span className="text-xs text-gray-500">%</span>
              <Toggle checked={!!fp.is_agente_reteiva} onChange={(v) => setFp('is_agente_reteiva', v)} />
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-gray-900">Valor UVT del año</div>
              <div className="text-xs text-gray-500">Para convertir las bases mínimas. Actualízalo cada año.</div>
            </div>
            <input type="number" min="0" step="1" value={fp.uvt_value} onChange={(e) => setFp('uvt_value', num(e.target.value))}
              className="w-28 px-2 py-1 text-sm text-right border border-gray-300 rounded" />
          </div>
        </div>
      </div>

      {/* Conceptos */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-700">Conceptos de retención en la fuente</h3>
          {defaults?.concepts && (
            <button type="button" onClick={() => setConcepts(defaults.concepts)} className="text-xs text-blue-600 hover:underline">
              Restaurar valores por defecto
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-3">
          El concepto se asigna al producto o servicio (o a su categoría), no al proveedor. La base mínima se compara con la suma de lo
          comprado bajo ese concepto en cada compra. Verifica las tarifas con tu contador: cambian por decreto.
        </p>
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-500">
                <th className="px-2 py-2 text-left">Concepto</th>
                <th className="px-2 py-2 text-right" title="Persona jurídica">% P. jurídica</th>
                <th className="px-2 py-2 text-right" title="Persona natural declarante">% PN declar.</th>
                <th className="px-2 py-2 text-right" title="Persona natural no declarante">% PN no declar.</th>
                <th className="px-2 py-2 text-right">Base mín. (UVT)</th>
                {accounts.length > 0 && <th className="px-2 py-2 text-left">Cuenta</th>}
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {concepts.map((c, idx) => ((showAllConcepts || COMMON.includes(c.id) || !c.name) && (
                <tr key={c.id || idx}>
                  <td className="px-2 py-1.5 min-w-[200px]">
                    <input value={c.name} placeholder="Nombre del concepto"
                      onChange={(e) => updateConcept(idx, 'name', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded" />
                    <div className="text-[10px] text-gray-400 mt-0.5">id: {c.id}</div>
                  </td>
                  <td className="px-2 py-1.5 w-20"><input type="number" step="0.01" min="0" value={c.rate_juridica ?? 0} onChange={(e) => updateConcept(idx, 'rate_juridica', num(e.target.value))} className={cell} /></td>
                  <td className="px-2 py-1.5 w-20"><input type="number" step="0.01" min="0" value={c.rate_natural_declarante ?? 0} onChange={(e) => updateConcept(idx, 'rate_natural_declarante', num(e.target.value))} className={cell} /></td>
                  <td className="px-2 py-1.5 w-20"><input type="number" step="0.01" min="0" value={c.rate_natural_no_declarante ?? 0} onChange={(e) => updateConcept(idx, 'rate_natural_no_declarante', num(e.target.value))} className={cell} /></td>
                  <td className="px-2 py-1.5 w-28">
                    <input type="number" step="0.5" min="0" value={c.min_base_uvt ?? 0} onChange={(e) => updateConcept(idx, 'min_base_uvt', num(e.target.value))} className={cell} />
                    <div className="text-[10px] text-gray-400 text-right mt-0.5">{money((Number(c.min_base_uvt) || 0) * (Number(fp.uvt_value) || 0))}</div>
                  </td>
                  {accounts.length > 0 && (
                    <td className="px-2 py-1.5 min-w-[160px]">
                      <select value={c.account_id || ''} onChange={(e) => updateConcept(idx, 'account_id', e.target.value || null)} className="w-full px-1 py-1 text-xs border border-gray-300 rounded">
                        <option value="">Por defecto (2365)</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                      </select>
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-right">
                    <button type="button" onClick={() => removeConcept(idx)} className="text-xs text-red-500 hover:text-red-700">Quitar</button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex items-center gap-3">
          {concepts.some((c) => !COMMON.includes(c.id)) && (
            <button type="button" onClick={() => setShowAllConcepts((v) => !v)} className="text-sm text-blue-600 hover:underline">
              {showAllConcepts ? 'Ver solo los comunes' : `Ver todos los conceptos (${concepts.length})`}
            </button>
          )}
          <button type="button" onClick={() => { setShowAllConcepts(true); addConcept(); }} className="px-3 py-1.5 text-sm rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50">
            + Agregar concepto
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Qué concepto lleva cada compra se define en Contabilidad → Clasificación tributaria. Sin asignar nada, los servicios
          usan "Servicios generales" y lo demás "Compras generales".
        </p>
      </div>

      {/* Categorías de gasto */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Concepto por categoría de gasto</h3>
        <p className="text-xs text-gray-500 mb-3">Se usa para sugerir la retención al registrar un gasto con proveedor.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {EXPENSE_CATEGORIES.map((cat) => (
            <div key={cat.value} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded border border-gray-200">
              <span className="text-sm text-gray-800">{cat.label}</span>
              <select value={expenseMap[cat.value] || ''} onChange={(e) => setExpenseConcept(cat.value, e.target.value)} className="px-2 py-1 text-xs border border-gray-300 rounded">
                <option value="">Sin ReteFuente</option>
                {concepts.map((c) => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
