import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { physicalCountsAPI } from '../../api/physicalCounts';
import { formatCurrency, formatNumber, formatDateTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

// Detalle de una sesión de conteo físico ya generada/aplicada.
const PhysicalCountDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [count, setCount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const response = await physicalCountsAPI.getById(id);
        setCount(response.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error al obtener el conteo físico');
        navigate('/inventory/physical-counts');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const getStatusBadge = (status) => {
    const badges = {
      open: 'bg-yellow-100 text-yellow-800',
      applied: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    const labels = { open: 'Abierto', applied: 'Aplicado', cancelled: 'Cancelado' };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  if (!count) return null;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventory/physical-counts')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{count.count_number}</h1>
              <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">
                {count.generated_at ? formatDateTime(count.generated_at) : ''}
              </p>
            </div>
          </div>
          {getStatusBadge(count.status)}
        </div>

        <div className="bg-white rounded-lg shadow p-4 dark:bg-graphite grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Bodega</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{count.warehouse?.name || 'Todas'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Categoría</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{count.category?.name || 'Todas'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Sobrantes</p>
            <p className="text-sm font-medium text-green-600">{formatCurrency(count.surplus_value || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500">Faltantes</p>
            <p className="text-sm font-medium text-red-600">{formatCurrency(count.shortage_value || 0)}</p>
          </div>
        </div>

        {(count.entry_adjustment_id || count.exit_adjustment_id) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {count.entry_adjustment_id && (
              <button
                onClick={() => navigate(`/adjustments/${count.entry_adjustment_id}`)}
                className="flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white dark:bg-graphite dark:border-white/10 dark:hover:bg-white/5"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">Ver ajuste de entrada (sobrantes)</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </button>
            )}
            {count.exit_adjustment_id && (
              <button
                onClick={() => navigate(`/adjustments/${count.exit_adjustment_id}`)}
                className="flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white dark:bg-graphite dark:border-white/10 dark:hover:bg-white/5"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">Ver ajuste de salida (faltantes)</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden dark:bg-graphite">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-graphite-2">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Código</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Nombre</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Sistema</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Contado</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-500">Diferencia</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-graphite dark:divide-white/10">
                {(count.items || []).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.product_sku}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.product_name}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-500 dark:text-gray-500">{formatNumber(item.system_qty)}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-500 dark:text-gray-500">
                      {item.counted_qty == null ? '—' : formatNumber(item.counted_qty)}
                    </td>
                    <td className={`px-4 py-2 text-sm text-right font-medium ${
                      item.diff_qty > 0 ? 'text-green-600' : item.diff_qty < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {item.diff_qty == null ? '—' : `${item.diff_qty > 0 ? '+' : ''}${formatNumber(item.diff_qty)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PhysicalCountDetailPage;
