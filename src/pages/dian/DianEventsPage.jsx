// frontend/src/pages/dian/DianEventsPage.jsx
import { useState, useEffect } from 'react';
import { getDianEvents } from '../../api/dian';
import Layout from '../../components/layout/Layout';

const STATUS_COLORS = {
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  error:    'bg-red-100 text-red-800',
  pending:  'bg-yellow-100 text-yellow-800',
};

const EVENT_ICONS = {
  SendBillSync:       '📤',
  SendTestSetAsync:   '🧪',
  GetStatusZip:       '🔍',
  GetStatus:          '🔍',
  GetNumberingRange:  '📋',
};

export default function DianEventsPage() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const LIMIT = 20;

  useEffect(() => { load(); }, [offset]);

  async function load() {
    setLoading(true);
    try {
      const r = await getDianEvents({ limit: LIMIT, offset });
      setEvents(r.data.data || []);
      setTotal(r.data.pagination?.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Auditoría DIAN</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Registro de todos los eventos de comunicación con la DIAN
          </p>
        </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Cargando...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p>No hay eventos registrados</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Evento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nro. Factura</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Entorno</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map(ev => (
                <tr key={ev.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(ev.created_at).toLocaleString('es-CO')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      <span>{EVENT_ICONS[ev.event_type] || '📄'}</span>
                      <span className="font-medium text-gray-900">{ev.event_type}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700">
                    {ev.invoice_number || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                      ${STATUS_COLORS[ev.status] || 'bg-gray-100 text-gray-600'}`}>
                      {ev.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs
                      ${ev.is_test ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {ev.is_test ? '🧪 Pruebas' : '✅ Producción'}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {ev.error_message ? (
                      <span className="text-red-600 text-xs truncate block" title={ev.error_message}>
                        {ev.error_message}
                      </span>
                    ) : ev.cufe ? (
                      <span className="text-gray-400 font-mono text-xs truncate block" title={ev.cufe}>
                        CUFE: {ev.cufe?.substring(0, 16)}...
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {total > LIMIT && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{total} eventos en total</span>
          <div className="flex gap-2">
            <button disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">
              ← Anterior
            </button>
            <button disabled={offset + LIMIT >= total}
              onClick={() => setOffset(offset + LIMIT)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}