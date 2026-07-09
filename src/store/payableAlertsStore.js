import { create } from 'zustand';
import toast from 'react-hot-toast';
import * as payableAlertsApi from '../api/payableAlerts';

const usePayableAlertsStore = create((set, get) => ({
  // Estado
  alerts: [],
  currentAlert: null,
  stats: {
    total_active: 0,
    overdue: 0,
    due_soon: 0,
    total_balance_active: 0,
    by_severity: {
      info: 0,
      warning: 0,
      critical: 0
    }
  },
  pagination: {
    total: 0,
    page: 1,
    limit: 500,
    pages: 0
  },
  filters: {
    alert_type: '',
    severity: '',
    status: 'active',
    sort_by: 'days_to_due',
    sort_order: 'ASC'
  },
  loading: false,
  error: null,

  // Acciones
  setFilters: async (newFilters) => {
    set({ filters: { ...get().filters, ...newFilters } });
    await get().fetchAlerts();
  },

  setPage: async (page) => {
    set({ pagination: { ...get().pagination, page } });
    await get().fetchAlerts();
  },

  resetFilters: () => set({
    filters: {
      alert_type: '',
      severity: '',
      status: 'active',
      sort_by: 'days_to_due',
      sort_order: 'ASC'
    }
  }),

  // Obtener alertas con filtros
  fetchAlerts: async () => {
    set({ loading: true, error: null });
    try {
      const { filters, pagination } = get();
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };

      const response = await payableAlertsApi.getPayableAlerts(params);
      const res = response.data || response;
      set({
        alerts: res.data || res,
        pagination: res.pagination || response.pagination,
        loading: false
      });
    } catch (error) {
      const msg = error.response?.data?.message || 'No se pudieron cargar las alertas de cuentas por pagar.';
      toast.error(msg);
      set({ error: msg, loading: false });
    }
  },

  // Obtener alerta por ID
  fetchAlertById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await payableAlertsApi.getPayableAlertById(id);
      set({ currentAlert: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar alerta',
        loading: false
      });
      throw error;
    }
  },

  // Obtener estadísticas
  fetchStats: async () => {
    try {
      const response = await payableAlertsApi.getPayableAlertsStats();
      set({ stats: response.data.data || response.data });
    } catch (error) {
      // silencioso
    }
  },

  // Verificar alertas manualmente
  checkAlerts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await payableAlertsApi.checkPayableAlerts();
      await get().fetchAlerts();
      await get().fetchStats();
      set({ loading: false });
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || 'No se pudieron verificar las alertas.';
      toast.error(errMsg);
      set({ error: errMsg, loading: false });
      throw error;
    }
  },

  // Resolver alerta
  resolveAlert: async (id, notes = '') => {
    set({ loading: true, error: null });
    try {
      await payableAlertsApi.resolvePayableAlert(id, { resolution_notes: notes });
      await get().fetchAlerts();
      await get().fetchStats();
      set({ loading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al resolver alerta',
        loading: false
      });
      throw error;
    }
  },

  // Ignorar alerta
  ignoreAlert: async (id, notes = '') => {
    set({ loading: true, error: null });
    try {
      await payableAlertsApi.ignorePayableAlert(id, { resolution_notes: notes });
      await get().fetchAlerts();
      await get().fetchStats();
      set({ loading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al ignorar alerta',
        loading: false
      });
      throw error;
    }
  },

  // Reactivar alerta
  reactivateAlert: async (id) => {
    set({ loading: true, error: null });
    try {
      await payableAlertsApi.reactivatePayableAlert(id);
      await get().fetchAlerts();
      await get().fetchStats();
      set({ loading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al reactivar alerta',
        loading: false
      });
      throw error;
    }
  },

  // Eliminar alerta
  deleteAlert: async (id) => {
    set({ loading: true, error: null });
    try {
      await payableAlertsApi.deletePayableAlert(id);
      await get().fetchAlerts();
      await get().fetchStats();
      set({ loading: false });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al eliminar alerta',
        loading: false
      });
      throw error;
    }
  }
}));

export default usePayableAlertsStore;
