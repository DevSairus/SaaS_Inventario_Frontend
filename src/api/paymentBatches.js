import axios from './axios';
import { bankAccountsAPI } from './accounting';

/**
 * Lotes de pago a proveedores con archivo plano del banco
 * (backend/src/routes/paymentBatches.routes.js).
 */
export const getPayables = async (params = {}) => (await axios.get('/payment-batches/payables', { params })).data;
export const getBankFormats = async () => (await axios.get('/payment-batches/formats')).data;
export const getPaymentBatches = async (params = {}) => (await axios.get('/payment-batches', { params })).data;
export const getPaymentBatch = async (id) => (await axios.get(`/payment-batches/${id}`)).data;
// { bank_account_id, payment_date, format_key, debit_account_type, notes, items: [{ document_type, document_id, amount }] }
export const createPaymentBatch = async (data) => (await axios.post('/payment-batches', data)).data;
export const updatePaymentBatch = async (id, data) => (await axios.put(`/payment-batches/${id}`, data)).data;
export const batchAction = async (id, action, body) => (await axios.post(`/payment-batches/${id}/${action}`, body || {})).data;
// El archivo del banco como blob (Content-Disposition trae el nombre).
export const downloadBatchFile = async (id) => axios.get(`/payment-batches/${id}/file`, { responseType: 'blob' });
export const saveBankTemplate = async (data, id) => (id
  ? (await axios.put(`/payment-batches/templates/${id}`, data)).data
  : (await axios.post('/payment-batches/templates', data)).data);
export const deleteBankTemplate = async (id) => (await axios.delete(`/payment-batches/templates/${id}`)).data;
export const getBankAccountOptions = () => bankAccountsAPI.getOptions();
