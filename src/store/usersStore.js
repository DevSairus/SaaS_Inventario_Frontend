import { create } from 'zustand';
import { usersAPI } from '../api/users';

const useUsersStore = create((set, get) => ({
  users: [],
  selectedUser: null,
  pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
  isLoading: false,
  isSubmitting: false,
  error: null,

  // Obtener lista de usuarios
  fetchUsers: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await usersAPI.getAll(params);
      set({
        users: response.data?.users || [],
        pagination: {
          currentPage: response.data?.currentPage || 1,
          totalPages: response.data?.totalPages || 1,
          totalItems: response.data?.totalItems || 0,
        },
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar usuarios',
        isLoading: false,
      });
    }
  },

  // Obtener usuario por ID
  fetchUserById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await usersAPI.getById(id);
      set({ selectedUser: response, isLoading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar usuario',
        isLoading: false,
      });
    }
  },

  // Crear usuario
  createUser: async (userData) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await usersAPI.create(userData);
      set({ isSubmitting: false });
      return { success: true, data: response };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al crear usuario',
        isSubmitting: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Actualizar usuario
  updateUser: async (id, userData) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await usersAPI.update(id, userData);
      set({ isSubmitting: false });
      return { success: true, data: response };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al actualizar usuario',
        isSubmitting: false,
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Toggle estado activo/inactivo
  toggleUserStatus: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      await usersAPI.toggleStatus(id);
      await get().fetchUsers();
      set({ isSubmitting: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cambiar estado',
        isSubmitting: false,
      });
      return false;
    }
  },

  // Eliminar usuario
  deleteUser: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      await usersAPI.delete(id);
      await get().fetchUsers();
      set({ isSubmitting: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al eliminar usuario',
        isSubmitting: false,
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useUsersStore;