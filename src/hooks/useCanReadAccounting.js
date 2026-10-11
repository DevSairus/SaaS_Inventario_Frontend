// frontend/src/hooks/useCanReadAccounting.js
import useAuthStore from '../store/authStore';
import useTenantStore from '../store/tenantStore';

// Mismo criterio que server.js para /api/accounting: requireModule('accounting')
// + checkRole(admin, super_admin, manager, accountant). Sirve para que pantallas
// fuera de Contabilidad (Ajustes, Proveedores) no pidan el plan de cuentas y
// reciban un 403 cuando el tenant no tiene el módulo o el rol no tiene acceso.
const ACCOUNTING_ROLES = ['admin', 'super_admin', 'manager', 'accountant'];

export default function useCanReadAccounting() {
  const role = useAuthStore((s) => s.user?.role);
  const enabledModules = useTenantStore((s) => s.enabledModules);
  return ACCOUNTING_ROLES.includes(role) && !!enabledModules?.includes('accounting');
}
