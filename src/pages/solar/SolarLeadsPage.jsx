import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Users } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { getSolarLeads, updateSolarLead } from '../../api/solar';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { googleMapsSearchUrl } from '../../utils/mapsLinks';

const STATUS = {
  new: { label: 'Nuevo', cls: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'Contactado', cls: 'bg-amber-100 text-amber-800' },
  quoted: { label: 'Cotizado', cls: 'bg-indigo-100 text-indigo-800' },
  won: { label: 'Ganado', cls: 'bg-green-100 text-green-800' },
  discarded: { label: 'Descartado', cls: 'bg-gray-200 text-gray-600' },
};

/** Interesados captados por el simulador solar público. */
export default function SolarLeadsPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await getSolarLeads(status ? { status } : {})).data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron cargar los interesados');
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const change = async (lead, next) => {
    try {
      await updateSolarLead(lead.id, { status: next });
      setRows((rs) => rs.map((r) => (r.id === lead.id ? { ...r, status: next } : r)));
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar');
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        <Link to="/solar" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4" /> Cotizador solar</Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Interesados del simulador</h1>
          <p className="text-sm text-gray-500">Personas que calcularon su sistema en el simulador público y dejaron sus datos. Cada una tiene su estudio solar en borrador{' '}
            y, si usas el CRM, su oportunidad.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[['', 'Todos'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
            <button key={k || 'all'} onClick={() => setStatus(k)} className={`px-3 py-1.5 rounded-full text-sm border ${status === k ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}>{label}</button>
          ))}
        </div>
        {loading && rows.length === 0 ? (
          <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" /></div>
        ) : rows.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Todavía no hay interesados. Activa y publica el simulador en Parámetros.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Interesado</th>
                  <th className="px-4 py-3">Consumo y sistema</th>
                  <th className="px-4 py-3 hidden md:table-cell">Inversión estimada</th>
                  <th className="px-4 py-3">Estudio</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{l.name}</p>
                      <p className="text-xs text-gray-500">
                        <a href={`tel:${l.phone}`} className="hover:underline">{l.phone}</a>
                        {l.email && <> · <a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a></>}
                        {l.city && ` · ${l.city}`}
                      </p>
                      {l.address && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {l.address} · <a href={googleMapsSearchUrl(l.address, l.city)} target="_blank" rel="noreferrer" className="text-orange-700 hover:underline">Ver en Google Maps</a>
                        </p>
                      )}
                      <p className="text-xs text-gray-400">{formatDate(l.created_at)} · {l.segment === 'comercial' ? 'Negocio' : 'Hogar'}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {Math.round(Number(l.monthly_kwh)).toLocaleString('es-CO')} kWh/mes
                      <p className="text-xs text-gray-500">{Number(l.kwp).toLocaleString('es-CO')} kWp</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell tabular-nums text-gray-700">
                      {l.price_min ? `${formatCurrency(l.price_min)} – ${formatCurrency(l.price_max)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {l.study ? <Link to={`/solar/${l.study.id}`} className="text-orange-700 hover:underline">{l.study.number}</Link> : '—'}
                      {l.opportunity_id && <p className="text-xs text-gray-500">con oportunidad en el CRM</p>}
                    </td>
                    <td className="px-4 py-3">
                      <select value={l.status} onChange={(e) => change(l, e.target.value)} className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${STATUS[l.status]?.cls}`}>
                        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
