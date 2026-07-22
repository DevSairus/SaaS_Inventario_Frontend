// frontend/src/api/receipts.js
import api from './axios';

export const receiptsAPI = {
  list: (params = {}) => api.get('/receipts', { params }),
  getById: (id) => api.get(`/receipts/${id}`),
  getPdf: (id) => api.get(`/receipts/${id}/pdf`, { responseType: 'blob' }),
};
