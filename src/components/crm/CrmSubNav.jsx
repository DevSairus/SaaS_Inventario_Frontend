// frontend/src/components/crm/CrmSubNav.jsx
//
// Sub-navegación compartida entre las páginas del módulo CRM (Fase A).
// Antes cada página vivía suelta bajo /crm/*; esto le da al usuario la
// sensación de estar en un módulo, no en pantallas aisladas, y deja un
// lugar natural para las notificaciones (badges) que hoy no existen.
import { NavLink } from 'react-router-dom';
import { Target, ListTodo, BarChart3, Settings } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const ITEMS = [
  { to: '/crm/pipeline', label: 'Pipeline', icon: Target, key: 'pipeline' },
  { to: '/crm/followups', label: 'Seguimientos', icon: ListTodo, key: 'followups' },
  { to: '/crm/dashboard', label: 'Dashboard', icon: BarChart3, key: 'dashboard' },
  // Solo quien puede administrar etapas/plantillas (Fase B.3/B.4) ve este item.
  { to: '/crm/settings', label: 'Configuración', icon: Settings, key: 'settings', roles: ['admin', 'manager', 'super_admin'] },
];

/**
 * @param {Object} badges - conteos opcionales por key (ej. { followups: 3 })
 *   Cada página los calcula con datos que ya tiene cargados — no dispara
 *   llamadas nuevas a la API solo para pintar el badge.
 */
export default function CrmSubNav({ badges = {} }) {
  const { user } = useAuthStore();
  const items = ITEMS.filter(item => !item.roles || item.roles.includes(user?.role));

  return (
    <nav className="flex items-center gap-1 p-1 bg-white border border-gray-100 shadow-sm rounded-xl w-fit overflow-x-auto max-w-full dark:bg-graphite dark:border-white/10">
      {items.map(({ to, label, icon: Icon, key }) => (
        <NavLink
          key={key}
          to={to}
          className={({ isActive }) =>
            `relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 ${
              isActive
                ? 'bg-gradient-to-br from-accent to-accent-soft text-white shadow-sm shadow-accent/30'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-white/5'
            }`
          }
        >
          <Icon size={15} />
          {label}
          {badges[key] > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-graphite">
              {badges[key]}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
