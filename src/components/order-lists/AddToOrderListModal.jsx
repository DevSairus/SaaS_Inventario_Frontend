import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, Info } from 'lucide-react';
import Modal from '../common/Modal';
import Combobox, { HighlightMatch } from '../common/Combobox';
import { suppliersAPI } from '../../api/suppliers';
import { getProductSuggestion, addOrderListItem } from '../../api/orderLists';

const fmtQty = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toLocaleString('es-CO', { maximumFractionDigits: 2 });
};

/**
 * "Agregar a pedido": anota un producto en la lista de pedido abierta de un
 * proveedor (la crea si no existe). Sugiere el proveedor de la compra más
 * reciente y la cantidad para llegar al stock máximo; ambos editables.
 *
 * Props: isOpen, onClose, product ({ id, name, sku }), source ('stock_alert' | 'product' | 'manual'), onAdded(result)
 */
export default function AddToOrderListModal({ isOpen, onClose, product, source = 'manual', onAdded }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [supplierId, setSupplierId] = useState('');
  const [otherSupplier, setOtherSupplier] = useState(null);
  const [allSuppliers, setAllSuppliers] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen || !product?.id) return;
    let stale = false;
    setLoading(true);
    setSuggestion(null);
    setOtherSupplier(null);
    setNotes('');
    getProductSuggestion(product.id)
      .then((res) => {
        if (stale) return;
        const data = res.data;
        setSuggestion(data);
        // Sin proveedores vinculados: directo al buscador de proveedores.
        setSupplierId(data.default_supplier_id || '__other');
        setQuantity(String(data.suggested_quantity || 1));
        if (!data.suppliers.length) loadAllSuppliers();
      })
      .catch((e) => toast.error(e.response?.data?.message || 'No se pudo cargar la sugerencia'))
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product?.id]);

  const loadAllSuppliers = () => {
    if (allSuppliers) return;
    suppliersAPI.getAll({ is_active: true, limit: 10000, sort_by: 'name', sort_order: 'ASC' })
      .then((res) => setAllSuppliers(res.data || []))
      .catch(() => toast.error('Error al cargar proveedores'));
  };

  const chosenId = supplierId === '__other' ? otherSupplier?.id : supplierId;
  const pendingHere = suggestion?.pending?.find((p) => p.supplier_id === chosenId);
  const pendingElsewhere = (suggestion?.pending || []).filter((p) => p.supplier_id !== chosenId);

  const handleSave = async () => {
    const q = Number(String(quantity).replace(',', '.'));
    if (!chosenId) { toast.error('Elige el proveedor'); return; }
    if (!(q > 0)) { toast.error('La cantidad debe ser mayor que cero'); return; }
    setSaving(true);
    try {
      const res = await addOrderListItem({ supplier_id: chosenId, product_id: product.id, quantity: q, notes: notes.trim() || undefined, source });
      toast.success(res.message || 'Agregado al pedido');
      onAdded?.(res.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo agregar al pedido');
    } finally {
      setSaving(false);
    }
  };

  const p = suggestion?.product;
  const supplierLabel = (s) => (s ? `${s.business_name || s.name}${s.tax_id ? ` - ${s.tax_id}` : ''}` : '');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar a pedido" size="sm">
      {loading || !suggestion ? (
        <div className="py-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
            <p className="text-xs text-gray-500">
              SKU {p.sku} · Stock {fmtQty(p.current_stock)} · Mín {fmtQty(p.min_stock)}
              {Number(p.max_stock) > 0 && <> · Máx {fmtQty(p.max_stock)}</>}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proveedor</label>
            <div className="space-y-1.5">
              {suggestion.suppliers.map((s, i) => (
                <label key={s.id} className="flex items-start gap-2 text-sm cursor-pointer">
                  <input type="radio" name="supplier" className="mt-0.5" checked={supplierId === s.id} onChange={() => setSupplierId(s.id)} />
                  <span>
                    {s.name}
                    {i === 0 && s.last_purchase_date && <span className="ml-1 text-xs text-green-700">(última compra)</span>}
                    {s.supplier_code && <span className="block text-xs text-gray-500">Código del proveedor: {s.supplier_code}</span>}
                  </span>
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="supplier"
                  checked={supplierId === '__other'}
                  onChange={() => { setSupplierId('__other'); loadAllSuppliers(); }}
                />
                {suggestion.suppliers.length ? 'Otro proveedor' : 'Elegir proveedor'}
              </label>
              {supplierId === '__other' && (
                <Combobox
                  placeholder="Buscar proveedor por nombre o NIT..."
                  items={allSuppliers || []}
                  value={otherSupplier?.id || null}
                  displayValue={supplierLabel(otherSupplier)}
                  onSelect={setOtherSupplier}
                  onClear={() => setOtherSupplier(null)}
                  getSearchText={(s) => [s.name, s.business_name, s.tax_id].filter(Boolean).join(' ')}
                  renderItem={(s, q) => (
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100"><HighlightMatch text={s.business_name || s.name} query={q} /></p>
                      {s.tax_id && <p className="text-xs text-gray-500">NIT <HighlightMatch text={s.tax_id} query={q} /></p>}
                    </div>
                  )}
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad a pedir</label>
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sugerida: {fmtQty(suggestion.suggested_quantity)} ({Number(p.max_stock) > 0 ? 'hasta el stock máximo' : 'hasta el doble del stock mínimo'})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nota (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: urgente, referencia exacta, color..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {(pendingHere || pendingElsewhere.length > 0) && (
            <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2 flex gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <div>
                {pendingHere && <p>Ya está en el pedido {pendingHere.list_number} con {fmtQty(pendingHere.quantity)}: la cantidad se sumará.</p>}
                {pendingElsewhere.map((x) => (
                  <p key={x.list_id}>También está en el pedido {x.list_number} de otro proveedor ({fmtQty(x.quantity)}).</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50"
            >
              <ClipboardList className="w-4 h-4" />
              {saving ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
