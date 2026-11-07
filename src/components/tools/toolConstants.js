// Etiquetas y estilos compartidos del módulo de herramientas.

export const TOOL_STATUS = {
  available: { label: 'Disponible', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  partial: { label: 'Parcialmente asignada', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  assigned: { label: 'Asignada', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  maintenance: { label: 'En mantenimiento', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  retired: { label: 'Dada de baja', cls: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
};

export const COST_MODES = {
  zero: { label: 'Costo cero', hint: 'Solo se controla quién la tiene y cuántas hay; no se valoriza.' },
  expense: { label: 'Gasto', hint: 'Se llevó al gasto cuando se compró. Anota el documento de compra o gasto.' },
  fixed_asset: { label: 'Activo fijo', hint: 'Se deprecia en el módulo de activos fijos. Vincula el activo.' },
};

export const EVENT_TYPES = {
  created: 'Alta',
  assigned: 'Entrega',
  returned: 'Devolución',
  maintenance: 'Mantenimiento',
  calibration: 'Calibración',
  repair: 'Reparación',
  damage: 'Daño',
  lost: 'Pérdida',
  retired: 'Baja',
  reactivated: 'Vuelve a servicio',
  note: 'Nota',
};

export const CONDITIONS = { good: 'Buen estado', damaged: 'Con daño', lost: 'Perdida' };

export const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800';

export const todayLocal = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

export const DUE_LABEL = { overdue: 'vencida', soon: 'por vencer' };
