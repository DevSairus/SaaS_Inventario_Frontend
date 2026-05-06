// Validar email
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validar teléfono colombiano (celular: 3XXXXXXXXX)
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const re = /^[3][0-9]{9}$/;
  return re.test(phone.replace(/\s/g, ''));
};

// Validar cédula (entre 6 y 10 dígitos)
export const validateIdentification = (id) => {
  if (!id) return false;
  const value = String(id).trim();
  return value.length >= 6 && value.length <= 10 && /^\d+$/.test(value);
};

// Validar contraseña (min 6 caracteres)
export const validatePassword = (password) => {
  return !!password && String(password).length >= 6;
};

// Validar monto positivo
export const validateAmount = (amount) => {
  if (amount === null || amount === undefined || amount === '') return false;
  const n = Number(amount);
  return !Number.isNaN(n) && n > 0;
};

/**
 * Calcula el dígito de verificación (DV) para un NIT colombiano según la DIAN.
 * Referencia: https://www.dian.gov.co/
 * @param {string} nitNumber - NIT sin dígito de verificación (solo dígitos).
 * @returns {number|null} DV (0-9) o null si el input no es válido.
 */
export const calculateNitDV = (nitNumber) => {
  const digits = String(nitNumber || '').replace(/\D/g, '');
  if (!digits) return null;
  // Multiplicadores DIAN (ponderaciones oficiales), de derecha a izquierda
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const reversed = digits.split('').reverse();
  let sum = 0;
  for (let i = 0; i < reversed.length; i++) {
    const weight = weights[i];
    if (weight === undefined) return null; // NIT demasiado largo
    sum += Number(reversed[i]) * weight;
  }
  const mod = sum % 11;
  if (mod === 0 || mod === 1) return mod;
  return 11 - mod;
};

/**
 * Valida un NIT colombiano con su dígito de verificación.
 * Acepta formatos: "900123456-7", "900123456 7", "9001234567".
 * Si el NIT viene sin DV (sólo número base), se valida longitud y que sea numérico.
 * @param {string} nit
 * @returns {boolean}
 */
export const validateNIT = (nit) => {
  if (!nit) return false;
  const clean = String(nit).trim().replace(/\./g, '');

  // Separar base y DV (si viene con guion o espacio)
  const match = clean.match(/^(\d{6,15})[\s-]?(\d)?$/);
  if (!match) return false;

  const base = match[1];
  const providedDV = match[2];

  if (providedDV === undefined) {
    // Sólo base: validamos longitud razonable
    return base.length >= 8 && base.length <= 15;
  }

  if (base.length < 8 || base.length > 15) return false;
  const expectedDV = calculateNitDV(base);
  return expectedDV !== null && expectedDV === Number(providedDV);
};

/**
 * Acepta cédula (6-10 dígitos) o NIT (con o sin DV).
 * Útil para campos "NIT / Cédula".
 */
export const validateTaxId = (value) => {
  if (!value) return false;
  const clean = String(value).trim();
  if (validateIdentification(clean)) return true;
  return validateNIT(clean);
};
