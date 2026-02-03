import { create } from 'zustand';
import { suppliersAPI } from '../api/suppliers';

export const useSuppliersStore = create((set, get) => ({
  suppliers: [],
  supplier: null,
  stats: null,
  isLoading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  },
  filters: {
    search: '',
    is_active: '',
    sort_by: 'name',
    sort_order: 'ASC'
  },

  // Obtener proveedores
  fetchSuppliers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      const response = await suppliersAPI.getAll({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });

      set({
        suppliers: response.data,
        pagination: response.pagination,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al obtener proveedores',
        isLoading: false
      });
    }
  },

  // Obtener un proveedor por ID
  fetchSupplierById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await suppliersAPI.getById(id);
      set({
        supplier: response.data,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al obtener proveedor',
        isLoading: false
      });
    }
  },

  // Crear proveedor
  createSupplier: async (supplierData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await suppliersAPI.create(supplierData);
      await get().fetchSuppliers();
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al crear proveedor',
        isLoading: false
      });
      return false;
    }
  },

  // Actualizar proveedor
  updateSupplier: async (id, supplierData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await suppliersAPI.update(id, supplierData);
      await get().fetchSuppliers();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al actualizar proveedor',
        isLoading: false
      });
      return false;
    }
  },

  // Desactivar proveedor
  deactivateSupplier: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await suppliersAPI.deactivate(id);
      await get().fetchSuppliers();
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al desactivar proveedor',
        isLoading: false
      });
      return false;
    }
  },

  // Activar proveedor
  activateSupplier: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await suppliersAPI.activate(id);
      await get().fetchSuppliers();
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al activar proveedor',
        isLoading: false
      });
      return false;
    }
  },

  // Eliminar proveedor
  deleteSupplier: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await suppliersAPI.delete(id);
      await get().fetchSuppliers();
      await get().fetchStats();
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al eliminar proveedor',
        isLoading: false
      });
      return false;
    }
  },

  // Obtener estadísticas
  fetchStats: async () => {
    try {
      const response = await suppliersAPI.getStats();
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

  // Limpiar proveedor seleccionado
  clearSupplier: () => {
    set({ supplier: null });
  }
}));