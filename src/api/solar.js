import axios from './axios';

/**
 * Cotizador solar (módulo Proyectos, Fase 3): estudio → cotización → proyecto.
 */
export const getSolarSettings = async () => (await axios.get('/solar/settings')).data;
export const updateSolarSettings = async (data) => (await axios.put('/solar/settings', data)).data;
export const geocodeSolar = async (q) => (await axios.get('/solar/geocode', { params: { q } })).data;
export const getIrradiance = async (lat, lon) => (await axios.get('/solar/irradiance', { params: { lat, lon } })).data;
export const ocrEnergyBill = async (file) => {
  const form = new FormData();
  form.append('file', file);
  return (await axios.post('/solar/ocr', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90000 })).data;
};
export const calculateSolar = async (data) => (await axios.post('/solar/calculate', data)).data;
export const getSolarStudies = async (params = {}) => (await axios.get('/solar/studies', { params })).data;
export const getSolarStudy = async (id) => (await axios.get(`/solar/studies/${id}`)).data;
export const createSolarStudy = async (data) => (await axios.post('/solar/studies', data)).data;
export const updateSolarStudy = async (id, data) => (await axios.put(`/solar/studies/${id}`, data)).data;
export const getSolarQuotePayload = async (id) => (await axios.get(`/solar/studies/${id}/quote-payload`)).data;
export const linkSolarQuote = async (id, quoteId) => (await axios.post(`/solar/studies/${id}/link-quote`, { quote_id: quoteId })).data;
export const createProjectFromStudy = async (id) => (await axios.post(`/solar/studies/${id}/project`)).data;
export const openSolarProposal = async (id) => {
  const res = await axios.get(`/solar/studies/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// ── Interesados del simulador público ──
export const getSolarLeads = async (params = {}) => (await axios.get('/solar/leads', { params })).data;
export const updateSolarLead = async (id, data) => (await axios.put(`/solar/leads/${id}`, data)).data;

// ── Simulador público (sin sesión) ──
export const solarPublicApi = {
  config: async (slug) => (await axios.get(`/public/solar/${slug}/config`)).data,
  geocode: async (slug, q) => (await axios.get(`/public/solar/${slug}/geocode`, { params: { q } })).data,
  irradiance: async (slug, lat, lon) => (await axios.get(`/public/solar/${slug}/irradiance`, { params: { lat, lon } })).data,
  estimate: async (slug, data) => (await axios.post(`/public/solar/${slug}/estimate`, data)).data,
  lead: async (slug, data) => (await axios.post(`/public/solar/${slug}/lead`, data)).data,
  readBill: async (slug, file, turnstileToken) => {
    const form = new FormData();
    form.append('file', file);
    if (turnstileToken) form.append('turnstile_token', turnstileToken);
    return (await axios.post(`/public/solar/${slug}/bill`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 110000 })).data;
  },
};
