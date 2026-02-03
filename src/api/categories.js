import api from './axios';

export const categoriesAPI = {
  // Obtener todas las categorías
  getAll: async (includeInactive = false) => {
    const response = await api.get('/categories', {
      params: { include_inactive: includeInactive }
    });
    return response.data;
  },

  // Obtener una categoría por ID
  getById: async (id) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  // Crear categoría
  create: async (categoryData) => {
    const response = await api.post('/categories', categoryData);
    return response.data;
  },

  // Actualizar categoría
  update: async (id, categoryData) => {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data;
  },

  // Desactivar categoría
  deactivate: async (id) => {
    const response = await api.patch(`/categories/${id}/deactivate`);
    return response.data;
  },

  // Eliminar categoría
  delete: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  }
};