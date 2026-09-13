// frontend/src/pages/payroll/PayrollDocumentsPage.jsx
//
// Listado global de PayrollDocument (Documento Soporte de Pago de Nómina
// Electrónica) — solo lectura + navegación al detalle, donde vive la Nota
// de Ajuste. La vista "por periodo" ya existe embebida en
// PayrollPeriodDetailPage.jsx; esta es la vista transversal (todos los
// periodos/empleados) que menciona el comentario de cabecera de
// payrollDocuments.controller.js.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePayrollDocumentsStore } from '../../store/payrollDocumentsStore';
import { payrollPeriodsAPI, employeesAPI } from '../../api/payroll';
import Layout from '../../components/layout/Layout';
import { DIAN_DOCUMENT_STATUSES } from '../../constants/payroll';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const DIAN_BADGE_STYLES = {
  gray: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

const dianStatusInfo = (value) => DIAN_DOCUMENT_STATUSES.find((s) => s.value === value) || { label: value, color: 'gray' };

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrencyCOP = (value) =>
  Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const PayrollDocumentsPage = () => {
  const navigate = useNavigate();
  const {
    documents, isLoading, pagination, filters,
    fetchDocuments, setFilters, setPage, downloadXml, downloadPdf,
  } = usePayrollDocumentsStore();

  const [periods, setPeriods] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');

  // Catálogos para los <select> de filtro — se cargan una sola vez, no son
  // paginados aquí a propósito (son listas de referencia, no el listado
  // principal de la página).
  useEffect(() => {
    payrollPeriodsAPI.getAll({ limit: 100 }).then((r) => setPeriods(r.data || [])).catch(() => {});
    employeesAPI.getAll({ limit: 500, sort_by: 'first_name', sort_order: 'ASC' }).then((r) => setEmployees(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setFilters({ search, dian_status: filterStatus, payroll_period_id: filterPeriod, employee_id: filterEmployee });
  }, [search, filterStatus, filterPeriod, filterEmployee]);

  useEffect(() => {
    fetchDocuments();
  }, [filters, pagination.page]);

  const activeFilterCount = [filterStatus, filterPeriod, filterEmployee].filter(Boolean).length;
  const clearAll = () => { setSearch(''); setFilterStatus(''); setFilterPeriod(''); setFilterEmployee(''); };

  const periodLabel = (p) => `${formatDate(p.start_date)} – ${formatDate(p.end_date)}`;

  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Documentos de Nómina</h1>
          <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">Documentos Soporte de Pago de Nómina Electrónica emitidos a la DIAN</p>
        </div>

        {/* Búsqueda + filtros */}
        <div className="bg-white dark:bg-graphite shadow rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por número de documento o CUNE..."
                className="w-full pl-9 pr-9 py-2.5 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                activeFilterCount > 0 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{activeFilterCount}</span>
              )}
            </button>

            <button
              onClick={() => fetchDocuments()}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex-shrink-0"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-white/10">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-500 mb-1">Estado DIAN</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
                >
                  <option value="">Todos</option>
                  {DIAN_DOCUMENT_STATUSES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-500 mb-1">Periodo</label>
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
                >
                  <option value="">Todos</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>{periodLabel(p)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-500 mb-1">Empleado</label>
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
                >
                  <option value="">Todos</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {[emp.first_name, emp.first_surname].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
          {isLoading && !documents.length ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <ArrowPathIcon className="h-6 w-6 animate-spin" />
              <span className="text-sm">Cargando documentos...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <DocumentTextIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se encontraron documentos</p>
              {(search || activeFilterCount > 0) && (
                <button onClick={clearAll} className="mt-2 text-blue-600 text-sm hover:underline">Limpiar filtros</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-graphite-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Empleado</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Periodo</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Número</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Estado DIAN</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-gray-50 dark:bg-graphite-2 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">Descargas</th>
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
                        className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{empName}</p>
                            <ChevronRightIcon className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400 text-xs">
                          {doc.period ? periodLabel(doc.period) : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-600 dark:text-gray-400 text-xs">{doc.payroll_document_number || '—'}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-gray-800 dark:text-gray-200">{formatCurrencyCOP(doc.comprobante_total)}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${DIAN_BADGE_STYLES[info.color] || DIAN_BADGE_STYLES.gray}`}>
                            {info.label}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-white dark:bg-graphite group-hover:bg-slate-50 dark:group-hover:bg-white/5 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => downloadXml(doc.id, `${doc.payroll_document_number || doc.id}.xml`)}
                              title="Descargar XML"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => downloadPdf(doc.id, `${doc.payroll_document_number || doc.id}.pdf`)}
                              title="Descargar PDF"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-graphite-2 border-t-2 border-gray-200 dark:border-white/10 text-sm">
                    <td colSpan={6} className="px-4 py-3 text-gray-500 dark:text-gray-500">
                      {pagination.total} documento{pagination.total !== 1 ? 's' : ''}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Paginación */}
          {!isLoading && pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-500">
                {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1.5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PayrollDocumentsPage;
