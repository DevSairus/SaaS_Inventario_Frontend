import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdjustmentsStore } from '../../store/adjustmentsStore';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import Pagination from '../../components/common/Pagination';
import useUrlPageSync from '../../hooks/useUrlPageSync';

const AdjustmentsPage = () => {
  const navigate = useNavigate();
  const {
    adjustments,
    isLoading,
    pagination,
    filters,
    fetchAdjustments,
    setFilters,
    setPage,
    deleteAdjustment
  } = useAdjustmentsStore();

  const [localFilters, setLocalFilters] = useState(filters);

  // Antes de los efectos de carga: la primera consulta ya usa la página de la URL
  useUrlPageSync(pagination.page, setPage);
  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments, filters, pagination.page]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(localFilters);
    setPage(1);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      adjustment_type: '',
      reason: '',
      status: '',
      start_date: '',
      end_date: ''
    };
    setLocalFilters(clearedFilters);
    setFilters(clearedFilters);
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este ajuste?')) {
      const success = await deleteAdjustment(id);
      if (success) {
        toast.success('Ajuste eliminado exitosamente');
      }
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    const labels = {
      draft: 'Borrador',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const badges = {
      entrada: 'bg-blue-100 text-blue-800',
      salida: 'bg-orange-100 text-orange-800'
    };
    const labels = {
      entrada: 'Entrada',
      salida: 'Salida'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[type]}`}>
        {labels[type]}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-5">
                {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Ajustes de Inventario</h1>
            <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">Registra entradas, salidas y correcciones de stock</p>
          </div>
          <button
            onClick={() => navigate('/adjustments/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Ajuste
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow mb-6 p-4 dark:bg-graphite">
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  name="search"
                  value={localFilters.search}
                  onChange={handleFilterChange}
                  placeholder="Buscar por número o notas..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
                />
              </div>

              <div>
                <select
                  name="adjustment_type"
                  value={localFilters.adjustment_type}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                >
                  <option value="">Todos los tipos</option>
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                </select>
              </div>

              <div>
                <select
                  name="status"
                  value={localFilters.status}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                >
                  <option value="">Todos los estados</option>
                  <option value="draft">Borrador</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Buscar
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden dark:bg-graphite">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando ajustes...</p>
            </div>
          ) : adjustments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2">No se encontraron ajustes</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                  <thead className="bg-gray-50 dark:bg-graphite-2">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Número</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Razón</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Items</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Total</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-graphite dark:divide-white/10">
                    {adjustments.map((adjustment) => (
                      <tr key={adjustment.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{adjustment.adjustment_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-500">
                          {new Date(adjustment.adjustment_date + 'T12:00:00').toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTypeBadge(adjustment.adjustment_type)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {adjustment.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(adjustment.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-500">
                          {adjustment.items_count || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(adjustment.total_cost || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => navigate(`/adjustments/${adjustment.id}`)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver detalle"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            {adjustment.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => navigate(`/adjustments/edit/${adjustment.id}`)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Editar"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(adjustment.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Eliminar"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <Pagination
                className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6 dark:bg-graphite dark:border-white/10"
                currentPage={pagination.page}
                totalPages={pagination.pages}
                totalItems={pagination.total}
                pageSize={pagination.limit}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdjustmentsPage;