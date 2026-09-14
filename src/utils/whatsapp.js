// frontend/src/utils/whatsapp.js
//
// Mismo criterio de formateo que backend/src/services/whatsappService.js —
// acá solo se arma el enlace wa.me para las quick actions del CRM (no hay
// sesión que gestionar, es el mismo patrón "clic → WhatsApp Web/App").
import crmApi from '../api/crm';

/**
 * Normaliza un número que ya viene con indicativo (vía bestPhone) →
 * "573001234567". Se mantiene el nombre por compatibilidad, pero ya no
 * asume Colombia a fuego: si el número entra con 11+ dígitos se respeta tal
 * cual (indicativo real, sea cual sea); solo se antepone "57" cuando llega
 * como celular colombiano de 10 dígitos sin indicativo (dato legado o
 * teléfono fijo sin mobile_country_code asociado).
 */
export const formatColombianPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 11) return digits;
  if (digits.length === 10) return `57${digits}`;
  return digits;
};

/** Construye un enlace wa.me con mensaje pre-cargado (o vacío) */
export const buildWaLink = (phone, text = '') => {
  const formatted = formatColombianPhone(phone);
  if (!formatted) return null;
  return `https://wa.me/${formatted}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

/**
 * Mejor teléfono disponible para contacto directo (celular > fijo), ya con
 * el indicativo de país antepuesto cuando es el celular (mobile_country_code,
 * "57" Colombia por defecto) — Meta/WhatsApp exige el número completo E.164.
 */
export const bestPhone = (customerOrEntity) => {
  if (!customerOrEntity) return '';
  const mobileDigits = String(customerOrEntity.mobile || '').replace(/\D/g, '');
  if (mobileDigits) {
    const code = String(customerOrEntity.mobile_country_code || '57').replace(/\D/g, '') || '57';
    return mobileDigits.startsWith(code) ? mobileDigits : `${code}${mobileDigits}`;
  }
  return customerOrEntity.phone || '';
};

// C.4 — "Registro automático de interacción al enviar WhatsApp". No hay API
// oficial de WhatsApp Business ni webhook: no hay forma de confirmar que el
// mensaje se entregó, solo que el asesor abrió el enlace wa.me. Por eso es
// best-effort — outcome siempre 'sin_respuesta' (no se sabe el resultado
// todavía) y nunca bloquea el envío si falla el registro.
// Se llama junto al onClick/window.open del enlace, no en su lugar.
export const trackWhatsAppInteraction = (customerId, text, hasCrm) => {
  if (!hasCrm || !customerId) return;
  const summary = text
    ? `WhatsApp enviado: "${text.length > 140 ? `${text.slice(0, 140)}…` : text}"`
    : 'WhatsApp enviado desde el CRM';
  crmApi.createInteraction(customerId, { type: 'whatsapp', summary, outcome: 'sin_respuesta' })
    .catch(() => { /* best-effort: si falla el registro no se avisa ni se reintenta */ });
};