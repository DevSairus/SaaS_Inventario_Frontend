// frontend/src/api/customers.js
import api from './axios';

const customersApi = {
  // Obtener todos los clientes
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.customer_type) queryParams.append('customer_type', params.customer_type);
    if (params.is_active !== undefined) queryParams.append('is_active', params.is_active);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    return api.get(`/customers?${queryParams.toString()}`);
  },

  // Obtener cliente por ID
  getById: (id) => api.get(`/customers/${id}`),

  // Crear nuevo cliente
  create: (data) => api.post('/customers', data),

  // Actualizar cliente
  update: (id, data) => api.put(`/customers/${id}`, data),

  // Eliminar cliente
  delete: (id) => api.delete(`/customers/${id}`),

  // Buscar clientes por nombre o NIT
  search: (query) => api.get(`/customers/search?q=${query}`),

  // Obtener historial de compras del cliente
  getSalesHistory: (id) => api.get(`/customers/${id}/sales`),

  // Obtener estadísticas del cliente
  getStats: (id) => api.get(`/customers/${id}/stats`),
};

export default customersApi;