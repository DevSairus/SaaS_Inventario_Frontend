import api from './axios';

export const branchesService = {
  getAll: async () => {
    const response = await api.get('/branches');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/branches/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/branches', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/branches/${id}`, data);
    return response.data;
  },

  deactivate: async (id) => {
    const response = await api.delete(`/branches/${id}`);
    return response.data;
  },

  // Usuarios asignados a una sede
  listUsers: async (branchId) => {
    const response = await api.get(`/branches/${branchId}/users`);
    return response.data;
  },

  assignUser: async (branchId, userId, isDefault = false) => {
    const response = await api.post(`/branches/${branchId}/users`, {
      user_id: userId,
      is_default: isDefault,
    });
    return response.data;
  },

  removeUser: async (branchId, userId) => {
    const response = await api.delete(`/branches/${branchId}/users/${userId}`);
    return response.data;
  },
};

export default branchesService;
