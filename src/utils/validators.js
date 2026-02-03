// Validar email
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validar teléfono colombiano
export const validatePhone = (phone) => {
  const re = /^[3][0-9]{9}$/;
  return re.test(phone.replace(/\s/g, ''));
};

// Validar cédula
export const validateIdentification = (id) => {
  return id && id.length >= 6 && id.length <= 10 && /^\d+$/.test(id);
};

// Validar contraseña (min 6 caracteres)
export const validatePassword = (password) => {
  return password && password.length >= 6;
};

// Validar monto
export const validateAmount = (amount) => {
  return amount && !isNaN(amount) && Number(amount) > 0;
};
