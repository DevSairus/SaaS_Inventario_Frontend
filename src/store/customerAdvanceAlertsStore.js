import { create } from 'zustand';
import toast from 'react-hot-toast';
import * as advanceAlertsApi from '../api/customerAdvanceAlerts';

const useCustomerAdvanceAlertsStore = create((set, get) => ({
  // Estado
  alerts: [],
  currentAlert: null,
  aging: null,
  stats: {
    total_active: 0,
    stale: 0,
    very_stale: 0,
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
    sort_by: 'days_since_received',
    sort_order: 'DESC'
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
      sort_by: 'days_since_received',
      sort_order: 'DESC'
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

      const response = await advanceAlertsApi.getAdvanceAlerts(params);
      const res = response.data || response;
      set({
        alerts: res.data || res,
        pagination: res.pagination || response.pagination,
        loading: false
      });
    } catch (error) {
      const msg = error.response?.data?.message || 'No se pudieron cargar las alertas de anticipos.';
      toast.error(msg);
      set({ error: msg, loading: false });
    }
  },

  // Obtener alerta por ID
  fetchAlertById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await advanceAlertsApi.getAdvanceAlertById(id);
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
      const response = await advanceAlertsApi.getAdvanceAlertsStats();
      set({ stats: response.data.data || response.data });
    } catch (error) {
      // silencioso
    }
  },

  // Obtener antigüedad de saldos (buckets 0-30/31-60/61-90/90+)
  fetchAging: async () => {
    try {
      const response = await advanceAlertsApi.getAdvancesAging();
      set({ aging: response });
      return response;
    } catch (error) {
      const msg = error.response?.data?.message || 'No se pudo cargar la antigüedad de saldos.';
      toast.error(msg);
    }
  },

  // Verificar alertas manualmente
  checkAlerts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await advanceAlertsApi.checkAdvanceAlerts();
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
      await advanceAlertsApi.resolveAdvanceAlert(id, { resolution_notes: notes });
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
      await advanceAlertsApi.ignoreAdvanceAlert(id, { resolution_notes: notes });
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
      await advanceAlertsApi.reactivateAdvanceAlert(id);
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
  }
}));

export default useCustomerAdvanceAlertsStore;
