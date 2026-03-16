// ProductImageViewer.jsx — Modal visor de imagen de producto
import { useEffect } from 'react';

export default function ProductImageViewer({ product, onClose }) {
  const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') ?? '';
  const src = product?.image_url
    ? (product.image_url.startsWith('http') ? product.image_url : `${apiBase}${product.image_url}`)
    : null;

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{product.name}</p>
            {product.sku && (
              <p className="text-xs text-gray-400 mt-0.5">SKU: {product.sku}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Imagen */}
        <div className="bg-gray-50 flex items-center justify-center p-4" style={{ minHeight: 280 }}>
          <img
            src={src}
            alt={product.name}
            className="max-h-80 max-w-full object-contain rounded-lg"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        {/* Info de precio y stock */}
        <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-t border-gray-100">
          {product.base_price != null && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Precio</p>
              <p className="text-sm font-bold text-blue-600">
                ${Number(product.base_price).toLocaleString('es-CO')}
              </p>
            </div>
          )}
          {product.product_type !== 'service' && product.current_stock != null && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Stock</p>
              <p className={`text-sm font-bold ${product.current_stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {product.current_stock}
              </p>
            </div>
          )}
          {product.category?.name && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Categoría</p>
              <p className="text-sm font-medium text-gray-700">{product.category.name}</p>
            </div>
          )}
          {product.brand && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Marca</p>
              <p className="text-sm font-medium text-gray-700">{product.brand}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}