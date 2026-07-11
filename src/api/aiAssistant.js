// frontend/src/api/aiAssistant.js
import api from './axios';

export const aiAssistantAPI = {
  // Chat
  sendMessage: async (message, conversation_id = null) => {
    const response = await api.post('/ai-assistant/chat', { message, conversation_id });
    return response.data;
  },
  listConversations: async () => {
    const response = await api.get('/ai-assistant/conversations');
    return response.data;
  },
  getConversation: async (id) => {
    const response = await api.get(`/ai-assistant/conversations/${id}`);
    return response.data;
  },

  // Propuestas (Fase 2)
  listProposals: async (status = 'pending') => {
    const response = await api.get('/ai-assistant/proposals', { params: { status } });
    return response.data;
  },
  getProposal: async (id) => {
    const response = await api.get(`/ai-assistant/proposals/${id}`);
    return response.data;
  },
  approveProposal: async (id) => {
    const response = await api.post(`/ai-assistant/proposals/${id}/approve`);
    return response.data;
  },
  rejectProposal: async (id, reason = '') => {
    const response = await api.post(`/ai-assistant/proposals/${id}/reject`, { reason });
    return response.data;
  },
};

export const PROPOSAL_ACTION_LABELS = {
  create_expense: 'Registrar gasto',
  register_expense_payment: 'Registrar abono a gasto',
  regenerate_journal_entry: 'Generar asiento contable faltante',
};

export const PROPOSAL_STATUS_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  executed: 'Ejecutada',
  failed: 'Falló',
};
