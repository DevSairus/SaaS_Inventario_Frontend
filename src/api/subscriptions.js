import api from './axios';

export const subscriptionsAPI = {
  // Plans
  getPlans: async () => {
    const response = await api.get('/superadmin/subscription-plans');
    return response.data;
  },

  getPlanById: async (id) => {
    const response = await api.get(`/superadmin/subscription-plans/${id}`);
    return response.data;
  },

  createPlan: async (data) => {
    const response = await api.post('/superadmin/subscription-plans', data);
    return response.data;
  },

  updatePlan: async (id, data) => {
    const response = await api.put(`/superadmin/subscription-plans/${id}`, data);
    return response.data;
  },

  deletePlan: async (id) => {
    const response = await api.delete(`/superadmin/subscription-plans/${id}`);
    return response.data;
  },

  togglePlanStatus: async (id) => {
    const response = await api.patch(`/superadmin/subscription-plans/${id}/toggle`);
    return response.data;
  },

  // Subscriptions
  getSubscriptions: async (params = {}) => {
    const response = await api.get('/superadmin/subscriptions', { params });
    return response.data;
  },

  getSubscriptionById: async (id) => {
    const response = await api.get(`/superadmin/subscriptions/${id}`);
    return response.data;
  },

  // Invoices
  getInvoices: async (params = {}) => {
    const response = await api.get('/superadmin/invoices', { params });
    return response.data;
  },

  // MercadoPago
  getMercadoPagoConfig: async () => {
    const response = await api.get('/superadmin/mercadopago/config');
    return response.data;
  },

  updateMercadoPagoConfig: async (data) => {
    const response = await api.put('/superadmin/mercadopago/config', data);
    return response.data;
  },

  testMercadoPagoConnection: async () => {
    const response = await api.post('/superadmin/mercadopago/test');
    return response.data;
  }
};