import { Fragment, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import NumericInput from '../inputs/NumericInput';
import { addBudgetLine, updateBudgetLine, deleteBudgetLine } from '../../api/projects';
import { formatCurrency } from '../../utils/formatters';
import { BUDGET_CATEGORIES } from './projectConstants';

const emptyLine = { category: 'materials', description: '', budget_amount: '' };
const inputCls = 'w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800';

/**
 * Presupuesto del proyecto por categoría. La línea "Materiales según lista
 * de materiales" la mantiene el BOM; las demás son manuales.
 */
export default function BudgetTab({ project, canManage, onChanged }) {
  const [draft, setDraft] = useState(null); // { id?, ...campos }
  const [busy, setBusy] = useState(false);
  const lines = project.budget_lines || [];
  const editable = canManage && !['closed', 'cancelled'].includes(project.status);

  const byCategory = Object.keys(BUDGET_CATEGORIES).map((cat) => ({
    cat,
    total: lines.filter((l) => l.category === cat).reduce((s, l) => s + Number(l.budget_amount || 0), 0),
  }));
  const total = byCategory.reduce((s, c) => s + c.total, 0);
  const contract = Number(project.contract_amount || 0);

  const save = async () => {
    if (!draft.description.trim()) { toast('Escribe la descripción'); return; }
    setBusy(true);
    try {
      const payload = { category: draft.category, description: draft.description, budget_amount: Number(draft.budget_amount) || 0 };
      if (draft.id) await updateBudgetLine(project.id, draft.id, payload);
      else await addBudgetLine(project.id, payload);
      setDraft(null);
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar la línea');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (line) => {
    if (!window.confirm(`¿Eliminar "${line.description}"?`)) return;
    try {
      await deleteBudgetLine(project.id, line.id);
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo eliminar la línea');
    }
  };

  const form = draft && (
    <tr className="bg-orange-50/50 dark:bg-orange-900/10">
      <td className="px-3 py-2">
        <select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} className={inputCls}>
          {Object.entries(BUDGET_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} className={inputCls} placeholder="Ej. Subcontrato de montaje" autoFocus />
      </td>
      <td className="px-3 py-2">
        <NumericInput value={draft.budget_amount} onChange={(e) => setDraft((d) => ({ ...d, budget_amount: e.target.value }))} className={`${inputCls} text-right`} />
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        <button onClick={save} disabled={busy} className="text-sm text-orange-700 font-medium mr-3">Guardar</button>
        <button onClick={() => setDraft(null)} className="text-sm text-gray-500">Cancelar</button>
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {byCategory.map(({ cat, total: t }) => (
          <div key={cat} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
            <p className="text-xs text-gray-500">{BUDGET_CATEGORIES[cat]}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(t)}</p>
          </div>
        ))}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-300 px-4 py-3">
          <p className="text-xs text-gray-500">Total presupuesto</p>
          <p className="text-lg font-bold text-orange-700">{formatCurrency(total)}</p>
          {contract > 0 && (
            <p className={`text-xs mt-0.5 ${contract - total >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              Margen esperado {formatCurrency(contract - total)} ({Math.round(((contract - total) / contract) * 1000) / 10}%)
            </p>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
            <tr className="text-left text-xs font-medium text-gray-500 uppercase">
              <th className="px-3 py-2 w-48">Categoría</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2 text-right w-44">Valor</th>
              <th className="px-3 py-2 w-40" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {lines.map((l) => (draft?.id === l.id ? <Fragment key={l.id}>{form}</Fragment> : (
              <tr key={l.id}>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{BUDGET_CATEGORIES[l.category]}</td>
                <td className="px-3 py-2">
                  {l.description}
                  {l.source === 'bom' && <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">desde la lista de materiales</span>}
                </td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(l.budget_amount)}</td>
                <td className="px-3 py-2 text-right">
                  {editable && (
                    <span className="inline-flex gap-3">
                      <button onClick={() => setDraft({ id: l.id, category: l.category, description: l.description, budget_amount: l.budget_amount })} className="text-gray-400 hover:text-orange-600" title="Editar"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(l)} className="text-gray-400 hover:text-red-600" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                    </span>
                  )}
                </td>
              </tr>
            )))}
            {draft && !draft.id && form}
            {lines.length === 0 && !draft && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-500">Sin presupuesto. Cargar la lista de materiales crea la línea de materiales; agrega mano de obra, subcontratos y otros costos aquí.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editable && !draft && (
        <button onClick={() => setDraft(emptyLine)} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
          <Plus className="w-4 h-4" /> Agregar línea de presupuesto
        </button>
      )}
    </div>
  );
}
