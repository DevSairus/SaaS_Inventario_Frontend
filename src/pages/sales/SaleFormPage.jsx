// frontend/src/pages/sales/SaleFormPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useSalesStore from '../../store/salesStore';
import useTenantStore from '../../store/tenantStore';
import useCustomersStore from '../../store/customersStore';
import useProductsStore from '../../store/productsStore';
import { warehousesService } from '../../api/warehouses';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Layout from '../../components/layout/Layout';
import { 
  Plus, 
  Trash2, 
  Search, 
  User, 
  FileText,
  Calendar,
  CreditCard,
  Package,
  ShoppingCart,
  X,
  Save,
  ArrowLeft
} from 'lucide-react';
import BarcodeScanner from '../../components/common/BarcodeScanner';
import { productsAPI } from '../../api/products';
import { 
  formatCurrency, 
  toInteger, 
  toNumber, 
  INPUT_CONFIG 
} from '../../utils/numberUtils';
import toast from 'react-hot-toast';

function SaleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { createSale, updateSale, fetchSaleById, currentSale, loading } = useSalesStore();
  const { features, fetchFeatures } = useTenantStore();
  // true = ocultar IVA en remisiones (el store aplica este default si no está configurado)
  const hideRemisionTax = features?.hide_remision_tax === true;
  const { customers, fetchCustomers } = useCustomersStore();
  const { searchProducts } = useProductsStore();

  const isEditMode = Boolean(id);

  const [warehouses, setWarehouses] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    warehouse_id: '',
    payment_method: 'efectivo',
    document_type: 'remision',
    sale_date: new Date().toISOString().split('T')[0],
    notes: '',
    vehicle_plate: '',
    mileage: ''
  });

  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({
    full_name: '',
    tax_id: '',
    email: '',
    phone: ''
  });

  const [items, setItems] = useState([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Estados para búsqueda de clientes
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Clientes filtrados basados en el término de búsqueda
  const filteredCustomers = customerSearchTerm.trim() === '' 
    ? customers 
    : customers.filter(customer => {
        const searchLower = customerSearchTerm.toLowerCase();
        const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
        const taxId = (customer.tax_id || '').toLowerCase();
        return fullName.includes(searchLower) || taxId.includes(searchLower);
      });

  // Cargar bodegas usando el servicio de API configurado
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const data = await warehousesService.getAll();
        setWarehouses(data.data || []);
      } catch (e) {
        setWarehouses([]);
      }
    };
    loadWarehouses();
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchFeatures();
  }, [fetchCustomers]);

  useEffect(() => {
    const searchProductsDebounced = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchProducts(searchTerm);
        setSearchResults(results);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchProductsDebounced, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchProducts]);

  // Cerrar dropdown de clientes al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCustomerDropdown && !event.target.closest('.customer-selector')) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCustomerDropdown]);

  useEffect(() => {
    if (isEditMode && id) {
      fetchSaleById(id);
    }
  }, [isEditMode, id, fetchSaleById]);

  useEffect(() => {
    if (isEditMode && currentSale) {
      setFormData({
        customer_id: currentSale.customer_id || '',
        warehouse_id: currentSale.warehouse_id || '',
        payment_method: currentSale.payment_method || 'efectivo',
        document_type: currentSale.document_type || 'remision',
        sale_date: currentSale.sale_date 
          ? new Date(currentSale.sale_date).toISOString().split('T')[0] 
          : new Date().toISOString().split('T')[0],
        notes: currentSale.notes || '',
        vehicle_plate: currentSale.vehicle_plate || '',
        mileage: currentSale.mileage || ''
      });

      // Establecer el nombre del cliente en el campo de búsqueda
      if (currentSale.customer_name) {
        setCustomerSearchTerm(currentSale.customer_name);
      }

      if (currentSale.items && currentSale.items.length > 0) {
        const loadedItems = currentSale.items.map(item => ({
          item_type: item.item_type || 'product',
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          quantity: toInteger(item.quantity, 1),
          unit_price: toInteger(item.unit_price, 0),
          discount_percentage: toInteger(item.discount_percentage, 0),
          tax_percentage: toInteger(item.tax_percentage, 19),
          discount_amount: toInteger(item.discount_amount, 0),
          tax_amount: toInteger(item.tax_amount, 0),
          subtotal: toInteger(item.subtotal, 0),
          total: toInteger(item.total, 0)
        }));
        setItems(loadedItems);
      }
    }
  }, [isEditMode, currentSale]);

  // Recalcular totales cuando cambie el tipo de documento (afecta si se aplica IVA o no)
  useEffect(() => {
    if (items.length > 0) {
      setItems(items.map(item => calculateItemTotals(item)));
    }
  }, [formData.document_type]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'vehicle_plate') {
      // Convertir a mayúsculas y permitir solo letras, números y guión
      const formattedValue = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      setFormData(prev => ({ ...prev, vehicle_plate: formattedValue }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuickCustomerChange = (e) => {
    const { name, value } = e.target;
    setQuickCustomer(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = (product) => {
    // 🔍 DEBUG: Ver qué información trae el producto
    console.log('📦 Producto agregado:', {
      name: product.name,
      tax_percentage: product.tax_percentage,
      price_includes_tax: product.price_includes_tax,
      has_tax: product.has_tax,
      base_price: product.base_price
    });
    
    const existingIndex = items.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity = toInteger(newItems[existingIndex].quantity, 0) + 1;
      newItems[existingIndex] = calculateItemTotals(newItems[existingIndex]);
      setItems(newItems);
    } else {
      const taxPct = product.has_tax === false ? 0 : (product.tax_percentage || 19);

      const newItem = {
        item_type: product.product_type === 'service' ? 'service' : 'product',
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: 1,
        unit_price: toInteger(product.base_price, 0), // Precio tal cual, sin extraer IVA
        discount_percentage: 0,
        tax_percentage: taxPct,
        price_includes_tax: product.price_includes_tax || false,
        has_tax: product.has_tax !== false
      };
      setItems([...items, calculateItemTotals(newItem)]);
    }
    setShowProductSearch(false);
    setSearchTerm('');
  };

  const handleBarcodeScan = async (code) => {
    setShowScanner(false);
    try {
      const response = await productsAPI.getByBarcode(code);
      if (response?.data) {
        handleAddItem(response.data);
        
        // Dar feedback visual/sonoro
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
      } else {
        toast('Producto no encontrado para el código: ' + code);
      }
    } catch (e) {
      toast('Producto no encontrado para el código: ' + code);
    }
  };

  const calculateItemTotals = (item) => {
    const quantity = toInteger(item.quantity, 0);
    const unitPrice = toInteger(item.unit_price, 0);
    const discountPercentage = toInteger(item.discount_percentage, 0);
    const taxPercentage = toInteger(item.tax_percentage, 0);
    const priceIncludesTax = item.price_includes_tax || false;
    const hasTax = item.has_tax !== false;

    const subtotal = quantity * unitPrice;
    const discount = Math.round((subtotal * discountPercentage) / 100);
    const taxBase = subtotal - discount;
    
    let tax = 0;
    let total = 0;

    if (!hasTax) {
      // Producto exento de IVA
      tax = 0;
      total = taxBase;
    } else if (priceIncludesTax) {
      // El precio YA INCLUYE el IVA - extraerlo
      tax = Math.round((taxBase * taxPercentage) / (100 + taxPercentage));
      total = taxBase;
    } else {
      // El precio NO incluye IVA - sumarlo
      tax = Math.round((taxBase * taxPercentage) / 100);
      total = taxBase + tax;
    }

    return {
      ...item,
      quantity,
      unit_price: unitPrice,
      discount_percentage: discountPercentage,
      tax_percentage: taxPercentage,
      subtotal,
      discount_amount: discount,
      tax_amount: tax,
      total
    };
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = toInteger(value, 0);
    newItems[index] = calculateItemTotals(newItems[index]);
    setItems(newItems);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + toInteger(item.subtotal, 0), 0);
    const discount = items.reduce((sum, item) => sum + toInteger(item.discount_amount, 0), 0);
    const tax = items.reduce((sum, item) => sum + toInteger(item.tax_amount, 0), 0);
    const total = items.reduce((sum, item) => sum + toInteger(item.total, 0), 0);
    return { subtotal, discount, tax, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (items.length === 0) {
      toast('Debe agregar al menos un producto');
      return;
    }

    try {
      const saleData = {
        ...formData,
        items: items.map(item => ({
          item_type: item.item_type || 'product',
          product_id: item.product_id || null,
          product_name: item.product_name,
          quantity: toInteger(item.quantity),
          unit_price: toInteger(item.unit_price),
          discount_percentage: toInteger(item.discount_percentage),
          tax_percentage: toInteger(item.tax_percentage)
        }))
      };

      if (showQuickCustomer && quickCustomer.full_name) {
        saleData.customer_data = quickCustomer;
        delete saleData.customer_id;
      }

      if (isEditMode) {
        await updateSale(id, saleData);
        toast.success('Venta actualizada exitosamente');
        navigate(`/sales/${id}`);
      } else {
        const result = await createSale(saleData);
        toast.success('Venta creada exitosamente');
        navigate(`/sales/${result.id}`);
      }
    } catch (error) {
      toast.error(error.message || 'Error al guardar la venta');
    }
  };

  const totals = calculateTotals();

  return (
    <Layout>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/sales')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                {isEditMode ? 'Editar Venta' : 'Nueva Venta'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {isEditMode ? 'Modifica los datos de la venta' : 'Crea una nueva venta, factura o cotización'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => navigate('/sales')}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || items.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div>
          <form onSubmit={handleSubmit}>
            {/* Información General */}
            <Card className="mb-6">
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <FileText className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Información General</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Tipo de Documento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Documento *
                    </label>
                    <select
                      name="document_type"
                      value={formData.document_type}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="remision">📋 Remisión</option>
                      <option value="factura">📄 Factura</option>
                      <option value="cotizacion">💼 Cotización</option>
                    </select>
                  </div>

                  {/* Fecha */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Fecha *
                    </label>
                    <Input
                      type="date"
                      name="sale_date"
                      value={formData.sale_date}
                      onChange={handleInputChange}
                      required
                      className="w-full"
                    />
                  </div>

                  {/* Cliente */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Cliente *
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative customer-selector">
                        <input
                          type="text"
                          value={customerSearchTerm}
                          onChange={(e) => {
                            setCustomerSearchTerm(e.target.value);
                            setShowCustomerDropdown(true);
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          placeholder="Buscar cliente por nombre..."
                          disabled={showQuickCustomer}
                          required={!showQuickCustomer && !formData.customer_id}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-all"
                        />
                        {showCustomerDropdown && !showQuickCustomer && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredCustomers.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-gray-500">
                                No se encontraron clientes
                              </div>
                            ) : (
                              filteredCustomers.map(customer => (
                                <button
                                  key={customer.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, customer_id: customer.id }));
                                    setCustomerSearchTerm(`${customer.first_name} ${customer.last_name}`);
                                    setShowCustomerDropdown(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-900">
                                    {customer.first_name} {customer.last_name}
                                  </div>
                                  {customer.tax_id && (
                                    <div className="text-xs text-gray-500">
                                      {customer.tax_id}
                                    </div>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant={showQuickCustomer ? "primary" : "outline"}
                        onClick={() => {
                          setShowQuickCustomer(!showQuickCustomer);
                          if (!showQuickCustomer) {
                            setCustomerSearchTerm('');
                            setFormData(prev => ({ ...prev, customer_id: '' }));
                          }
                        }}
                        className="px-4"
                        title="Agregar cliente rápido"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Bodega */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Package className="w-4 h-4 inline mr-1" />
                      Bodega
                    </label>
                    <select
                      name="warehouse_id"
                      value={formData.warehouse_id}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Sin bodega específica</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Placa del Vehículo */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Placa del Vehículo
                    <span className="text-gray-400 text-xs ml-2">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    name="vehicle_plate"
                    value={formData.vehicle_plate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all uppercase"
                    placeholder="ABC-123 o ABC123"
                    maxLength="20"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ingrese la placa del vehículo si aplica
                  </p>
                </div>

                {/* Kilometraje */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilometraje
                    <span className="text-gray-400 text-xs ml-2">(Opcional)</span>
                  </label>
                  <input
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Ej: 85000"
                    min="0"
                    max="9999999"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Kilometraje del vehículo al momento del servicio
                  </p>
                </div>

                {/* Cliente Rápido */}
                {showQuickCustomer && (
                  <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-blue-900 flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Cliente Rápido
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowQuickCustomer(false)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Nombre Completo *"
                        name="full_name"
                        value={quickCustomer.full_name}
                        onChange={handleQuickCustomerChange}
                        required={showQuickCustomer}
                        placeholder="Juan Pérez"
                      />
                      <Input
                        label="NIT / Cédula"
                        name="tax_id"
                        value={quickCustomer.tax_id}
                        onChange={handleQuickCustomerChange}
                        placeholder="900123456-7"
                      />
                      <Input
                        label="Email"
                        type="email"
                        name="email"
                        value={quickCustomer.email}
                        onChange={handleQuickCustomerChange}
                        placeholder="cliente@ejemplo.com"
                      />
                      <Input
                        label="Teléfono"
                        name="phone"
                        value={quickCustomer.phone}
                        onChange={handleQuickCustomerChange}
                        placeholder="3001234567"
                      />
                    </div>
                  </div>
                )}

                {/* Notas */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas adicionales
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                    placeholder="Observaciones, condiciones especiales, etc..."
                  />
                </div>
              </div>
            </Card>

            {/* Productos */}
            <Card className="mb-6">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <ShoppingCart className="w-5 h-5 text-blue-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      Productos ({items.length})
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => setShowProductSearch(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Producto
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        const newFreeLine = {
                          item_type: 'free_line',
                          product_id: null,
                          product_name: '',
                          product_sku: null,
                          quantity: 1,
                          unit_price: 0,
                          discount_percentage: 0,
                          tax_percentage: 19,
                          price_includes_tax: false,
                          has_tax: true,
                        };
                        setItems([...items, calculateItemTotals(newFreeLine)]);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Línea Libre
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                      title="Escanear código de barras con cámara o pistola USB"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Escanear
                    </button>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium mb-2">No hay productos agregados</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Agrega productos para crear la venta
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        type="button"
                        onClick={() => setShowProductSearch(true)}
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Producto
                      </Button>
                      <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Escanear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Producto
                          </th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                            Cantidad
                          </th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                            Precio Unit.
                          </th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                            Desc. %
                          </th>
                          {!(hideRemisionTax && formData.document_type === 'remision') && (
                          <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                            IVA %
                          </th>
                          )}
                          <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                            Total
                          </th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4">
                              {item.item_type === 'free_line' ? (
                                <input
                                  type="text"
                                  value={item.product_name}
                                  onChange={(e) => {
                                    const updated = [...items];
                                    updated[index].product_name = e.target.value;
                                    setItems(updated);
                                  }}
                                  placeholder="Descripción del ítem..."
                                  className="w-full px-2 py-1 border border-indigo-300 rounded text-sm font-medium text-gray-900 focus:ring-2 focus:ring-indigo-400"
                                />
                              ) : (
                                <div className="font-medium text-gray-900">{item.product_name}</div>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                {item.item_type === 'service' && (
                                  <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">🔧 Servicio</span>
                                )}
                                {item.item_type === 'free_line' && (
                                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">✏️ Línea libre</span>
                                )}
                                {item.item_type !== 'free_line' && item.product_sku && (
                                  <span className="text-sm text-gray-500">SKU: {item.product_sku}</span>
                                )}
                              </div>
                              {item.price_includes_tax && (
                                <div className="text-xs text-blue-600 mt-1 font-medium">💡 Precio incluye IVA</div>
                              )}
                              {item.has_tax === false && (
                                <div className="text-xs text-green-600 mt-1 font-medium">✓ Exento de IVA</div>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <Input
                                type="number"
                                {...INPUT_CONFIG.quantity}
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                className="text-center w-full"
                              />
                            </td>
                            <td className="py-4 px-4">
                              <Input
                                type="number"
                                {...INPUT_CONFIG.price}
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                className="text-right w-full"
                              />
                            </td>
                            <td className="py-4 px-4">
                              <Input
                                type="number"
                                {...INPUT_CONFIG.percentage}
                                value={item.discount_percentage}
                                onChange={(e) => handleItemChange(index, 'discount_percentage', e.target.value)}
                                className="text-right w-full"
                              />
                            </td>
                            {!(hideRemisionTax && formData.document_type === 'remision') && (
                            <td className="py-4 px-4">
                              <Input
                                type="number"
                                {...INPUT_CONFIG.percentage}
                                value={item.tax_percentage}
                                onChange={(e) => handleItemChange(index, 'tax_percentage', e.target.value)}
                                className={`text-right w-full ${
                                  item.has_tax === false || item.price_includes_tax 
                                    ? 'bg-gray-100 cursor-not-allowed' 
                                    : ''
                                }`}
                                disabled={item.has_tax === false || item.price_includes_tax}
                                title={
                                  item.has_tax === false 
                                    ? 'Producto exento de IVA' 
                                    : item.price_includes_tax 
                                    ? 'IVA configurado en el producto (incluido en precio)'
                                    : ''
                                }
                              />
                            </td>
                            )}
                            <td className="py-4 px-4 text-right">
                              <span className="font-semibold text-gray-900">
                                ${formatCurrency(item.total)}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>

            {/* Totales */}
            {items.length > 0 && (
              <Card className="mb-6">
                <div className="p-6">
                  <div className="max-w-md ml-auto">
                    <div className="space-y-3">
                      {(hideRemisionTax && formData.document_type === 'remision') ? (
                        /* Remisión: mostrar solo el total (IVA incluido pero no discriminado) */
                        <>
                          {totals.discount > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>Descuento:</span>
                              <span className="font-medium">
                                -${formatCurrency(totals.discount)}
                              </span>
                            </div>
                          )}
                          <div className="border-t-2 border-gray-300 pt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-gray-900">TOTAL:</span>
                              <span className="text-2xl font-bold text-blue-600">
                                ${formatCurrency(totals.total)}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Factura / Cotización: mostrar subtotal + IVA + total discriminados */
                        <>
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal:</span>
                            <span className="font-medium text-gray-900">
                              ${formatCurrency(totals.subtotal)}
                            </span>
                          </div>

                          {totals.discount > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>Descuento:</span>
                              <span className="font-medium">
                                -${formatCurrency(totals.discount)}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between text-sm text-gray-600">
                            <span>IVA:</span>
                            <span className="font-medium text-gray-900">
                              ${formatCurrency(totals.tax)}
                            </span>
                          </div>

                          <div className="border-t-2 border-gray-300 pt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-gray-900">TOTAL:</span>
                              <span className="text-2xl font-bold text-blue-600">
                                ${formatCurrency(totals.total)}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </form>
        </div>

        {/* Modal de búsqueda de productos */}
        <Modal
          isOpen={showProductSearch}
          onClose={() => {
            setShowProductSearch(false);
            setSearchTerm('');
            setSearchResults([]);
          }}
          title="Buscar Producto"
        >
          <div className="space-y-4">
            {/* Input de búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>

            {/* Mensaje: escribir al menos 2 caracteres */}
            {searchTerm.length > 0 && searchTerm.length < 2 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  ✏️ Escribe al menos 2 caracteres para buscar
                </p>
              </div>
            )}

            {/* Mensaje: buscando... */}
            {isSearching && searchTerm.length >= 2 && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-sm text-gray-600">Buscando productos...</span>
              </div>
            )}

            {/* Mensaje: no se encontraron productos */}
            {!isSearching && searchTerm.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  🔍 No se encontraron productos con "{searchTerm}"
                </p>
              </div>
            )}

            {/* Lista de productos encontrados */}
            {!isSearching && searchResults.length > 0 && (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {searchResults.map(product => (
                  <button
                    key={product.id}
                    onClick={() => {
                      handleAddItem(product);
                      setShowProductSearch(false);
                      setSearchTerm('');
                      setSearchResults([]);
                    }}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500 mt-1">SKU: {product.sku}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {product.product_type === 'service' ? (
                            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">🔧 Servicio</span>
                          ) : (
                            <span className={`text-sm font-medium ${
                              product.current_stock > 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              Stock: {product.current_stock || 0}
                            </span>
                          )}
                          {product.category?.name && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {product.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-lg text-blue-600">
                          ${formatCurrency(product.base_price || 0)}
                        </p>
                        {product.price_includes_tax && (
                          <p className="text-xs text-blue-600 mt-1">
                            (IVA {product.tax_percentage || 19}% incluido)
                          </p>
                        )}
                        {product.has_tax === false && (
                          <p className="text-xs text-green-600 mt-1">
                            (Exento de IVA)
                          </p>
                        )}
                        {product.has_tax !== false && !product.price_includes_tax && (
                          <p className="text-xs text-gray-500 mt-1">
                            + IVA {product.tax_percentage || 19}%
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>

        {/* BarcodeScanner */}
        {showScanner && (
          <BarcodeScanner
            onDetect={handleBarcodeScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </Layout>
  );
}

export default SaleFormPage;