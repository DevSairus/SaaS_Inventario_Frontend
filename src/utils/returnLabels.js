// frontend/src/utils/returnLabels.js
// Etiquetas de los códigos que guardan las devoluciones (mismos valores que
// los <select> de CustomerReturnFormPage / SupplierReturnFormPage). Se usa en
// listas y detalle para no mostrar el código interno.

export const CUSTOMER_RETURN_REASONS = {
  defective: 'Producto Defectuoso',
  wrong_item: 'Producto Incorrecto',
  changed_mind: 'Cliente Cambió de Opinión',
  // Motivos de "Anular venta" (VoidSaleModal).
  customer_request: 'Solicitud del cliente',
  wrong_product: 'Producto equivocado',
  other: 'Otro',
};

export const SUPPLIER_RETURN_REASONS = {
  defective: 'Producto Defectuoso',
  incorrect: 'Producto Incorrecto',
  excess: 'Exceso de Inventario',
  damaged: 'Dañado en Tránsito',
  other: 'Otro',
};

export const RETURN_ITEM_CONDITIONS = {
  new: 'Nuevo',
  used: 'Usado',
  defective: 'Defectuoso',
};

export const labelOf = (map, code) => (code ? map[code] || code : '-');
