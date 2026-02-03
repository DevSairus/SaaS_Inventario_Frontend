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

  getProfitReport: async (months = 3, limit = 10) => {
    const response = await api.get('/inventory/reports/profit', { params: { months, limit } });
    return response.data;
  },

  getRotationReport: async (months = 3) => {
    const response = await api.get('/inventory/reports/rotation', { params: { months } });
    return response.data;
  }
};