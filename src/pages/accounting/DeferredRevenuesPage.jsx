import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Layout from '../../components/layout/Layout';
import { deferredRevenueAPI } from '../../api/accounting';
import { formatCurrency } from '../../utils/formatters';
import useAuthStore from '../../store/authStore';

// Ingresos recibidos por anticipado (anualidades, semestralidades) que se
// causan mes a mes. Se crean solos al facturar un producto con "Ingreso
// diferido" (ficha del producto → Contabilidad). El job diario genera la
// cuota de cada mes al cierre (último día); el botón hace lo mismo a mano.

const STAFF_ROLES = ['admin', 'super_admin', 'accountant'];
const STATUS = {
  active: { label: 'Activo', cls: 'bg-blue-50 text-blue-700' },
  finished: { label: 'Terminado', cls: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Anulado', cls: 'bg-gray-100 text-gray-600' },
};

export default function DeferredRevenuesPage() {
  const { user } = useAuthStore();
  const isStaff = STAFF_ROLES.includes(user?.role);
  const [status, setStatus] = useState('active');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows((await deferredRevenueAPI.list(status ? { status } : {})).data || []);
    } catch {
      toast.error('Error cargando los ingresos diferidos');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [status]);

  const amortize = async (id) => {
    setBusy(true);
    try {
      const res = await deferredRevenueAPI.amortize(id);
      toast.success(res.message);
      (res.data?.errors || []).forEach((e) => toast.error(e.error, { duration: 8000 }));
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error amortizando');
    } finally {
      setBusy(false);
    }
  };

  const totalPending = rows.reduce((s, r) => s + Number(r.pending_amount || 0), 0);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Ingresos diferidos</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-3xl">
              Cobros recibidos por anticipado (anualidades, semestralidades) que se causan mes a mes: cada mes, débito a la cuenta de pasivo y crédito a la de ingreso.
              Se crean al facturar un producto con ingreso diferido (ficha del producto → Contabilidad). Pitbox genera la cuota de cada mes en borrador al cierre del mes (fechada el último día).
            </p>
          </div>
          {isStaff && (
            <button onClick={() => amortize(null)} disabled={busy} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">
              Amortizar meses pendientes
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="active">Activos</option>
            <option value="finished">Terminados</option>
            <option value="cancelled">Anulados</option>
            <option value="">Todos</option>
          </select>
          <span className="text-sm text-gray-600">Por causar: <b>{formatCurrency(totalPending)}</b></span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Factura / concepto</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Cuentas</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-center">Meses</th>
                <th className="px-3 py-2 text-right">Causado</th>
                <th className="px-3 py-2 text-right">Por causar</th>
                <th className="px-3 py-2 text-left">Estado</th>
                {isStaff && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">Cargando…</td></tr>}
              {!loading && !rows.length && <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">No hay ingresos diferidos {status === 'active' ? 'activos' : ''}.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{r.sale_number}</div>
                    <div className="text-xs text-gray-500">{r.description}</div>
                    <div className="text-xs text-gray-400">Desde {String(r.start_date).slice(0, 7)}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{r.customer_name || '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    <div>Pasivo: {r.liability_account}</div>
                    <div>Ingreso: {r.revenue_account}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.total_amount)}</td>
                  <td className="px-3 py-2 text-center">{r.months_amortized}/{r.months}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.amortized_amount)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.pending_amount)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS[r.status]?.cls || ''}`}>{STATUS[r.status]?.label || r.status}</span>
                    {r.last_error && (
                      <div className="flex gap-1 text-xs text-red-600 mt-1" title={r.last_error}>
                        <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" /> {r.last_error}
                      </div>
                    )}
                  </td>
                  {isStaff && (
                    <td className="px-3 py-2 text-right">
                      {r.status === 'active' && (
                        <button onClick={() => amortize(r.id)} disabled={busy} className="text-blue-600 hover:underline text-xs disabled:opacity-50">Amortizar</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
