// frontend/src/constants/payroll.js
//
// Catálogos DIAN del módulo de Nómina Electrónica (Resolución 000013 de
// 2021, Anexo Técnico v1.0). Centraliza los valores permitidos por los
// `validate: { isIn: [...] }` de los modelos del backend
// (Employee, PayrollConcept, PayrollPeriod, PayrollDocumentAdjustment) para
// que los formularios y filtros del front no los reinventen ni se
// desincronicen.
//
// IMPORTANTE: si el backend cambia alguna lista de `isIn`, actualizar aquí
// también — no hay validación cruzada automática.

// ── Employee ──────────────────────────────────────────────────────
export const DOCUMENT_TYPES = [
  { value: '11', label: 'Registro civil' },
  { value: '12', label: 'Tarjeta de identidad' },
  { value: '13', label: 'Cédula de ciudadanía' },
  { value: '21', label: 'Tarjeta de extranjería' },
  { value: '22', label: 'Cédula de extranjería' },
  { value: '31', label: 'NIT' },
  { value: '41', label: 'Pasaporte' },
  { value: '42', label: 'Documento de identificación extranjero' },
  { value: '47', label: 'PEP (Permiso Especial de Permanencia)' },
  { value: '48', label: 'PPT (Permiso por Protección Temporal)' },
];

export const CONTRACT_TYPES = [
  { value: '1', label: 'Término indefinido' },
  { value: '2', label: 'Término fijo' },
  { value: '3', label: 'Obra o labor' },
  { value: '4', label: 'Aprendizaje' },
  { value: '5', label: 'Otro' },
];

// Tabla 5.5.3 del Anexo Técnico — TipoTrabajador. Lista base; ampliar según
// se necesiten más códigos del Anexo.
export const WORKER_TYPES = [
  { value: '01', label: 'Empleado' },
  { value: '02', label: 'Pensionado' },
  { value: '03', label: 'Aprendiz en etapa lectiva' },
  { value: '04', label: 'Aprendiz en etapa productiva' },
  { value: '05', label: 'Estudiante (decreto 055 de 2015)' },
  { value: '06', label: 'Cooperado (cooperativas de trabajo asociado)' },
  { value: '10', label: 'Independiente' },
  { value: '19', label: 'Aporte voluntario / otros' },
  { value: '20', label: 'Estudiantes de posgrado en salud (residentes)' },
  { value: '21', label: 'Estudiantes de posgrado sin ánimo de lucro' },
  { value: '22', label: 'Beneficiario Unión Sindical Obrera' },
];

export const SALARY_TYPES = [
  { value: 'ordinario', label: 'Ordinario' },
  { value: 'integral', label: 'Salario integral' },
];

export const PAYMENT_METHODS = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'check', label: 'Cheque' },
];

// Tabla 5.3.3.1 del Anexo — Forma de pago.
export const PAYMENT_FORMS = [
  { value: '1', label: 'Contado' },
  { value: '2', label: 'Crédito' },
];

export const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Ahorros' },
  { value: 'checking', label: 'Corriente' },
];

// ── PayrollConcept ────────────────────────────────────────────────
export const CONCEPT_TYPES = [
  { value: 'devengado', label: 'Devengado' },
  { value: 'deduccion', label: 'Deducción' },
];

// dian_category en PayrollConcept.js es un STRING(50) libre (sin
// `validate: isIn`, a diferencia de otros catálogos de este archivo) — el
// backend acepta cualquier texto. Esta lista son los valores documentados
// en el comentario del propio modelo; se ofrece como <select> con opción
// "Otra categoría..." para no perder la libertad del campo si el tenant
// necesita algo que no está en esta lista corta.
export const CONCEPT_DIAN_CATEGORIES = [
  { value: 'Basico', label: 'Básico', bucket: 'devengado' },
  { value: 'HEDs', label: 'Horas extra diurnas', bucket: 'devengado' },
  { value: 'HRNs', label: 'Horas recargo nocturno', bucket: 'devengado' },
  { value: 'Comisiones', label: 'Comisiones', bucket: 'devengado' },
  { value: 'AuxilioTransporte', label: 'Auxilio de transporte', bucket: 'devengado' },
  { value: 'Bonificaciones', label: 'Bonificaciones', bucket: 'devengado' },
  { value: 'Salud', label: 'Salud', bucket: 'deduccion' },
  { value: 'Pension', label: 'Pensión', bucket: 'deduccion' },
  { value: 'FondoSolidaridadPension', label: 'Fondo de solidaridad pensional', bucket: 'deduccion' },
  { value: 'RetencionFuente', label: 'Retención en la fuente', bucket: 'deduccion' },
  { value: 'Libranza', label: 'Libranza', bucket: 'deduccion' },
  { value: 'Otros', label: 'Otros', bucket: null },
];

export const CALCULATION_TYPES = [
  { value: 'fixed', label: 'Valor fijo' },
  { value: 'percentage', label: 'Porcentaje' },
  { value: 'formula', label: 'Fórmula' },
  { value: 'manual', label: 'Manual (se digita en cada liquidación)' },
];

// ── PayrollPeriod ─────────────────────────────────────────────────
export const PERIOD_TYPES = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'quincenal', label: 'Quincenal' },
];

// Orden fijo de transición de estados (ver payrollPeriods.controller.js
// STATUS_ORDER). El backend solo permite avanzar una posición a la vez.
export const PERIOD_STATUSES = [
  { value: 'abierto', label: 'Abierto' },
  { value: 'liquidado', label: 'Liquidado' },
  { value: 'emitido', label: 'Emitido' },
  { value: 'cerrado', label: 'Cerrado' },
];
export const PERIOD_STATUS_ORDER = ['abierto', 'liquidado', 'emitido', 'cerrado'];

/** Siguiente estado válido para un periodo, o null si ya está cerrado. */
export function getNextPeriodStatus(currentStatus) {
  const idx = PERIOD_STATUS_ORDER.indexOf(currentStatus);
  if (idx === -1 || idx === PERIOD_STATUS_ORDER.length - 1) return null;
  return PERIOD_STATUS_ORDER[idx + 1];
}

// ── PayrollDocument / PayrollDocumentAdjustment ──────────────────
export const DIAN_DOCUMENT_STATUSES = [
  { value: 'pending', label: 'Pendiente', color: 'gray' },
  { value: 'sending', label: 'Enviando', color: 'blue' },
  { value: 'accepted', label: 'Aceptado', color: 'green' },
  { value: 'rejected', label: 'Rechazado', color: 'red' },
];

// Anexo Técnico §2 — Reemplazar(1) / Eliminar(2).
export const ADJUSTMENT_TYPES = [
  { value: 'replace', label: 'Reemplazar', dianCode: '1' },
  { value: 'delete', label: 'Eliminar', dianCode: '2' },
];

// ── PayrollNovedad — dian_category ───────────────────────────────
// Espejo de DIAN_CATEGORY_MAP en backend/src/services/payroll/payrollService.js.
// El `bucket` indica si suma a Devengados o Deducciones; `kind` indica la
// forma del `payload` esperado (informativo para quien arme el formulario
// de la novedad, no se usa para validar en el front).
export const NOVEDAD_CATEGORIES = [
  // Devengados — grupos de arreglo (puede haber varias por periodo)
  { value: 'HEDs', label: 'Horas extra diurnas', bucket: 'devengado', kind: 'array' },
  { value: 'HENs', label: 'Horas extra nocturnas', bucket: 'devengado', kind: 'array' },
  { value: 'HRNs', label: 'Horas recargo nocturno', bucket: 'devengado', kind: 'array' },
  { value: 'HEDDFs', label: 'Horas extra diurnas dominicales/festivas', bucket: 'devengado', kind: 'array' },
  { value: 'HRDDFs', label: 'Horas recargo diurno dominical/festivo', bucket: 'devengado', kind: 'array' },
  { value: 'HENDFs', label: 'Horas extra nocturnas dominicales/festivas', bucket: 'devengado', kind: 'array' },
  { value: 'HRNDFs', label: 'Horas recargo nocturno dominical/festivo', bucket: 'devengado', kind: 'array' },
  { value: 'Incapacidades', label: 'Incapacidades', bucket: 'devengado', kind: 'array' },
  { value: 'Bonificaciones', label: 'Bonificaciones', bucket: 'devengado', kind: 'array' },
  { value: 'Auxilios', label: 'Auxilios', bucket: 'devengado', kind: 'array' },
  { value: 'HuelgasLegales', label: 'Huelgas legales', bucket: 'devengado', kind: 'array' },
  { value: 'OtrosConceptos', label: 'Otros conceptos', bucket: 'devengado', kind: 'array' },
  { value: 'Compensaciones', label: 'Compensaciones', bucket: 'devengado', kind: 'array' },
  { value: 'BonoEPCTVs', label: 'Bonos EPCTV (alimentación, transporte, vivienda)', bucket: 'devengado', kind: 'array' },
  // Devengados — listas de valor simple
  { value: 'Comisiones', label: 'Comisiones', bucket: 'devengado', kind: 'simpleList' },
  { value: 'PagosTercerosDevengados', label: 'Pagos a terceros (devengado)', bucket: 'devengado', kind: 'simpleList' },
  { value: 'AnticiposDevengados', label: 'Anticipos (devengado)', bucket: 'devengado', kind: 'simpleList' },
  // Devengados — elementos simples 0-1
  { value: 'Dotacion', label: 'Dotación', bucket: 'devengado', kind: 'single' },
  { value: 'ApoyoSost', label: 'Apoyo de sostenimiento', bucket: 'devengado', kind: 'single' },
  { value: 'Teletrabajo', label: 'Auxilio de teletrabajo', bucket: 'devengado', kind: 'single' },
  { value: 'BonifRetiro', label: 'Bonificación por retiro', bucket: 'devengado', kind: 'single' },
  { value: 'Indemnizacion', label: 'Indemnización', bucket: 'devengado', kind: 'single' },
  { value: 'ReintegroDevengado', label: 'Reintegro (devengado)', bucket: 'devengado', kind: 'single' },
  { value: 'Primas', label: 'Primas', bucket: 'devengado', kind: 'object' },
  { value: 'Cesantias', label: 'Cesantías e intereses', bucket: 'devengado', kind: 'object' },
  { value: 'Vacaciones', label: 'Vacaciones (comunes/compensadas)', bucket: 'devengado', kind: 'object' },
  { value: 'Licencias', label: 'Licencias (maternidad/paternidad/remunerada/no remunerada)', bucket: 'devengado', kind: 'object' },
  // Deducciones — grupos de arreglo
  { value: 'Sindicatos', label: 'Cuotas sindicales', bucket: 'deduccion', kind: 'array' },
  { value: 'Sanciones', label: 'Sanciones', bucket: 'deduccion', kind: 'array' },
  { value: 'Libranza', label: 'Libranzas', bucket: 'deduccion', kind: 'array' },
  { value: 'PagosTercerosDeducciones', label: 'Pagos a terceros (deducción)', bucket: 'deduccion', kind: 'array' },
  { value: 'AnticiposDeducciones', label: 'Anticipos (deducción)', bucket: 'deduccion', kind: 'array' },
  { value: 'OtrasDeducciones', label: 'Otras deducciones', bucket: 'deduccion', kind: 'simpleList' },
  // Deducciones — elementos simples 0-1
  { value: 'PensionVoluntaria', label: 'Pensión voluntaria', bucket: 'deduccion', kind: 'single' },
  { value: 'RetencionFuente', label: 'Retención en la fuente', bucket: 'deduccion', kind: 'single' },
  { value: 'AFC', label: 'Cuenta AFC', bucket: 'deduccion', kind: 'single' },
  { value: 'Cooperativa', label: 'Cooperativa', bucket: 'deduccion', kind: 'single' },
  { value: 'EmbargoFiscal', label: 'Embargo fiscal', bucket: 'deduccion', kind: 'single' },
  { value: 'PlanComplementarios', label: 'Planes complementarios de salud', bucket: 'deduccion', kind: 'single' },
  { value: 'Educacion', label: 'Educación', bucket: 'deduccion', kind: 'single' },
  { value: 'ReintegroDeduccion', label: 'Reintegro (deducción)', bucket: 'deduccion', kind: 'single' },
  { value: 'Deuda', label: 'Deuda', bucket: 'deduccion', kind: 'single' },
];

export const NOVEDAD_CATEGORIES_BY_VALUE = NOVEDAD_CATEGORIES.reduce((acc, c) => {
  acc[c.value] = c;
  return acc;
}, {});

export const NOVEDAD_CATEGORIES_DEVENGADO = NOVEDAD_CATEGORIES.filter((c) => c.bucket === 'devengado');
export const NOVEDAD_CATEGORIES_DEDUCCION = NOVEDAD_CATEGORIES.filter((c) => c.bucket === 'deduccion');

// Códigos DIAN de tipo de XML (numeral 5.5.7 del Anexo) — el plan traía
// 105/105 para ambos; el valor real que usa payrollXmlBuilder.js es 102/103.
export const PAYROLL_XML_TYPES = {
  NOMINA_INDIVIDUAL: '102',
  NOMINA_INDIVIDUAL_DE_AJUSTE: '103',
};
// ── Esquemas de formulario para PayrollNovedadModal (SIN JSON) ─────
// Cada entrada describe los campos que un usuario normal sí entiende
// (horas, valor, fecha, texto) para una `dian_category` de kind 'array' u
// 'object' — los nombres de cada `name` son EXACTAMENTE las claves que
// espera backend/src/services/dian/payrollXmlBuilder.js (ver
// horasGrupoXml, incapacidadesXml, bonificacionesXml, etc.), así que el
// componente arma el payload como un objeto plano `{ [name]: valor }`
// directo, sin que el usuario tenga que saber que eso es "JSON".
//
// Categorías de kind 'single' o 'simpleList' NO necesitan esquema: ambas
// se resuelven en el backend como un número plano (ver
// aplicarNovedades()/simpleValueListXml() en payrollService.js /
// payrollXmlBuilder.js) — el formulario les muestra un solo campo "Valor".
//
// Vacaciones y Licencias no están aquí: tienen un subtipo (comunes/
// compensadas; maternidad-paternidad/remunerada/no remunerada) que arma un
// payload anidado — se manejan aparte en PayrollNovedadModal con
// VACACIONES_LICENCIAS_SCHEMAS más abajo.
const HORAS_EXTRA_FIELDS = [
  { name: 'cantidad', label: 'Horas', type: 'number', required: true, step: '0.01' },
  { name: 'porcentaje', label: 'Porcentaje de recargo (%)', type: 'number', required: true, step: '0.01' },
  { name: 'pago', label: 'Valor a pagar', type: 'money', required: true },
];

// Categoría de horas -> campo en PayrollSetting con su porcentaje
// configurado por el administrador (ver payrollSettingsStore.js /
// PayrollSettingsPage.jsx) — PayrollNovedadModal lo usa para precargar
// "porcentaje" al elegir la categoría, siempre editable por si un caso
// puntual necesita otro valor.
export const HORAS_PERCENTAGE_SETTING_KEY = {
  HEDs: 'heds_percentage',
  HENs: 'hens_percentage',
  HRNs: 'hrns_percentage',
  HEDDFs: 'heddfs_percentage',
  HRDDFs: 'hrddfs_percentage',
  HENDFs: 'hendfs_percentage',
  HRNDFs: 'hrndfs_percentage',
};

export const NOVEDAD_FIELD_SCHEMAS = {
  HEDs: HORAS_EXTRA_FIELDS,
  HENs: HORAS_EXTRA_FIELDS,
  HRNs: HORAS_EXTRA_FIELDS,
  HEDDFs: HORAS_EXTRA_FIELDS,
  HRDDFs: HORAS_EXTRA_FIELDS,
  HENDFs: HORAS_EXTRA_FIELDS,
  HRNDFs: HORAS_EXTRA_FIELDS,

  Incapacidades: [
    { name: 'fechaInicio', label: 'Fecha inicio', type: 'date', required: true },
    { name: 'fechaFin', label: 'Fecha fin', type: 'date', required: true },
    { name: 'cantidad', label: 'Días', type: 'number', required: true, step: '1' },
    { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: [
      { value: '1', label: 'Común (EPS)' },
      { value: '2', label: 'Laboral (ARL)' },
    ] },
    { name: 'pago', label: 'Valor a pagar', type: 'money', required: true },
  ],

  Bonificaciones: [
    { name: 'bonificacionS', label: 'Bonificación salarial', type: 'money', required: false },
    { name: 'bonificacionNS', label: 'Bonificación no salarial', type: 'money', required: false },
  ],
  Auxilios: [
    { name: 'auxilioS', label: 'Auxilio salarial', type: 'money', required: false },
    { name: 'auxilioNS', label: 'Auxilio no salarial', type: 'money', required: false },
  ],
  HuelgasLegales: [
    { name: 'fechaInicio', label: 'Fecha inicio', type: 'date', required: true },
    { name: 'fechaFin', label: 'Fecha fin', type: 'date', required: true },
    { name: 'cantidad', label: 'Días', type: 'number', required: true, step: '1' },
  ],
  OtrosConceptos: [
    { name: 'descripcion', label: 'Descripción del concepto', type: 'text', required: true },
    { name: 'conceptoS', label: 'Valor salarial', type: 'money', required: false },
    { name: 'conceptoNS', label: 'Valor no salarial', type: 'money', required: false },
  ],
  Compensaciones: [
    { name: 'compensacionO', label: 'Compensación ordinaria', type: 'money', required: false },
    { name: 'compensacionE', label: 'Compensación extraordinaria', type: 'money', required: false },
  ],
  BonoEPCTVs: [
    { name: 'pagoS', label: 'Pago salarial', type: 'money', required: false },
    { name: 'pagoNS', label: 'Pago no salarial', type: 'money', required: false },
    { name: 'pagoAlimentacionS', label: 'Pago alimentación salarial', type: 'money', required: false },
    { name: 'pagoAlimentacionNS', label: 'Pago alimentación no salarial', type: 'money', required: false },
  ],

  Sindicatos: [
    { name: 'porcentaje', label: 'Porcentaje (%)', type: 'number', required: true, step: '0.01' },
    { name: 'deduccion', label: 'Valor deducido', type: 'money', required: true },
  ],
  Sanciones: [
    { name: 'sancionPublic', label: 'Sanción pública', type: 'money', required: false },
    { name: 'sancionPriv', label: 'Sanción privada', type: 'money', required: false },
  ],
  Libranza: [
    { name: 'descripcion', label: 'Descripción', type: 'text', required: true },
    { name: 'deduccion', label: 'Valor deducido', type: 'money', required: true },
  ],

  // Object, sin merge — OJO: una nueva novedad de Primas/Cesantias
  // REEMPLAZA a la anterior del mismo periodo en vez de sumarse (así lo
  // hace aplicarNovedades() en el backend), a diferencia de Vacaciones/
  // Licencias que sí acumulan. Se avisa en el modal.
  Primas: [
    { name: 'cantidad', label: 'Días', type: 'number', required: true, step: '1' },
    { name: 'pago', label: 'Valor', type: 'money', required: true },
    { name: 'pagoNS', label: 'Valor no salarial', type: 'money', required: false },
  ],
  Cesantias: [
    { name: 'pago', label: 'Valor', type: 'money', required: true },
    { name: 'porcentaje', label: 'Porcentaje (%)', type: 'number', required: true, step: '0.01' },
    { name: 'pagoIntereses', label: 'Pago de intereses', type: 'money', required: true },
  ],
};

// dian_category cuyo payload se REEMPLAZA (no se acumula) si se crea más
// de una novedad de esa categoría en el mismo periodo — ver comentario
// arriba y aplicarNovedades() en el backend (case 'object' sin `merge`).
export const NOVEDAD_REPLACES_PREVIOUS = new Set(['Primas', 'Cesantias']);

// Vacaciones y Licencias: un subtipo por novedad (el usuario elige cuál),
// que arma el payload anidado que espera el backend
// ({ comunes: [...] } / { compensadas: [...] } / { maternidadPaternidad: [...] } / etc.)
// — merge:true en el backend, así que varias novedades de estas categorías
// sí se van acumulando en vez de reemplazarse.
export const VACACIONES_LICENCIAS_SCHEMAS = {
  Vacaciones: {
    subtypes: [
      { value: 'comunes', label: 'Vacaciones comunes', fields: [
        { name: 'fechaInicio', label: 'Fecha inicio', type: 'date', required: true },
        { name: 'fechaFin', label: 'Fecha fin', type: 'date', required: true },
        { name: 'cantidad', label: 'Días', type: 'number', required: true, step: '1' },
        { name: 'pago', label: 'Valor a pagar', type: 'money', required: true },
      ] },
      { value: 'compensadas', label: 'Vacaciones compensadas', fields: [
        { name: 'cantidad', label: 'Días', type: 'number', required: true, step: '1' },
        { name: 'pago', label: 'Valor a pagar', type: 'money', required: true },
      ] },
    ],
  },
  Licencias: {
    subtypes: [
      { value: 'maternidadPaternidad', label: 'Maternidad / paternidad', fields: [
        { name: 'fechaInicio', label: 'Fecha inicio', type: 'date', required: true },
        { name: 'fechaFin', label: 'Fecha fin', type: 'date', required: true },
        { name: 'cantidad', label: 'Días', type: 'number', required: true, step: '1' },
        { name: 'pago', label: 'Valor a pagar', type: 'money', required: true },
      ] },
      { value: 'remunerada', label: 'Remunerada', fields: [
        { name: 'fechaInicio', label: 'Fecha inicio', type: 'date', required: true },
        { name: 'fechaFin', label: 'Fecha fin', type: 'date', required: true },
        { name: 'cantidad', label: 'Días', type: 'number', required: true, step: '1' },
        { name: 'pago', label: 'Valor a pagar', type: 'money', required: true },
      ] },
      { value: 'noRemunerada', label: 'No remunerada', fields: [
        { name: 'fechaInicio', label: 'Fecha inicio', type: 'date', required: true },
        { name: 'fechaFin', label: 'Fecha fin', type: 'date', required: true },
        { name: 'cantidad', label: 'Días', type: 'number', required: true, step: '1' },
        // LicenciaNR no lleva @Pago — no es remunerada, por definición.
      ] },
    ],
  },
};
