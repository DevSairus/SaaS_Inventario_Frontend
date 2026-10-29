import axios from './axios';

/**
 * API de Listas de pedido a proveedor (sin precios: lo que se le va a pedir
 * a cada proveedor). Una lista abierta por proveedor; al cerrarla queda en
 * el historial y la siguiente anotación abre una nueva.
 */

// status: open | history | ordered | cancelled | all
export const getOrderLists = async (params = {}) => {
  const response = await axios.get('/inventory/order-lists', { params });
  return response.data;
};

export const getOrderListsStats = async () => {
  const response = await axios.get('/inventory/order-lists/stats');
  return response.data;
};

export const getOrderList = async (id) => {
  const response = await axios.get(`/inventory/order-lists/${id}`);
  return response.data;
};

// Productos ya anotados en listas abiertas (para marcar "En pedido")
export const getPendingProducts = async (productIds = []) => {
  const response = await axios.get('/inventory/order-lists/pending-products', {
    params: productIds.length ? { product_ids: productIds.join(',') } : {},
  });
  return response.data;
};

// Cantidad sugerida, proveedores del producto y listas abiertas donde ya está
export const getProductSuggestion = async (productId) => {
  const response = await axios.get(`/inventory/order-lists/suggestion/${productId}`);
  return response.data;
};

// { supplier_id, product_id?, description?, quantity?, notes?, source? }
export const addOrderListItem = async (data) => {
  const response = await axios.post('/inventory/order-lists/items', data);
  return response.data;
};

// { quantity?, notes?, description?, product_id? }
export const updateOrderListItem = async (itemId, data) => {
  const response = await axios.patch(`/inventory/order-lists/items/${itemId}`, data);
  return response.data;
};

export const deleteOrderListItem = async (itemId) => {
  const response = await axios.delete(`/inventory/order-lists/items/${itemId}`);
  return response.data;
};

export const updateOrderList = async (id, data) => {
  const response = await axios.patch(`/inventory/order-lists/${id}`, data);
  return response.data;
};

export const closeOrderList = async (id, data = {}) => {
  const response = await axios.patch(`/inventory/order-lists/${id}/close`, data);
  return response.data;
};

export const cancelOrderList = async (id) => {
  const response = await axios.patch(`/inventory/order-lists/${id}/cancel`);
  return response.data;
};

export const getOrderListPdf = async (id) => {
  const response = await axios.get(`/inventory/order-lists/${id}/pdf`, { responseType: 'blob' });
  return response.data;
};

// { to?, cc?, message? }
export const sendOrderListEmail = async (id, data = {}) => {
  const response = await axios.post(`/inventory/order-lists/${id}/send-email`, data);
  return response.data;
};

export const logOrderListSend = async (id, data) => {
  const response = await axios.post(`/inventory/order-lists/${id}/log-send`, data);
  return response.data;
};

export const getPurchaseDraft = async (id) => {
  const response = await axios.get(`/inventory/order-lists/${id}/purchase-draft`);
  return response.data;
};

export const linkOrderListPurchase = async (id, purchase_id) => {
  const response = await axios.patch(`/inventory/order-lists/${id}/link-purchase`, { purchase_id });
  return response.data;
};
