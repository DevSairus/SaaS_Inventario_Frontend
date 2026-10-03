// frontend/src/components/suppliers/SupplierRetentionsEditor.jsx
//
// Tarifas de ReteICA que el tenant le practica a un proveedor (‰ según el
// municipio y la actividad). Las marcadas "Por defecto" se aplican solas en
// cada compra. La ReteFuente ya no se configura aquí: sale del concepto del
// producto/servicio comprado.
import { useEffect, useState } from 'react';
import { chartOfAccountsAPI } from '../../api/accounting';

// Solo ReteICA: la ReteFuente sale del concepto del producto (catálogo del
// tenant) y la ReteIVA del perfil tributario — ver retentionEngine.service.js.
export const RETENTION_TYPES = [
  { code: '06', name: 'ReteICA', unit: '‰', base: 'Base gravable' },
];


const newId = () => `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export default function SupplierRetentionsEditor({ retentions = [], onChange, disabled = false }) {
  const [accounts, setAccounts] = useState([]);

  // El selector de cuenta es opcional: si el usuario no tiene acceso a
  // contabilidad (o el módulo no está activo), simplemente no se muestra y
  // la retención va a la cuenta mapeada por defecto para su tipo.
  useEffect(() => {
    let cancelled = false;
    chartOfAccountsAPI.getAll()
      .then((res) => {
        if (cancelled) return;
        const list = (res?.data || []).filter((a) => a.accepts_entries !== false && a.is_active !== false && String(a.code).startsWith('23'));
        setAccounts(list);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const update = (id, field, value) => onChange(retentions.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  const remove = (id) => onChange(retentions.filter((r) => r.id !== id));
  const add = (preset) => onChange([
    ...retentions,
    { id: newId(), code: '06', concept: preset?.concept || 'ReteICA', rate: preset?.rate ?? 0, min_base: '', account_id: null, is_default: true },
  ]);

  const inputCls = 'w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 disabled:bg-gray-100 disabled:text-gray-400';

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      {retentions.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Sin ReteICA configurada para este proveedor.
        </p>
      ) : (
        <div className="space-y-2 mb-3">
          {retentions.map((r) => {
            const type = RETENTION_TYPES.find((t) => t.code === r.code) || RETENTION_TYPES[0];
            return (
              <div key={r.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                <div className="col-span-12 md:col-span-5">
                  <label className="block text-xs text-gray-500 mb-1">Concepto</label>
                  <input type="text" value={r.concept} onChange={(e) => update(r.id, 'concept', e.target.value)} placeholder="Ej: ICA Medellín — comercial" className={inputCls} />
                </div>
                <div className="col-span-4 md:col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">Tarifa ({type.unit})</label>
                  <input type="number" min="0" step="0.01" value={r.rate} onChange={(e) => update(r.id, 'rate', e.target.value === '' ? '' : parseFloat(e.target.value))} className={`${inputCls} text-right`} />
                </div>
                <div className="col-span-8 md:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1" title="Si la base de la compra es menor, no se aplica automáticamente">Base mínima ($)</label>
                  <input type="number" min="0" step="1" value={r.min_base ?? ''} onChange={(e) => update(r.id, 'min_base', e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="Opcional" className={`${inputCls} text-right`} />
                </div>
                <div className="col-span-12 md:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Cuenta contable</label>
                  <select value={r.account_id || ''} onChange={(e) => update(r.id, 'account_id', e.target.value || null)} className={inputCls} disabled={accounts.length === 0}>
                    <option value="">Por defecto del tipo</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                  </select>
                </div>
                <div className="col-span-12 md:col-span-2 flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer" title="Se precarga al registrar una compra a este proveedor">
                    <input type="checkbox" checked={!!r.is_default} onChange={(e) => update(r.id, 'is_default', e.target.checked)} className="rounded border-gray-300 text-blue-600 h-4 w-4" />
                    Aplicar
                  </label>
                  <button type="button" onClick={() => remove(r.id)} className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                    Quitar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => add()} className="px-3 py-1.5 text-sm rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-blue-900/20">
          + Agregar ReteICA
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        En por mil (‰), según el municipio y la actividad del proveedor; verifícala con el estatuto municipal o tu contador.
        Las marcadas "Aplicar" se calculan solas en cada compra.
      </p>
    </div>
  );
}
