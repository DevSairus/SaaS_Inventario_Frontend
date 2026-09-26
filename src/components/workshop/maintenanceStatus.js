// Semáforo de "próximo mantenimiento" -- mismos estados que calcula
// backend/src/services/workshop/maintenance.service.js (computeStatus).
// Compartido por la ficha interna (VehicleDetailPage) y el portal público
// (VehiclePortalPage).
export const MAINTENANCE_STATUS = {
  vencido:       { label: 'Vencido',       color: '#dc2626', bg: '#fef2f2', cls: 'bg-red-100 text-red-700' },
  proximo:       { label: 'Próximo',       color: '#d97706', bg: '#fffbeb', cls: 'bg-amber-100 text-amber-700' },
  al_dia:        { label: 'Al día',        color: '#059669', bg: '#ecfdf5', cls: 'bg-green-100 text-green-700' },
  sin_historial: { label: 'Sin historial', color: '#6b7280', bg: '#f9fafb', cls: 'bg-gray-100 text-gray-600' },
};

export const VEHICLE_TYPE_LABELS = {
  automovil: 'Automóvil', camioneta: 'Camioneta', motocicleta: 'Motocicleta',
  camion: 'Camión', otro: 'Otro',
};

export const fmtKm = (n) => (n == null ? null : `${Number(n).toLocaleString('es-CO')} km`);

// Fechas DATEONLY ('YYYY-MM-DD') -- se fija el mediodía para que el huso
// horario no la corra un día hacia atrás.
export const fmtDateOnly = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

// "Faltan 1.200 km o 40 días" / "Vencido hace 300 km" -- texto corto para el
// semáforo, a partir de km_remaining / days_remaining.
// Con km_estimated el km sale del ritmo de uso del vehículo (no de una
// lectura real) -- se marca con "≈" para no presentarlo como dato exacto.
export function describeRemaining({ status, km_remaining, days_remaining, km_estimated }) {
  if (status === 'sin_historial') return 'Aún no hay registro de este servicio';
  const parts = [];
  if (km_remaining != null) {
    const approx = km_estimated ? '≈ ' : '';
    parts.push(km_remaining > 0
      ? `faltan ${approx}${Number(km_remaining).toLocaleString('es-CO')} km`
      : `pasado por ${approx}${Number(-km_remaining).toLocaleString('es-CO')} km`);
  }
  if (days_remaining != null) {
    if (days_remaining > 0) parts.push(`${days_remaining} día${days_remaining === 1 ? '' : 's'}`);
    else if (days_remaining === 0) parts.push('vence hoy');
    else parts.push(`venció hace ${-days_remaining} día${days_remaining === -1 ? '' : 's'}`);
  }
  if (parts.length === 0) return '';
  const text = parts.join(' · ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Ritmo de uso: "≈ 40 km/día".
export const fmtKmPerDay = (usage) =>
  usage?.km_per_day ? `≈ ${Number(usage.km_per_day).toLocaleString('es-CO', { maximumFractionDigits: 0 })} km/día` : null;
