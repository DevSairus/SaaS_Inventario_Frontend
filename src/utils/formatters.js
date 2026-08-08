import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Moneda y números (es-CO: punto de miles, coma decimal)
//
// Antes vivían repartidos en tres archivos (formatters.js, numberFormat.js,
// numberUtils.js) con implementaciones distintas de "formatCurrency" -- acá
// quedan unificados. `formatCurrency` SIEMPRE incluye el símbolo "$" (estilo
// Intl currency); si un componente necesita el número sin símbolo (para
// anteponer su propio "$" en el JSX), usar `formatNumber`.
// ---------------------------------------------------------------------------

export const formatCurrency = (amount, { decimals = 0 } = {}) => {
  if (!amount && amount !== 0) return '$0';

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

// Número con separador de miles, sin símbolo de moneda. `decimals` es
// opcional -- sin especificarlo conserva los decimales que ya traiga el
// valor (mismo comportamiento histórico de esta función).
export const formatNumber = (number, decimals) => {
  if (!number && number !== 0) return '0';
  const opciones = decimals === undefined ? {} : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  return new Intl.NumberFormat('es-CO', opciones).format(number);
};

export const formatInteger = (value) => {
  if (value === null || value === undefined || value === '') return '0';
  const num = parseInt(value, 10);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('es-CO');
};

// Inverso de formatCurrency/formatNumber -- limpia separadores de miles y
// coma decimal para mandar el valor crudo al backend.
export const parseFormattedNumber = (formattedValue) => {
  if (!formattedValue && formattedValue !== 0) return 0;
  const cleaned = String(formattedValue)
    .replace(/[^0-9,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
};

export const formatStock = (value, unit = 'unit') => {
  const formatted = formatNumber(value, 0);
  const unitLabels = {
    unit: 'Unid.',
    kg: 'kg',
    g: 'g',
    l: 'L',
    ml: 'ml',
    m: 'm',
    cm: 'cm',
    pack: 'Paq.',
    box: 'Caja',
  };
  return `${formatted} ${unitLabels[unit] || unit}`;
};

export const formatConsumption = (m3) => {
  if (!m3 && m3 !== 0) return '0 m³';
  return `${formatNumber(m3)} m³`;
};

export const formatPercentage = (value, decimals = 2) => {
  if (!value && value !== 0) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
};

// ---------------------------------------------------------------------------
// Enteros seguros para cálculos (compras, ajustes, ventas) -- ex numberUtils.js.
// COP no maneja centavos: todo cálculo de dinero se redondea a entero para
// evitar el clásico "30 se convierte en 29.99" de punto flotante.
// ---------------------------------------------------------------------------

export const toInteger = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : Math.round(num);
};

export const toNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
};

export const calculatePercentage = (value, percentage) => Math.round((toNumber(value, 0) * toNumber(percentage, 0)) / 100);

export const calculateSubtotal = (quantity, unitPrice) => Math.round(toInteger(quantity, 0) * toNumber(unitPrice, 0));

export const calculateTax = (value, taxRate) => calculatePercentage(value, taxRate);

export const calculateDiscount = (value, discountPercentage) => calculatePercentage(value, discountPercentage);

export const calculateItemTotals = (item) => {
  const quantity = toInteger(item.quantity, 0);
  const unitCost = toNumber(item.unit_cost || item.unit_price, 0);
  const taxRate = toNumber(item.tax_rate, 0);
  const discountPercentage = toNumber(item.discount_percentage, 0);

  const subtotal = calculateSubtotal(quantity, unitCost);
  const discountAmount = calculateDiscount(subtotal, discountPercentage);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const taxAmount = calculateTax(subtotalAfterDiscount, taxRate);
  const total = subtotalAfterDiscount + taxAmount;

  return { subtotal: subtotalAfterDiscount, discountAmount, taxAmount, total };
};

export const isValidNumber = (value) => toNumber(value) >= 0;

export const isValidQuantity = (value) => toInteger(value) > 0;

export const clamp = (value, min, max) => Math.max(min, Math.min(max, toNumber(value, min)));

/** Maneja el cambio de un `<input>` numérico controlado (name/value en el evento). */
export const handleNumberInput = (e, setter, options = {}) => {
  const { isInteger = true, min = 0, max = Infinity } = options;
  const { name, value } = e.target;

  if (value === '') {
    setter((prev) => ({ ...prev, [name]: '' }));
    return;
  }

  let numValue = isInteger ? toInteger(value, min) : toNumber(value, min);
  numValue = clamp(numValue, min, max);
  setter((prev) => ({ ...prev, [name]: numValue }));
};

/** Configuración recomendada para inputs numéricos nativos. */
export const INPUT_CONFIG = {
  quantity: { type: 'number', min: '1', step: '1', pattern: '[0-9]*', inputMode: 'numeric' },
  price: { type: 'number', min: '0', step: '1', pattern: '[0-9]*', inputMode: 'numeric' },
  percentage: { type: 'number', min: '0', max: '100', step: '1', pattern: '[0-9]*', inputMode: 'numeric' },
};

// ---------------------------------------------------------------------------
// Fechas (sin cambios frente a la versión anterior de este archivo)
// ---------------------------------------------------------------------------

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
    const utcAsLocal = new Date(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate());
    return format(utcAsLocal, 'dd/MM/yyyy', { locale: es });
  } catch (error) {
    return '';
  }
};

export const formatDateTime = (date) => {
  if (!date) return '';
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, 'dd/MM/yyyy HH:mm', { locale: es });
  } catch (error) {
    return '';
  }
};

export const formatDateLong = (date) => {
  if (!date) return '';
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, "d 'de' MMMM 'de' yyyy", { locale: es });
  } catch (error) {
    return '';
  }
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(parsedDate, { addSuffix: true, locale: es });
  } catch (error) {
    return '';
  }
};

export const formatMonthYear = (month, year) => {
  const date = new Date(year, month - 1);
  return format(date, 'MMMM yyyy', { locale: es });
};
