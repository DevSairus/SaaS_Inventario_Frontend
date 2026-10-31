// frontend/src/api/accountsReceivable.js
import api from './axios';

export const accountsReceivableAPI = {
  // Obtener resumen de cartera
  getSummary: async (params = {}) => {
    const response = await api.get('/accounts-receivable/summary', { params });
    return response.data;
  },

  // Documentos con saldo pendiente, paginados (?page=&limit=&search=)
  getDocuments: async (params = {}, config = {}) => {
    const response = await api.get('/accounts-receivable/documents', { params, ...config });
    return response.data;
  },

  // Obtener reporte de antigüedad
  getAgingReport: async () => {
    const response = await api.get('/accounts-receivable/aging-report');
    return response.data;
  },

  // Obtener cartera de un cliente
  getCustomerReceivables: async (customerId) => {
    const response = await api.get(`/accounts-receivable/customer/${customerId}`);
    return response.data;
  },

  // Obtener historial de pagos de una factura
  getPaymentHistory: async (saleId) => {
    const response = await api.get(`/accounts-receivable/payment-history/${saleId}`);
    return response.data;
  }
};