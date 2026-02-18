import api from './axios';

export const reportsAPI = {
  getMovementsByMonth: async (params = {}) => {
    // legacy: if number passed, treat as months
    const queryParams = typeof params === 'number' ? { months: params } : params;
    const response = await api.get('/inventory/reports/movements', { params: queryParams });
    return response.data;
  },

  getValuation: async () => {
    const response = await api.get('/inventory/reports/valuation');
    return response.data;
  },

  getProfitReport: async (params = {}, limit = 100) => {
    const queryParams = typeof params === 'number'
      ? { months: params, limit }
      : { ...params, limit };
    const response = await api.get('/inventory/reports/profit', { params: queryParams });
    return response.data;
  },

  getRotationReport: async (params = {}) => {
    const queryParams = typeof params === 'number' ? { months: params } : params;
    const response = await api.get('/inventory/reports/rotation', { params: queryParams });
    return response.data;
  }
};