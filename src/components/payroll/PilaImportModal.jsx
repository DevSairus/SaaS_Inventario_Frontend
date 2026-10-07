// frontend/src/components/payroll/PilaImportModal.jsx
//
// Importar la planilla PILA del mes anterior (TXT o Excel, como la exporta
// el operador) para no digitar a mano los códigos de EPS/AFP/caja/ARL, tipo
// de cotizante, clase y tarifa ARL, centro de trabajo, actividad económica
// y municipio de cada empleado. Primero muestra los cambios propuestos (con
// casillas) y la comparación contra lo que Pitbox genera para ese mes; solo
// aplica lo que el usuario confirma. Ver pilaImport.service.js.
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowUpTrayIcon, ArrowPathIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Modal from '../common/Modal';
import { payrollPilaAPI } from '../../api/payroll';

const ENTITY_LABELS = { settings: 'Empresa', supplier: 'Administradoras (código PILA)' };
const ID_FIELDS = new Set(['eps_supplier_id', 'pension_fund_supplier_id', 'arl_supplier_id', 'ccf_supplier_id']);

const showValue = (c, v) => {
  if (v == null || v === '') return '—';
  if (ID_FIELDS.has(c.field)) return 'asignar';
  if (c.field === 'arl_rate') return `${(Number(v) * 100).toLocaleString('es-CO', { maximumFractionDigits: 4 })}%`;
  return String(v);
};

export default function PilaImportModal({ isOpen, onClose, onApplied }) {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [selected, setSelected] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => { setFile(null); setAnalysis(null); setSelected({}); setResult(null); };
  const close = () => { reset(); onClose(); };

  const analyze = async (f = file) => {
    if (!f) return;
    setBusy(true);
    try {
      const res = await payrollPilaAPI.analyzeImport(f);
      setAnalysis(res.data);
      setSelected(Object.fromEntries(res.data.changes.map((c) => [c.id, c.selected])));
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo leer la planilla');
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    const changes = analysis.changes.filter((c) => selected[c.id]);
    if (!changes.length) return toast('No hay cambios marcados');
    setBusy(true);
    try {
      const res = await payrollPilaAPI.applyImport(changes);
      toast.success(res.message || 'Cambios aplicados');
      setResult(res.data);
      onApplied?.();
      // Re-analizar: muestra lo que queda pendiente y la comparación actualizada.
      await analyze();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error aplicando los cambios');
    } finally {
      setBusy(false);
    }
  };

  // Cambios agrupados: empresa, administradoras y luego cada empleado.
  const groups = useMemo(() => {
    const map = new Map();
    for (const c of analysis?.changes || []) {
      const key = c.entity === 'employee' ? `employee:${c.entity_id}` : c.entity;
      const title = c.entity === 'employee' ? c.employee_name : ENTITY_LABELS[c.entity];
      if (!map.has(key)) map.set(key, { title, items: [] });
      map.get(key).items.push(c);
    }
    return [...map.values()];
  }, [analysis]);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const toggleGroup = (items, value) => setSelected((prev) => ({ ...prev, ...Object.fromEntries(items.map((c) => [c.id, value])) }));

  return (
    <Modal isOpen={isOpen} onClose={close} title="Importar planilla anterior" size="xl">
      <div className="space-y-4 text-sm">
        {!analysis ? (
          <>
            <p className="text-gray-600 dark:text-gray-300">
              Suba la planilla de seguridad social del mes anterior, tal como la descarga del operador o de su software anterior
              (archivo plano <strong>.txt</strong> o su versión en <strong>Excel</strong>). Pitbox toma de ahí los códigos de las
              administradoras, el tipo de cotizante, la clase y tarifa de ARL, el centro de trabajo, la actividad económica y el
              municipio de cada empleado. Antes de cambiar algo le muestra la lista para que la revise.
            </p>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-white/15 rounded-xl py-10 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
              <ArrowUpTrayIcon className="h-8 w-8 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-200">{file ? file.name : 'Seleccionar archivo .txt o .xlsx'}</span>
              <input type="file" accept=".txt,.xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; setFile(f || null); if (f) analyze(f); }} />
            </label>
            {busy && <p className="flex items-center gap-2 text-gray-500"><ArrowPathIcon className="h-4 w-4 animate-spin" /> Leyendo planilla…</p>}
          </>
        ) : (
          <>
            <div className="rounded-lg bg-gray-50 dark:bg-white/5 px-4 py-3 text-gray-700 dark:text-gray-200">
              <strong>{analysis.header.razonSocial}</strong> · NIT {analysis.header.nit} · período {analysis.header.periodoPension} ·{' '}
              {analysis.header.cotizantes} cotizante(s)
            </div>

            {result && (
              <p className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircleIcon className="h-5 w-5" /> Se aplicaron {result.applied} cambio(s).
              </p>
            )}

            {analysis.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3 text-amber-800 dark:text-amber-300">
                <p className="font-medium flex items-center gap-1.5"><ExclamationTriangleIcon className="h-4 w-4" /> Para revisar</p>
                <ul className="mt-1 list-disc pl-5 space-y-0.5">{analysis.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            )}

            {analysis.unmatched.length > 0 && (
              <div className="rounded-lg border border-gray-200 dark:border-white/10 px-4 py-3">
                <p className="font-medium text-gray-700 dark:text-gray-200">En la planilla pero no en Pitbox ({analysis.unmatched.length})</p>
                <p className="text-xs text-gray-500">Créelos en Empleados con el mismo número de documento y vuelva a importar.</p>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{analysis.unmatched.map((u) => `${u.name} (${u.document})`).join(' · ')}</p>
              </div>
            )}
            {analysis.missing.length > 0 && (
              <div className="rounded-lg border border-gray-200 dark:border-white/10 px-4 py-3">
                <p className="font-medium text-gray-700 dark:text-gray-200">Activos en Pitbox pero no en la planilla ({analysis.missing.length})</p>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{analysis.missing.map((u) => u.name).join(' · ')}</p>
              </div>
            )}

            {groups.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-800 dark:text-gray-100">Cambios propuestos ({analysis.changes.length})</p>
                  <div className="flex gap-3 text-xs">
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => toggleGroup(analysis.changes, true)}>Marcar todos</button>
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => toggleGroup(analysis.changes, false)}>Desmarcar todos</button>
                  </div>
                </div>
                {groups.map((g, gi) => (
                  <div key={`${g.title}-${gi}`} className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 px-3 py-2">
                      <span className="font-medium text-gray-700 dark:text-gray-200">{g.title}</span>
                      <input type="checkbox" checked={g.items.every((c) => selected[c.id])} onChange={(e) => toggleGroup(g.items, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 h-4 w-4" title="Todos los de este grupo" />
                    </div>
                    <ul className="divide-y divide-gray-100 dark:divide-white/10">
                      {g.items.map((c) => (
                        <li key={c.id} className="flex items-start gap-3 px-3 py-2">
                          <input type="checkbox" checked={!!selected[c.id]} onChange={(e) => setSelected((prev) => ({ ...prev, [c.id]: e.target.checked }))}
                            className="mt-0.5 rounded border-gray-300 text-blue-600 h-4 w-4" />
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-700 dark:text-gray-200">
                              {c.label}
                              {!ID_FIELDS.has(c.field) && (
                                <span className="text-gray-500"> · {showValue(c, c.current)} → <strong className="text-gray-800 dark:text-gray-100">{showValue(c, c.value)}</strong></span>
                              )}
                            </p>
                            {c.note && <p className="text-xs text-amber-700 dark:text-amber-400">{c.note}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircleIcon className="h-5 w-5" /> No hay datos por completar: Pitbox ya tiene todo lo que trae la planilla.
              </p>
            )}

            <div className="rounded-lg border border-gray-200 dark:border-white/10 px-4 py-3">
              <p className="font-medium text-gray-700 dark:text-gray-200">Comparación con lo que genera Pitbox</p>
              {!analysis.comparison.available ? (
                <p className="text-gray-500 mt-1">{analysis.comparison.reason}</p>
              ) : analysis.comparison.identical ? (
                <p className="mt-1 flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircleIcon className="h-5 w-5" /> La planilla de {analysis.comparison.period} que genera Pitbox es igual a la importada.
                </p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="text-gray-500"><tr><th className="text-left py-1 pr-3">Empleado</th><th className="text-left py-1 pr-3">Campo</th><th className="text-right py-1 pr-3">Planilla</th><th className="text-right py-1">Pitbox</th></tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                      {analysis.comparison.rows.flatMap((r) => (r.missingInPitbox
                        ? [<tr key={r.name}><td className="py-1 pr-3">{r.name}</td><td colSpan={3} className="py-1 text-amber-700">Sin nómina emitida en Pitbox ese mes</td></tr>]
                        : r.diffs.map((d) => (
                          <tr key={`${r.name}-${d.field}`}>
                            <td className="py-1 pr-3">{r.name}</td><td className="py-1 pr-3">{d.label}</td>
                            <td className="py-1 pr-3 text-right font-mono">{String(d.planilla)}</td><td className="py-1 text-right font-mono">{String(d.pitbox)}</td>
                          </tr>
                        ))))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-500 mt-2">Las diferencias de códigos y tarifas se corrigen al aplicar los cambios propuestos.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
              <button type="button" onClick={reset} className="px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                Importar otro archivo
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={close} className="px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">Cerrar</button>
                {analysis.changes.length > 0 && (
                  <button type="button" onClick={apply} disabled={busy || !selectedCount}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50">
                    {busy && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                    Aplicar {selectedCount} cambio(s)
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
