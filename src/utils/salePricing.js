// frontend/src/utils/salePricing.js
//
// Gemelo de backend/src/utils/salePricing.js: el margen es SOBRE LA VENTA.
//   precio sin impuestos = costo / (1 − margen / 100)
// Si el producto maneja el precio con impuestos incluidos se le suman IVA + INC
// (mismas tarifas que extrae el backend al vender).

export const MAX_MARGIN = 99.99;
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function includedTaxRate(product) {
  if (!product?.price_includes_tax) return 0;
  const status = product?.tax_config?.iva_status;
  if (product?.has_tax === false || status === 'excluido') return 0;
  const ivaRate = status === 'exento' ? 0 : Number(product?.tax_percentage ?? 19) || 0;
  const inc = product?.tax_config?.inc;
  const incRate = inc?.enabled && inc?.rate > 0 ? Number(inc.rate) : 0;
  return ivaRate + incRate;
}

export function suggestedSalePrice(cost, margin, product = {}) {
  const c = parseFloat(cost);
  const m = parseFloat(margin);
  if (!Number.isFinite(c) || c <= 0 || !Number.isFinite(m) || m < 0 || m > MAX_MARGIN) return null;
  const net = c / (1 - m / 100);
  return round2(net * (1 + includedTaxRate(product) / 100));
}

// Precio de venta real del producto (gemela de backend/src/utils/salePricing.js):
// el que se cobra y se edita en el formulario es base_price; sale_price es un
// campo heredado que casi nunca se llena (queda en 0).
export function productSalePrice(product = {}) {
  const base = parseFloat(product?.base_price) || 0;
  return base > 0 ? base : parseFloat(product?.sale_price) || 0;
}
