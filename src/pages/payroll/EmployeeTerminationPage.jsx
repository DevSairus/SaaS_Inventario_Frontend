// frontend/src/pages/payroll/EmployeeTerminationPage.jsx
//
// Liquidación definitiva / finiquito (Mejoras-Nomina-Sin-PILA-Nexora.md,
// punto #7) — lista los empleados con `termination_date` registrada y
// permite revisar el cálculo (cesantías, intereses, prima, vacaciones
// pendientes) antes de emitir el Documento Soporte de Nómina de la
// liquidación a la DIAN. Sin store propio — mismo criterio que
// PayrollCertificatesPage.jsx: es una pantalla de consulta + una acción
// de emisión puntual por empleado, no un CRUD.
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { payrollTerminationAPI } from '../../api/payroll';
import Layout from '../../components/layout/Layout';
import {
  ArrowPathIcon,
  UserMinusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

const formatCurrencyCOP = (value) =>
  Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Panel de detalle de UN empleado: carga el preview con los montos de
// indemnización/bonifRetiro actuales cada vez que cambian (recalcula al
// salir del campo, no en cada tecla, para no golpear el backend).
const TerminationDetailPanel = ({ item, onEmitted }) => {
  const [indemnizacion, setIndemnizacion] = useState('0');
  const [bonifRetiro, setBonifRetiro] = useState('0');
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmitting, setIsEmitting] = useState(false);

  const fetchPreview = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await payrollTerminationAPI.preview(item.employee_id, {
        indemnizacion: Number(indemnizacion) || 0,
        bonifRetiro: Number(bonifRetiro) || 0,
      });
      setPreview(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al calcular la liquidación');
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.employee_id]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleEmit = async () => {
    if (!window.confirm(`¿Emitir la liquidación definitiva de ${item.employee_name} a la DIAN? Esta acción genera y firma el documento — no se puede deshacer.`)) {
      return;
    }
    setIsEmitting(true);
    try {
      const response = await payrollTerminationAPI.emit(item.employee_id, {
        indemnizacion: Number(indemnizacion) || 0,
        bonifRetiro: Number(bonifRetiro) || 0,
      });
      if (response.success) {
        toast.success(response.message || 'Liquidación emitida');
        onEmitted?.();
      } else {
        // 207 — la DIAN rechazó, axios no lanza (2xx) pero success=false
        toast.error(response.message || 'La DIAN no aceptó el documento');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al emitir la liquidación');
    } finally {
      setIsEmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-xs py-6">
        <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
        Calculando liquidación...
      </div>
    );
  }
  if (!preview) return null;

  const { breakdown, resumen, netoTotal } = preview;

  return (
    <div className="space-y-4">
      {breakdown.notasLimitaciones?.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
          {breakdown.notasLimitaciones.map((nota, i) => (
            <p key={i} className="flex gap-1.5"><ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> {nota}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Prestaciones causadas</p>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt className="text-gray-500">Cesantías ({breakdown.cesantias.dias} días)</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(breakdown.cesantias.cesantias)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Intereses a las cesantías</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(breakdown.cesantias.intereses)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Prima proporcional ({breakdown.prima.dias} días, sem. {breakdown.prima.semestre})</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(breakdown.prima.prima)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Vacaciones pendientes ({breakdown.vacaciones.diasPendientes} de {breakdown.vacaciones.diasCausados} días causados)</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(breakdown.vacaciones.valor)}</dd></div>
          </dl>
        </div>
        <div>
          <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Monto manual (opcional)</p>
          <div className="space-y-2">
            <label className="block">
              <span className="text-gray-500">Indemnización</span>
              <input
                type="number" min="0" value={indemnizacion}
                onChange={(e) => setIndemnizacion(e.target.value)}
                onBlur={fetchPreview}
                className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-xs"
              />
            </label>
            <label className="block">
              <span className="text-gray-500">Bonificación por retiro</span>
              <input
                type="number" min="0" value={bonifRetiro}
                onChange={(e) => setBonifRetiro(e.target.value)}
                onBlur={fetchPreview}
                className="mt-0.5 w-full px-2 py-1.5 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-xs"
              />
            </label>
            <p className="text-[11px] text-gray-400">Depende de la causa del retiro — no se calcula automáticamente. Cambie el valor y salga del campo para recalcular.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-white/10 pt-3">
        <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1.5 text-xs">
          Comprobante completo ({formatDate(breakdown.rangoSalarioPendiente.inicio)} — {formatDate(breakdown.rangoSalarioPendiente.fin)})
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <dl className="space-y-1">
            {resumen.devengadosLines.map((line, i) => (
              <div key={i} className="flex justify-between"><dt className="text-gray-500">{line.label}</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(line.amount)}</dd></div>
            ))}
          </dl>
          <dl className="space-y-1">
            {resumen.deduccionesLines.map((line, i) => (
              <div key={i} className="flex justify-between"><dt className="text-gray-500">{line.label}</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(line.amount)}</dd></div>
            ))}
          </dl>
        </div>
        <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-gray-200 dark:border-white/10">
          <span className="text-gray-700 dark:text-gray-300">Neto a pagar</span>
          <span className="text-gray-900 dark:text-gray-100">{formatCurrencyCOP(netoTotal)}</span>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleEmit}
          disabled={isEmitting || item.already_settled}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <PaperAirplaneIcon className={`h-4 w-4 ${isEmitting ? 'animate-pulse' : ''}`} />
          {item.already_settled ? 'Ya emitida' : isEmitting ? 'Emitiendo...' : 'Emitir a la DIAN'}
        </button>
      </div>
    </div>
  );
};

const EmployeeTerminationPage = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchPending = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await payrollTerminationAPI.getPending();
      setItems(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al listar los retiros pendientes de liquidar');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const toggleExpand = (employeeId) => {
    setExpandedId((prev) => (prev === employeeId ? null : employeeId));
  };

  const pendingCount = items.filter((i) => !i.already_settled).length;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Liquidación definitiva</h1>
            <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">
              Cesantías, intereses, prima y vacaciones pendientes al retirar un empleado — emite el Documento Soporte de Nómina de la liquidación a la DIAN
            </p>
          </div>
          <button
            onClick={fetchPending}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex-shrink-0"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>

        <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
          {isLoading && !items.length ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <ArrowPathIcon className="h-6 w-6 animate-spin" />
              <span className="text-sm">Buscando empleados retirados...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <UserMinusIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ningún empleado tiene fecha de retiro registrada todavía</p>
              <p className="text-xs mt-1">Regístrela editando al empleado en Empleados antes de liquidarlo aquí</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-graphite-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Empleado</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Fecha de retiro</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {items.map((item) => {
                    const isExpanded = expandedId === item.employee_id;
                    return (
                      <React.Fragment key={item.employee_id}>
                        <tr
                          onClick={() => toggleExpand(item.employee_id)}
                          className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {isExpanded ? (
                                <ChevronUpIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              )}
                              <p className="font-semibold text-gray-900 dark:text-gray-100">{item.employee_name}</p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 ml-5">{item.document_number}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{formatDate(item.termination_date)}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {item.already_settled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                <CheckCircleIcon className="h-3.5 w-3.5" /> Liquidada
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                Pendiente
                              </span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50/60 dark:bg-white/5">
                            <td colSpan={3} className="px-4 py-4">
                              <TerminationDetailPanel item={item} onEmitted={fetchPending} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-graphite-2 border-t-2 border-gray-200 dark:border-white/10 text-sm">
                    <td colSpan={3} className="px-4 py-3 text-gray-500 dark:text-gray-500">
                      {pendingCount} de {items.length} retiro{items.length !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de liquidar
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default EmployeeTerminationPage;
