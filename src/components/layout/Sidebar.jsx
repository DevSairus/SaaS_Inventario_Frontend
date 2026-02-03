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
} from '@heroicons/react/24/outline';

import { PackageX, Truck, ClipboardList } from 'lucide-react';

function Sidebar({ isCollapsed, setIsCollapsed }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [expandedMenus, setExpandedMenus] = useState({
    sales: false,
    inventory: false,
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // 🔹 AUTOCOLAPSE AL CAMBIAR DE RUTA
  useEffect(() => {
    setExpandedMenus({
      sales: false,
      inventory: false,
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

    // 🔹 AUTOCOLAPSE AL NAVEGAR
    setExpandedMenus({
      sales: false,
      inventory: false,
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
      route: '/settings',
      available: true,
      icon: Cog6ToothIcon,
    },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-lg shadow"
      >
        ☰
      </button>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-screen flex flex-col
          bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white
          transition-all duration-300
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {!isCollapsed && (
            <div>
              <h2 className="font-bold text-lg">Inventario</h2>
              <p className="text-xs text-gray-400">v1.0.0</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block"
          >
            ⇔
          </button>
        </div>

        {/* User */}
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          {!isCollapsed && (
            <div>
              <p className="text-sm font-semibold">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;

            if (item.children) {
              return (
                <div key={item.id}>
                  <button
                    onClick={() => toggleMenu(item.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-700"
                  >
                    <Icon className="w-6 h-6" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.title}</span>
                        {expandedMenus[item.id]
                          ? <ChevronDownIcon className="w-4 h-4" />
                          : <ChevronRightIcon className="w-4 h-4" />}
                      </>
                    )}
                  </button>

                  {expandedMenus[item.id] && !isCollapsed && (
                    <div className="ml-6 space-y-1">
                      {item.children.map(child => {
                        const ChildIcon = child.icon;
                        return (
                          <button
                            key={child.id}
                            disabled={!child.available}
                            onClick={() => handleNavigate(child.route, child.available)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                              ${child.available
                                ? isActive(child.route)
                                  ? 'bg-blue-600'
                                  : 'hover:bg-gray-700'
                                : 'opacity-50 cursor-not-allowed'}
                            `}
                          >
                            <ChildIcon className="w-5 h-5" />
                            <span>{child.title}</span>
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
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg
                  ${isActive(item.route)
                    ? 'bg-blue-600'
                    : 'hover:bg-gray-700'}
                  ${!item.available ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <Icon className="w-6 h-6" />
                {!isCollapsed && <span>{item.title}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 bg-red-500 hover:bg-red-600 px-3 py-3 rounded-lg"
          >
            <ArrowRightOnRectangleIcon className="w-6 h-6" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
