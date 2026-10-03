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
  confirm: async (id, paymentData = {}) => {
    const response = await api.patch(`/inventory/purchases/${id}/confirm`, paymentData);
    return response.data;
  },

  // Registrar la factura del proveedor sobre una orden confirmada/recibida
  registerInvoice: async (id, payload) => {
    const response = await api.patch(`/inventory/purchases/${id}/invoice`, payload);
    return response.data;
  },

  // PDF de la orden de compra (blob para abrir/descargar)
  getOrderPdf: async (id) => api.get(`/inventory/purchases/${id}/pdf`, { responseType: 'blob' }),

  // Enviar la orden al proveedor por correo: { to, cc, message }
  sendOrderEmail: async (id, payload) => {
    const response = await api.post(`/inventory/purchases/${id}/send-email`, payload);
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