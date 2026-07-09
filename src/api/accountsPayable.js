// frontend/src/api/accountsPayable.js
import api from './axios';

export const accountsPayableAPI = {
  // Obtener resumen de cuentas por pagar
  getSummary: async (params = {}) => {
    const response = await api.get('/accounts-payable/summary', { params });
    return response.data;
  },

  // Obtener reporte de antigüedad
  getAgingReport: async () => {
    const response = await api.get('/accounts-payable/aging-report');
    return response.data;
  },

  // Obtener cuentas por pagar de un proveedor
  getSupplierPayables: async (supplierId) => {
    const response = await api.get(`/accounts-payable/supplier/${supplierId}`);
    return response.data;
  },

  // Obtener historial de pagos de una compra
  getPaymentHistory: async (purchaseId) => {
    const response = await api.get(`/accounts-payable/payment-history/${purchaseId}`);
    return response.data;
  },

  // Registrar un abono a proveedor
  registerPayment: async (purchaseId, payload) => {
    const response = await api.post(`/accounts-payable/${purchaseId}/payments`, payload);
    return response.data;
  }
};
