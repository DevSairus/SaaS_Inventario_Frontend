// Tipos de vehículo — mismos valores que backend/src/constants/vehicleTypes.js.
// La empresa elige cuáles atiende en Configuración → Taller
// (business_config.vehicle_types); sin elegir, se muestran todos.
export const VEHICLE_TYPE_OPTIONS = [
  { value: 'automovil',   label: 'Automóvil' },
  { value: 'camioneta',   label: 'Camioneta' },
  { value: 'motocicleta', label: 'Motocicleta' },
  { value: 'motocarro',   label: 'Motocarro' },
  { value: 'cuatrimoto',  label: 'Cuatrimoto (ATV)' },
  { value: 'utv',         label: 'UTV' },
  { value: 'camion',      label: 'Camión / bus' },
  { value: 'otro',        label: 'Otro' },
];

export const VEHICLE_TYPES = VEHICLE_TYPE_OPTIONS.map((o) => o.value);
export const VEHICLE_TYPE_LABELS = Object.fromEntries(VEHICLE_TYPE_OPTIONS.map((o) => [o.value, o.label]));

// Tipos de dos/tres/cuatro ruedas "tipo moto" (iconos, diagramas).
export const MOTO_LIKE_TYPES = ['motocicleta', 'motocarro', 'cuatrimoto', 'utv'];

// Atajos para configurar el tipo de establecimiento.
export const VEHICLE_TYPE_PRESETS = [
  { key: 'carros', label: 'Taller de carros', types: ['automovil', 'camioneta', 'otro'] },
  { key: 'motos', label: 'Taller de motos', types: ['motocicleta', 'motocarro', 'cuatrimoto', 'utv', 'otro'] },
  { key: 'pesados', label: 'Pesados', types: ['camion', 'camioneta', 'otro'] },
  { key: 'todos', label: 'Todos', types: VEHICLE_TYPES },
];

// Tipos habilitados para la empresa; null/vacío = todos.
export function enabledVehicleTypes(configured) {
  const list = Array.isArray(configured) ? configured.filter((t) => VEHICLE_TYPES.includes(t)) : [];
  return list.length ? list : VEHICLE_TYPES;
}

// Opciones del selector de tipo: las habilitadas, más el valor actual si un
// vehículo viejo trae un tipo que la empresa ya no atiende.
export function vehicleTypeOptionsFor(configured, currentValue) {
  const enabled = enabledVehicleTypes(configured);
  return VEHICLE_TYPE_OPTIONS.filter((o) => enabled.includes(o.value) || o.value === currentValue);
}

// Tipo por defecto al crear un vehículo: el primero que atiende la empresa.
export function defaultVehicleType(configured) {
  return enabledVehicleTypes(configured)[0] || 'automovil';
}
