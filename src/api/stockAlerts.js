import axios from './axios';

/**
 * API de Alertas de Stock
 */

// Obtener todas las alertas con filtros
export const getStockAlerts = async (params = {}) => {
  const response = await axios.get('/stock-alerts', { params });
  return response.data;
};

// Obtener una alerta por ID
export const getStockAlertById = async (id) => {
  const response = await axios.get(`/stock-alerts/${id}`);
  return response.data;
};

// Obtener estadísticas de alertas
export const getStockAlertsStats = async () => {
  const response = await axios.get('/stock-alerts/stats');
  return response.data;
};

// Verificar y crear alertas manualmente
export const checkStockAlerts = async () => {
  const response = await axios.post('/stock-alerts/check');
  return response.data;
};

// Resolver una alerta
export const resolveStockAlert = async (id, data) => {
  const response = await axios.patch(`/stock-alerts/${id}/resolve`, data);
  return response.data;
};

// Ignorar una alerta
export const ignoreStockAlert = async (id, data) => {
  const response = await axios.patch(`/stock-alerts/${id}/ignore`, data);
  return response.data;
};

// Reactivar una alerta
export const reactivateStockAlert = async (id) => {
  const response = await axios.patch(`/stock-alerts/${id}/reactivate`);
  return response.data;
};

// Eliminar una alerta
export const deleteStockAlert = async (id) => {
  const response = await axios.delete(`/stock-alerts/${id}`);
  return response.data;
};

// Buscar producto por código de barras
export const getProductByBarcode = async (barcode) => {
  const response = await axios.get(`/products/barcode/${barcode}`);
  return response.data;
};

// Verificar si código de barras existe
export const checkBarcodeExists = async (barcode, productId = null) => {
  const params = productId ? { product_id: productId } : {};
  const response = await axios.get(`/products/check-barcode/${barcode}`, { params });
  return response.data;
};