import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import ProductSearchInput from '../common/ProductSearchInput';
import { addOrderListItem } from '../../api/orderLists';

/**
 * Anotar una línea en la lista de pedido de un proveedor: producto del
 * catálogo o línea libre (solo descripción, para lo que aún no existe).
 * Props: supplierId, onAdded(result), compact (en una fila, para el detalle)
 */
export default function OrderLineForm({ supplierId, onAdded, compact = false }) {
  const [mode, setMode] = useState('product');
  const [search, setSearch] = useState('');
  const [product, setProduct] = useState(null);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSearch(''); setProduct(null); setDescription(''); setQuantity(''); setNotes('');
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!supplierId) { toast.error('Elige el proveedor'); return; }
    if (mode === 'product' && !product) { toast.error('Busca y elige un producto'); return; }
    if (mode === 'free' && !description.trim()) { toast.error('Escribe la descripción'); return; }
    const q = quantity === '' ? undefined : Number(String(quantity).replace(',', '.'));
    if (q !== undefined && !(q > 0)) { toast.error('La cantidad debe ser mayor que cero'); return; }
    setSaving(true);
    try {
      const res = await addOrderListItem({
        supplier_id: supplierId,
        product_id: mode === 'product' ? product.id : undefined,
        description: mode === 'free' ? description.trim() : undefined,
        quantity: q,
        notes: notes.trim() || undefined,
        source: 'manual',
      });
      toast.success(res.message || 'Línea agregada');
      reset();
      onAdded?.(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo agregar la línea');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm';

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" checked={mode === 'product'} onChange={() => setMode('product')} /> Producto del catálogo
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" checked={mode === 'free'} onChange={() => setMode('free')} /> Línea libre
        </label>
      </div>
      <div className={compact ? 'grid grid-cols-1 md:grid-cols-12 gap-3 items-start' : 'space-y-3'}>
        <div className={compact ? 'md:col-span-5' : ''}>
          {mode === 'product' ? (
            <ProductSearchInput
              value={search}
              onChange={(t) => { setSearch(t); if (product) setProduct(null); }}
              onSelect={(p) => { setProduct(p); setSearch(`${p.sku} - ${p.name}`); }}
              onClear={() => { setProduct(null); setSearch(''); }}
              hasSelection={!!product}
              show={{ stock: true }}
            />
          ) : (
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción (ej: filtro de aire referencia XYZ)"
              maxLength={255}
              className={inputCls}
            />
          )}
        </div>
        <div className={compact ? 'md:col-span-2' : ''}>
          <input
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={mode === 'product' ? 'Cant. (sugerida)' : 'Cantidad'}
            className={inputCls}
          />
        </div>
        <div className={compact ? 'md:col-span-3' : ''}>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nota (opcional)" className={inputCls} />
        </div>
        <div className={compact ? 'md:col-span-2' : ''}>
          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {saving ? 'Agregando...' : 'Agregar'}
          </button>
        </div>
      </div>
      {mode === 'product' && (
        <p className="text-xs text-gray-500">Sin cantidad se usa la sugerida (hasta el stock máximo, o el doble del mínimo).</p>
      )}
    </form>
  );
}
