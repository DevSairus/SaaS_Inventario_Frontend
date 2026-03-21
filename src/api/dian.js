// frontend/src/api/dian.js
import api from './axios';

// ── Configuración DIAN ──────────────────────────────────────────────
export const getDianConfig = () =>
  api.get('/dian/config');

export const updateDianConfig = (data) =>
  api.put('/dian/config', data);

// ── Resoluciones ────────────────────────────────────────────────────
export const getDianResolutions = () =>
  api.get('/dian/resolutions');

export const createDianResolution = (data) =>
  api.post('/dian/resolutions', data);

export const deactivateResolution = (id) =>
  api.delete(`/dian/resolutions/${id}`);

// ── Envío de documentos ─────────────────────────────────────────────
export const sendInvoiceToDian = (saleId) =>
  api.post(`/dian/send/${saleId}`);

export const checkDianStatus = (saleId) =>
  api.post(`/dian/check-status/${saleId}`);

export const sendToTestSet = (saleId) =>
  api.post(`/dian/test-set/${saleId}`);

// ── Diagnóstico y habilitación ──────────────────────────────────────
export const testDianConnection = () =>
  api.post('/dian/test-connection');

export const testDianConnectionProd = () =>
  api.post('/dian/test-connection-prod');

export const getNumberingRange = () =>
  api.get('/dian/numbering-range');

export const getHabilitacionStatus = () =>
  api.get('/dian/habilitacion-status');

// ── Auditoría ───────────────────────────────────────────────────────
export const getDianEvents = (params = {}) =>
  api.get('/dian/events', { params });

// ── Pruebas automáticas de habilitación ─────────────────────────────
export const sendAutoTestDocuments = (count = 1) =>
  api.post('/dian/send-auto-test', { count });

// ── Diagnóstico del certificado P12 ─────────────────────────────────
export const diagnoseCert = () =>
  api.get('/dian/diagnose-cert');