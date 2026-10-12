// frontend/src/api/labelPrinting.js
// Perfiles de impresión de etiquetas del tenant (backend: labelPrinting.controller.js).
import api from './axios';

export const labelPrintingAPI = {
  get: async () => (await api.get('/tenant/label-printing')).data,
  save: async (payload) => (await api.put('/tenant/label-printing', payload)).data,
};
