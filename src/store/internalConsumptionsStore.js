import { create } from 'zustand';
import { internalConsumptionsApi } from '../api/internalConsumptions';

const useInternalConsumptionsStore = create((set, get) => ({
  consumptions: [],
  currentConsumption: null,
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
    warehouse_id: '',
    department: '',
    status: '',
    start_date: '',
    end_date: '',
    page: 1,
    limit: 10
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
    get().fetchConsumptions();
  },

  fetchConsumptions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await internalConsumptionsApi.getAll(get().filters);
      set({
        consumptions: response.data,
        pagination: response.pagination,
        loading: false
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar consumos',
        loading: false
      });
    }
  },

  fetchConsumptionById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await internalConsumptionsApi.getById(id);
      set({ currentConsumption: response.data, loading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar consumo',
        loading: false
      });
    }
  },

  createConsumption: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await internalConsumptionsApi.create(data);
      set({ loading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al crear consumo',
        loading: false
      });
      throw error;
    }
  },

  approveConsumption: async (id) => {
    set({ loading: true, error: null });
    try {
      await internalConsumptionsApi.approve(id);
      set({ loading: false });
      get().fetchConsumptions();
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al aprobar consumo',
        loading: false
      });
      throw error;
    }
  },

  rejectConsumption: async (id, reason) => {
    set({ loading: true, error: null });
    try {
      await internalConsumptionsApi.reject(id, reason);
      set({ loading: false });
      get().fetchConsumptions();
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al rechazar consumo',
        loading: false
      });
      throw error;
    }
  },

  deleteConsumption: async (id) => {
    set({ loading: true, error: null });
    try {
      await internalConsumptionsApi.delete(id);
      set({ loading: false });
      get().fetchConsumptions();
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al eliminar consumo',
        loading: false
      });
      throw error;
    }
  }
}));

export default useInternalConsumptionsStore;