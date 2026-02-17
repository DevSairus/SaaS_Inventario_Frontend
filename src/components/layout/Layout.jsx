import { useState } from 'react';
import Sidebar from './Sidebar';
import StockAlerts from '../common/StockAlerts';
import { Bars3Icon } from '@heroicons/react/24/outline';
import useAuthStore from '../../store/authStore';

function Layout({ children }) {
  const [isCollapsed, setIsCollapsed]           = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Columna derecha */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Topbar móvil — solo visible en pantallas < lg */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b border-gray-200 px-4 h-14 shadow-sm flex-shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Abrir menú"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          <span className="font-semibold text-gray-800 text-sm truncate px-2">
            {user?.company_name || 'Panel'}
          </span>

          <div className="flex items-center">
            <StockAlerts />
          </div>
        </header>

        {/* Barra desktop con alertas */}
        <div className="hidden lg:flex sticky top-0 z-30 justify-end bg-gray-50 px-6 pt-4 pb-1 flex-shrink-0">
          <StockAlerts />
        </div>

        {/* Contenido principal */}
        <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;