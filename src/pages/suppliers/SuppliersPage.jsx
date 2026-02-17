// frontend/src/pages/suppliers/SuppliersPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useSuppliersStore } from '../../store/suppliersStore';
import SupplierModal from '../../components/suppliers/SupplierModal';
import Layout from '../../components/layout/Layout';
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
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

/* ─── helpers ─────────────────────────────────────────────── */
const normalizeQ = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* ─── componente ──────────────────────────────────────────── */
const SuppliersPage = () => {
  const {
    suppliers, stats, isLoading, pagination, filters,
    fetchSuppliers, fetchStats, setFilters, setPage,
    deleteSupplier, deactivateSupplier, activateSupplier,
  } = useSuppliersStore();

  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [search, setSearch]               = useState('');
  const [showFilters, setShowFilters]     = useState(false);
  const [filterActive, setFilterActive]   = useState('');

  useEffect(() => {
    fetchSuppliers();
    fetchStats();
  }, []);

  useEffect(() => {
    setFilters({ is_active: filterActive });
    fetchSuppliers();
  }, [filterActive, pagination.page]);

  /* filtrado local */
  const filtered = useMemo(() => {
    const q = normalizeQ(search);
    if (!q) return suppliers;
    return suppliers.filter((s) => {
      const hay = [s.name, s.business_name, s.tax_id, s.email, s.contact_name, s.phone].map(normalizeQ).join(' ');
      return hay.includes(q);
    });
  }, [suppliers, search]);

  const activeCount = [filterActive].filter(Boolean).length;

  const handleEdit = (supplier) => { setEditingSupplier(supplier); setIsModalOpen(true); };
  const handleNew  = () => { setEditingSupplier(null); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingSupplier(null); };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este proveedor? Esta acción no se puede deshacer.')) return;
    const ok = await deleteSupplier(id);
    if (ok) fetchSuppliers();
  };

  const handleToggleActive = async (supplier) => {
    const action = supplier.is_active ? deactivateSupplier : activateSupplier;
    await action(supplier.id);
    fetchSuppliers();
    fetchStats();
  };

  const clearAll = () => { setSearch(''); setFilterActive(''); };

  /* ── render ─────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestión de proveedores y datos de contacto</p>
          </div>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <PlusIcon className="h-4 w-4" />
            Nuevo Proveedor
          </button>
        </div>

        {/* ── Stats ── */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: UserGroupIcon,   color: 'text-blue-600 bg-blue-50',    label: 'Total',     value: stats.total || 0 },
              { icon: CheckCircleIcon, color: 'text-emerald-600 bg-emerald-50', label: 'Activos', value: stats.active || 0 },
              { icon: NoSymbolIcon,    color: 'text-red-500 bg-red-50',      label: 'Inactivos', value: stats.inactive || 0 },
            ].map(({ icon: Icon, color, label, value }) => (
              <div key={label} className="bg-white shadow rounded-xl p-4 flex items-center gap-3">
                <div className={`rounded-lg p-2.5 flex-shrink-0 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Búsqueda + filtros ── */}
        <div className="bg-white shadow rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, NIT, contacto, email o teléfono..."
                className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                activeCount > 0 ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              Filtros
              {activeCount > 0 && (
                <span className="bg-emerald-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{activeCount}</span>
              )}
            </button>

            <button
              onClick={() => fetchSuppliers()}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex-shrink-0"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {(search || activeCount > 0) && (
              <button onClick={clearAll} className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:text-red-600 flex-shrink-0">
                <XMarkIcon className="h-4 w-4" />
                Limpiar
              </button>
            )}
          </div>

          {showFilters && (
            <div className="pt-3 border-t border-gray-100">
              <div className="w-full sm:w-48">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Estado</label>
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabla ── */}
        <div className="bg-white shadow rounded-xl overflow-hidden">
          {isLoading && !suppliers.length ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <ArrowPathIcon className="h-6 w-6 animate-spin" />
              <span className="text-sm">Cargando proveedores...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <UserGroupIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se encontraron proveedores</p>
              {(search || activeCount > 0) && (
                <button onClick={clearAll} className="mt-2 text-emerald-600 text-sm hover:underline">Limpiar filtros</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Proveedor</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">NIT / RUT</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Contacto</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Teléfono</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-gray-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors group">

                      {/* Proveedor */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                            {s.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate max-w-[160px]">{s.name}</p>
                            {s.business_name && <p className="text-xs text-gray-400 truncate max-w-[160px]">{s.business_name}</p>}
                          </div>
                        </div>
                      </td>

                      {/* NIT */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-600 text-xs">{s.tax_id || '—'}</td>

                      {/* Contacto */}
                      <td className="px-4 py-3">
                        <p className="text-gray-800 max-w-[150px] truncate">{s.contact_name || '—'}</p>
                        {s.email && (
                          <a href={`mailto:${s.email}`} className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                            <EnvelopeIcon className="h-3 w-3" />
                            {s.email}
                          </a>
                        )}
                      </td>

                      {/* Teléfono */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {s.phone ? (
                          <a href={`tel:${s.phone}`} className="text-gray-600 hover:text-emerald-600 flex items-center gap-1 text-sm">
                            <PhoneIcon className="h-3.5 w-3.5" />
                            {s.phone}
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {s.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Acciones — sticky */}
                      <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => handleEdit(s)} title="Editar" className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(s)}
                            title={s.is_active ? 'Desactivar' : 'Activar'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              s.is_active ? 'text-orange-500 hover:bg-orange-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {s.is_active ? <NoSymbolIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                          </button>
                          <button onClick={() => handleDelete(s.id)} title="Eliminar" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 text-sm">
                    <td colSpan={6} className="px-4 py-3 text-gray-500">
                      {filtered.length} proveedor{filtered.length !== 1 ? 'es' : ''}
                      {stats && <span className="ml-3 text-emerald-600 font-medium">· {stats.active} activos</span>}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Paginación */}
          {!isLoading && (pagination.pages || pagination.totalPages) > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPage(pagination.page + 1)}
                  disabled={pagination.page >= (pagination.pages || pagination.totalPages)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <SupplierModal supplier={editingSupplier} onClose={handleClose} />
      )}
    </Layout>
  );
};

export default SuppliersPage;