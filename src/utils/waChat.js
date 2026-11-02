// Lógica pura del chat de WhatsApp Pitbox (sin React), probada con
// `node --test src/utils/waChat.test.js`.
import { format, isSameDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

/** Últimos 10 dígitos: chats viejos guardan el número sin el 57. */
export const phoneKey = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);

export function groupMessagesByDay(messages, now = new Date()) {
  const yesterday = subDays(now, 1);
  const groups = [];
  for (const m of messages || []) {
    const d = m?.created_at ? new Date(m.created_at) : null;
    if (!d || Number.isNaN(d.getTime())) continue;
    const key = format(d, 'yyyy-MM-dd');
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const label = isSameDay(d, now) ? 'Hoy'
        : isSameDay(d, yesterday) ? 'Ayer'
          : format(d, "EEEE d 'de' MMMM", { locale: es });
      group = { key, label, messages: [] };
      groups.push(group);
    }
    group.messages.push(m);
  }
  return groups;
}

export const templateBody = (schema) =>
  (schema || []).find((c) => String(c?.type).toUpperCase() === 'BODY')?.text || '';

export const templateVariableCount = (schema) =>
  new Set(templateBody(schema).match(/\{\{\d+\}\}/g) || []).size;

const MAX_TEMPLATE_VARS = 2;

// {{1}} = primer nombre del cliente, {{2}} = taller. Plantillas con más datos
// o con encabezado multimedia necesitan parámetros que aquí no tenemos.
export function buildTemplatePayload({ template, customerName, companyName }) {
  const schema = template?.components_schema || [];
  const header = schema.find((c) => String(c?.type).toUpperCase() === 'HEADER');
  if (header && header.format && String(header.format).toUpperCase() !== 'TEXT') {
    return { ok: false, reason: 'Esta plantilla tiene imagen o documento en el encabezado' };
  }
  const count = templateVariableCount(schema);
  if (count > MAX_TEMPLATE_VARS) {
    return { ok: false, reason: `Esta plantilla necesita ${count} datos; solo se llenan nombre y taller` };
  }
  const values = [
    String(customerName || '').trim().split(/\s+/)[0] || 'cliente',
    String(companyName || '').trim() || 'nuestro taller',
  ].slice(0, count);
  const preview = templateBody(schema).replace(/\{\{(\d+)\}\}/g, (m, n) => values[Number(n) - 1] ?? m);
  const components = count
    ? [{ type: 'body', parameters: values.map((text) => ({ type: 'text', text })) }]
    : [];
  return { ok: true, preview, components };
}
