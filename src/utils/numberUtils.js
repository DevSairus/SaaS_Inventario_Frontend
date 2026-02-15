/**
 * Utilidades para manejo de números - Sin decimales
 * Diseñado para evitar problemas de precisión con números flotantes
 * y garantizar que los números enteros se mantengan como enteros
 */

/**
 * Convierte un valor a número entero seguro
 * Evita que 30 se convierta en 29.99
 */
export const toInteger = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    return defaultValue;
  }
  
  // Math.round evita problemas de precisión
  return Math.round(num);
};

/**
 * Convierte un valor a número (sin forzar entero)
 */
export const toNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Redondea un número a entero (sin decimales)
 */
export const roundToInteger = (value) => {
  const num = toNumber(value, 0);
  return Math.round(num);
};

/**
 * Formatea un número como moneda colombiana (sin decimales)
 */
export const formatCurrency = (value) => {
  const num = toNumber(value, 0);
  const rounded = Math.round(num);
  
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(rounded);
};

/**
 * Formatea un número con separadores de miles (sin decimales)
 */
export const formatNumber = (value) => {
  const num = toNumber(value, 0);
  const rounded = Math.round(num);
  
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(rounded);
};

/**
 * Formatea un número de cantidad (entero, sin separadores)
 */
export const formatQuantity = (value) => {
  const num = toInteger(value, 0);
  return num.toString();
};

/**
 * Parsea un string formateado a número
 */
export const parseFormattedNumber = (formattedValue) => {
  if (!formattedValue) return 0;
  
  const cleaned = String(formattedValue)
    .replace(/[$\s]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
};

/**
 * Calcula porcentaje de un valor
 */
export const calculatePercentage = (value, percentage) => {
  const baseValue = toNumber(value, 0);
  const percentValue = toNumber(percentage, 0);
  
  const result = (baseValue * percentValue) / 100;
  return Math.round(result);
};

/**
 * Calcula subtotal de un item (cantidad * precio)
 */
export const calculateSubtotal = (quantity, unitPrice) => {
  const qty = toInteger(quantity, 0);
  const price = toNumber(unitPrice, 0);
  
  const result = qty * price;
  return Math.round(result);
};

/**
 * Calcula el IVA de un valor
 */
export const calculateTax = (value, taxRate) => {
  const baseValue = toNumber(value, 0);
  const rate = toNumber(taxRate, 0);
  
  const result = (baseValue * rate) / 100;
  return Math.round(result);
};

/**
 * Calcula descuento de un valor
 */
export const calculateDiscount = (value, discountPercentage) => {
  return calculatePercentage(value, discountPercentage);
};

/**
 * Calcula totales de un item de compra/venta
 */
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

  return {
    subtotal: subtotalAfterDiscount,
    discountAmount,
    taxAmount,
    total
  };
};

/**
 * Valida que un valor sea un número válido mayor o igual a cero
 */
export const isValidNumber = (value) => {
  const num = toNumber(value);
  return num >= 0;
};

/**
 * Valida que un valor sea una cantidad válida (entero mayor a 0)
 */
export const isValidQuantity = (value) => {
  const num = toInteger(value);
  return num > 0;
};

/**
 * Formatea porcentaje
 */
export const formatPercentage = (value) => {
  const num = toNumber(value, 0);
  return `${num}%`;
};

/**
 * Limita un número a un rango
 */
export const clamp = (value, min, max) => {
  const num = toNumber(value, min);
  return Math.max(min, Math.min(max, num));
};

/**
 * Maneja el cambio de un input numérico
 */
export const handleNumberInput = (e, setter, options = {}) => {
  const { isInteger = true, min = 0, max = Infinity } = options;
  const { name, value } = e.target;
  
  if (value === '') {
    setter(prev => ({ ...prev, [name]: '' }));
    return;
  }
  
  let numValue = isInteger ? toInteger(value, min) : toNumber(value, min);
  numValue = clamp(numValue, min, max);
  
  setter(prev => ({ ...prev, [name]: numValue }));
};

/**
 * Configuración recomendada para inputs numéricos
 */
export const INPUT_CONFIG = {
  quantity: {
    type: 'number',
    min: '1',
    step: '1',
    pattern: '[0-9]*',
    inputMode: 'numeric'
  },
  price: {
    type: 'number',
    min: '0',
    step: '1',
    pattern: '[0-9]*',
    inputMode: 'numeric'
  },
  percentage: {
    type: 'number',
    min: '0',
    max: '100',
    step: '1',
    pattern: '[0-9]*',
    inputMode: 'numeric'
  }
};

export default {
  toInteger,
  toNumber,
  roundToInteger,
  formatCurrency,
  formatNumber,
  formatQuantity,
  parseFormattedNumber,
  calculatePercentage,
  calculateSubtotal,
  calculateTax,
  calculateDiscount,
  calculateItemTotals,
  isValidNumber,
  isValidQuantity,
  formatPercentage,
  clamp,
  handleNumberInput,
  INPUT_CONFIG
};