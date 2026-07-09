// frontend/src/api/expenses.js
import api from './axios';

export const expensesAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/expenses', { params });
    return response.data;
  },
  getSummary: async (params = {}) => {
    const response = await api.get('/expenses/summary', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  },
  create: async (payload) => {
    const response = await api.post('/expenses', payload);
    return response.data;
  },
  update: async (id, payload) => {
    const response = await api.put(`/expenses/${id}`, payload);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },
  registerPayment: async (id, payload) => {
    const response = await api.post(`/expenses/${id}/payments`, payload);
    return response.data;
  }
};

export const EXPENSE_CATEGORIES = [
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'servicios_publicos', label: 'Servicios Públicos' },
  { value: 'nomina', label: 'Nómina' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'insumos_oficina', label: 'Insumos de Oficina' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'honorarios', label: 'Honorarios' },
  { value: 'otro', label: 'Otro' }
];
