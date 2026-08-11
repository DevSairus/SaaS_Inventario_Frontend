import { useState } from 'react';
import Sidebar from './Sidebar';
import WorkshopBottomNav from './WorkshopBottomNav';
import StockAlerts from '../common/StockAlerts';
import CrmNotifications from '../common/CrmNotifications';
import QuoteNotificationsBell from '../common/QuoteNotificationsBell';
import AppointmentNotificationsBell from '../common/AppointmentNotificationsBell';
import BranchSelector from './BranchSelector';
import NexaChatWidget from '../common/NexaChatWidget';
import { useTicketNotifications } from '../../hooks/useTicketNotifications';
import { useQuoteNotifications } from '../../hooks/useQuoteNotifications';
import { useAppointmentNotifications } from '../../hooks/useAppointmentNotifications';
import { Bars3Icon } from '@heroicons/react/24/outline';
import useAuthStore from '../../store/authStore';
import { isRunningAsInstalledPwa } from '../../pwa/pwaEnv';
import OfflineBanner from '../../pwa/components/OfflineBanner';
import PendingSyncBadge from '../../pwa/components/PendingSyncBadge';
import SyncRetryButton from '../../pwa/components/SyncRetryButton';
import ConflictResolutionModal from '../../pwa/components/ConflictResolutionModal';

// Marca de agua decorativa (auto/moto + llave) — patrón sutil de fondo para
// que las pantallas no sean un blanco plano. Muy baja opacidad, no interactivo.
const WATERMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">
  <g fill="none" stroke="#0f172a" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M28 58h60M28 58a8 8 0 008 8 8 8 0 008-8M28 58V42l8-20h44l8 20v16M84 58a8 8 0 008 8 8 8 0 008-8M28 42h60" />
    <path d="M172 198a16 16 0 10-22 22L128 242v12h12l22-22a16 16 0 0022-22z" />
  </g>
</svg>`;
const WATERMARK_BG = `url("data:image/svg+xml,${encodeURIComponent(WATERMARK_SVG)}")`;

function Layout({ children }) {
  const [isCollapsed, setIsCollapsed]           = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuthStore();
  useTicketNotifications();
  useQuoteNotifications();
  useAppointmentNotifications();
  // La PWA "Taller" instalada reemplaza el sidebar completo de escritorio por
  // un bottom-nav de 3 ítems (ver PwaBootstrap/manifest scope "/workshop/").
  const isWorkshopPwa = isRunningAsInstalledPwa();

  if (isWorkshopPwa) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0D0D0D] flex flex-col relative">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0"
          style={{ opacity: 0.035, backgroundImage: WATERMARK_BG, backgroundSize: '220px 220px', backgroundRepeat: 'repeat' }} />
        <OfflineBanner />
        <header className="sticky top-0 z-30 flex items-center justify-between bg-white dark:bg-[#17181C] border-b border-gray-200 dark:border-white/10 px-4 h-14 shadow-sm flex-shrink-0">
          <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">Taller</span>
          <div className="flex items-center gap-2">
            <AppointmentNotificationsBell />
            <QuoteNotificationsBell />
            <PendingSyncBadge />
            <SyncRetryButton />
          </div>
        </header>
        <main className="relative z-10 flex-1 px-4 py-4 pb-24 min-w-0">
          <div className="border border-gray-200 dark:border-white/10 rounded-2xl bg-white/70 dark:bg-[#17181C]/70 p-3 min-h-[calc(100vh-9rem)]">
            {children}
          </div>
        </main>
        <WorkshopBottomNav />
        <ConflictResolutionModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D0D0D] flex relative">

      {/* Marca de agua de fondo, sutil, no interactiva */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0"
        style={{ opacity: 0.035, backgroundImage: WATERMARK_BG, backgroundSize: '260px 260px', backgroundRepeat: 'repeat' }} />

      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Columna derecha */}
      <div
        className="relative z-10 flex-1 flex flex-col min-w-0"
      >
        {/* Topbar móvil — solo visible en pantallas < lg */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-white dark:bg-[#17181C] border-b border-gray-200 dark:border-white/10 px-4 h-14 shadow-sm flex-shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
            aria-label="Abrir menú"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate px-2">
            {user?.company_name || 'Panel'}
          </span>

          <div className="flex items-center gap-2">
            <BranchSelector />
            <AppointmentNotificationsBell />
            <QuoteNotificationsBell />
            <CrmNotifications />
            <StockAlerts />
          </div>
        </header>

        {/* Barra desktop con alertas */}
        <div className="hidden lg:flex sticky top-0 z-30 items-center justify-end gap-3 bg-gray-50 dark:bg-[#0D0D0D] px-6 pt-4 pb-1 flex-shrink-0">
          <BranchSelector />
          <AppointmentNotificationsBell />
          <QuoteNotificationsBell />
          <CrmNotifications />
          <StockAlerts />
        </div>

        {/* Contenido principal */}
        <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6 min-w-0">
          <div className="border border-gray-200 dark:border-white/10 rounded-2xl bg-white/70 dark:bg-[#17181C]/70 p-4 sm:p-6 min-h-[calc(100vh-7rem)]">
            {children}
          </div>
        </main>
      </div>

      <NexaChatWidget />
    </div>
  );
}

export default Layout;