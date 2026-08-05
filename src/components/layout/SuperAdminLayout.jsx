import React from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import SuperAdminSidebar from './SuperAdminSidebar';
import { useTicketNotifications } from '../../hooks/useTicketNotifications';

const SuperAdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  useTicketNotifications();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-ink">
      <SuperAdminSidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm dark:bg-graphite">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Mobile Menu Button */}
              <button
                onClick={toggleSidebar}
                className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Title */}
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                Panel de Super Administrador
              </h2>

              {/* User Info */}
              <div className="hidden sm:block">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-ink">
          <div className="container mx-auto px-4 sm:px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;