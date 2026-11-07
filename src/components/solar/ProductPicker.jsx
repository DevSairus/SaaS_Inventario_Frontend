import { useState } from 'react';
import { X } from 'lucide-react';
import ProductSearchInput from '../common/ProductSearchInput';
import { formatCurrency } from '../../utils/formatters';

/**
 * Producto elegido (nombre + precio) o buscador para elegir uno.
 * value: { id, name, sku, base_price? } | null
 */
export default function ProductPicker({ value, onChange, placeholder }) {
  const [text, setText] = useState('');
  if (value?.id) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800">
        <span className="min-w-0 truncate">
          <span className="text-gray-900 dark:text-gray-100">{value.name}</span>
          {value.sku && <span className="text-gray-500"> · {value.sku}</span>}
          {value.base_price != null && <span className="text-gray-500"> · {formatCurrency(value.base_price)}</span>}
        </span>
        <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-gray-600" title="Quitar"><X className="w-4 h-4" /></button>
      </div>
    );
  }
  return (
    <ProductSearchInput
      value={text}
      onChange={setText}
      onSelect={(p) => { setText(''); onChange({ id: p.id, name: p.name, sku: p.sku, base_price: p.base_price }); }}
      onClear={() => setText('')}
      placeholder={placeholder}
      show={{ stock: true, price: true }}
    />
  );
}
