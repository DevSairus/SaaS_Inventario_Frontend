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
      throw { type: 'SERVER_ERROR', message: 'Error del servidor. Intenta nuevamente.' };
    }
  },

  update: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
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
