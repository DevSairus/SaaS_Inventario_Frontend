import api from './axios';

export const movementsAPI = {
  // Obtener todos los movimientos
  getAll: async (params = {}) => {
    const response = await api.get('/inventory/movements', { params });
    return response.data;
  },

  // Obtener movimientos de una venta específica
  getBySaleId: async (saleId) => {
    const response = await api.get('/inventory/movements', {
      params: { reference_type: 'sale', reference_id: saleId }
    });
    return response.data;
  },

  // Obtener kardex de un producto
  getKardex: async (productId, params = {}) => {
    const response = await api.get(`/inventory/movements/kardex/${productId}`, { params });
    return response.data;
  },

  // Recalcular el kardex en orden de fecha ({ product_id? , from?, dry_run })
  recalculateKardex: async (payload) => {
    const response = await api.post('/inventory/movements/kardex/recalculate', payload, { timeout: 600000 });
    return response.data;
  },

  // Obtener estadísticas
  getStats: async () => {
    const response = await api.get('/inventory/movements/stats');
    return response.data;
  }
};