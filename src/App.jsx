import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
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
import ReportsPage from './pages/reports/ReportsPage';
import ProfilePage from './pages/profile/ProfilePage';

// Movimientos Avanzados - Customer Returns
import CustomerReturnsPage from './pages/sales/CustomerReturnsPage';
import CustomerReturnFormPage from './pages/sales/CustomerReturnFormPage';
import CustomerReturnDetailPage from './pages/sales/CustomerReturnDetailPage';

// Movimientos Avanzados - Supplier Returns
import SupplierReturnsPage from './pages/inventory/SupplierReturnsPage';
import SupplierReturnFormPage from './pages/inventory/SupplierReturnFormPage';

// Movimientos Avanzados - Transfers
import TransfersPage from './pages/inventory/TransfersPage';
import TransferFormPage from './pages/inventory/TransferFormPage';
import TransferReceivePage from './pages/inventory/TransferReceivePage';
import TransferDetailPage from './pages/inventory/TransferDetailPage';

// Movimientos Avanzados - Internal Consumptions
import InternalConsumptionsPage from './pages/inventory/InternalConsumptionsPage';
import InternalConsumptionFormPage from './pages/inventory/InternalConsumptionFormPage';
import InternalConsumptionDetailPage from './pages/inventory/InternalConsumptionDetailPage';

// Super Admin Pages
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

// ✅ NUEVO: Sistema de Anuncios
import AnnouncementsManagement from './pages/superadmin/AnnouncementsManagement';
import AnnouncementsModal from './components/common/AnnouncementsModal';

// ✅ NUEVO: Sistema de Auto-Logout
import SessionMonitor from './components/auth/SessionMonitor';
import { Toaster } from 'react-hot-toast';

// Components
import PrivateRoute from './components/auth/PrivateRoute';
import useAuthStore from './store/authStore';
import SessionKeepAlive from './components/SessionKeepAlive';

// Componente para redirigir según el rol
function RoleBasedRedirect() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si es super admin, redirigir a dashboard de super admin
  if (user?.role === 'super_admin') {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  // Si es tenant, redirigir a dashboard de tenant
  return <Navigate to="/dashboard" replace />;
}

// Ruta protegida solo para Super Admin
function SuperAdminRoute({ children }) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Ruta protegida solo para Tenants (NO super admin)
function TenantRoute({ children }) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'super_admin') {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  return children;
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      {/* Mantener sesión activa mientras el usuario está activo */}
      <SessionKeepAlive />
      
      {/* ✅ Sistema de notificaciones toast */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* ✅ Monitor de sesión - Detecta tokens expirados */}
      <SessionMonitor />

      <Routes>
        {/* Redirect root basado en rol */}
        <Route path="/" element={<RoleBasedRedirect />} />

        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ============================================ */}
        {/* RUTAS DE SUPER ADMIN */}
        {/* ============================================ */}
        <Route
          path="/superadmin"
          element={
            <SuperAdminRoute>
              <SuperAdminLayout />
            </SuperAdminRoute>
          }
        >
          <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          
          {/* Tenants */}
          <Route path="tenants" element={<TenantsList />} />
          <Route path="tenants/new" element={<TenantForm />} />
          <Route path="tenants/:id" element={<TenantDetail />} />
          <Route path="tenants/:id/edit" element={<TenantForm />} />
          <Route path="tenants/:id/users" element={<TenantUsers />} />
          <Route path="tenants/:id/subscription" element={<SubscriptionManagement />} />

          {/* Suscripciones */}
          <Route path="subscription-plans" element={<SubscriptionPlansManagement />} />
          <Route path="subscriptions" element={<SuperAdminSubscriptionsList />} />
          <Route path="subscriptions/:id" element={<SubscriptionManagement />} />
          <Route path="subscription-invoices" element={<SubscriptionInvoicesManagement />} />
          <Route path="mercadopago-config" element={<SuperAdminMercadoPagoConfig />} />
          
          {/* ✅ NUEVO: Anuncios */}
          <Route path="announcements" element={<AnnouncementsManagement />} />
          
          {/* Analytics y Permisos */}
          <Route path="analytics" element={<Analytics />} />
          <Route path="permissions" element={<RolePermissionsPage />} />
        </Route>

        {/* ============================================ */}
        {/* RUTAS DE TENANT (Layout Normal) */}
        {/* ============================================ */}
        <Route path="dashboard" element={<TenantRoute><DashboardPage /></TenantRoute>} />
        <Route path="products" element={<TenantRoute><ProductsPage /></TenantRoute>} />
        <Route path="categories" element={<TenantRoute><CategoriesPage /></TenantRoute>} />
        <Route path="suppliers" element={<TenantRoute><SuppliersPage /></TenantRoute>} />
        
        {/* Purchases */}
        <Route path="purchases" element={<TenantRoute><PurchasesPage /></TenantRoute>} />
        <Route path="purchases/new" element={<TenantRoute><PurchaseFormPage /></TenantRoute>} />
        <Route path="purchases/edit/:id" element={<TenantRoute><PurchaseFormPage /></TenantRoute>} />
        <Route path="purchases/:id" element={<TenantRoute><PurchaseDetailPage /></TenantRoute>} />

        {/* Adjustments */}
        <Route path="adjustments" element={<TenantRoute><AdjustmentsPage /></TenantRoute>} />
        <Route path="adjustments/new" element={<TenantRoute><AdjustmentFormPage /></TenantRoute>} />
        <Route path="adjustments/edit/:id" element={<TenantRoute><AdjustmentFormPage /></TenantRoute>} />
        <Route path="adjustments/:id" element={<TenantRoute><AdjustmentDetailPage /></TenantRoute>} />

        {/* Movements */}
        <Route path="movements" element={<TenantRoute><MovementsPage /></TenantRoute>} />
        
        {/* Stock Alerts */}
        <Route path="stock-alerts" element={<TenantRoute><StockAlertsPage /></TenantRoute>} />

        {/* ============================================ */}
        {/* VENTAS */}
        {/* ============================================ */}
        <Route path="sales" element={<TenantRoute><SalesPage /></TenantRoute>} />
        <Route path="sales/new" element={<TenantRoute><SaleFormPage /></TenantRoute>} />
        <Route path="sales/:id/edit" element={<TenantRoute><SaleFormPage /></TenantRoute>} />
        
        {/* Cartera (Cuentas por Cobrar) */}
        <Route path="accounts-receivable" element={<TenantRoute><AccountsReceivablePage /></TenantRoute>} />

        {/* ── TALLER ── */}
        <Route path="workshop/work-orders" element={<TenantRoute><WorkOrdersPage /></TenantRoute>} />
        <Route path="workshop/report" element={<TenantRoute><WorkshopReportPage /></TenantRoute>} />
        <Route path="workshop/work-orders/new" element={<TenantRoute><WorkOrderFormPage /></TenantRoute>} />
        <Route path="workshop/work-orders/:id" element={<TenantRoute><WorkOrderDetailPage /></TenantRoute>} />
        <Route path="workshop/vehicles" element={<TenantRoute><VehiclesPage /></TenantRoute>} />
        <Route path="workshop/vehicles/:id" element={<TenantRoute><VehicleDetailPage /></TenantRoute>} />
        <Route path="workshop/productivity" element={<TenantRoute><TechnicianProductivityPage /></TenantRoute>} />
        <Route path="workshop/commission-settlements" element={<TenantRoute><CommissionSettlementsPage /></TenantRoute>} />
        <Route path="workshop/commission-settlements/:id" element={<TenantRoute><CommissionSettlementDetailPage /></TenantRoute>} />
        
        {/* Customer Returns - ANTES de la ruta dinámica :id */}
        <Route path="sales/customer-returns" element={<TenantRoute><CustomerReturnsPage /></TenantRoute>} />
        <Route path="sales/customer-returns/new" element={<TenantRoute><CustomerReturnFormPage /></TenantRoute>} />
        <Route path="sales/customer-returns/:id" element={<TenantRoute><CustomerReturnDetailPage /></TenantRoute>} />
        
        {/* Sale Detail - Después de las rutas específicas */}
        <Route path="sales/:id" element={<TenantRoute><SaleDetailPage /></TenantRoute>} />

        {/* Clientes */}
        <Route path="customers" element={<TenantRoute><CustomersPage /></TenantRoute>} />
        <Route path="customers/:id" element={<TenantRoute><CustomerDetailPage /></TenantRoute>} />

        {/* ============================================ */}
        {/* INVENTARIO - MOVIMIENTOS AVANZADOS */}
        {/* ============================================ */}
        
        {/* Supplier Returns */}
        <Route path="inventory/supplier-returns" element={<TenantRoute><SupplierReturnsPage /></TenantRoute>} />
        <Route path="inventory/supplier-returns/new" element={<TenantRoute><SupplierReturnFormPage /></TenantRoute>} />
        
        {/* Transfers */}
        <Route path="inventory/transfers" element={<TenantRoute><TransfersPage /></TenantRoute>} />
        <Route path="inventory/transfers/new" element={<TenantRoute><TransferFormPage /></TenantRoute>} />
        <Route path="inventory/transfers/:id/receive" element={<TenantRoute><TransferReceivePage /></TenantRoute>} />
        <Route path="inventory/transfers/:id" element={<TenantRoute><TransferDetailPage /></TenantRoute>} />
        
        {/* Internal Consumptions */}
        <Route path="inventory/internal-consumptions" element={<TenantRoute><InternalConsumptionsPage /></TenantRoute>} />
        <Route path="inventory/internal-consumptions/new" element={<TenantRoute><InternalConsumptionFormPage /></TenantRoute>} />
        <Route path="inventory/internal-consumptions/:id" element={<TenantRoute><InternalConsumptionDetailPage /></TenantRoute>} />

        {/* Bodegas */}
        <Route path="warehouses" element={<TenantRoute><WarehousesPage /></TenantRoute>} />

        {/* ============================================ */}
        {/* CONFIGURACIÓN Y REPORTES */}
        {/* ============================================ */}
        
        {/* Settings */}
        <Route path="settings" element={<TenantRoute><TenantSettingsPage /></TenantRoute>} />

        {/* Reports */}
        <Route path="reports" element={<TenantRoute><ReportsPage /></TenantRoute>} />

        {/* Users */}
        <Route path="users" element={<TenantRoute><UsersPage /></TenantRoute>} />
        <Route path="users/new" element={<TenantRoute><UserForm /></TenantRoute>} />
        <Route path="users/:id/edit" element={<TenantRoute><UserForm /></TenantRoute>} />

        {/* Profile */}
        <Route path="profile" element={<TenantRoute><ProfilePage /></TenantRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* ✅ Modal de Anuncios - Se muestra globalmente cuando hay anuncios pendientes */}
      {isAuthenticated && <AnnouncementsModal />}
    </BrowserRouter>
  );
}

export default App;