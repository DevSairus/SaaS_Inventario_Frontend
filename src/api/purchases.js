import api from './axios';

export const purchasesAPI = {
  // Obtener todas las compras
  getAll: async (params = {}) => {
    const response = await api.get('/inventory/purchases', { params });
    return response.data;
  },

  // Obtener una compra por ID
  getById: async (id) => {
    const response = await api.get(`/inventory/purchases/${id}`);
    return response.data;
  },

  // Crear compra
  create: async (purchaseData) => {
    const response = await api.post('/inventory/purchases', purchaseData);
    return response.data;
  },

  // Actualizar compra (solo en estado draft)
  update: async (id, purchaseData) => {
    const response = await api.put(`/inventory/purchases/${id}`, purchaseData);
    return response.data;
  },

  // Confirmar compra
  confirm: async (id) => {
    const response = await api.patch(`/inventory/purchases/${id}/confirm`);
    return response.data;
  },

  // Recibir compra (actualiza stock)
  receive: async (id, receivedItems) => {
    const response = await api.patch(`/inventory/purchases/${id}/receive`, {
      received_items: receivedItems
    });
    return response.data;
  },

  // Cancelar compra
  cancel: async (id, cancellation_reason) => {
    const response = await api.patch(`/inventory/purchases/${id}/cancel`, {
      cancellation_reason
    });
    return response.data;
  },

  // Eliminar compra (solo en estado draft)
  delete: async (id) => {
    const response = await api.delete(`/inventory/purchases/${id}`);
    return response.data;
  },

  // Obtener estadísticas
  getStats: async () => {
    const response = await api.get('/inventory/purchases/stats');
    return response.data;
  }
};