// frontend/src/api/dianDocuments.js
// Registro de documentos recibidos a partir del Excel del portal DIAN.
import api from './axios';

export const dianDocumentsAPI = {
  upload: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return (await api.post('/invoice-import/dian-documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  list: async (params = {}) => (await api.get('/invoice-import/dian-documents', { params })).data,
  getById: async (id) => (await api.get(`/invoice-import/dian-documents/${id}`)).data,
  fetchXml: async (id) => (await api.post(`/invoice-import/dian-documents/${id}/fetch-xml`)).data,
  setStatus: async (ids, status, discard_reason) => (
    await api.patch('/invoice-import/dian-documents/batch', { ids, status, discard_reason })
  ).data,
  loadBatch: async (ids, profit_margin) => (
    await api.post('/invoice-import/dian-documents/load-batch', { ids, profit_margin }, { timeout: 10 * 60 * 1000 })
  ).data,
};
