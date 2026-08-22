import useTenantStore from '../store/tenantStore';
import useAuthStore from '../store/authStore';
import { isMobileDevice } from './pwaEnv';

// Mismo criterio que usan PwaBootstrap.jsx e InstallPrompt.jsx para decidir
// si esta sesión puede instalar la PWA: mobile + módulo "workshop" habilitado.
// Centralizado acá para no duplicar la condición en ambos archivos.
export function useWorkshopPwaEligible() {
  const enabledModules = useTenantStore((s) => s.enabledModules);
  if (enabledModules === null) return false; // todavía no cargó el config del tenant
  return isMobileDevice() && enabledModules.includes('workshop');
}

// El técnico queda limitado a la PWA "Taller" (scope /workshop/, como hoy);
// cualquier otro rol (admin, manager, seller, accountant, super_admin)
// recibe la app completa sin restricción (scope "/") -- ver PwaBootstrap.jsx
// para cómo esto cambia el manifest y el scope del Service Worker registrado.
export function useIsFullPwaAccess() {
  const user = useAuthStore((s) => s.user);
  return user?.role !== 'technician';
}
