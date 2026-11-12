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

// Medidor de uso: km (odómetro) u horas (horómetro). Cuatrimotos y UTV usan
// horas por defecto; cada vehículo puede cambiarlo (vehicle.meter_unit). Igual
// que backend/src/constants/vehicleTypes.js.
export const METER_UNIT_OPTIONS = [
  { value: 'km', label: 'Kilómetros (odómetro)' },
  { value: 'h', label: 'Horas (horómetro)' },
];
export const HOURS_DEFAULT_TYPES = ['cuatrimoto', 'utv'];
export const defaultMeterUnit = (vehicleType) => (HOURS_DEFAULT_TYPES.includes(vehicleType) ? 'h' : 'km');
export const meterUnitOf = (vehicle) =>
  (vehicle?.meter_unit === 'h' || vehicle?.meter_unit === 'km' ? vehicle.meter_unit : defaultMeterUnit(vehicle?.vehicle_type));
// "12.500 km" / "350 h"
export const fmtMeter = (n, unit = 'km') =>
  (n == null || n === '' ? null : `${Number(n).toLocaleString('es-CO')} ${unit === 'h' ? 'h' : 'km'}`);
// Nombre del dato: "Kilometraje" / "Horómetro"; corto: "Km" / "Horas".
export const meterName = (unit) => (unit === 'h' ? 'Horómetro' : 'Kilometraje');
export const meterShort = (unit) => (unit === 'h' ? 'Horas' : 'Km');
