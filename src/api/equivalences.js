import api from './axios';

export const equivalencesAPI = {
  // Obtener equivalencias de un producto (grupos + miembros con stock)
  getByProductId: async (productId) => {
    const response = await api.get(`/products/${productId}/equivalents`);
    return response.data;
  },

  // Agregar producto a grupo de equivalencia (crea grupo si es necesario)
  addToGroup: async (productId, data) => {
    const response = await api.post(`/products/${productId}/equivalents`, data);
    return response.data;
  },

  // Remover producto de grupo de equivalencia
  removeFromGroup: async (productId, groupId) => {
    const response = await api.delete(`/products/${productId}/equivalents/${groupId}`);
    return response.data;
  },

  // Actualizar rol/notas de un miembro
  updateMember: async (productId, groupId, memberId, data) => {
    const response = await api.put(`/products/${productId}/equivalents/${groupId}/member/${memberId}`, data);
    return response.data;
  },

  // Buscar grupos existentes por nombre
  searchGroups: async (search = '', limit = 20) => {
    const response = await api.get('/products/equivalence-groups', { params: { search, limit } });
    return response.data;
  },

  // Verificar equivalentes con stock para múltiples productos
  batchCheckEquivalents: async (productIds) => {
    const response = await api.post('/products/equivalents/batch-check', { product_ids: productIds });
    return response.data;
  }
};
