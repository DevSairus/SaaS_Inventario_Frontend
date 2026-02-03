import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { usePurchasesStore } from '../../store/purchasesStore';
import { useSuppliersStore } from '../../store/suppliersStore';
import useProductsStore from '../../store/productsStore';
import Layout from '../../components/layout/Layout';

const PurchaseFormPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  
  const { createPurchase, updatePurchase, getPurchaseById, isLoading } = usePurchasesStore();
  const { suppliers, fetchSuppliers } = useSuppliersStore();
  const { products, fetchProducts } = useProductsStore();

  const [formData, setFormData] = useState({
    supplier_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    payment_method: '',
    invoice_number: '',
    reference: '',
    notes: '',
    internal_notes: '',
    discount_amount: 0,
    shipping_cost: 0
  });

  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    quantity: 1,
    unit_cost: 0,
    tax_rate: 19,
    discount_percentage: 0
  });

  // Estados para búsqueda de productos
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  // Cargar datos prellenados desde Stock Alerts
  useEffect(() => {
    if (!isEditMode && location.state?.prefilledData && products.length > 0) {
      const { prefilledData } = location.state;
      
      // Prellenar proveedor
      if (prefilledData.supplier_id) {
        setFormData(prev => ({
          ...prev,
          supplier_id: prefilledData.supplier_id
        }));
      }

      // Prellenar producto como primer item
      if (prefilledData.product && prefilledData.product.id) {
        const product = products.find(p => p.id === prefilledData.product.id);
        if (product) {
          const quantity = prefilledData.suggested_quantity || 1;
          const unit_cost = prefilledData.product.last_price || 0;
          
          const totals = calculateItemTotals({
            quantity,
            unit_cost,
            tax_rate: 19,
            discount_percentage: 0
          });

          const prefilledItem = {
            product_id: product.id,
            quantity,
            unit_cost,
            tax_rate: 19,
            discount_percentage: 0,
            product_name: product.name,
            product_sku: product.sku,
            ...totals
          };

          setItems([prefilledItem]);
        }
      }

      // Limpiar el state para evitar que se vuelva a cargar
      window.history.replaceState({}, document.title);
    }
  }, [location.state, isEditMode, products]);

  // Cargar datos de la compra en modo edición
  useEffect(() => {
    const loadPurchaseData = async () => {
      if (isEditMode && id) {
        try {
          const purchase = await getPurchaseById(id);
          
          // No permitir editar compras confirmadas, recibidas o canceladas
          if (purchase.status !== 'draft') {
            alert('Solo se pueden editar compras en estado borrador');
            navigate(`/purchases/${id}`);
            return;
          }

          // Cargar datos del formulario
          setFormData({
            supplier_id: purchase.supplier_id || '',
            purchase_date: purchase.purchase_date || '',
            expected_delivery_date: purchase.expected_delivery_date || '',
            payment_method: purchase.payment_method || '',
            invoice_number: purchase.invoice_number || '',
            reference: purchase.reference || '',
            notes: purchase.notes || '',
            internal_notes: purchase.internal_notes || '',
            discount_amount: purchase.discount_amount || 0,
            shipping_cost: purchase.shipping_cost || 0
          });

          // Cargar items
          if (purchase.items && purchase.items.length > 0) {
            const loadedItems = purchase.items.map(item => {
              const product = products.find(p => p.id === item.product_id);
              const totals = calculateItemTotals({
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                tax_rate: item.tax_rate || 19,
                discount_percentage: item.discount_percentage || 0
              });

              return {
                product_id: item.product_id,
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                tax_rate: item.tax_rate || 19,
                discount_percentage: item.discount_percentage || 0,
                product_name: item.product?.name || product?.name || 'Producto desconocido',
                product_sku: item.product?.sku || product?.sku || '',
                ...totals
              };
            });
            setItems(loadedItems);
          }
        } catch (error) {
          console.error('Error cargando compra:', error);
          alert('Error al cargar los datos de la compra');
          navigate('/purchases');
        }
      }
    };

    if (products.length > 0) {
      loadPurchaseData();
    }
  }, [isEditMode, id, navigate, getPurchaseById, products]);

  // Filtrar productos cuando cambia la búsqueda
  useEffect(() => {
    if (productSearch.trim() === '') {
      setFilteredProducts(products.slice(0, 50));
    } else {
      const search = productSearch.toLowerCase();
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search)
      ).slice(0, 50);
      setFilteredProducts(filtered);
    }
  }, [productSearch, products]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProductDropdown && !event.target.closest('.product-search-container')) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProductDropdown]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({ ...prev, [name]: value }));
  };

  const handleProductSearch = (e) => {
    setProductSearch(e.target.value);
    setShowProductDropdown(true);
  };

  const selectProduct = (product) => {
    setCurrentItem(prev => ({ ...prev, product_id: product.id }));
    setProductSearch(`${product.sku} - ${product.name}`);
    setShowProductDropdown(false);
  };

  const clearProductSelection = () => {
    setCurrentItem(prev => ({ ...prev, product_id: '' }));
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const calculateItemTotals = (item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitCost = parseFloat(item.unit_cost) || 0;
    const taxRate = parseFloat(item.tax_rate) || 0;
    const discountPercentage = parseFloat(item.discount_percentage) || 0;

    const subtotal = quantity * unitCost;
    const discountAmount = (subtotal * discountPercentage) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxAmount = (subtotalAfterDiscount * taxRate) / 100;
    const total = subtotalAfterDiscount + taxAmount;

    return {
      subtotal: subtotalAfterDiscount,
      discountAmount,
      taxAmount,
      total
    };
  };

  const addItem = () => {
    if (!currentItem.product_id || !currentItem.quantity || !currentItem.unit_cost) {
      alert('Por favor complete todos los campos del producto');
      return;
    }

    const existingItemIndex = items.findIndex(item => item.product_id === currentItem.product_id);
    
    if (existingItemIndex >= 0) {
      alert('Este producto ya está en la lista');
      return;
    }

    const product = products.find(p => p.id === currentItem.product_id);
    const totals = calculateItemTotals(currentItem);

    const newItem = {
      ...currentItem,
      product_name: product?.name || '',
      product_sku: product?.sku || '',
      ...totals
    };

    setItems([...items, newItem]);
    
    setCurrentItem({
      product_id: '',
      quantity: 1,
      unit_cost: 0,
      tax_rate: 19,
      discount_percentage: 0
    });
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    const totals = calculateItemTotals(updatedItems[index]);
    updatedItems[index] = {
      ...updatedItems[index],
      ...totals
    };

    setItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
    const taxAmount = items.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);
    const discountAmount = parseFloat(formData.discount_amount) || 0;
    const shippingCost = parseFloat(formData.shipping_cost) || 0;
    const total = subtotal + taxAmount - discountAmount + shippingCost;

    return {
      subtotal,
      taxAmount,
      total
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplier_id) {
      alert('Por favor seleccione un proveedor');
      return;
    }

    if (items.length === 0) {
      alert('Debe agregar al menos un producto');
      return;
    }

    const purchaseData = {
      ...formData,
      discount_amount: parseFloat(formData.discount_amount) || 0,
      shipping_cost: parseFloat(formData.shipping_cost) || 0,
      items: items.map(item => ({
        product_id: item.product_id,
        quantity: parseFloat(item.quantity),
        unit_cost: parseFloat(item.unit_cost),
        tax_rate: parseFloat(item.tax_rate),
        discount_percentage: parseFloat(item.discount_percentage)
      }))
    };

    try {
      if (isEditMode) {
        await updatePurchase(id, purchaseData);
        alert('Compra actualizada exitosamente');
        navigate(`/purchases/${id}`);
      } else {
        const result = await createPurchase(purchaseData);
        alert('Compra creada exitosamente');
        navigate(`/purchases/${result.id}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert(isEditMode ? 'Error al actualizar la compra' : 'Error al crear la compra');
    }
  };

  const totals = calculateTotals();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {isEditMode ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditMode ? 'Modifica los datos de la orden de compra' : 'Crea una nueva orden de compra a proveedor'}
          </p>
        </div>
        <button
          onClick={() => navigate('/purchases')}
          className="text-gray-600 hover:text-gray-800"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Información General */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Información General</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor <span className="text-red-500">*</span>
              </label>
              <select
                name="supplier_id"
                value={formData.supplier_id}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleccione un proveedor</option>
                {suppliers.filter(s => s.is_active).map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} {supplier.tax_id ? `- ${supplier.tax_id}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Compra <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Esperada de Entrega
              </label>
              <input
                type="date"
                name="expected_delivery_date"
                value={formData.expected_delivery_date}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método de Pago
              </label>
              <input
                type="text"
                name="payment_method"
                value={formData.payment_method}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Crédito 30 días"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Factura
              </label>
              <input
                type="text"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Factura del proveedor"
              />
            </div>
          </div>
        </div>

        {/* Agregar Producto */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Agregar Productos</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-2 relative product-search-container">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producto
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={productSearch}
                  onChange={handleProductSearch}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Buscar por SKU o nombre..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {currentItem.product_id && (
                  <button
                    type="button"
                    onClick={clearProductSelection}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Dropdown de productos */}
              {showProductDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="px-4 py-3 text-gray-500 text-sm">
                      No se encontraron productos
                    </div>
                  ) : (
                    <div>
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => selectProduct(product)}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                        </button>
                      ))}
                      {products.length > 50 && filteredProducts.length === 50 && (
                        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 text-center">
                          Mostrando 50 resultados. Refina tu búsqueda para ver más.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                name="quantity"
                value={currentItem.quantity}
                onChange={handleItemChange}
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Costo Unitario
              </label>
              <input
                type="number"
                name="unit_cost"
                value={currentItem.unit_cost}
                onChange={handleItemChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IVA (%)
              </label>
              <input
                type="number"
                name="tax_rate"
                value={currentItem.tax_rate}
                onChange={handleItemChange}
                min="0"
                max="100"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desc. (%)
              </label>
              <input
                type="number"
                name="discount_percentage"
                value={currentItem.discount_percentage}
                onChange={handleItemChange}
                min="0"
                max="100"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={addItem}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Productos */}
        {items.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Productos Agregados</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IVA</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Desc.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                        <div className="text-sm text-gray-500">{item.product_sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">{formatCurrency(item.unit_cost)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">{item.tax_rate}%</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">{item.discount_percentage}%</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(item.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Totales */}
        {items.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Información Adicional</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descuento Global
                    </label>
                    <input
                      type="number"
                      name="discount_amount"
                      value={formData.discount_amount}
                      onChange={handleFormChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo de Envío
                    </label>
                    <input
                      type="number"
                      name="shipping_cost"
                      value={formData.shipping_cost}
                      onChange={handleFormChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Resumen de Totales</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA:</span>
                    <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuento:</span>
                    <span className="font-medium text-red-600">-{formatCurrency(formData.discount_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Envío:</span>
                    <span className="font-medium">{formatCurrency(formData.shipping_cost)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-gray-900">Total:</span>
                      <span className="text-lg font-bold text-blue-600">{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notas */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Notas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas (Visibles)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Notas generales sobre la compra"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas Internas
              </label>
              <textarea
                name="internal_notes"
                value={formData.internal_notes}
                onChange={handleFormChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Notas internas (no visibles para el proveedor)"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isLoading || items.length === 0}
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            )}
            {isLoading 
              ? (isEditMode ? 'Actualizando...' : 'Creando...') 
              : (isEditMode ? 'Actualizar Compra' : 'Crear Compra')
            }
          </button>
        </div>
      </form>
      </div>
    </Layout>
  );
};

export default PurchaseFormPage;