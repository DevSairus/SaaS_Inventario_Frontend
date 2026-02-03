import { create } from 'zustand';
import { productsAPI } from '../api/products';

const useProductsStore = create((set, get) => ({
  products: [],
  selectedProduct: null,
  stats: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  },
  filters: {
    search: '',
    category_id: '',
    is_active: 'true',
    sort_by: 'name',
    sort_order: 'ASC'
  },
  isLoading: false,
  error: null,

  // Obtener productos
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      
      const response = await productsAPI.getAll({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });

      if (response && response.success) {
        set({
          products: response.data || [],
          pagination: response.pagination || pagination,
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      set({
        error: error.response?.data?.message || 'Error al cargar productos',
        isLoading: false
      });
    }
  },

  // Obtener estadísticas
  fetchStats: async () => {
    try {
      const response = await productsAPI.getStats();
      if (response.success) {
        set({ stats: response.data });
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  },

  // Obtener producto por ID
  fetchProductById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await productsAPI.getById(id);
      if (response && response.success) {
        set({
          selectedProduct: response.data,
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar producto',
        isLoading: false
      });
    }
  },

  // Crear producto
  createProduct: async (productData) => {
    set({ isLoading: true, error: null });
    try {
      console.log('📤 Enviando producto:', productData);
      const response = await productsAPI.create(productData);
      console.log('✅ Respuesta:', response);
      if (response && response.success) {
        await get().fetchProducts();
        set({ isLoading: false });
        return true;
      } else {
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      
      const errorMessage = error.response?.data?.message || 'Error al crear producto';
      set({
        error: errorMessage,
        isLoading: false
      });
      
      // Propagar el error con el mensaje
      throw new Error(errorMessage);
    }
  },

  // Actualizar producto
  updateProduct: async (id, productData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await productsAPI.update(id, productData);
      if (response && response.success) {
        await get().fetchProducts();
        set({ isLoading: false });
        return true;
      } else {
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al actualizar producto',
        isLoading: false
      });
      return false;
    }
  },

  // Desactivar producto (soft delete)
  deactivateProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await productsAPI.deactivate(id);
      if (response && response.success) {
        await get().fetchProducts();
        set({ isLoading: false });
        return true;
      } else {
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al desactivar producto',
        isLoading: false
      });
      return false;
    }
  },

  // Eliminar producto permanentemente (hard delete)
  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await productsAPI.delete(id);
      if (response && response.success) {
        await get().fetchProducts();
        set({ isLoading: false });
        return true;
      } else {
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al eliminar producto',
        isLoading: false
      });
      return false;
    }
  },

  // Actualizar filtros
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 }
    }));
  },

  // Cambiar página
  setPage: (page) => {
    set((state) => ({
      pagination: { ...state.pagination, page }
    }));
  },

  // Limpiar errores
  clearError: () => set({ error: null })
}));

export default useProductsStore;