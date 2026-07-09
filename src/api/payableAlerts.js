import axios from './axios';

/**
 * API de Alertas de Cuentas por Pagar
 */

// Obtener todas las alertas con filtros
export const getPayableAlerts = async (params = {}) => {
  const response = await axios.get('/payable-alerts', { params });
  return response.data;
};

// Obtener una alerta por ID
export const getPayableAlertById = async (id) => {
  const response = await axios.get(`/payable-alerts/${id}`);
  return response.data;
};

// Obtener estadísticas de alertas
export const getPayableAlertsStats = async () => {
  const response = await axios.get('/payable-alerts/stats');
  return response.data;
};

// Verificar y crear alertas manualmente
export const checkPayableAlerts = async () => {
  const response = await axios.post('/payable-alerts/check');
  return response.data;
};

// Resolver una alerta
export const resolvePayableAlert = async (id, data) => {
  const response = await axios.patch(`/payable-alerts/${id}/resolve`, data);
  return response.data;
};

// Ignorar una alerta
export const ignorePayableAlert = async (id, data) => {
  const response = await axios.patch(`/payable-alerts/${id}/ignore`, data);
  return response.data;
};

// Reactivar una alerta
export const reactivatePayableAlert = async (id) => {
  const response = await axios.patch(`/payable-alerts/${id}/reactivate`);
  return response.data;
};

// Eliminar una alerta
export const deletePayableAlert = async (id) => {
  const response = await axios.delete(`/payable-alerts/${id}`);
  return response.data;
};
