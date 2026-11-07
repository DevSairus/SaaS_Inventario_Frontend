import axios from './axios';

/**
 * Aprobaciones (backend/src/routes/approvals.routes.js y, para el enlace del
 * correo sin sesión, /public/approvals/:token).
 */
export const getApprovalsInbox = async () => (await axios.get('/approvals/inbox')).data;
export const getApprovalsCount = async () => (await axios.get('/approvals/count')).data;
export const getDocumentApprovals = async (type, id) => (await axios.get(`/approvals/document/${type}/${id}`)).data;
// decision: 'approve' | 'reject' (rechazar exige comentario)
export const decideApproval = async (requestId, decision, comment) =>
  (await axios.post(`/approvals/requests/${requestId}/decision`, { decision, comment })).data;

export const getApprovalRules = async () => (await axios.get('/approvals/rules')).data;
export const createApprovalRule = async (data) => (await axios.post('/approvals/rules', data)).data;
export const updateApprovalRule = async (id, data) => (await axios.put(`/approvals/rules/${id}`, data)).data;
export const deleteApprovalRule = async (id) => (await axios.delete(`/approvals/rules/${id}`)).data;

export const getPublicApproval = async (token) => (await axios.get(`/public/approvals/${token}`)).data;
export const decidePublicApproval = async (token, decision, comment) =>
  (await axios.post(`/public/approvals/${token}`, { decision, comment })).data;
