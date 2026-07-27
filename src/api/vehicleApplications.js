import api from './axios';

export const vehicleApplicationsAPI = {
  // Obtener aplicaciones vehiculares de un producto
  getByProductId: async (productId) => {
    const response = await api.get(`/products/${productId}/vehicle-applications`);
    return response.data;
  },

  // Agregar aplicación vehicular
  add: async (productId, data) => {
    const response = await api.post(`/products/${productId}/vehicle-applications`, data);
    return response.data;
  },

  // Actualizar aplicación vehicular
  update: async (productId, appId, data) => {
    const response = await api.put(`/products/${productId}/vehicle-applications/${appId}`, data);
    return response.data;
  },

  // Eliminar aplicación vehicular
  remove: async (productId, appId) => {
    const response = await api.delete(`/products/${productId}/vehicle-applications/${appId}`);
    return response.data;
  },

  // Obtener marcas y líneas para autocompletado
  getBrandsAndLines: async () => {
    const response = await api.get('/products/vehicle-brands-lines');
    return response.data;
  }
};
