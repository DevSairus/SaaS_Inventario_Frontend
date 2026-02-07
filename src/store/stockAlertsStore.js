import { create } from 'zustand';
import * as stockAlertsApi from '../api/stockAlerts';

const useStockAlertsStore = create((set, get) => ({
  // Estado
  alerts: [],
  currentAlert: null,
  stats: {
    total_active: 0,
    critical: 0,
    low_stock: 0,
    overstock: 0,
    resolved_this_month: 0,
    by_severity: {
      info: 0,
      warning: 0,
      critical: 0
    }
  },
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  },
  filters: {
    search: '',
    alert_type: '',
    severity: '',
    status: 'active',
    category_id: '',
    sort_by: 'alert_date',
    sort_order: 'DESC'
  },
  loading: false,
  error: null,

  // Acciones
  setFilters: async (newFilters) => {
    set({ filters: { ...get().filters, ...newFilters } });
    // Automáticamente recargar alertas cuando cambien los filtros
    await get().fetchAlerts();
  },
  
  setPage: async (page) => {
    set({ pagination: { ...get().pagination, page } });
    // Automáticamente recargar alertas cuando cambie la página
    await get().fetchAlerts();
  },

  resetFilters: () => set({
    filters: {
      search: '',
      alert_type: '',
      severity: '',
      status: 'active',
      category_id: '',
      sort_by: 'alert_date',
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
      
      console.log('📡 Fetching alerts con params:', params);
      const response = await stockAlertsApi.getStockAlerts(params);
      console.log('📡 Response recibida:', response);
      console.log('📡 Datos de alertas:', response.data);
      console.log('📡 Número de alertas:', response.data?.length);
      
      set({
        alerts: response.data,
        pagination: response.pagination,
        loading: false
      });
    } catch (error) {
      console.error('❌ Error en fetchAlerts:', error);
      set({ 
        error: error.response?.data?.message || 'Error al cargar alertas',
        loading: false 
      });
    }
  },

  // Obtener alerta por ID
  fetchAlertById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await stockAlertsApi.getStockAlertById(id);
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
      const response = await stockAlertsApi.getStockAlertsStats();
      set({ stats: response.data });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  },

  // Verificar alertas manualmente
  checkAlerts: async () => {
    set({ loading: true, error: null });
    try {
      console.log('🔍 Verificando alertas manualmente...');
      const response = await stockAlertsApi.checkStockAlerts();
      console.log('✅ Respuesta de checkAlerts:', response);
      console.log('✅ Alertas creadas:', response.data?.alerts_created);
      console.log('✅ Productos revisados:', response.data?.products_checked);
      
      // Recargar alertas y estadísticas
      console.log('🔄 Recargando alertas y stats...');
      await get().fetchAlerts();
      await get().fetchStats();
      
      set({ loading: false });
      return response.data;
    } catch (error) {
      console.error('❌ Error en checkAlerts:', error);
      set({ 
        error: error.response?.data?.message || 'Error al verificar alertas',
        loading: false 
      });
      throw error;
    }
  },

  // Resolver alerta
  resolveAlert: async (id, notes = '') => {
    set({ loading: true, error: null });
    try {
      await stockAlertsApi.resolveStockAlert(id, { resolution_notes: notes });
      
      // Recargar alertas y estadísticas
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
      await stockAlertsApi.ignoreStockAlert(id, { resolution_notes: notes });
      
      // Recargar alertas y estadísticas
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
      await stockAlertsApi.reactivateStockAlert(id);
      
      // Recargar alertas y estadísticas
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
      await stockAlertsApi.deleteStockAlert(id);
      
      // Recargar alertas y estadísticas
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

export default useStockAlertsStore;