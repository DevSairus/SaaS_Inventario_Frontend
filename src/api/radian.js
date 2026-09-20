// frontend/src/api/radian.js
import api from './axios';

export const emitRadianAcuse      = (purchaseId) => api.post(`/radian/purchases/${purchaseId}/acuse`);
export const emitRadianRecibo     = (purchaseId) => api.post(`/radian/purchases/${purchaseId}/recibo`);
export const emitRadianAceptacion = (purchaseId) => api.post(`/radian/purchases/${purchaseId}/aceptacion`);
export const emitRadianReclamo    = (purchaseId, reasonCode, reasonText) =>
  api.post(`/radian/purchases/${purchaseId}/reclamo`, { reason_code: reasonCode, reason_text: reasonText });
export const getRadianEvents      = (purchaseId) => api.get(`/radian/purchases/${purchaseId}/events`);

export const recordSaleRadianEvent = (saleId, eventCode, note) =>
  api.post(`/radian/sales/${saleId}/received-event`, { event_code: eventCode, note });
export const emitRadianTacita      = (saleId, declarantType) =>
  api.post(`/radian/sales/${saleId}/aceptacion-tacita`, { declarant_type: declarantType });
export const getSaleRadianEvents   = (saleId) => api.get(`/radian/sales/${saleId}/events`);
export const getRadianPending      = () => api.get('/radian/pending');

// Fase 4 — requiere factura inscrita
export const emitRadianInscripcion = (saleId) => api.post(`/radian/sales/${saleId}/inscripcion`);
export const emitRadianEndoso      = (saleId, tipo, holderNit, holderName, terms) =>
  api.post(`/radian/sales/${saleId}/endoso`, { tipo, holder_nit: holderNit, holder_name: holderName, terms });
export const cancelRadianEndoso    = (saleId, reason) => api.post(`/radian/sales/${saleId}/cancelar-endoso`, { reason });
export const emitRadianLimitacion  = (saleId, reason) => api.post(`/radian/sales/${saleId}/limitacion`, { reason });
export const terminarRadianLimitacion = (saleId) => api.post(`/radian/sales/${saleId}/terminar-limitacion`);
export const emitRadianMandato     = (saleId, mandatarioNit, mandatarioName) =>
  api.post(`/radian/sales/${saleId}/mandato`, { mandatario_nit: mandatarioNit, mandatario_name: mandatarioName });
export const terminarRadianMandato = (saleId) => api.post(`/radian/sales/${saleId}/terminar-mandato`);
export const emitRadianPago        = (saleId, amount, paymentDate, paymentMethod) =>
  api.post(`/radian/sales/${saleId}/pago`, { amount, payment_date: paymentDate, payment_method: paymentMethod });
export const emitRadianInformePago = (saleId, note) => api.post(`/radian/sales/${saleId}/informe-pago`, { note });
