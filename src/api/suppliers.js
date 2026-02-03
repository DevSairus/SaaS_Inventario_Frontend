import api from './axios';

export const suppliersAPI = {
  // Obtener todos los proveedores
  getAll: async (params = {}) => {
    const response = await api.get('/inventory/suppliers', { params });
    return response.data;
  },

  // Obtener un proveedor por ID
  getById: async (id) => {
    const response = await api.get(`/inventory/suppliers/${id}`);
    return response.data;
  },

  // Crear proveedor
  create: async (supplierData) => {
    const response = await api.post('/inventory/suppliers', supplierData);
    return response.data;
  },

  // Actualizar proveedor
  update: async (id, supplierData) => {
    const response = await api.put(`/inventory/suppliers/${id}`, supplierData);
    return response.data;
  },

  // Desactivar proveedor
  deactivate: async (id) => {
    const response = await api.patch(`/inventory/suppliers/${id}/deactivate`);
    return response.data;
  },

  // Activar proveedor
  activate: async (id) => {
    const response = await api.patch(`/inventory/suppliers/${id}/activate`);
    return response.data;
  },

  // Eliminar proveedor
  delete: async (id) => {
    const response = await api.delete(`/inventory/suppliers/${id}`);
    return response.data;
  },

  // Obtener estadísticas
  getStats: async () => {
    const response = await api.get('/inventory/suppliers/stats');
    return response.data;
  }
};