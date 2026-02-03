/**
 * Utilidades para formateo de números
 */

/**
 * Formatear número con separadores de miles y decimales
 * @param {number|string} value - Valor a formatear
 * @param {number} decimals - Cantidad de decimales (default: 2)
 * @returns {string} - Número formateado
 */
export const formatNumber = (value, decimals = 1) => {
  if (value === null || value === undefined || value === '') return '0.00';
  
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00';
  
  return num.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Formatear como moneda (peso colombiano)
 * @param {number|string} value - Valor a formatear
 * @returns {string} - Moneda formateada
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '$0.0';
  
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';
  
  return num.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).replace('COP', '$');
};

/**
 * Formatear porcentaje
 * @param {number|string} value - Valor a formatear
 * @param {number} decimals - Cantidad de decimales (default: 1)
 * @returns {string} - Porcentaje formateado
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || value === '') return '0%';
  
  const num = parseFloat(value);
  if (isNaN(num)) return '0%';
  
  return `${num.toLocaleString('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}%`;
};

/**
 * Formatear número entero (sin decimales)
 * @param {number|string} value - Valor a formatear
 * @returns {string} - Número formateado
 */
export const formatInteger = (value) => {
  if (value === null || value === undefined || value === '') return '0';
  
  const num = parseInt(value);
  if (isNaN(num)) return '0';
  
  return num.toLocaleString('es-CO');
};

/**
 * Limpiar formato de número (para enviar al backend)
 * @param {string} formattedValue - Valor formateado
 * @returns {number} - Número limpio
 */
export const parseFormattedNumber = (formattedValue) => {
  if (!formattedValue) return 0;
  
  // Remover todo excepto números, punto y coma
  const cleaned = String(formattedValue)
    .replace(/[^0-9,.-]/g, '')
    .replace(/\./g, '') // Remover separadores de miles
    .replace(',', '.'); // Convertir coma decimal a punto
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

/**
 * Formatear stock con unidad de medida
 * @param {number|string} value - Valor del stock
 * @param {string} unit - Unidad de medida
 * @returns {string} - Stock formateado
 */
export const formatStock = (value, unit = 'unit') => {
  const formatted = formatNumber(value, 0);
  
  const unitLabels = {
    'unit': 'Unid.',
    'kg': 'kg',
    'g': 'g',
    'l': 'L',
    'ml': 'ml',
    'm': 'm',
    'cm': 'cm',
    'pack': 'Paq.',
    'box': 'Caja'
  };
  
  return `${formatted} ${unitLabels[unit] || unit}`;
};

/**
 * Abreviar números grandes (1.5K, 2.3M, etc.)
 * @param {number|string} value - Valor a abreviar
 * @returns {string} - Número abreviado
 */
export const abbreviateNumber = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  
  return formatNumber(num, 0);
};

/**
 * Colorear número según su valor (positivo/negativo)
 * @param {number|string} value - Valor
 * @returns {string} - Clase CSS
 */
export const getNumberColorClass = (value) => {
  const num = parseFloat(value);
  if (isNaN(num) || num === 0) return 'text-gray-900';
  return num > 0 ? 'text-green-600' : 'text-red-600';
};

/**
 * Formatear número con signo (+ o -)
 * @param {number|string} value - Valor
 * @returns {string} - Número con signo
 */
export const formatNumberWithSign = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00';
  
  const sign = num >= 0 ? '+' : '';
  return `${sign}${formatNumber(num, 2)}`;
};