import api from './axios';

export const superAdminAPI = {
  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/superadmin/dashboard');
    return response.data;
  },

  getExpiringTrials: async (days = 7) => {
    const response = await api.get('/superadmin/trials/expiring', { params: { days } });
    return response.data;
  },

  // Tenants
  getTenants: async (params = {}) => {
    const response = await api.get('/superadmin/tenants', { params });
    return response.data;
  },

  getTenantById: async (id) => {
    const response = await api.get(`/superadmin/tenants/${id}`);
    return response.data;
  },

  createTenant: async (data) => {
    const response = await api.post('/superadmin/tenants', data);
    return response.data;
  },

  updateTenant: async (id, data) => {
    const response = await api.put(`/superadmin/tenants/${id}`, data);
    return response.data;
  },

  toggleTenantStatus: async (id) => {
    const response = await api.post(`/superadmin/tenants/${id}/toggle-status`);
    return response.data;
  },

  deleteTenant: async (id) => {
    const response = await api.delete(`/superadmin/tenants/${id}`);
    return response.data;
  },

  // Tenant Users
  getTenantUsers: async (tenantId, params = {}) => {
    const response = await api.get(`/superadmin/tenants/${tenantId}/users`, { params });
    return response.data;
  },

  deleteTenantUser: async (tenantId, userId) => {
    const response = await api.delete(`/superadmin/tenants/${tenantId}/users/${userId}`);
    return response.data;
  },

  changeTenantUserRole: async (tenantId, userId, role) => {
    const response = await api.put(`/superadmin/tenants/${tenantId}/users/${userId}/role`, { role });
    return response.data;
  },

  resetTenantUserPassword: async (tenantId, userId, password) => {
    const response = await api.put(`/superadmin/tenants/${tenantId}/users/${userId}/password`, { password });
    return response.data;
  },

  // Analytics
  getAnalyticsOverview: async (params = {}) => {
    const response = await api.get('/superadmin/analytics/overview', { params });
    return response.data;
  },

  getTenantsAnalytics: async () => {
    const response = await api.get('/superadmin/analytics/tenants');
    return response.data;
  },

  // Permissions
  getRolePermissions: async (role) => {
    const response = await api.get(`/superadmin/permissions/role/${role}`);
    return response.data;
  },

  updateRolePermissions: async (role, permissionIds) => {
    const response = await api.put(`/superadmin/permissions/role/${role}`, { permission_ids: permissionIds });
    return response.data;
  },

  // Subscription Plans
  getSubscriptionPlans: async () => {
    const response = await api.get('/superadmin/subscription-plans');
    return response.data;
  },

  createSubscriptionPlan: async (data) => {
    const response = await api.post('/superadmin/subscription-plans', data);
    return response.data;
  },

  updateSubscriptionPlan: async (id, data) => {
    const response = await api.put(`/superadmin/subscription-plans/${id}`, data);
    return response.data;
  },

  deleteSubscriptionPlan: async (id) => {
    const response = await api.delete(`/superadmin/subscription-plans/${id}`);
    return response.data;
  },

  // Subscriptions
  getSubscriptions: async (params = {}) => {
    const response = await api.get('/superadmin/subscriptions', { params });
    return response.data;
  },

  updateSubscription: async (id, data) => {
    const response = await api.put(`/superadmin/subscriptions/${id}`, data);
    return response.data;
  },

  // Subscription Invoices
  getSubscriptionInvoices: async (params = {}) => {
    const response = await api.get('/superadmin/subscription-invoices', { params });
    return response.data;
  },

  getSubscriptionInvoiceById: async (id) => {
    const response = await api.get(`/superadmin/subscription-invoices/${id}`);
    return response.data;
  },

  // MercadoPago Config
  getMercadoPagoConfig: async () => {
    const response = await api.get('/superadmin/mercadopago-config');
    return response.data;
  },

  updateMercadoPagoConfig: async (data) => {
    const response = await api.post('/superadmin/mercadopago-config', data);
    return response.data;
  },

  deleteMercadoPagoConfig: async () => {
    const response = await api.delete('/superadmin/mercadopago-config');
    return response.data;
  },

  // Tenant MercadoPago Config
  getTenantMercadoPagoConfig: async (tenantId) => {
    const response = await api.get(`/superadmin/tenants/${tenantId}/mercadopago-config`);
    return response.data;
  },

  updateTenantMercadoPagoConfig: async (tenantId, data) => {
    const response = await api.post(`/superadmin/tenants/${tenantId}/mercadopago-config`, data);
    return response.data;
  },

  deleteTenantMercadoPagoConfig: async (tenantId) => {
    const response = await api.delete(`/superadmin/tenants/${tenantId}/mercadopago-config`);
    return response.data;
  },
};