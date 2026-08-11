// frontend/src/api/sales.js
import api from './axios';

const salesApi = {
  // Obtener todas las ventas con filtros
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.quote_status) params.append('quote_status', filters.quote_status);
    if (filters.customer_id) params.append('customer_id', filters.customer_id);
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.document_type) params.append('document_type', filters.document_type);
    if (filters.customer_name) params.append('customer_name', filters.customer_name);
    if (filters.vehicle_plate) params.append('vehicle_plate', filters.vehicle_plate);
    if (filters.branch_id) params.append('branch_id', filters.branch_id);
    if (filters.quote_view) params.append('quote_view', 'true');
    
    return api.get(`/sales?${params.toString()}`);
  },

  // Obtener una venta por ID
  getById: (id) => api.get(`/sales/${id}`),

  // Crear nueva venta
  create: (data) => api.post('/sales', data),

  // Actualizar venta
  update: (id, data) => api.put(`/sales/${id}`, data),

  // Confirmar venta (actualiza inventario)
  confirm: (id, paymentData) => api.post(`/sales/${id}/confirm`, paymentData),

  // Cancelar venta
  cancel: (id) => api.post(`/sales/${id}/cancel`),

  // Marcar como entregada
  markDelivered: (id, deliveryDate) => 
    api.post(`/sales/${id}/deliver`, { delivery_date: deliveryDate }),

  // Registrar pago
  registerPayment: (id, paymentData) => 
    api.post(`/sales/${id}/payments`, paymentData),

  // Eliminar venta (solo si está en borrador)
  delete: (id) => api.delete(`/sales/${id}`),

  // Generar PDF
  generatePDF: (id) => api.get(`/sales/${id}/pdf`, { responseType: 'blob' }),
  // Enviar por WhatsApp
  sendWhatsApp: (id) => api.post(`/sales/${id}/send-whatsapp`),
  // Generar/reutilizar enlace público para copiar directamente (sin WhatsApp)
  generateShareLink: (id) => api.post(`/sales/${id}/share-link`),

  generatePaymentReceipt: (id, paymentIndex) => api.get(`/sales/${id}/payment-receipt`, { params: { payment_index: paymentIndex }, responseType: 'blob' }),

  // Obtener estadísticas
  getStats: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    
    return api.get(`/sales/stats?${params.toString()}`);
  },

  // Convertir cotización en Orden de Trabajo (solo tenants con módulo Taller)
  convertToWorkOrder: (id, data) => api.post(`/sales/${id}/convert-to-work-order`, data),
};

// Mapa de intervención sobre una cotización — mismo patrón que
// diagnosisMarksApi en api/workshop.js, pero apuntando a /sales/:id/...
export const saleDiagnosisMarksApi = {
  list: (saleId) => api.get(`/sales/${saleId}/diagnosis-marks`),
  create: (saleId, data) => api.post(`/sales/${saleId}/diagnosis-marks`, data),
  update: (saleId, markId, data) => api.put(`/sales/${saleId}/diagnosis-marks/${markId}`, data),
  remove: (saleId, markId) => api.delete(`/sales/${saleId}/diagnosis-marks/${markId}`),
  generateItems: (saleId, markIds) => api.post(`/sales/${saleId}/diagnosis-marks/generate-items`, { mark_ids: markIds }),
};

export default salesApi;