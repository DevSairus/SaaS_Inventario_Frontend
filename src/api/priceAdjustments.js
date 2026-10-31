import axios from './axios';

/**
 * API de Ajustes de precio de venta (AJP-). Solo cambian el precio de venta:
 * no tocan stock, costo promedio, último costo de compra ni contabilidad.
 * Ver backend/src/services/inventory/priceAdjustment.service.js.
 */

export const getPriceAdjustments = async (params = {}) => {
  const response = await axios.get('/inventory/price-adjustments', { params });
  return response.data;
};

export const getPriceAdjustment = async (id) => {
  const response = await axios.get(`/inventory/price-adjustments/${id}`);
  return response.data;
};

export const getProductPriceHistory = async (productId) => {
  const response = await axios.get(`/inventory/price-adjustments/product/${productId}`);
  return response.data;
};

// Costos, margen, método y precio sugerido de cada producto para armar el ajuste.
export const getPriceAdjustmentProductsInfo = async (productIds) => {
  const response = await axios.post('/inventory/price-adjustments/products-info', { product_ids: productIds });
  return response.data;
};

// { reason, notes, items: [{ product_id, new_price, reference_cost }] }
export const createPriceAdjustment = async (data) => {
  const response = await axios.post('/inventory/price-adjustments', data);
  return response.data;
};

// Mismos roles que el backend (PRICE_ADJUSTMENT_WRITE_ROLES).
export const PRICE_ADJUSTMENT_WRITE_ROLES = ['admin', 'manager', 'super_admin'];

export const COST_SOURCE_LABELS = {
  last_purchase: 'Último costo de compra',
  average: 'Costo promedio',
  manual: 'Costo escrito a mano',
};
