// frontend/src/api/customerAdvances.js
import api from './axios';

export const customerAdvancesAPI = {
  // Listado + filtros + resumen agregado (para el informe)
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.customer_id) query.append('customer_id', params.customer_id);
    if (params.branch_id) query.append('branch_id', params.branch_id);
    if (params.status) query.append('status', params.status);
    if (params.from_date) query.append('from_date', params.from_date);
    if (params.to_date) query.append('to_date', params.to_date);
    if (params.search) query.append('search', params.search);
    if (params.limit) query.append('limit', params.limit);
    if (params.offset) query.append('offset', params.offset);
    return api.get(`/customer-advances?${query.toString()}`);
  },

  // Detalle de un anticipo + aplicaciones (drill-down)
  getById: (id) => api.get(`/customer-advances/${id}`),

  // Registrar un anticipo nuevo
  create: (data) => api.post('/customer-advances', data),

  // Devolver un anticipo (total o parcial)
  refund: (id, data) => api.post(`/customer-advances/${id}/refund`, data),

  // Anular un anticipo (antes de que tenga aplicaciones/devoluciones)
  void: (id, data) => api.post(`/customer-advances/${id}/void`, data),

  // Anticipos disponibles de un cliente, orden FIFO (selector al facturar)
  getAvailableForCustomer: (customerId) =>
    api.get(`/customers/${customerId}/advances/available`),

  // Aplicar uno o varios anticipos a una venta con saldo pendiente
  applyToSale: (saleId, applications) =>
    api.post(`/sales/${saleId}/apply-advance`, { applications }),
};

export default customerAdvancesAPI;
