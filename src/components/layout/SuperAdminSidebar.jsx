import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  LogOut,
  X,
  BarChart3,
  Shield,
  ChevronDown,
  ChevronRight,
  Package,
  CreditCard,
  TrendingUp,
  DollarSign,
  Settings,
} from 'lucide-react';
import useAuthStore from '@store/authStore';

const SuperAdminSidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [openMenus, setOpenMenus] = useState({});

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /* ---------------- ACTIVE ROUTE ---------------- */
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  /* ---------------- TOGGLE MENU ---------------- */
  const toggleMenu = (name) => {
    setOpenMenus((prev) => {
      const updated = { ...prev, [name]: !prev[name] };
      localStorage.setItem(
        'superadminSidebarOpenMenus',
        JSON.stringify(updated)
      );
      return updated;
    });
  };

  /* ---------------- NAVIGATION ---------------- */
  const navigation = [
    {
      name: 'Dashboard',
      href: '/superadmin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Tenants',
      href: '/superadmin/tenants',
      icon: Users,
    },

    // ============================================
    // 🆕 GESTIÓN DE SUSCRIPCIONES (SUPERADMIN)
    // ============================================
    {
      name: 'Suscripciones',
      icon: CreditCard,
      children: [
        {
          name: 'Planes',
          href: '/superadmin/subscription-plans',
          icon: Package,
          description: 'Gestionar planes disponibles',
        },
        {
          name: 'Suscripciones Activas',
          href: '/superadmin/subscriptions',
          icon: TrendingUp,
          description: 'Ver todas las suscripciones',
        },
        {
          name: 'Facturas',
          href: '/superadmin/subscription-invoices',
          icon: DollarSign,
          description: 'Historial de cobros',
        },
        {
          name: 'Métricas',
          href: '/superadmin/analytics',
          icon: BarChart3,
          description: 'MRR, ARR, Churn',
        },
        {
          name: 'Configurar MercadoPago',
          href: '/superadmin/mercadopago-config',
          icon: Settings,
          description: 'Credenciales de pago',
        },
      ],
    },

    {
      name: 'Analytics',
      href: '/superadmin/analytics',
      icon: BarChart3,
    },
    {
      name: 'Permisos',
      href: '/superadmin/permissions',
      icon: Shield,
    },
  ];

  /* -------- AUTO ABRIR SUBMENÚ ACTIVO -------- */
  useEffect(() => {
    const stored = JSON.parse(
      localStorage.getItem('superadminSidebarOpenMenus') || '{}'
    );
    const autoOpen = {};

    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) =>
          isActive(child.href)
        );
        if (hasActiveChild) autoOpen[item.name] = true;
      }
    });

    setOpenMenus({ ...stored, ...autoOpen });
  }, [location.pathname]);

  return (
    <>
      {/* Overlay Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 bg-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Super Admin</h1>
              <p className="text-xs text-gray-400">Panel de Control</p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-gray-300 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;

            // ============ ITEM CON HIJOS (SUBMENÚ) ============
            if (item.children) {
              const isOpenMenu = openMenus[item.name];

              return (
                <div key={item.name}>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span className="flex-1 text-left">{item.name}</span>
                    {isOpenMenu ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <div
                    className={`ml-6 overflow-hidden transition-all duration-300 ${
                      isOpenMenu ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.href}
                          to={child.href}
                          onClick={() =>
                            window.innerWidth < 1024 && toggleSidebar()
                          }
                          className={`flex items-center px-4 py-2 mt-1 text-sm rounded-lg transition-colors ${
                            isActive(child.href)
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          <ChildIcon className="w-4 h-4 mr-3" />
                          <div className="flex-1">
                            <div className="font-medium">{child.name}</div>
                            {child.description && (
                              <div className="text-xs text-gray-500">
                                {child.description}
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // ============ ITEM SIMPLE (SIN HIJOS) ============
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-gray-800">
          <div className="mb-3 px-4 py-3 bg-red-900/20 rounded-lg border border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-red-400" />
              <p className="text-sm font-medium text-white truncate">
                {user?.first_name} {user?.last_name}
              </p>
            </div>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            <div className="mt-2">
              <span className="text-xs px-2 py-1 bg-red-600 text-white rounded-full">
                Super Admin
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;
