import api from './axios';

export const authAPI = {
  // Login
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // Una persona en varias empresas (backend services/auth/identity.service.js):
  // elegir empresa después del login, listar las suyas y cambiar sin cerrar sesión.
  selectTenant: async (selectionToken, userId) => {
    const response = await api.post('/auth/select-tenant', { selection_token: selectionToken, user_id: userId });
    return response.data;
  },
  getCompanies: async () => {
    const response = await api.get('/auth/companies');
    return response.data;
  },
  switchTenant: async (tenantId) => {
    const response = await api.post('/auth/switch-tenant', { tenant_id: tenantId });
    return response.data;
  },

  // Obtener perfil
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // Verificar token
  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  // Refrescar token
  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  // Finalizar sesión de soporte (impersonación)
  endImpersonation: async () => {
    const response = await api.post('/auth/impersonate/end');
    return response.data;
  },

  // Cambiar contraseña
  changePassword: async (data) => {
    const response = await api.put('/users/change-password', data);
    return response.data;
  },

  // Recuperar contraseña
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Restablecer contraseña
  resetPassword: async (token, password) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },
};