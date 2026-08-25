import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import useProductsStore from '../../store/productsStore';
import useCategoriesStore from '../../store/categoriesStore';
import useTenantStore from '../../store/tenantStore';
import BarcodeScanner from '../common/BarcodeScanner';
import { warehousesService } from '../../api/warehouses';
import { formatNumber } from '../../utils/formatters';
import NumericInput from '../inputs/NumericInput';
import ProductImageUpload from './ProductImageUpload';
import { productsAPI } from '../../api/products';
import RuntConsultaModal from '../workshop/RuntConsultaModal';

// Fase D — mismas 3 categorías que se configuran en Ajustes > Impuestos.
// La tarifa vive ahí (tenant.tax_config.ica_categories), no acá: si el
// producto referencia una categoría, la tarifa se resuelve en el backend al
// momento de facturar, así que un cambio de tarifa aplica a todos los
// productos de esa categoría sin tener que editarlos uno por uno.
const ICA_CATEGORIES = [
  { key: 'industrial', label: 'Industrial' },
  { key: 'comercial', label: 'Comercial' },
  { key: 'servicios', label: 'Servicios' },
];

const ProductFormModal = ({ isOpen, onClose, product = null }) => {
  const { createProduct, updateProduct, loading } = useProductsStore();
  const { categories, fetchCategories } = useCategoriesStore();
  const { taxConfig, fetchFeatures } = useTenantStore();

  const [warehouses, setWarehouses] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  const EMPTY_VEHICLE_DATA = {
    plate: '', vehicle_type: 'automovil', brand: '', model: '', year: '',
    color: '', vin: '', engine_number: '', fuel_type: 'gasolina', current_mileage: '',
  };

  const [vehicleData, setVehicleData] = useState(EMPTY_VEHICLE_DATA);
  const [showRunt, setShowRunt] = useState(false);

  const handleVehicleChange = (e) => {
    const { name, value } = e.target;
    setSaveError('');
    setVehicleData(prev => ({ ...prev, [name]: value }));
  };

  const handleRuntConfirm = (data) => {
    setVehicleData(prev => ({
      ...prev,
      plate:         data.plate         || prev.plate,
      vehicle_type:  data.vehicle_type  || prev.vehicle_type,
      brand:         data.brand         || prev.brand,
      model:         data.model         || prev.model,
      year:          data.year          || prev.year,
      color:         data.color         || prev.color,
      fuel_type:     data.fuel_type     || prev.fuel_type,
      engine_number: data.engine_number || prev.engine_number,
      vin:           data.vin           || prev.vin,
    }));
    setShowRunt(false);
  };

  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    category_id: '',
    brand: '',
    unit_of_measure: 'unit',
    average_cost: '',
    min_stock: '',
    max_stock: '',
    profit_margin_percentage: '',
    base_price: '',
    current_stock: '',
    warehouse_id: '',
    product_type: 'product',
    track_inventory: true,
    allow_negative_stock: false,
    is_active: true,
    has_tax: true,
    tax_percentage: 19,
    price_includes_tax: false,
    is_labor: false,
    tax_config: {
      iva: { enabled: true, rate: 19 },
      inc: { enabled: false, rate: 0 },
      ica: { enabled: false, rate: 0 },
    }
  });

  const [calculatedPrice, setCalculatedPrice] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [pendingImageFile, setPendingImageFile] = useState(null);

  const fmtNum = (v) => {
    if (v === '' || v === null || v === undefined) return '';
    const n = parseFloat(v);
    if (isNaN(n)) return '';
    return Number.isInteger(n) ? String(n) : parseFloat(n.toFixed(2)).toString();
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchFeatures(); // trae tax_config (incluye ica_categories) — no-op si ya está cargado
  }, [fetchFeatures]);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingWarehouses(true);
    warehousesService.getAll()
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setWarehouses(list);
        // Si hay solo una bodega y no hay producto, preseleccionarla
        if (list.length === 1 && !product) {
          setFormData(prev => ({ ...prev, warehouse_id: list[0].id }));
        }
      })
      .catch(() => setWarehouses([]))
      .finally(() => setLoadingWarehouses(false));
  }, [isOpen]);

  useEffect(() => {
    if (product) {
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
        brand: product.brand || '',
        unit_of_measure: product.unit_of_measure || 'unit',
        average_cost: fmtNum(product.average_cost),
        min_stock: fmtNum(product.min_stock),
        max_stock: fmtNum(product.max_stock),
        profit_margin_percentage: fmtNum(product.profit_margin_percentage),
        base_price: fmtNum(product.base_price),
        current_stock: fmtNum(product.current_stock),
        warehouse_id: product.warehouse_id || '',
        product_type: product.product_type || 'product',
        track_inventory: product.product_type === 'service' ? false : (product.track_inventory !== false),
        allow_negative_stock: product.allow_negative_stock || false,
        is_active: product.is_active !== false,
        has_tax: productHasTax,
        tax_percentage: productTaxPercentage,
        price_includes_tax: product.price_includes_tax || false,
        is_labor: product.is_labor || false,
        tax_config: product.tax_config || {
          iva: { enabled: productHasTax, rate: productTaxPercentage },
          inc: { enabled: false, rate: 0 },
          ica: { enabled: false, rate: 0 },
        }
      });
      // Los campos del vehículo vinculado no son editables desde acá (ver
      // updateProduct en el backend) -- solo se muestran de referencia.
      if (product.vehicle) {
        setVehicleData({
          plate: product.vehicle.plate || '',
          vehicle_type: product.vehicle.vehicle_type || 'automovil',
          brand: product.vehicle.brand || '',
          model: product.vehicle.model || '',
          year: product.vehicle.year || '',
          color: product.vehicle.color || '',
          vin: product.vehicle.vin || '',
          engine_number: product.vehicle.engine_number || '',
          fuel_type: product.vehicle.fuel_type || 'gasolina',
          current_mileage: product.vehicle.current_mileage || '',
        });
      }
    } else {
      setFormData(prev => ({
        sku: '',
        barcode: '',
        name: '',
        description: '',
        category_id: '',
        brand: '',
        unit_of_measure: 'unit',
        average_cost: '',
        min_stock: '',
        max_stock: '',
        profit_margin_percentage: '',
        base_price: '',
        current_stock: '',
        warehouse_id: prev.warehouse_id, // conservar bodega preseleccionada
        product_type: 'product',
        track_inventory: true,
        allow_negative_stock: false,
        is_active: true,
        has_tax: true,
        tax_percentage: 19,
        price_includes_tax: false,
        is_labor: false
      }));
      setVehicleData(EMPTY_VEHICLE_DATA);
      setCalculatedPrice(null);
      setSaveError('');
    }
  }, [product, isOpen]);

  useEffect(() => {
    if (formData.average_cost && formData.profit_margin_percentage) {
      const cost = parseFloat(formData.average_cost);
      const margin = parseFloat(formData.profit_margin_percentage);
      if (!isNaN(cost) && !isNaN(margin) && cost > 0 && margin >= 0) {
        setCalculatedPrice(fmtNum(cost * (1 + margin / 100)));
      } else {
        setCalculatedPrice(null);
      }
    } else {
      setCalculatedPrice(null);
    }
  }, [formData.average_cost, formData.profit_margin_percentage]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSaveError('');
    if (name === 'has_tax') {
      setFormData(prev => ({
        ...prev,
        has_tax: checked,
        tax_percentage: checked ? (prev.tax_percentage || 19) : 0
      }));
    } else if (name === 'tax_percentage') {
      const taxValue = parseFloat(value);
      setFormData(prev => ({
        ...prev,
        tax_percentage: taxValue,
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
      setFormData(prev => ({ ...prev, base_price: calculatedPrice }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');

    const dataToSend = {
      ...formData,
      average_cost: formData.average_cost ? parseFloat(formData.average_cost) : 0,
      min_stock: formData.min_stock ? parseFloat(formData.min_stock) : 0,
      max_stock: formData.max_stock ? parseFloat(formData.max_stock) : null,
      profit_margin_percentage: formData.profit_margin_percentage ? parseFloat(formData.profit_margin_percentage) : null,
      base_price: formData.base_price ? parseFloat(formData.base_price) : null,
      current_stock: formData.current_stock ? parseFloat(formData.current_stock) : 0,
      has_tax: formData.has_tax && parseFloat(formData.tax_percentage) > 0,
      tax_percentage: parseFloat(formData.tax_percentage) || 0,
      warehouse_id: formData.warehouse_id || null,
    };

    // El Vehicle real solo se crea junto con el producto la primera vez --
    // después se edita desde el módulo Vehículos (ver updateProduct backend).
    if (!product && formData.product_type === 'vehicle') {
      dataToSend.vehicle = vehicleData;
    }

    try {
      if (product) {
        await updateProduct(product.id, dataToSend);
      } else {
        const newProduct = await createProduct(dataToSend);
        // Si hay una imagen pendiente, subirla ahora que tenemos el ID
        if (pendingImageFile && newProduct?.id) {
          try { await productsAPI.uploadImage(newProduct.id, pendingImageFile); } catch {}
        }
      }
      setPendingImageFile(null);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al guardar el producto';
      setSaveError(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-graphite rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b dark:border-white/10">
                  Información Básica
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  placeholder="Ej: PROD-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Código de Barras
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                    placeholder="Ej: 7501234567890"
                  />
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
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Escanea con cámara o pistola USB</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del Producto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  placeholder="Ej: Laptop Dell Inspiron 15"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 resize-none"
                  placeholder="Descripción detallada del producto..."
                />
              </div>

              {/* Imagen del producto */}
              <div className="md:col-span-2">
                <ProductImageUpload
                  productId={product?.id}
                  imageUrl={product?.image_url}
                  onImageChange={(val) => {
                    if (val && typeof val === 'object' && val.file) {
                      // Producto nuevo: guardar archivo para subir después del create
                      setPendingImageFile(val.file);
                    }
                    // Para producto existente, el componente sube directamente
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Marca
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  placeholder="Ej: Bosch, Michelin, Toyota..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Categoría
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unidad de Medida
                </label>
                <select
                  name="unit_of_measure"
                  value={formData.unit_of_measure}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b dark:border-white/10">
                  Costos y Precios
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Costo Promedio
                  <span className="ml-2 text-xs text-blue-600 font-normal">Ingresa el costo SIN IVA</span>
                </label>
                <NumericInput
                  name="average_cost"
                  value={formData.average_cost}
                  onChange={handleChange}
                  decimals={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  placeholder="0,00"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Ejemplo: Si compras a $11,900 (con IVA 19%), ingresa $10,000</p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Se actualiza automáticamente con las compras</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Margen de Ganancia (%)
                </label>
                <input
                  type="number"
                  onWheel={(e) => e.target.blur()}
                  name="profit_margin_percentage"
                  value={formData.profit_margin_percentage}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  placeholder="0.00"
                />
                {calculatedPrice && (
                  <p className="mt-1 text-xs text-green-600 font-medium">
                    Precio sugerido: ${calculatedPrice}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Precio de Venta
                </label>
                <div className="flex gap-2">
                  <NumericInput
                    name="base_price"
                    value={formData.base_price}
                    onChange={handleChange}
                    decimals={2}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                    placeholder="0,00"
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
                    Diferencia con precio sugerido: ${formatNumber(parseFloat(formData.base_price) - parseFloat(calculatedPrice), 2)}
                  </p>
                )}
              </div>

              {/* Configuración de IVA */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b dark:border-white/10">
                  Configuración de IVA / Impuestos
                </h3>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de IVA</label>
                <select
                  name="tax_percentage"
                  value={formData.tax_percentage}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                >
                  <option value="0">Exento (0%)</option>
                  <option value="5">Reducido (5%)</option>
                  <option value="10">Intermedio (10%)</option>
                  <option value="19">General (19%)</option>
                  <option value="21">Otro (21%)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  {formData.tax_percentage === 0 || formData.tax_percentage === '0'
                    ? 'Producto exento de IVA'
                    : `IVA del ${formData.tax_percentage}% aplicable según normativa`}
                </p>
              </div>

              {formData.has_tax && parseFloat(formData.tax_percentage) > 0 && (
                <>
                  <div>
                    <label className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800/40">
                      <input
                        type="checkbox"
                        name="price_includes_tax"
                        checked={formData.price_includes_tax}
                        onChange={handleChange}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">El precio YA incluye IVA</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {formData.price_includes_tax
                            ? 'El precio mostrado incluye IVA'
                            : 'El IVA se suma al precio mostrado'}
                        </p>
                      </div>
                    </label>
                  </div>

                  {formData.base_price && (
                    <div className="md:col-span-2 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800/40">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        Desglose de Precio
                        <span className="text-xs font-normal text-gray-600 dark:text-gray-400">(Lo que verá el cliente)</span>
                      </div>
                      {formData.price_includes_tax ? (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div className="text-gray-600 dark:text-gray-400">Precio final al cliente:</div>
                            <div className="font-bold text-blue-600">${formatNumber(parseFloat(formData.base_price), 2)}</div>
                            <div className="text-gray-600 dark:text-gray-400">Base imponible (sin IVA):</div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">${formatNumber(parseFloat(formData.base_price) / (1 + parseFloat(formData.tax_percentage) / 100), 2)}</div>
                            <div className="text-gray-600 dark:text-gray-400">IVA ({formData.tax_percentage}%):</div>
                            <div className="font-medium text-green-600">${formatNumber(parseFloat(formData.base_price) - (parseFloat(formData.base_price) / (1 + parseFloat(formData.tax_percentage) / 100)), 2)}</div>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-graphite-2 p-2 rounded border border-gray-200 dark:border-white/10">
                            El cliente pagará exactamente ${formatNumber(parseFloat(formData.base_price), 2)} (ya con IVA incluido)
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div className="text-gray-600 dark:text-gray-400">Precio base (sin IVA):</div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">${formatNumber(parseFloat(formData.base_price), 2)}</div>
                            <div className="text-gray-600 dark:text-gray-400">+ IVA ({formData.tax_percentage}%):</div>
                            <div className="font-medium text-green-600">${formatNumber(parseFloat(formData.base_price) * parseFloat(formData.tax_percentage) / 100, 2)}</div>
                            <div className="text-gray-600 dark:text-gray-400">= Total al cliente:</div>
                            <div className="font-bold text-blue-600">${formatNumber(parseFloat(formData.base_price) * (1 + parseFloat(formData.tax_percentage) / 100), 2)}</div>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-graphite-2 p-2 rounded border border-gray-200 dark:border-white/10">
                            El cliente pagará ${formatNumber(parseFloat(formData.base_price) * (1 + parseFloat(formData.tax_percentage) / 100), 2)} (precio + IVA)
                          </div>
                        </>
                      )}
                      {formData.average_cost && formData.base_price && (
                        <div className="mt-3 pt-3 border-t border-blue-300 dark:border-blue-800/40">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-gray-600 dark:text-gray-400">Tu costo (sin IVA):</div>
                            <div className="font-medium text-gray-700 dark:text-gray-300">${formatNumber(parseFloat(formData.average_cost), 2)}</div>
                            <div className="text-gray-600 dark:text-gray-400">Tu ganancia:</div>
                            <div className="font-bold text-green-700 dark:text-green-400">${formatNumber(parseFloat(formData.base_price) - parseFloat(formData.average_cost), 2)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* INC - Impoconsumo */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b dark:border-white/10">
                  Otros Impuestos
                </h3>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-graphite-2 rounded-lg border border-gray-200 dark:border-white/10">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">INC (Impoconsumo)</span>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Aplica para licores, bebidas azucaradas, etc.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.tax_config?.inc?.rate || 0}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        tax_config: { ...prev.tax_config, inc: { ...prev.tax_config?.inc, rate: parseFloat(e.target.value) || 0 } }
                      }))}
                      disabled={!formData.tax_config?.inc?.enabled}
                      min="0"
                      step="0.01"
                      className="w-20 px-2 py-1.5 text-sm text-right border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 dark:bg-graphite dark:text-gray-100 dark:disabled:bg-white/5 dark:disabled:text-gray-600"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-500">%</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        tax_config: { ...prev.tax_config, inc: { ...prev.tax_config?.inc, enabled: !prev.tax_config?.inc?.enabled } }
                      }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.tax_config?.inc?.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-white/10'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        formData.tax_config?.inc?.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </label>
              </div>

              {/* ICA — Fase D: categoría económica en vez de tarifa manual */}
              <div className="md:col-span-2">
                <div className="p-3 bg-gray-50 dark:bg-graphite-2 rounded-lg border border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">ICA (Industria y Comercio)</span>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Impuesto municipal, se expresa en milésimas (‰)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        tax_config: { ...prev.tax_config, ica: { ...prev.tax_config?.ica, enabled: !prev.tax_config?.ica?.enabled } }
                      }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        formData.tax_config?.ica?.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-white/10'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        formData.tax_config?.ica?.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {formData.tax_config?.ica?.enabled && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 space-y-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Categoría económica</label>
                      <select
                        value={formData.tax_config?.ica?.category || ''}
                        onChange={(e) => {
                          const category = e.target.value || null;
                          setFormData(prev => ({
                            ...prev,
                            tax_config: {
                              ...prev.tax_config,
                              ica: { ...prev.tax_config?.ica, category, rate: category ? 0 : prev.tax_config?.ica?.rate }
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-graphite dark:text-gray-100"
                      >
                        <option value="">Personalizada (escribir tarifa manual)</option>
                        {ICA_CATEGORIES.map(cat => {
                          const configuredRate = (taxConfig?.ica_categories || []).find(c => c.key === cat.key)?.rate;
                          return (
                            <option key={cat.key} value={cat.key}>
                              {cat.label}{configuredRate !== undefined ? ` — ${configuredRate}‰` : ''}
                            </option>
                          );
                        })}
                      </select>

                      {formData.tax_config?.ica?.category ? (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          La tarifa se toma de Ajustes → Impuestos → Tarifas ICA por actividad económica.
                          {(taxConfig?.ica_categories || []).find(c => c.key === formData.tax_config.ica.category) === undefined &&
                            ' Aún no la has configurado ahí, así que hoy calcularía 0.'}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={formData.tax_config?.ica?.rate || 0}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              tax_config: { ...prev.tax_config, ica: { ...prev.tax_config?.ica, rate: parseFloat(e.target.value) || 0 } }
                            }))}
                            min="0"
                            step="0.01"
                            className="w-24 px-2 py-1.5 text-sm text-right border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-graphite dark:text-gray-100"
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-500">‰</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Inventario */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b dark:border-white/10">
                  Control de Inventario
                </h3>
              </div>

              {/* ── BODEGA ── */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bodega <span className="text-red-500">*</span>
                </label>
                {loadingWarehouses ? (
                  <div className="w-full px-4 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-graphite-2 text-sm text-gray-400 dark:text-gray-500">
                    Cargando bodegas...
                  </div>
                ) : warehouses.length === 0 ? (
                  <div className="w-full px-4 py-2 border border-yellow-200 dark:border-yellow-800/40 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-sm text-yellow-700 dark:text-yellow-300">
                    No hay bodegas configuradas. Crea una en Inventario → Bodegas.
                  </div>
                ) : (
                  <select
                    name="warehouse_id"
                    value={formData.warehouse_id}
                    onChange={handleChange}
                    required={formData.product_type === 'product'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  >
                    <option value="">Selecciona una bodega</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name}{w.location ? ` — ${w.location}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  Bodega donde se registrará el stock de este producto
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stock Actual</label>
                <input
                  type="number"
                  onWheel={(e) => e.target.blur()}
                  name="current_stock"
                  value={formData.current_stock}
                  onChange={handleChange}
                  step="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  placeholder="0.00"
                  disabled={formData.product_type === 'service' || formData.product_type === 'vehicle' || !!product}
                />
                {product && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Usa Ajustes o Compras para modificar el stock</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stock Mínimo <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  onWheel={(e) => e.target.blur()}
                  name="min_stock"
                  disabled={formData.product_type === 'service' || formData.product_type === 'vehicle'}
                  value={formData.min_stock}
                  onChange={handleChange}
                  step="1"
                  min="0"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  placeholder="0.00"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Genera alertas cuando se alcance este nivel</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stock Máximo</label>
                <input
                  type="number"
                  onWheel={(e) => e.target.blur()}
                  name="max_stock"
                  value={formData.max_stock}
                  onChange={handleChange}
                  step="1"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  placeholder="0.00"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Opcional: para control de sobre-stock</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Punto de Reorden</label>
                <input
                  type="number"
                  onWheel={(e) => e.target.blur()}
                  onChange={handleChange}
                  step="1"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  placeholder="0"
                />
              </div>

              {/* Tipo de ítem */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 pb-2 border-b dark:border-white/10">Tipo de ítem</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, product_type: 'product', track_inventory: true }))}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      formData.product_type === 'product' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                    </svg>
                    <div>
                      <p className={`font-semibold text-sm ${formData.product_type === 'product' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        Producto físico
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Maneja inventario y stock</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      product_type: 'service',
                      track_inventory: false,
                      current_stock: '',
                      min_stock: '',
                      max_stock: '',
                      average_cost: '',
                    }))}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      formData.product_type === 'service' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-7 h-7 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                    <div>
                      <p className={`font-semibold text-sm ${formData.product_type === 'service' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        Servicio
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Sin inventario, solo facturación</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={!!product}
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      product_type: 'vehicle',
                      track_inventory: true,
                      current_stock: '1',
                      min_stock: '0',
                      max_stock: '',
                    }))}
                    title={product ? 'El tipo no se puede cambiar después de creado' : ''}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      formData.product_type === 'vehicle' ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h8m-8 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0m12 0a2 2 0 104 0m-4 0a2 2 0 114 0m-16-4l1.5-4.5A2 2 0 017.4 7h9.2a2 2 0 011.9 1.5L20 13m-16 0h16m-16 0v3a1 1 0 001 1h1m14-4v3a1 1 0 01-1 1h-1" />
                    </svg>
                    <div>
                      <p className={`font-semibold text-sm ${formData.product_type === 'vehicle' ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        Vehículo
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Stock de concesionario</p>
                    </div>
                  </button>
                </div>

                {formData.product_type === 'vehicle' && (
                  <div className="mt-3 p-4 rounded-lg border border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-900/20 space-y-3">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {product
                        ? 'Estos datos son de solo lectura acá — para editarlos ve al módulo Vehículos.'
                        : 'Al guardar, además del producto se registra el vehículo en el módulo Vehículos.'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Placa
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            name="plate"
                            value={vehicleData.plate}
                            onChange={handleVehicleChange}
                            disabled={!!product}
                            maxLength={20}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 uppercase disabled:opacity-60"
                            placeholder="Ej: ABC123"
                          />
                          {!product && (
                            <button
                              type="button"
                              onClick={() => setShowRunt(true)}
                              disabled={!vehicleData.plate.trim()}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40"
                              title={vehicleData.plate.trim() ? 'Consultar datos en el RUNT' : 'Ingresa la placa para consultar el RUNT'}
                            >
                              <Search size={13} /> Consultar RUNT
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                          Déjala vacía si es un vehículo nuevo sin matrícula aún — se asigna un identificador temporal que puedes actualizar después desde Vehículos.
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de vehículo</label>
                        <select
                          name="vehicle_type"
                          value={vehicleData.vehicle_type}
                          onChange={handleVehicleChange}
                          disabled={!!product}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 disabled:opacity-60"
                        >
                          <option value="automovil">Automóvil</option>
                          <option value="camioneta">Camioneta</option>
                          <option value="motocicleta">Motocicleta</option>
                          <option value="camion">Camión</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
                        <input
                          type="text"
                          name="brand"
                          value={vehicleData.brand}
                          onChange={handleVehicleChange}
                          disabled={!!product}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 disabled:opacity-60"
                          placeholder="Ej: Toyota"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Modelo/Línea</label>
                        <input
                          type="text"
                          name="model"
                          value={vehicleData.model}
                          onChange={handleVehicleChange}
                          disabled={!!product}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 disabled:opacity-60"
                          placeholder="Ej: Corolla"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                        <input
                          type="number"
                          onWheel={(e) => e.target.blur()}
                          name="year"
                          value={vehicleData.year}
                          onChange={handleVehicleChange}
                          disabled={!!product}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 disabled:opacity-60"
                          placeholder="Ej: 2026"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                        <input
                          type="text"
                          name="color"
                          value={vehicleData.color}
                          onChange={handleVehicleChange}
                          disabled={!!product}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 disabled:opacity-60"
                          placeholder="Ej: Blanco"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">VIN / Chasis</label>
                        <input
                          type="text"
                          name="vin"
                          value={vehicleData.vin}
                          onChange={handleVehicleChange}
                          disabled={!!product}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Número de motor</label>
                        <input
                          type="text"
                          name="engine_number"
                          value={vehicleData.engine_number}
                          onChange={handleVehicleChange}
                          disabled={!!product}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Combustible</label>
                        <select
                          name="fuel_type"
                          value={vehicleData.fuel_type}
                          onChange={handleVehicleChange}
                          disabled={!!product}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 disabled:opacity-60"
                        >
                          <option value="gasolina">Gasolina</option>
                          <option value="diesel">Diésel</option>
                          <option value="gas">Gas</option>
                          <option value="hibrido">Híbrido</option>
                          <option value="electrico">Eléctrico</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Kilometraje</label>
                        <input
                          type="number"
                          onWheel={(e) => e.target.blur()}
                          name="current_mileage"
                          value={vehicleData.current_mileage}
                          onChange={handleVehicleChange}
                          disabled={!!product}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formData.product_type === 'service' && (
                  <label className="mt-3 flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer hover:border-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.is_labor}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_labor: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Es mano de obra (aplica comisión a técnico)</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Al agregarlo a una Orden de Trabajo, el ítem se precarga como "Mano de obra" en vez de "Servicio" genérico.
                      </p>
                    </div>
                  </label>
                )}
              </div>

              {/* Configuración */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b dark:border-white/10">Configuración</h3>
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
                    <span className="text-sm font-medium text-gray-900">Controlar inventario</span>
                    <p className="text-xs text-gray-500">Registrar movimientos de entrada y salida</p>
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
                    <span className="text-sm font-medium text-gray-900">Permitir stock negativo</span>
                    <p className="text-xs text-gray-500">Permitir ventas aunque no haya stock disponible</p>
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
                    <span className="text-sm font-medium text-gray-900">Producto activo</span>
                    <p className="text-xs text-gray-500">Desactivar para ocultar el producto sin eliminarlo</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 mt-8 pt-6 border-t">
              {saveError && (
                <div className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  {saveError}
                </div>
              )}
              <div className="flex gap-3">
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
            </div>
          </form>
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner
          onDetect={(code) => {
            setFormData(prev => ({ ...prev, barcode: code }));
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showRunt && (
        <RuntConsultaModal
          placa={vehicleData.plate}
          onConfirm={handleRuntConfirm}
          onClose={() => setShowRunt(false)}
        />
      )}
    </>
  );
};

export default ProductFormModal;