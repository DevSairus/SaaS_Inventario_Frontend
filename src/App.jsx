import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import LoginPage from './pages/auth/LoginPage';
import LandingPage from './pages/LandingPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import WorkOrderPublicPage from './pages/workshop/WorkOrderPublicPage';
import SeguimientoPublicoPage from './pages/ensambladora/SeguimientoPublicoPage';
import QuotePublicPage from './pages/sales/QuotePublicPage';
import Loading from './components/common/Loading';
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/products/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/products/ProductDetailPage'));
const CategoriesPage = lazy(() => import('./pages/categories/CategoriesPage'));
const SuppliersPage = lazy(() => import('./pages/suppliers/SuppliersPage'));
const PurchasesPage = lazy(() => import('./pages/purchases/PurchasesPage'));
const PurchaseFormPage = lazy(() => import('./pages/purchases/PurchaseFormPage'));
const PurchaseDetailPage = lazy(() => import('./pages/purchases/PurchaseDetailPage'));
const AdjustmentsPage = lazy(() => import('./pages/adjustments/AdjustmentsPage'));
const AdjustmentFormPage = lazy(() => import('./pages/adjustments/AdjustmentFormPage'));
const AdjustmentDetailPage = lazy(() => import('./pages/adjustments/AdjustmentDetailPage'));
const MovementsPage = lazy(() => import('./pages/movements/MovementsPage'));
const StockAlertsPage = lazy(() => import('./pages/stock-alerts/StockAlertsPage'));
const PayableAlertsPage = lazy(() => import('./pages/payable-alerts/PayableAlertsPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const UserForm = lazy(() => import('./pages/users/UserForm'));
const SalesPage = lazy(() => import('./pages/sales/SalesPage'));
const QuotesPage = lazy(() => import('./pages/sales/QuotesPage'));
const SaleFormPage = lazy(() => import('./pages/sales/SaleFormPage'));
const SaleDetailPage = lazy(() => import('./pages/sales/SaleDetailPage'));
const AccountsReceivablePage = lazy(() => import('./pages/sales/AccountsReceivablePage'));
const CustomerAdvancesPage = lazy(() => import('./pages/finance/CustomerAdvancesPage'));
const CustomerAdvanceAlertsPage = lazy(() => import('./pages/customer-advance-alerts/CustomerAdvanceAlertsPage'));
const AccountsPayablePage = lazy(() => import('./pages/finance/AccountsPayablePage'));
const ExpensesPage = lazy(() => import('./pages/finance/ExpensesPage'));
const CashFlowPage = lazy(() => import('./pages/finance/CashFlowPage'));
const CashSessionsPage = lazy(() => import('./pages/finance/CashSessionsPage'));
const ReceiptsPage = lazy(() => import('./pages/finance/ReceiptsPage'));
const ChartOfAccountsPage = lazy(() => import('./pages/accounting/ChartOfAccountsPage'));
const JournalEntriesPage = lazy(() => import('./pages/accounting/JournalEntriesPage'));
const AccountMappingsPage = lazy(() => import('./pages/accounting/AccountMappingsPage'));
const FinancialReportsPage = lazy(() => import('./pages/accounting/FinancialReportsPage'));
const FiscalPeriodsPage = lazy(() => import('./pages/accounting/FiscalPeriodsPage'));
const AccountingHealthPage = lazy(() => import('./pages/accounting/AccountingHealthPage'));
const OpeningBalancesPage = lazy(() => import('./pages/accounting/OpeningBalancesPage'));
// Lazy: son las únicas páginas dentro del alcance de la PWA "Taller" instalada
// (offline + precache del Service Worker, ver frontend/src/pwa/sw.js). El resto
// del módulo workshop (reportes, productividad, comisiones) sigue siendo eager.
const WorkOrdersPage = lazy(() => import('./pages/workshop/WorkOrdersPage'));
const WorkOrderFormPage = lazy(() => import('./pages/workshop/WorkOrderFormPage'));
const WorkOrderDetailPage = lazy(() => import('./pages/workshop/WorkOrderDetailPage'));
const VehiclesPage = lazy(() => import('./pages/workshop/VehiclesPage'));
const VehicleDetailPage = lazy(() => import('./pages/workshop/VehicleDetailPage'));
const ScannerPage = lazy(() => import('./pages/workshop/ScannerPage'));
// Módulo Ensambladora (Fase 1 — consulta de vehículos vs el Core)
const VinSearchPage = lazy(() => import('./pages/ensambladora/VinSearchPage'));
const VehiculoDetailPage = lazy(() => import('./pages/ensambladora/VehiculoDetailPage'));
const VentaFormPage = lazy(() => import('./pages/ensambladora/VentaFormPage'));
const AlistamientoFormPage = lazy(() => import('./pages/ensambladora/AlistamientoFormPage'));
const EntregaFormPage = lazy(() => import('./pages/ensambladora/EntregaFormPage'));
// Fase 4 — garantías
const GarantiaFormPage = lazy(() => import('./pages/ensambladora/GarantiaFormPage'));
const GarantiaReenviarPage = lazy(() => import('./pages/ensambladora/GarantiaReenviarPage'));
// Fase 3 — revisiones periódicas
const AgendaRevisionesPage = lazy(() => import('./pages/ensambladora/AgendaRevisionesPage'));
const RevisionFormPage = lazy(() => import('./pages/ensambladora/RevisionFormPage'));
// Fase 5 — tarifario y liquidaciones
const LiquidacionesPage = lazy(() => import('./pages/ensambladora/LiquidacionesPage'));
const GarantiasPage = lazy(() => import('./pages/ensambladora/GarantiasPage'));
const LiquidacionDetailPage = lazy(() => import('./pages/ensambladora/LiquidacionDetailPage'));
// Fase 7 — técnicos/asesores
const TecnicosPage = lazy(() => import('./pages/ensambladora/TecnicosPage'));
// Cotización de moto no vendida
const CotizarPage = lazy(() => import('./pages/ensambladora/CotizarPage'));
// Fase 8 — panel de monitoreo de sincronización
const SyncMonitorPage = lazy(() => import('./pages/ensambladora/SyncMonitorPage'));
const AuditoriaPage = lazy(() => import('./pages/ensambladora/AuditoriaPage'));
const TechnicianProductivityPage = lazy(() => import('./pages/workshop/productivity/TechnicianProductivityPage'));
const CommissionSettlementsPage = lazy(() => import('./pages/workshop/commissions/CommissionSettlementsPage'));
const CommissionSettlementDetailPage = lazy(() => import('./pages/workshop/commissions/CommissionSettlementDetailPage'));
const CommissionProductsReportPage = lazy(() => import('./pages/workshop/commissions/CommissionProductsReportPage'));
const DiagramPointsEditorPage = lazy(() => import('./pages/workshop/DiagramPointsEditorPage'));
const WorkshopReportPage = lazy(() => import('./pages/workshop/WorkshopReportPage'));
const AppointmentsPage = lazy(() => import('./pages/workshop/AppointmentsPage'));
const AppointmentSettingsPage = lazy(() => import('./pages/workshop/AppointmentSettingsPage'));
import PublicAppointmentPage from './pages/workshop/PublicAppointmentPage';
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/crm/CustomerDetailPage'));
const PipelinePage = lazy(() => import('./pages/crm/PipelinePage'));
const FollowUpsPage = lazy(() => import('./pages/crm/FollowUpsPage'));
const CrmDashboardPage = lazy(() => import('./pages/crm/CrmDashboardPage'));
const MetaIntegrationSettingsPage = lazy(() => import('./pages/crm/MetaIntegrationSettingsPage'));
const CrmSettingsPage = lazy(() => import('./pages/crm/CrmSettingsPage'));
const WarehousesPage = lazy(() => import('./pages/warehouses/WarehousesPage'));
const BranchesPage = lazy(() => import('./pages/branches/BranchesPage'));
import NoBranchAssignedPage from './pages/branches/NoBranchAssignedPage';
const TenantSettingsPage = lazy(() => import('./pages/settings/TenantSettingsPage'));
const WhatsAppSettingsPage = lazy(() => import('./pages/settings/WhatsAppSettingsPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const NexaApprovalsPage = lazy(() => import('./pages/nexa/NexaApprovalsPage'));

// Movimientos Avanzados
const CustomerReturnsPage = lazy(() => import('./pages/sales/CustomerReturnsPage'));
const CustomerReturnFormPage = lazy(() => import('./pages/sales/CustomerReturnFormPage'));
const CustomerReturnDetailPage = lazy(() => import('./pages/sales/CustomerReturnDetailPage'));
const SupplierReturnsPage = lazy(() => import('./pages/inventory/SupplierReturnsPage'));
const SupplierReturnFormPage = lazy(() => import('./pages/inventory/SupplierReturnFormPage'));
const SupplierReturnDetailPage = lazy(() => import('./pages/inventory/SupplierReturnDetailPage'));
const TransfersPage = lazy(() => import('./pages/inventory/TransfersPage'));
const TransferFormPage = lazy(() => import('./pages/inventory/TransferFormPage'));
const TransferReceivePage = lazy(() => import('./pages/inventory/TransferReceivePage'));
const TransferDetailPage = lazy(() => import('./pages/inventory/TransferDetailPage'));
const InternalConsumptionsPage = lazy(() => import('./pages/inventory/InternalConsumptionsPage'));
const InternalConsumptionFormPage = lazy(() => import('./pages/inventory/InternalConsumptionFormPage'));
const InternalConsumptionDetailPage = lazy(() => import('./pages/inventory/InternalConsumptionDetailPage'));

// Super Admin
import SuperAdminLayout from './components/layout/SuperAdminLayout';
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/Dashboard'));
const TenantsList = lazy(() => import('./pages/superadmin/TenantsList'));
const TenantForm = lazy(() => import('./pages/superadmin/TenantForm'));
const TenantDetail = lazy(() => import('./pages/superadmin/TenantDetail'));
const TenantUsers = lazy(() => import('./pages/superadmin/TenantUsers'));
const Analytics = lazy(() => import('./pages/superadmin/Analytics'));
const RolePermissionsPage = lazy(() => import('./pages/superadmin/RolePermissionsPage'));
const SubscriptionPlansManagement = lazy(() => import('./pages/superadmin/SubscriptionPlansManagement'));
const SuperAdminSubscriptionsList = lazy(() => import('./pages/superadmin/SuperAdminSubscriptionsList'));
const SubscriptionInvoicesManagement = lazy(() => import('./pages/superadmin/SubscriptionInvoicesManagement'));
const SubscriptionManagement = lazy(() => import('./pages/superadmin/SubscriptionManagement'));
const SuperAdminMercadoPagoConfig = lazy(() => import('./pages/superadmin/SuperAdminMercadoPagoConfig'));
const SuperAdminNcfConfig = lazy(() => import('./pages/superadmin/SuperAdminNcfConfig'));
const SuperAdminMetaConfig = lazy(() => import('./pages/superadmin/SuperAdminMetaConfig'));
const SuperAdminEnsambladoraConfig = lazy(() => import('./pages/superadmin/SuperAdminEnsambladoraConfig'));
const TenantMigrationStatus = lazy(() => import('./pages/superadmin/TenantMigrationStatus'));
const AnnouncementsManagement = lazy(() => import('./pages/superadmin/AnnouncementsManagement'));
import AnnouncementsModal from './components/common/AnnouncementsModal';

// ✅ DIAN — Facturación Electrónica
const DianConfigPage = lazy(() => import('./pages/dian/DianConfigPage'));
const DianEventsPage = lazy(() => import('./pages/dian/DianEventsPage'));

// Soporte — Cliente
const SupportFAQ = lazy(() => import('./pages/support/SupportFAQ'));
const MyTickets = lazy(() => import('./pages/support/MyTickets'));
const TicketDetail = lazy(() => import('./pages/support/TicketDetail'));
const CreateTicket = lazy(() => import('./pages/support/CreateTicket'));

// Soporte — SuperAdmin
const SupportInbox = lazy(() => import('./pages/superadmin/support/SupportInbox'));
const SupportTicketDetail = lazy(() => import('./pages/superadmin/support/SupportTicketDetail'));
const FaqManagement = lazy(() => import('./pages/superadmin/support/FaqManagement'));
const SupportAnalytics = lazy(() => import('./pages/superadmin/support/SupportAnalytics'));
const RemoteSessionsHistory = lazy(() => import('./pages/superadmin/support/RemoteSessionsHistory'));

// Auth / Session
import SessionMonitor from './components/auth/SessionMonitor';
import { Toaster } from 'react-hot-toast';
import PrivateRoute from './components/auth/PrivateRoute';
import useAuthStore from './store/authStore';
import useTenantStore from './store/tenantStore';
import SessionKeepAlive from './components/SessionKeepAlive';
import RemoteSessionNotifier from './components/common/RemoteSessionNotifier';
import PwaBootstrap from './pwa/PwaBootstrap';
import InstallPrompt from './pwa/components/InstallPrompt';
import ImpersonationBanner from './components/common/ImpersonationBanner';
import { ROLES, ROUTES } from './utils/constants';

// Redirigir según rol
function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <LandingPage />;
  if (user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.SUPPORT) return <Navigate to={ROUTES.SUPERADMIN_DASHBOARD} replace />;
  return <Navigate to={ROUTES.DASHBOARD} replace />;
}

function SuperAdminRoute({ children, roles }) {
  const { user, isAuthenticated } = useAuthStore();
  const allowed = roles || [ROLES.SUPER_ADMIN];
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  if (!allowed.includes(user?.role)) return <Navigate to={ROUTES.DASHBOARD} replace />;
  return children;
}

// `module` es opcional: la key del catálogo de módulos (backend/src/config/modules.catalog.js)
// que protege esta ruta. Si el tenant no la tiene habilitada, se bloquea el acceso directo
// por URL en vez de dejar que la página dispare un 403 al pedir datos a la API.
// `roles` es opcional: lista de roles de USUARIO (no de módulo) permitidos — mismo criterio
// que ya aplica el backend en server.js para /api/accounting. Sin esto, un vendedor podía
// entrar a /accounting/* escribiendo la URL directamente y ver la pantalla vacía/con errores
// 403 en vez de ser redirigido.
function TenantRoute({ children, module, roles }) {
  const { user, isAuthenticated } = useAuthStore();
  const enabledModules = useTenantStore((s) => s.enabledModules);
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  if (user?.role === ROLES.SUPER_ADMIN) return <Navigate to={ROUTES.SUPERADMIN_DASHBOARD} replace />;
  // enabledModules === null: todavía no se cargó el config del tenant, no bloquear todavía.
  // `module` puede ser un string (un solo módulo requerido) o un array (basta con
  // CUALQUIERA de esos módulos) -- ej. Cotizaciones es accesible con Ventas, Taller o CRM.
  if (module && enabledModules) {
    const hasModuleAccess = Array.isArray(module)
      ? module.some((m) => enabledModules.includes(m))
      : enabledModules.includes(module);
    if (!hasModuleAccess) {
      return <Navigate to={ROUTES.DASHBOARD} replace />;
    }
  }
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  return children;
}

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const isTenantUser = isAuthenticated && user?.role !== ROLES.SUPER_ADMIN && user?.role !== ROLES.SUPPORT;
  const fetchFeatures = useTenantStore((s) => s.fetchFeatures);
  const resetTenantStore = useTenantStore((s) => s.reset);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFeatures();
    } else {
      resetTenantStore();
    }
  }, [isAuthenticated, fetchFeatures, resetTenantStore]);

  return (
    <BrowserRouter>
      <SessionKeepAlive />
      <PwaBootstrap />
      <InstallPrompt />
      <ImpersonationBanner />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { background: '#363636', color: '#fff' },
          success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <SessionMonitor />
      {isTenantUser && <RemoteSessionNotifier />}

      <Routes>
        {/* Root */}
        <Route path="/" element={<RoleBasedRedirect />} />

        {/* Públicas */}
        <Route path="/bienvenida"     element={<LandingPage />} />
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/ot/:token"      element={<WorkOrderPublicPage />} />
        <Route path="/public/quote/:token" element={<QuotePublicPage />} />
        <Route path="/agendar/:slug"       element={<PublicAppointmentPage />} />
        <Route path="/ensambladora/seguimiento/:tipo/:token" element={<SeguimientoPublicoPage />} />
        <Route path="/sin-sede"       element={<NoBranchAssignedPage />} />

        {/* ─── Super Admin ─────────────────────────────────── */}
        <Route
          path="/superadmin"
          element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}
        >
          <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
          <Route path="dashboard"           element={<Suspense fallback={<Loading fullScreen />}><SuperAdminDashboard /></Suspense>} />
          <Route path="tenants"             element={<Suspense fallback={<Loading fullScreen />}><TenantsList /></Suspense>} />
          <Route path="tenants/new"         element={<Suspense fallback={<Loading fullScreen />}><TenantForm /></Suspense>} />
          <Route path="tenants/:id"         element={<Suspense fallback={<Loading fullScreen />}><TenantDetail /></Suspense>} />
          <Route path="tenants/:id/edit"    element={<Suspense fallback={<Loading fullScreen />}><TenantForm /></Suspense>} />
          <Route path="tenants/:id/users"   element={<Suspense fallback={<Loading fullScreen />}><TenantUsers /></Suspense>} />
          <Route path="tenants/:id/subscription" element={<Suspense fallback={<Loading fullScreen />}><SubscriptionManagement /></Suspense>} />
          <Route path="subscription-plans"  element={<Suspense fallback={<Loading fullScreen />}><SubscriptionPlansManagement /></Suspense>} />
          <Route path="subscriptions"       element={<Suspense fallback={<Loading fullScreen />}><SuperAdminSubscriptionsList /></Suspense>} />
          <Route path="subscriptions/:id"   element={<Suspense fallback={<Loading fullScreen />}><SubscriptionManagement /></Suspense>} />
          <Route path="subscription-invoices" element={<Suspense fallback={<Loading fullScreen />}><SubscriptionInvoicesManagement /></Suspense>} />
          <Route path="mercadopago-config"  element={<Suspense fallback={<Loading fullScreen />}><SuperAdminMercadoPagoConfig /></Suspense>} />
          <Route path="ncf-config"          element={<Suspense fallback={<Loading fullScreen />}><SuperAdminNcfConfig /></Suspense>} />
          <Route path="meta-config"         element={<Suspense fallback={<Loading fullScreen />}><SuperAdminMetaConfig /></Suspense>} />
          <Route path="ensambladora-config" element={<Suspense fallback={<Loading fullScreen />}><SuperAdminEnsambladoraConfig /></Suspense>} />
          <Route path="tenant-migration"    element={<Suspense fallback={<Loading fullScreen />}><TenantMigrationStatus /></Suspense>} />
          <Route path="announcements"       element={<Suspense fallback={<Loading fullScreen />}><AnnouncementsManagement /></Suspense>} />
          <Route path="analytics"           element={<Suspense fallback={<Loading fullScreen />}><Analytics /></Suspense>} />
          <Route path="permissions"         element={<Suspense fallback={<Loading fullScreen />}><RolePermissionsPage /></Suspense>} />
        </Route>

        {/* Soporte SuperAdmin — accesible para super_admin y support */}
        <Route
          path="/superadmin"
          element={<SuperAdminRoute roles={[ROLES.SUPER_ADMIN, ROLES.SUPPORT]}><SuperAdminLayout /></SuperAdminRoute>}
        >
          <Route path="support/tickets"     element={<Suspense fallback={<Loading fullScreen />}><SupportInbox /></Suspense>} />
          <Route path="support/tickets/:id" element={<Suspense fallback={<Loading fullScreen />}><SupportTicketDetail /></Suspense>} />
          <Route path="support/faq"         element={<Suspense fallback={<Loading fullScreen />}><FaqManagement /></Suspense>} />
          <Route path="support/stats"       element={<Suspense fallback={<Loading fullScreen />}><SupportAnalytics /></Suspense>} />
          <Route path="support/remote-sessions" element={<Suspense fallback={<Loading fullScreen />}><RemoteSessionsHistory /></Suspense>} />
        </Route>

        {/* ─── Tenant ──────────────────────────────────────── */}
        <Route path="dashboard"  element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><DashboardPage /></Suspense></TenantRoute>} />
        <Route path="products/:id" element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><ProductDetailPage /></Suspense></TenantRoute>} />
        <Route path="products"   element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><ProductsPage /></Suspense></TenantRoute>} />
        <Route path="categories" element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><CategoriesPage /></Suspense></TenantRoute>} />
        <Route path="suppliers"  element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><SuppliersPage /></Suspense></TenantRoute>} />

        {/* Compras */}
        <Route path="purchases"          element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><PurchasesPage /></Suspense></TenantRoute>} />
        <Route path="purchases/new"      element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><PurchaseFormPage /></Suspense></TenantRoute>} />
        <Route path="purchases/edit/:id" element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><PurchaseFormPage /></Suspense></TenantRoute>} />
        <Route path="purchases/:id"      element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><PurchaseDetailPage /></Suspense></TenantRoute>} />

        {/* Ajustes */}
        <Route path="adjustments"          element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><AdjustmentsPage /></Suspense></TenantRoute>} />
        <Route path="adjustments/new"      element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><AdjustmentFormPage /></Suspense></TenantRoute>} />
        <Route path="adjustments/edit/:id" element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><AdjustmentFormPage /></Suspense></TenantRoute>} />
        <Route path="adjustments/:id"      element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><AdjustmentDetailPage /></Suspense></TenantRoute>} />

        <Route path="movements"   element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><MovementsPage /></Suspense></TenantRoute>} />
        <Route path="stock-alerts" element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><StockAlertsPage /></Suspense></TenantRoute>} />

        {/* ── Ventas ─────────────────────────────────── */}
        <Route path="sales"          element={<TenantRoute module="sales"><Suspense fallback={<Loading fullScreen />}><SalesPage /></Suspense></TenantRoute>} />
        <Route path="sales/new"      element={<TenantRoute module="sales"><Suspense fallback={<Loading fullScreen />}><SaleFormPage /></Suspense></TenantRoute>} />
        <Route path="sales/:id/edit" element={<TenantRoute module="sales"><Suspense fallback={<Loading fullScreen />}><SaleFormPage /></Suspense></TenantRoute>} />
        <Route path="accounts-receivable" element={<TenantRoute module="receivables"><Suspense fallback={<Loading fullScreen />}><AccountsReceivablePage /></Suspense></TenantRoute>} />
        <Route path="customer-advances" element={<TenantRoute module="receivables"><Suspense fallback={<Loading fullScreen />}><CustomerAdvancesPage /></Suspense></TenantRoute>} />
        <Route path="customer-advance-alerts" element={<TenantRoute module="receivables"><Suspense fallback={<Loading fullScreen />}><CustomerAdvanceAlertsPage /></Suspense></TenantRoute>} />

        {/* ── Cotizaciones — sección independiente de Ventas ─────────── */}
        <Route path="quotes" element={<TenantRoute module={["sales", "workshop", "crm"]}><Suspense fallback={<Loading fullScreen />}><QuotesPage /></Suspense></TenantRoute>} />

        {/* ── Tesorería ──────────────────────────────── */}
        <Route path="accounts-payable" element={<TenantRoute module="treasury"><Suspense fallback={<Loading fullScreen />}><AccountsPayablePage /></Suspense></TenantRoute>} />
        <Route path="payable-alerts"   element={<TenantRoute module="treasury"><Suspense fallback={<Loading fullScreen />}><PayableAlertsPage /></Suspense></TenantRoute>} />
        <Route path="expenses"         element={<TenantRoute module="treasury"><Suspense fallback={<Loading fullScreen />}><ExpensesPage /></Suspense></TenantRoute>} />
        <Route path="cashflow"         element={<TenantRoute module="treasury"><Suspense fallback={<Loading fullScreen />}><CashFlowPage /></Suspense></TenantRoute>} />
        <Route path="accounting/chart-of-accounts" element={<TenantRoute module="accounting" roles={['admin', 'manager']}><Suspense fallback={<Loading fullScreen />}><ChartOfAccountsPage /></Suspense></TenantRoute>} />
        <Route path="accounting/journal-entries"   element={<TenantRoute module="accounting" roles={['admin', 'manager']}><Suspense fallback={<Loading fullScreen />}><JournalEntriesPage /></Suspense></TenantRoute>} />
        <Route path="accounting/account-mappings"  element={<TenantRoute module="accounting" roles={['admin', 'manager']}><Suspense fallback={<Loading fullScreen />}><AccountMappingsPage /></Suspense></TenantRoute>} />
        <Route path="accounting/reports"           element={<TenantRoute module="accounting" roles={['admin', 'manager']}><Suspense fallback={<Loading fullScreen />}><FinancialReportsPage /></Suspense></TenantRoute>} />
        <Route path="accounting/fiscal-periods"    element={<TenantRoute module="accounting" roles={['admin', 'manager']}><Suspense fallback={<Loading fullScreen />}><FiscalPeriodsPage /></Suspense></TenantRoute>} />
        <Route path="accounting/health"            element={<TenantRoute module="accounting" roles={['admin', 'manager']}><Suspense fallback={<Loading fullScreen />}><AccountingHealthPage /></Suspense></TenantRoute>} />
        <Route path="accounting/opening-balances"  element={<TenantRoute module="accounting" roles={['admin', 'manager']}><Suspense fallback={<Loading fullScreen />}><OpeningBalancesPage /></Suspense></TenantRoute>} />
        <Route path="cash-sessions"    element={<TenantRoute module="treasury"><Suspense fallback={<Loading fullScreen />}><CashSessionsPage /></Suspense></TenantRoute>} />
        <Route path="receipts"         element={<TenantRoute module="treasury"><Suspense fallback={<Loading fullScreen />}><ReceiptsPage /></Suspense></TenantRoute>} />

        {/* ── Taller ─────────────────────────────────── */}
        {/* Lazy + Suspense: estas 6 rutas son el alcance completo de la PWA
            "Taller" instalada (mobile-only, con offline). Ver frontend/src/pwa/. */}
        <Route path="workshop/work-orders"             element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><WorkOrdersPage /></Suspense></TenantRoute>} />
        <Route path="workshop/report"                  element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><WorkshopReportPage /></Suspense></TenantRoute>} />
        <Route path="workshop/appointments"            element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><AppointmentsPage /></Suspense></TenantRoute>} />
        <Route path="workshop/appointments/settings"   element={<TenantRoute module="workshop" roles={['admin', 'manager']}><Suspense fallback={<Loading fullScreen />}><AppointmentSettingsPage /></Suspense></TenantRoute>} />
        <Route path="workshop/work-orders/new"         element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><WorkOrderFormPage /></Suspense></TenantRoute>} />
        <Route path="workshop/work-orders/:id"         element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><WorkOrderDetailPage /></Suspense></TenantRoute>} />
        <Route path="workshop/vehicles"                element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><VehiclesPage /></Suspense></TenantRoute>} />
        <Route path="workshop/vehicles/:id"            element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><VehicleDetailPage /></Suspense></TenantRoute>} />
        <Route path="workshop/scan"                    element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><ScannerPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/buscar"              element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><VinSearchPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/vehiculos/:vin"      element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><VehiculoDetailPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/vehiculos/:vin/venta"        element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><VentaFormPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/vehiculos/:vin/alistamiento" element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><AlistamientoFormPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/vehiculos/:vin/entrega"      element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><EntregaFormPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/vehiculos/:vin/garantia"     element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><GarantiaFormPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/garantias/:localId/reenviar" element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><GarantiaReenviarPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/revisiones"                  element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><AgendaRevisionesPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/vehiculos/:vin/revision"     element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><RevisionFormPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/liquidaciones"                element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><LiquidacionesPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/liquidaciones/:id"            element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><LiquidacionDetailPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/garantias"                    element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><GarantiasPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/tecnicos"                     element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><TecnicosPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/cotizar"                      element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><CotizarPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/sync"                         element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><SyncMonitorPage /></Suspense></TenantRoute>} />
        <Route path="ensambladora/auditoria"                    element={<TenantRoute module="ensambladora"><Suspense fallback={<Loading fullScreen />}><AuditoriaPage /></Suspense></TenantRoute>} />
        <Route path="workshop/productivity"            element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><TechnicianProductivityPage /></Suspense></TenantRoute>} />
        <Route path="workshop/commission-settlements"  element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><CommissionSettlementsPage /></Suspense></TenantRoute>} />
        <Route path="workshop/commission-settlements/:id" element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><CommissionSettlementDetailPage /></Suspense></TenantRoute>} />
        <Route path="workshop/commission-products"     element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><CommissionProductsReportPage /></Suspense></TenantRoute>} />
        <Route path="workshop/diagram-points-editor"   element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><DiagramPointsEditorPage /></Suspense></TenantRoute>} />

        {/* Customer Returns — ANTES de la ruta dinámica :id */}
        <Route path="sales/customer-returns"      element={<TenantRoute module="receivables"><Suspense fallback={<Loading fullScreen />}><CustomerReturnsPage /></Suspense></TenantRoute>} />
        <Route path="sales/customer-returns/new"  element={<TenantRoute module="receivables"><Suspense fallback={<Loading fullScreen />}><CustomerReturnFormPage /></Suspense></TenantRoute>} />
        <Route path="sales/customer-returns/:id"  element={<TenantRoute module="receivables"><Suspense fallback={<Loading fullScreen />}><CustomerReturnDetailPage /></Suspense></TenantRoute>} />

        {/* Sale Detail — después de las rutas específicas */}
        <Route path="sales/:id" element={<TenantRoute module="sales"><Suspense fallback={<Loading fullScreen />}><SaleDetailPage /></Suspense></TenantRoute>} />

        {/* Clientes */}
        <Route path="customers"     element={<TenantRoute module="sales"><Suspense fallback={<Loading fullScreen />}><CustomersPage /></Suspense></TenantRoute>} />
        <Route path="customers/:id" element={<TenantRoute module="sales"><Suspense fallback={<Loading fullScreen />}><CustomerDetailPage /></Suspense></TenantRoute>} />

        {/* CRM — pipeline, seguimiento y dashboard */}
        {/* Cotizar es un formulario propio del CRM, no una opción dentro de
            Ventas (ver SaleFormPage: isCrmQuoteMode) -- reusa el mismo
            componente que /sales/new para no duplicar ~800 líneas. */}
        <Route path="crm/quotes/new" element={<TenantRoute module={["sales", "workshop", "crm"]}><Suspense fallback={<Loading fullScreen />}><SaleFormPage /></Suspense></TenantRoute>} />
        <Route path="crm/pipeline"  element={<TenantRoute module="crm"><Suspense fallback={<Loading fullScreen />}><PipelinePage /></Suspense></TenantRoute>} />
        <Route path="crm/followups" element={<TenantRoute module="crm"><Suspense fallback={<Loading fullScreen />}><FollowUpsPage /></Suspense></TenantRoute>} />
        <Route path="crm/dashboard" element={<TenantRoute module="crm"><Suspense fallback={<Loading fullScreen />}><CrmDashboardPage /></Suspense></TenantRoute>} />
        <Route path="crm/settings/meta" element={<TenantRoute module="crm_meta_leads"><Suspense fallback={<Loading fullScreen />}><MetaIntegrationSettingsPage /></Suspense></TenantRoute>} />
        <Route path="crm/settings" element={<TenantRoute module="crm"><Suspense fallback={<Loading fullScreen />}><CrmSettingsPage /></Suspense></TenantRoute>} />

        {/* ── Inventario – Movimientos Avanzados ────── */}
        <Route path="inventory/supplier-returns"        element={<TenantRoute module="receivables"><Suspense fallback={<Loading fullScreen />}><SupplierReturnsPage /></Suspense></TenantRoute>} />
        <Route path="inventory/supplier-returns/new"    element={<TenantRoute module="receivables"><Suspense fallback={<Loading fullScreen />}><SupplierReturnFormPage /></Suspense></TenantRoute>} />
        <Route path="inventory/supplier-returns/:id"    element={<TenantRoute module="receivables"><Suspense fallback={<Loading fullScreen />}><SupplierReturnDetailPage /></Suspense></TenantRoute>} />
        <Route path="inventory/transfers"              element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><TransfersPage /></Suspense></TenantRoute>} />
        <Route path="inventory/transfers/new"          element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><TransferFormPage /></Suspense></TenantRoute>} />
        <Route path="inventory/transfers/:id/receive"  element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><TransferReceivePage /></Suspense></TenantRoute>} />
        <Route path="inventory/transfers/:id"          element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><TransferDetailPage /></Suspense></TenantRoute>} />
        <Route path="inventory/internal-consumptions"      element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><InternalConsumptionsPage /></Suspense></TenantRoute>} />
        <Route path="inventory/internal-consumptions/new"  element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><InternalConsumptionFormPage /></Suspense></TenantRoute>} />
        <Route path="inventory/internal-consumptions/:id"  element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><InternalConsumptionDetailPage /></Suspense></TenantRoute>} />
        <Route path="warehouses" element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><WarehousesPage /></Suspense></TenantRoute>} />
        <Route path="branches"   element={<TenantRoute module="inventory"><Suspense fallback={<Loading fullScreen />}><BranchesPage /></Suspense></TenantRoute>} />

        {/* ── Configuración y Reportes ───────────────── */}
        <Route path="settings" element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><TenantSettingsPage /></Suspense></TenantRoute>} />
        <Route path="settings/whatsapp" element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><WhatsAppSettingsPage /></Suspense></TenantRoute>} />

        <Route path="reports"  element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><ReportsPage /></Suspense></TenantRoute>} />
        <Route path="nexa/aprobaciones" element={<TenantRoute module="ai_assistant"><Suspense fallback={<Loading fullScreen />}><NexaApprovalsPage /></Suspense></TenantRoute>} />
        <Route path="users"          element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><UsersPage /></Suspense></TenantRoute>} />
        <Route path="users/new"      element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><UserForm /></Suspense></TenantRoute>} />
        <Route path="users/:id/edit" element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><UserForm /></Suspense></TenantRoute>} />
        <Route path="profile"  element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><ProfilePage /></Suspense></TenantRoute>} />

        {/* ✅ DIAN — Facturación Electrónica ────────── */}
        <Route path="dian/config"  element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><DianConfigPage /></Suspense></TenantRoute>} />
        <Route path="dian/eventos" element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><DianEventsPage /></Suspense></TenantRoute>} />

        {/* ── Soporte ──────────────────────────────── */}
        <Route path="support"              element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><SupportFAQ /></Suspense></TenantRoute>} />
        <Route path="support/new-ticket"   element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><CreateTicket /></Suspense></TenantRoute>} />
        <Route path="support/tickets"      element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><MyTickets /></Suspense></TenantRoute>} />
        <Route path="support/tickets/:id"  element={<TenantRoute><Suspense fallback={<Loading fullScreen />}><TicketDetail /></Suspense></TenantRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {isAuthenticated && <AnnouncementsModal />}
    </BrowserRouter>
  );
}

export default App;