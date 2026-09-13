// frontend/src/pages/payroll/PayrollCertificatesPage.jsx
//
// Certificado de Ingresos y Retenciones anual (mejora #6, base para el
// Formulario 220) — reporte de solo lectura sobre PayrollDocument ya
// aceptados por la DIAN, agregado por empleado y año fiscal. No hay
// escritura aquí, por eso no tiene un store dedicado (mismo criterio que
// PayrollSettingsPage para lo simple, pero sin necesidad de persistir
// cambios) — estado local + payrollCertificatesAPI directamente.
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { payrollCertificatesAPI } from '../../api/payroll';
import { downloadFile } from '../../utils/helpers';
import Layout from '../../components/layout/Layout';
import {
  ArrowPathIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const formatCurrencyCOP = (value) =>
  Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const employeeName = (emp) => [emp.first_name, emp.first_surname].filter(Boolean).join(' ');

const PayrollCertificatesPage = () => {
  const [year, setYear] = useState(currentYear - 1);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [summaries, setSummaries] = useState({}); // employee_id -> resumen ya cargado
  const [loadingSummaryId, setLoadingSummaryId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchAvailable = async () => {
    setIsLoading(true);
    try {
      const response = await payrollCertificatesAPI.getAvailable(year);
      setRows(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al listar los certificados disponibles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailable();
    setExpandedId(null);
  }, [year]);

  const toggleExpand = async (employeeId) => {
    if (expandedId === employeeId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(employeeId);
    if (!summaries[employeeId]) {
      setLoadingSummaryId(employeeId);
      try {
        const response = await payrollCertificatesAPI.getSummary(employeeId, year);
        setSummaries((prev) => ({ ...prev, [employeeId]: response.data }));
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error al calcular el resumen del certificado');
      } finally {
        setLoadingSummaryId(null);
      }
    }
  };

  const handleDownload = async (employeeId, empName) => {
    setDownloadingId(employeeId);
    try {
      const response = await payrollCertificatesAPI.downloadPdf(employeeId, year);
      downloadFile(response.data, `Certificado-Ingresos-Retenciones-${year}-${empName.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      toast.error('No se pudo descargar el certificado. ¿El empleado tiene documentos aceptados en ese año?');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Certificados de Ingresos y Retenciones</h1>
            <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">
              Base para el Formulario 220, calculada sobre los Documentos Soporte de Pago de Nómina ya aceptados por la DIAN
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-500">Año gravable</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={fetchAvailable}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex-shrink-0"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Aviso */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
          Este certificado resume, en la estructura del Formulario 220 vigente, los valores ya reportados en los documentos de nómina emitidos durante el año.
          La separación entre ingresos gravados y no gravados/exentos es informativa — verifíquela contra la normativa vigente antes de entregarla como certificado oficial firmado.
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
          {isLoading && !rows.length ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <ArrowPathIcon className="h-6 w-6 animate-spin" />
              <span className="text-sm">Cargando certificados disponibles...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <DocumentTextIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ningún empleado tiene documentos de nómina aceptados por la DIAN en {year}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-graphite-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Empleado</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Documentos</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Total devengado</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Neto pagado</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Certificado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {rows.map((row) => {
                    const empName = employeeName(row.employee);
                    const isExpanded = expandedId === row.employee_id;
                    const summary = summaries[row.employee_id];
                    return (
                      <React.Fragment key={row.employee_id}>
                        <tr
                          onClick={() => toggleExpand(row.employee_id)}
                          className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {isExpanded ? (
                                <ChevronUpIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              )}
                              <p className="font-semibold text-gray-900 dark:text-gray-100">{empName}</p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500 ml-5">{row.employee.document_number}</p>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap text-gray-600 dark:text-gray-400">{row.documentsCount}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap text-gray-800 dark:text-gray-200">{formatCurrencyCOP(row.totalDevengados)}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-gray-900 dark:text-gray-100">{formatCurrencyCOP(row.totalNeto)}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDownload(row.employee_id, empName)}
                              disabled={downloadingId === row.employee_id}
                              title="Descargar certificado en PDF"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                            >
                              <ArrowDownTrayIcon className={`h-3.5 w-3.5 ${downloadingId === row.employee_id ? 'animate-pulse' : ''}`} />
                              PDF
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50/60 dark:bg-white/5">
                            <td colSpan={5} className="px-4 py-4">
                              {loadingSummaryId === row.employee_id || !summary ? (
                                <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
                                  <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                                  Calculando resumen...
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Ingresos</p>
                                    <dl className="space-y-1">
                                      <div className="flex justify-between"><dt className="text-gray-500">Ingresos laborales gravados</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(summary.ingresos.ingresosLaboralesGravados)}</dd></div>
                                      <div className="flex justify-between"><dt className="text-gray-500">Auxilio de transporte</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(summary.ingresos.auxilioTransporte)}</dd></div>
                                      <div className="flex justify-between"><dt className="text-gray-500">Cesantías e intereses</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(summary.ingresos.cesantiasEIntereses)}</dd></div>
                                      <div className="flex justify-between"><dt className="text-gray-500">Indemnizaciones</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(summary.ingresos.indemnizacion)}</dd></div>
                                    </dl>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Deducciones y retenciones</p>
                                    <dl className="space-y-1">
                                      <div className="flex justify-between"><dt className="text-gray-500">Aportes obligatorios salud</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(summary.deducciones.aportesSalud)}</dd></div>
                                      <div className="flex justify-between"><dt className="text-gray-500">Aportes obligatorios pensión + FSP</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(summary.deducciones.aportesPensionObligatoria)}</dd></div>
                                      <div className="flex justify-between"><dt className="text-gray-500">Aportes voluntarios pensión</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(summary.deducciones.aportesPensionVoluntaria)}</dd></div>
                                      <div className="flex justify-between"><dt className="text-gray-500">Aportes AFC</dt><dd className="text-gray-800 dark:text-gray-200">{formatCurrencyCOP(summary.deducciones.aportesAFC)}</dd></div>
                                      <div className="flex justify-between font-semibold"><dt className="text-gray-700 dark:text-gray-300">Retención en la fuente</dt><dd className="text-gray-900 dark:text-gray-100">{formatCurrencyCOP(summary.deducciones.retencionFuente)}</dd></div>
                                    </dl>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-graphite-2 border-t-2 border-gray-200 dark:border-white/10 text-sm">
                    <td colSpan={5} className="px-4 py-3 text-gray-500 dark:text-gray-500">
                      {rows.length} empleado{rows.length !== 1 ? 's' : ''} con certificado disponible en {year}
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

export default PayrollCertificatesPage;
