import axios from './axios';

// ── Vehicles ──────────────────────────────────────────────
export const vehiclesApi = {
  list: (params) => axios.get('/workshop/vehicles', { params }),
  getById: (id) => axios.get(`/workshop/vehicles/${id}`),
  getHistory: (id) => axios.get(`/workshop/vehicles/${id}/history`),
  create: (data) => axios.post('/workshop/vehicles', data),
  update: (id, data) => axios.put(`/workshop/vehicles/${id}`, data),
  remove: (id) => axios.delete(`/workshop/vehicles/${id}`),
};

// ── Work Orders ───────────────────────────────────────────
export const workOrdersApi = {
  list: (params) => axios.get('/workshop/work-orders', { params }),
  getById: (id) => axios.get(`/workshop/work-orders/${id}`),
  create: (data) => axios.post('/workshop/work-orders', data),
  update: (id, data) => axios.put(`/workshop/work-orders/${id}`, data),
  changeStatus: (id, data) => axios.patch(`/workshop/work-orders/${id}/status`, data),
  addItem: (id, data) => axios.post(`/workshop/work-orders/${id}/items`, data),
  removeItem: (id, itemId) => axios.delete(`/workshop/work-orders/${id}/items/${itemId}`),
  generateSale: (id, data = {}) => axios.post(`/workshop/work-orders/${id}/generate-sale`, data),
  uploadPhotos: (id, phase, formData) =>
    axios.post(`/workshop/work-orders/${id}/photos/${phase}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deletePhoto: (id, phase, index) => axios.delete(`/workshop/work-orders/${id}/photos/${phase}/${index}`),
  // PDFs
  getPDF: (id, type, params = {}) =>
    axios.get(`/workshop/work-orders/${id}/pdf`, { params: { type, ...params }, responseType: 'blob' }),
  // Checklist ingreso
  updateChecklist: (id, data) => axios.patch(`/workshop/work-orders/${id}/checklist`, data),
  // Compartir link público
  generateShareToken: (id) => axios.post(`/workshop/work-orders/${id}/share-token`),
  // Enviar enlace OT por WhatsApp (wa.me)
  sendWhatsApp: (id) => axios.post(`/workshop/work-orders/${id}/send-whatsapp`),
  // Cotización con aprobación del cliente
  sendQuoteRequest: (id) => axios.post(`/workshop/work-orders/${id}/quote-requests`),
  resendQuoteRequest: (id, quoteRequestId) => axios.post(`/workshop/work-orders/${id}/quote-requests/${quoteRequestId}/resend`),
  applyApprovedItems: (id, quoteRequestId) => axios.post(`/workshop/work-orders/${id}/quote-requests/${quoteRequestId}/apply`),
  // Notificaciones de cotizaciones respondidas por el cliente
  getPendingQuoteNotifications: () => axios.get('/workshop/work-orders/quote-notifications/pending'),
  markQuoteNotificationSeen: (quoteRequestId) => axios.post(`/workshop/work-orders/quote-notifications/${quoteRequestId}/seen`),
  // Listado transversal de cotizaciones de OT (todas las rondas, todas las OTs) — usado en QuotesPage.jsx
  getWorkshopQuotes: (params) => axios.get('/workshop/work-orders/quote-requests', { params }),
};

// ── Commission Settlements ────────────────────────────────
export const commissionApi = {
  getTechnicians: () => axios.get('/workshop/commission-settlements/technicians'),
  getTechniciansFiltered: (role) => axios.get(`/workshop/commission-settlements/technicians${role ? `?role=${role}` : ''}`),
  preview: (params) => axios.get('/workshop/commission-settlements/preview', { params }),
  create: (data) => axios.post('/workshop/commission-settlements', data),
  list: (params) => axios.get('/workshop/commission-settlements', { params }),
  getById: (id) => axios.get(`/workshop/commission-settlements/${id}`),
  getProductsReport: (params) => axios.get('/workshop/commission-settlements/products-report', { params }),
  // Liquidaciones de productos
  productPreview: (params) => axios.get('/workshop/commission-settlements/products-preview', { params }),
  createProductSettlement: (data) => axios.post('/workshop/commission-settlements/products', data),
  listProductSettlements: (params) => axios.get('/workshop/commission-settlements/products', { params }),
  getProductSettlementById: (id) => axios.get(`/workshop/commission-settlements/products/${id}`),
};

// ── Diagramas interactivos de intervención ────────────────
export const diagramTemplatesApi = {
  list: (params) => axios.get('/workshop/diagram-templates', { params }),
  getById: (id) => axios.get(`/workshop/diagram-templates/${id}`),
  updatePoints: (id, points) => axios.patch(`/workshop/diagram-templates/${id}/points`, { points }),
};

export const diagnosisMarksApi = {
  list: (workOrderId) => axios.get(`/workshop/work-orders/${workOrderId}/diagnosis-marks`),
  create: (workOrderId, data) => axios.post(`/workshop/work-orders/${workOrderId}/diagnosis-marks`, data),
  update: (workOrderId, markId, data) => axios.put(`/workshop/work-orders/${workOrderId}/diagnosis-marks/${markId}`, data),
  remove: (workOrderId, markId) => axios.delete(`/workshop/work-orders/${workOrderId}/diagnosis-marks/${markId}`),
  generateItems: (workOrderId, markIds) => axios.post(`/workshop/work-orders/${workOrderId}/diagnosis-marks/generate-items`, { mark_ids: markIds }),
};