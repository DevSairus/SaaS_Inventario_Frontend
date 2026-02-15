import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useProductsStore from '../../store/productsStore';
import useCategoriesStore from '../../store/categoriesStore';
import BarcodeScanner from '../common/BarcodeScanner'; // ✅ Ya usa el componente mejorado

const ProductFormModal = ({ isOpen, onClose, product = null }) => {
  const { createProduct, updateProduct, loading } = useProductsStore();
  const { categories, fetchCategories } = useCategoriesStore();

  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    category_id: '',
    unit_of_measure: 'unit',
    average_cost: '',
    min_stock: '',
    max_stock: '',
    profit_margin_percentage: '',
    base_price: '',
    current_stock: '',
    track_inventory: true,
    allow_negative_stock: false,
    is_active: true,
    // Campos de IVA
    has_tax: true,
    tax_percentage: 19,
    price_includes_tax: false
  });

  const [calculatedPrice, setCalculatedPrice] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (product) {
      // ✅ Determinar correctamente el estado del IVA
      const productTaxPercentage = product.tax_percentage !== null && product.tax_percentage !== undefined 
        ? parseFloat(product.tax_percentage) 
        : 19;
      
      const productHasTax = product.has_tax !== false && productTaxPercentage > 0;
      
      setFormData({
        sku: product.sku || '',
        barcode: product.barcode || '',
        name: product.name || '',
        description: product.description || '',
        category_id: product.category_id || '',
        unit_of_measure: product.unit_of_measure || 'unit',
        average_cost: product.average_cost || '',
        min_stock: product.min_stock || '',
        max_stock: product.max_stock || '',
        profit_margin_percentage: product.profit_margin_percentage || '',
        base_price: product.base_price || '',
        current_stock: product.current_stock || '',
        track_inventory: product.track_inventory !== false,
        allow_negative_stock: product.allow_negative_stock || false,
        is_active: product.is_active !== false,
        // Campos de IVA - ✅ Corregido
        has_tax: productHasTax,
        tax_percentage: productTaxPercentage,
        price_includes_tax: product.price_includes_tax || false
      });
    } else {
      setFormData({
        sku: '',
        barcode: '',
        name: '',
        description: '',
        category_id: '',
        unit_of_measure: 'unit',
        average_cost: '',
        min_stock: '',
        max_stock: '',
        profit_margin_percentage: '',
        base_price: '',
        current_stock: '',
        track_inventory: true,
        allow_negative_stock: false,
        is_active: true,
        // Campos de IVA
        has_tax: true,
        tax_percentage: 19,
        price_includes_tax: false
      });
      setCalculatedPrice(null);
    }
  }, [product, isOpen]);

  // Calcular precio sugerido cuando cambie el margen o el costo
  useEffect(() => {
    if (formData.average_cost && formData.profit_margin_percentage) {
      const cost = parseFloat(formData.average_cost);
      const margin = parseFloat(formData.profit_margin_percentage);
      
      if (!isNaN(cost) && !isNaN(margin) && cost > 0 && margin >= 0) {
        const suggestedPrice = cost * (1 + margin / 100);
        setCalculatedPrice(suggestedPrice.toFixed(2));
      } else {
        setCalculatedPrice(null);
      }
    } else {
      setCalculatedPrice(null);
    }
  }, [formData.average_cost, formData.profit_margin_percentage]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // ✅ Lógica especial para el manejo de IVA
    if (name === 'has_tax') {
      setFormData(prev => ({
        ...prev,
        has_tax: checked,
        // Si se desmarca "tiene IVA", poner tax_percentage en 0
        tax_percentage: checked ? (prev.tax_percentage || 19) : 0
      }));
    } else if (name === 'tax_percentage') {
      const taxValue = parseFloat(value);
      setFormData(prev => ({
        ...prev,
        tax_percentage: taxValue,
        // Si se selecciona 0%, también actualizar has_tax a false
        has_tax: taxValue > 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleUseCalculatedPrice = () => {
    if (calculatedPrice) {
      setFormData(prev => ({
        ...prev,
        base_price: calculatedPrice
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Preparar datos con lógica de IVA correcta
    const dataToSend = {
      ...formData,
      average_cost: formData.average_cost ? parseFloat(formData.average_cost) : 0,
      min_stock: formData.min_stock ? parseFloat(formData.min_stock) : 0,
      max_stock: formData.max_stock ? parseFloat(formData.max_stock) : null,
      profit_margin_percentage: formData.profit_margin_percentage ? parseFloat(formData.profit_margin_percentage) : null,
      base_price: formData.base_price ? parseFloat(formData.base_price) : null,
      current_stock: formData.current_stock ? parseFloat(formData.current_stock) : 0,
      // ✅ Asegurar que has_tax sea false cuando tax_percentage es 0
      has_tax: formData.has_tax && parseFloat(formData.tax_percentage) > 0,
      tax_percentage: parseFloat(formData.tax_percentage) || 0
    };

    if (product) {
      await updateProduct(product.id, dataToSend);
    } else {
      await createProduct(dataToSend);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
            <h2 className="text-2xl font-bold">
              {product ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información Básica */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                Información Básica
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: PROD-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Barras
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 7501234567890"
                />
                {/* ✅ Botón de escaneo con mejor diseño */}
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  title="Escanear código de barras con cámara o pistola USB"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Escanea con cámara o pistola USB
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Laptop Dell Inspiron 15"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Descripción detallada del producto..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidad de Medida
              </label>
              <select
                name="unit_of_measure"
                value={formData.unit_of_measure}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="unit">Unidad</option>
                <option value="kg">Kilogramo</option>
                <option value="g">Gramo</option>
                <option value="l">Litro</option>
                <option value="ml">Mililitro</option>
                <option value="m">Metro</option>
                <option value="cm">Centímetro</option>
                <option value="pack">Paquete</option>
                <option value="box">Caja</option>
              </select>
            </div>

            {/* Costos y Precios */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                Costos y Precios
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Costo Promedio
                <span className="ml-2 text-xs text-blue-600 font-normal">
                  Ingresa el costo SIN IVA
                </span>
              </label>
              <input
                type="number"
                name="average_cost"
                value={formData.average_cost}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                Ejemplo: Si compras a $11,900 (con IVA 19%), ingresa $10,000
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                Se actualiza automáticamente con las compras
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Margen de Ganancia (%)
              </label>
              <input
                type="number"
                name="profit_margin_percentage"
                value={formData.profit_margin_percentage}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
              {calculatedPrice && (
                <p className="mt-1 text-xs text-green-600 font-medium">
                  Precio sugerido: ${calculatedPrice}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio de Venta
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="base_price"
                  value={formData.base_price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
                {calculatedPrice && (
                  <button
                    type="button"
                    onClick={handleUseCalculatedPrice}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium whitespace-nowrap"
                  >
                    Usar Sugerido
                  </button>
                )}
              </div>
              {calculatedPrice && formData.base_price && parseFloat(formData.base_price) !== parseFloat(calculatedPrice) && (
                <p className="mt-1 text-xs text-amber-600">
                  Diferencia con precio sugerido: ${(parseFloat(formData.base_price) - parseFloat(calculatedPrice)).toFixed(2)}
                </p>
              )}
            </div>

            {/* Configuración de IVA */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                Configuración de IVA / Impuestos
              </h3>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de IVA
              </label>
              <select
                name="tax_percentage"
                value={formData.tax_percentage}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="0">Exento (0%)</option>
                <option value="5">Reducido (5%)</option>
                <option value="10">Intermedio (10%)</option>
                <option value="19">General (19%)</option>
                <option value="21">Otro (21%)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.tax_percentage === 0 || formData.tax_percentage === '0' 
                  ? '⚠️ Producto exento de IVA' 
                  : `✓ IVA del ${formData.tax_percentage}% aplicable según normativa`}
              </p>
            </div>

            {formData.has_tax && parseFloat(formData.tax_percentage) > 0 && (
              <>
                <div>
                  <label className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200">
                    <input
                      type="checkbox"
                      name="price_includes_tax"
                      checked={formData.price_includes_tax}
                      onChange={handleChange}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        El precio YA incluye IVA
                      </span>
                      <p className="text-xs text-gray-600">
                        {formData.price_includes_tax 
                          ? '✓ El precio mostrado incluye IVA' 
                          : '✗ El IVA se suma al precio mostrado'}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Calculadora de IVA */}
                {formData.base_price && (
                  <div className="md:col-span-2 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      Desglose de Precio
                      <span className="text-xs font-normal text-gray-600">
                        (Lo que verá el cliente)
                      </span>
                    </div>
                    {formData.price_includes_tax ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div className="text-gray-600">Precio final al cliente:</div>
                          <div className="font-bold text-blue-600">
                            ${parseFloat(formData.base_price).toFixed(2)}
                          </div>
                          <div className="text-gray-600">Base imponible (sin IVA):</div>
                          <div className="font-medium text-gray-900">
                            ${(parseFloat(formData.base_price) / (1 + parseFloat(formData.tax_percentage) / 100)).toFixed(2)}
                          </div>
                          <div className="text-gray-600">IVA ({formData.tax_percentage}%):</div>
                          <div className="font-medium text-green-600">
                            ${(parseFloat(formData.base_price) - (parseFloat(formData.base_price) / (1 + parseFloat(formData.tax_percentage) / 100))).toFixed(2)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
                          El cliente pagará exactamente ${parseFloat(formData.base_price).toFixed(2)} (ya con IVA incluido)
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div className="text-gray-600">Precio base (sin IVA):</div>
                          <div className="font-medium text-gray-900">
                            ${parseFloat(formData.base_price).toFixed(2)}
                          </div>
                          <div className="text-gray-600">+ IVA ({formData.tax_percentage}%):</div>
                          <div className="font-medium text-green-600">
                            ${(parseFloat(formData.base_price) * parseFloat(formData.tax_percentage) / 100).toFixed(2)}
                          </div>
                          <div className="text-gray-600">= Total al cliente:</div>
                          <div className="font-bold text-blue-600">
                            ${(parseFloat(formData.base_price) * (1 + parseFloat(formData.tax_percentage) / 100)).toFixed(2)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
                          El cliente pagará ${(parseFloat(formData.base_price) * (1 + parseFloat(formData.tax_percentage) / 100)).toFixed(2)} (precio + IVA)
                        </div>
                      </>
                    )}
                    {formData.average_cost && formData.base_price && (
                      <div className="mt-3 pt-3 border-t border-blue-300">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-gray-600">Tu costo (sin IVA):</div>
                          <div className="font-medium text-gray-700">
                            ${parseFloat(formData.average_cost).toFixed(2)}
                          </div>
                          <div className="text-gray-600">Tu ganancia:</div>
                          <div className="font-bold text-green-700">
                            ${(parseFloat(formData.base_price) - parseFloat(formData.average_cost)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Inventario */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                Control de Inventario
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Actual
              </label>
              <input
                type="number"
                name="current_stock"
                value={formData.current_stock}
                onChange={handleChange}
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                disabled={!!product}
              />
              {product && (
                <p className="mt-1 text-xs text-gray-500">
                  Usa Ajustes o Compras para modificar el stock
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Mínimo <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="min_stock"
                value={formData.min_stock}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                Genera alertas cuando se alcance este nivel
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Máximo
              </label>
              <input
                type="number"
                name="max_stock"
                value={formData.max_stock}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                Opcional: para control de sobre-stock
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Punto de Reorden
              </label>
              <input
                type="number"
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            {/* Configuración */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                Configuración
              </h3>
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="track_inventory"
                  checked={formData.track_inventory}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Controlar inventario
                  </span>
                  <p className="text-xs text-gray-500">
                    Registrar movimientos de entrada y salida
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="allow_negative_stock"
                  checked={formData.allow_negative_stock}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Permitir stock negativo
                  </span>
                  <p className="text-xs text-gray-500">
                    Permitir ventas aunque no haya stock disponible
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Producto activo
                  </span>
                  <p className="text-xs text-gray-500">
                    Desactivar para ocultar el producto sin eliminarlo
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : product ? 'Actualizar' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    {/* ✅ BarcodeScanner con componente mejorado */}
    {showScanner && (
      <BarcodeScanner
        onDetect={(code) => {
          setFormData(prev => ({ ...prev, barcode: code }));
          setShowScanner(false);
        }}
        onClose={() => setShowScanner(false)}
      />
    )}
    </>
  );
};  

export default ProductFormModal;