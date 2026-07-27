import { create } from 'zustand';
import toast from 'react-hot-toast';
import { equivalencesAPI } from '../api/equivalences';

const useEquivalencesStore = create((set, get) => ({
  groups: [],
  searchResults: [],
  isLoading: false,
  isSearching: false,
  error: null,

  // Cargar equivalencias de un producto
  fetchEquivalences: async (productId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await equivalencesAPI.getByProductId(productId);
      if (response && response.success) {
        set({ groups: response.data || [], isLoading: false });
      } else {
        set({ groups: [], isLoading: false });
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al cargar equivalencias';
      set({ error: msg, isLoading: false, groups: [] });
    }
  },

  // Agregar producto a un grupo (existente o nuevo)
  // Devuelve el `data` de la respuesta del backend (incluye group_id) en éxito,
  // o null en error — antes solo devolvía true/false y obligaba a quien
  // llamaba a adivinar el group_id refetcheando y buscando por nombre.
  addToGroup: async (productId, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await equivalencesAPI.addToGroup(productId, data);
      if (response && response.success) {
        toast.success(response.message || 'Producto agregado al grupo');
        await get().fetchEquivalences(productId);
        set({ isLoading: false });
        return response.data || true;
      }
      set({ isLoading: false });
      return null;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al agregar al grupo';
      toast.error(msg);
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  // Remover producto de un grupo
  removeFromGroup: async (productId, groupId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await equivalencesAPI.removeFromGroup(productId, groupId);
      if (response && response.success) {
        toast.success(response.message || 'Producto removido del grupo');
        await get().fetchEquivalences(productId);
        set({ isLoading: false });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al remover del grupo';
      toast.error(msg);
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  // Actualizar rol/notas de un miembro
  updateMember: async (productId, groupId, memberId, data) => {
    try {
      const response = await equivalencesAPI.updateMember(productId, groupId, memberId, data);
      if (response && response.success) {
        toast.success('Miembro actualizado');
        await get().fetchEquivalences(productId);
        return true;
      }
      return false;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al actualizar miembro';
      toast.error(msg);
      return false;
    }
  },

  // Buscar grupos existentes
  searchGroups: async (search) => {
    if (!search || search.trim().length < 2) {
      set({ searchResults: [] });
      return;
    }
    set({ isSearching: true });
    try {
      const response = await equivalencesAPI.searchGroups(search.trim());
      if (response && response.success) {
        set({ searchResults: response.data || [], isSearching: false });
      } else {
        set({ searchResults: [], isSearching: false });
      }
    } catch (error) {
      set({ searchResults: [], isSearching: false });
    }
  },

  clearSearchResults: () => set({ searchResults: [] }),
  clearError: () => set({ error: null })
}));

export default useEquivalencesStore;