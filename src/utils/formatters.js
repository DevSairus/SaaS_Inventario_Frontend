import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Formatear moneda (COP)
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '$0';

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Fecha LOCAL de hoy en formato YYYY-MM-DD, para inicializar inputs type="date".
// NUNCA usar new Date().toISOString().split('T')[0] para esto: toISOString()
// convierte a UTC primero, y en Bogotá (UTC-5) eso corre la fecha un día
// hacia adelante después de las 7pm.
export const toLocalDateString = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Formatear fecha
// IMPORTANTE: campos "solo fecha" (sale_date, due_date, delivery_date,
// return_date, purchase_date, etc.) se guardan como medianoche UTC.
// Si se leen con hora LOCAL en una zona UTC-negativa (Bogotá = UTC-5),
// la medianoche UTC cae en las 7pm del día anterior -> se ve un día
// menos. Por eso aquí se extraen los componentes en UTC, no locales.
export const formatDate = (date) => {
  if (!date) return '';
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    const utcAsLocal = new Date(
      parsedDate.getUTCFullYear(),
      parsedDate.getUTCMonth(),
      parsedDate.getUTCDate()
    );
    return format(utcAsLocal, 'dd/MM/yyyy', { locale: es });
  } catch (error) {
    return '';
  }
};

// Formatear fecha con hora
export const formatDateTime = (date) => {
  if (!date) return '';
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, 'dd/MM/yyyy HH:mm', { locale: es });
  } catch (error) {
    return '';
  }
};

// Formatear fecha larga
export const formatDateLong = (date) => {
  if (!date) return '';
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, "d 'de' MMMM 'de' yyyy", { locale: es });
  } catch (error) {
    return '';
  }
};

// Tiempo relativo (hace 2 horas)
export const formatRelativeTime = (date) => {
  if (!date) return '';
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(parsedDate, { addSuffix: true, locale: es });
  } catch (error) {
    return '';
  }
};

// Formatear mes/año
export const formatMonthYear = (month, year) => {
  const date = new Date(year, month - 1);
  return format(date, 'MMMM yyyy', { locale: es });
};

// Formatear número con separador de miles
export const formatNumber = (number) => {
  if (!number && number !== 0) return '0';
  return new Intl.NumberFormat('es-CO').format(number);
};

// Formatear consumo (m³)
export const formatConsumption = (m3) => {
  if (!m3 && m3 !== 0) return '0 m³';
  return `${formatNumber(m3)} m³`;
};

// Formatear porcentaje
export const formatPercentage = (value, decimals = 2) => {
  if (!value && value !== 0) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
};