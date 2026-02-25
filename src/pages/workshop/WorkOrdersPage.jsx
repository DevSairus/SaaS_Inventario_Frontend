import { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import useWorkshopStore from '../../store/workshopStore';
import { Wrench, Plus, Search, Car, User, Clock, ChevronRight } from 'lucide-react';

const STATUS_CONFIG = {
  recibido:   {
    label: 'Recibido',   emoji: '📥',
    badge:  'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
    card:   'bg-blue-50/60 border-blue-200 border-l-blue-500',
    icon:   'bg-blue-100 text-blue-600',
    hover:  'hover:bg-blue-50 hover:border-blue-300 hover:shadow-blue-100',
    number: 'text-blue-900',
  },
  en_proceso: {
    label: 'En Proceso', emoji: '🔧',
    badge:  'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300',
    card:   'bg-yellow-50/70 border-yellow-200 border-l-yellow-500',
    icon:   'bg-yellow-100 text-yellow-700',
    hover:  'hover:bg-yellow-50 hover:border-yellow-300 hover:shadow-yellow-100',
    number: 'text-yellow-900',
  },
  en_espera: {
    label: 'En Espera',  emoji: '⏳',
    badge:  'bg-orange-100 text-orange-800 ring-1 ring-orange-300',
    card:   'bg-orange-50/60 border-orange-200 border-l-orange-500',
    icon:   'bg-orange-100 text-orange-600',
    hover:  'hover:bg-orange-50 hover:border-orange-300 hover:shadow-orange-100',
    number: 'text-orange-900',
  },
  listo: {
    label: 'Listo',      emoji: '✅',
    badge:  'bg-green-100 text-green-800 ring-1 ring-green-300',
    card:   'bg-green-50/60 border-green-200 border-l-green-500',
    icon:   'bg-green-100 text-green-600',
    hover:  'hover:bg-green-50 hover:border-green-300 hover:shadow-green-100',
    number: 'text-green-900',
  },
  entregado: {
    label: 'Entregado',  emoji: '🏁',
    badge:  'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
    card:   'bg-gray-50/40 border-gray-200 border-l-gray-400',
    icon:   'bg-gray-100 text-gray-500',
    hover:  'hover:bg-gray-50 hover:border-gray-300 hover:shadow-gray-100',
    number: 'text-gray-700',
  },
  cancelado: {
    label: 'Cancelado',  emoji: '🚫',
    badge:  'bg-red-100 text-red-600 ring-1 ring-red-200',
    card:   'bg-red-50/30 border-red-200 border-l-red-400',
    icon:   'bg-red-100 text-red-500',
    hover:  'hover:bg-red-50 hover:border-red-300 hover:shadow-red-100',
    number: 'text-red-800',
  },
};

const COP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

export default function WorkOrdersPage() {
  const navigate = useNavigate();
  const { workOrders, workOrdersTotal, workOrdersLoading, fetchWorkOrders } = useWorkshopStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('activas'); // activas = excluye entregado/cancelado
  const [page, setPage] = useState(1);

  const activeStatuses = ['recibido','en_proceso','en_espera','listo'];
  useEffect(() => {
    const statusParam = status === 'activas' ? activeStatuses.join(',') : status;
    fetchWorkOrders({ search, status: statusParam, page, limit: 20 });
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
          onClick={() => { setStatus('activas'); setPage(1); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${status === 'activas' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          🔧 Activas
        </button>
        <button
          onClick={() => { setStatus(''); setPage(1); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${status === '' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todas
        </button>
        {statuses.map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { setStatus(key); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              status === key ? 'bg-gray-800 text-white' : `${cfg.badge} hover:opacity-80`
            }`}
          >
            {cfg.emoji} {cfg.label}
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
                className={`border border-l-4 rounded-xl p-4 shadow-sm transition cursor-pointer ${sc.card} ${sc.hover}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${sc.icon}`}>
                      <Car size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm ${sc.number}`}>{order.order_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc.badge}`}>{sc.emoji} {sc.label}</span>
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