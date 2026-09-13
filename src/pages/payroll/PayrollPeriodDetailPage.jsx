// frontend/src/pages/payroll/PayrollPeriodDetailPage.jsx
//
// Vista de trabajo de un periodo: avanzar su estado (abierto -> liquidado
// -> emitido -> cerrado), capturar novedades por empleado antes de liquidar,
// y ver los Documentos Soporte de Nómina ya generados para el periodo (ver
// comentario de cabecera de payrollDocuments.controller.js: esta es la
// "vista de liquidación dentro de PayrollPeriodsPage.jsx" a la que se
// refiere).
//
// Los empleados se traen directo con employeesAPI (no vía employeesStore)
// a propósito: employeesStore es un listado paginado/global que alimenta
// EmployeesPage, y aquí necesitamos "todos los activos de la sede del
// periodo" sin pisar esos filtros/paginación compartidos.
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePayrollPeriodsStore } from '../../store/payrollPeriodsStore';
import { usePayrollNovedadesStore } from '../../store/payrollNovedadesStore';
import { usePayrollDocumentsStore } from '../../store/payrollDocumentsStore';
import { employeesAPI } from '../../api/payroll';
import useBranchStore from '../../store/branchStore';
import Layout from '../../components/layout/Layout';
import PayrollPeriodModal from '../../components/payroll/PayrollPeriodModal';
import PayrollNovedadModal from '../../components/payroll/PayrollNovedadModal';
import {
  ArrowLeftIcon,
  PencilIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  ArrowRightIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalculatorIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import {
  PERIOD_TYPES,
  PERIOD_STATUSES,
  DIAN_DOCUMENT_STATUSES,
  NOVEDAD_CATEGORIES_BY_VALUE,
  getNextPeriodStatus,
} from '../../constants/payroll';

const periodTypeLabel = (value) => PERIOD_TYPES.find((p) => p.value === value)?.label || value;
const statusLabel = (value) => PERIOD_STATUSES.find((s) => s.value === value)?.label || value;
const dianStatusInfo = (value) => DIAN_DOCUMENT_STATUSES.find((s) => s.value === value) || { label: value, color: 'gray' };

const STATUS_STYLES = {
  abierto: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  liquidado: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  emitido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cerrado: 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-400',
};

const DIAN_BADGE_STYLES = {
  gray: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatCurrencyCOP = (value) =>
  Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const ADVANCE_CONFIRM_TEXT = {
  liquidado: 'Se calculará el valor a pagar de cada empleado con esta periodicidad (según su salario y las novedades registradas), sin enviar nada a la DIAN todavía. ¿Continuar?',
  emitido: 'Esto liquidará y enviará a la DIAN el Documento Soporte de cada empleado ACTIVO del periodo. Puede tardar unos segundos por empleado. Si algún empleado es rechazado, el periodo se queda en "liquidado" y los ya aceptados no se reenvían al reintentar. ¿Continuar?',
  cerrado: '¿Cerrar el periodo? Esta es la última transición posible.',
};

const PayrollPeriodDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    period, isLoading: periodLoading, emissionResult, liquidationPreview,
    fetchPeriodById, changeStatus, clearPeriod, clearEmissionResult, recalculatePreview,
  } = usePayrollPeriodsStore();

  const {
    novedades, isLoading: novedadesLoading,
    fetchNovedades, deleteNovedad, clearNovedades, copyNovedadesFromPrevious,
  } = usePayrollNovedadesStore();

  const {
    documents, isLoading: documentsLoading,
    setFilters: setDocumentFilters, fetchDocuments, clearDocument,
    downloadXml, downloadPdf,
  } = usePayrollDocumentsStore();

  const { branches, fetchBranches, loaded: branchesLoaded } = useBranchStore();

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNovedadModalOpen, setIsNovedadModalOpen] = useState(false);
  const [novedadDefaultEmployee, setNovedadDefaultEmployee] = useState('');
  const [advancing, setAdvancing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [copyingNovedades, setCopyingNovedades] = useState(false);
  const [expandedPreviewIds, setExpandedPreviewIds] = useState(() => new Set());

  // Solo trae los empleados a los que este periodo realmente les
  // corresponde: activos, de la sede del periodo (si tiene una), y con la
  // MISMA periodicidad de pago que period.period_type — espejo exacto del
  // filtro que aplica el backend en getEmployeesActiveInPeriod() al
  // liquidar/emitir, para que la lista que ve el usuario aquí sea
  // consistente con a quién realmente se le va a liquidar.
  const loadEmployees = useCallback(async (branchId, periodType) => {
    setEmployeesLoading(true);
    try {
      const response = await employeesAPI.getAll({
        is_active: true,
        branch_id: branchId || undefined,
        payroll_periodicity: periodType || undefined,
        limit: 200,
        sort_by: 'first_name',
        sort_order: 'ASC',
      });
      setEmployees(response.data || []);
    } catch {
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!branchesLoaded) fetchBranches();
  }, [branchesLoaded]);

  useEffect(() => {
    if (!id) return;
    fetchPeriodById(id);
    fetchNovedades({ payrollPeriodId: id });
    setDocumentFilters({ payroll_period_id: id });
    return () => {
      clearPeriod();
      clearNovedades();
      clearEmissionResult();
      clearDocument();
    };
  }, [id]);

  useEffect(() => {
    fetchDocuments();
  }, [id]);

  useEffect(() => {
    if (period) loadEmployees(period.branch_id, period.period_type);
  }, [period?.branch_id, period?.period_type, loadEmployees]);

  const branchName = (bid) => branches.find((b) => b.id === bid)?.name;
  const novedadesByEmployee = (employeeId) => novedades.filter((n) => n.employee_id === employeeId);

  const handleOpenNovedad = (employeeId = '') => {
    setNovedadDefaultEmployee(employeeId);
    setIsNovedadModalOpen(true);
  };

  const handleCopyNovedades = async () => {
    if (novedades.length > 0) {
      if (!window.confirm('Este periodo ya tiene novedades. Copiar del periodo anterior las agrega sin borrar las existentes y puede duplicar si ya copió antes. ¿Continuar?')) return;
    } else if (!window.confirm('¿Copiar las novedades del periodo anterior (misma sede y periodicidad) a este periodo?')) {
      return;
    }
    setCopyingNovedades(true);
    const result = await copyNovedadesFromPrevious(id);
    setCopyingNovedades(false);
    if (result?.data?.copied > 0 && period.status === 'liquidado') recalculatePreview(id);
  };

  const handleDeleteNovedad = async (novedad) => {
    if (!window.confirm('¿Eliminar esta novedad?')) return;
    await deleteNovedad(novedad.id);
    if (period.status === 'liquidado') recalculatePreview(id);
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    await recalculatePreview(id);
    setRecalculating(false);
  };

  const nextStatus = period ? getNextPeriodStatus(period.status) : null;

  const togglePreviewRow = (employeeId) => {
    setExpandedPreviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId); else next.add(employeeId);
      return next;
    });
  };

  const handleAdvance = async () => {
    if (!nextStatus) return;
    const confirmText = ADVANCE_CONFIRM_TEXT[nextStatus] || `¿Pasar el periodo a "${nextStatus}"?`;
    if (!window.confirm(confirmText)) return;

    setAdvancing(true);
    const result = await changeStatus(id, nextStatus);
    setAdvancing(false);

    if (result.success) {
      await fetchDocuments();
    }
  };

  if (periodLoading && !period) {
    return (
      <Layout>
        <div className="flex items-center justify-center gap-3 py-24 text-gray-400">
          <ArrowPathIcon className="h-6 w-6 animate-spin" />
          <span className="text-sm">Cargando periodo...</span>
        </div>
      </Layout>
    );
  }

  if (!period) {
    return (
      <Layout>
        <div className="py-24 text-center text-gray-400">
          <p className="text-sm">Periodo no encontrado</p>
          <Link to="/payroll/periods" className="mt-2 inline-block text-blue-600 text-sm hover:underline">
            Volver a periodos
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/payroll/periods')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 mb-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Periodos
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatDate(period.start_date)} – {formatDate(period.end_date)}
                </h1>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[period.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel(period.status)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">
                {periodTypeLabel(period.period_type)} · {branchName(period.branch_id) || 'Todas las sedes'}
                {period.payment_date && <> · Pago: {formatDate(period.payment_date)}</>}
              </p>
              {period.notes && <p className="text-sm text-gray-400 mt-1 max-w-xl">{period.notes}</p>}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {period.status === 'abierto' && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <PencilIcon className="h-4 w-4" />
                  Editar
                </button>
              )}
              {nextStatus && (
                <button
                  onClick={handleAdvance}
                  disabled={advancing || periodLoading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {advancing ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightIcon className="h-4 w-4" />
                  )}
                  Avanzar a "{statusLabel(nextStatus)}"
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Resultado de emisión parcial (207) */}
        {emissionResult?.results && (
          <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden border border-amber-200 dark:border-amber-800/40">
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">
                Algunos empleados no fueron aceptados por la DIAN. El periodo permanece en "liquidado" — corrija y presione
                "Avanzar" de nuevo (los ya aceptados no se reenvían).
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-graphite-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-2 text-left">Empleado</th>
                    <th className="px-4 py-2 text-center">Resultado</th>
                    <th className="px-4 py-2 text-left">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {emissionResult.results.map((r) => (
                    <tr key={r.employeeId}>
                      <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{r.employeeName}</td>
                      <td className="px-4 py-2 text-center">
                        {r.accepted ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                            <CheckCircleIcon className="h-4 w-4" /> Aceptado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-500 text-xs font-semibold">
                            <XCircleIcon className="h-4 w-4" /> Rechazado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs">{r.error || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vista previa de liquidación (calculada al pasar a "liquidado") */}
        {liquidationPreview?.employees?.length > 0 && (
          <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CalculatorIcon className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Vista previa de liquidación</h2>
              </div>
              <div className="flex items-center gap-3">
                {period.liquidation_preview_at && (
                  <span className="text-xs text-gray-400">Calculada: {formatDateTime(period.liquidation_preview_at)}</span>
                )}
                {period.status === 'liquidado' && (
                  <button
                    onClick={handleRecalculate}
                    disabled={recalculating}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-gray-300 dark:border-white/10 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
                  >
                    <ArrowPathIcon className={`h-3.5 w-3.5 ${recalculating ? 'animate-spin' : ''}`} />
                    Recalcular
                  </button>
                )}
              </div>
            </div>

            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs">
              Esto es un cálculo informativo — todavía no se ha enviado nada a la DIAN. Se recalcula solo al agregar o
              borrar una novedad; si necesita forzarlo, use "Recalcular". "Emitir" siempre vuelve a calcular con los
              datos más recientes, así que aunque esta vista quede desactualizada, lo que se envía a la DIAN es correcto.
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-graphite-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-2 text-left w-8" />
                    <th className="px-4 py-2 text-left">Empleado</th>
                    <th className="px-4 py-2 text-right">Devengado</th>
                    <th className="px-4 py-2 text-right">Deducciones</th>
                    <th className="px-4 py-2 text-right">Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {liquidationPreview.employees.map((row) => {
                    const isExpanded = expandedPreviewIds.has(row.employeeId);
                    return (
                      <React.Fragment key={row.employeeId}>
                        <tr
                          onClick={() => togglePreviewRow(row.employeeId)}
                          className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-2 text-gray-400">
                            {isExpanded ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
                          </td>
                          <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{row.employeeName}</td>
                          <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrencyCOP(row.devengadosTotal)}</td>
                          <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{formatCurrencyCOP(row.deduccionesTotal)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrencyCOP(row.netoTotal)}</td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="px-4 pb-3 pt-0 bg-gray-50/60 dark:bg-graphite-2/60">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-8 text-xs">
                                <div>
                                  <p className="font-semibold text-gray-400 uppercase tracking-wide mb-1">Devengados</p>
                                  {row.lines?.devengadosLines?.length ? row.lines.devengadosLines.map((line, i) => (
                                    <div key={i} className="flex justify-between py-0.5 text-gray-600 dark:text-gray-400">
                                      <span>{line.label}</span>
                                      <span>{formatCurrencyCOP(line.amount)}</span>
                                    </div>
                                  )) : <p className="text-gray-400">Sin devengados</p>}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-400 uppercase tracking-wide mb-1">Deducciones</p>
                                  {row.lines?.deduccionesLines?.length ? row.lines.deduccionesLines.map((line, i) => (
                                    <div key={i} className="flex justify-between py-0.5 text-gray-600 dark:text-gray-400">
                                      <span>{line.label}</span>
                                      <span>{formatCurrencyCOP(line.amount)}</span>
                                    </div>
                                  )) : <p className="text-gray-400">Sin deducciones</p>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-graphite-2 border-t-2 border-gray-200 dark:border-white/10 font-semibold">
                    <td />
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                      Total ({liquidationPreview.totals.count} empleado{liquidationPreview.totals.count !== 1 ? 's' : ''})
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-800 dark:text-gray-200">{formatCurrencyCOP(liquidationPreview.totals.devengados)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-800 dark:text-gray-200">{formatCurrencyCOP(liquidationPreview.totals.deducciones)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-900 dark:text-gray-100">{formatCurrencyCOP(liquidationPreview.totals.neto)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Empleados y novedades */}
        <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Empleados activos · {periodTypeLabel(period.period_type)}{branchName(period.branch_id) ? ` — ${branchName(period.branch_id)}` : ''}
              </h2>
            </div>
            {['abierto', 'liquidado'].includes(period.status) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyNovedades}
                  disabled={copyingNovedades}
                  title="Copiar las novedades del periodo anterior (misma sede y periodicidad)"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-white/10 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
                >
                  <DocumentDuplicateIcon className={`h-3.5 w-3.5 ${copyingNovedades ? 'animate-pulse' : ''}`} />
                  Copiar del periodo anterior
                </button>
                <button
                  onClick={() => handleOpenNovedad()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-white/10 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Nueva novedad
                </button>
              </div>
            )}
          </div>

          {employeesLoading || novedadesLoading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando empleados...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-sm">
                No hay empleados activos con periodicidad "{periodTypeLabel(period.period_type)}"
                {branchName(period.branch_id) ? ` en ${branchName(period.branch_id)}` : ''}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {employees.map((emp) => {
                const empNovedades = novedadesByEmployee(emp.id);
                const fullName = [emp.first_name, emp.first_surname].filter(Boolean).join(' ');
                return (
                  <div key={emp.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                          {emp.first_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{fullName}</p>
                          <p className="text-xs text-gray-400">
                            {formatCurrencyCOP(emp.base_salary)}
                            {empNovedades.length > 0 && (
                              <span className="ml-2 text-blue-500">· {empNovedades.length} novedad{empNovedades.length !== 1 ? 'es' : ''}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {['abierto', 'liquidado'].includes(period.status) && (
                        <button
                          onClick={() => handleOpenNovedad(emp.id)}
                          title="Agregar novedad"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex-shrink-0"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {empNovedades.length > 0 && (
                      <div className="mt-2 ml-11 space-y-1">
                        {empNovedades.map((n) => (
                          <div key={n.id} className="flex items-center justify-between gap-2 text-xs bg-gray-50 dark:bg-graphite-2 rounded-lg px-3 py-1.5">
                            <span className="text-gray-600 dark:text-gray-400 truncate">
                              {n.dian_category
                                ? (NOVEDAD_CATEGORIES_BY_VALUE[n.dian_category]?.label || n.dian_category)
                                : `Días no remunerados: ${n.unpaid_days}`}
                              {n.notes && <span className="text-gray-400"> — {n.notes}</span>}
                            </span>
                            {['abierto', 'liquidado'].includes(period.status) && (
                              <button
                                onClick={() => handleDeleteNovedad(n)}
                                className="text-gray-400 hover:text-red-500 flex-shrink-0"
                                title="Eliminar novedad"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Documentos DIAN del periodo */}
        <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
            <DocumentTextIcon className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Documentos Soporte de Nómina</h2>
          </div>

          {documentsLoading && !documents.length ? (
            <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando documentos...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-sm">Todavía no se ha emitido ningún documento para este periodo</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-graphite-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-2 text-left">Empleado</th>
                    <th className="px-4 py-2 text-left">Número</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-center">Estado DIAN</th>
                    <th className="px-4 py-2 text-center">Descargas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {documents.map((doc) => {
                    const info = dianStatusInfo(doc.dian_status);
                    const empName = doc.employee
                      ? [doc.employee.first_name, doc.employee.first_surname].filter(Boolean).join(' ')
                      : '—';
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => navigate(`/payroll/documents/${doc.id}`)}
                        className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">{empName}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-500">{doc.payroll_document_number || '—'}</td>
                        <td className="px-4 py-2.5 text-right text-gray-800 dark:text-gray-200">{formatCurrencyCOP(doc.comprobante_total)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${DIAN_BADGE_STYLES[info.color] || DIAN_BADGE_STYLES.gray}`}>
                            {info.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => downloadXml(doc.id, `${doc.payroll_document_number || doc.id}.xml`)}
                              title="Descargar XML"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                              <span className="sr-only">XML</span>
                            </button>
                            <button
                              onClick={() => downloadPdf(doc.id, `${doc.payroll_document_number || doc.id}.pdf`)}
                              title="Descargar PDF"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                              <span className="sr-only">PDF</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <PayrollPeriodModal isOpen={isEditModalOpen} period={period} onClose={() => setIsEditModalOpen(false)} />
      )}
      {isNovedadModalOpen && (
        <PayrollNovedadModal
          isOpen={isNovedadModalOpen}
          employees={employees}
          defaultEmployeeId={novedadDefaultEmployee}
          payrollPeriodId={id}
          onClose={() => setIsNovedadModalOpen(false)}
          onSuccess={() => { if (period.status === 'liquidado') recalculatePreview(id); }}
        />
      )}
    </Layout>
  );
};

export default PayrollPeriodDetailPage;
