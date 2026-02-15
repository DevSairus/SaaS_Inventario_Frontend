// frontend/src/components/purchases/InvoiceImportModal.jsx
import { useState } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Package } from 'lucide-react';
import api from '../../api/axios';

const InvoiceImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.toLowerCase().endsWith('.zip')) {
      setFile(droppedFile);
      setError(null);
      handlePreview(droppedFile);
    } else {
      setError('Solo se permiten archivos ZIP');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      handlePreview(selectedFile);
    }
  };

  const handlePreview = async (selectedFile) => {
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await api.post('/invoice-import/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setPreview(response.data.data);
      } else {
        setError(response.data.message || 'Error al procesar el archivo');
      }
    } catch (err) {
      console.error('Error en preview:', err);
      setError(err.response?.data?.message || 'Error al procesar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/invoice-import/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setResult(response.data.data);
        setTimeout(() => {
          onSuccess && onSuccess(response.data.data.purchase);
          handleClose();
        }, 3000);
      }
    } catch (err) {
      console.error('Error importando:', err);
      setError(err.response?.data?.message || 'Error al importar factura');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setResult(null);
    setIsDragging(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Importar Factura Electrónica
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Resultado de importación exitosa */}
          {result && (
            <div className="mb-6 p-6 bg-green-50 border-2 border-green-500 rounded-xl">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-12 h-12 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-green-900 mb-2">
                    ¡Factura Importada Exitosamente!
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-green-700">Proveedor:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {result.summary.supplier}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Factura:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {result.summary.invoice_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Items:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {result.summary.items_count}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Nuevos productos:</span>
                      <span className="ml-2 font-medium text-green-900">
                        {result.summary.new_products_created}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-green-700">Total:</span>
                      <span className="ml-2 font-bold text-lg text-green-900">
                        ${parseFloat(result.summary.total_amount).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-green-700">
                    Redirigiendo...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium">Error</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Zona de carga de archivo */}
          {!preview && !result && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-xl p-12 text-center transition-all
                ${isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
              `}
            >
              <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Arrastra el archivo ZIP aquí
              </p>
              <p className="text-sm text-gray-500 mb-4">
                o haz clic para seleccionar
              </p>
              <input
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors font-medium"
              >
                Seleccionar Archivo ZIP
              </label>
              <p className="mt-4 text-xs text-gray-500">
                El ZIP debe contener el XML de la factura electrónica
              </p>
            </div>
          )}

          {/* Vista previa de la factura */}
          {preview && !result && (
            <div className="space-y-6">
              {/* Advertencia de duplicado */}
              {preview.isDuplicate && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-800 font-bold mb-2">⚠️ Factura Duplicada</p>
                      <p className="text-red-700 text-sm mb-3">
                        Esta factura ya fue importada anteriormente y no se puede volver a importar.
                      </p>
                      <div className="bg-red-100 rounded p-3 text-sm space-y-1">
                        <div>
                          <span className="text-red-700 font-medium">Compra existente:</span>
                          <span className="ml-2 text-red-900">{preview.duplicateInfo?.purchase_number}</span>
                        </div>
                        <div>
                          <span className="text-red-700 font-medium">Proveedor:</span>
                          <span className="ml-2 text-red-900">{preview.duplicateInfo?.supplier_name}</span>
                        </div>
                        <div>
                          <span className="text-red-700 font-medium">Total:</span>
                          <span className="ml-2 text-red-900">
                            ${parseFloat(preview.duplicateInfo?.total_amount || 0).toLocaleString('es-CO')}
                          </span>
                        </div>
                        <div>
                          <span className="text-red-700 font-medium">Estado:</span>
                          <span className="ml-2 text-red-900 capitalize">{preview.duplicateInfo?.status}</span>
                        </div>
                        <div>
                          <span className="text-red-700 font-medium">Fecha importación:</span>
                          <span className="ml-2 text-red-900">
                            {preview.duplicateInfo?.created_at && new Date(preview.duplicateInfo.created_at).toLocaleDateString('es-CO')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Validación */}
              {!preview.isValid && !preview.isDuplicate && (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                  <p className="text-yellow-800 font-medium mb-2">Advertencias:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {preview.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Información del proveedor */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Proveedor
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Nombre:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {preview.supplier.name || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">NIT:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {preview.supplier.tax_id || 'N/A'}
                    </span>
                  </div>
                  {preview.supplier.email && (
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {preview.supplier.email}
                      </span>
                    </div>
                  )}
                  {preview.supplier.phone && (
                    <div>
                      <span className="text-gray-600">Teléfono:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {preview.supplier.phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de la factura */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Factura</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Número:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {preview.invoice.number}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fecha:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {preview.invoice.date}
                    </span>
                  </div>
                  {preview.hasPdf && (
                    <div className="text-green-600 font-medium">
                      ✓ PDF incluido
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Productos ({preview.items.length})
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">Producto</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700">SKU</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700">Cant.</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700">Precio</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {preview.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-900">{item.name}</td>
                            <td className="px-4 py-2 text-gray-600">{item.sku}</td>
                            <td className="px-4 py-2 text-right text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-2 text-right text-gray-900">
                              ${parseFloat(item.unit_price).toLocaleString('es-CO')}
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-gray-900">
                              ${parseFloat(item.total).toLocaleString('es-CO')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Totales */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="font-medium text-gray-900">
                      ${parseFloat(preview.totals.subtotal).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">IVA:</span>
                    <span className="font-medium text-gray-900">
                      ${parseFloat(preview.totals.tax).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-blue-600">
                      ${parseFloat(preview.totals.total).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || !preview.isValid}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Importando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Importar Factura
                    </>
                  )}
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