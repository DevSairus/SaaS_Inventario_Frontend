// frontend/src/api/posTickets.js
// Tirillas para impresora POS (bloques que arma el backend, ver utils/posPrinting.js).
import api from './axios';

export const posTicketsAPI = {
  sale: (id) => api.get(`/pos-tickets/sale/${id}`),
  receipt: (id) => api.get(`/pos-tickets/receipt/${id}`),
  payment: (paymentId) => api.get(`/pos-tickets/payment/${paymentId}`),
  cashSession: (id) => api.get(`/pos-tickets/cash-session/${id}`),
};
