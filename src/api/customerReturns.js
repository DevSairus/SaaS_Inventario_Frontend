import api from './axios';

export const customerReturnsApi = {
  // Listar devoluciones
  getAll: async (params = {}) => {
    const response = await api.get('/sales/customer-returns', { params });
    return response.data;
  },

  // Obtener una devolución
  getById: async (id) => {
    const response = await api.get(`/sales/customer-returns/${id}`);
    return response.data;
  },

  // Crear devolución
  create: async (data) => {
    const response = await api.post('/sales/customer-returns', data);
    return response.data;
  },

  // Aprobar devolución
  approve: async (id, notes = '') => {
    const response = await api.put(`/sales/customer-returns/${id}/approve`, { notes });
    return response.data;
  },

  // Rechazar devolución
  reject: async (id, rejection_reason) => {
    const response = await api.put(`/sales/customer-returns/${id}/reject`, { rejection_reason });
    return response.data;
  },

  // Eliminar devolución
  delete: async (id) => {
    const response = await api.delete(`/sales/customer-returns/${id}`);
    return response.data;
  }
};