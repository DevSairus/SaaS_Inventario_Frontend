// frontend/src/constants/inspection.js
// Etiquetas y zonas del peritaje vehicular. Las zonas deben coincidir con
// backend/src/constants/inspectionTemplates.js (BODY_ZONES) -- el backend
// rechaza una zona que no conozca.

export const CONCEPTS = {
  aprobado: { label: 'Aprobado', short: 'Aprobado', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', solid: 'bg-emerald-600' },
  aprobado_observaciones: { label: 'Aprobado con observaciones', short: 'Con observaciones', cls: 'bg-amber-100 text-amber-800 border-amber-200', solid: 'bg-amber-500' },
  no_recomendado: { label: 'No recomendado', short: 'No recomendado', cls: 'bg-red-100 text-red-800 border-red-200', solid: 'bg-red-600' },
};

export const RATINGS = [
  { value: 'bueno', label: 'Bueno', cls: 'bg-emerald-600 text-white border-emerald-600', idle: 'text-emerald-700 border-emerald-200 hover:bg-emerald-50' },
  { value: 'regular', label: 'Regular', cls: 'bg-amber-500 text-white border-amber-500', idle: 'text-amber-700 border-amber-200 hover:bg-amber-50' },
  { value: 'malo', label: 'Malo', cls: 'bg-red-600 text-white border-red-600', idle: 'text-red-700 border-red-200 hover:bg-red-50' },
  { value: 'na', label: 'N/A', cls: 'bg-gray-500 text-white border-gray-500', idle: 'text-gray-500 border-gray-200 hover:bg-gray-50' },
];
export const RATING_LABELS = Object.fromEntries(RATINGS.map((r) => [r.value, r.label]));

export const STATUSES = {
  draft: { label: 'Borrador', cls: 'bg-blue-100 text-blue-700' },
  finalized: { label: 'Finalizado', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Anulado', cls: 'bg-red-100 text-red-700' },
};

export const REQUESTER_TYPES = {
  propietario: 'Propietario', comprador: 'Comprador', financiera: 'Entidad financiera',
  aseguradora: 'Aseguradora', concesionario: 'Concesionario', otro: 'Otro',
};

export const PURPOSES = {
  compraventa: 'Compraventa', financiacion: 'Financiación', seguro: 'Seguro', control: 'Control / revisión', otro: 'Otro',
};

export const DAMAGE_TYPES = {
  golpe: 'Golpe', rayon: 'Rayón', repintura: 'Repintura', masilla: 'Masilla',
  cambio_pieza: 'Pieza cambiada', corrosion: 'Corrosión', vidrio: 'Vidrio', otro: 'Otro',
};

export const SEVERITIES = {
  leve: { label: 'Leve', color: '#eab308' },
  moderado: { label: 'Moderado', color: '#ea580c' },
  grave: { label: 'Grave', color: '#dc2626' },
};

// Pintura original de fábrica ronda 80–180 µm.
export const REPAINT_MICRONS = 200;
export const FILLER_MICRONS = 400;

export const BODY_ZONES = {
  car: [
    ['bomper_del', 'Bómper delantero'], ['capo', 'Capó'], ['guardabarro_di', 'Guardabarro del. izq.'],
    ['guardabarro_dd', 'Guardabarro del. der.'], ['puerta_di', 'Puerta del. izq.'], ['puerta_dd', 'Puerta del. der.'],
    ['puerta_ti', 'Puerta tras. izq.'], ['puerta_td', 'Puerta tras. der.'], ['techo', 'Techo'],
    ['panoramico', 'Panorámico'], ['vidrio_trasero', 'Vidrio trasero'], ['costado_ti', 'Costado tras. izq.'],
    ['costado_td', 'Costado tras. der.'], ['baul', 'Baúl / compuerta'], ['bomper_tras', 'Bómper trasero'],
    ['estribo_i', 'Estribo izq.'], ['estribo_d', 'Estribo der.'],
  ],
  moto: [
    ['guardabarro_del', 'Guardabarro delantero'], ['farola', 'Farola / carenaje frontal'], ['tanque', 'Tanque'],
    ['carenaje_i', 'Carenaje izq.'], ['carenaje_d', 'Carenaje der.'], ['tapa_lateral_i', 'Tapa lateral izq.'],
    ['tapa_lateral_d', 'Tapa lateral der.'], ['sillin', 'Sillín'], ['colin', 'Colín'],
    ['guardabarro_tras', 'Guardabarro trasero'], ['chasis', 'Chasis'], ['tijera', 'Tijera / basculante'],
    ['exosto', 'Exhosto'], ['rin_del', 'Rin delantero'], ['rin_tras', 'Rin trasero'],
  ],
  heavy: [
    ['bomper_del', 'Bómper delantero'], ['cabina_frente', 'Frente de cabina'], ['puerta_i', 'Puerta izq.'],
    ['puerta_d', 'Puerta der.'], ['techo_cabina', 'Techo de cabina'], ['panoramico', 'Panorámico'],
    ['chasis_i', 'Chasis izq.'], ['chasis_d', 'Chasis der.'], ['carroceria_i', 'Carrocería izq.'],
    ['carroceria_d', 'Carrocería der.'], ['carroceria_tras', 'Carrocería trasera'], ['bomper_tras', 'Bómper trasero'],
  ],
};

export function bodyKindFor(vehicleType) {
  if (['motocicleta', 'motocarro', 'cuatrimoto', 'utv'].includes(vehicleType)) return 'moto';
  if (vehicleType === 'camion') return 'heavy';
  return 'car';
}

export function zoneLabel(kind, zone) {
  return (BODY_ZONES[kind] || []).find(([k]) => k === zone)?.[1] || zone;
}

export const fmtScore = (s) => (s === null || s === undefined ? '—' : Number(s).toLocaleString('es-CO', { maximumFractionDigits: 1 }));
export const scoreColor = (s) => (s === null || s === undefined ? '#9ca3af' : s >= 80 ? '#059669' : s >= 60 ? '#d97706' : '#dc2626');
