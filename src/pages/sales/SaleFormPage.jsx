// frontend/src/pages/sales/SaleFormPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useSalesStore from '../../store/salesStore';
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
import BarcodeScanner from '../../components/common/BarcodeScanner'; // ✅ Usa el BarcodeScanner mejorado
import { productsAPI } from '../../api/products';

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('COP', '').trim();
};

function SaleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { createSale, updateSale, fetchSaleById, currentSale, loading } = useSalesStore();
  const { customers, fetchCustomers } = useCustomersStore();
  const { products, fetchProducts } = useProductsStore();

  const isEditMode = Boolean(id);

  const [warehouses, setWarehouses] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    warehouse_id: '',
    payment_method: 'efectivo',
    document_type: 'remision',
    sale_date: new Date().toISOString().split('T')[0],
    notes: '',
    vehicle_plate: ''
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
  const [showScanner, setShowScanner] = useState(false);

  // Cargar bodegas usando el servicio de API configurado
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const data = await warehousesService.getAll();
        setWarehouses(data.data || []);
      } catch (e) {
        console.error('Error cargando bodegas:', e);
        setWarehouses([]);
      }
    };
    loadWarehouses();
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, [fetchCustomers, fetchProducts]);

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
        vehicle_plate: currentSale.vehicle_plate || ''
      });

      if (currentSale.items && currentSale.items.length > 0) {
        const loadedItems = currentSale.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage || 0,
          tax_percentage: item.tax_percentage || 19,
          discount_amount: item.discount_amount || 0,
          tax_amount: item.tax_amount || 0,
          subtotal: item.subtotal || 0,
          total: item.total || 0
        }));
        setItems(loadedItems);
      }
    }
  }, [isEditMode, currentSale]);

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
    const existingIndex = items.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      newItems[existingIndex] = calculateItemTotals(newItems[existingIndex]);
      setItems(newItems);
    } else {
      const newItem = {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: 1,
        unit_price: product.sale_price || 0,
        discount_percentage: 0,
        tax_percentage: 19
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
        
        // ✅ Dar feedback visual/sonoro
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
      } else {
        alert('Producto no encontrado para el código: ' + code);
      }
    } catch (e) {
      console.error('Error buscando producto:', e);
      alert('Producto no encontrado para el código: ' + code);
    }
  };

  const calculateItemTotals = (item) => {
    const subtotal = item.quantity * item.unit_price;
    const discount = subtotal * (item.discount_percentage / 100);
    const taxBase = subtotal - discount;
    const tax = taxBase * (item.tax_percentage / 100);
    const total = taxBase + tax;

    return {
      ...item,
      subtotal,
      discount_amount: discount,
      tax_amount: tax,
      total
    };
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = parseFloat(value) || 0;
    newItems[index] = calculateItemTotals(newItems[index]);
    setItems(newItems);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const discount = items.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
    const tax = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
    const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
    return { subtotal, discount, tax, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (items.length === 0) {
      alert('Debe agregar al menos un producto');
      return;
    }

    try {
      const saleData = {
        ...formData,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage,
          tax_percentage: item.tax_percentage
        }))
      };

      if (showQuickCustomer && quickCustomer.full_name) {
        saleData.customer_data = quickCustomer;
        delete saleData.customer_id;
      }

      if (isEditMode) {
        await updateSale(id, saleData);
        alert('Venta actualizada exitosamente');
        navigate(`/sales/${id}`);
      } else {
        const result = await createSale(saleData);
        alert('Venta creada exitosamente');
        navigate(`/sales/${result.id}`);
      }
    } catch (error) {
      console.error('Error al guardar venta:', error);
      alert(error.message || 'Error al guardar la venta');
    }
  };

  const totals = calculateTotals();
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/sales')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? 'Editar Venta' : 'Nueva Venta'}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {isEditMode ? 'Modifica los datos de la venta' : 'Crea una nueva venta, factura o cotización'}
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/sales')}
                >
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
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

                  {/* Método de Pago */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CreditCard className="w-4 h-4 inline mr-1" />
                      Método de Pago *
                    </label>
                    <select
                      name="payment_method"
                      value={formData.payment_method}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="efectivo">💵 Efectivo</option>
                      <option value="tarjeta">💳 Tarjeta</option>
                      <option value="transferencia">🏦 Transferencia</option>
                      <option value="credito">📝 Crédito</option>
                    </select>
                  </div>

                  {/* Cliente */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Cliente *
                    </label>
                    <div className="flex gap-2">
                      <select
                        name="customer_id"
                        value={formData.customer_id}
                        onChange={handleInputChange}
                        required={!showQuickCustomer}
                        disabled={showQuickCustomer}
                        className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-all"
                      >
                        <option value="">Seleccionar cliente</option>
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.first_name} {customer.last_name} {customer.tax_id ? `- ${customer.tax_id}` : ''}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant={showQuickCustomer ? "primary" : "outline"}
                        onClick={() => setShowQuickCustomer(!showQuickCustomer)}
                        className="px-4"
                      >
                        <User className="w-4 h-4" />
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
                    {/* ✅ Botón de escaneo mejorado */}
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
                          <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                            IVA %
                          </th>
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
                              <div className="font-medium text-gray-900">{item.product_name}</div>
                              <div className="text-sm text-gray-500">SKU: {item.product_sku}</div>
                            </td>
                            <td className="py-4 px-4">
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                className="text-center w-full"
                              />
                            </td>
                            <td className="py-4 px-4">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                className="text-right w-full"
                              />
                            </td>
                            <td className="py-4 px-4">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={item.discount_percentage}
                                onChange={(e) => handleItemChange(index, 'discount_percentage', e.target.value)}
                                className="text-right w-full"
                              />
                            </td>
                            <td className="py-4 px-4">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={item.tax_percentage}
                                onChange={(e) => handleItemChange(index, 'tax_percentage', e.target.value)}
                                className="text-right w-full"
                              />
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(item.total)}
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
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal:</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(totals.subtotal)}
                        </span>
                      </div>
                      
                      {totals.discount > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Descuento:</span>
                          <span className="font-medium">
                            -{formatCurrency(totals.discount)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>IVA:</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(totals.tax)}
                        </span>
                      </div>
                      
                      <div className="border-t-2 border-gray-300 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900">TOTAL:</span>
                          <span className="text-2xl font-bold text-blue-600">
                            {formatCurrency(totals.total)}
                          </span>
                        </div>
                      </div>
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
          }}
          title="Buscar Producto"
        >
          <div className="p-6">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 text-base"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium">No se encontraron productos</p>
                  <p className="text-sm mt-2">Intenta con otro término de búsqueda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      onClick={() => handleAddItem(product)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 group-hover:text-blue-700">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            SKU: {product.sku || 'N/A'} • Stock disponible: {product.available_stock || 0}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-blue-600 text-lg">
                            ${formatCurrency(product.sale_price || 0)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Click para agregar
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>

        {/* ✅ BarcodeScanner con componente mejorado */}
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