/**
 * Helpers puros para el booking público (/agendar/:slug).
 * Sin dependencias de React — testeables con node:test.
 */

/** @param {Date} date */
export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Carrusel de días locales a partir de `from` (inclusive).
 * @param {Date} from
 * @param {number} [count=14]
 * @returns {{ dateKey: string, weekdayShort: string, dayNumber: number, isToday: boolean }[]}
 */
export function buildDayCarousel(from, count = 14) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const todayKey = toDateKey(start);
  const days = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push({
      dateKey: toDateKey(d),
      weekdayShort: d.toLocaleDateString('es-CO', { weekday: 'short' }).replace(/\.$/, ''),
      dayNumber: d.getDate(),
      isToday: toDateKey(d) === todayKey,
    });
  }
  return days;
}

/**
 * Franja 'HH:mm' (hora del taller, 24 h) en formato de 12 h: '13:00' -> '1:00 p. m.'.
 * Se formatea el texto, no un Date: la hora no debe moverse con la zona del navegador.
 * @param {string} hhmm
 */
export function formatSlotTime(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

/**
 * Sede principal (`is_main`) primero; el resto conserva orden relativo.
 * No muta el array de entrada.
 * @template {{ is_main?: boolean }} T
 * @param {T[]} branches
 * @returns {T[]}
 */
export function sortBranchesPrincipalFirst(branches) {
  const list = Array.isArray(branches) ? [...branches] : [];
  return list.sort((a, b) => Number(!!b.is_main) - Number(!!a.is_main));
}
