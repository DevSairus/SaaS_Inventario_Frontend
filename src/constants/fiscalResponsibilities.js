// Responsabilidades fiscales del emisor (Anexo Técnico FE 1.9, tabla 13.2.6.1).
// Misma lista y regla que backend/src/utils/fiscalResponsibilities.js:
// se guardan separadas por ';' y R-99-PN no se combina con las demás.
export const FISCAL_RESPONSIBILITIES = [
  { code: 'O-13', label: 'Gran contribuyente' },
  { code: 'O-15', label: 'Autorretenedor' },
  { code: 'O-23', label: 'Agente de retención de IVA' },
  { code: 'O-47', label: 'Régimen Simple de Tributación' },
  { code: 'R-99-PN', label: 'No aplica – Otros' },
];

const VALID = FISCAL_RESPONSIBILITIES.map((r) => r.code);

export function parseResponsibilities(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[;,\s]+/);
  const set = new Set(raw.map((c) => String(c).trim().toUpperCase()).filter((c) => VALID.includes(c)));
  if (set.size > 1) set.delete('R-99-PN');
  if (!set.size) return ['R-99-PN'];
  return VALID.filter((c) => set.has(c));
}
