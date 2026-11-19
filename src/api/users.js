import api from './axios';

export const usersAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  getPasswordRequirements: async () => {
    const response = await api.get('/users/password-requirements');
    return response.data?.data?.requirements ?? [];
  },

  create: async (userData) => {
    try {
      const response = await api.post('/users', userData, {
        skipGlobalForbidden: true,
      });
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 402) {
        throw { type: 'PLAN_LIMIT', message: data?.message, limit: data?.limit };
      }
      if (status === 403) {
        throw { type: 'FORBIDDEN', message: data?.message };
      }
      if (status === 422) {
        throw {
          type: 'VALIDATION',
          fieldErrors: data?.fieldErrors ?? {},
          messages: data?.messages ?? [],
          passwordRequirements: data?.passwordRequirements ?? [],
        };
      }
      if (status === 409 || status === 400) {
        // Email duplicado u otro rechazo de validación puntual del backend:
        // usar el mensaje que ya viene armado ahí en vez del genérico de abajo.
        // code EMAIL_LINKABLE: la persona existe en otra empresa (vincular).
        throw { type: 'CONFLICT', code: data?.code, message: data?.message || 'No se pudo crear el usuario' };
      }
      throw { type: 'SERVER_ERROR', message: data?.message || 'Error del servidor. Intenta nuevamente.' };
    }
  },

  // Personas en varias empresas (backend services/auth/identity.service.js).
  // status: new | member | linkable | unavailable
  getEmailStatus: async (email) => {
    const response = await api.get('/users/email-status', { params: { email } });
    return response.data?.data || { status: 'new' };
  },

  // Vincula a la empresa a alguien que ya tiene cuenta en Pitbox.
  link: async ({ email, role }) => {
    const response = await api.post('/users/link', { email, role }, { skipGlobalForbidden: true });
    return response.data;
  },

  update: async (id, userData) => {
    // skipGlobalForbidden: el 403 SHARED_IDENTITY (contraseña de alguien que
    // está en otras empresas) trae su propio mensaje.
    const response = await api.put(`/users/${id}`, userData, { skipGlobalForbidden: true });
    return response.data;
  },

  toggleStatus: async (id) => {
    const response = await api.patch(`/users/${id}/toggle-status`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};
