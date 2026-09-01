// frontend/src/components/purchases/InvoiceImportModal.jsx
import { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Package, Trash2, Truck, Search, Link2, Sparkles } from 'lucide-react';
import api from '../../api/axios';
import { productsAPI } from '../../api/products';
import NumericInput from '../inputs/NumericInput';
import useCategoriesStore from '../../store/categoriesStore';

const fmt = (val) => parseFloat(val || 0).toLocaleString('es-CO');

const UNIT_OPTIONS = [
  { value: 'unit', label: 'Unidad' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'g', label: 'Gramo' },
  { value: 'l', label: 'Litro' },
  { value: 'ml', label: 'Mililitro' },
  { value: 'm', label: 'Metro' },
  { value: 'cm', label: 'Centímetro' },
  { value: 'pack', label: 'Paquete' },
  { value: 'box', label: 'Caja' },
];

// Panel compacto que aparece bajo un ítem marcado "Crear producto nuevo" para
// que el usuario defina de una vez código, referencia, categoría, marca y
// unidad -- así no tiene que ir luego a editar el producto recién creado.
const NewProductFieldsPanel = ({ data, onChange, categories }) => {
  const set = (field) => (e) => onChange({ ...data, [field]: e.target.value });
  const inputClass = 'w-full px-2 py-1.5 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 rounded text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-400 focus:border-transparent';
  const labelClass = 'block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5';

  return (
    <div className="mt-2 p-3 bg-amber-50/60 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg grid grid-cols-2 gap-2">
      <div>
        <label className={labelClass}>Código (SKU)</label>
        <input type="text" value={data.sku} onChange={set('sku')} placeholder="Autogenerado si se deja vacío" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Referencia / cód. barras</label>
        <input type="text" value={data.barcode} onChange={set('barcode')} placeholder="Opcional" className={inputClass} />
      </div>
      <div className="col-span-2">
        <label className={labelClass}>Nombre</label>
        <input type="text" value={data.name} onChange={set('name')} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Categoría</label>
        <select value={data.category_id} onChange={set('category_id')} className={inputClass}>
          <option value="">Sin categoría</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>Marca</label>
        <input type="text" value={data.brand} onChange={set('brand')} placeholder="Opcional" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Unidad de medida</label>
        <select value={data.unit_of_measure} onChange={set('unit_of_measure')} className={inputClass}>
          {UNIT_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
      </div>
      <div className="flex items-end">
        <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={data.price_includes_tax} onChange={(e) => onChange({ ...data, price_includes_tax: e.target.checked })} />
          El precio ya incluye IVA
        </label>
      </div>
    </div>
  );
};

// Selector compacto para vincular un ítem de factura a un producto del
// catálogo (búsqueda con debounce) o marcarlo para crear como producto nuevo.
// value: product_id vinculado | 'CREATE_NEW' | undefined (sin decisión aún)
const ProductLinkPicker = ({ value, productName, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(productName || '');
  const debounceRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const search = (q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await productsAPI.getAll({ search: q, limit: 8 });
        setResults(res.data || []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  };

  const pick = (product) => {
    setSelectedLabel(product.name);
    onChange(product.id);
    setOpen(false);
    setQuery('');
  };

  const pickCreateNew = () => {
    setSelectedLabel(null);
    onChange('CREATE_NEW');
    setOpen(false);
    setQuery('');
  };

  const isCreateNew = value === 'CREATE_NEW';

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border w-full text-left ${
          isCreateNew
            ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            : value
              ? 'border-green-300 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'border-gray-300 dark:border-white/10 bg-white dark:bg-graphite-2 text-gray-500 dark:text-gray-500'
        }`}
      >
        <Link2 className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">
          {isCreateNew ? 'Crear producto nuevo' : value ? (selectedLabel || 'Producto vinculado') : 'Sin vincular — elegir'}
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-64 bg-white dark:bg-graphite border border-gray-200 dark:border-white/10 rounded-lg shadow-lg p-2">
          <div className="flex items-center gap-1.5 border border-gray-200 dark:border-white/10 rounded px-2 py-1.5 mb-1.5">
            <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Buscar producto del catálogo..."
              className="w-full text-xs outline-none dark:bg-graphite dark:text-gray-100 dark:placeholder-gray-600"
            />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {searching && <p className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1">Buscando...</p>}
            {!searching && query && results.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1">Sin resultados</p>
            )}
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p)}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded flex flex-col"
              >
                <span className="font-medium text-gray-800 dark:text-gray-200">{p.name}</span>
                <span className="text-gray-400 dark:text-gray-500">{p.sku}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={pickCreateNew}
            className="w-full mt-1 text-left px-2 py-1.5 text-xs rounded flex items-center gap-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 border-t border-gray-100 dark:border-white/10 pt-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> Crear como producto nuevo
          </button>
        </div>
      )}
    </div>
  );
};

const InvoiceImportModal = ({ isOpen, onClose, onSuccess }) => {
  const { categories, fetchCategories } = useCategoriesStore();
  const [file, setFile]                 = useState(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [loading, setLoading]           = useState(false);
  const [preview, setPreview]           = useState(null);
  const [error, setError]               = useState(null);
  const [result, setResult]             = useState(null);
  const [profitMargin, setProfitMargin] = useState(30);
  const [supplierName, setSupplierName] = useState('');
  const [removedItems, setRemovedItems] = useState([]);
  const [shippingCost, setShippingCost]   = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [fileInputKey, setFileInputKey]   = useState(0);
  // IVA editable por ítem: { índice: porcentaje }
  const [itemTaxOverrides, setItemTaxOverrides] = useState({});
  // Vínculo producto por ítem: { índice: product_id | 'CREATE_NEW' }.
  // Se pre-carga con la sugerencia del backend (sku_internal / name_fuzzy),
  // editable por el usuario — es lo único que confirma y guarda un mapeo
  // código-proveedor → producto para la próxima importación de este proveedor.
  const [manualLinks, setManualLinks] = useState({});
  // Datos editables del producto a crear, por ítem marcado CREATE_NEW:
  // { índice: { sku, barcode, name, category_id, brand, unit_of_measure, price_includes_tax } }
  const [newProductData, setNewProductData] = useState({});

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.toLowerCase().endsWith('.zip')) { setFile(f); setError(null); handlePreview(f); }
    else setError('Solo se permiten archivos ZIP');
  };

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setError(null); handlePreview(f); }
  };

  const handlePreview = async (selectedFile) => {
    setLoading(true); setError(null); setPreview(null); setRemovedItems([]); setShippingCost(''); setItemTaxOverrides({}); setManualLinks({}); setNewProductData({});
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      const res = await api.post('/invoice-import/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        setPreview(res.data.data);
        setSupplierName(res.data.data.supplier?.name || '');
        // Pre-cargar el selector de cada ítem con su sugerencia editable.
        // 'code_exact' no entra acá: se aplica solo, sin pasar por el usuario.
        const initialLinks = {};
        (res.data.data.items || []).forEach((item, idx) => {
          const matchType = item.suggestion?.match_type;
          if (matchType === 'sku_internal' || matchType === 'name_fuzzy') {
            initialLinks[idx] = item.suggestion.product_id;
          }
        });
        setManualLinks(initialLinks);
      } else setError(res.data.message || 'Error al procesar el archivo');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al procesar el archivo');
    } finally { setLoading(false); }
  };

  const activeItems = preview?.items?.filter((_, i) => !removedItems.includes(i)) || [];

  // Ítems activos que todavía no tienen una decisión de vínculo: ni coincidencia
  // exacta por código (se aplica sola) ni una elección del usuario en manualLinks.
  const pendingLinkCount = (preview?.items || []).reduce((count, item, idx) => {
    if (removedItems.includes(idx)) return count;
    if (item.suggestion?.match_type === 'code_exact') return count;
    if (manualLinks[idx] !== undefined) return count;
    return count + 1;
  }, 0);

  const getNewProductData = (idx, item) => newProductData[idx] || {
    sku: item.sku && !item.sku.startsWith('TEMP-') ? item.sku : '',
    barcode: '',
    name: item.name || '',
    category_id: '',
    brand: '',
    unit_of_measure: 'unit',
    price_includes_tax: false,
  };

  const toggleRemoveItem = (idx) =>
    setRemovedItems(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);

  const getItemTaxPct = (idx) =>
    itemTaxOverrides[idx] !== undefined
      ? parseFloat(itemTaxOverrides[idx])
      : parseFloat(preview?.items?.[idx]?.tax_percentage ?? 19);

  const calcTotals = () => {
    const subtotal = activeItems.reduce((s, it) => s + parseFloat(it.subtotal || 0), 0);
    // Recalcular IVA con los porcentajes editados
    const tax = (preview?.items || []).reduce((s, it, idx) => {
      if (removedItems.includes(idx)) return s;
      const pct = getItemTaxPct(idx);
      return s + parseFloat(it.subtotal || 0) * (pct / 100);
    }, 0);
    const freight  = parseFloat(shippingCost) || 0;
    const discount = parseFloat(discountAmount) || 0;
    return { subtotal, tax, freight, discount, total: subtotal + tax + freight - discount };
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('profit_margin', profitMargin);
      fd.append('supplier_name', supplierName);
      fd.append('removed_items', JSON.stringify(removedItems));
      fd.append('shipping_cost', shippingCost || 0);
      fd.append('discount_amount', discountAmount || 0);
      fd.append('items_tax_overrides', JSON.stringify(itemTaxOverrides));
      fd.append('manual_links', JSON.stringify(manualLinks));
      fd.append('new_product_data', JSON.stringify(newProductData));
      const res = await api.post('/invoice-import/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        setResult(res.data.data);
        setTimeout(() => { onSuccess?.(res.data.data.purchase); handleClose(); }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al importar factura');
    } finally { setLoading(false); }
  };

  const handleClose = () => {
    setFile(null); setPreview(null); setError(null); setResult(null);
    setIsDragging(false); setProfitMargin(30); setSupplierName('');
    setRemovedItems([]); setShippingCost(''); setDiscountAmount(''); setItemTaxOverrides({}); setManualLinks({}); setNewProductData({});
    setFileInputKey(k => k + 1);
    onClose();
  };

  if (!isOpen) return null;
  const totals = preview ? calcTotals() : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-graphite rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" /> Importar Factura Electrónica
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">

          {result && (
            <div className="mb-6 p-6 bg-green-50 dark:bg-green-900/30 border-2 border-green-500 dark:border-green-800/40 rounded-xl">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-12 h-12 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-green-900 dark:text-green-300 mb-2">Factura Importada Exitosamente</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-green-700 dark:text-green-400">Proveedor:</span><span className="ml-2 font-medium text-green-900 dark:text-green-300">{result.summary.supplier}</span></div>
                    <div><span className="text-green-700 dark:text-green-400">Factura:</span><span className="ml-2 font-medium text-green-900 dark:text-green-300">{result.summary.invoice_number}</span></div>
                    <div><span className="text-green-700 dark:text-green-400">Items:</span><span className="ml-2 font-medium text-green-900 dark:text-green-300">{result.summary.items_count}</span></div>
                    <div><span className="text-green-700 dark:text-green-400">Nuevos productos:</span><span className="ml-2 font-medium text-green-900 dark:text-green-300">{result.summary.new_products_created}</span></div>
                    <div className="col-span-2"><span className="text-green-700 dark:text-green-400">Total:</span><span className="ml-2 font-bold text-lg text-green-900 dark:text-green-300">${fmt(result.summary.total_amount)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-800/40 rounded">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div><p className="text-red-800 dark:text-red-300 font-medium">Error</p><p className="text-red-700 dark:text-red-400 text-sm">{error}</p></div>
              </div>
            </div>
          )}

          {!preview && !result && (
            <div
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-white/10 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
            >
              {loading
                ? <div className="flex flex-col items-center gap-3"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div><p className="text-gray-600 dark:text-gray-400">Procesando archivo...</p></div>
                : <>
                    <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Arrastra el archivo ZIP aquí</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">o haz clic para seleccionar</p>
                    <input type="file" accept=".zip" onChange={handleFileSelect} className="hidden" id="file-upload" key={fileInputKey} />
                    <label htmlFor="file-upload" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors font-medium">
                      Seleccionar Archivo ZIP
                    </label>
                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">El ZIP debe contener el XML de la factura electrónica</p>
                  </>
              }
            </div>
          )}

          {preview && !result && (
            <div className="space-y-5">

              {preview.isDuplicate && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-800/40 rounded">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-800 dark:text-red-300 font-bold mb-1">Factura Duplicada</p>
                      <p className="text-red-700 dark:text-red-400 text-sm">Esta factura ya fue importada: <strong>{preview.duplicateInfo?.purchase_number}</strong></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Proveedor */}
              <div className="bg-gray-50 dark:bg-graphite-2 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" /> Proveedor
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2">
                    <label className="block text-gray-600 dark:text-gray-400 mb-1 text-xs">Nombre (editable)</label>
                    <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre del proveedor" />
                  </div>
                  <div><span className="text-gray-500 dark:text-gray-500">NIT:</span><span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{preview.supplier.tax_id || 'N/A'}</span></div>
                  {preview.supplier.email && <div><span className="text-gray-500 dark:text-gray-500">Email:</span><span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{preview.supplier.email}</span></div>}
                </div>
              </div>

              {/* Factura */}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Factura</h3>
                <div className="flex gap-6 text-sm">
                  <div><span className="text-gray-500 dark:text-gray-500">Número:</span><span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{preview.invoice.number}</span></div>
                  <div><span className="text-gray-500 dark:text-gray-500">Fecha:</span><span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{preview.invoice.date}</span></div>
                  {preview.hasPdf && <div className="text-green-600 dark:text-green-400 font-medium">✓ PDF incluido</div>}
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Ítems <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">({activeItems.length} de {preview.items.length} seleccionados)</span>
                  </h3>
                  {removedItems.length > 0 && (
                    <span className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40 px-2 py-1 rounded">
                      {removedItems.length} excluido(s)
                    </span>
                  )}
                </div>
                <div className="border dark:border-white/10 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-graphite-2">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Producto</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Cant.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Precio</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">
                          IVA %
                          <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-normal leading-none">editable</span>
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Subtotal</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                      {preview.items.map((item, idx) => {
                        const removed = removedItems.includes(idx);
                        const taxPct  = getItemTaxPct(idx);
                        const taxAmt  = parseFloat(item.subtotal || 0) * (taxPct / 100);
                        const isOverridden = itemTaxOverrides[idx] !== undefined;
                        return (
                          <tr key={idx} className={removed ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}>
                            <td className={`px-3 py-2.5 ${removed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                              {item.name}
                              {item.sku && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{item.sku}</span>}
                              {!removed && (
                                <div className="mt-1.5">
                                  {item.suggestion?.match_type === 'code_exact' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/40">
                                      <CheckCircle className="w-3 h-3" /> Vinculado: {item.suggestion.product_name}
                                    </span>
                                  ) : (
                                    <div className="max-w-[280px]">
                                      {item.suggestion?.match_type === 'name_fuzzy' && manualLinks[idx] === item.suggestion.product_id && (
                                        <p className="text-[10px] text-blue-500 dark:text-blue-400 mb-0.5">Sugerido por nombre — confirmar</p>
                                      )}
                                      {item.suggestion?.match_type === 'sku_internal' && manualLinks[idx] === item.suggestion.product_id && (
                                        <p className="text-[10px] text-blue-500 dark:text-blue-400 mb-0.5">Coincide con tu SKU interno — confirmar</p>
                                      )}
                                      <ProductLinkPicker
                                        value={manualLinks[idx]}
                                        productName={item.suggestion?.product_name}
                                        onChange={(val) => {
                                          setManualLinks(prev => ({ ...prev, [idx]: val }));
                                          if (val === 'CREATE_NEW') {
                                            setNewProductData(prev => ({ ...prev, [idx]: prev[idx] || getNewProductData(idx, item) }));
                                          }
                                        }}
                                      />
                                      {manualLinks[idx] === 'CREATE_NEW' && (
                                        <NewProductFieldsPanel
                                          data={getNewProductData(idx, item)}
                                          categories={categories}
                                          onChange={(data) => setNewProductData(prev => ({ ...prev, [idx]: data }))}
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className={`px-3 py-2.5 text-right ${removed ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-100'}`}>{item.quantity}</td>
                            <td className={`px-3 py-2.5 text-right ${removed ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-100'}`}>${fmt(item.unit_price)}</td>
                            <td className="px-3 py-2.5 text-center">
                              {removed ? (
                                <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={taxPct}
                                    onChange={e => setItemTaxOverrides(prev => ({
                                      ...prev,
                                      [idx]: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                    }))}
                                    className={`w-16 px-1.5 py-1 text-center border rounded text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                                      isOverridden
                                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                        : 'border-gray-200 dark:border-white/10 dark:bg-graphite-2 text-gray-700 dark:text-gray-300'
                                    }`}
                                  />
                                  <span className="text-gray-400 dark:text-gray-500 text-xs">%</span>
                                  {isOverridden && (
                                    <button
                                      type="button"
                                      onClick={() => setItemTaxOverrides(prev => {
                                        const next = { ...prev };
                                        delete next[idx];
                                        return next;
                                      })}
                                      title="Restaurar IVA original"
                                      className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-xs leading-none"
                                    >↩</button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-medium ${removed ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-100'}`}>
                              {removed ? `$${fmt(item.total)}` : (
                                <div>
                                  <div>${fmt(item.subtotal)}</div>
                                  {taxPct > 0 && (
                                    <div className="text-xs text-gray-400 dark:text-gray-500">+${fmt(taxAmt)} IVA</div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button onClick={() => toggleRemoveItem(idx)}
                                title={removed ? 'Restaurar ítem' : 'Excluir ítem'}
                                className={`p-1 rounded transition-colors text-base ${removed ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30' : 'text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30'}`}>
                                {removed ? '↩' : <Trash2 className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {removedItems.length > 0 && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 italic">
                    Los ítems excluidos no se crean como productos ni afectan el total.
                  </p>
                )}
              </div>

              {/* Flete */}
              <div className="bg-gray-50 dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">Costo de flete <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span></p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Se suma al total de la compra como costo de envío</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-gray-400 dark:text-gray-500 text-sm">$</span>
                    <NumericInput value={shippingCost} onChange={e => setShippingCost(e.target.value)}
                      placeholder="0"
                      className="w-32 px-3 py-2 text-right border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100" />
                  </div>
                </div>
              </div>

              {/* Descuento global */}
              <div className="bg-gray-50 dark:bg-graphite-2 border border-gray-200 dark:border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-gray-400 dark:text-gray-500 font-bold">%</span>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">Descuento global <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span></p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Monto fijo que se resta al total de la compra</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-gray-400 dark:text-gray-500 text-sm">$</span>
                    <NumericInput value={discountAmount} onChange={e => setDiscountAmount(e.target.value)}
                      placeholder="0"
                      className="w-32 px-3 py-2 text-right border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:text-gray-100" />
                  </div>
                </div>
              </div>

              {/* Totales */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800/40">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal ({activeItems.length} ítems):</span>
                    <span className="font-medium dark:text-gray-100">${fmt(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">IVA:</span>
                    <span className="font-medium dark:text-gray-100">${fmt(totals.tax)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-red-600 dark:text-red-400">
                      <span>Descuento:</span>
                      <span className="font-medium">- ${fmt(totals.discount)}</span>
                    </div>
                  )}
                  {totals.freight > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Flete:</span>
                      <span className="font-medium dark:text-gray-100">${fmt(totals.freight)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t border-blue-200 dark:border-blue-800/40 pt-2">
                    <span className="dark:text-gray-100">Total:</span>
                    <span className="text-blue-700 dark:text-blue-300">${fmt(totals.total)}</span>
                  </div>
                </div>
              </div>

              {/* Utilidad */}
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/40 rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-300 text-sm">% Utilidad para productos nuevos</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Solo aplica a productos que no existen en el catálogo</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input type="number" min="0" max="500" value={profitMargin}
                      onChange={e => setProfitMargin(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-20 px-3 py-2 text-center font-bold text-lg border-2 border-amber-300 dark:border-amber-800/40 rounded-lg focus:ring-2 focus:ring-amber-400 bg-white dark:bg-graphite-2 dark:text-gray-100" />
                    <span className="text-amber-700 dark:text-amber-300 font-bold text-lg">%</span>
                  </div>
                </div>
              </div>

              {pendingLinkCount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
                  {pendingLinkCount} {pendingLinkCount === 1 ? 'ítem necesita' : 'ítems necesitan'} que confirmes con qué producto vincularlo (o crearlo nuevo) antes de importar.
                </p>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setFile(null); setPreview(null); setRemovedItems([]); setShippingCost(''); setDiscountAmount(''); setItemTaxOverrides({}); setManualLinks({}); setNewProductData({}); setFileInputKey(k => k + 1); }}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-medium">
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || !preview.isValid || activeItems.length === 0 || pendingLinkCount > 0}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading
                    ? <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div><span>Importando...</span></>
                    : <><CheckCircle className="w-5 h-5" /><span>Importar Factura</span></>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceImportModal;