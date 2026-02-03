import api from './axios';

export const supplierReturnsApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/inventory/supplier-returns', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/inventory/supplier-returns/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/inventory/supplier-returns', data);
    return response.data;
  },

  approve: async (id, notes = '') => {
    const response = await api.put(`/inventory/supplier-returns/${id}/approve`, { notes });
    return response.data;
  },

  reject: async (id, rejection_reason) => {
    const response = await api.put(`/inventory/supplier-returns/${id}/reject`, { rejection_reason });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/inventory/supplier-returns/${id}`);
    return response.data;
  }
};