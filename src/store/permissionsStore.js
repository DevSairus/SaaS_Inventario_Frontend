import { create } from 'zustand';
import { superAdminAPI } from '../api/superadmin';

const usePermissionsStore = create((set) => ({
  // State
  roleData: null,
  isLoading: false,
  isSubmitting: false,
  error: null,

  // Obtener permisos de un rol
  fetchRolePermissions: async (role) => {
    set({ isLoading: true, error: null });
    try {
      const response = await superAdminAPI.getRolePermissions(role);
      set({ roleData: response, isLoading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar permisos',
        isLoading: false
      });
    }
  },

  // Actualizar permisos de un rol
  updateRolePermissions: async (role, permissionIds) => {
    set({ isSubmitting: true, error: null });
    try {
      await superAdminAPI.updateRolePermissions(role, permissionIds);
      // Refrescar datos del rol
      const response = await superAdminAPI.getRolePermissions(role);
      set({ roleData: response, isSubmitting: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al actualizar permisos',
        isSubmitting: false
      });
      return false;
    }
  },

  clearError: () => set({ error: null })
}));

export default usePermissionsStore;