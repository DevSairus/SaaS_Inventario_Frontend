import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import { payrollPeriodsAPI } from '../../api/payroll';
import { formatCurrency } from '../../utils/formatters';

const qty = (n) => Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });

/**
 * Horas extra y recargos del período desde la planilla de las obras
 * (Fase 4, req. 1.1). Muestra lo que se generaría y lo crea como novedades
 * (reemplaza solo las que se generaron antes desde las horas).
 */
export default function ProjectHoursModal({ isOpen, onClose, periodId, canGenerate, onGenerated }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setData(null);
    payrollPeriodsAPI.getProjectHours(periodId)
      .then((r) => setData(r.data))
      .catch((e) => { toast.error(e.response?.data?.message || 'No se pudieron consultar las horas'); onClose(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, periodId]);

  const generate = async () => {
    if (data?.generated > 0 && !window.confirm(`Ya hay ${data.generated} novedad(es) generadas desde las horas. Se reemplazan con las horas actuales (las novedades manuales no se tocan). ¿Continuar?`)) return;
    setBusy(true);
    try {
      const r = (await payrollPeriodsAPI.generateProjectHours(periodId)).data;
      toast.success(`${r.created} novedad(es) para ${r.employees} empleado(s) · ${formatCurrency(r.total_pay)}`);
      for (const w of r.warnings || []) toast(w, { icon: '⚠️', duration: 9000 });
      onGenerated?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron generar las novedades');
    } finally {
      setBusy(false);
    }
  };

  const rows = (data?.rows || []).filter((r) => r.novedades.length);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Horas extra y recargos de los proyectos" size="lg">
      {!data ? (
        <div className="p-8 text-center text-sm text-gray-500">Calculando…</div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Horas de la planilla de las obras entre el {data.period.start_date} y el {data.period.end_date}, de los empleados de este período.
            Cada categoría se crea como novedad con el % de Configuración de nómina; luego se pueden revisar o borrar como cualquier novedad.
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-900/30 rounded px-3 py-2">
              {data.rows.length ? 'Las horas registradas son todas ordinarias diurnas: no generan novedades.' : 'No hay horas de proyectos en las fechas del período.'}
            </p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[50vh]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="px-3 py-2">Empleado</th><th className="px-3 py-2">Novedad</th>
                    <th className="px-3 py-2 text-right">Horas</th><th className="px-3 py-2 text-right">%</th><th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map((r) => r.novedades.map((n, i) => (
                    <tr key={`${r.employee_id}-${n.dian_category}`}>
                      <td className="px-3 py-1.5">{i === 0 ? <><span className="font-medium">{r.name}</span> <span className="text-xs text-gray-500">{qty(r.worked_hours)} h trabajadas</span></> : ''}</td>
                      <td className="px-3 py-1.5">{n.label}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{qty(n.cantidad)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{qty(n.porcentaje)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(n.pago)}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
          {data.generated > 0 && <p className="text-xs text-amber-700">Ya hay {data.generated} novedad(es) generadas desde las horas en este período.</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">Cerrar</button>
            {canGenerate && (
              <button type="button" onClick={generate} disabled={busy || (!rows.length && !data.generated)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Generando…' : rows.length ? 'Generar novedades' : 'Quitar las generadas'}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
