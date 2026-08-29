// frontend/src/api/dian.js
import api from './axios';

// ── Configuración ────────────────────────────────────────────
export const getDianConfig        = ()     => api.get('/dian/config');
export const updateDianConfig     = (data) => api.put('/dian/config', data);

// ── Resoluciones ─────────────────────────────────────────────
export const getDianResolutions   = ()     => api.get('/dian/resolutions');
export const createDianResolution = (data) => api.post('/dian/resolutions', data);
export const updateDianResolution = (id, data) => api.put(`/dian/resolutions/${id}`, data);
export const deactivateResolution = (id)   => api.delete(`/dian/resolutions/${id}`);
export const reactivateResolution = (id)   => api.post(`/dian/resolutions/${id}/reactivate`);
export const deleteResolution     = (id)   => api.delete(`/dian/resolutions/${id}/permanent`);

// ── Catálogo DIVIPOLA (departamentos + municipios) ───────────
export const getDivipola          = ()     => api.get('/dian/divipola');

// ── Estado de habilitación ───────────────────────────────────
export const getHabilitacionStatus = (documentType = 'invoice') =>
  api.get('/dian/habilitacion-status', { params: { document_type: documentType } });

// ── Diagnóstico de certificado ───────────────────────────────
export const diagnoseCert         = ()    => api.get('/dian/diagnose-cert');

// ── Conectividad ─────────────────────────────────────────────
export const testDianConnection     = () => api.post('/dian/test-connection');
export const testDianConnectionProd = () => api.post('/dian/test-connection-prod');

// ── Set de pruebas (auto-test) ───────────────────────────────
export const sendAutoTestDocuments      = (count = 2, documentType = 'invoice') =>
  api.post('/dian/send-auto-test', { count, mode: 'invoices', document_type: documentType });
export const sendFullHabilitacionSet    = (documentType = 'invoice') =>
  api.post('/dian/send-auto-test', { mode: 'full', document_type: documentType });

// ── Log de eventos ───────────────────────────────────────────
export const getDianEvents        = (params = {}) => api.get('/dian/events', { params });

// ── Rango de numeración ──────────────────────────────────────
export const getNumberingRange    = ()    => api.get('/dian/numbering-range');

// ── Envío individual de facturas ─────────────────────────────
export const sendInvoice          = (saleId) => api.post(`/dian/send/${saleId}`);
export const sendCreditNoteRetry  = (saleId) => api.post(`/dian/send-credit-note/${saleId}`);
export const sendDebitNoteRetry   = (saleId) => api.post(`/dian/send-debit-note/${saleId}`);
export const checkDianStatus      = (saleId) => api.post(`/dian/check-status/${saleId}`);
export const sendToTestSet        = (saleId) => api.post(`/dian/test-set/${saleId}`);

// ── Notas crédito / débito ───────────────────────────────────
export const createCreditNote = (saleId, data) => api.post(`/dian/create-credit-note/${saleId}`, data);
export const createDebitNote  = (saleId, data) => api.post(`/dian/create-debit-note/${saleId}`, data);

// ── Documento Soporte (Purchase/Expense — Fase 3) ─────────────
// sourceType: 'purchase' | 'expense'. `seller` (opcional) sólo aplica a
// expense sin supplier_id — datos ad-hoc capturados en el modal (ver
// AdHocSellerModal.jsx); se ignora si el origen ya tiene proveedor.
export const sendSupportDocument = (sourceType, sourceId, seller = null) =>
  api.post(`/dian/send-support-document/${sourceType}/${sourceId}`, seller ? { seller } : {});
export const getSupportDocumentStatus = (sourceType, sourceId) =>
  api.get(`/dian/support-document/${sourceType}/${sourceId}`);
export const checkSupportDocumentStatus = (sourceType, sourceId) =>
  api.post(`/dian/check-status-support-document/${sourceType}/${sourceId}`);
// Listado plano de todos los Documentos Soporte del tenant (pantalla
// dedicada en Tesorería — antes solo se veían entrando a la compra/gasto).
export const getSupportDocuments = (params = {}) =>
  api.get('/dian/support-documents', { params });

// ── Nota de Ajuste al Documento Soporte (tipo DIAN 95 — Fase 4) ─────
// Solo aplica sobre un Documento Soporte ya aceptado por la DIAN
// (supportDocumentId, no sourceId/sourceType).
export const createSupportDocumentAdjustment = (supportDocumentId, data) =>
  api.post(`/dian/support-document/${supportDocumentId}/adjustment`, data);
export const getSupportDocumentAdjustments = (supportDocumentId) =>
  api.get(`/dian/support-document/${supportDocumentId}/adjustments`);
// Reintenta el envío de una Nota de Ajuste en 'rejected'/'pending' (ej. tras
// un error de red transitorio con el webservice DIAN) reutilizando el mismo
// registro/número, sin crear una nueva.
export const resendSupportDocumentAdjustment = (adjustmentId) =>
  api.post(`/dian/support-document-adjustment/${adjustmentId}/resend`);

// ── Default export (compatibilidad con DianSettingsPage) ─────
const dianAPI = {
  getConfig:            getDianConfig,
  updateConfig:         updateDianConfig,
  getResolutions:       getDianResolutions,
  createResolution:     createDianResolution,
  updateResolution:     updateDianResolution,
  deleteResolution:     deactivateResolution,
  reactivateResolution,
  deletePermanent:      deleteResolution,
  getDivipola,
  getHabilitacionStatus,
  diagnoseCert,
  testConnection:       testDianConnection,
  testConnectionProd:   testDianConnectionProd,
  sendAutoTest:         sendAutoTestDocuments,
  sendFullSet:          sendFullHabilitacionSet,
  getEvents:            getDianEvents,
  getNumberingRange,
  sendInvoice,
  checkStatus:          checkDianStatus,
  sendToTestSet,
  createCreditNote,
  createDebitNote,
  sendSupportDocument,
  getSupportDocumentStatus,
  checkSupportDocumentStatus,
  getSupportDocuments,
};

export default dianAPI;
