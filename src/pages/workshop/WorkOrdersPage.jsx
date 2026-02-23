import { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import useWorkshopStore from '../../store/workshopStore';
import { Wrench, Plus, Search, Car, User, Clock, ChevronRight } from 'lucide-react';

const STATUS_CONFIG = {
  recibido:   { label: 'Recibido',    color: 'bg-blue-100 text-blue-700' },
  en_proceso: { label: 'En Proceso',  color: 'bg-yellow-100 text-yellow-700' },
  en_espera:  { label: 'En Espera',   color: 'bg-orange-100 text-orange-700' },
  listo:      { label: 'Listo',       color: 'bg-green-100 text-green-700' },
  entregado:  { label: 'Entregado',   color: 'bg-gray-100 text-gray-600' },
  cancelado:  { label: 'Cancelado',   color: 'bg-red-100 text-red-600' },
};

const COP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

export default function WorkOrdersPage() {
  const navigate = useNavigate();
  const { workOrders, workOrdersTotal, workOrdersLoading, fetchWorkOrders } = useWorkshopStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchWorkOrders({ search, status, page, limit: 20 });
  }, [search, status, page]);

  const statuses = Object.entries(STATUS_CONFIG);

  return (
    <Layout>
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Wrench size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Órdenes de Trabajo</h1>
            <p className="text-sm text-gray-500">{workOrdersTotal} órdenes en total</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/workshop/work-orders/new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus size={16} /> Nueva OT
        </button>
      </div>

      {/* Filtros rápidos por estado */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={() => { setStatus(''); setPage(1); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${!status ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todas
        </button>
        {statuses.filter(([k]) => k !== 'cancelado').map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { setStatus(key); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${status === key ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por placa, cliente, número de OT..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Lista */}
      {workOrdersLoading ? (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      ) : workOrders.length === 0 ? (
        <div className="text-center py-16">
          <Wrench size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No hay órdenes de trabajo</p>
          <button onClick={() => navigate('/workshop/work-orders/new')} className="mt-3 text-blue-600 text-sm font-medium hover:underline">
            Crear la primera OT
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {workOrders.map(order => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.recibido;
            const customer = order.customer;
            const customerName = customer ? (customer.business_name || `${customer.first_name} ${customer.last_name}`) : '—';
            return (
              <div
                key={order.id}
                onClick={() => navigate(`/workshop/work-orders/${order.id}`)}
                className="bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition cursor-pointer"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-gray-50 rounded-lg flex-shrink-0">
                      <Car size={18} className="text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{order.order_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                        <span className="font-mono font-bold text-gray-700">{order.vehicle?.plate || '—'}</span>
                        <span>{order.vehicle?.brand} {order.vehicle?.model}</span>
                        <span className="flex items-center gap-1"><User size={11} />{customerName}</span>
                        {order.technician && <span className="flex items-center gap-1">Técnico: {order.technician.first_name}</span>}
                      </div>
                      {order.problem_description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-sm">{order.problem_description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 text-sm">{COP(order.total_amount)}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                        <Clock size={10} />
                        {new Date(order.received_at).toLocaleDateString('es-CO')}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {workOrdersTotal > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
          <span className="px-3 py-1.5 text-sm text-gray-500">Pág. {page}</span>
          <button onClick={() => setPage(p => p+1)} disabled={page * 20 >= workOrdersTotal}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">Siguiente →</button>
        </div>
      )}
    </div>
    </Layout>
  );
}