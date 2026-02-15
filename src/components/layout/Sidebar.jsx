import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

import {
  HomeIcon,
  CubeIcon,
  Squares2X2Icon,
  TruckIcon,
  ShoppingCartIcon,
  AdjustmentsHorizontalIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  UsersIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import { PackageX, Truck, ClipboardList } from 'lucide-react';

function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const [expandedMenus, setExpandedMenus] = useState({
    sales: false,
    inventory: false,
    settings: false,
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // 🔹 CERRAR MENÚ MÓVIL AL CAMBIAR DE RUTA
  useEffect(() => {
    setIsMobileOpen(false);
    setExpandedMenus({
      sales: false,
      inventory: false,
      settings: false,
    });
  }, [location.pathname]);

  // 🔹 SOLO UN MENÚ ABIERTO A LA VEZ
  const toggleMenu = (key) => {
    setExpandedMenus(prev => {
      const updated = {};
      Object.keys(prev).forEach(k => {
        updated[k] = k === key ? !prev[k] : false;
      });
      return updated;
    });
  };

  const isActive = (route) => location.pathname === route;

  const handleNavigate = (route, available) => {
    if (!available) return;
    navigate(route);
    setIsMobileOpen(false);

    setExpandedMenus({
      sales: false,
      inventory: false,
      settings: false,
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

    const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      route: '/dashboard',
      available: true,
      icon: HomeIcon,
    },
    {
      id: 'sales',
      title: 'Ventas',
      icon: CurrencyDollarIcon,
      children: [
        {
          id: 'sales-new',
          title: 'Nueva Venta',
          route: '/sales/new',
          available: true,
          icon: DocumentTextIcon
        },
        {
          id: 'sales-list',
          title: 'Remisiones',
          route: '/sales',
          available: true,
          icon: DocumentTextIcon
        },
        {
          id: 'customer-returns',
          title: 'Devoluciones',
          route: '/sales/customer-returns',
          available: true,
          icon: PackageX,          
        },
        {
          id: 'customers',
          title: 'Clientes',
          route: '/customers',
          available: true,
          icon: UsersIcon
        },
      ],
    },
    {
      id: 'inventory',
      title: 'Inventario',
      icon: CubeIcon,
      children: [
        { id: 'products', title: 'Productos', route: '/products', available: true, icon: CubeIcon },
        { id: 'categories', title: 'Categorías', route: '/categories', available: true, icon: Squares2X2Icon },
        { id: 'movements', title: 'Movimientos', route: '/movements', available: true, icon: ArrowsRightLeftIcon },
        { id: 'adjustments', title: 'Ajustes', route: '/adjustments', available: true, icon: AdjustmentsHorizontalIcon },
        {id:'transferencias',  title: 'Transferencias', route: '/inventory/transfers', available: true, icon: Truck},
        {id: 'internal-consumptions',  title: 'Consumos Internos', route: '/inventory/internal-consumptions', available: true, icon: ClipboardList}
      ],
    },
    {
      id: 'purchases',
      title: 'Compras',
      route: '/purchases',
      available: true,
      icon: ShoppingCartIcon,
    },
    {
      id: 'suppliers',
      title: 'Proveedores',
      route: '/suppliers',
      available: true,
      icon: TruckIcon,
    },
    {
      id: 'stock-alerts',
      title: 'Alertas Stock',
      route: '/stock-alerts',
      available: true,
      icon: ExclamationTriangleIcon,
    },
    {
      id: 'warehouses',
      title: 'Bodegas',
      route: '/warehouses',
      available: true,
      icon: BuildingStorefrontIcon,
    },
    {
      id: 'reports',
      title: 'Reportes',
      route: '/reports',
      available: true,
      icon: ChartBarIcon,
    },
    {
      id: 'settings',
      title: 'Configuración',
      icon: Cog6ToothIcon,
      children: [
        {
          id: 'general-settings',
          title: 'Configuración General',
          route: '/settings',
          available: true,
          icon: Cog6ToothIcon,
        },
        {
          id: 'users-management',
          title: 'Gestión de Usuarios',
          route: '/users',
          available: true,
          icon: UsersIcon,
        },
      ],
    },
  ];

  return (
    <>
      {/* 📱 OVERLAY PARA MÓVIL */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 🎯 SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-50
          bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900
          text-white
          transition-all duration-300
          flex flex-col
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${isMobileOpen 
            ? 'translate-x-0 w-64' 
            : '-translate-x-full lg:translate-x-0'
          }
        `}
      >
        {/* ❌ BOTÓN CERRAR MÓVIL */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-white hover:text-gray-300"
          aria-label="Cerrar menú"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* 📱 HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {!isCollapsed && (
            <div className="pr-8">
              <h2 className="font-bold text-base md:text-lg">Control de Inventario</h2>
              <p className="text-xs text-gray-400">v1.0.0</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block hover:bg-gray-700 p-2 rounded"
            aria-label="Toggle sidebar"
          >
            ⇔
          </button>
        </div>

        {/* 👤 USER INFO */}
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          )}
        </div>

        {/* 🧭 NAVEGACIÓN */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;

            if (item.children) {
              return (
                <div key={item.id}>
                  <button
                    onClick={() => toggleMenu(item.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Icon className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left text-sm md:text-base">{item.title}</span>
                        {expandedMenus[item.id]
                          ? <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
                          : <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />}
                      </>
                    )}
                  </button>

                  {expandedMenus[item.id] && !isCollapsed && (
                    <div className="ml-6 space-y-1 mt-1">
                      {item.children.map(child => {
                        const ChildIcon = child.icon;
                        return (
                          <button
                            key={child.id}
                            disabled={!child.available}
                            onClick={() => handleNavigate(child.route, child.available)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                              ${child.available
                                ? isActive(child.route)
                                  ? 'bg-blue-600'
                                  : 'hover:bg-gray-700'
                                : 'opacity-50 cursor-not-allowed'}
                            `}
                          >
                            <ChildIcon className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                            <span className="truncate">{child.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                disabled={!item.available}
                onClick={() => handleNavigate(item.route, item.available)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
                  ${isActive(item.route)
                    ? 'bg-blue-600'
                    : 'hover:bg-gray-700'}
                  ${!item.available ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <Icon className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                {!isCollapsed && <span className="text-sm md:text-base truncate">{item.title}</span>}
              </button>
            );
          })}
        </nav>

        {/* 🚪 LOGOUT */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 bg-red-500 hover:bg-red-600 px-3 py-3 rounded-lg transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm md:text-base">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;