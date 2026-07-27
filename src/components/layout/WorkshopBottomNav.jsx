import { NavLink } from 'react-router-dom';
import { ClipboardList, Car } from 'lucide-react';

const ITEMS = [
  { label: 'Órdenes', to: '/workshop/work-orders', icon: ClipboardList },
  { label: 'Vehículos', to: '/workshop/vehicles', icon: Car },
];

// Navegación de 2 ítems para la PWA "Taller" instalada — reemplaza al Sidebar
// completo de escritorio (ver Layout.jsx) para que el técnico solo vea lo
// necesario para gestionar órdenes de trabajo desde el celular.
// (Se quitó "Escanear": ya no se usa. La ruta /workshop/scan y ScannerPage
// siguen existiendo por si se necesita reactivar, solo dejaron de ser
// accesibles desde este menú.)
function WorkshopBottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium ${
              isActive ? 'text-primary-600' : 'text-gray-500'
            }`
          }
        >
          <Icon className="w-5 h-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default WorkshopBottomNav;