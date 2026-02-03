import api from './axios';

export const productsAPI = {
  // Obtener todos los productos
  getAll: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  // Obtener un producto por ID
  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // Crear producto
  create: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  // Actualizar producto
  update: async (id, productData) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  // Desactivar producto (soft delete)
  deactivate: async (id) => {
    const response = await api.patch(`/products/${id}/deactivate`);
    return response.data;
  },

  // Eliminar producto permanentemente (hard delete)
  delete: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  // Obtener estadísticas
  getStats: async () => {
    const response = await api.get('/products/stats');
    return response.data;
  },

  // Buscar producto por código de barras
  getByBarcode: async (barcode) => {
    const response = await api.get(`/products/barcode/${barcode}`);
    return response.data;
  }
};