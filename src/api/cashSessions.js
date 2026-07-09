// frontend/src/api/cashSessions.js
import api from './axios';

export const cashSessionsAPI = {
  getCurrent: (branch_id) => api.get('/cash-sessions/current', { params: { branch_id } }),
  open: (payload) => api.post('/cash-sessions/open', payload),
  getSummary: (id) => api.get(`/cash-sessions/${id}/summary`),
  close: (id, payload) => api.post(`/cash-sessions/${id}/close`, payload),
  getById: (id) => api.get(`/cash-sessions/${id}`),
  list: (params = {}) => api.get('/cash-sessions', { params }),
};