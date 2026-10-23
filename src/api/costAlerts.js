import axios from './axios';

/**
 * API de Alertas de Costo (variación del costo de compra y precio de venta retenido)
 */

export const getCostAlerts = async (params = {}) => {
  const response = await axios.get('/inventory/cost-alerts', { params });
  return response.data;
};

export const getCostAlertsStats = async () => {
  const response = await axios.get('/inventory/cost-alerts/stats');
  return response.data;
};

// apply_price = true aplica al producto el precio sugerido retenido
export const resolveCostAlert = async (id, { resolution_notes, apply_price = false } = {}) => {
  const response = await axios.patch(`/inventory/cost-alerts/${id}/resolve`, { resolution_notes, apply_price });
  return response.data;
};

export const ignoreCostAlert = async (id, resolution_notes) => {
  const response = await axios.patch(`/inventory/cost-alerts/${id}/ignore`, { resolution_notes });
  return response.data;
};
