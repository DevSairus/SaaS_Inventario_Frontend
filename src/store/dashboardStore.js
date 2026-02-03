// frontend/src/store/dashboardStore.js
import { create } from 'zustand';
import { dashboardAPI } from '../api/dashboard';

const useDashboardStore = create((set, get) => ({
  // Estado
  loading: false,
  error: null,
  period: 30,
  kpis: null,
  charts: null,
  alerts: [],

  // Acciones
  setPeriod: (period) => {
    set({ period });
    get().fetchKPIs(period);
  },

  fetchKPIs: async (period = 30) => {
    set({ loading: true, error: null });
    try {
      const data = await dashboardAPI.getKPIs(period);
      set({
        kpis: data.kpis,
        charts: data.charts,
        period: data.period,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      set({
        error: error.message || 'Error al cargar KPIs',
        loading: false
      });
    }
  },

  fetchAlerts: async () => {
    try {
      const alerts = await dashboardAPI.getAlerts();
      set({ alerts });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      set({ alerts: [] });
    }
  },

  fetchAll: async (period = 30) => {
    await Promise.all([
      get().fetchKPIs(period),
      get().fetchAlerts()
    ]);
  },

  reset: () => {
    set({
      loading: false,
      error: null,
      period: 30,
      kpis: null,
      charts: null,
      alerts: []
    });
  }
}));

export default useDashboardStore;