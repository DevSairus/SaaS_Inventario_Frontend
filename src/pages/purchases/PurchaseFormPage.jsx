import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { usePurchasesStore } from '../../store/purchasesStore';
import { useSuppliersStore } from '../../store/suppliersStore';
import useProductsStore from '../../store/productsStore';
import Layout from '../../components/layout/Layout';
import NumericInput from '../../components/inputs/NumericInput';
import { retentionsAPI } from '../../api/retentions';
import {
  formatCurrency,
  toInteger,
  toNumber,
  calculateItemTotals,
  INPUT_CONFIG
} from '../../utils/formatters';
import toast from 'react-hot-toast';

const PurchaseFormPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  
  const { createPurchase, updatePurchase, getPurchaseById, isLoading } = usePurchasesStore();
  const { suppliers, fetchSuppliers } = useSuppliersStore();
  const { searchProducts } = useProductsStore();

  const [formData, setFormData] = useState({
    supplier_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    payment_method: '',
    payment_terms: '',
    due_date: '',
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

  // Retenciones: las calcula el motor del backend (perfil del tenant + del
  // proveedor + concepto de cada producto) vía /retentions/preview.
  // `retentionLines` en null = usar el cálculo automático (no se envía nada
  // y el backend recalcula igual al guardar); en cuanto el usuario edita una
  // base o quita una línea, queda materializado y se envía como manual.
  const [retentionPreview, setRetentionPreview] = useState({ lines: [], notes: [] });
  const [retentionLines, setRetentionLines] = useState(null);

  // Estados para búsqueda de productos
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Vista previa de retenciones (con debounce) cada vez que cambian el
  // proveedor o los ítems.
  const itemsKey = JSON.stringify(items.map(i => [i.product_id, i.quantity, i.unit_cost, i.discount_percentage, i.tax_rate]));
  useEffect(() => {
    if (!formData.supplier_id || items.length === 0) { setRetentionPreview({ lines: [], notes: [] }); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      retentionsAPI.preview({
        supplier_id: formData.supplier_id,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost, discount_percentage: i.discount_percentage, tax_rate: i.tax_rate })),
      })
        .then((res) => { if (!cancelled) setRetentionPreview({ lines: res.data?.lines || [], notes: res.data?.notes || [] }); })
        .catch(() => { if (!cancelled) setRetentionPreview({ lines: [], notes: ['No se pudo calcular la vista previa de retenciones.'] }); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.supplier_id, itemsKey]);

  // Cargar datos prellenados desde Stock Alerts
  useEffect(() => {
    if (!isEditMode && location.state?.prefilledData) {
      const { prefilledData } = location.state;
      
      // Prellenar proveedor
      if (prefilledData.supplier_id) {
        setFormData(prev => ({
          ...prev,
          supplier_id: prefilledData.supplier_id
        }));
      }

      // Prellenar producto como primer item (ya viene con name/sku en prefilledData)
      if (prefilledData.product && prefilledData.product.id) {
        const product = prefilledData.product;
        const quantity = toInteger(prefilledData.suggested_quantity, 1);
        const unit_cost = toNumber(product.last_price, 0);
        
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

      // Limpiar el state para evitar que se vuelva a cargar
      window.history.replaceState({}, document.title);
    }
  }, [location.state, isEditMode]);

  // Cargar datos de la compra en modo edición
  useEffect(() => {
    if (isEditMode && id) {
      loadPurchaseData();
    }
  }, [isEditMode, id]);

  const loadPurchaseData = async () => {
    if (!id) return;
    try {
      const purchase = await getPurchaseById(id);
      
      if (purchase.status !== 'draft') {
        toast('Solo se pueden editar compras en estado borrador');
        navigate(`/purchases/${id}`);
        return;
      }

      setFormData({
        supplier_id: purchase.supplier_id || '',
        purchase_date: purchase.purchase_date || '',
        expected_delivery_date: purchase.expected_delivery_date || '',
        payment_method: purchase.payment_method || '',
        payment_terms: purchase.payment_terms ?? '',
        due_date: purchase.due_date || '',
        invoice_number: purchase.invoice_number || '',
        reference: purchase.reference || '',
        notes: purchase.notes || '',
        internal_notes: purchase.internal_notes || '',
        discount_amount: toNumber(purchase.discount_amount, 0),
        shipping_cost: toNumber(purchase.shipping_cost, 0)
      });

      // Retenciones: si se habían ajustado a mano se restauran tal cual; si
      // no, se deja el cálculo automático (sigue a los ítems).
      if (Array.isArray(purchase.applied_retentions) && purchase.applied_retentions.some(l => l.manual)) {
        setRetentionLines(purchase.applied_retentions.map((l, idx) => ({
          key: `saved-${idx}`,
          retention_id: l.retention_id || null,
          concept_id: l.concept_id || null,
          code: l.code,
          concept: l.concept,
          rate: toNumber(l.rate, 0),
          account_id: l.account_id || null,
          base: toNumber(l.base, 0),
        })));
      }

      if (purchase.items && purchase.items.length > 0) {
        const loadedItems = purchase.items.map(item => {
          const totals = calculateItemTotals({
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            tax_rate: item.tax_rate || 19,
            discount_percentage: item.discount_percentage || 0
          });

          return {
            product_id: item.product_id,
            quantity: toInteger(item.quantity, 1),
            unit_cost: toNumber(item.unit_cost, 0),
            tax_rate: toNumber(item.tax_rate, 19),
            discount_percentage: toNumber(item.discount_percentage, 0),
            product_name: item.product?.name || 'Producto desconocido',
            product_sku: item.product?.sku || '',
            ...totals
          };
        });
        setItems(loadedItems);
      }
    } catch (error) {
      toast.error('Error al cargar los datos de la compra');
      navigate('/purchases');
    }
  };

  // Buscar productos en el servidor con debounce
  useEffect(() => {
    if (productSearch.trim() === '') {
      setFilteredProducts([]);
      return;
    }

    const debounce = setTimeout(async () => {
      const results = await searchProducts(productSearch.trim());
      setFilteredProducts(results.slice(0, 50));
    }, 300);

    return () => clearTimeout(debounce);
  }, [productSearch]);

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

    // Usar toInteger para campos numéricos
    if (name === 'discount_amount' || name === 'shipping_cost') {
      const numValue = toInteger(value, 0);
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else if (name === 'supplier_id') {
      // Autocompletar el plazo de pago con el que tenga configurado el proveedor
      // por defecto (el usuario lo puede cambiar libremente después).
      const selectedSupplier = suppliers.find(s => s.id === value);
      setRetentionLines(null);
      setFormData(prev => ({
        ...prev,
        supplier_id: value,
        payment_terms: selectedSupplier?.payment_terms ?? prev.payment_terms,
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    
    // Convertir a número según el campo
    let numValue = value;
    if (name === 'quantity') {
      numValue = toInteger(value, 1);
    } else if (name === 'unit_cost' || name === 'tax_rate' || name === 'discount_percentage') {
      numValue = toInteger(value, 0);
    }
    
    setCurrentItem(prev => ({ ...prev, [name]: numValue }));
  };

  const handleProductSearch = (e) => {
    setProductSearch(e.target.value);
    setShowProductDropdown(true);
  };

  const selectProduct = (product) => {
    setCurrentItem(prev => ({ 
      ...prev, 
      product_id: product.id,
      _product_name: product.name,
      _product_sku: product.sku
    }));
    setProductSearch(`${product.sku} - ${product.name}`);
    setShowProductDropdown(false);
  };

  const clearProductSelection = () => {
    setCurrentItem(prev => ({ ...prev, product_id: '', _product_name: '', _product_sku: '' }));
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const addItem = () => {
    if (!currentItem.product_id || !currentItem.quantity || !currentItem.unit_cost) {
      toast('Por favor complete todos los campos del producto');
      return;
    }

    const existingItemIndex = items.findIndex(item => item.product_id === currentItem.product_id);
    
    if (existingItemIndex >= 0) {
      toast('Este producto ya está en la lista');
      return;
    }

    const totals = calculateItemTotals(currentItem);

    const newItem = {
      ...currentItem,
      product_name: currentItem._product_name || '',
      product_sku: currentItem._product_sku || '',
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
    const subtotal = items.reduce((sum, item) => sum + toNumber(item.subtotal, 0), 0);
    const taxAmount = items.reduce((sum, item) => sum + toNumber(item.taxAmount, 0), 0);
    const discountAmount = toInteger(formData.discount_amount, 0);
    const shippingCost = toInteger(formData.shipping_cost, 0);
    const total = subtotal + taxAmount - discountAmount + shippingCost;

    return {
      subtotal,
      taxAmount,
      total
    };
  };

  const RET_NAMES = { '07': 'ReteFuente', '05': 'ReteIVA', '06': 'ReteICA' };
  const currentTotals = calculateTotals();

  const autoLines = useMemo(() => (retentionPreview.lines || []).map((l, idx) => ({
    key: `auto-${idx}-${l.code}-${l.concept_id || l.retention_id || ''}`,
    retention_id: l.retention_id || null,
    concept_id: l.concept_id || null,
    code: l.code,
    concept: l.concept,
    rate: toNumber(l.rate, 0),
    account_id: l.account_id || null,
    base: toNumber(l.base, 0),
  })), [retentionPreview]);
  const effectiveRetentionLines = retentionLines ?? autoLines;
  const isManualRetentions = retentionLines !== null;

  const retentionAmount = (l) => Math.round(toNumber(l.base, 0) * toNumber(l.rate, 0) / (l.code === '06' ? 1000 : 100) * 100) / 100;
  const totalRetentions = effectiveRetentionLines.reduce((sum, l) => sum + retentionAmount(l), 0);

  const updateRetentionLine = (key, field, value) => {
    setRetentionLines(effectiveRetentionLines.map(l => (l.key === key ? { ...l, [field]: value } : l)));
  };
  const removeRetentionLine = (key) => setRetentionLines(effectiveRetentionLines.filter(l => l.key !== key));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplier_id) {
      toast('Por favor seleccione un proveedor');
      return;
    }

    if (items.length === 0) {
      toast('Debe agregar al menos un producto');
      return;
    }

    const purchaseData = {
      ...formData,
      discount_amount: toInteger(formData.discount_amount, 0),
      shipping_cost: toInteger(formData.shipping_cost, 0),
      payment_terms: formData.payment_terms === '' ? null : parseInt(formData.payment_terms),
      due_date: formData.due_date === '' ? null : formData.due_date,
      items: items.map(item => ({
        product_id: item.product_id,
        quantity: toInteger(item.quantity),
        unit_cost: toInteger(item.unit_cost),
        tax_rate: toInteger(item.tax_rate),
        discount_percentage: toInteger(item.discount_percentage)
      }))
    };

    // Solo se envían las retenciones si se ajustaron a mano; si no, el
    // backend las recalcula con el motor (mismo resultado que la vista previa).
    if (isManualRetentions) {
      purchaseData.applied_retentions = effectiveRetentionLines.map(l => ({
        retention_id: l.retention_id,
        concept_id: l.concept_id,
        code: l.code,
        concept: l.concept,
        rate: toNumber(l.rate, 0),
        account_id: l.account_id,
        base: toNumber(l.base, 0),
      }));
    }

    try {
      if (isEditMode) {
        await updatePurchase(id, purchaseData);
        toast.success('Compra actualizada exitosamente');
        navigate(`/purchases/${id}`);
      } else {
        const result = await createPurchase(purchaseData);
        toast.success('Compra creada exitosamente');
        navigate(`/purchases/${result.id}`);
      }
    } catch (error) {
      toast.error(isEditMode ? 'Error al actualizar la compra' : 'Error al crear la compra');
    }
  };

  const totals = currentTotals;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">
            {isEditMode ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEditMode ? 'Modifica los datos de la orden de compra' : 'Crea una nueva orden de compra a proveedor'}
          </p>
        </div>
        <button
          onClick={() => navigate('/purchases')}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                Fecha de Compra
              </label>
              <input
                type="date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccione método de pago</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="check">Cheque</option>
                <option value="credit">Crédito</option>
              </select>
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
                placeholder="Ej: FAC-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plazo de Pago (días)
              </label>
              <input
                type="number"
                name="payment_terms"
                min="0"
                value={formData.payment_terms}
                onChange={handleFormChange}
                placeholder="0 = contado"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.payment_terms === '' || formData.payment_terms === null
                  ? 'Sin definir: queda pendiente sin fecha de vencimiento'
                  : parseInt(formData.payment_terms) === 0
                    ? 'Se registrará como pagada de contado'
                    : `Vence ${parseInt(formData.payment_terms)} días después de la compra`}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Opcional: si la escribes aquí, tiene prioridad sobre el plazo en días.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia
            </label>
            <input
              type="text"
              name="reference"
              value={formData.reference}
              onChange={handleFormChange}
              placeholder="Referencia interna opcional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
                  {productSearch.trim() === '' ? (
                    <div className="px-4 py-3 text-gray-400 text-sm">
                      Escribe al menos 2 caracteres para buscar...
                    </div>
                  ) : filteredProducts.length === 0 ? (
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
                      {filteredProducts.length === 50 && (
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
                {...INPUT_CONFIG.quantity}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Costo Unitario
              </label>
              <NumericInput
                name="unit_cost"
                value={currentItem.unit_cost}
                onChange={handleItemChange}
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
                {...INPUT_CONFIG.percentage}
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
                {...INPUT_CONFIG.percentage}
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
                    <NumericInput
                      name="discount_amount"
                      value={formData.discount_amount}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo de Envío
                    </label>
                    <NumericInput
                      name="shipping_cost"
                      value={formData.shipping_cost}
                      onChange={handleFormChange}
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
                  {totalRetentions > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-orange-600">
                        <span>Retenciones:</span>
                        <span>-{formatCurrency(totalRetentions)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-green-700">
                        <span>Neto a pagar al proveedor:</span>
                        <span>{formatCurrency(totals.total - totalRetentions)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Retenciones practicadas al proveedor */}
            {formData.supplier_id && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Retenciones</h3>
                {effectiveRetentionLines.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-2">Sin retenciones para esta compra.</p>
                ) : (
                  <div className="overflow-x-auto mb-2">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase">
                          <th className="text-left py-2 pr-2">Tipo</th>
                          <th className="text-left py-2 pr-2">Concepto</th>
                          <th className="text-right py-2 pr-2">Tarifa</th>
                          <th className="text-right py-2 pr-2">Base</th>
                          <th className="text-right py-2 pr-2">Valor</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {effectiveRetentionLines.map(l => (
                          <tr key={l.key} className="border-t border-gray-100">
                            <td className="py-2 pr-2 whitespace-nowrap">{RET_NAMES[l.code] || l.code}</td>
                            <td className="py-2 pr-2">{l.concept}</td>
                            <td className="py-2 pr-2 text-right whitespace-nowrap">{l.rate}{l.code === '06' ? '‰' : '%'}</td>
                            <td className="py-2 pr-2 text-right">
                              <NumericInput
                                value={l.base}
                                onChange={(e) => updateRetentionLine(l.key, 'base', toInteger(e.target.value, 0))}
                                className="w-36 px-2 py-1 text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </td>
                            <td className="py-2 pr-2 text-right font-medium text-orange-600 whitespace-nowrap">-{formatCurrency(retentionAmount(l))}</td>
                            <td className="py-2 text-right">
                              <button type="button" onClick={() => removeRetentionLine(l.key)} className="text-red-500 hover:text-red-700 text-xs px-2 py-1">
                                Quitar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Por qué aplica o no cada retención (motor del backend) */}
                {retentionPreview.notes?.length > 0 && (
                  <ul className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg p-2 space-y-0.5 mb-2">
                    {retentionPreview.notes.map((n, i) => <li key={i}>• {n}</li>)}
                  </ul>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>
                    {isManualRetentions
                      ? 'Ajustadas a mano: se guardarán tal como están.'
                      : 'Calculadas según tu perfil tributario, el del proveedor y el concepto de cada producto.'}
                  </span>
                  {isManualRetentions && (
                    <button type="button" onClick={() => setRetentionLines(null)} className="text-blue-600 hover:underline">
                      Restablecer cálculo automático
                    </button>
                  )}
                </div>
              </div>
            )}
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