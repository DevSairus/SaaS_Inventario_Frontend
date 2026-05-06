// frontend/src/api/dian.js
import api from './axios';

// ── Configuración ────────────────────────────────────────────
export const getDianConfig        = ()     => api.get('/dian/config');
export const updateDianConfig     = (data) => api.put('/dian/config', data);

// ── Resoluciones ─────────────────────────────────────────────
export const getDianResolutions   = ()     => api.get('/dian/resolutions');
export const createDianResolution = (data) => api.post('/dian/resolutions', data);
export const deactivateResolution = (id)   => api.delete(`/dian/resolutions/${id}`);

// ── Estado de habilitación ───────────────────────────────────
export const getHabilitacionStatus = ()   => api.get('/dian/habilitacion-status');

// ── Diagnóstico de certificado ───────────────────────────────
export const diagnoseCert         = ()    => api.get('/dian/diagnose-cert');

// ── Conectividad ─────────────────────────────────────────────
export const testDianConnection     = () => api.post('/dian/test-connection');
export const testDianConnectionProd = () => api.post('/dian/test-connection-prod');

// ── Set de pruebas (auto-test) ───────────────────────────────
export const sendAutoTestDocuments      = (count = 2) => api.post('/dian/send-auto-test', { count, mode: 'invoices' });
export const sendFullHabilitacionSet    = ()           => api.post('/dian/send-auto-test', { mode: 'full' });

// ── Log de eventos ───────────────────────────────────────────
export const getDianEvents        = (params = {}) => api.get('/dian/events', { params });

// ── Rango de numeración ──────────────────────────────────────
export const getNumberingRange    = ()    => api.get('/dian/numbering-range');

// ── Envío individual de facturas ─────────────────────────────
export const sendInvoice          = (saleId) => api.post(`/dian/send/${saleId}`);
export const checkDianStatus      = (saleId) => api.post(`/dian/check-status/${saleId}`);
export const sendToTestSet        = (saleId) => api.post(`/dian/test-set/${saleId}`);

// ── Default export (compatibilidad con DianSettingsPage) ─────
const dianAPI = {
  getConfig:            getDianConfig,
  updateConfig:         updateDianConfig,
  getResolutions:       getDianResolutions,
  createResolution:     createDianResolution,
  deleteResolution:     deactivateResolution,
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
};

export default dianAPI;
