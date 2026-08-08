// Estados reales de una orden de garantía (Core, src/models/OrdenGarantia.js):
// enviada | devuelta | rechazada | anulada | aprobada | despachada | cerrada
// `textCls` es para usos inline compactos (VehiculoDetailPage), `badgeCls`
// para el badge tipo píldora del listado global (GarantiasPage).
export const GARANTIA_ESTADO_CONFIG = {
  enviada:    { label: 'Enviada',    textCls: 'text-blue-600',   badgeCls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  devuelta:   { label: 'Devuelta',   textCls: 'text-orange-600', badgeCls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  rechazada:  { label: 'Rechazada',  textCls: 'text-red-600',    badgeCls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  anulada:    { label: 'Anulada',    textCls: 'text-gray-500',   badgeCls: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300' },
  aprobada:   { label: 'Aprobada',   textCls: 'text-green-600',  badgeCls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  despachada: { label: 'Despachada', textCls: 'text-purple-600', badgeCls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  cerrada:    { label: 'Cerrada',    textCls: 'text-gray-500',   badgeCls: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300' },
};
