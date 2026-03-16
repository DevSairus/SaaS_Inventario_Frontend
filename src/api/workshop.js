import axios from './axios';

// ── Vehicles ──────────────────────────────────────────────
export const vehiclesApi = {
  list: (params) => axios.get('/workshop/vehicles', { params }),
  getById: (id) => axios.get(`/workshop/vehicles/${id}`),
  getHistory: (id) => axios.get(`/workshop/vehicles/${id}/history`),
  create: (data) => axios.post('/workshop/vehicles', data),
  update: (id, data) => axios.put(`/workshop/vehicles/${id}`, data),
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
  // Enviar enlace OT por WhatsApp (WPPConnect)
  sendWhatsApp: (id) => axios.post(`/workshop/work-orders/${id}/send-whatsapp`),
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