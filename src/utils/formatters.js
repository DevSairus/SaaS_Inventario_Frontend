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

// Formatear fecha
export const formatDate = (date) => {
  if (!date) return '';
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, 'dd/MM/yyyy', { locale: es });
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
