import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Upload, ClipboardList } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { physicalCountsAPI } from '../../api/physicalCounts';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

// Historial de sesiones de conteo físico.
// Ver: 00 - Documentación/Pitbox-Tecnicos-InventarioFisico-EnTramite-Analisis-y-Plan.md, sección 2.3.
const PhysicalCountsPage = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 0 });

  const fetchCounts = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await physicalCountsAPI.getAll({ page, limit: pagination.limit });
      setCounts(response.data || []);
      if (response.pagination) setPagination(response.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al obtener el historial de conteos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusBadge = (status) => {
    const badges = {
      open: 'bg-yellow-100 text-yellow-800',
      applied: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    const labels = {
      open: 'Abierto',
      applied: 'Aplicado',
      cancelled: 'Cancelado'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Inventario físico</h1>
            <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">Historial de conteos por Excel</p>
          </div>
          <button
            onClick={() => navigate('/inventory/physical-counts/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo conteo
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden dark:bg-graphite">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando conteos...</p>
            </div>
          ) : counts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-500">
              <ClipboardList className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <p className="mt-2">No se han realizado conteos físicos</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                  <thead className="bg-gray-50 dark:bg-graphite-2">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Número</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Bodega / Categoría</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Sobrantes</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Faltantes</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-graphite dark:divide-white/10">
                    {counts.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {c.count_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-500">
                          {c.generated_at ? formatDateTime(c.generated_at) : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {c.warehouse?.name || 'Todas'} / {c.category?.name || 'Todas'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(c.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                          {formatCurrency(c.surplus_value || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                          {formatCurrency(c.shortage_value || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-3">
                            {c.status === 'open' && (
                              <button
                                onClick={() => navigate(`/inventory/physical-counts/${c.id}/upload`)}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                title="Continuar / subir Excel de conteo"
                              >
                                <Upload className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/inventory/physical-counts/${c.id}`)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver detalle"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.pages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between dark:bg-graphite dark:border-white/10">
                  <button
                    onClick={() => fetchCounts(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:bg-graphite dark:hover:bg-white/5"
                  >
                    Anterior
                  </button>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Página {pagination.page} de {pagination.pages}
                  </p>
                  <button
                    onClick={() => fetchCounts(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:bg-graphite dark:hover:bg-white/5"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PhysicalCountsPage;
