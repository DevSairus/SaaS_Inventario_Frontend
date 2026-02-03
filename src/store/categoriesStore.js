import { create } from 'zustand';
import { categoriesAPI } from '../api/categories';

const useCategoriesStore = create((set, get) => ({
  categories: [],
  selectedCategory: null,
  isLoading: false,
  error: null,

  // Obtener categorías
  fetchCategories: async (includeInactive = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await categoriesAPI.getAll(includeInactive);
      if (response.success) {
        set({ categories: response.data, isLoading: false });
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar categorías',
        isLoading: false
      });
    }
  },

  // Obtener categoría por ID
  fetchCategoryById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await categoriesAPI.getById(id);
      if (response.success) {
        set({ selectedCategory: response.data, isLoading: false });
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al cargar categoría',
        isLoading: false
      });
    }
  },

  // Crear categoría
  createCategory: async (categoryData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await categoriesAPI.create(categoryData);
      if (response.success) {
        await get().fetchCategories();
        set({ isLoading: false });
        return true;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al crear categoría',
        isLoading: false
      });
      return false;
    }
  },

  // Actualizar categoría
  updateCategory: async (id, categoryData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await categoriesAPI.update(id, categoryData);
      if (response.success) {
        await get().fetchCategories();
        set({ isLoading: false });
        return true;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al actualizar categoría',
        isLoading: false
      });
      return false;
    }
  },

  // Desactivar categoría
  deactivateCategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await categoriesAPI.deactivate(id);
      if (response.success) {
        await get().fetchCategories();
        set({ isLoading: false });
        return true;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al desactivar categoría',
        isLoading: false
      });
      return false;
    }
  },

  // Eliminar categoría
  deleteCategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await categoriesAPI.delete(id);
      if (response.success) {
        await get().fetchCategories();
        set({ isLoading: false });
        return true;
      }
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Error al eliminar categoría',
        isLoading: false
      });
      return false;
    }
  },

  // Limpiar errores
  clearError: () => set({ error: null })
}));

export default useCategoriesStore;