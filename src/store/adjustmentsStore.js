import { create } from 'zustand';
import { adjustmentsAPI } from '../api/adjustments';

export const useAdjustmentsStore = create((set, get) => ({
  adjustments: [],
  adjustment: null,
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
    adjustment_type: '',
    reason: '',
    status: '',
    start_date: '',
    end_date: '',
    sort_by: 'adjustment_date',
    sort_order: 'DESC'
  },

  // Obtener ajustes
  fetchAdjustments: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      const response = await adjustmentsAPI.getAll({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });

      set({
        adjustments: response.data,
        pagination: response.pagination,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al obtener ajustes',
        isLoading: false
      });
    }
  },

  // Obtener un ajuste por ID (para cargar en formulario de edición)
  getAdjustmentById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await adjustmentsAPI.getById(id);
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al obtener ajuste',
        isLoading: false
      });
      throw error;
    }
  },

  // Obtener un ajuste por ID (para vista de detalle)
  fetchAdjustmentById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await adjustmentsAPI.getById(id);
      set({
        adjustment: response.data,
        isLoading: false
      });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al obtener ajuste',
        isLoading: false
      });
      return null;
    }
  },

  // Crear ajuste
  createAdjustment: async (adjustmentData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await adjustmentsAPI.create(adjustmentData);
      await get().fetchAdjustments();
      await get().fetchStats();
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al crear ajuste',
        isLoading: false
      });
      throw error;
    }
  },

  // Actualizar ajuste
  updateAdjustment: async (id, adjustmentData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await adjustmentsAPI.update(id, adjustmentData);
      await get().fetchAdjustments();
      await get().fetchStats();
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al actualizar ajuste',
        isLoading: false
      });
      throw error;
    }
  },

  // Confirmar ajuste
  confirmAdjustment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await adjustmentsAPI.confirm(id);
      await get().fetchAdjustmentById(id);
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al confirmar ajuste',
        isLoading: false
      });
      return false;
    }
  },

  // Cancelar ajuste
  cancelAdjustment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await adjustmentsAPI.cancel(id);
      await get().fetchAdjustmentById(id);
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cancelar ajuste',
        isLoading: false
      });
      return false;
    }
  },

  // Eliminar ajuste
  deleteAdjustment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await adjustmentsAPI.delete(id);
      await get().fetchAdjustments();
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al eliminar ajuste',
        isLoading: false
      });
      return false;
    }
  },

  // Obtener estadísticas
  fetchStats: async () => {
    try {
      const response = await adjustmentsAPI.getStats();
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

  // Limpiar ajuste seleccionado
  clearAdjustment: () => {
    set({ adjustment: null });
  }
}));