import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import customersApi from '../../api/customers';
import crmApi from '../../api/crm';
import { vehiclesApi, workOrdersApi } from '../../api/workshop';
import { accountsReceivableAPI } from '../../api/accountsReceivable';
import { usersAPI } from '../../api/users';
import useTenantStore from '../../store/tenantStore';
import useAuthStore from '../../store/authStore';
import { buildWaLink, bestPhone, trackWhatsAppInteraction } from '../../utils/whatsapp';
import {
  ArrowLeft, Phone, Mail, MapPin, FileText, Car, Wrench, ChevronRight,
  MessageCircle, PhoneCall, Users as VisitIcon, StickyNote, Video,
  UserCheck, ShieldOff, Clock, AlertTriangle, Wallet,
} from 'lucide-react';
import {
  PencilIcon, CurrencyDollarIcon, DocumentTextIcon,
  WrenchScrewdriverIcon as WrenchIcon, TruckIcon as MotorcycleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = d => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const daysBetween = d => Math.ceil((new Date(d) - new Date()) / 86400000);

const SALE_STATUS = {
  draft:     { label: 'Borrador',   cls: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-500' },
  pending:   { label: 'Pendiente',  cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  completed: { label: 'Completada', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  cancelled: { label: 'Cancelada',  cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' },
};

const OT_STATUS = {
  recibido:   { label: 'Recibido',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  en_proceso: { label: 'En Proceso', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  en_espera:  { label: 'En Espera',  cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  listo:      { label: 'Listo',      cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  entregado:  { label: 'Entregado',  cls: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-500' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' },
};

const LIFECYCLE = {
  prospecto: { label: 'Prospecto', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  activo:    { label: 'Activo',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  en_riesgo: { label: 'En riesgo', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  inactivo:  { label: 'Inactivo',  cls: 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-500' },
  perdido:   { label: 'Perdido',   cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' },
};

const INTERACTION_TYPE = {
  llamada: { label: 'Llamada',  Icon: PhoneCall },
  whatsapp:{ label: 'WhatsApp', Icon: MessageCircle },
  email:   { label: 'Email',    Icon: Mail },
  visita:  { label: 'Visita',   Icon: VisitIcon },
  nota:    { label: 'Nota',     Icon: StickyNote },
  reunion: { label: 'Reunión',  Icon: Video },
};

const OUTCOME_DOT = {
  positivo: 'bg-green-500',
  neutral: 'bg-gray-400',
  negativo: 'bg-red-500',
  sin_respuesta: 'bg-yellow-500',
};

export default function CustomerDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const enabledModules = useTenantStore((s) => s.enabledModules) || [];
  const hasCrm         = enabledModules.includes('crm');
  const hasWorkshop    = enabledModules.includes('workshop');
  const hasReceivables = enabledModules.includes('receivables');
  const canAssign      = ['admin', 'manager', 'super_admin'].includes(user?.role);

  const [customer, setCustomer]     = useState(null);
  const [timeline, setTimeline]     = useState([]);
  const [ltv, setLtv]               = useState(0);
  const [vehicles, setVehicles]     = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [receivable, setReceivable] = useState(null);
  const [loading,  setLoading]      = useState(true);
  const [timelineLimit, setTimelineLimit] = useState(15);

  const [editModal, setEditModal] = useState(false);
  const [editForm,  setEditForm]  = useState({});
  const [saving,    setSaving]    = useState(false);

  const [interactionModal, setInteractionModal] = useState(false);
  const [interactionForm, setInteractionForm] = useState({ type: 'llamada', summary: '', outcome: 'neutral', follow_up_at: '' });
  const [savingInteraction, setSavingInteraction] = useState(false);

  const [assignModal, setAssignModal] = useState(false);
  const [assignForm, setAssignForm]   = useState({ is_assigned_account: false, owner_user_id: '' });
  const [advisors, setAdvisors]       = useState([]);
  const [savingAssign, setSavingAssign] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const calls = [];

      if (hasCrm) {
        calls.push(crmApi.getCustomerTimeline(id));
      } else {
        calls.push(customersApi.getById(id));
      }
      calls.push(hasWorkshop ? vehiclesApi.list({ customer_id: id, limit: 100 }) : Promise.resolve(null));
      calls.push(hasWorkshop ? workOrdersApi.list({ customer_id: id, limit: 100 }) : Promise.resolve(null));
      calls.push(hasReceivables ? accountsReceivableAPI.getCustomerReceivables(id).catch(() => null) : Promise.resolve(null));

      const [mainRes, vRes, otRes, arRes] = await Promise.all(calls);

      if (hasCrm) {
        const { customer: c, lifetime_value, timeline: tl } = mainRes.data.data;
        setCustomer(c);
        setLtv(lifetime_value);
        setTimeline(tl || []);
      } else {
        setCustomer(mainRes.data.data);
      }
      if (vRes) setVehicles(vRes.data.data || []);
      if (otRes) setWorkOrders(otRes.data.data || []);
      if (arRes) setReceivable(arRes.data || null);
    } catch {
      toast.error('Error cargando cliente');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  }, [id, hasCrm, hasWorkshop, hasReceivables, navigate]);

  useEffect(() => { load(); }, [load]);

  const openEdit = () => {
    setEditForm({
      full_name:     customer.full_name || `${customer.first_name||''} ${customer.last_name||''}`.trim(),
      tax_id:        customer.tax_id || '',
      phone:         customer.phone || '',
      mobile:        customer.mobile || '',
      email:         customer.email || '',
      address:       customer.address || '',
      city:          customer.city || '',
      notes:         customer.notes || '',
      customer_type: customer.customer_type || 'individual',
      business_name: customer.business_name || '',
    });
    setEditModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await customersApi.update(id, editForm);
      setCustomer(c => ({ ...c, ...res.data.data }));
      setEditModal(false);
      toast.success('Cliente actualizado');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar');
    } finally { setSaving(false); }
  };

  const openInteraction = () => {
    setInteractionForm({ type: 'llamada', summary: '', outcome: 'neutral', follow_up_at: '' });
    setInteractionModal(true);
  };

  const handleSaveInteraction = async (e) => {
    e.preventDefault();
    if (!interactionForm.summary.trim()) {
      toast.error('Escribe un resumen de la interacción');
      return;
    }
    setSavingInteraction(true);
    try {
      const payload = { ...interactionForm, follow_up_at: interactionForm.follow_up_at || null };
      await crmApi.createInteraction(id, payload);
      toast.success('Interacción registrada');
      setInteractionModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar la interacción');
    } finally { setSavingInteraction(false); }
  };

  const openAssign = async () => {
    setAssignForm({
      is_assigned_account: !!customer.is_assigned_account,
      owner_user_id: customer.owner_user_id || customer.owner?.id || '',
    });
    setAssignModal(true);
    if (advisors.length === 0) {
      try {
        const res = await usersAPI.getAll({ limit: 200, is_active: true });
        setAdvisors((res.data?.users || []).filter(u => !['technician'].includes(u.role)));
      } catch { /* el select queda vacío si falla, no bloquea el modal */ }
    }
  };

  const handleSaveAssign = async (e) => {
    e.preventDefault();
    if (assignForm.is_assigned_account && !assignForm.owner_user_id) {
      toast.error('Selecciona un asesor para la cuenta asignada');
      return;
    }
    setSavingAssign(true);
    try {
      const res = await crmApi.assignAccount(id, {
        owner_user_id: assignForm.owner_user_id || null,
        is_assigned_account: assignForm.is_assigned_account,
      });
      setCustomer(c => ({ ...c, ...res.data.data }));
      toast.success('Cuenta actualizada');
      setAssignModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar la asignación');
    } finally { setSavingAssign(false); }
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
      </div>
    </Layout>
  );
  if (!customer) return null;

  const sales = hasCrm
    ? timeline.filter(t => t.kind === 'sale').map(t => t.data)
    : (customer.sales || []);
  const totalFact = hasCrm ? ltv : sales.reduce((s, v) => s + parseFloat(v.total_amount || 0), 0);
  const displayName = customer.business_name || customer.full_name
    || `${customer.first_name||''} ${customer.last_name||''}`.trim();

  const otsByVehicle = workOrders.reduce((acc, ot) => {
    const vid = ot.vehicle_id || 'sin_vehiculo';
    if (!acc[vid]) acc[vid] = [];
    acc[vid].push(ot);
    return acc;
  }, {});
  const vehicleMap = {};
  vehicles.forEach(v => { vehicleMap[v.id] = v; });
  workOrders.forEach(ot => {
    if (ot.vehicle && !vehicleMap[ot.vehicle_id]) vehicleMap[ot.vehicle_id] = ot.vehicle;
  });
  const allVehicles = Object.values(vehicleMap);

  const lifecycle = hasCrm && customer.lifecycle_stage ? LIFECYCLE[customer.lifecycle_stage] : null;
  const upcomingService = hasWorkshop && customer.next_vehicle_service_due
    ? daysBetween(customer.next_vehicle_service_due) : null;
  const balance = receivable?.summary?.total_balance ?? null;

  const kpis = [
    { label: 'Total facturado', value: COP(totalFact), Icon: CurrencyDollarIcon },
    { label: 'Facturas venta',  value: sales.length,   Icon: DocumentTextIcon },
    ...(hasWorkshop ? [
      { label: 'Órd. de trabajo', value: workOrders.length,  Icon: WrenchIcon },
      { label: 'Vehículos',       value: allVehicles.length, Icon: MotorcycleIcon },
    ] : []),
    ...(hasReceivables && balance != null ? [
      { label: 'Saldo pendiente', value: COP(balance), Icon: Wallet, warn: parseFloat(balance) > 0 },
    ] : []),
  ];

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/customers')} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{displayName}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${customer.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'}`}>
                  {customer.is_active ? 'Activo' : 'Inactivo'}
                </span>
                {lifecycle && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lifecycle.cls}`}>
                    {lifecycle.label}
                  </span>
                )}
                {hasCrm && customer.is_assigned_account && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-accent/10 text-accent flex items-center gap-1">
                    <UserCheck size={11} /> Cuenta asignada
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {customer.customer_type === 'company' ? 'Empresa' : 'Persona natural'}
                {customer.tax_id && ` · CC/NIT: ${customer.tax_id}`}
                {hasCrm && customer.owner && ` · Asesor: ${customer.owner.first_name} ${customer.owner.last_name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasCrm && canAssign && (
              <button onClick={openAssign}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition">
                <UserCheck className="h-4 w-4" /> Cuenta asignada
              </button>
            )}
            <button onClick={openEdit}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-accent to-accent-soft text-white rounded-lg text-sm font-medium shadow-sm shadow-accent/30 hover:shadow-md transition-all">
              <PencilIcon className="h-4 w-4" /> Editar
            </button>
          </div>
        </div>

        {/* Alertas accionables */}
        {hasCrm && customer.lifecycle_stage === 'en_riesgo' && (
          <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>Cliente en riesgo — sin compra ni interacción reciente.</span>
            </div>
            <button onClick={openInteraction} className="text-xs font-medium text-amber-800 hover:underline whitespace-nowrap">
              + Registrar interacción
            </button>
          </div>
        )}
        {upcomingService !== null && upcomingService <= 14 && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800">
            <Clock size={16} className="flex-shrink-0" />
            <span>
              {upcomingService < 0
                ? `Servicio de vehículo vencido hace ${Math.abs(upcomingService)} día(s) (${fmtDate(customer.next_vehicle_service_due)})`
                : `Próximo servicio de vehículo en ${upcomingService} día(s) (${fmtDate(customer.next_vehicle_service_due)})`}
            </span>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map(({ label, value, Icon, warn }) => (
            <div key={label} className={`bg-white border rounded-xl p-4 ${warn ? 'border-red-200' : 'border-gray-100'}`}>
              <div className="mb-1"><Icon className={`w-5 h-5 ${warn ? 'text-red-400' : 'text-gray-400'}`} /></div>
              <p className={`text-lg font-bold ${warn ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Contacto */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-sm text-gray-800 mb-2">Contacto</h2>
            {[
              { Icon: Phone,  label: 'Teléfono',  val: customer.phone || customer.mobile },
              { Icon: Mail,   label: 'Email',     val: customer.email },
              { Icon: MapPin, label: 'Ciudad',    val: customer.city },
              { Icon: MapPin, label: 'Dirección', val: customer.address },
            ].filter(x => x.val).map(({ Icon, label, val }) => (
              <div key={label} className="flex items-start gap-2 text-sm">
                <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-gray-700">{val}</p>
                </div>
              </div>
            ))}
            {hasCrm && bestPhone(customer) && (
              <a href={buildWaLink(bestPhone(customer), `Hola ${displayName.split(' ')[0]}, te escribo desde Pitbox.`)}
                target="_blank" rel="noreferrer"
                onClick={() => trackWhatsAppInteraction(customer.id, `Hola ${displayName.split(' ')[0]}, te escribo desde Pitbox.`, hasCrm)}
                className="flex items-center gap-2 justify-center w-full text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg py-2 hover:bg-green-100 transition">
                <MessageCircle size={14} /> Escribir por WhatsApp
              </a>
            )}
            {customer.notes && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Notas</p>
                <p className="text-sm text-gray-600">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Timeline unificado (CRM) o ventas recientes (sin CRM) */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-accent" />
                <h2 className="font-semibold text-sm text-gray-800">
                  {hasCrm ? 'Historial de relación' : 'Ventas recientes'}
                </h2>
              </div>
              {hasCrm && (
                <button onClick={openInteraction} className="text-xs font-medium text-accent hover:underline">
                  + Registrar interacción
                </button>
              )}
            </div>

            {!hasCrm ? (
              sales.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FileText size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin ventas registradas</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {sales.slice(0, 8).map(sale => {
                    const ss = SALE_STATUS[sale.status] || SALE_STATUS.pending;
                    return (
                      <div key={sale.id} onClick={() => navigate(`/sales/${sale.id}`)}
                        className="flex items-center justify-between py-2.5 hover:bg-gray-50 rounded-lg px-1 cursor-pointer transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-gray-800">{sale.sale_number}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ss.cls}`}>{ss.label}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(sale.sale_date)}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{COP(sale.total_amount)}</p>
                      </div>
                    );
                  })}
                </div>
              )
            ) : timeline.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin actividad registrada todavía</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-50">
                  {timeline.slice(0, timelineLimit).map((item, idx) => {
                    if (item.kind === 'sale') {
                      const s = item.data;
                      const ss = SALE_STATUS[s.status] || SALE_STATUS.pending;
                      return (
                        <div key={`s-${s.id}`} onClick={() => navigate(`/sales/${s.id}`)}
                          className="flex items-center justify-between py-2.5 hover:bg-gray-50 rounded-lg px-1 cursor-pointer transition">
                          <div className="flex items-center gap-2">
                            <FileText size={13} className="text-gray-400 flex-shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-gray-800">{s.sale_number}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ss.cls}`}>{ss.label}</span>
                                <span className="text-[11px] text-gray-400 capitalize">{s.document_type}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5 ml-5">{fmtDate(s.sale_date)}</p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{COP(s.total_amount)}</p>
                        </div>
                      );
                    }
                    if (item.kind === 'work_order') {
                      const w = item.data;
                      const sc = OT_STATUS[w.status] || OT_STATUS.recibido;
                      return (
                        <div key={`w-${w.id}`} onClick={() => navigate(`/workshop/work-orders/${w.id}`)}
                          className="flex items-center justify-between py-2.5 hover:bg-gray-50 rounded-lg px-1 cursor-pointer transition">
                          <div className="flex items-center gap-2">
                            <Wrench size={13} className="text-orange-400 flex-shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-gray-700">{w.order_number}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sc.cls}`}>{sc.label}</span>
                                {w.vehicle && <span className="text-[11px] font-mono text-orange-600">{w.vehicle.plate}</span>}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5 ml-5">{fmtDate(w.received_at)}</p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-gray-800">{w.total_amount ? COP(w.total_amount) : '—'}</p>
                        </div>
                      );
                    }
                    // interacción
                    const i = item.data;
                    const it = INTERACTION_TYPE[i.type] || INTERACTION_TYPE.nota;
                    const ItIcon = it.Icon;
                    return (
                      <div key={`i-${i.id}`} className="flex items-start gap-2 py-2.5 px-1">
                        <ItIcon size={13} className="text-accent/70 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-gray-700">{it.label}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${OUTCOME_DOT[i.outcome] || OUTCOME_DOT.neutral}`} />
                            <span className="text-[11px] text-gray-400">{fmtDateTime(i.created_at)}</span>
                            {i.user && <span className="text-[11px] text-gray-400">· {i.user.first_name} {i.user.last_name}</span>}
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">{i.summary}</p>
                          {i.follow_up_at && (
                            <p className="text-[11px] text-accent font-medium mt-0.5">Seguimiento: {fmtDate(i.follow_up_at)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {timeline.length > timelineLimit && (
                  <button onClick={() => setTimelineLimit(n => n + 20)}
                    className="mt-3 w-full text-center text-xs text-accent hover:underline py-1">
                    Ver más ({timeline.length - timelineLimit} restantes)
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Vehículos + OT — solo con Taller activo */}
        {hasWorkshop && (
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Car size={15} className="text-orange-500" />
              <h2 className="font-semibold text-sm text-gray-800">Vehículos y Órdenes de Trabajo</h2>
            </div>

            {allVehicles.length === 0 && workOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Car size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Sin vehículos ni órdenes de trabajo registradas</p>
                <button onClick={() => navigate('/workshop/work-orders/new')}
                  className="mt-3 text-sm text-orange-600 hover:underline">+ Nueva OT</button>
              </div>
            ) : allVehicles.length > 0 ? (
              <div className="space-y-3">
                {allVehicles.map(v => {
                  const ots = otsByVehicle[v.id] || [];
                  return (
                    <div key={v.id} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between bg-orange-50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Car size={15} className="text-orange-500" />
                          <span className="font-mono font-bold text-gray-900">{v.plate}</span>
                          <span className="text-sm text-gray-600">{v.brand} {v.model} {v.year}</span>
                          {v.color && <span className="text-xs text-gray-400">· {v.color}</span>}
                        </div>
                        <span className="text-xs text-orange-600 font-medium">
                          {ots.length} OT{ots.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {ots.length === 0 ? (
                        <p className="text-xs text-gray-400 px-4 py-3 italic">Sin órdenes de trabajo</p>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {ots.map(ot => {
                            const sc = OT_STATUS[ot.status] || OT_STATUS.recibido;
                            return (
                              <div key={ot.id} onClick={() => navigate(`/workshop/work-orders/${ot.id}`)}
                                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Wrench size={12} className="text-gray-400" />
                                    <span className="font-mono text-xs font-bold text-gray-700">{ot.order_number}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sc.cls}`}>{sc.label}</span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-0.5 ml-4">
                                    {fmtDate(ot.received_at)}
                                    {ot.technician && ` · ${ot.technician.first_name} ${ot.technician.last_name}`}
                                  </p>
                                  {ot.problem_description && (
                                    <p className="text-xs text-gray-500 mt-0.5 ml-4 line-clamp-1">{ot.problem_description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-800">{ot.total_amount ? COP(ot.total_amount) : '—'}</p>
                                  <ChevronRight size={14} className="text-gray-300" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {otsByVehicle['sin_vehiculo']?.length > 0 && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3">
                      <span className="text-sm text-gray-500 italic">OTs sin vehículo vinculado</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {otsByVehicle['sin_vehiculo'].map(ot => {
                        const sc = OT_STATUS[ot.status] || OT_STATUS.recibido;
                        return (
                          <div key={ot.id} onClick={() => navigate(`/workshop/work-orders/${ot.id}`)}
                            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-700">{ot.order_number}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sc.cls}`}>{sc.label}</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-800">{ot.total_amount ? COP(ot.total_amount) : '—'}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-3 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                  Las motos de las OTs no están vinculadas a este cliente. Puedes asignarlas desde cada vehículo.
                </p>
                {workOrders.map(ot => {
                  const sc = OT_STATUS[ot.status] || OT_STATUS.recibido;
                  return (
                    <div key={ot.id} onClick={() => navigate(`/workshop/work-orders/${ot.id}`)}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer transition">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-800">{ot.order_number}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sc.cls}`}>{sc.label}</span>
                          {ot.vehicle && (
                            <span className="text-xs font-mono text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                              {ot.vehicle.plate}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(ot.received_at)}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{ot.total_amount ? COP(ot.total_amount) : '—'}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {(allVehicles.length > 0 || workOrders.length > 0) && (
              <button onClick={() => navigate('/workshop/work-orders/new')}
                className="mt-4 w-full border border-dashed border-orange-300 text-orange-600 text-sm py-2 rounded-lg hover:bg-orange-50 transition">
                + Nueva OT para este cliente
              </button>
            )}
          </div>
        )}

      </div>

      {/* Modal editar */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Editar Cliente" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select value={editForm.customer_type}
                onChange={e => setEditForm(f => ({ ...f, customer_type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="individual">Persona Natural</option>
                <option value="company">Empresa</option>
              </select>
            </div>
            <Input label="Nombre completo *" value={editForm.full_name}
              onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} required />
          </div>
          {editForm.customer_type === 'company' && (
            <Input label="Razón Social" value={editForm.business_name}
              onChange={e => setEditForm(f => ({ ...f, business_name: e.target.value }))} />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Cédula / NIT" value={editForm.tax_id} onChange={e => setEditForm(f => ({ ...f, tax_id: e.target.value }))} />
            <Input label="Email" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Teléfono" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Ciudad" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <Input label="Dirección" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              rows="2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setEditModal(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal registrar interacción */}
      {hasCrm && (
        <Modal isOpen={interactionModal} onClose={() => setInteractionModal(false)} title="Registrar interacción" size="md">
          <form onSubmit={handleSaveInteraction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                <select value={interactionForm.type}
                  onChange={e => setInteractionForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  {Object.entries(INTERACTION_TYPE).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
                <select value={interactionForm.outcome}
                  onChange={e => setInteractionForm(f => ({ ...f, outcome: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="positivo">Positivo</option>
                  <option value="neutral">Neutral</option>
                  <option value="negativo">Negativo</option>
                  <option value="sin_respuesta">Sin respuesta</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resumen *</label>
              <textarea value={interactionForm.summary}
                onChange={e => setInteractionForm(f => ({ ...f, summary: e.target.value }))}
                rows="3" placeholder="¿De qué se habló?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
            </div>
            <Input label="Recordatorio de seguimiento (opcional)" type="date"
              value={interactionForm.follow_up_at}
              onChange={e => setInteractionForm(f => ({ ...f, follow_up_at: e.target.value }))} />
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={() => setInteractionModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={savingInteraction}>
                {savingInteraction ? 'Guardando...' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal asignar cuenta */}
      {hasCrm && canAssign && (
        <Modal isOpen={assignModal} onClose={() => setAssignModal(false)} title="Cuenta asignada" size="sm">
          <form onSubmit={handleSaveAssign} className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={assignForm.is_assigned_account}
                onChange={e => setAssignForm(f => ({ ...f, is_assigned_account: e.target.checked }))} />
              Bloquear este cliente a un asesor específico
            </label>
            {!assignForm.is_assigned_account && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <ShieldOff size={12} /> Cuenta libre: cualquier vendedor puede atenderla.
              </p>
            )}
            {assignForm.is_assigned_account && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asesor *</label>
                <select value={assignForm.owner_user_id}
                  onChange={e => setAssignForm(f => ({ ...f, owner_user_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="">Selecciona un asesor</option>
                  {advisors.map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={() => setAssignModal(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={savingAssign}>
                {savingAssign ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}