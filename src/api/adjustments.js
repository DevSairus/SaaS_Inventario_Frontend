import api from './axios';

export const adjustmentsAPI = {
  // Obtener todos los ajustes
  getAll: async (params = {}) => {
    const response = await api.get('/inventory/adjustments', { params });
    return response.data;
  },

  // Obtener un ajuste por ID
  getById: async (id) => {
    const response = await api.get(`/inventory/adjustments/${id}`);
    return response.data;
  },

  // Crear ajuste
  create: async (adjustmentData) => {
    const response = await api.post('/inventory/adjustments', adjustmentData);
    return response.data;
  },

  // Actualizar ajuste (solo en estado draft)
  update: async (id, adjustmentData) => {
    const response = await api.put(`/inventory/adjustments/${id}`, adjustmentData);
    return response.data;
  },

  // Confirmar ajuste (genera movimientos y actualiza stock)
  confirm: async (id) => {
    const response = await api.patch(`/inventory/adjustments/${id}/confirm`);
    return response.data;
  },

  // Cancelar ajuste
  cancel: async (id) => {
    const response = await api.patch(`/inventory/adjustments/${id}/cancel`);
    return response.data;
  },

  // Eliminar ajuste (solo en estado draft)
  delete: async (id) => {
    const response = await api.delete(`/inventory/adjustments/${id}`);
    return response.data;
  },

  // Obtener estadísticas
  getStats: async () => {
    const response = await api.get('/inventory/adjustments/stats');
    return response.data;
  }
};