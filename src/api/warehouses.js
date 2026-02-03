import api from './axios';

export const warehousesService = {
  getAll: async () => {
    const response = await api.get('/inventory/warehouses');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/inventory/warehouses/${id}`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/inventory/warehouses', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/inventory/warehouses/${id}`, data);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/inventory/warehouses/${id}`);
    return response.data;
  }
};