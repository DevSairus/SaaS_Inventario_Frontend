import api from './axios';

// FAQ CRUD
export const getFaqCategories = async () => {
  const response = await api.get('/superadmin/support/faq/categories');
  return response.data;
};

export const createFaqCategory = async (data) => {
  const response = await api.post('/superadmin/support/faq/categories', data);
  return response.data;
};

export const updateFaqCategory = async (id, data) => {
  const response = await api.put(`/superadmin/support/faq/categories/${id}`, data);
  return response.data;
};

export const deleteFaqCategory = async (id) => {
  const response = await api.delete(`/superadmin/support/faq/categories/${id}`);
  return response.data;
};

export const createFaqArticle = async (data) => {
  const response = await api.post('/superadmin/support/faq/articles', data);
  return response.data;
};

export const updateFaqArticle = async (id, data) => {
  const response = await api.put(`/superadmin/support/faq/articles/${id}`, data);
  return response.data;
};

export const deleteFaqArticle = async (id) => {
  const response = await api.delete(`/superadmin/support/faq/articles/${id}`);
  return response.data;
};

// Tickets
export const getSupportTickets = async (params = {}) => {
  const response = await api.get('/superadmin/support/tickets', { params });
  return response.data;
};

export const getSupportTicketDetail = async (id) => {
  const response = await api.get(`/superadmin/support/tickets/${id}`);
  return response.data;
};

export const updateSupportTicket = async (id, data) => {
  const response = await api.put(`/superadmin/support/tickets/${id}`, data);
  return response.data;
};

export const addSupportTicketMessage = async (ticketId, data, files) => {
  const formData = new FormData();
  if (data.message) formData.append('message', data.message);
  if (data.is_internal_note !== undefined) formData.append('is_internal_note', data.is_internal_note);
  if (files) {
    for (const file of files) {
      formData.append('attachments', file);
    }
  }
  const response = await api.post(`/superadmin/support/tickets/${ticketId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Stats
export const getSupportStats = async (params = {}) => {
  const response = await api.get('/superadmin/support/stats', { params });
  return response.data;
};

// Remote support — agente
export const createRemoteSession = async (ticketId, targetUserId, mode = 'view_only') => {
  const body = { mode };
  if (targetUserId) body.target_user_id = targetUserId;
  const response = await api.post(`/superadmin/support/tickets/${ticketId}/remote-session`, body);
  return response.data;
};

export const getRemoteSessions = async (params = {}) => {
  const response = await api.get('/superadmin/support/remote-sessions', { params });
  return response.data;
};

export const cancelRemoteSession = async (sessionId) => {
  const response = await api.delete(`/superadmin/support/remote-sessions/${sessionId}`);
  return response.data;
};

export const endRemoteSessionAdmin = async (sessionId) => {
  const response = await api.put(`/superadmin/support/remote-sessions/${sessionId}/end`);
  return response.data;
};

export const getTenantUsers = async (tenantId) => {
  const response = await api.get(`/superadmin/support/tenants/${tenantId}/users`);
  return response.data;
};
