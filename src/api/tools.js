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
