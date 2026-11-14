import axios from './axios';

/**
 * Adjuntos de documentos (backend/src/routes/attachments.routes.js).
 * entity_type: purchase | expense | transfer | project | sale | payment_batch | supplier
 */
export const getAttachments = async (entityType, entityId) => {
  const response = await axios.get('/attachments', { params: { entity_type: entityType, entity_id: entityId } });
  return response.data;
};

// kind: invoice_pdf | invoice_xml | payment_proof | delivery_note | photo | contract | quote | rut | chamber_of_commerce | other
// validUntil (AAAA-MM-DD): vigencia, solo se guarda para chamber_of_commerce.
export const uploadAttachment = async ({ entityType, entityId, file, kind, description, validUntil }) => {
  const form = new FormData();
  form.append('entity_type', entityType);
  form.append('entity_id', entityId);
  if (kind) form.append('kind', kind);
  if (description) form.append('description', description);
  if (validUntil) form.append('valid_until', validUntil);
  form.append('file', file);
  const response = await axios.post('/attachments', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
  return response.data;
};

// El archivo pasa por el backend (nunca hay URL pública): se recibe como blob.
export const downloadAttachment = async (id, { inline = false } = {}) => {
  const response = await axios.get(`/attachments/${id}/download`, { params: inline ? { inline: 1 } : {}, responseType: 'blob', timeout: 120000 });
  return response.data;
};

export const deleteAttachment = async (id) => {
  const response = await axios.delete(`/attachments/${id}`);
  return response.data;
};
