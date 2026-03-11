import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import WorkOrderPublicPage from './pages/workshop/WorkOrderPublicPage';
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
import WorkOrdersPage from './pages/workshop/WorkOrdersPage';
import WorkOrderFormPage from './pages/workshop/WorkOrderFormPage';
import WorkOrderDetailPage from './pages/workshop/WorkOrderDetailPage';
import VehiclesPage from './pages/workshop/VehiclesPage';
import VehicleDetailPage from './pages/workshop/VehicleDetailPage';
import TechnicianProductivityPage from './pages/workshop/productivity/TechnicianProductivityPage';
import CommissionSettlementsPage from './pages/workshop/commissions/CommissionSettlementsPage';
import CommissionSettlementDetailPage from './pages/workshop/commissions/CommissionSettlementDetailPage';
import WorkshopReportPage from './pages/workshop/WorkshopReportPage';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import WarehousesPage from './pages/warehouses/WarehousesPage';
import TenantSettingsPage from './pages/settings/TenantSettingsPage';
import WhatsAppSettingsPage from './pages/settings/WhatsAppSettingsPage';
import ReportsPage from './pages/reports/ReportsPage';
import ProfilePage from './pages/profile/ProfilePage';

// Movimientos Avanzados
import CustomerReturnsPage from './pages/sales/CustomerReturnsPage';
import CustomerReturnFormPage from './pages/sales/CustomerReturnFormPage';
import CustomerReturnDetailPage from './pages/sales/CustomerReturnDetailPage';
import SupplierReturnsPage from './pages/inventory/SupplierReturnsPage';
import SupplierReturnFormPage from './pages/inventory/SupplierReturnFormPage';
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
import SessionKeepAlive from './components/SessionKeepAlive';

// Redirigir según rol
function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'super_admin') return <Navigate to="/superadmin/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

function SuperAdminRoute({ children }) {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function TenantRoute({ children }) {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'super_admin') return <Navigate to="/superadmin/dashboard" replace />;
  return children;
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <SessionKeepAlive />
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
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/ot/:token"      element={<WorkOrderPublicPage />} />

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
          <Route path="announcements"       element={<AnnouncementsManagement />} />
          <Route path="analytics"           element={<Analytics />} />
          <Route path="permissions"         element={<RolePermissionsPage />} />
        </Route>

        {/* ─── Tenant ──────────────────────────────────────── */}
        <Route path="dashboard"  element={<TenantRoute><DashboardPage /></TenantRoute>} />
        <Route path="products"   element={<TenantRoute><ProductsPage /></TenantRoute>} />
        <Route path="categories" element={<TenantRoute><CategoriesPage /></TenantRoute>} />
        <Route path="suppliers"  element={<TenantRoute><SuppliersPage /></TenantRoute>} />

        {/* Compras */}
        <Route path="purchases"          element={<TenantRoute><PurchasesPage /></TenantRoute>} />
        <Route path="purchases/new"      element={<TenantRoute><PurchaseFormPage /></TenantRoute>} />
        <Route path="purchases/edit/:id" element={<TenantRoute><PurchaseFormPage /></TenantRoute>} />
        <Route path="purchases/:id"      element={<TenantRoute><PurchaseDetailPage /></TenantRoute>} />

        {/* Ajustes */}
        <Route path="adjustments"          element={<TenantRoute><AdjustmentsPage /></TenantRoute>} />
        <Route path="adjustments/new"      element={<TenantRoute><AdjustmentFormPage /></TenantRoute>} />
        <Route path="adjustments/edit/:id" element={<TenantRoute><AdjustmentFormPage /></TenantRoute>} />
        <Route path="adjustments/:id"      element={<TenantRoute><AdjustmentDetailPage /></TenantRoute>} />

        <Route path="movements"   element={<TenantRoute><MovementsPage /></TenantRoute>} />
        <Route path="stock-alerts" element={<TenantRoute><StockAlertsPage /></TenantRoute>} />

        {/* ── Ventas ─────────────────────────────────── */}
        <Route path="sales"          element={<TenantRoute><SalesPage /></TenantRoute>} />
        <Route path="sales/new"      element={<TenantRoute><SaleFormPage /></TenantRoute>} />
        <Route path="sales/:id/edit" element={<TenantRoute><SaleFormPage /></TenantRoute>} />
        <Route path="accounts-receivable" element={<TenantRoute><AccountsReceivablePage /></TenantRoute>} />

        {/* ── Taller ─────────────────────────────────── */}
        <Route path="workshop/work-orders"             element={<TenantRoute><WorkOrdersPage /></TenantRoute>} />
        <Route path="workshop/report"                  element={<TenantRoute><WorkshopReportPage /></TenantRoute>} />
        <Route path="workshop/work-orders/new"         element={<TenantRoute><WorkOrderFormPage /></TenantRoute>} />
        <Route path="workshop/work-orders/:id"         element={<TenantRoute><WorkOrderDetailPage /></TenantRoute>} />
        <Route path="workshop/vehicles"                element={<TenantRoute><VehiclesPage /></TenantRoute>} />
        <Route path="workshop/vehicles/:id"            element={<TenantRoute><VehicleDetailPage /></TenantRoute>} />
        <Route path="workshop/productivity"            element={<TenantRoute><TechnicianProductivityPage /></TenantRoute>} />
        <Route path="workshop/commission-settlements"  element={<TenantRoute><CommissionSettlementsPage /></TenantRoute>} />
        <Route path="workshop/commission-settlements/:id" element={<TenantRoute><CommissionSettlementDetailPage /></TenantRoute>} />

        {/* Customer Returns — ANTES de la ruta dinámica :id */}
        <Route path="sales/customer-returns"      element={<TenantRoute><CustomerReturnsPage /></TenantRoute>} />
        <Route path="sales/customer-returns/new"  element={<TenantRoute><CustomerReturnFormPage /></TenantRoute>} />
        <Route path="sales/customer-returns/:id"  element={<TenantRoute><CustomerReturnDetailPage /></TenantRoute>} />

        {/* Sale Detail — después de las rutas específicas */}
        <Route path="sales/:id" element={<TenantRoute><SaleDetailPage /></TenantRoute>} />

        {/* Clientes */}
        <Route path="customers"     element={<TenantRoute><CustomersPage /></TenantRoute>} />
        <Route path="customers/:id" element={<TenantRoute><CustomerDetailPage /></TenantRoute>} />

        {/* ── Inventario – Movimientos Avanzados ────── */}
        <Route path="inventory/supplier-returns"       element={<TenantRoute><SupplierReturnsPage /></TenantRoute>} />
        <Route path="inventory/supplier-returns/new"   element={<TenantRoute><SupplierReturnFormPage /></TenantRoute>} />
        <Route path="inventory/transfers"              element={<TenantRoute><TransfersPage /></TenantRoute>} />
        <Route path="inventory/transfers/new"          element={<TenantRoute><TransferFormPage /></TenantRoute>} />
        <Route path="inventory/transfers/:id/receive"  element={<TenantRoute><TransferReceivePage /></TenantRoute>} />
        <Route path="inventory/transfers/:id"          element={<TenantRoute><TransferDetailPage /></TenantRoute>} />
        <Route path="inventory/internal-consumptions"      element={<TenantRoute><InternalConsumptionsPage /></TenantRoute>} />
        <Route path="inventory/internal-consumptions/new"  element={<TenantRoute><InternalConsumptionFormPage /></TenantRoute>} />
        <Route path="inventory/internal-consumptions/:id"  element={<TenantRoute><InternalConsumptionDetailPage /></TenantRoute>} />
        <Route path="warehouses" element={<TenantRoute><WarehousesPage /></TenantRoute>} />

        {/* ── Configuración y Reportes ───────────────── */}
        <Route path="settings" element={<TenantRoute><TenantSettingsPage /></TenantRoute>} />
        <Route path="settings/whatsapp" element={<TenantRoute><WhatsAppSettingsPage /></TenantRoute>} />
        <Route path="reports"  element={<TenantRoute><ReportsPage /></TenantRoute>} />
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