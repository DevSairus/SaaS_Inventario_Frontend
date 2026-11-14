// frontend/src/api/radian.js
import api from './axios';

// receiver (030/032): quién recibió { first_name, last_name, id_type, id_number, job_title, department }
export const emitRadianAcuse      = (purchaseId, receiver) => api.post(`/radian/purchases/${purchaseId}/acuse`, { receiver });
export const emitRadianRecibo     = (purchaseId, receiver) => api.post(`/radian/purchases/${purchaseId}/recibo`, { receiver });
export const emitRadianAceptacion = (purchaseId) => api.post(`/radian/purchases/${purchaseId}/aceptacion`);
export const emitRadianReclamo    = (purchaseId, reasonCode, reasonText) =>
  api.post(`/radian/purchases/${purchaseId}/reclamo`, { reason_code: reasonCode, reason_text: reasonText });
export const getRadianEvents      = (purchaseId) => api.get(`/radian/purchases/${purchaseId}/events`);

// receipt (solo 032): { eventNumber, cude, issuedAt: 'YYYY-MM-DDTHH:MM' hora Colombia }
export const recordSaleRadianEvent = (saleId, eventCode, note, receipt = {}) =>
  api.post(`/radian/sales/${saleId}/received-event`, {
    event_code: eventCode, note,
    event_number: receipt.eventNumber, cude: receipt.cude, issued_at: receipt.issuedAt,
  });
export const emitRadianTacita      = (saleId, declarantType) =>
  api.post(`/radian/sales/${saleId}/aceptacion-tacita`, { declarant_type: declarantType });
export const getSaleRadianEvents   = (saleId) => api.get(`/radian/sales/${saleId}/events`);
// Consulta en la DIAN (GetStatusEvent) los eventos del cliente y registra 032/033/031
export const syncSaleRadianEvents  = (saleId) => api.post(`/radian/sales/${saleId}/sync-dian`);
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
