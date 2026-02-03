import { create } from 'zustand';
import { purchasesAPI } from '../api/purchases';

export const usePurchasesStore = create((set, get) => ({
  purchases: [],
  purchase: null,
  stats: null,
  isLoading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  },
  filters: {
    search: '',
    supplier_id: '',
    status: '',
    start_date: '',
    end_date: '',
    sort_by: 'purchase_date',
    sort_order: 'DESC'
  },

  // Obtener compras
  fetchPurchases: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      const response = await purchasesAPI.getAll({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });

      set({
        purchases: response.data,
        pagination: response.pagination,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al obtener compras',
        isLoading: false
      });
    }
  },

  // Obtener una compra por ID (para cargar en formulario de edición)
  getPurchaseById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await purchasesAPI.getById(id);
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al obtener compra',
        isLoading: false
      });
      throw error;
    }
  },

  // Obtener una compra por ID (para vista de detalle)
  fetchPurchaseById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await purchasesAPI.getById(id);
      set({
        purchase: response.data,
        isLoading: false
      });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al obtener compra',
        isLoading: false
      });
      return null;
    }
  },

  // Crear compra
  createPurchase: async (purchaseData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await purchasesAPI.create(purchaseData);
      await get().fetchPurchases();
      await get().fetchStats();
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al crear compra',
        isLoading: false
      });
      throw error;
    }
  },

  // Actualizar compra
  updatePurchase: async (id, purchaseData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await purchasesAPI.update(id, purchaseData);
      await get().fetchPurchases();
      await get().fetchStats();
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al actualizar compra',
        isLoading: false
      });
      throw error;
    }
  },

  // Confirmar compra
  confirmPurchase: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await purchasesAPI.confirm(id);
      await get().fetchPurchaseById(id);
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al confirmar compra',
        isLoading: false
      });
      return false;
    }
  },

  // Recibir compra (actualiza stock)
  receivePurchase: async (id, receivedItems) => {
    set({ isLoading: true, error: null });
    try {
      await purchasesAPI.receive(id, receivedItems);
      await get().fetchPurchaseById(id);
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al recibir compra',
        isLoading: false
      });
      return false;
    }
  },

  // Cancelar compra
  cancelPurchase: async (id, cancellation_reason) => {
    set({ isLoading: true, error: null });
    try {
      await purchasesAPI.cancel(id, cancellation_reason);
      await get().fetchPurchaseById(id);
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cancelar compra',
        isLoading: false
      });
      return false;
    }
  },

  // Eliminar compra
  deletePurchase: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await purchasesAPI.delete(id);
      await get().fetchPurchases();
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al eliminar compra',
        isLoading: false
      });
      return false;
    }
  },

  // Obtener estadísticas
  fetchStats: async () => {
    try {
      const response = await purchasesAPI.getStats();
      set({ stats: response.data });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
    }
  },

  // Actualizar filtros
  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  // Cambiar página
  setPage: (page) => {
    set({ pagination: { ...get().pagination, page } });
  },

  // Limpiar errores
  clearError: () => {
    set({ error: null });
  },

  // Limpiar compra seleccionada
  clearPurchase: () => {
    set({ purchase: null });
  }
}));