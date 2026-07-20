import useTenantStore from '../store/tenantStore';
import { isMobileDevice } from './pwaEnv';

// Mismo criterio que usan PwaBootstrap.jsx e InstallPrompt.jsx para decidir
// si esta sesión puede instalar la PWA "Taller": mobile + módulo habilitado.
// Centralizado acá para no duplicar la condición en ambos archivos.
export function useWorkshopPwaEligible() {
  const enabledModules = useTenantStore((s) => s.enabledModules);
  if (enabledModules === null) return false; // todavía no cargó el config del tenant
  return isMobileDevice() && enabledModules.includes('workshop');
}
