import api from './axios';

// Ubicaciones físicas de bodega (pasillo / estante / nivel), req. 2.2.
export const warehouseLocationsService = {
  // params: { warehouse_id?, search?, is_active?, page?, limit? }
  getAll: async (params = {}) => {
    const response = await api.get('/inventory/locations', { params });
    return response.data;
  },
  create: async (data) => (await api.post('/inventory/locations', data)).data,
  // { warehouse_id, aisles: ['A','B'], shelves: 5, levels: 3 }
  bulkCreate: async (data) => (await api.post('/inventory/locations/bulk', data)).data,
  update: async (id, data) => (await api.put(`/inventory/locations/${id}`, data)).data,
  remove: async (id) => (await api.delete(`/inventory/locations/${id}`)).data,
  // { location_id | null, product_ids: [] }
  assign: async (data) => (await api.post('/inventory/locations/assign', data)).data,
};
