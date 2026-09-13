// frontend/src/pages/payroll/PayrollPeriodsPage.jsx
//
// Listado de periodos de nómina — mismo espíritu visual que
// EmployeesPage.jsx/PayrollConceptsPage.jsx. Cada fila navega al detalle
// del periodo (PayrollPeriodDetailPage), que es donde vive la captura de
// novedades y el avance de estado real (liquidar/emitir/cerrar) — aquí solo
// se crea/edita el periodo (mientras esté "abierto") y se borra.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePayrollPeriodsStore } from '../../store/payrollPeriodsStore';
import PayrollPeriodModal from '../../components/payroll/PayrollPeriodModal';
import Layout from '../../components/layout/Layout';
import useBranchStore from '../../store/branchStore';
import { PERIOD_TYPES, PERIOD_STATUSES } from '../../constants/payroll';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const periodTypeLabel = (value) => PERIOD_TYPES.find((p) => p.value === value)?.label || value;

const STATUS_STYLES = {
  abierto: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  liquidado: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  emitido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cerrado: 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-400',
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const PayrollPeriodsPage = () => {
  const navigate = useNavigate();
  const {
    periods, isLoading, pagination, filters,
    fetchPeriods, setFilters, setPage, deletePeriod,
  } = usePayrollPeriodsStore();
  const { branches, fetchBranches, loaded: branchesLoaded } = useBranchStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    if (!branchesLoaded) fetchBranches();
  }, [branchesLoaded]);

  useEffect(() => {
    setFilters({ status: filterStatus, branch_id: filterBranch, period_type: filterType });
  }, [filterStatus, filterBranch, filterType]);

  useEffect(() => {
    fetchPeriods();
  }, [filters, pagination.page]);

  const activeFilterCount = [filterStatus, filterBranch, filterType].filter(Boolean).length;
  const clearAll = () => { setFilterStatus(''); setFilterBranch(''); setFilterType(''); };

  const handleEdit = (e, period) => { e.stopPropagation(); setEditingPeriod(period); setIsModalOpen(true); };
  const handleNew = () => { setEditingPeriod(null); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingPeriod(null); };

  const handleDelete = async (e, period) => {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar el periodo ${formatDate(period.start_date)} – ${formatDate(period.end_date)}? Esta acción no se puede deshacer.`)) return;
    await deletePeriod(period.id);
  };

  const branchName = (id) => branches.find((b) => b.id === id)?.name;

  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Periodos de Nómina</h1>
            <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">Liquidación y emisión de Nómina Electrónica (DIAN)</p>
          </div>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo Periodo
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-graphite shadow rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
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
              onClick={() => fetchPeriods()}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex-shrink-0"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {activeFilterCount > 0 && (
              <button onClick={clearAll} className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300">
                <XMarkIcon className="h-4 w-4" />
                Limpiar
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-white/10">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-500 mb-1">Estado</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
                >
                  <option value="">Todos</option>
                  {PERIOD_STATUSES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-500 mb-1">Sede</label>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
                >
                  <option value="">Todas</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-500 mb-1">Tipo</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
                >
                  <option value="">Todos</option>
                  {PERIOD_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
          {isLoading && !periods.length ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <ArrowPathIcon className="h-6 w-6 animate-spin" />
              <span className="text-sm">Cargando periodos...</span>
            </div>
          ) : periods.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <CalendarDaysIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se encontraron periodos</p>
              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="mt-2 text-blue-600 text-sm hover:underline">Limpiar filtros</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-graphite-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Periodo</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Tipo</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Sede</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Fecha de pago</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-gray-50 dark:bg-graphite-2 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {periods.map((period) => (
                    <tr
                      key={period.id}
                      onClick={() => navigate(`/payroll/periods/${period.id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatDate(period.start_date)} – {formatDate(period.end_date)}
                          </p>
                          <ChevronRightIcon className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400 text-xs">{periodTypeLabel(period.period_type)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400 text-xs">{branchName(period.branch_id) || 'Todas'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400 text-xs">{formatDate(period.payment_date)}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[period.status] || 'bg-gray-100 text-gray-600'}`}>
                          {PERIOD_STATUSES.find((s) => s.value === period.status)?.label || period.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-white dark:bg-graphite group-hover:bg-slate-50 dark:group-hover:bg-white/5 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => handleEdit(e, period)}
                            title={period.status === 'abierto' ? 'Editar' : 'Solo se edita en estado "abierto"'}
                            disabled={period.status !== 'abierto'}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, period)}
                            title={period.status === 'abierto' ? 'Eliminar' : 'Solo se elimina en estado "abierto"'}
                            disabled={period.status !== 'abierto'}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-graphite-2 border-t-2 border-gray-200 dark:border-white/10 text-sm">
                    <td colSpan={6} className="px-4 py-3 text-gray-500 dark:text-gray-500">
                      {pagination.total} periodo{pagination.total !== 1 ? 's' : ''}
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

      {isModalOpen && <PayrollPeriodModal isOpen={isModalOpen} period={editingPeriod} onClose={handleClose} />}
    </Layout>
  );
};

export default PayrollPeriodsPage;
