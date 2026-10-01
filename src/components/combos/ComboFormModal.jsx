// Crear / editar un combo: nombre, cómo se muestra en documentos y sus
// componentes. El precio de cada componente arranca en el base_price del
// producto y se puede editar.
import { useState, useEffect } from 'react';
import { Search, Trash2, Loader2, Package, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import useProductsStore from '../../store/productsStore';
import { formatCurrency } from '../../utils/formatters';
import { estimateLineTotal, estimateComboTotal } from './comboUtils';

const inputCls = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-white/5';

const EMPTY_FORM = { name: '', description: '', show_breakdown: true, is_active: true, items: [] };

function toFormItem(ci) {
  return {
    product_id: ci.product_id,
    product: ci.product,
    quantity: Number(ci.quantity) || 1,
    unit_price: Number(ci.unit_price) || 0,
  };
}

export default function ComboFormModal({ isOpen, onClose, onSave, combo }) {
  const { searchProducts } = useProductsStore();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(combo ? {
      name: combo.name,
      description: combo.description || '',
      show_breakdown: combo.show_breakdown !== false,
      is_active: combo.is_active !== false,
      items: (combo.items || []).map(toFormItem),
    } : EMPTY_FORM);
    setSearchTerm('');
    setResults([]);
  }, [isOpen, combo]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchProducts(searchTerm) || []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, searchProducts]);

  const addProduct = (product) => {
    if (form.items.some(i => i.product_id === product.id)) {
      toast.error('Ese producto ya está en el combo');
      return;
    }
    setForm(f => ({
      ...f,
      items: [...f.items, { product_id: product.id, product, quantity: 1, unit_price: Number(product.base_price) || 0 }],
    }));
    setSearchTerm('');
    setResults([]);
  };

  const updateItem = (index, field, value) => {
    setForm(f => ({ ...f, items: f.items.map((it, i) => (i === index ? { ...it, [field]: value } : it)) }));
  };

  const removeItem = (index) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('El nombre es requerido');
    if (form.items.length === 0) return toast.error('Agrega al menos un producto o servicio');
    if (form.items.some(i => !(Number(i.quantity) > 0))) return toast.error('Las cantidades deben ser mayores a 0');
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim() || null,
        show_breakdown: form.show_breakdown,
        is_active: form.is_active,
        items: form.items.map(i => ({
          product_id: i.product_id,
          quantity: Number(i.quantity),
          unit_price: Math.max(0, Number(i.unit_price) || 0),
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  const total = estimateComboTotal(form.items);

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title={combo ? 'Editar combo' : 'Nuevo combo'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
            <input value={form.name} maxLength={200} placeholder="Mantenimiento 10.000 km" className={inputCls}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Descripción</label>
            <input value={form.description} placeholder="Opcional" className={inputCls}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">En facturas, cotizaciones y órdenes mostrar</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { value: true, title: 'Desglosado', hint: 'Cada producto con su precio' },
              { value: false, title: 'Solo nombre y total', hint: 'Una línea con el total del combo' },
            ].map(opt => (
              <button key={String(opt.value)} type="button"
                onClick={() => setForm(f => ({ ...f, show_breakdown: opt.value }))}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition ${
                  form.show_breakdown === opt.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}>
                <span className="font-medium">{opt.title}</span>
                <span className="block text-xs text-gray-500">{opt.hint}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Es el valor por defecto: se puede cambiar al agregar el combo a cada documento.</p>
        </div>

        {/* Buscador de productos */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Agregar producto o servicio</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchTerm} placeholder="Buscar por nombre, SKU o código..." className={`${inputCls} pl-9`}
              onChange={e => setSearchTerm(e.target.value)} />
            {searching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
          </div>
          {results.length > 0 && (
            <div className="mt-1 border border-gray-200 dark:border-white/10 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-50 dark:divide-white/5">
              {results.map(p => (
                <button key={p.id} type="button" onClick={() => addProduct(p)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5">
                  <span className="min-w-0 flex items-center gap-2">
                    {p.product_type === 'service'
                      ? <Wrench size={14} className="text-blue-500 shrink-0" />
                      : <Package size={14} className="text-gray-400 shrink-0" />}
                    <span className="truncate">{p.name}</span>
                    {p.sku && <span className="text-xs text-gray-400 shrink-0">{p.sku}</span>}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 shrink-0">{formatCurrency(p.base_price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Componentes */}
        <div className="border border-gray-100 dark:border-white/10 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="bg-gray-50 dark:bg-white/5 text-xs text-gray-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Producto / servicio</th>
                <th className="text-right px-2 py-2 font-medium w-24">Cant.</th>
                <th className="text-right px-2 py-2 font-medium w-36">Precio unit.</th>
                <th className="text-right px-3 py-2 font-medium w-32">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {form.items.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-gray-400 py-6">Busca y agrega los productos o servicios del combo</td></tr>
              ) : form.items.map((it, index) => {
                const basePrice = Number(it.product?.base_price) || 0;
                const edited = Number(it.unit_price) !== basePrice;
                return (
                  <tr key={it.product_id}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-800 dark:text-gray-100">{it.product?.name || 'Producto'}</p>
                      <p className="text-xs text-gray-400">
                        {it.product?.product_type === 'service' ? 'Servicio' : 'Producto'}
                        {it.product?.is_active === false && <span className="text-red-500"> · inactivo</span>}
                        {edited && <> · precio de lista {formatCurrency(basePrice)}</>}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0.001" step="any" value={it.quantity} className={`${inputCls} text-right px-2`}
                        onChange={e => updateItem(index, 'quantity', e.target.value)} />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" step="any" value={it.unit_price} className={`${inputCls} text-right px-2`}
                        onChange={e => updateItem(index, 'unit_price', e.target.value)} />
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">{formatCurrency(estimateLineTotal(it))}</td>
                    <td className="px-2 py-2">
                      <button type="button" onClick={() => removeItem(index)} title="Quitar"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {form.items.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-white/5">
                  <td colSpan={3} className="px-3 py-2 text-right text-xs text-gray-500">Total estimado (con IVA)</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatCurrency(total)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          Activo (disponible para agregar en documentos)
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-white/5">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
