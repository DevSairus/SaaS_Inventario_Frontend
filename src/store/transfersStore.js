import { create } from 'zustand';
import { transfersApi } from '../api/transfers';

const useTransfersStore = create((set, get) => ({
  transfers: [],
  currentTransfer: null,
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
    from_warehouse_id: '',
    to_warehouse_id: '',
    status: '',
    start_date: '',
    end_date: '',
    page: 1,
    limit: 10
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
    get().fetchTransfers();
  },

  fetchTransfers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await transfersApi.getAll(get().filters);
      set({
        transfers: response.data,
        pagination: response.pagination,
        loading: false
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar transferencias',
        loading: false
      });
    }
  },

  fetchTransferById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await transfersApi.getById(id);
      set({ currentTransfer: response.data, loading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar transferencia',
        loading: false
      });
    }
  },

  createTransfer: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await transfersApi.create(data);
      set({ loading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al crear transferencia',
        loading: false
      });
      throw error;
    }
  },

  sendTransfer: async (id, notes) => {
    set({ loading: true, error: null });
    try {
      await transfersApi.send(id, notes);
      set({ loading: false });
      get().fetchTransfers();
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al enviar transferencia',
        loading: false
      });
      throw error;
    }
  },

  receiveTransfer: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await transfersApi.receive(id, data);
      set({ loading: false });
      get().fetchTransfers();
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al recibir transferencia',
        loading: false
      });
      throw error;
    }
  },

  cancelTransfer: async (id, notes) => {
    set({ loading: true, error: null });
    try {
      await transfersApi.cancel(id, notes);
      set({ loading: false });
      get().fetchTransfers();
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cancelar transferencia',
        loading: false
      });
      throw error;
    }
  },

  deleteTransfer: async (id) => {
    set({ loading: true, error: null });
    try {
      await transfersApi.delete(id);
      set({ loading: false });
      get().fetchTransfers();
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al eliminar transferencia',
        loading: false
      });
      throw error;
    }
  }
}));

export default useTransfersStore;