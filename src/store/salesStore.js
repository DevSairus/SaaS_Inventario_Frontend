// frontend/src/store/salesStore.js
import { create } from 'zustand';
import toast from 'react-hot-toast';
import salesApi from '../api/sales';

const useSalesStore = create((set, get) => ({
  sales: [],
  currentSale: null,
  loading: false,
  error: null,
  filters: {
    status: '',
    customer_id: '',
    from_date: '',
    to_date: '',
    document_type: '',
    customer_name: '',
    vehicle_plate: '',
    branch_id: '',
    payment_view: '', // 'pending' = solo documentos con saldo por cobrar
    aging: '',        // dentro de 'pending': overdue | upcoming | draft
  },
  // Paginación del listado (limit/offset en el backend, máx. 200)
  page: 1,
  pageSize: 50,
  total: 0,
  stats: {
    total_sales: 0,
    total_amount: 0,
    pending_amount: 0,
    sales_count: 0,
  },

  // Cargar ventas
  fetchSales: async (customFilters = {}) => {
    set({ loading: true, error: null });
    try {
      const { page: currentPage, pageSize } = get();
      const { page = currentPage, ...rest } = customFilters;
      const filters = { ...get().filters, ...rest, limit: pageSize, offset: (page - 1) * pageSize };
      const response = await salesApi.getAll(filters);
      set({
        sales: response.data.data,
        page,
        total: response.data.pagination?.total ?? response.data.data.length,
        loading: false,
      });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Error cargando ventas', 
        loading: false 
      });
    }
  },

  // Cargar una venta específica
  fetchSaleById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await salesApi.getById(id);
      set({ currentSale: response.data.data, loading: false });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Error cargando venta', 
        loading: false 
      });
    }
  },

  // Crear nueva venta
  createSale: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await salesApi.create(data);
      set({
        currentSale: response.data.data,
        loading: false
      });
      // Advertencia no bloqueante del backend (p.ej. cantidad en trámite que
      // supera el disponible real de algún producto) — la venta ya se creó.
      const warnings = response.data.warnings || response.data.data?.warnings;
      if (Array.isArray(warnings)) {
        warnings.forEach((w) => toast(w.message || w, { icon: '⚠️', duration: 6000 }));
      }
      return response.data.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error creando venta',
        loading: false
      });
      throw error;
    }
  },

  // Confirmar venta
  // Confirmar venta con datos de pago
  confirmSale: async (id, paymentData) => {
    set({ loading: true, error: null });
    try {
      const response = await salesApi.confirm(id, paymentData);
      
      // Actualizar la venta en el estado
      const updatedSales = get().sales.map(sale => 
        sale.id === id ? { ...sale, status: 'completed' } : sale
      );
      
      set({ 
        sales: updatedSales,
        currentSale: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Error confirmando venta', 
        loading: false 
      });
      throw error;
    }
  },

  // Cancelar venta
  cancelSale: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await salesApi.cancel(id);
      
      const updatedSales = get().sales.map(sale => 
        sale.id === id ? { ...sale, status: 'cancelled' } : sale
      );
      
      set({ 
        sales: updatedSales,
        currentSale: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Error cancelando venta', 
        loading: false 
      });
      throw error;
    }
  },

  // Actualizar venta
  updateSale: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await salesApi.update(id, data);

      const updatedSales = get().sales.map(sale =>
        sale.id === id ? response.data.data : sale
      );

      set({
        sales: updatedSales,
        currentSale: response.data.data,
        loading: false
      });

      const warnings = response.data.warnings || response.data.data?.warnings;
      if (Array.isArray(warnings)) {
        warnings.forEach((w) => toast(w.message || w, { icon: '⚠️', duration: 6000 }));
      }
      return response.data.data;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error actualizando venta',
        loading: false
      });
      throw error;
    }
  },

  // Eliminar venta
  deleteSale: async (id) => {
    set({ loading: true, error: null });
    try {
      await salesApi.delete(id);
      
      const filteredSales = get().sales.filter(sale => sale.id !== id);
      
      set({ 
        sales: filteredSales,
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Error eliminando venta', 
        loading: false 
      });
      throw error;
    }
  },

  // Cargar estadísticas
  fetchStats: async (filters = {}) => {
    try {
      const response = await salesApi.getStats(filters);
      set({ stats: response.data.data });
    } catch (error) {
      const message = error?.response?.data?.message || 'No se pudieron cargar las estadísticas de ventas';
      set({ error: message });
      if (import.meta.env.DEV) {
        console.warn('[salesStore] fetchStats error:', error);
      }
      toast.error(message);
    }
  },

  // Actualizar filtros
  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  // Limpiar error
  clearError: () => set({ error: null }),

  // Limpiar venta actual
  clearCurrentSale: () => set({ currentSale: null }),
}));

export default useSalesStore;