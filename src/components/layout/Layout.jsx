import { useState } from 'react';
import Sidebar from './Sidebar';
import StockAlerts from '../common/StockAlerts';
import { Bars3Icon } from '@heroicons/react/24/outline';

function Layout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* 📱 BOTÓN HAMBURGUESA MÓVIL */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 bg-gray-800 text-white p-3 rounded-lg shadow-lg hover:bg-gray-700"
        aria-label="Abrir menú"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {/* 🎯 SIDEBAR */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* 📄 CONTENIDO PRINCIPAL */}
      <div
        className={`transition-all duration-300 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* 🔔 Alertas de stock (solo desktop) */}
        <div className="hidden md:flex sticky top-0 z-30 justify-end px-4 md:px-6 pt-4">
          <StockAlerts />
        </div>

        {/* 📄 Contenido de la página */}
        <div className="px-4 md:px-6 pb-6 pt-16 lg:pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;