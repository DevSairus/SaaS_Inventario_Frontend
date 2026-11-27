// frontend/src/pages/workshop/InspectionsPage.jsx
// Listado de peritajes vehiculares (PER-) + creación. El peritaje se
// diligencia en InspectionDetailPage.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ClipboardCheck, Plus, Search, Settings2, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/layout/Layout';
import Pagination from '../../components/common/Pagination';
import usePaginatedList from '../../hooks/usePaginatedList';
import { usePermissions } from '../../store/tenantPermissionsStore';
import { inspectionsApi } from '../../api/workshop';
import { CONCEPTS, STATUSES, fmtScore, scoreColor } from '../../constants/inspection';
import NewInspectionModal from '../../components/workshop/NewInspectionModal';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

export default function InspectionsPage() {
  const navigate = useNavigate();
  const can = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [concept, setConcept] = useState('');
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // /workshop/inspections?new=1&vehicle_id=... abre el modal con el vehículo
  // elegido (botón "Nuevo peritaje" de la ficha del vehículo).
  const presetVehicleId = searchParams.get('vehicle_id');
  useEffect(() => {
    if (searchParams.get('new') === '1') setShowNew(true);
  }, [searchParams]);

  const filters = useMemo(() => ({ search: debounced || undefined, status: status || undefined, concept: concept || undefined }), [debounced, status, concept]);
  const list = usePaginatedList(
    (params, { signal }) => inspectionsApi.list(params, { signal }).then((r) => r.data),
    { filters, defaultPageSize: 25, onError: () => toast.error('Error cargando peritajes') },
  );

  const closeNew = () => {
    setShowNew(false);
    if (searchParams.get('new')) {
      const next = new URLSearchParams(searchParams);
      next.delete('new'); next.delete('vehicle_id');
      setSearchParams(next, { replace: true });
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ClipboardCheck size={20} className="text-blue-600" /> Peritajes</h1>
            <p className="text-sm text-gray-500">Inspección técnica con puntaje, concepto y certificado verificable por QR.</p>
          </div>
          <div className="flex gap-2">
            {can('workshop.inspections.templates') && (
              <Link to="/workshop/inspections/templates" className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                <Settings2 size={15} /> Plantillas
              </Link>
            )}
            {can('workshop.inspections.write') && (
              <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <Plus size={15} /> Nuevo peritaje
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Placa, número o solicitante…" className={`${inputCls} w-full pl-9`} />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUSES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <select value={concept} onChange={(e) => setConcept(e.target.value)} className={inputCls}>
            <option value="">Todos los conceptos</option>
            {Object.entries(CONCEPTS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </select>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {list.rows.length === 0 && !list.loading ? (
            <div className="text-center py-14 text-gray-400">
              <ClipboardCheck size={30} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay peritajes {debounced || status || concept ? 'con esos filtros' : 'todavía'}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr className="text-left">
                    <th className="px-4 py-2.5 font-medium">Número</th>
                    <th className="px-4 py-2.5 font-medium">Vehículo</th>
                    <th className="px-4 py-2.5 font-medium hidden md:table-cell">Solicitante</th>
                    <th className="px-4 py-2.5 font-medium">Fecha</th>
                    <th className="px-4 py-2.5 font-medium text-right">Puntaje</th>
                    <th className="px-4 py-2.5 font-medium">Concepto</th>
                    <th className="px-4 py-2.5 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.rows.map((i) => {
                    const c = CONCEPTS[i.concept || i.suggested_concept];
                    const st = STATUSES[i.status];
                    return (
                      <tr key={i.id} onClick={() => navigate(`/workshop/inspections/${i.id}`)} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-800">
                          {i.number}
                          {i.is_public && <Globe size={11} className="inline ml-1 text-blue-500" title="Publicado en el portal del vehículo" />}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-gray-900">{i.vehicle?.plate}</span>
                          <span className="block text-xs text-gray-500">{[i.vehicle?.brand, i.vehicle?.model, i.vehicle?.year].filter(Boolean).join(' ')}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-700">{i.requester_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(i.inspected_at)}</td>
                        <td className="px-4 py-3 text-right font-bold" style={{ color: scoreColor(i.score === null ? null : Number(i.score)) }}>{fmtScore(i.score)}</td>
                        <td className="px-4 py-3">
                          {c ? <span className={`text-xs px-2 py-0.5 rounded-full border ${c.cls} ${!i.concept ? 'opacity-60' : ''}`} title={!i.concept ? 'Sugerido' : undefined}>{c.short}</span> : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st?.cls}`}>{st?.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-3 border-t border-gray-50">
            <Pagination {...list.paginationProps} />
          </div>
        </div>
      </div>

      {showNew && (
        <NewInspectionModal
          presetVehicleId={presetVehicleId}
          onClose={closeNew}
          onCreated={(insp) => { closeNew(); navigate(`/workshop/inspections/${insp.id}`); }}
        />
      )}
    </Layout>
  );
}
