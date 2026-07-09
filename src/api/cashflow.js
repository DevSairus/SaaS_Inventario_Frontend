// frontend/src/api/cashflow.js
import api from './axios';

export const cashflowAPI = {
  getCashFlow: async (params = {}) => {
    const response = await api.get('/cashflow', { params });
    return response.data;
  },

  getCashFlowPDF: (params = {}) => api.get('/cashflow/pdf', { params, responseType: 'blob' }),

  getCashFlowExcel: (params = {}) => api.get('/cashflow/excel', { params, responseType: 'blob' })
};