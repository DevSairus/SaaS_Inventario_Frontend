// frontend/src/components/purchases/InvoiceImportModal.jsx
import { useState } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Package, Trash2, Truck } from 'lucide-react';
import api from '../../api/axios';

const fmt = (val) => parseFloat(val || 0).toLocaleString('es-CO');

const InvoiceImportModal = ({ isOpen, onClose, onSuccess }) => {
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
    setLoading(true); setError(null); setPreview(null); setRemovedItems([]); setShippingCost('');
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      const res = await api.post('/invoice-import/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        setPreview(res.data.data);
        setSupplierName(res.data.data.supplier?.name || '');
      } else setError(res.data.message || 'Error al procesar el archivo');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al procesar el archivo');
    } finally { setLoading(false); }
  };

  const activeItems = preview?.items?.filter((_, i) => !removedItems.includes(i)) || [];

  const toggleRemoveItem = (idx) =>
    setRemovedItems(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);

  const calcTotals = () => {
    const subtotal  = activeItems.reduce((s, it) => s + parseFloat(it.subtotal || 0), 0);
    const tax       = activeItems.reduce((s, it) => s + parseFloat(it.tax_amount || 0), 0);
    const freight   = parseFloat(shippingCost) || 0;
    const discount  = parseFloat(discountAmount) || 0;
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
    setRemovedItems([]); setShippingCost(''); setDiscountAmount('');
    onClose();
  };

  if (!isOpen) return null;
  const totals = preview ? calcTotals() : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

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
            <div className="mb-6 p-6 bg-green-50 border-2 border-green-500 rounded-xl">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-12 h-12 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-green-900 mb-2">Factura Importada Exitosamente</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-green-700">Proveedor:</span><span className="ml-2 font-medium text-green-900">{result.summary.supplier}</span></div>
                    <div><span className="text-green-700">Factura:</span><span className="ml-2 font-medium text-green-900">{result.summary.invoice_number}</span></div>
                    <div><span className="text-green-700">Items:</span><span className="ml-2 font-medium text-green-900">{result.summary.items_count}</span></div>
                    <div><span className="text-green-700">Nuevos productos:</span><span className="ml-2 font-medium text-green-900">{result.summary.new_products_created}</span></div>
                    <div className="col-span-2"><span className="text-green-700">Total:</span><span className="ml-2 font-bold text-lg text-green-900">${fmt(result.summary.total_amount)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div><p className="text-red-800 font-medium">Error</p><p className="text-red-700 text-sm">{error}</p></div>
              </div>
            </div>
          )}

          {!preview && !result && (
            <div
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
            >
              {loading
                ? <div className="flex flex-col items-center gap-3"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div><p className="text-gray-600">Procesando archivo...</p></div>
                : <>
                    <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium text-gray-700 mb-2">Arrastra el archivo ZIP aquí</p>
                    <p className="text-sm text-gray-500 mb-4">o haz clic para seleccionar</p>
                    <input type="file" accept=".zip" onChange={handleFileSelect} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors font-medium">
                      Seleccionar Archivo ZIP
                    </label>
                    <p className="mt-4 text-xs text-gray-500">El ZIP debe contener el XML de la factura electrónica</p>
                  </>
              }
            </div>
          )}

          {preview && !result && (
            <div className="space-y-5">

              {preview.isDuplicate && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-800 font-bold mb-1">Factura Duplicada</p>
                      <p className="text-red-700 text-sm">Esta factura ya fue importada: <strong>{preview.duplicateInfo?.purchase_number}</strong></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Proveedor */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" /> Proveedor
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2">
                    <label className="block text-gray-600 mb-1 text-xs">Nombre (editable)</label>
                    <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre del proveedor" />
                  </div>
                  <div><span className="text-gray-500">NIT:</span><span className="ml-2 font-medium">{preview.supplier.tax_id || 'N/A'}</span></div>
                  {preview.supplier.email && <div><span className="text-gray-500">Email:</span><span className="ml-2 font-medium">{preview.supplier.email}</span></div>}
                </div>
              </div>

              {/* Factura */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Factura</h3>
                <div className="flex gap-6 text-sm">
                  <div><span className="text-gray-500">Número:</span><span className="ml-2 font-medium">{preview.invoice.number}</span></div>
                  <div><span className="text-gray-500">Fecha:</span><span className="ml-2 font-medium">{preview.invoice.date}</span></div>
                  {preview.hasPdf && <div className="text-green-600 font-medium">✓ PDF incluido</div>}
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    Ítems <span className="text-gray-400 font-normal text-sm">({activeItems.length} de {preview.items.length} seleccionados)</span>
                  </h3>
                  {removedItems.length > 0 && (
                    <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">
                      {removedItems.length} excluido(s)
                    </span>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Producto</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Cant.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Precio</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Total</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.items.map((item, idx) => {
                        const removed = removedItems.includes(idx);
                        return (
                          <tr key={idx} className={removed ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className={`px-3 py-2.5 ${removed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {item.name}
                              {item.sku && <span className="ml-2 text-xs text-gray-400">{item.sku}</span>}
                            </td>
                            <td className={`px-3 py-2.5 text-right ${removed ? 'text-gray-400' : ''}`}>{item.quantity}</td>
                            <td className={`px-3 py-2.5 text-right ${removed ? 'text-gray-400' : ''}`}>${fmt(item.unit_price)}</td>
                            <td className={`px-3 py-2.5 text-right font-medium ${removed ? 'text-gray-400' : ''}`}>${fmt(item.total)}</td>
                            <td className="px-3 py-2.5 text-center">
                              <button onClick={() => toggleRemoveItem(idx)}
                                title={removed ? 'Restaurar ítem' : 'Excluir ítem'}
                                className={`p-1 rounded transition-colors text-base ${removed ? 'text-green-600 hover:bg-green-100' : 'text-red-400 hover:text-red-600 hover:bg-red-100'}`}>
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
                  <p className="mt-1 text-xs text-gray-400 italic">
                    Los ítems excluidos no se crean como productos ni afectan el total.
                  </p>
                )}
              </div>

              {/* Flete */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-800 text-sm">Costo de flete <span className="text-gray-400 font-normal">(opcional)</span></p>
                      <p className="text-xs text-gray-400">Se suma al total de la compra como costo de envío</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-gray-400 text-sm">$</span>
                    <input type="number" min="0" value={shippingCost} onChange={e => setShippingCost(e.target.value)}
                      placeholder="0"
                      className="w-32 px-3 py-2 text-right border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                </div>
              </div>

              {/* Descuento global */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-gray-400 font-bold">%</span>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">Descuento global <span className="text-gray-400 font-normal">(opcional)</span></p>
                      <p className="text-xs text-gray-400">Monto fijo que se resta al total de la compra</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-gray-400 text-sm">$</span>
                    <input type="number" min="0" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)}
                      placeholder="0"
                      className="w-32 px-3 py-2 text-right border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                </div>
              </div>

              {/* Totales */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal ({activeItems.length} ítems):</span>
                    <span className="font-medium">${fmt(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IVA:</span>
                    <span className="font-medium">${fmt(totals.tax)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Descuento:</span>
                      <span className="font-medium">- ${fmt(totals.discount)}</span>
                    </div>
                  )}
                  {totals.freight > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Flete:</span>
                      <span className="font-medium">${fmt(totals.freight)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t border-blue-200 pt-2">
                    <span>Total:</span>
                    <span className="text-blue-700">${fmt(totals.total)}</span>
                  </div>
                </div>
              </div>

              {/* Utilidad */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">% Utilidad para productos nuevos</p>
                    <p className="text-xs text-amber-600 mt-0.5">Solo aplica a productos que no existen en el catálogo</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input type="number" min="0" max="500" value={profitMargin}
                      onChange={e => setProfitMargin(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-20 px-3 py-2 text-center font-bold text-lg border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 bg-white" />
                    <span className="text-amber-700 font-bold text-lg">%</span>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setFile(null); setPreview(null); setRemovedItems([]); setShippingCost(''); setDiscountAmount(''); }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || !preview.isValid || activeItems.length === 0}
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