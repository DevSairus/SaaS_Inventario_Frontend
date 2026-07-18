import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import LoginPage from './pages/auth/LoginPage';
import LandingPage from './pages/LandingPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import WorkOrderPublicPage from './pages/workshop/WorkOrderPublicPage';
import Loading from './components/common/Loading';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProductsPage from './pages/products/ProductsPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import PurchasesPage from './pages/purchases/PurchasesPage';
import PurchaseFormPage from './pages/purchases/PurchaseFormPage';
import PurchaseDetailPage from './pages/purchases/PurchaseDetailPage';
import AdjustmentsPage from './pages/adjustments/AdjustmentsPage';
import AdjustmentFormPage from './pages/adjustments/AdjustmentFormPage';
import AdjustmentDetailPage from './pages/adjustments/AdjustmentDetailPage';
import MovementsPage from './pages/movements/MovementsPage';
import StockAlertsPage from './pages/stock-alerts/StockAlertsPage';
import UsersPage from './pages/users/UsersPage';
import UserForm from './pages/users/UserForm';
import SalesPage from './pages/sales/SalesPage';
import SaleFormPage from './pages/sales/SaleFormPage';
import SaleDetailPage from './pages/sales/SaleDetailPage';
import AccountsReceivablePage from './pages/sales/AccountsReceivablePage';
import AccountsPayablePage from './pages/finance/AccountsPayablePage';
import ExpensesPage from './pages/finance/ExpensesPage';
import CashFlowPage from './pages/finance/CashFlowPage';
import CashSessionsPage from './pages/finance/CashSessionsPage';
import ChartOfAccountsPage from './pages/accounting/ChartOfAccountsPage';
import JournalEntriesPage from './pages/accounting/JournalEntriesPage';
import AccountMappingsPage from './pages/accounting/AccountMappingsPage';
import FinancialReportsPage from './pages/accounting/FinancialReportsPage';
import FiscalPeriodsPage from './pages/accounting/FiscalPeriodsPage';
import AccountingHealthPage from './pages/accounting/AccountingHealthPage';
// Lazy: son las únicas páginas dentro del alcance de la PWA "Taller" instalada
// (offline + precache del Service Worker, ver frontend/src/pwa/sw.js). El resto
// del módulo workshop (reportes, productividad, comisiones) sigue siendo eager.
const WorkOrdersPage = lazy(() => import('./pages/workshop/WorkOrdersPage'));
const WorkOrderFormPage = lazy(() => import('./pages/workshop/WorkOrderFormPage'));
const WorkOrderDetailPage = lazy(() => import('./pages/workshop/WorkOrderDetailPage'));
const VehiclesPage = lazy(() => import('./pages/workshop/VehiclesPage'));
const VehicleDetailPage = lazy(() => import('./pages/workshop/VehicleDetailPage'));
const ScannerPage = lazy(() => import('./pages/workshop/ScannerPage'));
import TechnicianProductivityPage from './pages/workshop/productivity/TechnicianProductivityPage';
import CommissionSettlementsPage from './pages/workshop/commissions/CommissionSettlementsPage';
import CommissionSettlementDetailPage from './pages/workshop/commissions/CommissionSettlementDetailPage';
import CommissionProductsReportPage from './pages/workshop/commissions/CommissionProductsReportPage';
import WorkshopReportPage from './pages/workshop/WorkshopReportPage';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import WarehousesPage from './pages/warehouses/WarehousesPage';
import BranchesPage from './pages/branches/BranchesPage';
import NoBranchAssignedPage from './pages/branches/NoBranchAssignedPage';
import TenantSettingsPage from './pages/settings/TenantSettingsPage';
import WhatsAppSettingsPage from './pages/settings/WhatsAppSettingsPage';
import ReportsPage from './pages/reports/ReportsPage';
import ProfilePage from './pages/profile/ProfilePage';
import NexaApprovalsPage from './pages/nexa/NexaApprovalsPage';

// Movimientos Avanzados
import CustomerReturnsPage from './pages/sales/CustomerReturnsPage';
import CustomerReturnFormPage from './pages/sales/CustomerReturnFormPage';
import CustomerReturnDetailPage from './pages/sales/CustomerReturnDetailPage';
import SupplierReturnsPage from './pages/inventory/SupplierReturnsPage';
import SupplierReturnFormPage from './pages/inventory/SupplierReturnFormPage';
import SupplierReturnDetailPage from './pages/inventory/SupplierReturnDetailPage';
import TransfersPage from './pages/inventory/TransfersPage';
import TransferFormPage from './pages/inventory/TransferFormPage';
import TransferReceivePage from './pages/inventory/TransferReceivePage';
import TransferDetailPage from './pages/inventory/TransferDetailPage';
import InternalConsumptionsPage from './pages/inventory/InternalConsumptionsPage';
import InternalConsumptionFormPage from './pages/inventory/InternalConsumptionFormPage';
import InternalConsumptionDetailPage from './pages/inventory/InternalConsumptionDetailPage';

// Super Admin
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import TenantsList from './pages/superadmin/TenantsList';
import TenantForm from './pages/superadmin/TenantForm';
import TenantDetail from './pages/superadmin/TenantDetail';
import TenantUsers from './pages/superadmin/TenantUsers';
import Analytics from './pages/superadmin/Analytics';
import RolePermissionsPage from './pages/superadmin/RolePermissionsPage';
import SubscriptionPlansManagement from './pages/superadmin/SubscriptionPlansManagement';
import SuperAdminSubscriptionsList from './pages/superadmin/SuperAdminSubscriptionsList';
import SubscriptionInvoicesManagement from './pages/superadmin/SubscriptionInvoicesManagement';
import SubscriptionManagement from './pages/superadmin/SubscriptionManagement';
import SuperAdminMercadoPagoConfig from './pages/superadmin/SuperAdminMercadoPagoConfig';
import SuperAdminNcfConfig from './pages/superadmin/SuperAdminNcfConfig';
import AnnouncementsManagement from './pages/superadmin/AnnouncementsManagement';
import AnnouncementsModal from './components/common/AnnouncementsModal';

// ✅ DIAN — Facturación Electrónica
import DianConfigPage from './pages/dian/DianConfigPage';
import DianEventsPage from './pages/dian/DianEventsPage';

// Auth / Session
import SessionMonitor from './components/auth/SessionMonitor';
import { Toaster } from 'react-hot-toast';
import PrivateRoute from './components/auth/PrivateRoute';
import useAuthStore from './store/authStore';
import useTenantStore from './store/tenantStore';
import SessionKeepAlive from './components/SessionKeepAlive';
import PwaBootstrap from './pwa/PwaBootstrap';
import { ROLES, ROUTES } from './utils/constants';

// Redirigir según rol
function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <LandingPage />;
  if (user?.role === ROLES.SUPER_ADMIN) return <Navigate to={ROUTES.SUPERADMIN_DASHBOARD} replace />;
  return <Navigate to={ROUTES.DASHBOARD} replace />;
}

function SuperAdminRoute({ children }) {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  if (user?.role !== ROLES.SUPER_ADMIN) return <Navigate to={ROUTES.DASHBOARD} replace />;
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
  if (module && enabledModules && !enabledModules.includes(module)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  return children;
}

function App() {
  const { isAuthenticated } = useAuthStore();
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

      <Routes>
        {/* Root */}
        <Route path="/" element={<RoleBasedRedirect />} />

        {/* Públicas */}
        <Route path="/bienvenida"     element={<LandingPage />} />
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/ot/:token"      element={<WorkOrderPublicPage />} />
        <Route path="/sin-sede"       element={<NoBranchAssignedPage />} />

        {/* ─── Super Admin ─────────────────────────────────── */}
        <Route
          path="/superadmin"
          element={<SuperAdminRoute><SuperAdminLayout /></SuperAdminRoute>}
        >
          <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
          <Route path="dashboard"           element={<SuperAdminDashboard />} />
          <Route path="tenants"             element={<TenantsList />} />
          <Route path="tenants/new"         element={<TenantForm />} />
          <Route path="tenants/:id"         element={<TenantDetail />} />
          <Route path="tenants/:id/edit"    element={<TenantForm />} />
          <Route path="tenants/:id/users"   element={<TenantUsers />} />
          <Route path="tenants/:id/subscription" element={<SubscriptionManagement />} />
          <Route path="subscription-plans"  element={<SubscriptionPlansManagement />} />
          <Route path="subscriptions"       element={<SuperAdminSubscriptionsList />} />
          <Route path="subscriptions/:id"   element={<SubscriptionManagement />} />
          <Route path="subscription-invoices" element={<SubscriptionInvoicesManagement />} />
          <Route path="mercadopago-config"  element={<SuperAdminMercadoPagoConfig />} />
          <Route path="ncf-config"          element={<SuperAdminNcfConfig />} />
          <Route path="announcements"       element={<AnnouncementsManagement />} />
          <Route path="analytics"           element={<Analytics />} />
          <Route path="permissions"         element={<RolePermissionsPage />} />
        </Route>

        {/* ─── Tenant ──────────────────────────────────────── */}
        <Route path="dashboard"  element={<TenantRoute><DashboardPage /></TenantRoute>} />
        <Route path="products"   element={<TenantRoute module="inventory"><ProductsPage /></TenantRoute>} />
        <Route path="categories" element={<TenantRoute module="inventory"><CategoriesPage /></TenantRoute>} />
        <Route path="suppliers"  element={<TenantRoute module="inventory"><SuppliersPage /></TenantRoute>} />

        {/* Compras */}
        <Route path="purchases"          element={<TenantRoute module="inventory"><PurchasesPage /></TenantRoute>} />
        <Route path="purchases/new"      element={<TenantRoute module="inventory"><PurchaseFormPage /></TenantRoute>} />
        <Route path="purchases/edit/:id" element={<TenantRoute module="inventory"><PurchaseFormPage /></TenantRoute>} />
        <Route path="purchases/:id"      element={<TenantRoute module="inventory"><PurchaseDetailPage /></TenantRoute>} />

        {/* Ajustes */}
        <Route path="adjustments"          element={<TenantRoute module="inventory"><AdjustmentsPage /></TenantRoute>} />
        <Route path="adjustments/new"      element={<TenantRoute module="inventory"><AdjustmentFormPage /></TenantRoute>} />
        <Route path="adjustments/edit/:id" element={<TenantRoute module="inventory"><AdjustmentFormPage /></TenantRoute>} />
        <Route path="adjustments/:id"      element={<TenantRoute module="inventory"><AdjustmentDetailPage /></TenantRoute>} />

        <Route path="movements"   element={<TenantRoute module="inventory"><MovementsPage /></TenantRoute>} />
        <Route path="stock-alerts" element={<TenantRoute module="inventory"><StockAlertsPage /></TenantRoute>} />

        {/* ── Ventas ─────────────────────────────────── */}
        <Route path="sales"          element={<TenantRoute module="sales"><SalesPage /></TenantRoute>} />
        <Route path="sales/new"      element={<TenantRoute module="sales"><SaleFormPage /></TenantRoute>} />
        <Route path="sales/:id/edit" element={<TenantRoute module="sales"><SaleFormPage /></TenantRoute>} />
        <Route path="accounts-receivable" element={<TenantRoute module="receivables"><AccountsReceivablePage /></TenantRoute>} />

        {/* ── Tesorería ──────────────────────────────── */}
        <Route path="accounts-payable" element={<TenantRoute module="treasury"><AccountsPayablePage /></TenantRoute>} />
        <Route path="expenses"         element={<TenantRoute module="treasury"><ExpensesPage /></TenantRoute>} />
        <Route path="cashflow"         element={<TenantRoute module="treasury"><CashFlowPage /></TenantRoute>} />
        <Route path="accounting/chart-of-accounts" element={<TenantRoute module="accounting" roles={['admin', 'manager']}><ChartOfAccountsPage /></TenantRoute>} />
        <Route path="accounting/journal-entries"   element={<TenantRoute module="accounting" roles={['admin', 'manager']}><JournalEntriesPage /></TenantRoute>} />
        <Route path="accounting/account-mappings"  element={<TenantRoute module="accounting" roles={['admin', 'manager']}><AccountMappingsPage /></TenantRoute>} />
        <Route path="accounting/reports"           element={<TenantRoute module="accounting" roles={['admin', 'manager']}><FinancialReportsPage /></TenantRoute>} />
        <Route path="accounting/fiscal-periods"    element={<TenantRoute module="accounting" roles={['admin', 'manager']}><FiscalPeriodsPage /></TenantRoute>} />
        <Route path="accounting/health"            element={<TenantRoute module="accounting" roles={['admin', 'manager']}><AccountingHealthPage /></TenantRoute>} />
        <Route path="cash-sessions"    element={<TenantRoute module="treasury"><CashSessionsPage /></TenantRoute>} />

        {/* ── Taller ─────────────────────────────────── */}
        {/* Lazy + Suspense: estas 6 rutas son el alcance completo de la PWA
            "Taller" instalada (mobile-only, con offline). Ver frontend/src/pwa/. */}
        <Route path="workshop/work-orders"             element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><WorkOrdersPage /></Suspense></TenantRoute>} />
        <Route path="workshop/report"                  element={<TenantRoute module="workshop"><WorkshopReportPage /></TenantRoute>} />
        <Route path="workshop/work-orders/new"         element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><WorkOrderFormPage /></Suspense></TenantRoute>} />
        <Route path="workshop/work-orders/:id"         element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><WorkOrderDetailPage /></Suspense></TenantRoute>} />
        <Route path="workshop/vehicles"                element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><VehiclesPage /></Suspense></TenantRoute>} />
        <Route path="workshop/vehicles/:id"            element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><VehicleDetailPage /></Suspense></TenantRoute>} />
        <Route path="workshop/scan"                    element={<TenantRoute module="workshop"><Suspense fallback={<Loading fullScreen />}><ScannerPage /></Suspense></TenantRoute>} />
        <Route path="workshop/productivity"            element={<TenantRoute module="workshop"><TechnicianProductivityPage /></TenantRoute>} />
        <Route path="workshop/commission-settlements"  element={<TenantRoute module="workshop"><CommissionSettlementsPage /></TenantRoute>} />
        <Route path="workshop/commission-settlements/:id" element={<TenantRoute module="workshop"><CommissionSettlementDetailPage /></TenantRoute>} />
        <Route path="workshop/commission-products"     element={<TenantRoute module="workshop"><CommissionProductsReportPage /></TenantRoute>} />

        {/* Customer Returns — ANTES de la ruta dinámica :id */}
        <Route path="sales/customer-returns"      element={<TenantRoute module="receivables"><CustomerReturnsPage /></TenantRoute>} />
        <Route path="sales/customer-returns/new"  element={<TenantRoute module="receivables"><CustomerReturnFormPage /></TenantRoute>} />
        <Route path="sales/customer-returns/:id"  element={<TenantRoute module="receivables"><CustomerReturnDetailPage /></TenantRoute>} />

        {/* Sale Detail — después de las rutas específicas */}
        <Route path="sales/:id" element={<TenantRoute module="sales"><SaleDetailPage /></TenantRoute>} />

        {/* Clientes */}
        <Route path="customers"     element={<TenantRoute module="sales"><CustomersPage /></TenantRoute>} />
        <Route path="customers/:id" element={<TenantRoute module="sales"><CustomerDetailPage /></TenantRoute>} />

        {/* ── Inventario – Movimientos Avanzados ────── */}
        <Route path="inventory/supplier-returns"        element={<TenantRoute module="receivables"><SupplierReturnsPage /></TenantRoute>} />
        <Route path="inventory/supplier-returns/new"    element={<TenantRoute module="receivables"><SupplierReturnFormPage /></TenantRoute>} />
        <Route path="inventory/supplier-returns/:id"    element={<TenantRoute module="receivables"><SupplierReturnDetailPage /></TenantRoute>} />
        <Route path="inventory/transfers"              element={<TenantRoute module="inventory"><TransfersPage /></TenantRoute>} />
        <Route path="inventory/transfers/new"          element={<TenantRoute module="inventory"><TransferFormPage /></TenantRoute>} />
        <Route path="inventory/transfers/:id/receive"  element={<TenantRoute module="inventory"><TransferReceivePage /></TenantRoute>} />
        <Route path="inventory/transfers/:id"          element={<TenantRoute module="inventory"><TransferDetailPage /></TenantRoute>} />
        <Route path="inventory/internal-consumptions"      element={<TenantRoute module="inventory"><InternalConsumptionsPage /></TenantRoute>} />
        <Route path="inventory/internal-consumptions/new"  element={<TenantRoute module="inventory"><InternalConsumptionFormPage /></TenantRoute>} />
        <Route path="inventory/internal-consumptions/:id"  element={<TenantRoute module="inventory"><InternalConsumptionDetailPage /></TenantRoute>} />
        <Route path="warehouses" element={<TenantRoute module="inventory"><WarehousesPage /></TenantRoute>} />
        <Route path="branches"   element={<TenantRoute module="inventory"><BranchesPage /></TenantRoute>} />

        {/* ── Configuración y Reportes ───────────────── */}
        <Route path="settings" element={<TenantRoute><TenantSettingsPage /></TenantRoute>} />
        <Route path="settings/whatsapp" element={<TenantRoute><WhatsAppSettingsPage /></TenantRoute>} />

        <Route path="reports"  element={<TenantRoute><ReportsPage /></TenantRoute>} />
        <Route path="nexa/aprobaciones" element={<TenantRoute module="ai_assistant"><NexaApprovalsPage /></TenantRoute>} />
        <Route path="users"          element={<TenantRoute><UsersPage /></TenantRoute>} />
        <Route path="users/new"      element={<TenantRoute><UserForm /></TenantRoute>} />
        <Route path="users/:id/edit" element={<TenantRoute><UserForm /></TenantRoute>} />
        <Route path="profile"  element={<TenantRoute><ProfilePage /></TenantRoute>} />

        {/* ✅ DIAN — Facturación Electrónica ────────── */}
        <Route path="dian/config"  element={<TenantRoute><DianConfigPage /></TenantRoute>} />
        <Route path="dian/eventos" element={<TenantRoute><DianEventsPage /></TenantRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {isAuthenticated && <AnnouncementsModal />}
    </BrowserRouter>
  );
}

export default App;