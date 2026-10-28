import axios from './axios';

/**
 * Autorizaciones del cliente: habeas data y acta de ingreso del vehículo
 * (backend: controllers/legal/consents.controller.js).
 */
export const consentsAPI = {
  preview: async (kind, businessConfig) => {
    const res = await axios.post('/consents/preview', { kind, business_config: businessConfig });
    return res.data?.data;
  },
  intakeChecklist: async () => {
    const res = await axios.get('/consents/intake-checklist');
    return res.data?.data;
  },
  forCustomer: async (customerId) => {
    const res = await axios.get(`/consents/customer/${customerId}`);
    return res.data?.data;
  },
  forWorkOrder: async (workOrderId) => {
    const res = await axios.get(`/consents/work-order/${workOrderId}`);
    return res.data?.data;
  },
  create: async (payload) => {
    const res = await axios.post('/consents', payload);
    return res.data?.data;
  },
  get: async (id) => {
    const res = await axios.get(`/consents/${id}`);
    return res.data?.data;
  },
  sendLink: async (id, channels) => {
    const res = await axios.post(`/consents/${id}/send-link`, { channels });
    return res.data?.data;
  },
  sendOtp: async (id, channel) => {
    const res = await axios.post(`/consents/${id}/otp`, { channel });
    return res.data?.data;
  },
  verify: async (id, payload) => {
    const res = await axios.post(`/consents/${id}/verify`, payload);
    return res.data?.data;
  },
  // payload + file (escaneo del formato firmado, opcional) -> multipart
  registerPhysical: async (id, { file, ...payload }) => {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => { if (v !== undefined && v !== null) form.append(k, String(v)); });
    if (file) form.append('document', file);
    const res = await axios.post(`/consents/${id}/physical`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data?.data;
  },
  // Abre el documento firmado: en Cloudinary el backend responde con un
  // enlace temporal (JSON); en local, con el archivo.
  openPhysicalDocument: async (id) => {
    const res = await axios.get(`/consents/${id}/physical-document`, { responseType: 'blob' });
    const type = res.data.type || '';
    if (type.includes('application/json')) {
      const { data } = JSON.parse(await res.data.text());
      window.open(data.url, '_blank');
    } else {
      window.open(URL.createObjectURL(res.data), '_blank');
    }
  },
  cancel: async (id) => {
    const res = await axios.post(`/consents/${id}/cancel`);
    return res.data?.data;
  },
  revoke: async (id, reason) => {
    const res = await axios.post(`/consents/${id}/revoke`, { reason });
    return res.data?.data;
  },
  marketingOptOut: async (customerId, reason) => {
    const res = await axios.post(`/consents/customer/${customerId}/marketing-opt-out`, { reason });
    return res.data;
  },
  pdfBlob: async (id) => {
    const res = await axios.get(`/consents/${id}/pdf`, { responseType: 'blob' });
    return res.data;
  },
};
