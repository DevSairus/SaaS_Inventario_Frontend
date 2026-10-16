// Valores reales de movement_reason que escribe el backend en
// inventory_movements, con su etiqueta en español. Alimenta tanto el filtro
// de Movimientos como las etiquetas del kardex.
export const MOVEMENT_REASONS = [
  { value: 'sale',                      label: 'Venta' },
  { value: 'sale_reversal',             label: 'Reversión Venta' },
  { value: 'purchase_receipt',          label: 'Recepción Compra' },
  { value: 'adjustment_in',             label: 'Ajuste Entrada' },
  { value: 'adjustment_out',            label: 'Ajuste Salida' },
  { value: 'transfer_send',             label: 'Transferencia Salida' },
  { value: 'transfer_receive',          label: 'Transferencia Entrada' },
  { value: 'transfer_cancel',           label: 'Transferencia Cancelada' },
  { value: 'internal_consumption',      label: 'Consumo Interno' },
  { value: 'initial_stock',             label: 'Stock Inicial' },
  { value: 'customer_return',           label: 'Devolución Cliente' },
  { value: 'customer_return_reversal',  label: 'Reversión Dev. Cliente' },
  { value: 'supplier_return',           label: 'Devolución Proveedor' },
  { value: 'supplier_return_reversal',  label: 'Reversión Dev. Proveedor' },
  { value: 'taller_repuesto',           label: 'Repuesto Taller' },
];

const LABELS_BY_VALUE = Object.fromEntries(MOVEMENT_REASONS.map(r => [r.value, r.label]));

// Razones desconocidas se muestran con su valor crudo.
export const getMovementReasonLabel = (reason) => LABELS_BY_VALUE[reason] || reason;
