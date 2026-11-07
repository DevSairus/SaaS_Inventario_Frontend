// frontend/src/store/tenantPermissionsStore.js
// Permisos efectivos del usuario en su empresa (GET /role-permissions/me),
// para mostrar u ocultar acciones. El backend valida igual: esto es solo UI.
// Ver backend/src/config/permissions.catalog.js.
import { create } from 'zustand';
import { useEffect } from 'react';
import axios from '../api/axios';
import useAuthStore from './authStore';

const useTenantPermissionsStore = create((set, get) => ({
  keys: null,       // null = sin cargar
  loadedFor: null,  // `${user.id}:${role}` del usuario cargado
  loading: false,

  load: async (user, { force = false } = {}) => {
    const who = user ? `${user.id}:${user.role}` : null;
    if (!who) { set({ keys: null, loadedFor: null }); return; }
    if (!force && (get().loadedFor === who || get().loading)) return;
    set({ loading: true });
    try {
      const res = await axios.get('/role-permissions/me');
      set({ keys: res.data?.data?.permissions || [], loadedFor: who, loading: false });
    } catch {
      set({ keys: [], loadedFor: who, loading: false });
    }
  },
}));

/**
 * const can = usePermissions(); can('inventory.transfers.close')
 * Mientras carga devuelve false (las acciones aparecen al llegar los permisos).
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const keys = useTenantPermissionsStore((s) => s.keys);
  const load = useTenantPermissionsStore((s) => s.load);
  useEffect(() => { load(user); }, [user, load]);
  return (key) => user?.role === 'super_admin' || Boolean(keys?.includes(key));
}

export const reloadPermissions = () => useTenantPermissionsStore.getState().load(useAuthStore.getState().user, { force: true });

export default useTenantPermissionsStore;
