// frontend/src/pages/payroll/PayrollPilaPage.jsx
//
// Planilla de seguridad social (PILA) del mes, generada desde la nómina ya
// emitida: vista previa por cotizante (días, IBC, aportes, novedades),
// avisos de datos faltantes y descarga del archivo plano estándar que
// reciben todos los operadores (SOI, Aportes en Línea, Mi Planilla,
// Asopagos...). Ver backend/src/services/payroll/pila/.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowPathIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ExclamationTriangleIcon, InformationCircleIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import Layout from '../../components/layout/Layout';
import { payrollPilaAPI } from '../../api/payroll';
import { formatCurrency } from '../../utils/formatters';
import PilaImportModal from '../../components/payroll/PilaImportModal';
import PilaExcelTemplateModal from '../../components/payroll/PilaExcelTemplateModal';
import useAuthStore from '../../store/authStore';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const NOVEDADES = [
  ['ing', 'ING'], ['ret', 'RET'], ['vst', 'VST'], ['sln', 'SLN'], ['ige', 'IGE'], ['lma', 'LMA'], ['vacLr', 'VAC'],
];

// Mes anterior: la PILA se paga sobre el mes ya liquidado.
const defaultPeriod = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

const pct = (v) => `${(Number(v) * 100).toLocaleString('es-CO', { maximumFractionDigits: 3 })}%`;

// Nombre y fechas de cada línea del cotizante (una por novedad, ver pilaCalc.js).
const lineLabel = (l) => {
  if (l.ige) return 'Incapacidad general';
  if (l.irl > 0) return 'Incapacidad laboral';
  if (l.lma) return 'Licencia maternidad/paternidad';
  if (l.vacLr === 'X') return 'Vacaciones';
  if (l.vacLr === 'L') return 'Licencia remunerada';
  if (l.sln) return 'Licencia no remunerada';
  return 'Días laborados';
};
const lineDates = (l) => {
  const pairs = [[l.fechaIgeInicio, l.fechaIgeFin], [l.fechaIrlInicio, l.fechaIrlFin], [l.fechaLmaInicio, l.fechaLmaFin], [l.fechaVacInicio, l.fechaVacFin], [l.fechaSlnInicio, l.fechaSlnFin]];
  const p = pairs.find(([a]) => a);
  return p ? `${p[0]} a ${p[1]}` : '';
};

export default function PayrollPilaPage() {
  const [{ year, month }, setPeriod] = useState(defaultPeriod);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const role = useAuthStore((s) => s.user?.role);
  const canImport = ['admin', 'super_admin', 'accountant'].includes(role);

  const load = async () => {
    setLoading(true);
    try {
      const res = await payrollPilaAPI.preview(year, month);
      setData(res.data);
    } catch (e) {
      setData(null);
      toast.error(e.response?.data?.message || 'Error generando la vista previa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [year, month]);

  // kind: 'txt' (archivo plano estándar) | 'xlsx' (plantilla de la empresa)
  const download = async (kind = 'txt') => {
    setDownloading(kind);
    try {
      const res = kind === 'xlsx' ? await payrollPilaAPI.downloadExcel(year, month) : await payrollPilaAPI.download(year, month);
      const type = kind === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/plain';
      const url = URL.createObjectURL(new Blob([res.data], { type }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `PILA_${year}-${String(month).padStart(2, '0')}.${kind}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      let message = 'Error descargando la planilla';
      try { message = JSON.parse(await e.response?.data?.text())?.message || message; } catch { /* respuesta no JSON */ }
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  };

  const rows = data?.rows || [];
  const totalWarnings = (data?.warnings?.length || 0) + rows.reduce((s, r) => s + r.warnings.length, 0);
  const years = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Layout>
      <div className="space-y-5 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Seguridad social (PILA)</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Archivo plano para cargar en el operador de pago (SOI, Aportes en Línea, Mi Planilla, Asopagos…), desde la nómina emitida del mes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={month} onChange={(e) => setPeriod({ year, month: Number(e.target.value) })}
              className="px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setPeriod({ year: Number(e.target.value), month })}
              className="px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={load} disabled={loading} title="Recalcular"
              className="p-2 border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">
              <ArrowPathIcon className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {canImport && (
              <button type="button" onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5">
                <ArrowUpTrayIcon className="h-4 w-4" />
                Importar planilla anterior
              </button>
            )}
            <button type="button" onClick={() => download('xlsx')} disabled={!!downloading || !rows.length}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed">
              <TableCellsIcon className="h-4 w-4" />
              {downloading === 'xlsx' ? 'Generando…' : 'Descargar Excel'}
            </button>
            <button type="button" onClick={() => download('txt')} disabled={!!downloading || !rows.length}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              <ArrowDownTrayIcon className="h-4 w-4" />
              {downloading === 'txt' ? 'Generando…' : 'Descargar archivo plano'}
            </button>
          </div>
        </div>

        {data && (
          <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl p-4 text-sm">
            <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p>
              Planilla tipo E (empleados). Período de pensión y riesgos <strong>{data.period}</strong>, período de salud{' '}
              <strong>{data.periodoSalud}</strong>. Revise los avisos antes de cargar el archivo: el operador valida la
              planilla y señala cualquier diferencia antes del pago.
              {canImport && (
                <> Si su operador pide Excel con otro formato,{' '}
                  <button type="button" onClick={() => setTemplateOpen(true)} className="underline font-medium">configure la plantilla del Excel</button>.
                </>
              )}
            </p>
          </div>
        )}

        {canImport && totalWarnings > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            ¿Primera vez? Use <button type="button" onClick={() => setImportOpen(true)} className="text-blue-600 hover:underline">Importar planilla anterior</button>{' '}
            con la planilla del mes pasado: Pitbox completa los códigos y datos de cada empleado a partir de ella.
          </p>
        )}

        {data?.warnings?.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-medium flex items-center gap-1.5"><ExclamationTriangleIcon className="h-4 w-4" /> Revise antes de generar</p>
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              {data.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
            <p className="mt-2 text-xs">
              Códigos PILA de las administradoras: en <Link to="/suppliers" className="underline">Proveedores</Link>. ARL, caja, jornada y datos del aportante: en{' '}
              <Link to="/payroll/settings" className="underline">Configuración de Nómina</Link>.
            </p>
          </div>
        )}

        {data && rows.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              ['Cotizantes', rows.length, false], ['IBC total', data.totals.ibc, true], ['Salud', data.totals.salud, true],
              ['Pensión', data.totals.pension, true], ['ARL', data.totals.arl, true],
              ['Caja / SENA / ICBF', (data.totals.ccf || 0) + (data.totals.sena || 0) + (data.totals.icbf || 0), true],
              ['Total a pagar', data.totals.total, true],
            ].map(([label, value, money]) => (
              <div key={label} className="bg-white dark:bg-graphite shadow rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{money ? formatCurrency(value) : value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
          {loading && !data ? (
            <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
              <ArrowPathIcon className="h-6 w-6 animate-spin" />
              <span className="text-sm">Calculando planilla…</span>
            </div>
          ) : !rows.length ? (
            <p className="py-16 text-center text-sm text-gray-500">No hay cotizantes con nómina emitida en {MONTHS[month - 1].toLowerCase()} de {year}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Empleado</th>
                    <th className="px-3 py-3 text-center">Días</th>
                    <th className="px-3 py-3 text-right">IBC</th>
                    <th className="px-3 py-3 text-right">Salud</th>
                    <th className="px-3 py-3 text-right">Pensión</th>
                    <th className="px-3 py-3 text-right">ARL</th>
                    <th className="px-3 py-3 text-right">Caja</th>
                    <th className="px-3 py-3 text-right">SENA/ICBF</th>
                    <th className="px-3 py-3 text-left">Novedades</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {rows.map((r) => {
                    const f = r.fields;
                    const open = expanded === r.employee_id;
                    return [
                      <tr key={r.employee_id} className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer" onClick={() => setExpanded(open ? null : r.employee_id)}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{r.name}</p>
                          <p className="text-xs text-gray-500">{f.tipoDoc} {r.document}</p>
                        </td>
                        <td className="px-3 py-3 text-center">{r.summary.dias}</td>
                        <td className="px-3 py-3 text-right">{formatCurrency(r.summary.ibc)}</td>
                        <td className="px-3 py-3 text-right">{formatCurrency(r.summary.salud)}</td>
                        <td className="px-3 py-3 text-right">{formatCurrency(r.summary.pension)}</td>
                        <td className="px-3 py-3 text-right">{formatCurrency(r.summary.arl)}</td>
                        <td className="px-3 py-3 text-right">{formatCurrency(r.summary.ccf)}</td>
                        <td className="px-3 py-3 text-right">{formatCurrency((r.summary.sena || 0) + (r.summary.icbf || 0))}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {r.lines.length > 1 && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 text-xs">{r.lines.length} líneas</span>
                            )}
                            {NOVEDADES.filter(([k]) => r.lines.some((l) => l[k])).map(([k, label]) => (
                              <span key={k} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-xs font-mono">{label}</span>
                            ))}
                            {r.lines.some((l) => l.irl > 0) && <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-xs font-mono">IRL</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {r.warnings.length > 0 && (
                            <span title={r.warnings.join('\n')} className="inline-flex items-center gap-1 text-amber-600 text-xs">
                              <ExclamationTriangleIcon className="h-4 w-4" /> {r.warnings.length}
                            </span>
                          )}
                        </td>
                      </tr>,
                      open && (
                        <tr key={`${r.employee_id}-detail`} className="bg-gray-50/60 dark:bg-white/5">
                          <td colSpan={10} className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1">
                              <span>Tipo / subtipo cotizante: {f.tipoCotizante} / {f.subtipoCotizante}</span>
                              <span>EPS: {f.eps || '—'} · AFP: {f.afp || '—'} · Caja: {r.lines.find((l) => l.ccf)?.ccf || '—'}</span>
                              <span>ARL: clase {r.lines.find((l) => l.claseRiesgo)?.claseRiesgo || '—'} · centro {r.lines.find((l) => Number(l.centroTrabajo) > 0)?.centroTrabajo || '—'}</span>
                              <span>Actividad ARL: {r.lines.find((l) => Number(l.actividadArl) > 0)?.actividadArl || '—'}</span>
                              <span>Exonerado (Art. 114-1): {f.exonerado}</span>
                              <span>Municipio: {f.departamento}{f.municipio}</span>
                              {f.fechaIng && <span>Ingreso: {f.fechaIng}</span>}
                              {f.fechaRet && <span>Retiro: {f.fechaRet}</span>}
                            </div>
                            <div className="mt-3 overflow-x-auto">
                              <table className="min-w-full">
                                <thead className="text-gray-500">
                                  <tr>
                                    <th className="text-left pr-3 py-1">Línea</th><th className="text-left pr-3 py-1">Fechas</th>
                                    <th className="text-center pr-3 py-1">Días AFP/EPS/ARL/CCF</th><th className="text-right pr-3 py-1">IBC</th>
                                    <th className="text-right pr-3 py-1">Pensión</th><th className="text-right pr-3 py-1">Salud</th>
                                    <th className="text-right pr-3 py-1">ARL</th><th className="text-right pr-3 py-1">Caja</th><th className="text-right py-1">Horas</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.lines.map((l, li) => (
                                    <tr key={li} className="border-t border-gray-100 dark:border-white/10">
                                      <td className="pr-3 py-1 font-medium">{lineLabel(l)}</td>
                                      <td className="pr-3 py-1">{lineDates(l) || '—'}</td>
                                      <td className="pr-3 py-1 text-center font-mono">{l.diasAfp}/{l.diasEps}/{l.diasArl}/{l.diasCcf}</td>
                                      <td className="pr-3 py-1 text-right">{formatCurrency(l.ibcEps)}</td>
                                      <td className="pr-3 py-1 text-right">{formatCurrency((l.cotizacionAfp || 0) + (l.fsp || 0) + (l.fsps || 0))} <span className="text-gray-400">({pct(l.tarifaAfp)})</span></td>
                                      <td className="pr-3 py-1 text-right">{formatCurrency(l.cotizacionEps)} <span className="text-gray-400">({pct(l.tarifaEps)})</span></td>
                                      <td className="pr-3 py-1 text-right">{formatCurrency(l.cotizacionArl)}</td>
                                      <td className="pr-3 py-1 text-right">{formatCurrency(l.aporteCcf)}</td>
                                      <td className="py-1 text-right">{l.horasLaboradas}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {r.warnings.length > 0 && (
                              <ul className="mt-2 list-disc pl-5 text-amber-700 dark:text-amber-400">
                                {r.warnings.map((w) => <li key={w}>{w}</li>)}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data && totalWarnings === 0 && rows.length > 0 && (
          <p className="text-sm text-green-700 dark:text-green-400">Sin avisos: la planilla tiene todos los datos requeridos.</p>
        )}
      </div>
      <PilaImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} onApplied={load} />
      <PilaExcelTemplateModal isOpen={templateOpen} onClose={() => setTemplateOpen(false)} />
    </Layout>
  );
}
