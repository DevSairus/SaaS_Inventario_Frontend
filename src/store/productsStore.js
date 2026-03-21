import { create } from 'zustand';
import toast from 'react-hot-toast';
import { productsAPI } from '../api/products';

// Mensajes de error legibles según el código HTTP
const getSearchErrorMessage = (error) => {
  const status = error.response?.status;
  const serverMsg = error.response?.data?.message;

  if (status === 401) return 'Sesión expirada. Por favor recarga la página.';
  if (status === 403) return 'No tienes permisos para buscar productos.';
  if (status === 402) return 'Suscripción inactiva. Contacta a soporte.';
  if (status === 429) return 'Demasiadas búsquedas. Espera unos segundos e intenta de nuevo.';
  if (status >= 500) return 'Error en el servidor. Intenta de nuevo en unos momentos.';
  if (!navigator.onLine) return 'Sin conexión a internet. Verifica tu red.';
  return serverMsg || 'Error al buscar productos. Intenta de nuevo.';
};

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
  lastFetch: null,

  // Obtener productos con cache inteligente
  fetchProducts: async (forceRefresh = false) => {
    set({ isLoading: true, error: null });
    
    try {
      const { filters, pagination } = get();
      
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      
      if (forceRefresh) {
        params._t = Date.now();
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

  // Refrescar después de operaciones de compra
  refreshAfterPurchase: async () => {
    await get().fetchProducts(true);
    await get().fetchStats();
  },

  // Obtener estadísticas
  fetchStats: async () => {
    try {
      const response = await productsAPI.getStats();
      if (response.success) {
        set({ stats: response.data });
      }
    } catch (error) {
      // Estadísticas son secundarias — fallo silencioso está bien aquí
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
        await get().fetchProducts(true);
        set({ isLoading: false });
        return true;
      } else {
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error al crear producto';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  // Actualizar producto
  updateProduct: async (id, productData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await productsAPI.update(id, productData);
      if (response && response.success) {
        await get().fetchProducts(true);
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
        await get().fetchProducts(true);
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
        await get().fetchProducts(true);
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

  // Buscar productos para ventas / órdenes de trabajo
  // Retorna el array de resultados y lanza toast si hay error,
  // para que el usuario sepa qué pasó en lugar de ver silencio.
  searchProducts: async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    try {
      const response = await productsAPI.getAll({
        search: searchTerm.trim(),
        is_active: 'true',
        limit: 100,
        page: 1,
        _t: Date.now()
      });

      if (response && response.success) {
        return response.data || [];
      }

      // Respuesta inesperada sin error HTTP
      toast.error('La búsqueda no devolvió una respuesta válida. Intenta de nuevo.');
      return [];

    } catch (error) {
      const msg = getSearchErrorMessage(error);
      toast.error(msg, {
        id: 'search-error', // evita duplicar el toast si el usuario escribe rápido
        duration: 4000,
      });
      return [];
    }
  },

  // Limpiar cache
  clearCache: () => {
    set({ lastFetch: null });
  },

  // Limpiar errores
  clearError: () => set({ error: null })
}));

export default useProductsStore;