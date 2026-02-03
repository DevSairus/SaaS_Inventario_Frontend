import api from './axios';

export const transfersApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/inventory/transfers', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/inventory/transfers/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/inventory/transfers', data);
    return response.data;
  },

  send: async (id, shipping_notes = '') => {
    const response = await api.put(`/inventory/transfers/${id}/send`, { shipping_notes });
    return response.data;
  },

  receive: async (id, data) => {
    const response = await api.put(`/inventory/transfers/${id}/receive`, data);
    return response.data;
  },

  cancel: async (id, notes = '') => {
    const response = await api.put(`/inventory/transfers/${id}/cancel`, { notes });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/inventory/transfers/${id}`);
    return response.data;
  }
};