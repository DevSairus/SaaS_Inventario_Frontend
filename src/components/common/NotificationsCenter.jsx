// frontend/src/components/common/NotificationsCenter.jsx
//
// Reemplaza las 6 campanas independientes que vivían en el header
// (StockAlerts, PayableAlerts, AdvanceAlerts, CrmNotifications,
// QuoteNotificationsBell, AppointmentNotificationsBell) por una sola campana
// con un panel agrupado por secciones. Dos motivos para unificarlas:
//   1. Visual: 6 iconos con 6 colores de badge distintos en el header no
//      escalan — cada módulo nuevo (facturación, DIAN, etc.) sumaría uno más.
//   2. Cada fila ya muestra toda la información necesaria en el propio
//      dropdown (nombre, monto, fecha, SLA...) — no hace falta salir de la
//      pantalla actual solo para leer qué pasó. Navegar a la página de
//      gestión queda como una acción EXPLÍCITA (el botón "Ir" a la derecha
//      de cada fila), nunca como efecto del click sobre la fila misma.
//
// Fuente de datos: el mismo bundle consolidado (/notifications/summary,
// notificationsBundleStore.js) que ya alimentaba a las 6 campanas por
// separado, más un refresh a los endpoints dedicados de cada dominio al
// abrir el panel (mismo patrón "fetch on open" que ya tenía cada campana).
// Los sockets de quotes/appointments (useQuoteNotifications /
// useAppointmentNotifications, montados en Layout) se mantienen igual —
// acá solo nos suscribimos para refrescar esa sección al instante.
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, ArrowUpRight, PackageX, Wallet, Landmark,
  AlertTriangle, Megaphone, FileCheck2, CalendarClock, CheckCircle2,
} from 'lucide-react';
import { getStockAlerts } from '../../api/stockAlerts';
import { getPayableAlerts } from '../../api/payableAlerts';
import { getAdvanceAlerts } from '../../api/customerAdvanceAlerts';
import crmApi from '../../api/crm';
import { workOrdersApi } from '../../api/workshop';
import { appointmentsApi } from '../../api/workshopAppointments';
import { subscribeQuoteApproved } from '../../hooks/useQuoteNotifications';
import { subscribeNewAppointment } from '../../hooks/useAppointmentNotifications';
import useTenantStore from '../../store/tenantStore';
import useNotificationsBundleStore from '../../store/notificationsBundleStore';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const mapStockAlertsToProducts = (rows) => (rows || []).filter(a => a.product).map(a => a.product);

function computeStockAlerts(products) {
  return products
    .filter(p => p.track_inventory)
    .map(p => {
      const current = parseFloat(p.current_stock) || 0;
      const min = parseFloat(p.min_stock) || 0;
      if (current === 0) return { ...p, severity: 'critical' };
      if (current <= min) return { ...p, severity: 'warning' };
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));
}

const QUOTE_STATUS_LABEL = {
  aprobada: { text: 'Aprobada', color: 'text-green-600 dark:text-green-400' },
  rechazada: { text: 'Rechazada', color: 'text-red-500 dark:text-red-400' },
  parcial: { text: 'Aprobada parcial', color: 'text-amber-600 dark:text-amber-400' },
};

// Fila genérica: todo el contenido útil va en el cuerpo (visible sin clicks);
// "onGo" es la única forma de salir de la página actual, y es opcional.
function NotificationRow({ icon, iconClass, title, subtitle, tag, tagClass, onGo, goLabel }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
      <div className={`p-1.5 rounded-full flex-shrink-0 mt-0.5 ${iconClass}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{title}</p>
          {tag && <span className={`text-[10px] font-semibold whitespace-nowrap mt-0.5 ${tagClass}`}>{tag}</span>}
        </div>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {onGo && (
        <button
          onClick={onGo}
          title={goLabel || 'Ir'}
          aria-label={goLabel || 'Ir'}
          className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-accent hover:bg-accent/10 dark:hover:bg-accent/20 mt-0.5"
        >
          <ArrowUpRight size={14} />
        </button>
      )}
    </div>
  );
}

function Section({ title, count, children }) {
  if (!count) return null;
  return (
    <div className="border-b border-gray-100 dark:border-white/10 last:border-b-0 pb-1">
      <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
        {title} · {count}
      </div>
      <div className="px-1 space-y-0.5">{children}</div>
    </div>
  );
}

function NotificationsCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const enabledModules = useTenantStore((s) => s.enabledModules);
  const hasCrm = enabledModules !== null && enabledModules.includes('crm');
  const hasWorkshop = enabledModules !== null && enabledModules.includes('workshop');

  const bundle = useNotificationsBundleStore((s) => s.data);

  const [stockProducts, setStockProducts] = useState([]);
  const [payable, setPayable] = useState([]);
  const [advance, setAdvance] = useState([]);
  const [crmSummary, setCrmSummary] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // Semilla desde el bundle consolidado (mismo patrón que tenía cada campana
  // individual) -- así el badge ya tiene un número apenas carga el layout,
  // sin esperar a que alguien abra el panel.
  useEffect(() => { if (bundle.stock) setStockProducts(mapStockAlertsToProducts(bundle.stock)); }, [bundle.stock]);
  useEffect(() => { if (bundle.payable) setPayable(bundle.payable); }, [bundle.payable]);
  useEffect(() => { if (bundle.advance) setAdvance(bundle.advance); }, [bundle.advance]);
  useEffect(() => { if (hasCrm && bundle.crm) setCrmSummary(bundle.crm); }, [hasCrm, bundle.crm]);
  useEffect(() => { if (hasWorkshop && bundle.quotes) setQuotes(bundle.quotes); }, [hasWorkshop, bundle.quotes]);
  useEffect(() => { if (hasWorkshop && bundle.appointments) setAppointments(bundle.appointments); }, [hasWorkshop, bundle.appointments]);

  const stockAlerts = useMemo(() => computeStockAlerts(stockProducts), [stockProducts]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    const jobs = [
      getStockAlerts({ status: 'active', limit: 500 })
        .then(r => r?.success && setStockProducts(mapStockAlertsToProducts(r.data)))
        .catch(() => {}),
      getPayableAlerts({ status: 'active', limit: 500, sort_by: 'days_to_due', sort_order: 'ASC' })
        .then(r => r?.success && setPayable(r.data || []))
        .catch(() => {}),
      getAdvanceAlerts({ status: 'active', limit: 500, sort_by: 'days_since_received', sort_order: 'DESC' })
        .then(r => r?.success && setAdvance(r.data || []))
        .catch(() => {}),
    ];
    if (hasCrm) {
      jobs.push(crmApi.getNotificationsSummary().then(r => setCrmSummary(r.data.data)).catch(() => {}));
    }
    if (hasWorkshop) {
      jobs.push(workOrdersApi.getPendingQuoteNotifications().then(r => setQuotes(r.data.data || [])).catch(() => {}));
      jobs.push(appointmentsApi.getPending().then(r => setAppointments(r.data.data || [])).catch(() => {}));
    }
    await Promise.allSettled(jobs);
    setRefreshing(false);
  }, [hasCrm, hasWorkshop]);

  // Refresco al abrir (acción del usuario, no un timer) -- mismo criterio
  // que cada campana individual tenía antes.
  useEffect(() => { if (isOpen) refreshAll(); }, [isOpen, refreshAll]);

  // Refresco inmediato en vivo si el socket sigue conectado (Layout ya
  // mantiene la conexión con useQuoteNotifications/useAppointmentNotifications
  // -- acá solo nos enteramos para refrescar esta sección puntual).
  useEffect(() => {
    if (!hasWorkshop) return undefined;
    const offQuote = subscribeQuoteApproved(() => {
      workOrdersApi.getPendingQuoteNotifications().then(r => setQuotes(r.data.data || [])).catch(() => {});
    });
    const offAppt = subscribeNewAppointment(() => {
      appointmentsApi.getPending().then(r => setAppointments(r.data.data || [])).catch(() => {});
    });
    return () => { offQuote(); offAppt(); };
  }, [hasWorkshop]);

  const go = (path) => { navigate(path); setIsOpen(false); };

  const handleQuoteGo = async (item) => {
    setQuotes(prev => prev.filter(i => i.id !== item.id));
    go(`/workshop/work-orders/${item.work_order_id}`);
    try { await workOrdersApi.markQuoteNotificationSeen(item.id); } catch { /* reaparece en el próximo refresh, no es grave */ }
  };

  const crmOverdue = hasCrm ? (crmSummary?.overdue_followups || 0) : 0;
  const crmLeads = hasCrm ? (crmSummary?.unattended_leads || 0) : 0;

  const total =
    stockAlerts.length + payable.length + advance.length +
    crmOverdue + crmLeads + quotes.length + appointments.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <Bell className="w-6 h-6" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div
            className="absolute right-0 mt-3 w-96 bg-white dark:bg-graphite rounded-xl shadow-xl z-50 border border-gray-200 dark:border-white/10 flex flex-col max-h-[36rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificaciones</h3>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {total > 0 ? `${total} sin revisar` : 'Estás al día'}
                </p>
              </div>
              {refreshing && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent" />
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {total === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <CheckCircle2 className="w-12 h-12 text-gray-200 dark:text-gray-600 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Todo al día</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">No hay novedades pendientes de revisar</p>
                </div>
              ) : (
                <>
                  <Section title="Citas de taller" count={appointments.length}>
                    {appointments.map(item => (
                      <NotificationRow
                        key={item.id}
                        icon={<CalendarClock size={14} />}
                        iconClass="bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400"
                        title={item.customer_name}
                        subtitle={`${new Date(item.scheduled_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}${item.vehicle_plate ? ` · ${item.vehicle_plate}` : ''}`}
                        onGo={() => go('/workshop/appointments')}
                        goLabel="Ver cita"
                      />
                    ))}
                  </Section>

                  <Section title="Cotizaciones respondidas" count={quotes.length}>
                    {quotes.map(item => {
                      const s = QUOTE_STATUS_LABEL[item.status] || QUOTE_STATUS_LABEL.aprobada;
                      return (
                        <NotificationRow
                          key={item.id}
                          icon={<FileCheck2 size={14} />}
                          iconClass="bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400"
                          title={`OT ${item.order_number}`}
                          subtitle={`${item.approved_by_name || 'Cliente'} · ${COP(item.total_amount)}`}
                          tag={s.text}
                          tagClass={s.color}
                          onGo={() => handleQuoteGo(item)}
                          goLabel="Ver OT"
                        />
                      );
                    })}
                  </Section>

                  <Section title="CRM" count={crmOverdue + crmLeads}>
                    {crmOverdue > 0 && (
                      <NotificationRow
                        icon={<AlertTriangle size={14} />}
                        iconClass="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400"
                        title={`${crmOverdue} seguimiento${crmOverdue === 1 ? '' : 's'} vencido${crmOverdue === 1 ? '' : 's'}`}
                        subtitle="Bandeja de seguimiento"
                        onGo={() => go('/crm/followups')}
                        goLabel="Ir a seguimientos"
                      />
                    )}
                    {crmLeads > 0 && (
                      <NotificationRow
                        icon={<Megaphone size={14} />}
                        iconClass="bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400"
                        title={`${crmLeads} lead${crmLeads === 1 ? '' : 's'} sin contactar hace 2h+`}
                        subtitle={crmSummary?.unattended_meta_leads > 0 ? `${crmSummary.unattended_meta_leads} de Meta Ads` : 'Pipeline'}
                        onGo={() => go('/crm/pipeline')}
                        goLabel="Ir al pipeline"
                      />
                    )}
                  </Section>

                  <Section title="Stock" count={stockAlerts.length}>
                    {stockAlerts.map(product => (
                      <NotificationRow
                        key={product.id}
                        icon={<PackageX size={14} />}
                        iconClass={product.severity === 'critical'
                          ? 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                          : 'bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400'}
                        title={product.name}
                        subtitle={`SKU: ${product.sku} · Stock: ${product.current_stock} / Min: ${product.min_stock}`}
                        tag={product.severity === 'critical' ? 'SIN STOCK' : 'STOCK BAJO'}
                        tagClass={product.severity === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}
                        onGo={() => go('/stock-alerts')}
                        goLabel="Gestionar stock"
                      />
                    ))}
                  </Section>

                  <Section title="Cuentas por pagar" count={payable.length}>
                    {payable.map(alert => (
                      <NotificationRow
                        key={alert.id}
                        icon={<Wallet size={14} />}
                        iconClass={alert.alert_type === 'overdue'
                          ? 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                          : 'bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400'}
                        title={alert.purchase?.supplier?.name || 'Proveedor sin nombre'}
                        subtitle={`${COP(alert.balance)} · ${alert.alert_type === 'overdue' ? `Vencida hace ${Math.abs(alert.days_to_due)}d` : `Vence en ${alert.days_to_due}d`}`}
                        tag={alert.alert_type === 'overdue' ? 'VENCIDA' : 'PRÓXIMA'}
                        tagClass={alert.alert_type === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}
                        onGo={() => go('/payable-alerts')}
                        goLabel="Gestionar cuentas por pagar"
                      />
                    ))}
                  </Section>

                  <Section title="Anticipos sin aplicar" count={advance.length}>
                    {advance.map(alert => (
                      <NotificationRow
                        key={alert.id}
                        icon={<Landmark size={14} />}
                        iconClass={alert.alert_type === 'very_stale'
                          ? 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                          : 'bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400'}
                        title={alert.customer?.business_name || `${alert.customer?.first_name || ''} ${alert.customer?.last_name || ''}`.trim() || 'Cliente sin nombre'}
                        subtitle={`${COP(alert.balance)} · Hace ${alert.days_since_received} días`}
                        tag={alert.alert_type === 'very_stale' ? 'MUY ANTIGUO' : 'SIN APLICAR'}
                        tagClass={alert.alert_type === 'very_stale' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}
                        onGo={() => go('/customer-advance-alerts')}
                        goLabel="Gestionar anticipos"
                      />
                    ))}
                  </Section>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationsCenter;
