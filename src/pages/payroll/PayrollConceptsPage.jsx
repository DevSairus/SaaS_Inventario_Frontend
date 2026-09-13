// frontend/src/pages/payroll/PayrollConceptsPage.jsx
//
// Catálogo de conceptos de nómina (devengados/deducciones) — igual espíritu
// que CategoriesPage.jsx pero sin paginación (payrollConceptsStore no
// pagina, es un catálogo corto) y con el estilo visual de EmployeesPage.jsx
// para mantener consistencia dentro del módulo de Nómina.
import React, { useEffect, useState } from 'react';
import { usePayrollConceptsStore } from '../../store/payrollConceptsStore';
import PayrollConceptModal from '../../components/payroll/PayrollConceptModal';
import Layout from '../../components/layout/Layout';
import { CALCULATION_TYPES } from '../../constants/payroll';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';

const calculationLabel = (value) => CALCULATION_TYPES.find((c) => c.value === value)?.label || value;

const formatDefaultValue = (concept) => {
  if (concept.calculation_type === 'percentage') {
    return `${Number(concept.default_value || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}%`;
  }
  if (concept.calculation_type === 'manual') return '—';
  return Number(concept.default_value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
};

const PayrollConceptsPage = () => {
  const {
    concepts, isLoading, filters,
    fetchConcepts, setFilters,
    deactivateConcept, activateConcept, deleteConcept,
  } = usePayrollConceptsStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');

  useEffect(() => {
    setFilters({ search, concept_type: filterType, is_active: filterActive });
  }, [search, filterType, filterActive]);

  useEffect(() => {
    fetchConcepts();
  }, [filters]);

  const handleEdit = (concept) => { setEditingConcept(concept); setIsModalOpen(true); };
  const handleNew = () => { setEditingConcept(null); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingConcept(null); };

  const handleDelete = async (concept) => {
    if (!window.confirm(`¿Eliminar el concepto "${concept.name}"? Esta acción no se puede deshacer.`)) return;
    await deleteConcept(concept.id);
  };

  const handleToggleActive = async (concept) => {
    const action = concept.is_active ? deactivateConcept : activateConcept;
    await action(concept.id);
  };

  const clearAll = () => { setSearch(''); setFilterType(''); setFilterActive(''); };
  const activeFilterCount = [filterType, filterActive].filter(Boolean).length;

  const total = concepts.length;
  const devengados = concepts.filter((c) => c.concept_type === 'devengado').length;
  const deducciones = concepts.filter((c) => c.concept_type === 'deduccion').length;
  const activos = concepts.filter((c) => c.is_active).length;

  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Conceptos de Nómina</h1>
            <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">Catálogo de devengados y deducciones usados al liquidar cada periodo</p>
          </div>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo Concepto
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: ClipboardDocumentListIcon, color: 'text-blue-600 bg-blue-50', label: 'Total', value: total },
            { icon: ArrowTrendingUpIcon, color: 'text-emerald-600 bg-emerald-50', label: 'Devengados', value: devengados },
            { icon: ArrowTrendingDownIcon, color: 'text-red-500 bg-red-50', label: 'Deducciones', value: deducciones },
            { icon: CheckCircleIcon, color: 'text-emerald-600 bg-emerald-50', label: 'Activos', value: activos },
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

        {/* Búsqueda + filtros */}
        <div className="bg-white dark:bg-graphite shadow rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="w-full pl-9 pr-9 py-2.5 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
            >
              <option value="">Todos los tipos</option>
              <option value="devengado">Devengados</option>
              <option value="deduccion">Deducciones</option>
            </select>

            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
            >
              <option value="">Activos e inactivos</option>
              <option value="true">Solo activos</option>
              <option value="false">Solo inactivos</option>
            </select>

            <button
              onClick={() => fetchConcepts()}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex-shrink-0"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
          {isLoading && !concepts.length ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <ArrowPathIcon className="h-6 w-6 animate-spin" />
              <span className="text-sm">Cargando conceptos...</span>
            </div>
          ) : concepts.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <ClipboardDocumentListIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se encontraron conceptos</p>
              {(search || activeFilterCount > 0) && (
                <button onClick={clearAll} className="mt-2 text-blue-600 text-sm hover:underline">Limpiar filtros</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-graphite-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-white/10">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Código</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Nombre</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Tipo</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Categoría DIAN</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Cálculo</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Valor / %</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-gray-50 dark:bg-graphite-2 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {concepts.map((concept) => (
                    <tr key={concept.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-600 dark:text-gray-400 text-xs">{concept.code}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{concept.name}</p>
                        {concept.notes && <p className="text-xs text-gray-400 truncate max-w-[220px]">{concept.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          concept.concept_type === 'devengado'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {concept.concept_type === 'devengado' ? 'Devengado' : 'Deducción'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400 text-xs">
                        {concept.dian_category}
                        {concept.dian_code && <span className="text-gray-400"> · {concept.dian_code}</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400 text-xs">
                        {calculationLabel(concept.calculation_type)}
                        {concept.auto_apply && (
                          <span
                            title="Se aplica solo a todos los empleados de cada periodo"
                            className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          >
                            Auto
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-gray-800 dark:text-gray-200">
                        {formatDefaultValue(concept)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          concept.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {concept.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-white dark:bg-graphite group-hover:bg-slate-50 dark:group-hover:bg-white/5 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => handleEdit(concept)} title="Editar" className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(concept)}
                            title={concept.is_active ? 'Desactivar' : 'Activar'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              concept.is_active ? 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                            }`}
                          >
                            {concept.is_active ? <NoSymbolIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                          </button>
                          <button onClick={() => handleDelete(concept)} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-graphite-2 border-t-2 border-gray-200 dark:border-white/10 text-sm">
                    <td colSpan={8} className="px-4 py-3 text-gray-500 dark:text-gray-500">
                      {total} concepto{total !== 1 ? 's' : ''}
                      <span className="ml-3 text-emerald-600 font-medium">· {activos} activos</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <PayrollConceptModal isOpen={isModalOpen} concept={editingConcept} onClose={handleClose} />
      )}
    </Layout>
  );
};

export default PayrollConceptsPage;