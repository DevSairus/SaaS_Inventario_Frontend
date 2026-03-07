import { create } from 'zustand';
import toast from 'react-hot-toast';
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
  lastFetch: null, // ✅ Para tracking de última actualización

  // ✅ Obtener productos con cache inteligente
  fetchProducts: async (forceRefresh = false) => {
    set({ isLoading: true, error: null });
    
    try {
      const { filters, pagination } = get();
      
      // ✅ SOLUCIÓN: Agregar timestamp para evitar cache
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      
      if (forceRefresh) {
        params._t = Date.now(); // ← Invalida cache del navegador
      }
      
      const response = await productsAPI.getAll(params);

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
      const msg = error.response?.data?.message || 'No se pudieron cargar los productos.';
      toast.error(msg);
      set({ error: msg, isLoading: false });
    }
  },

  // ✅ Método específico para refrescar después de operaciones de compra
  refreshAfterPurchase: async () => {

    await get().fetchProducts(true); // Forzar refresh
    await get().fetchStats(); // Actualizar estadísticas también
  },

  // Obtener estadísticas
  fetchStats: async () => {
    try {
      const response = await productsAPI.getStats();
      if (response.success) {
        set({ stats: response.data });
      }
    } catch (error) {

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
      const response = await productsAPI.create(productData);
      if (response && response.success) {
        await get().fetchProducts(true); // ✅ Forzar refresh
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
        await get().fetchProducts(true); // ✅ Forzar refresh
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
        await get().fetchProducts(true); // ✅ Forzar refresh
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
        await get().fetchProducts(true); // ✅ Forzar refresh
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

  searchProducts: async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    try {
      const response = await productsAPI.getAll({
        search: searchTerm.trim(),
        is_active: 'true',
        limit: 100, // Más resultados para búsqueda
        page: 1,
        _t: Date.now() // Evitar cache
      });

      if (response && response.success) {
        return response.data || [];
      }
      return [];
    } catch (error) {

      return [];
    }
  },

  // ✅ Limpiar cache (útil para debugging)
  clearCache: () => {
    set({ lastFetch: null });
  },

  // Limpiar errores
  clearError: () => set({ error: null })
}));

export default useProductsStore;