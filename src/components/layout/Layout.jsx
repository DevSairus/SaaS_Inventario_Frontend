import { useState } from 'react';
import Sidebar from './Sidebar';
import StockAlerts from '../common/StockAlerts';

function Layout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      <div
        className={`transition-all duration-300 ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* 🔔 Contenedor superior del contenido */}
        <div className="sticky top-0 z-30 flex justify-end px-6 pt-4">
          <StockAlerts />
        </div>

        {/* 📄 Contenido real de la página */}
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;
