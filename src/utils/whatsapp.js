// frontend/src/utils/whatsapp.js
//
// Mismo criterio de formateo que backend/src/services/whatsappService.js —
// acá solo se arma el enlace wa.me para las quick actions del CRM (no hay
// sesión que gestionar, es el mismo patrón "clic → WhatsApp Web/App").
import crmApi from '../api/crm';

/** Normaliza número colombiano → "573001234567" */
export const formatColombianPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('57') && digits.length >= 12) return digits;
  if (digits.startsWith('3') && digits.length === 10) return `57${digits}`;
  return `57${digits}`;
};

/** Construye un enlace wa.me con mensaje pre-cargado (o vacío) */
export const buildWaLink = (phone, text = '') => {
  const formatted = formatColombianPhone(phone);
  if (!formatted) return null;
  return `https://wa.me/${formatted}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

/** Mejor teléfono disponible para contacto directo (celular > fijo) */
export const bestPhone = (customerOrEntity) => {
  if (!customerOrEntity) return '';
  return customerOrEntity.mobile || customerOrEntity.phone || '';
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