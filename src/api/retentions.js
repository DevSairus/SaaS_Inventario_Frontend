// frontend/src/api/retentions.js
// Motor de retenciones en compras/gastos (ver backend retentionEngine.service.js).
import api from './axios';

export const retentionsAPI = {
  // Conceptos vigentes del tenant, perfil tributario y valores por defecto.
  getCatalog: async () => (await api.get('/inventory/purchases/retentions/catalog')).data,
  // compra: { supplier_id, items: [{ product_id, quantity, unit_cost, discount_percentage, tax_rate }] }
  // gasto:  { supplier_id, expense: { category, subtotal, tax_amount } }
  preview: async (payload) => (await api.post('/inventory/purchases/retentions/preview', payload)).data,
};
