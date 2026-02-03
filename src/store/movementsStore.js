import { create } from 'zustand';
import { movementsAPI } from '../api/movements';

export const useMovementsStore = create((set, get) => ({
  movements: [],
  kardex: null,
  stats: null,
  isLoading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 50,
    pages: 0
  },
  filters: {
    search: '',
    product_id: '',
    movement_type: '',
    movement_reason: '',
    start_date: '',
    end_date: '',
    sort_by: 'movement_date',
    sort_order: 'DESC'
  },

  // Obtener movimientos
  fetchMovements: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      const response = await movementsAPI.getAll({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });

      set({
        movements: response.data,
        pagination: response.pagination,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al obtener movimientos',
        isLoading: false
      });
    }
  },

  // Obtener kardex de un producto
  fetchKardex: async (productId, params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await movementsAPI.getKardex(productId, params);
      set({
        kardex: response.data,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al obtener kardex',
        isLoading: false
      });
    }
  },

  // Obtener estadísticas
  fetchStats: async () => {
    try {
      const response = await movementsAPI.getStats();
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

  // Limpiar kardex
  clearKardex: () => {
    set({ kardex: null });
  }
}));