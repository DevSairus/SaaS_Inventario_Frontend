import api from './axios';

// Combos: agrupaciones de productos/servicios (Inventario > Combos).
// Ver backend/src/controllers/inventory/combos.controller.js
export const combosAPI = {
  list: (params) => api.get('/inventory/combos', { params }),
  getById: (id) => api.get(`/inventory/combos/${id}`),
  create: (data) => api.post('/inventory/combos', data),
  update: (id, data) => api.put(`/inventory/combos/${id}`, data),
  remove: (id) => api.delete(`/inventory/combos/${id}`),
};
