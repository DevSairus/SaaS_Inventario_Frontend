import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowLeft, Pencil, Warehouse as WarehouseIcon } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { usePermissions } from '../../store/tenantPermissionsStore';
import ProjectFormModal from '../../components/projects/ProjectFormModal';
import BomTab from '../../components/projects/BomTab';
import StagesTab from '../../components/projects/StagesTab';
import MaintenanceTab from '../../components/projects/MaintenanceTab';
import BudgetTab from '../../components/projects/BudgetTab';
import PnlTab from '../../components/projects/PnlTab';
import DocumentsTab from '../../components/projects/DocumentsTab';
import ReturnSurplusModal from '../../components/projects/ReturnSurplusModal';
import LaborTab from '../../components/projects/LaborTab';
import ToolsTab from '../../components/projects/ToolsTab';
import BillingTab from '../../components/projects/BillingTab';
import { invalidateProjectOptions } from '../../components/projects/ProjectSelect';
import { getProject, changeProjectStatus, createProjectWarehouse, closeProjectContract } from '../../api/projects';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  PROJECT_STATUS, STATUS_ACTION, PROJECT_TYPES, customerName, userName,
} from '../../components/projects/projectConstants';

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm text-gray-900 dark:text-gray-100">{children || '—'}</p>
  </div>
);

function SummaryTab({ project, canManage, canStock, onReturn, onChanged }) {
  const [busy, setBusy] = useState(false);
  const s = project.summary;
  const createWarehouse = async () => {
    setBusy(true);
    try {
      const res = await createProjectWarehouse(project.id);
      toast.success(res.message);
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo crear la bodega');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Contrato', project.contract_amount ? formatCurrency(project.contract_amount) : '—'],
            ['Ingresos netos', formatCurrency(s.revenue)],
            ['Costos', formatCurrency(s.costs)],
            ['Margen bruto', `${formatCurrency(s.gross_margin)}${s.margin_pct !== null ? ` · ${s.margin_pct}%` : ''}`],
          ].map(([label, value]) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Cliente">{customerName(project.customer)}{project.customer?.tax_id ? ` · ${project.customer.tax_id}` : ''}</Field>
        <Field label="Tipo">{PROJECT_TYPES[project.type]}</Field>
        <Field label="Capacidad">{project.capacity_kwp ? `${Number(project.capacity_kwp)} kWp` : ''}</Field>
        <Field label="Ubicación">{[project.site_address, project.city].filter(Boolean).join(', ')}</Field>
        <Field label="Responsable">{project.manager ? userName(project.manager) : ''}</Field>
        <Field label="Sede">{project.branch?.name}</Field>
        <Field label="Inicio">{project.start_date ? formatDate(project.start_date) : ''}</Field>
        <Field label="Entrega planeada">{project.end_date_planned ? formatDate(project.end_date_planned) : ''}</Field>
        <Field label="Entrega real">{project.end_date_actual ? formatDate(project.end_date_actual) : ''}</Field>
        {project.quote && (
          <Field label="Cotización de origen">
            <Link to={`/sales/${project.quote.id}`} className="text-orange-600 hover:underline">{project.quote.sale_number}</Link>
          </Field>
        )}
        {project.closed_at && <Field label="Cerrado">{formatDate(project.closed_at)}{project.closer ? ` por ${userName(project.closer)}` : ''}</Field>}
        {project.notes && <div className="sm:col-span-2 lg:col-span-3"><Field label="Notas">{project.notes}</Field></div>}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2"><WarehouseIcon className="w-4 h-4" /> Bodega de la obra</h3>
        {project.warehouse ? (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>{project.warehouse.name}</strong>{project.warehouse.is_active === false ? ' (inactiva)' : ''}.
            {' '}Los materiales despachados y las compras recibidas aquí son el costo de materiales del proyecto; lo que se devuelve con un traslado a otra bodega se descuenta.
            {s?.materials_in_transit > 0 && <span className="block mt-1 text-amber-700">En tránsito hacia la obra: {formatCurrency(s.materials_in_transit)}</span>}
            {canStock && !['closed', 'cancelled'].includes(project.status) && (
              <button onClick={onReturn} className="block mt-3 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                Reintegrar sobrante a otra bodega
              </button>
            )}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">El proyecto aún no tiene bodega. Créala para despachar materiales y medir su costo.</p>
            {canManage && !['closed', 'cancelled'].includes(project.status) && (
              <button onClick={createWarehouse} disabled={busy} className="px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">Crear bodega</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = usePermissions();
  const canManage = can('projects.manage');
  const canStock = can('projects.stock');
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocker, setBlocker] = useState(null);
  const [showReturn, setShowReturn] = useState(false);

  const tabs = [
    ['summary', 'Resumen'],
    ['bom', 'Materiales'],
    ['stages', 'Etapas'],
    ['labor', 'Mano de obra'],
    ['tools', 'Herramientas'],
    ['maintenance', 'Mantenimiento'],
    ...(project?.can_see_pnl ? [['billing', 'Cortes y facturación'], ['budget', 'Presupuesto'], ['pnl', 'Resultados']] : []),
    ['documents', 'Documentos'],
  ];
  const tab = tabs.some(([k]) => k === searchParams.get('tab')) ? searchParams.get('tab') : 'summary';

  const load = useCallback(async () => {
    try {
      const res = await getProject(id);
      setProject(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cargar el proyecto');
      if (e.response?.status === 404) navigate('/projects');
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (status) => {
    if (['closed', 'cancelled'].includes(status)
      && !window.confirm(`¿${STATUS_ACTION[status]} ${project.code}? Se liberan las reservas, la bodega queda inactiva y no admite documentos nuevos.`)) return;
    // Contrato facturado por cortes y todavía abierto: se ofrece cerrarlo con su saldo.
    let contractReason = null;
    if (['closed', 'cancelled'].includes(status) && project.quote?.quote_status === 'contratada') {
      const r = window.prompt(`El contrato ${project.quote.sale_number} tiene saldo sin facturar. Para cerrarlo también, escribe el motivo (vacío = dejarlo abierto):`, '');
      if (r === null) return;
      contractReason = r.trim() || null;
    }
    setBusy(true);
    setBlocker(null);
    try {
      if (contractReason) {
        const c = await closeProjectContract(project.id, contractReason);
        toast.success(c.message);
      }
      const res = await changeProjectStatus(project.id, status);
      toast.success(res.message);
      invalidateProjectOptions();
      load();
    } catch (e) {
      const data = e.response?.data;
      if (data?.code === 'WAREHOUSE_NOT_EMPTY' || data?.code === 'TRANSFERS_IN_TRANSIT') setBlocker(data);
      else toast.error(data?.message || 'No se pudo cambiar el estado');
    } finally {
      setBusy(false);
    }
  };

  if (!project) {
    return <Layout><div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" /></div></Layout>;
  }

  const st = PROJECT_STATUS[project.status];
  const editable = canManage && !['closed', 'cancelled'].includes(project.status);

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="min-w-0">
            <button onClick={() => navigate('/projects')} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-1">
              <ArrowLeft className="w-4 h-4" /> Proyectos
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
              <span className="font-medium text-gray-700 dark:text-gray-300">{project.code}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st?.cls}`}>{st?.label}</span>
              {project.customer && <span>· {customerName(project.customer)}</span>}
            </div>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              {editable && (
                <button onClick={() => setShowEdit(true)} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Pencil className="w-4 h-4" /> Editar
                </button>
              )}
              {(project.allowed_transitions || []).map((next) => (
                <button
                  key={next}
                  disabled={busy}
                  onClick={() => changeStatus(next)}
                  className={`px-3 py-2 text-sm rounded-lg disabled:opacity-60 ${
                    next === 'cancelled' ? 'text-red-600 hover:bg-red-50'
                      : ['approved', 'in_progress', 'completed', 'closed'].includes(next) ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'border border-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {next === 'in_progress' && project.status === 'completed' ? 'Reabrir'
                    : next === 'in_progress' && project.status === 'on_hold' ? 'Reanudar' : STATUS_ACTION[next]}
                </button>
              ))}
            </div>
          )}
        </div>

        {project.budget_alerts?.length > 0 && (() => {
          const critical = project.budget_alerts.filter((a) => a.level === 'critical');
          const shown = critical.length ? critical : project.budget_alerts;
          const LABEL = { total: 'Total del proyecto', materials: 'Materiales', labor: 'Mano de obra', services: 'Servicios y subcontratos', other: 'Otros costos' };
          return (
            <div className={`text-sm rounded-lg px-4 py-3 border flex items-start gap-2 ${critical.length ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{critical.length ? 'Sobrecosto' : 'Cerca del límite del presupuesto'}</p>
                <p>{shown.map((a) => `${LABEL[a.category] || a.category}: ${Number(a.executed_pct)}% del presupuesto`).join(' · ')}</p>
                <button onClick={() => setSearchParams({ tab: 'pnl' })} className="underline mt-0.5">Ver presupuesto vs. ejecutado</button>
              </div>
            </div>
          );
        })()}

        {blocker && (
          <div className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-3">
            <p className="font-medium">{blocker.message}</p>
            {Array.isArray(blocker.data) && blocker.data.length > 0 && (
              <ul className="list-disc ml-5 mt-1">
                {blocker.data.slice(0, 10).map((p) => <li key={p.product_id}>{p.name} ({p.sku}): {Number(p.quantity)}</li>)}
                {blocker.data.length > 10 && <li>y {blocker.data.length - 10} más</li>}
              </ul>
            )}
            <p className="mt-2 flex flex-wrap gap-4">
              {blocker.code === 'WAREHOUSE_NOT_EMPTY' && canStock && (
                <button onClick={() => setShowReturn(true)} className="text-orange-700 font-medium hover:underline">Reintegrar sobrante</button>
              )}
              {blocker.code === 'TRANSFERS_IN_TRANSIT' && (
                <Link to={`/projects/${project.id}?tab=documents`} onClick={() => setBlocker(null)} className="text-orange-700 hover:underline">Ver traslados en tránsito</Link>
              )}
              <Link to="/inventory/internal-consumptions" className="text-orange-700 hover:underline">Registrar consumo interno</Link>
              <button onClick={() => setBlocker(null)} className="text-gray-500 hover:underline">Cerrar</button>
            </p>
          </div>
        )}

        <div className="border-b border-gray-200 dark:border-gray-700 flex gap-1 overflow-x-auto">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSearchParams(key === 'summary' ? {} : { tab: key })}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'summary' && <SummaryTab project={project} canManage={canManage} canStock={canStock} onReturn={() => setShowReturn(true)} onChanged={load} />}
        {tab === 'bom' && <BomTab project={project} canManage={canManage} canStock={canStock} onChanged={load} />}
        {tab === 'stages' && <StagesTab project={project} canManage={canManage} canStock={canStock} onChanged={load} />}
        {tab === 'labor' && <LaborTab project={project} canSeeCosts={Boolean(project.can_see_pnl)} onChanged={load} />}
        {tab === 'tools' && <ToolsTab project={project} canSeeCosts={Boolean(project.can_see_pnl)} />}
        {tab === 'maintenance' && <MaintenanceTab project={project} />}
        {tab === 'billing' && <BillingTab project={project} onChanged={load} />}
        {tab === 'budget' && <BudgetTab project={project} canManage={canManage} onChanged={load} />}
        {tab === 'pnl' && <PnlTab project={project} />}
        {tab === 'documents' && <DocumentsTab project={project} canManage={canManage} />}
      </div>

      <ReturnSurplusModal
        isOpen={showReturn}
        onClose={() => setShowReturn(false)}
        project={project}
        onDone={() => { setBlocker(null); load(); }}
      />
      <ProjectFormModal isOpen={showEdit} onClose={() => setShowEdit(false)} project={project} onSaved={load} />
    </Layout>
  );
}
