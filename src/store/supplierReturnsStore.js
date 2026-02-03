import { create } from 'zustand';
import { supplierReturnsApi } from '../api/supplierReturns';

const useSupplierReturnsStore = create((set, get) => ({
  returns: [],
  currentReturn: null,
  loading: false,
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
    page: 1,
    limit: 10
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
    get().fetchReturns();
  },

  fetchReturns: async () => {
    set({ loading: true, error: null });
    try {
      const response = await supplierReturnsApi.getAll(get().filters);
      set({
        returns: response.data,
        pagination: response.pagination,
        loading: false
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar devoluciones',
        loading: false
      });
    }
  },

  fetchReturnById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await supplierReturnsApi.getById(id);
      set({ currentReturn: response.data, loading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar devolución',
        loading: false
      });
    }
  },

  createReturn: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await supplierReturnsApi.create(data);
      set({ loading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al crear devolución',
        loading: false
      });
      throw error;
    }
  },

  approveReturn: async (id, notes) => {
    set({ loading: true, error: null });
    try {
      await supplierReturnsApi.approve(id, notes);
      set({ loading: false });
      get().fetchReturns();
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al aprobar devolución',
        loading: false
      });
      throw error;
    }
  },

  rejectReturn: async (id, reason) => {
    set({ loading: true, error: null });
    try {
      await supplierReturnsApi.reject(id, reason);
      set({ loading: false });
      get().fetchReturns();
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al rechazar devolución',
        loading: false
      });
      throw error;
    }
  },

  deleteReturn: async (id) => {
    set({ loading: true, error: null });
    try {
      await supplierReturnsApi.delete(id);
      set({ loading: false });
      get().fetchReturns();
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al eliminar devolución',
        loading: false
      });
      throw error;
    }
  }
}));

export default useSupplierReturnsStore;