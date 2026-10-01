// Helpers compartidos de combos (formulario de combos, selector y documentos).

// Estimado del total de una línea con IVA, mismo criterio que
// calculateItemTotals de SaleFormPage (precio con/sin IVA incluido, exento).
export function estimateLineTotal({ quantity, unit_price, product }) {
  const gross = (Number(quantity) || 0) * (Number(unit_price) || 0);
  if (!product || product.has_tax === false) return Math.round(gross);
  if (product.price_includes_tax) return Math.round(gross);
  const pct = Number(product.tax_percentage ?? 19) || 0;
  return Math.round(gross + (gross * pct) / 100);
}

export function estimateComboTotal(items) {
  return (items || []).reduce((sum, it) => sum + estimateLineTotal(it), 0);
}

// UUID del grupo de un combo dentro de un documento. crypto.randomUUID solo
// existe en contextos seguros (https / localhost).
export function newComboGroupId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Agrupa líneas de documento por combo_group_id conservando el orden.
// Devuelve [{ type: 'line', item, index } | { type: 'combo', groupId, name,
// quantity, showBreakdown, rows: [{ item, index }], total }].
export function groupDocumentItems(items) {
  const entries = [];
  const byGroup = new Map();
  (items || []).forEach((item, index) => {
    if (!item.combo_group_id) {
      entries.push({ type: 'line', item, index });
      return;
    }
    let entry = byGroup.get(item.combo_group_id);
    if (!entry) {
      entry = {
        type: 'combo',
        groupId: item.combo_group_id,
        comboId: item.combo_id,
        name: item.combo_name || 'Combo',
        quantity: Number(item.combo_quantity) || 1,
        showBreakdown: item.combo_show_breakdown !== false,
        rows: [],
        total: 0,
      };
      byGroup.set(item.combo_group_id, entry);
      entries.push(entry);
    }
    entry.rows.push({ item, index });
    entry.total += Number(item.total) || 0;
  });
  return entries;
}
