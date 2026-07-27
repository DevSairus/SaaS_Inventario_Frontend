import api from './axios';

// FAQ
export const getFaq = async () => {
  const response = await api.get('/support/faq');
  return response.data;
};

export const submitFaqFeedback = async (articleId, helpful) => {
  const response = await api.post(`/support/faq/${articleId}/feedback`, { helpful });
  return response.data;
};

// Tickets
export const createTicket = async (data, files) => {
  const formData = new FormData();
  if (data.subject) formData.append('subject', data.subject);
  if (data.category) formData.append('category', data.category);
  if (data.description) formData.append('description', data.description);
  if (data.priority) formData.append('priority', data.priority);
  if (files) {
    for (const file of files) {
      formData.append('attachments', file);
    }
  }
  const response = await api.post('/support/tickets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getMyTickets = async (params = {}) => {
  const response = await api.get('/support/tickets', { params });
  return response.data;
};

export const getTicketDetail = async (id) => {
  const response = await api.get(`/support/tickets/${id}`);
  return response.data;
};

export const addTicketMessage = async (ticketId, message, files) => {
  const formData = new FormData();
  formData.append('message', message);
  if (files) {
    for (const file of files) {
      formData.append('attachments', file);
    }
  }
  const response = await api.post(`/support/tickets/${ticketId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Remote support — cliente
export const getPendingRemoteSessions = async () => {
  const response = await api.get('/support/remote-sessions/pending');
  return response.data;
};

export const respondRemoteSession = async (sessionId, consent) => {
  const response = await api.put(`/support/remote-sessions/${sessionId}/respond`, { consent });
  return response.data;
};

export const endRemoteSession = async (sessionId) => {
  const response = await api.put(`/support/remote-sessions/${sessionId}/end`);
  return response.data;
};

export const rateTicket = async (ticketId, rating) => {
  const response = await api.put(`/support/tickets/${ticketId}/rate`, { rating });
  return response.data;
};
