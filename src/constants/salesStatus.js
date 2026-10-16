// Etiquetas únicas de estado de venta y de pago -- usarlas en todas las
// pantallas para que una misma venta no se llame distinto según dónde se mire.
// Convención: pending = Confirmada (inventario ya descontado), completed =
// Entregada.
// cls: clases de Tailwind para chips; variant: variante del componente Badge.

export const SALE_STATUS_LABELS = {
  draft:     { label: 'Borrador',   variant: 'secondary', cls: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300' },
  pending:   { label: 'Confirmada', variant: 'info',      cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { label: 'Entregada',  variant: 'success',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  cancelled: { label: 'Cancelada',  variant: 'danger',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

export const PAYMENT_STATUS_LABELS = {
  pending: { label: 'Pendiente',    variant: 'warning', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  partial: { label: 'Pago parcial', variant: 'info',    cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  paid:    { label: 'Pagado',       variant: 'success', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};
