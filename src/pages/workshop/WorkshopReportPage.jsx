import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import axios from '../../api/axios';
import * as XLSX from 'xlsx';

const STATUS_LABELS = {
  recibido: 'Recibido', diagnostico: 'Diagnóstico', en_proceso: 'En proceso',
  en_espera: 'En espera', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado'
};

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0);

export default function WorkshopReportPage() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [filters, setFilters] = useState({ date_from: firstOfMonth, date_to: today });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/workshop/work-orders/report', { params: filters });
      setData(res.data);
    } catch (e) {
      alert('Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!data?.data?.length) return;
    const rows = data.data.map(r => ({
      'N° Orden':          r.order_number,
      'Estado':            STATUS_LABELS[r.status] || r.status,
      'Cliente':           r.customer,
      'Vehículo':          r.vehicle,
      'Técnico':           r.technician,
      'Fecha creación':    r.created_at,
      'Fecha entrega':     r.delivered_at,
      'Días resolución':   r.resolution_days ?? '',
      'Mano de obra':      r.labor_total,
      'Repuestos':         r.parts_total,
      'Total':             r.total_amount,
      'Trabajo realizado': r.work_performed,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Taller');
    XLSX.writeFile(wb, `reporte-taller-${filters.date_from}-${filters.date_to}.xlsx`);
  };

  const s = data?.summary;

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporte de Taller</h1>
          <p className="text-sm text-gray-500 mt-0.5">Análisis de órdenes de trabajo por período</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Desde</label>
            <input type="date" value={filters.date_from}
              onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Hasta</label>
            <input type="date" value={filters.date_to}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button onClick={load} disabled={loading}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Cargando...' : 'Generar reporte'}
          </button>
          {data && (
            <button onClick={exportExcel}
              className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar Excel
            </button>
          )}
        </div>

        {/* KPI cards */}
        {s && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total OTs', value: s.total_orders, color: 'border-indigo-500', text: 'text-indigo-700' },
              { label: 'Completadas', value: s.completed, color: 'border-green-500', text: 'text-green-700' },
              { label: 'Mano de obra', value: fmt(s.total_labor), color: 'border-purple-500', text: 'text-purple-700' },
              { label: 'Repuestos', value: fmt(s.total_parts), color: 'border-teal-500', text: 'text-teal-700' },
              { label: 'Ingresos totales', value: fmt(s.total_revenue), color: 'border-emerald-500', text: 'text-emerald-700' },
              { label: 'En proceso', value: s.in_progress, color: 'border-amber-500', text: 'text-amber-700' },
              { label: 'Canceladas', value: s.cancelled, color: 'border-red-400', text: 'text-red-600' },
              { label: 'Días prom. resolución', value: `${s.avg_resolution_days} días`, color: 'border-blue-400', text: 'text-blue-700' },
            ].map((k, i) => (
              <div key={i} className={`bg-white rounded-xl shadow p-4 border-l-4 ${k.color}`}>
                <p className="text-xs text-gray-500 uppercase font-medium">{k.label}</p>
                <p className={`text-xl font-bold mt-1 ${k.text}`}>{k.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabla */}
        {data && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-bold text-gray-800">Detalle de órdenes ({data.data.length})</h3>
            </div>
            {data.data.length === 0 ? (
              <p className="p-8 text-center text-gray-500">No hay órdenes en el período seleccionado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['N° Orden','Estado','Cliente','Vehículo','Técnico','Creación','Entrega','Días','M. Obra','Repuestos','Total'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.data.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm font-mono font-semibold text-gray-800">{r.order_number}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            r.status === 'entregado' ? 'bg-green-100 text-green-700' :
                            r.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                            r.status === 'listo'     ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{STATUS_LABELS[r.status] || r.status}</span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-700 max-w-32 truncate">{r.customer}</td>
                        <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{r.vehicle}</td>
                        <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{r.technician}</td>
                        <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">{r.created_at}</td>
                        <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">{r.delivered_at || '-'}</td>
                        <td className="px-3 py-2 text-sm text-center text-gray-600">{r.resolution_days ?? '-'}</td>
                        <td className="px-3 py-2 text-sm text-right text-purple-700 font-medium">{fmt(r.labor_total)}</td>
                        <td className="px-3 py-2 text-sm text-right text-teal-700 font-medium">{fmt(r.parts_total)}</td>
                        <td className="px-3 py-2 text-sm text-right font-bold text-gray-900">{fmt(r.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}