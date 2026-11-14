import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarCheck, FileSpreadsheet, FileText, Plus, Search } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { usePermissions } from '../../store/tenantPermissionsStore';
import { usersAPI } from '../../api/users';
import { getMaintenanceAgenda, getMaintenanceInstallations, openMaintenanceVisitPdf } from '../../api/projects';
import InstallationFormModal from '../../components/projects/InstallationFormModal';
import ImportInstallationsModal from '../../components/projects/ImportInstallationsModal';
import { formatDate } from '../../utils/formatters';
import { CloseVisitModal, RescheduleVisitModal, VisitBadge } from '../../components/projects/MaintenanceVisitModals';

const FILTERS = [
  ['', 'Pendientes'], ['overdue', 'Vencidas'], ['due_soon', 'Por vencer'], ['done', 'Realizadas'],
];

/** Instalaciones (sistemas de los clientes) con su próxima visita. */
function InstallationsList({ reloadKey }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState(null);

  const load = useCallback(() => {
    getMaintenanceInstallations({ search }).then((r) => setRows(r.data)).catch((e) => toast.error(e.response?.data?.message || 'No se pudieron cargar las instalaciones'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, reloadKey]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente, NIT, sistema o ciudad" className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800" />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-2">Sistema</th><th className="px-4 py-2">Cliente</th><th className="px-4 py-2">Ciudad</th>
              <th className="px-4 py-2">Planes</th><th className="px-4 py-2">Próxima visita</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {!rows && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Cargando…</td></tr>}
            {rows && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                Sin instalaciones. Crea las de tus clientes con "Nueva instalación" o impórtalas desde Excel; las de proyectos de Pitbox se activan en la pestaña Mantenimiento del proyecto.
              </td></tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id} onClick={() => navigate(`/maintenance/installations/${r.id}`)} className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 ${r.is_active ? '' : 'opacity-50'}`}>
                <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{r.name}{r.project_id ? null : <span className="ml-2 text-xs text-gray-500">anterior a Pitbox</span>}</td>
                <td className="px-4 py-2">{r.customer?.name}<p className="text-xs text-gray-500">{r.customer?.tax_id}</p></td>
                <td className="px-4 py-2">{r.city || '—'}</td>
                <td className="px-4 py-2">{r.active_plans}</td>
                <td className="px-4 py-2 whitespace-nowrap">{r.next_visit ? <>{formatDate(r.next_visit.scheduled_date)} <VisitBadge visit={{ status: 'scheduled', alert: r.next_visit.alert }} /></> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Mantenimientos (Fase 4, req. 1.3): agenda de visitas de todas las
 * instalaciones con su alerta (vencida / por vencer), y las instalaciones
 * (sistemas de los clientes), incluidas las anteriores a Pitbox.
 */
export default function MaintenancePage() {
  const navigate = useNavigate();
  const can = usePermissions();
  // Alta de instalaciones (sistemas de clientes, también los anteriores a Pitbox):
  // los botones van en el encabezado para verse desde la agenda y desde Instalaciones.
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const canManage = can('projects.maintenance.manage');
  const canVisit = can('projects.maintenance.visit');
  const [view, setView] = useState('agenda');
  const [filter, setFilter] = useState('');
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [closing, setClosing] = useState(null);
  const [moving, setMoving] = useState(null);

  const load = useCallback(() => {
    const params = filter === 'done' ? { status: 'done' } : { status: 'scheduled', ...(filter ? { alert: filter } : {}) };
    getMaintenanceAgenda(params).then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'No se pudo cargar la agenda'));
  }, [filter]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    usersAPI.getAll({ limit: 200, is_active: true, has_system_access: true }).then((r) => setUsers(r.data?.users || [])).catch(() => setUsers([]));
  }, []);

  const s = data?.summary;
  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><CalendarCheck className="w-6 h-6" /> Mantenimientos</h1>
            <p className="text-sm text-gray-500 mt-0.5">Visitas programadas de los sistemas de tus clientes: los de proyectos de Pitbox y los instalados antes.</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowImport(true)} className="inline-flex items-center gap-1 px-3 py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"><FileSpreadsheet className="w-4 h-4" /> Importar desde Excel</button>
              <button type="button" onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"><Plus className="w-4 h-4" /> Nueva instalación</button>
            </div>
          )}
        </div>

        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {[['agenda', 'Agenda de visitas'], ['installations', 'Instalaciones']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setView(k)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${view === k ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>

        {view === 'installations' ? <InstallationsList reloadKey={reloadKey} /> : (<>

        {s && filter !== 'done' && (
          <div className="grid grid-cols-3 gap-3">
            <button type="button" onClick={() => setFilter('overdue')} className="text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg px-4 py-3">
              <p className="text-xs text-red-800 dark:text-red-300">Vencidas</p><p className="text-2xl font-bold text-red-900 dark:text-red-200">{s.overdue}</p>
            </button>
            <button type="button" onClick={() => setFilter('due_soon')} className="text-left bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-4 py-3">
              <p className="text-xs text-amber-800 dark:text-amber-300">Por vencer</p><p className="text-2xl font-bold text-amber-900 dark:text-amber-200">{s.due_soon}</p>
            </button>
            <button type="button" onClick={() => setFilter('')} className="text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500">Pendientes</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.scheduled}</p>
            </button>
          </div>
        )}

        <div className="flex gap-2 flex-wrap text-sm">
          {FILTERS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} className={`px-3 py-1 rounded-full border ${filter === k ? 'bg-orange-600 text-white border-orange-600' : 'border-gray-300'}`}>{l}</button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-2">Visita</th><th className="px-4 py-2">{filter === 'done' ? 'Realizada' : 'Fecha'}</th><th className="px-4 py-2">Instalación</th>
                <th className="px-4 py-2">Plan</th><th className="px-4 py-2">Técnico</th><th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {!data && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Cargando…</td></tr>}
              {data && data.visits.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Sin visitas.</td></tr>}
              {data?.visits.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{v.visit_no} <VisitBadge visit={v} /></td>
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(filter === 'done' ? v.done_at : v.scheduled_date)}</td>
                  <td className="px-4 py-2">
                    {v.installation ? <Link to={`/maintenance/installations/${v.installation.id}`} className="text-orange-700 hover:underline">{v.installation.name}</Link> : '—'}
                    <p className="text-xs text-gray-500">{[v.installation?.customer, v.installation?.city].filter(Boolean).join(' · ')}</p>
                  </td>
                  <td className="px-4 py-2">{v.plan?.name}{v.equipment ? <span className="text-xs text-gray-500"> · {v.equipment.name}</span> : ''}</td>
                  <td className="px-4 py-2">{v.technician?.name || '—'}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap space-x-2">
                    {v.status === 'scheduled' && canVisit && <button type="button" onClick={() => setClosing(v)} className="px-2.5 py-1 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700">Cerrar visita</button>}
                    {v.status === 'scheduled' && canManage && <button type="button" onClick={() => setMoving(v)} className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Reprogramar</button>}
                    <button type="button" onClick={() => openMaintenanceVisitPdf(v.id).catch(() => toast.error('No se pudo abrir el acta'))} className="text-gray-400 hover:text-orange-700 align-middle" title="Acta PDF"><FileText className="w-4 h-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>)}
      </div>
      <InstallationFormModal isOpen={showNew} onClose={() => setShowNew(false)} onSaved={(inst) => (inst?.id ? navigate(`/maintenance/installations/${inst.id}`) : setReloadKey((k) => k + 1))} />
      <ImportInstallationsModal isOpen={showImport} onClose={() => setShowImport(false)} onDone={() => { setView('installations'); setReloadKey((k) => k + 1); load(); }} />
      <CloseVisitModal visit={closing} onClose={() => setClosing(null)} onDone={load} />
      <RescheduleVisitModal visit={moving} users={users} onClose={() => setMoving(null)} onDone={load} />
    </Layout>
  );
}
