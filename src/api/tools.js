import axios from './axios';

/**
 * API de herramientas (módulo Proyectos, Fase 3): hoja de vida, entregas y
 * devoluciones con acta, mantenimientos, calibraciones y bajas.
 */

// params: search, category, state (available|assigned|due), status (maintenance|retired), include_retired
export const getTools = async (params = {}) => (await axios.get('/tools', { params })).data;
export const getTool = async (id) => (await axios.get(`/tools/${id}`)).data;
export const createTool = async (data) => (await axios.post('/tools', data)).data;
export const updateTool = async (id, data) => (await axios.put(`/tools/${id}`, data)).data;
export const assignTool = async (id, data) => (await axios.post(`/tools/${id}/assign`, data)).data;
export const returnToolAssignment = async (assignmentId, data) => (await axios.post(`/tools/assignments/${assignmentId}/return`, data)).data;
export const addToolEvent = async (id, data) => (await axios.post(`/tools/${id}/events`, data)).data;
export const setToolInService = async (id, inService, reason) => (await axios.post(`/tools/${id}/service`, { in_service: inService, reason })).data;
export const retireTool = async (id, data) => (await axios.post(`/tools/${id}/retire`, data)).data;
export const getToolResponsibles = async () => (await axios.get('/tools/options/responsibles')).data;
export const getToolFixedAssets = async () => (await axios.get('/tools/options/fixed-assets')).data;
export const getProjectTools = async (projectId) => (await axios.get(`/tools/project/${projectId}`)).data;

// Acta en PDF: kind 'entrega' | 'devolucion'. Se abre en una pestaña nueva.
export const openToolActa = async (assignmentId, kind) => {
  const res = await axios.get(`/tools/assignments/${assignmentId}/acta/${kind}`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// ── Lotes de herramientas por obra y etapa (checklist masivo) ──
export const getProjectToolBatches = async (projectId) => (await axios.get(`/tools/project/${projectId}/batches`)).data;
// entrega: { kind: 'delivery', stage_id?, batch_date?, notes?, employee_id|user_id|responsible_name, responsible_document?,
//            expected_return_date?, items: [{ tool_id, quantity?, delivery_condition?, delivery_notes? }], signatures? }
// devolución: { kind: 'return', ..., items: [{ assignment_id, return_condition?, lost_quantity?, return_notes? }], signatures? }
export const createToolBatch = async (projectId, data) => (await axios.post(`/tools/project/${projectId}/batches`, data)).data;
// { role: 'almacen'|'transportador'|'encargado_obra', name, document?, signature }
export const signToolBatch = async (batchId, data) => (await axios.post(`/tools/batches/${batchId}/sign`, data)).data;
export const openToolBatchActa = async (batchId) => {
  const res = await axios.get(`/tools/batches/${batchId}/acta`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
