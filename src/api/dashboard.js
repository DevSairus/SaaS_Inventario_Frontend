// frontend/src/api/dashboard.js
import axios from './axios';

export const dashboardAPI = {
  /**
   * Obtener KPIs principales del dashboard
   * @param {number} period - Período en días (default: 30)
   */
  getKPIs: async (period = 30) => {
    const response = await axios.get(`/dashboard/kpis?period=${period}`);
    return response.data;
  },

  /**
   * Obtener alertas del sistema
   */
  getAlerts: async () => {
    const response = await axios.get('/dashboard/alerts');
    return response.data;
  },

  getWorkshopKPIs: async () => {
    const response = await axios.get('/dashboard/workshop');
    return response.data;
  }
};