import axios from './axios';

/**
 * API de Alertas de Antigüedad de Anticipos de Clientes
 * (Fase 4, punto 2 — Anticipos-Clientes-Analisis-y-Plan.md §10)
 */

// Obtener todas las alertas con filtros
export const getAdvanceAlerts = async (params = {}) => {
  const response = await axios.get('/customer-advance-alerts', { params });
  return response.data;
};

// Obtener una alerta por ID
export const getAdvanceAlertById = async (id) => {
  const response = await axios.get(`/customer-advance-alerts/${id}`);
  return response.data;
};

// Obtener estadísticas de alertas
export const getAdvanceAlertsStats = async () => {
  const response = await axios.get('/customer-advance-alerts/stats');
  return response.data;
};

// Informe de antigüedad de saldos por rango de días
export const getAdvancesAging = async () => {
  const response = await axios.get('/customer-advance-alerts/aging');
  return response.data;
};

// Verificar y crear alertas manualmente
export const checkAdvanceAlerts = async () => {
  const response = await axios.post('/customer-advance-alerts/check');
  return response.data;
};

// Resolver una alerta
export const resolveAdvanceAlert = async (id, data) => {
  const response = await axios.patch(`/customer-advance-alerts/${id}/resolve`, data);
  return response.data;
};

// Ignorar una alerta
export const ignoreAdvanceAlert = async (id, data) => {
  const response = await axios.patch(`/customer-advance-alerts/${id}/ignore`, data);
  return response.data;
};

// Reactivar una alerta
export const reactivateAdvanceAlert = async (id) => {
  const response = await axios.patch(`/customer-advance-alerts/${id}/reactivate`);
  return response.data;
};
