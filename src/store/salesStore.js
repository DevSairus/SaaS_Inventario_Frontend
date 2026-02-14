// frontend/src/store/salesStore.js
import { create } from 'zustand';
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
  },
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
      const filters = { ...get().filters, ...customFilters };
      const response = await salesApi.getAll(filters);
      set({ sales: response.data.data, loading: false });
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

  // Marcar como entregada
  markAsDelivered: async (id, deliveryDate) => {
    set({ loading: true, error: null });
    try {
      const response = await salesApi.markDelivered(id, deliveryDate);
      
      const updatedSales = get().sales.map(sale => 
        sale.id === id ? { ...sale, status: 'delivered', delivery_date: deliveryDate } : sale
      );
      
      set({ 
        sales: updatedSales,
        currentSale: response.data.data,
        loading: false 
      });
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Error actualizando venta', 
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
      console.error('Error cargando estadísticas:', error);
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