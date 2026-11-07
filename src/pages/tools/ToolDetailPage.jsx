import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowLeft, FileText, Pencil, PenLine } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { usePermissions } from '../../store/tenantPermissionsStore';
import AttachmentsPanel from '../../components/attachments/AttachmentsPanel';
import ToolFormModal from '../../components/tools/ToolFormModal';
import { AssignToolModal, ReturnToolModal, ToolEventModal, RetireToolModal } from '../../components/tools/ToolActionModals';
import { getTool, setToolInService, openToolActa } from '../../api/tools';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TOOL_STATUS, COST_MODES, EVENT_TYPES, CONDITIONS, DUE_LABEL } from '../../components/tools/toolConstants';

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm text-gray-900 dark:text-gray-100">{children || '—'}</p>
  </div>
);
const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700';
const supplierName = (s) => s?.business_name || s?.name || '';
const userName = (u) => (u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : '');

export default function ToolDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = usePermissions();
  const canManage = can('tools.manage');
  const canAssign = can('tools.assign');
  const [tool, setTool] = useState(null);
  const [modal, setModal] = useState(null); // edit | assign | return | event:<type> | retire
  const [returning, setReturning] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await getTool(id);
      setTool(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cargar la herramienta');
      if (e.response?.status === 404) navigate('/tools');
    }
  }, [id, navigate]);
  useEffect(() => { load(); }, [load]);

  if (!tool) {
    return <Layout><div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" /></div></Layout>;
  }

  const st = TOOL_STATUS[tool.display_status];
  const active = tool.assignments.filter((a) => a.status === 'active');
  const retired = tool.status === 'retired';
  const close = () => { setModal(null); setReturning(null); };
  const acta = (a, kind) => openToolActa(a.id, kind).catch(() => toast.error('No se pudo abrir el acta'));
  const toggleService = async (inService) => {
    try {
      const r = await setToolInService(tool.id, inService);
      toast.success(r.message);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cambiar el estado');
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        <Link to="/tools" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4" /> Herramientas</Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{tool.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st?.cls}`}>{st?.label}</span>
            </div>
            <p className="text-sm text-gray-500">
              {tool.code}{tool.category ? ` · ${tool.category}` : ''}{tool.serial_number ? ` · S/N ${tool.serial_number}` : ''}
              {tool.tracking === 'quantity' ? ` · ${tool.available_quantity} de ${tool.quantity_total} unidades disponibles` : ''}
            </p>
          </div>
          {!retired && (
            <div className="flex flex-wrap gap-2">
              {canAssign && tool.available_quantity > 0 && (
                <button onClick={() => setModal('assign')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-orange-600 text-white hover:bg-orange-700">
                  <PenLine className="w-4 h-4" /> Entregar
                </button>
              )}
              {canManage && (
                <>
                  <button onClick={() => setModal('event:maintenance')} className={btn}>Mantenimiento</button>
                  {tool.requires_calibration && <button onClick={() => setModal('event:calibration')} className={btn}>Calibración</button>}
                  {tool.status === 'maintenance'
                    ? <button onClick={() => setModal('event:repair')} className={btn}>Registrar reparación</button>
                    : <button onClick={() => setModal('event:damage')} className={btn}>Reportar daño</button>}
                  {tool.status === 'maintenance'
                    ? <button onClick={() => toggleService(true)} className={btn}>Volver a servicio</button>
                    : (tool.tracking === 'individual' && !active.length && <button onClick={() => toggleService(false)} className={btn}>Enviar a mantenimiento</button>)}
                  <button onClick={() => setModal('event:note')} className={btn}>Nota</button>
                  <button onClick={() => setModal('edit')} className={btn}><Pencil className="w-4 h-4" /> Editar</button>
                  <button onClick={() => setModal('retire')} disabled={active.length > 0} title={active.length ? 'Primero registra la devolución' : ''} className={`${btn} text-red-700 disabled:opacity-40`}>Dar de baja</button>
                </>
              )}
            </div>
          )}
        </div>

        {retired && (
          <div className="text-sm rounded-lg px-4 py-3 border bg-gray-50 border-gray-200 text-gray-700">
            Dada de baja el {formatDate(tool.retired_at)}: {tool.retirement_reason}
          </div>
        )}
        {(tool.due.maintenance || tool.due.calibration) && !retired && (
          <div className="text-sm rounded-lg px-4 py-3 border bg-amber-50 border-amber-200 text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {[
              tool.due.maintenance && `Mantenimiento ${DUE_LABEL[tool.due.maintenance]} (${formatDate(tool.next_maintenance_date)})`,
              tool.due.calibration && `Calibración ${DUE_LABEL[tool.due.calibration]}${tool.next_calibration_date ? ` (${formatDate(tool.next_calibration_date)})` : ''}`,
            ].filter(Boolean).join(' · ')}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Quién la tiene</h3>
              {active.length === 0 ? (
                <p className="text-sm text-gray-500">{retired ? 'Dada de baja.' : tool.status === 'maintenance' ? 'En mantenimiento.' : 'Disponible en bodega.'}</p>
              ) : (
                <div className="space-y-2">
                  {active.map((a) => (
                    <div key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{a.quantity > 1 ? `${a.quantity} unidades · ` : ''}{a.responsible_name}</p>
                        <p className="text-xs text-gray-500">
                          {a.number} · desde {formatDate(a.assigned_at)}
                          {a.project ? <> · <Link className="text-orange-700 hover:underline" to={`/projects/${a.project.id}`}>{a.project.code} {a.project.name}</Link></> : ' · uso general'}
                          {a.expected_return_date && <span className={a.expected_return_date < new Date().toISOString().slice(0, 10) ? 'text-red-600' : ''}> · devolver el {formatDate(a.expected_return_date)}</span>}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => acta(a, 'entrega')} className={btn}><FileText className="w-4 h-4" /> Acta</button>
                        {canAssign && <button onClick={() => { setReturning(a); setModal('return'); }} className={btn}>Recibir</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Hoja de vida</h3>
              <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2 space-y-4">
                {tool.events.map((e) => (
                  <li key={e.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-orange-500 border-2 border-white dark:border-gray-800" />
                    <p className="text-sm">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{EVENT_TYPES[e.event_type] || e.event_type}</span>
                      <span className="text-gray-500"> · {formatDate(e.event_date)}</span>
                      {e.cost != null && Number(e.cost) > 0 && <span className="text-gray-700 dark:text-gray-300"> · {formatCurrency(e.cost)}</span>}
                    </p>
                    {e.description && <p className="text-sm text-gray-700 dark:text-gray-300">{e.description}</p>}
                    <p className="text-xs text-gray-500">
                      {[
                        e.supplier && supplierName(e.supplier),
                        e.certificate_number && `Certificado ${e.certificate_number}`,
                        e.next_due_date && `Próxima: ${formatDate(e.next_due_date)}`,
                        e.creator && `Registró ${userName(e.creator)}`,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Entregas y devoluciones</h3>
              {tool.assignments.length === 0 ? <p className="text-sm text-gray-500">Todavía no se ha entregado.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-gray-500 uppercase"><th className="py-2 pr-3">Acta</th><th className="py-2 pr-3">Responsable</th><th className="py-2 pr-3">Proyecto</th><th className="py-2 pr-3">Entrega</th><th className="py-2 pr-3">Devolución</th><th className="py-2" /></tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {tool.assignments.map((a) => (
                        <tr key={a.id}>
                          <td className="py-2 pr-3 whitespace-nowrap">{a.number}{a.quantity > 1 ? ` (${a.quantity})` : ''}</td>
                          <td className="py-2 pr-3">{a.responsible_name}</td>
                          <td className="py-2 pr-3">{a.project ? a.project.code : '—'}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{formatDate(a.assigned_at)}{a.has_delivery_signature ? ' ✍' : ''}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {a.status === 'returned' ? <>{formatDate(a.returned_at)} · {CONDITIONS[a.return_condition]}{a.lost_quantity ? ` (${a.lost_quantity} perdidas)` : ''}</> : <span className="text-blue-700">En uso</span>}
                          </td>
                          <td className="py-2 text-right whitespace-nowrap">
                            <button onClick={() => acta(a, 'entrega')} className="text-orange-700 hover:underline text-xs">Entrega</button>
                            {a.status === 'returned' && <button onClick={() => acta(a, 'devolucion')} className="ml-2 text-orange-700 hover:underline text-xs">Devolución</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Datos</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Marca">{tool.brand}</Field>
                <Field label="Modelo">{tool.model}</Field>
                <Field label="Ubicación">{tool.location}</Field>
                <Field label="Control">{tool.tracking === 'quantity' ? `Por cantidad (${tool.quantity_total})` : 'Individual'}</Field>
              </div>
              {tool.notes && <Field label="Notas">{tool.notes}</Field>}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Costo · {COST_MODES[tool.cost_mode]?.label}</h3>
              <p className="text-xs text-gray-500">{COST_MODES[tool.cost_mode]?.hint}</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Costo de compra">{tool.acquisition_cost != null ? formatCurrency(tool.acquisition_cost) : null}</Field>
                <Field label="Fecha de compra">{tool.acquisition_date ? formatDate(tool.acquisition_date) : null}</Field>
                <Field label="Documento">{tool.acquisition_reference}</Field>
                <Field label="Proveedor">{supplierName(tool.supplier)}</Field>
                <Field label="Mantenimientos acumulados">{formatCurrency(tool.maintenance_cost_total)}</Field>
                <Field label="Cargo por día en proyectos">{Number(tool.usage_rate_daily) > 0 ? formatCurrency(tool.usage_rate_daily) : 'Sin cargo'}</Field>
              </div>
              {tool.fixed_asset && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-sm">
                  <p className="font-medium">Activo fijo: {tool.fixed_asset.name}{tool.fixed_asset.status === 'dado_de_baja' ? ' (dado de baja)' : ''}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Costo {formatCurrency(tool.fixed_asset.acquisition_cost)} · depreciación acumulada {formatCurrency(tool.fixed_asset.accumulated_depreciation)} · valor en libros {formatCurrency(tool.fixed_asset.book_value)}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Mantenimiento y calibración</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Próximo mantenimiento">{tool.next_maintenance_date ? formatDate(tool.next_maintenance_date) : null}</Field>
                <Field label="Frecuencia">{tool.maintenance_interval_months ? `Cada ${tool.maintenance_interval_months} meses` : null}</Field>
                {tool.requires_calibration && (
                  <>
                    <Field label="Próxima calibración">{tool.next_calibration_date ? formatDate(tool.next_calibration_date) : 'Sin fecha'}</Field>
                    <Field label="Frecuencia">{tool.calibration_interval_months ? `Cada ${tool.calibration_interval_months} meses` : null}</Field>
                  </>
                )}
              </div>
            </div>

            <AttachmentsPanel entityType="tool" entityId={tool.id} title="Facturas, certificados y fotos" readOnly={retired} />
          </div>
        </div>
      </div>

      <ToolFormModal isOpen={modal === 'edit'} onClose={close} tool={tool} onSaved={load} />
      <AssignToolModal isOpen={modal === 'assign'} onClose={close} tool={tool} onDone={load} />
      <ReturnToolModal isOpen={modal === 'return'} onClose={close} assignment={returning} tool={tool} onDone={load} />
      <ToolEventModal isOpen={Boolean(modal?.startsWith('event:'))} onClose={close} tool={tool} eventType={modal?.split(':')[1]} onDone={load} />
      <RetireToolModal isOpen={modal === 'retire'} onClose={close} tool={tool} onDone={load} />
    </Layout>
  );
}
