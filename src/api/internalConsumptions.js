import api from './axios';

export const internalConsumptionsApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/inventory/internal-consumptions', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/inventory/internal-consumptions/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/inventory/internal-consumptions', data);
    return response.data;
  },

  approve: async (id) => {
    const response = await api.put(`/inventory/internal-consumptions/${id}/approve`);
    return response.data;
  },

  reject: async (id, rejection_reason) => {
    const response = await api.put(`/inventory/internal-consumptions/${id}/reject`, { rejection_reason });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/inventory/internal-consumptions/${id}`);
    return response.data;
  }
};