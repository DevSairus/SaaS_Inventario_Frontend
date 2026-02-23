import { useState, useEffect } from 'react';
import Layout from '../../../components/layout/Layout';
import axios from '../../../api/axios';
import { Wrench, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const today = new Date();
const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
const todayStr = today.toISOString().split('T')[0];

export default function TechnicianProductivityPage() {
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo]     = useState(todayStr);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/workshop/work-orders/productivity', {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      setData(res.data.data || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totals = data.reduce((acc, t) => ({
    orders:    acc.orders + t.total_orders,
    completed: acc.completed + t.completed_orders,
    revenue:   acc.revenue + t.total_revenue,
  }), { orders: 0, completed: 0, revenue: 0 });

  const maxRevenue = Math.max(...data.map(t => t.total_revenue), 1);

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600 rounded-xl">
            <TrendingUp size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Productividad de Técnicos</h1>
            <p className="text-sm text-gray-500">Mano de obra y servicios por período</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition">
              <Calendar size={15} />
              {loading ? 'Calculando...' : 'Aplicar'}
            </button>
          </div>
        </div>

        {/* Resumen total */}
        {data.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total OT',        value: totals.orders,          sub: `${totals.completed} completadas` },
              { label: 'Mano de obra',    value: COP(totals.revenue),    sub: 'solo servicios' },
              { label: 'Técnicos activos', value: data.filter(t => t.technician_id).length, sub: `${data.filter(t => !t.technician_id).length > 0 ? '+ sin asignar' : ''}` },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-lg font-bold text-gray-900">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Lista técnicos */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Calculando productividad...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-16">
            <Wrench size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500">Sin datos para el período seleccionado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((tech, idx) => {
              const isOpen          = expanded === tech.technician_id;
              const barWidth        = Math.round(tech.total_revenue / maxRevenue * 100);
              const completionPct   = tech.total_orders > 0
                ? Math.round(tech.completed_orders / tech.total_orders * 100) : 0;
              const avgPerOrder     = tech.total_orders > 0
                ? tech.total_revenue / tech.total_orders : 0;

              return (
                <div key={tech.technician_id || 'unassigned'}
                  className={`bg-white border rounded-xl transition-all ${isOpen ? 'border-blue-200 shadow-sm' : 'border-gray-100'}`}>

                  <button className="w-full text-left p-4" onClick={() => setExpanded(isOpen ? null : tech.technician_id)}>
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-gray-100 text-gray-500' :
                        idx === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {idx + 1}
                      </div>

                      {/* Name + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-gray-900 text-sm">{tech.technician_name}</span>
                          <span className="text-sm font-bold text-gray-900 ml-2">{COP(tech.total_revenue)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                          <span>{tech.total_orders} OT · {tech.completed_orders} completadas ({completionPct}%)</span>
                          {tech.in_progress_orders > 0 && (
                            <span className="text-orange-500">{tech.in_progress_orders} en curso</span>
                          )}
                        </div>
                      </div>

                      {isOpen
                        ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                        : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                    </div>
                  </button>

                  {/* Expanded */}
                  {isOpen && (
                    <div className="border-t border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">

                      {/* Mano de obra */}
                      <div className="bg-blue-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench size={14} className="text-blue-600" />
                          <span className="text-xs font-semibold text-blue-800">Mano de obra</span>
                        </div>
                        <p className="text-xl font-bold text-blue-900">{COP(tech.labor_revenue)}</p>
                        <p className="text-xs text-blue-600 mt-0.5">Solo servicios facturados</p>
                      </div>

                      {/* Promedio */}
                      <div className="bg-green-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp size={14} className="text-green-600" />
                          <span className="text-xs font-semibold text-green-800">Promedio / OT</span>
                        </div>
                        <p className="text-xl font-bold text-green-900">{COP(avgPerOrder)}</p>
                        <p className="text-xs text-green-600 mt-0.5">en mano de obra</p>
                      </div>

                      {/* Resumen OT */}
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-gray-700">Resumen OT</span>
                        </div>
                        <div className="space-y-1.5 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Total</span>
                            <span className="font-bold text-gray-900">{tech.total_orders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Completadas</span>
                            <span className="font-bold text-green-700">{tech.completed_orders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>En curso</span>
                            <span className="font-bold text-orange-600">{tech.in_progress_orders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Completadas</span>
                            <span className="font-bold text-gray-700">{completionPct}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}