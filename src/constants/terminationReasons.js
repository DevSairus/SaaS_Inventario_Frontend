// Causas de retiro del empleado — mismo catálogo que
// backend/src/services/payroll/terminationReasons.js (6.2).
export const TERMINATION_REASONS = {
  renuncia: 'Renuncia voluntaria',
  mutuo_acuerdo: 'Mutuo acuerdo',
  justa_causa: 'Despido con justa causa',
  sin_justa_causa: 'Despido sin justa causa',
  vencimiento_contrato: 'Vencimiento del contrato (no renovación)',
  terminacion_obra: 'Terminación de la obra o labor',
  periodo_prueba: 'Terminación en período de prueba',
  pension: 'Pensión o jubilación',
  fallecimiento: 'Fallecimiento',
  otro: 'Otro',
};

export const terminationReasonLabel = (key) => TERMINATION_REASONS[key] || '';
