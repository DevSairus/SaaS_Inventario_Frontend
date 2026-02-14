import api from './axios';

export const reportsAPI = {
  getMovementsByMonth: async (months = 6) => {
    const response = await api.get('/inventory/reports/movements', { params: { months } });
    return response.data;
  },

  getValuation: async () => {
    const response = await api.get('/inventory/reports/valuation');
    return response.data;
  },

  getProfitReport: async (params = {}, limit = 100) => {
    // Si params es un número, es el modo legacy (meses)
    const queryParams = typeof params === 'number' 
      ? { months: params, limit } 
      : { ...params, limit };
    
    const response = await api.get('/inventory/reports/profit', { params: queryParams });
    return response.data;
  },

  getRotationReport: async (months = 3) => {
    const response = await api.get('/inventory/reports/rotation', { params: { months } });
    return response.data;
  }
};