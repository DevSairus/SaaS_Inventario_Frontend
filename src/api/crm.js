// frontend/src/api/crm.js
// Endpoints del módulo CRM. Todo bajo /api/crm/*, protegido en el backend con
// requireModule('crm') — si el tenant no tiene el módulo activo estas llamadas
// devuelven 403; las páginas que las usan deben chequear enabledModules antes
// de invocarlas (ver store/tenantStore.js).
import api from './axios';

const crmApi = {
  // ── Vista 360° del cliente ────────────────────────────────────────────────
  getCustomerTimeline: (customerId) => api.get(`/crm/customers/${customerId}/timeline`),

  // ── Interacciones (bitácora de contacto) ─────────────────────────────────
  listInteractions: (customerId) => api.get(`/crm/customers/${customerId}/interactions`),
  createInteraction: (customerId, data) => api.post(`/crm/customers/${customerId}/interactions`, data),

  // ── Asignación de cuenta (§5-bis) — solo manager/admin/super_admin ───────
  assignAccount: (customerId, data) => api.patch(`/crm/customers/${customerId}/assign`, data),

  // ── Pipeline de oportunidades ─────────────────────────────────────────────
  listOpportunities: (params = {}) => api.get('/crm/opportunities', { params }),
  getOpportunity: (id) => api.get(`/crm/opportunities/${id}`),
  createOpportunity: (data) => api.post('/crm/opportunities', data),
  updateOpportunity: (id, data) => api.patch(`/crm/opportunities/${id}`, data),
  updateOpportunityStage: (id, data) => api.patch(`/crm/opportunities/${id}/stage`, data),

  // ── Bandeja de seguimiento ────────────────────────────────────────────────
  listFollowUps: (params = {}) => api.get('/crm/followups', { params }),
  createFollowUp: (data) => api.post('/crm/followups', data),
  completeFollowUp: (id) => api.patch(`/crm/followups/${id}/complete`),
  cancelFollowUp: (id) => api.patch(`/crm/followups/${id}/cancel`),

  // ── Etiquetas ──────────────────────────────────────────────────────────────
  listTags: () => api.get('/crm/tags'),
  createTag: (data) => api.post('/crm/tags', data),
  assignTag: (customerId, tagId) => api.post('/crm/tags/assign', { customer_id: customerId, customer_tag_id: tagId }),
  unassignTag: (customerId, tagId) => api.delete(`/crm/tags/${customerId}/${tagId}`),

  // ── Dashboard de decisión ────────────────────────────────────────────────
  getDashboard: (params = {}) => api.get('/crm/dashboard', { params }),
  getActivityFeed: (params = {}) => api.get('/crm/dashboard/activity', { params }),
  getNotificationsSummary: () => api.get('/crm/dashboard/notifications'),

  // ── Integración con Meta (Lead Ads) ──────────────────────────────────────
  getMetaIntegrationStatus: () => api.get('/crm/meta-integration/status'),
  startMetaOwnConnection: () => api.post('/crm/meta-integration/connect/own'),
  connectMetaPitboxMode: () => api.post('/crm/meta-integration/connect/pitbox'),
  disconnectMetaIntegration: () => api.delete('/crm/meta-integration/disconnect'),

  // ── Etapas de pipeline configurables (Fase B.4) ──────────────────────────
  listPipelineStages: () => api.get('/crm/pipeline-stages'),
  createPipelineStage: (data) => api.post('/crm/pipeline-stages', data),
  updatePipelineStage: (id, data) => api.patch(`/crm/pipeline-stages/${id}`, data),
  removePipelineStage: (id) => api.delete(`/crm/pipeline-stages/${id}`),
  reorderPipelineStages: (ids) => api.patch('/crm/pipeline-stages/reorder', { ids }),

  // ── Motivos de pérdida configurables (Fase B.4) ──────────────────────────
  listLossReasons: () => api.get('/crm/loss-reasons'),
  createLossReason: (data) => api.post('/crm/loss-reasons', data),
  updateLossReason: (id, data) => api.patch(`/crm/loss-reasons/${id}`, data),
  removeLossReason: (id) => api.delete(`/crm/loss-reasons/${id}`),

  // ── Plantillas de mensaje (Fase B.3) ──────────────────────────────────────
  listMessageTemplates: (params = {}) => api.get('/crm/message-templates', { params }),
  createMessageTemplate: (data) => api.post('/crm/message-templates', data),
  updateMessageTemplate: (id, data) => api.patch(`/crm/message-templates/${id}`, data),
  removeMessageTemplate: (id) => api.delete(`/crm/message-templates/${id}`),
  renderMessageTemplate: (id, data) => api.post(`/crm/message-templates/${id}/render`, data),

  // ── Automatizaciones configurables (Fase C.1) ─────────────────────────────
  listAutomationRules: () => api.get('/crm/automation-rules'),
  createAutomationRule: (data) => api.post('/crm/automation-rules', data),
  updateAutomationRule: (id, data) => api.patch(`/crm/automation-rules/${id}`, data),
  removeAutomationRule: (id) => api.delete(`/crm/automation-rules/${id}`),
};

export default crmApi;