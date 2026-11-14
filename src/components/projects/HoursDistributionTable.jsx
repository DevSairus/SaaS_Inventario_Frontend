import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { HOUR_CATEGORIES, qty } from './projectConstants';

/**
 * Horas clasificadas por empleado y, al desplegar, por proyecto (Fase 4, req. 1.1).
 * data: respuesta de /projects/labor/distribution.
 */
export default function HoursDistributionTable({ data, showProjects = true }) {
  const [open, setOpen] = useState(new Set());
  if (!data) return null;
  const cats = HOUR_CATEGORIES.filter(([k]) => k === 'ORD' || data.employees.some((e) => e.totals[k] > 0));
  const toggle = (id) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const cell = (v) => (v > 0 ? qty(v) : <span className="text-gray-300 dark:text-gray-600">—</span>);

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900/40">
          <tr className="text-left text-xs text-gray-500 uppercase">
            <th className="px-3 py-2 min-w-[180px]">Empleado</th>
            {cats.map(([k, label]) => <th key={k} className="px-3 py-2 text-right whitespace-nowrap">{label}</th>)}
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {data.employees.length === 0 && <tr><td colSpan={cats.length + 2} className="px-3 py-6 text-center text-gray-500">Sin horas en el rango.</td></tr>}
          {data.employees.map((e) => (
            <Fragment key={e.employee_id}>
              <tr className={showProjects ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40' : ''} onClick={() => showProjects && toggle(e.employee_id)}>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    {showProjects && (open.has(e.employee_id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
                    {e.name}
                  </span>
                  {e.extra_days > 0 && <span className="ml-2 text-xs text-amber-700">extra en {e.extra_days} día(s)</span>}
                </td>
                {cats.map(([k]) => <td key={k} className="px-3 py-2 text-right tabular-nums">{cell(e.totals[k])}</td>)}
                <td className="px-3 py-2 text-right tabular-nums font-medium">{qty(e.total_hours)}</td>
              </tr>
              {showProjects && open.has(e.employee_id) && e.projects.map((p) => (
                <tr key={p.project_id} className="bg-gray-50/60 dark:bg-gray-900/20 text-xs">
                  <td className="px-3 py-1.5 pl-9 text-gray-600 dark:text-gray-300">{p.code} · {p.name}</td>
                  {cats.map(([k]) => <td key={k} className="px-3 py-1.5 text-right tabular-nums">{cell(p.hours[k])}</td>)}
                  <td className="px-3 py-1.5 text-right tabular-nums">{qty(p.total_hours)}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
        {data.employees.length > 0 && (
          <tfoot className="bg-gray-50 dark:bg-gray-900/40 font-medium">
            <tr>
              <td className="px-3 py-2">Total</td>
              {cats.map(([k]) => <td key={k} className="px-3 py-2 text-right tabular-nums">{qty(data.totals[k])}</td>)}
              <td className="px-3 py-2 text-right tabular-nums">{qty(Object.values(data.totals).reduce((s, v) => s + v, 0))}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
