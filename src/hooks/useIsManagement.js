// frontend/src/hooks/useIsManagement.js
import useAuthStore from '../store/authStore';

// Roles de gestión: los mismos que exige checkRole('admin', 'manager',
// 'accountant') en el backend para aprobar, anular, devolver, resolver alertas,
// etc. Sirve para no mostrar botones que al usuario le darían 403.
export const MANAGEMENT_ROLES = ['admin', 'manager', 'accountant'];

export default function useIsManagement() {
  const role = useAuthStore((s) => s.user?.role);
  return MANAGEMENT_ROLES.includes(role);
}
