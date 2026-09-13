// frontend/src/pages/payroll/EmployeesPage.jsx
import React, { useEffect, useState } from 'react';
import { useEmployeesStore } from '../../store/employeesStore';
import EmployeeModal from '../../components/payroll/EmployeeModal';
import Layout from '../../components/layout/Layout';
import { CONTRACT_TYPES, PERIOD_TYPES } from '../../constants/payroll';
// Nota de reorganización: este archivo vivía en src/pages/EmployeesPage.jsx
// (un nivel más arriba) pero su propio comentario de cabecera y el resto del
// módulo (constants/payroll.js, api/payroll.js) siguen el patrón por-carpeta
// de los demás módulos (pages/accounting/, pages/finance/, etc). Se movió
// a pages/payroll/ para que quede junto a las páginas nuevas del módulo;
// las rutas relativas de este archivo ('../../') ya asumían esa profundidad
// y no cambiaron.
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowPathIcon,
  UserGroupIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

const contractLabel = (value) => CONTRACT_TYPES.find((c) => c.value === value)?.label || value;
const periodicityLabel = (value) => PERIOD_TYPES.find((p) => p.value === value)?.label || value;

const EmployeesPage = () => {
  const {
    employees, stats, isLoading, pagination, filters,
    fetchEmployees, fetchStats, setFilters, setPage,
    deleteEmployee, deactivateEmployee, activateEmployee,
  } = useEmployeesStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterActive, setFilterActive] = useState('');
  const [filterContractType, setFilterContractType] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    setFilters({ search, is_active: filterActive, contract_type: filterContractType });
  }, [search, filterActive, filterContractType]);

  useEffect(() => {
    fetchEmployees();
  }, [filters, pagination.page]);

  const activeFilterCount = [filterActive, filterContractType].filter(Boolean).length;

  const handleEdit = (employee) => { setEditingEmployee(employee); setIsModalOpen(true); };
  const handleNew = () => { setEditingEmployee(null); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingEmployee(null); };

  const handleDelete = async (employee) => {
    if (!window.confirm(`¿Eliminar a ${employee.first_name} ${employee.first_surname}? Esta acción no se puede deshacer.`)) return;
    await deleteEmployee(employee.id);
  };

  const handleToggleActive = async (employee) => {
    const action = employee.is_active ? deactivateEmployee : activateEmployee;
    await action(employee.id);
  };

  const clearAll = () => { setSearch(''); setFilterActive(''); setFilterContractType(''); };

  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Empleados</h1>
            <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">Nómina — datos laborales para el Documento Soporte de Pago electrónico</p>
          </div>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo Empleado
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: UserGroupIcon, color: 'text-blue-600 bg-blue-50', label: 'Total', value: stats.total || 0 },
              { icon: CheckCircleIcon, color: 'text-emerald-600 bg-emerald-50', label: 'Activos', value: stats.active || 0 },
              { icon: NoSymbolIcon, color: 'text-red-500 bg-red-50', label: 'Inactivos', value: stats.inactive || 0 },
            ].map(({ icon: Icon, color, label, value }) => (
              <div key={label} className="bg-white dark:bg-graphite shadow rounded-xl p-4 flex items-center gap-3">
                <div className={`rounded-lg p-2.5 flex-shrink-0 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-500">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Búsqueda + filtros */}
        <div className="bg-white dark:bg-graphite shadow rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, documento o email..."
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
              onClick={() => fetchEmployees()}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex-shrink-0"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {(search || activeFilterCount > 0) && (
              <button onClick={clearAll} className="text-sm text-gray-500 hover:text-gray-700 flex-shrink-0">
                Limpiar
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-white/10">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
                >
                  <option value="">Todos</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de contrato</label>
                <select
                  value={filterContractType}
                  onChange={(e) => setFilterContractType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
                >
                  <option value="">Todos</option>
                  {CONTRACT_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
          {isLoading && !employees.length ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <ArrowPathIcon className="h-6 w-6 animate-spin" />
              <span className="text-sm">Cargando empleados...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <UserGroupIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se encontraron empleados</p>
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
                    <th className="px-4 py-3 text-left whitespace-nowrap">Documento</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Cargo</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Contrato</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Periodicidad</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Salario base</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-gray-50 dark:bg-graphite-2 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {employees.map((emp) => {
                    const fullName = [emp.first_name, emp.other_names, emp.first_surname, emp.second_surname].filter(Boolean).join(' ');
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                              {emp.first_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{fullName}</p>
                              {emp.email && (
                                <a href={`mailto:${emp.email}`} className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                                  <EnvelopeIcon className="h-3 w-3" />
                                  {emp.email}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-600 dark:text-gray-400 text-xs">{emp.document_number}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[160px] truncate">{emp.position || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400 text-xs">{contractLabel(emp.contract_type)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400 text-xs">{periodicityLabel(emp.payroll_periodicity)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-gray-800 dark:text-gray-200">
                          {Number(emp.base_salary || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            emp.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {emp.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-white dark:bg-graphite group-hover:bg-slate-50 dark:group-hover:bg-white/5 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => handleEdit(emp)} title="Editar" className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(emp)}
                              title={emp.is_active ? 'Desactivar' : 'Activar'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                emp.is_active ? 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                              }`}
                            >
                              {emp.is_active ? <NoSymbolIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                            </button>
                            <button onClick={() => handleDelete(emp)} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-graphite-2 border-t-2 border-gray-200 dark:border-white/10 text-sm">
                    <td colSpan={8} className="px-4 py-3 text-gray-500 dark:text-gray-500">
                      {pagination.total} empleado{pagination.total !== 1 ? 's' : ''}
                      {stats && <span className="ml-3 text-emerald-600 font-medium">· {stats.active} activos</span>}
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

      {isModalOpen && <EmployeeModal employee={editingEmployee} onClose={handleClose} />}
    </Layout>
  );
};

export default EmployeesPage;