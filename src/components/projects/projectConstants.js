// Etiquetas del módulo Proyectos (mismos valores que backend/src/models/projects/Project.js)

export const PROJECT_STATUS = {
  prospect: { label: 'Prospecto', cls: 'bg-gray-100 text-gray-700' },
  quoted: { label: 'Cotizado', cls: 'bg-sky-100 text-sky-800' },
  approved: { label: 'Aprobado', cls: 'bg-indigo-100 text-indigo-800' },
  in_progress: { label: 'En ejecución', cls: 'bg-amber-100 text-amber-800' },
  on_hold: { label: 'Suspendido', cls: 'bg-orange-100 text-orange-800' },
  completed: { label: 'Terminado', cls: 'bg-green-100 text-green-800' },
  closed: { label: 'Cerrado', cls: 'bg-slate-200 text-slate-700' },
  cancelled: { label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
};

// Cotización que es el contrato de un proyecto facturado por cortes
// (sales.quote_status; ver backend projectCuts.service).
export const CONTRACT_STATUS = {
  aprobada: { label: 'Aprobado', cls: 'bg-indigo-100 text-indigo-800' },
  parcial: { label: 'Aprobado parcial', cls: 'bg-indigo-100 text-indigo-800' },
  contratada: { label: 'En ejecución', cls: 'bg-amber-100 text-amber-800' },
  facturada: { label: 'Facturado completo', cls: 'bg-green-100 text-green-800' },
  cerrada: { label: 'Cerrado con saldo', cls: 'bg-slate-200 text-slate-700' },
};
export const CONTRACT_OPEN = ['aprobada', 'parcial', 'contratada'];

// Texto del botón para pasar a cada estado
export const STATUS_ACTION = {
  prospect: 'Volver a prospecto',
  quoted: 'Marcar cotizado',
  approved: 'Aprobar',
  in_progress: 'Iniciar ejecución',
  on_hold: 'Suspender',
  completed: 'Marcar terminado',
  closed: 'Cerrar proyecto',
  cancelled: 'Cancelar proyecto',
};

export const PROJECT_TYPES = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  industrial: 'Industrial',
  ongrid: 'On-grid (conectado a red)',
  offgrid: 'Off-grid (aislado)',
  otro: 'Otro',
};

export const BUDGET_CATEGORIES = {
  materials: 'Materiales',
  labor: 'Mano de obra',
  services: 'Servicios y subcontratos',
  other: 'Otros costos',
};


export const customerName = (c) => (c ? (c.business_name || [c.first_name, c.last_name].filter(Boolean).join(' ')) : '');
export const userName = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email || '';
export const qty = (n) => Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 4 });

// Clasificación de horas de la planilla (backend services/projects/workHours.js).
export const HOUR_CATEGORIES = [
  ['ORD', 'Ordinarias'], ['HRNs', 'Rec. nocturno'], ['HRDDFs', 'Rec. dom/fest'], ['HRNDFs', 'Rec. noct. dom/fest'],
  ['HEDs', 'Extra diurna'], ['HENs', 'Extra nocturna'], ['HEDDFs', 'Extra diurna dom/fest'], ['HENDFs', 'Extra noct. dom/fest'],
];

export const DISPATCH_ROLES = [
  ['almacen', 'Almacén', 'Entrega'],
  ['transportador', 'Transportador', 'Lleva'],
  ['encargado_obra', 'Encargado de obra', 'Recibe'],
];

// Firmas del acta de un lote de herramientas, en el orden en que van en el PDF: [rol, rótulo, acción].
export const BATCH_ROLES = {
  delivery: [['almacen', 'Almacén', 'Entrega'], ['transportador', 'Transportador', 'Lleva'], ['encargado_obra', 'Encargado de obra', 'Recibe']],
  return: [['encargado_obra', 'Encargado de obra', 'Devuelve'], ['transportador', 'Transportador', 'Lleva'], ['almacen', 'Almacén', 'Recibe']],
};
