// frontend/src/api/cashSessions.js
import api from './axios';

export const cashSessionsAPI = {
  getCurrent: (branch_id) => api.get('/cash-sessions/current', { params: { branch_id } }),
  open: (payload) => api.post('/cash-sessions/open', payload),
  getSummary: (id) => api.get(`/cash-sessions/${id}/summary`),
  getPayments: (id) => api.get(`/cash-sessions/${id}/payments`),
  close: (id, payload) => api.post(`/cash-sessions/${id}/close`, payload),
  // Corregir faltante de una caja cerrada: { type: 'found'|'repaid', amount, method, notes }
  addAdjustment: (id, payload) => api.post(`/cash-sessions/${id}/adjustments`, payload),
  getById: (id) => api.get(`/cash-sessions/${id}`),
  list: (params = {}, config = {}) => api.get('/cash-sessions', { params, ...config }),
};