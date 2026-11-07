import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { getProjectPnl } from '../../api/projects';
import { formatCurrency } from '../../utils/formatters';

const Row = ({ label, value, strong, indent, negative, hint }) => (
  <div className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'} ${indent ? 'pl-5 text-sm' : ''}`}>
    <span>{label}{hint && <span className="block text-xs font-normal text-gray-500">{hint}</span>}</span>
    <span className="tabular-nums whitespace-nowrap">{negative && value ? `(${formatCurrency(value)})` : formatCurrency(value)}</span>
  </div>
);

// Estado del ejecutado frente al presupuesto: el color acompaña al texto, nunca solo.
function budgetState(line) {
  if (!line.budget) return line.executed > 0 ? { label: 'Sin presupuesto', bar: 'bg-gray-400', text: 'text-gray-600', Icon: Info } : null;
  const pct = line.executed / line.budget;
  if (pct > 1) return { label: 'Sobrecosto', bar: 'bg-red-600', text: 'text-red-700', Icon: AlertTriangle };
  if (pct >= 0.8) return { label: 'Cerca del límite', bar: 'bg-amber-500', text: 'text-amber-700', Icon: AlertTriangle };
  return { label: 'En rango', bar: 'bg-green-600', text: 'text-green-700', Icon: CheckCircle2 };
}

/**
 * Estado de resultados del proyecto y presupuesto vs. ejecutado.
 */
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export default function PnlTab({ project }) {
  const [pnl, setPnl] = useState(null);
  const [range, setRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProjectPnl(project.id, { from: range.from || undefined, to: range.to || undefined });
      setPnl(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al calcular el estado de resultados');
    } finally {
      setLoading(false);
    }
  }, [project.id, range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  if (!pnl) {
    return <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;
  }

  const c = pnl.costs;
  const marginPositive = pnl.gross_margin >= 0;

  return (
    <div className={`space-y-5 ${loading ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800" />
        </div>
        {(range.from || range.to) && <button onClick={() => setRange({ from: '', to: '' })} className="text-sm text-gray-500 hover:underline pb-2">Todo el proyecto</button>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
          <p className="text-xs text-gray-500">Ingresos netos</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(pnl.revenue.net)}</p>
          {pnl.pending_to_invoice !== null && <p className="text-xs text-gray-500">Por facturar del contrato: {formatCurrency(pnl.pending_to_invoice)}</p>}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
          <p className="text-xs text-gray-500">Costos</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(c.total)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
          <p className="text-xs text-gray-500">Margen bruto</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(pnl.gross_margin)}</p>
          <p className={`text-xs flex items-center gap-1 ${marginPositive ? 'text-green-700' : 'text-red-700'}`}>
            {marginPositive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {pnl.margin_pct !== null ? `${pnl.margin_pct}% sobre ingresos` : (marginPositive ? 'Sin ingresos aún' : 'Pérdida: costos sin ingresos')}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
          <p className="text-xs text-gray-500">Presupuesto ejecutado</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{pnl.budget.executed_pct !== null ? `${pnl.budget.executed_pct}%` : '—'}</p>
          <p className="text-xs text-gray-500">de {formatCurrency(pnl.budget.total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Estado de resultados</h3>
          <Row label="Ingresos facturados" value={pnl.revenue.invoiced} hint={`${pnl.revenue.documents} factura(s) o remisión(es), sin IVA`} />
          {pnl.revenue.credit_notes > 0 && <Row label="Notas crédito" value={pnl.revenue.credit_notes} negative indent />}
          {pnl.revenue.debit_notes > 0 && <Row label="Notas débito" value={pnl.revenue.debit_notes} indent />}
          <Row label="Ingresos netos" value={pnl.revenue.net} strong />
          <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
          <Row label="Materiales" value={c.materials.net} negative hint="Entregado a la bodega de la obra menos lo reintegrado, más lo vendido al proyecto desde otra bodega" />
          {c.materials.returned > 0 && <Row label={`Entregado ${formatCurrency(c.materials.delivered)} · reintegrado`} value={c.materials.returned} indent negative />}
          {c.materials.sold_direct > 0 && <Row label={`Vendido al proyecto desde otra bodega${c.materials.sold_direct_returned > 0 ? ` (devuelto ${formatCurrency(c.materials.sold_direct_returned)})` : ''}`} value={c.materials.sold_direct - (c.materials.sold_direct_returned || 0)} indent negative />}
          <Row label="Servicios y subcontratos" value={c.services} negative />
          <Row label="Otros costos" value={c.other} negative />
          {c.tools?.amount > 0 && <Row label={`Uso de herramientas (${c.tools.unit_days} día(s)-unidad)`} value={c.tools.amount} indent negative />}
          <Row
            label="Mano de obra"
            value={c.labor.amount}
            negative
            hint={c.labor.hours > 0
              ? `${c.labor.hours} h${c.labor.periods ? ` · reparto de ${c.labor.periods} periodo(s) de nómina` : ''}${c.labor.estimated > 0 ? ' · incluye un estimado de las horas aún sin nómina repartida' : ''}`
              : 'Sin horas registradas: regístralas en la pestaña Mano de obra'}
          />
          {c.labor.estimated > 0 && c.labor.allocated > 0 && <Row label="Repartido de la nómina" value={c.labor.allocated} indent negative />}
          {c.labor.estimated > 0 && (
            <Row
              label={`Estimado: ${c.labor.pending_hours} h aún sin nómina repartida`}
              value={c.labor.estimated}
              indent
              negative
              hint="Costo por hora de cada empleado (salario + aportes + prestaciones de un mes / horas del mes). Se reemplaza por el costo real al repartir el periodo de nómina."
            />
          )}
          <Row label="Total costos" value={c.total} strong negative />
          <div className="border-t-2 border-gray-200 dark:border-gray-600 my-2" />
          <Row label="Margen bruto" value={pnl.gross_margin} strong />
          {c.expenses_by_category.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Gastos por categoría</p>
              {c.expenses_by_category.map((e) => (
                <Row key={e.category} label={`${e.label} (${e.documents})`} value={e.amount} indent />
              ))}
            </div>
          )}
          {(c.materials.in_transit > 0 || c.materials.on_site_value > 0) && (
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-lg px-3 py-2 space-y-0.5">
              {c.materials.in_transit > 0 && <p>En tránsito hacia la obra (aún no es costo): {formatCurrency(c.materials.in_transit)}</p>}
              {c.materials.on_site_value > 0 && <p>Saldo en la bodega de la obra: {formatCurrency(c.materials.on_site_value)}. Antes de cerrar el proyecto se reintegra o se registra como consumo.</p>}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Presupuesto vs. ejecutado</h3>
          <div className="space-y-4">
            {pnl.budget.lines.map((l) => {
              const st = budgetState(l);
              const pct = l.budget > 0 ? Math.min((l.executed / l.budget) * 100, 100) : (l.executed > 0 ? 100 : 0);
              return (
                <div key={l.category} title={`${l.label}: ejecutado ${formatCurrency(l.executed)} de ${formatCurrency(l.budget)}`}>
                  <div className="flex items-baseline justify-between text-sm mb-1">
                    <span className="text-gray-800 dark:text-gray-200">{l.label}</span>
                    <span className="tabular-nums text-gray-700 dark:text-gray-300">{formatCurrency(l.executed)} <span className="text-gray-500">/ {formatCurrency(l.budget)}</span></span>
                  </div>
                  <div className="h-2 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    {pct > 0 && <div className={`h-full rounded ${st?.bar || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />}
                  </div>
                  {st && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${st.text}`}>
                      <st.Icon className="w-3.5 h-3.5" /> {st.label}
                      {l.executed_pct !== null && <span className="text-gray-500"> · {l.executed_pct}%</span>}
                      {l.budget > 0 && l.variance < 0 && <span className="text-gray-500"> · excede {formatCurrency(-l.variance)}</span>}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {pnl.budget.expected_margin !== null && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              Margen esperado (contrato − presupuesto): <strong className="tabular-nums">{formatCurrency(pnl.budget.expected_margin)}</strong>
            </p>
          )}
        </div>
      </div>

      {pnl.accounting && (() => {
        const acc = pnl.accounting.with_drafts;
        const posted = pnl.accounting.posted;
        const costs = round2(acc.costos + acc.gastos);
        const opCosts = round2(c.total - (c.tools?.amount || 0));
        const same = Math.abs(acc.ingresos - pnl.revenue.net) < 1 && Math.abs(costs - opCosts) < 1;
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Según contabilidad</h3>
            <p className="text-xs text-gray-500 mb-3">Asientos con este proyecto (incluye borradores). Contabilizados: ingresos {formatCurrency(posted.ingresos)} · costos y gastos {formatCurrency(round2(posted.costos + posted.gastos))}.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Ingresos</p><p className="font-semibold tabular-nums">{formatCurrency(acc.ingresos)}</p></div>
              <div><p className="text-xs text-gray-500">Costos (clase 6 y 7)</p><p className="font-semibold tabular-nums">{formatCurrency(acc.costos)}</p></div>
              <div><p className="text-xs text-gray-500">Gastos (clase 5)</p><p className="font-semibold tabular-nums">{formatCurrency(acc.gastos)}</p></div>
              <div><p className="text-xs text-gray-500">Utilidad</p><p className="font-semibold tabular-nums">{formatCurrency(acc.utilidad)}</p></div>
            </div>
            <p className={`text-xs mt-3 ${same ? 'text-green-700' : 'text-amber-700'}`}>
              {same
                ? 'Cuadra con el estado de resultados del proyecto.'
                : `Diferencia con el estado de resultados del proyecto: ingresos ${formatCurrency(round2(pnl.revenue.net - acc.ingresos))}, costos ${formatCurrency(round2(opCosts - costs))}. Puede ser un asiento que falta generar o un periodo de nómina sin comprobante contable.`}
              {c.tools?.amount > 0 && ' El cargo por uso de herramientas es interno y no genera asiento.'}
            </p>
          </div>
        );
      })()}

      <p className="text-xs text-gray-500">
        Calculado con los documentos del proyecto (ventas, traslados, compras, gastos y reparto de nómina). En contabilidad, el material que entra a la bodega de la obra va a costo de obra (710505) y la nómina repartida se reclasifica a 720505.
      </p>
    </div>
  );
}
