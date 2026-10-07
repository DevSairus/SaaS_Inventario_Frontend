// frontend/src/pages/sales/SaleFormPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import useSalesStore from '../../store/salesStore';
import useBranchStore from '../../store/branchStore';
import useTenantStore from '../../store/tenantStore';
import useAuthStore from '../../store/authStore';
import DiagramMapEditor from '../../components/workshop/DiagramMapEditor';
import { brandsForType } from '../../constants/vehicleBrands';
import useCustomersStore from '../../store/customersStore';
import useProductsStore from '../../store/productsStore';
import { warehousesService } from '../../api/warehouses';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import NumericInput from '../../components/inputs/NumericInput';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Layout from '../../components/layout/Layout';
import DraftRecoveryBanner from '../../components/common/DraftRecoveryBanner';
import useFormDraft from '../../hooks/useFormDraft';
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
  ArrowLeft,
  Target,
  Layers
} from 'lucide-react';
import BarcodeScanner from '../../components/common/BarcodeScanner';
import { productsAPI } from '../../api/products';
import { equivalencesAPI } from '../../api/equivalences';
import { usersAPI } from '../../api/users';
import { getServerOrigin } from '../../utils/env';
import { 
  formatCurrency, 
  toInteger, 
  toNumber, 
  INPUT_CONFIG 
} from '../../utils/formatters';
import toast from 'react-hot-toast';
import ProductImageViewer from '../../components/products/ProductImageViewer';
import ComboPickerModal from '../../components/combos/ComboPickerModal';
import { groupDocumentItems, newComboGroupId } from '../../components/combos/comboUtils';
import {
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  PencilSquareIcon,
  LightBulbIcon,
  MagnifyingGlassIcon as SearchSvgIcon,
} from '@heroicons/react/24/outline';

// Descuento global de la venta/cotización -- independiente del descuento por
// línea (item.discount_percentage). El técnico no puede aplicarlo (mismo
// criterio que en la OT), así que se muestra solo lectura para ese rol.
function GlobalDiscountInput({ formData, setFormData, canDiscount }) {
  const hasValue = toInteger(formData.global_discount_value, 0) > 0;
  if (!canDiscount && !hasValue) return null;
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm text-gray-500 flex-shrink-0">Desc. global:</span>
      {canDiscount ? (
        <>
          <select
            value={formData.global_discount_type}
            onChange={e => setFormData(f => ({ ...f, global_discount_type: e.target.value }))}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fixed">$ Monto</option>
            <option value="percentage">% Porcentaje</option>
          </select>
          <NumericInput
            value={formData.global_discount_value}
            onChange={e => setFormData(f => ({ ...f, global_discount_value: e.target.value }))}
            placeholder={formData.global_discount_type === 'percentage' ? '%' : '$'}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </>
      ) : (
        <span className="text-sm font-medium text-gray-700">
          {formData.global_discount_type === 'percentage' ? `${formData.global_discount_value}%` : formatCurrency(formData.global_discount_value)}
        </span>
      )}
    </div>
  );
}

function SaleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // CRM — "Oportunidad → cotización en un clic" (Fase C.2): si llegamos
  // acá desde el botón "Generar cotización" del Pipeline, traemos el
  // customer_id y expected_value ya resueltos, y opportunity_id viaja en
  // el payload de creación para que el backend (sales.controller.create)
  // vincule quote_sale_id y avance la etapa a 'cotizado' automáticamente.
  const opportunityId = searchParams.get('opportunity_id');
  const opportunityCustomerId = searchParams.get('customer_id');
  const opportunityExpectedValue = searchParams.get('expected_value');
  // Con CRM activo, este mismo formulario se monta también en
  // /crm/quotes/new (ver App.jsx) para que cotizar sea un formulario propio
  // del CRM y no una opción dentro del flujo normal de Ventas -- ver
  // ConfirmSaleWithPaymentModal (hideQuoteOption) para la otra mitad del
  // cambio. Reusamos el mismo componente en vez de duplicarlo: en este modo
  // la venta nace directo como 'cotizacion', con o sin oportunidad de origen.
  const isCrmQuoteRoute = location.pathname.startsWith('/crm/quotes');
  const isCrmQuoteMode = isCrmQuoteRoute || Boolean(opportunityId);
  const { createSale, updateSale, fetchSaleById, currentSale, loading } = useSalesStore();
  const { features, enabledModules, fetchFeatures, taxConfig } = useTenantStore();
  // Porcentajes AIU por defecto del tenant (Configuración → Impuestos)
  const aiuDefaults = { admin_pct: 10, unforeseen_pct: 5, profit_pct: 5, iva_rate: 19, ...(taxConfig?.aiu || {}) };
  const toNumber = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const { user } = useAuthStore();
  // El descuento global mueve el total a cobrar -- el técnico no puede
  // aplicarlo (mismo criterio que en la OT).
  const canApplyDiscount = user?.role !== 'technician';
  // true = ocultar IVA en remisiones (el store aplica este default si no está configurado)
  const hideRemisionTax = features?.hide_remision_tax === true;
  const vehiclePlateEnabled = features?.vehicle_field_enabled !== false; // default true
  const technicianFieldEnabled = features?.technician_field_enabled === true; // default false
  const { customers, fetchCustomers } = useCustomersStore();
  const { searchProducts } = useProductsStore();
  const { branches, activeBranchId, fetchBranches } = useBranchStore();

  const isEditMode = Boolean(id);

  // Para "hoy": usa componentes LOCALES (evita el corrimiento de día que
  // causa toISOString(), que primero convierte a UTC).
  const toLocalDateString = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Para fechas YA guardadas en BD (sale_date se persiste como medianoche
  // UTC de la fecha elegida): hay que leerla con getters UTC, si no se
  // repite el corrimiento pero al revés (un día menos en zonas UTC-x).
  const toStoredDateString = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [warehouses, setWarehouses] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    warehouse_id: '',
    payment_method: 'efectivo',
    document_type: null,
    sale_date: toLocalDateString(new Date()),
    notes: '',
    vehicle_plate: '',
    vehicle_type: '',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_year: '',
    mileage: '',
    technician_id: '',
    global_discount_type: 'fixed',
    global_discount_value: 0,
    aiu_enabled: false,
    aiu_admin_pct: '',
    aiu_unforeseen_pct: '',
    aiu_profit_pct: '',
    aiu_object: '',
  });

  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const brandSuggestions = useMemo(() => {
    const options = brandsForType(formData.vehicle_type);
    const q = (formData.vehicle_brand ?? '').trim().toLowerCase();
    if (!q) return options;
    return options.filter(b => b.toLowerCase().includes(q));
  }, [formData.vehicle_type, formData.vehicle_brand]);

  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({
    full_name: '',
    tax_id: '',
    email: '',
    phone: ''
  });

  const [items, setItems] = useState([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showComboPicker, setShowComboPicker] = useState(false);
  const [stockAlternatives, setStockAlternatives] = useState([]);

  // Estados para búsqueda de clientes
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Clientes filtrados basados en el término de búsqueda (memoizado)
  const filteredCustomers = useMemo(() => {
    const term = customerSearchTerm.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(customer => {
      const fullName = `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.toLowerCase();
      const taxId = String(customer.tax_id || '').toLowerCase();
      return fullName.includes(term) || taxId.includes(term);
    });
  }, [customers, customerSearchTerm]);

  // Cargar bodegas usando el servicio de API configurado.
  // En creación, el combo solo muestra las bodegas (activas) de la sede
  // activa. En edición se mantiene la lista completa del tenant, para no
  // perder la referencia si la venta ya guardada usa una bodega de otra sede.
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const params = !isEditMode && activeBranchId ? { branch_id: activeBranchId } : {};
        const data = await warehousesService.getAll(params);
        const list = data.data || [];
        setWarehouses(list);
        // Si cambia la sede activa en creación y la bodega ya seleccionada no
        // pertenece a la nueva sede, se limpia para que la precarga automática
        // elija la de la nueva sede.
        if (!isEditMode) {
          setFormData(f => (f.warehouse_id && !list.some(w => w.id === f.warehouse_id))
            ? { ...f, warehouse_id: '' }
            : f);
        }
      } catch (e) {
        setWarehouses([]);
      }
    };
    loadWarehouses();
  }, [isEditMode, activeBranchId]);

  useEffect(() => {
    fetchBranches();
  }, []);

  // Bodega de la sede activa: se precarga automáticamente al crear una venta
  // nueva. No se aplica en edición (ya trae su propia warehouse_id) ni si el
  // usuario ya seleccionó una bodega manualmente.
  useEffect(() => {
    if (isEditMode) return;
    if (formData.warehouse_id) return;
    const activeBranch = branches.find(b => b.id === activeBranchId);
    const defaultWarehouseId = activeBranch?.warehouse?.id;
    if (defaultWarehouseId) {
      setFormData(f => (f.warehouse_id ? f : { ...f, warehouse_id: defaultWarehouseId }));
    }
  }, [branches, activeBranchId, isEditMode]);

  // Cargar técnicos si la feature está habilitada
  useEffect(() => {
    if (!technicianFieldEnabled) return;
    const loadTechnicians = async () => {
      try {
        const data = await usersAPI.getAll({ role: 'technician', is_active: true, limit: 100 });
        // El endpoint /users devuelve { success, data: { users: [...], totalPages, ... } }
        const list = Array.isArray(data?.data?.users) ? data.data.users
                   : Array.isArray(data?.data)        ? data.data
                   : Array.isArray(data)              ? data
                   : [];
        setTechnicians(list);
      } catch (e) {
        setTechnicians([]);
      }
    };
    loadTechnicians();
  }, [technicianFieldEnabled]);

  useEffect(() => {
    fetchCustomers();
    fetchFeatures();
  }, [fetchCustomers, fetchFeatures]);

  // Prefill al llegar desde "Generar cotización" en el Pipeline: cliente ya
  // resuelto (solo falta el nombre visible, que llega cuando carga el
  // listado de clientes) y una línea libre de partida con el valor
  // estimado, para que el asesor solo tenga que reemplazarla por los
  // productos/servicios reales antes de guardar.
  useEffect(() => {
    if (isEditMode || !opportunityId || !opportunityCustomerId) return;
    setFormData(prev => (prev.customer_id ? prev : { ...prev, customer_id: opportunityCustomerId }));
  }, [isEditMode, opportunityId, opportunityCustomerId]);

  useEffect(() => {
    if (isEditMode || !opportunityId || !opportunityCustomerId || customers.length === 0) return;
    const match = customers.find(c => c.id === opportunityCustomerId);
    if (match) {
      setCustomerSearchTerm(match.business_name || `${match.first_name || ''} ${match.last_name || ''}`.trim());
    }
  }, [customers, isEditMode, opportunityId, opportunityCustomerId]);

  useEffect(() => {
    if (isEditMode || !opportunityId || items.length > 0) return;
    const estimated = toInteger(opportunityExpectedValue, 0);
    if (estimated <= 0) return;
    setItems([calculateItemTotals({
      item_type: 'free_line',
      product_id: null,
      product_name: 'Estimado de la oportunidad — reemplaza esta línea por los productos/servicios reales',
      product_sku: null,
      quantity: 1,
      unit_price: estimated,
      discount_percentage: 0,
      tax_percentage: 0,
      price_includes_tax: false,
      has_tax: false,
    })]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, opportunityId, opportunityExpectedValue]);

  useEffect(() => {
    const searchProductsDebounced = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const vehicleParams = {};
        if (formData.vehicle_brand && formData.vehicle_model) {
          vehicleParams.applies_to_brand = formData.vehicle_brand;
          vehicleParams.applies_to_line = formData.vehicle_model;
          if (formData.vehicle_year) vehicleParams.applies_to_year = formData.vehicle_year;
        }
        // Al editar una venta existente, que no se reste a sí misma del
        // disponible real (cantidad en trámite).
        if (isEditMode && id) {
          vehicleParams.exclude_sale_id = id;
        }
        let results = await searchProducts(searchTerm, vehicleParams);

        // Verificar equivalentes para productos con stock 0
        const zeroStockIds = results.filter(p => parseFloat(p.current_stock || 0) <= 0 && p.track_inventory && p.product_type !== 'service').map(p => p.id);
        if (zeroStockIds.length > 0) {
          try {
            const eqRes = await equivalencesAPI.batchCheckEquivalents(zeroStockIds);
            if (eqRes?.success) {
              results = results.map(p => ({
                ...p,
                _equivalentsWithStock: eqRes.data[p.id] || 0
              }));
            }
          } catch { /* silencioso */ }
        }

        setSearchResults(results);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchProductsDebounced, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchProducts, formData.vehicle_brand, formData.vehicle_model, formData.vehicle_year]);

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
        document_type: currentSale.document_type || null,
        sale_date: currentSale.sale_date 
          ? toStoredDateString(currentSale.sale_date) 
          : toLocalDateString(new Date()),
        notes: currentSale.notes || '',
        vehicle_plate: currentSale.vehicle_plate || '',
        vehicle_type: currentSale.vehicle_type || '',
        vehicle_brand: currentSale.vehicle_brand || '',
        vehicle_model: currentSale.vehicle_model || '',
        vehicle_year: currentSale.vehicle_year || '',
        mileage: currentSale.mileage || '',
        technician_id: currentSale.technician_id || '',
        global_discount_type: currentSale.global_discount_type || 'fixed',
        global_discount_value: currentSale.global_discount_value || 0,
        aiu_enabled: !!currentSale.aiu_enabled,
        aiu_admin_pct: currentSale.aiu_admin_pct ?? '',
        aiu_unforeseen_pct: currentSale.aiu_unforeseen_pct ?? '',
        aiu_profit_pct: currentSale.aiu_profit_pct ?? '',
        aiu_object: currentSale.aiu_object || '',
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
          total: toInteger(item.total, 0),
          technician_id: item.technician_id || '',
          combo_id: item.combo_id || null,
          combo_group_id: item.combo_group_id || null,
          combo_name: item.combo_name || null,
          combo_quantity: item.combo_quantity != null ? Number(item.combo_quantity) : null,
          combo_show_breakdown: item.combo_show_breakdown,
        }));
        setItems(loadedItems);
      }
    }
  }, [isEditMode, currentSale]);

  // ── Borrador local (apagón / caída de internet) ──────────────────────
  // Se guarda en el equipo mientras se arma la venta o cotización y se
  // ofrece recuperarlo al volver a abrir el mismo formulario -- ver
  // hooks/useFormDraft.js.
  const draftScope = isEditMode
    ? `sale:edit:${id}`
    : isCrmQuoteMode ? `crmquote:new${opportunityId ? `:${opportunityId}` : ''}` : 'sale:new';
  const draftData = useMemo(
    () => ({ formData, items, customerSearchTerm, showQuickCustomer, quickCustomer }),
    [formData, items, customerSearchTerm, showQuickCustomer, quickCustomer]
  );
  const saleUpdatedAt = currentSale?.id === id ? (currentSale.updated_at || currentSale.updatedAt || null) : null;
  const draft = useFormDraft({
    scope: draftScope,
    data: draftData,
    meta: { baseUpdatedAt: saleUpdatedAt },
    // En edición, recién cuando cargó la venta (si no, la carga misma
    // contaría como cambio del usuario).
    enabled: !isEditMode || currentSale?.id === id,
    isEmpty: (d) => !d.items?.length && !d.formData?.customer_id && !d.formData?.notes?.trim()
      && !d.formData?.vehicle_plate && !d.quickCustomer?.full_name,
  });
  const [draftWarnings, setDraftWarnings] = useState([]);
  // En edición, el aviso espera a que cargue la venta: si no, la carga
  // pisaría lo recuperado.
  const draftPending = isEditMode && currentSale?.id !== id ? null : draft.pending;

  // Al recuperar: el borrador puede tener horas o días -- se revisa contra
  // el catálogo actual (producto inactivo, stock insuficiente, producto
  // modificado después del borrador, p.ej. cambio de precio).
  const revalidateDraftItems = async (draftItems, savedAt) => {
    const qty = {};
    const names = {};
    draftItems.forEach((it) => {
      if (!it.product_id || it.item_type === 'free_line') return;
      qty[it.product_id] = (qty[it.product_id] || 0) + toInteger(it.quantity, 0);
      names[it.product_id] = it.product_name;
    });
    const ids = Object.keys(qty).slice(0, 40);
    if (!ids.length) return;
    const warnings = [];
    await Promise.all(ids.map(async (pid) => {
      try {
        const res = await productsAPI.getById(pid);
        const p = res?.data;
        if (!p || p.is_active === false) {
          warnings.push(`${names[pid]}: ya no está activo en el catálogo.`);
          return;
        }
        const stock = parseFloat(p.current_stock || 0);
        if (p.track_inventory && p.product_type !== 'service' && !p.allow_negative_stock && stock < qty[pid]) {
          warnings.push(`${names[pid]}: stock actual ${stock}, el borrador tiene ${qty[pid]}.`);
        }
        const updated = new Date(p.updated_at || p.updatedAt || 0).getTime();
        if (updated > savedAt) {
          warnings.push(`${names[pid]}: el producto se modificó después del borrador — revisa el precio.`);
        }
      } catch (e) {
        if (e?.response?.status === 404) warnings.push(`${names[pid]}: ya no existe en el catálogo.`);
      }
    }));
    setDraftWarnings(warnings);
  };

  const applyDraftData = (d, savedAt) => {
    if (d.formData) setFormData((prev) => ({ ...prev, ...d.formData }));
    setItems(Array.isArray(d.items) ? d.items : []);
    setCustomerSearchTerm(d.customerSearchTerm || '');
    setShowQuickCustomer(!!d.showQuickCustomer);
    if (d.quickCustomer) setQuickCustomer(d.quickCustomer);
    revalidateDraftItems(Array.isArray(d.items) ? d.items : [], savedAt || Date.now());
  };

  const handleRestoreDraft = () => {
    const savedAt = draft.pending?.savedAt;
    const d = draft.restore();
    if (!d) return;
    applyDraftData(d, savedAt);
    toast.success('Borrador recuperado');
  };

  // Otro equipo guardó una versión más reciente mientras se trabajaba acá.
  const handleUseRemoteDraft = () => {
    const savedAt = draft.conflict?.savedAt;
    const d = draft.resolveConflict(true);
    if (!d) return;
    applyDraftData(d, savedAt);
    toast.success('Se cargó la versión del otro equipo');
  };

  const summarizeDraft = (d) => {
    if (!d) return '';
    const n = d.items?.length || 0;
    const customer = d.customerSearchTerm || d.quickCustomer?.full_name || '';
    return [`${n} ítem${n === 1 ? '' : 's'}`, customer].filter(Boolean).join(' · ');
  };
  const draftSummary = summarizeDraft(draftPending?.data);
  const draftWarning = isEditMode && draftPending?.meta?.baseUpdatedAt && saleUpdatedAt
    && draftPending.meta.baseUpdatedAt !== saleUpdatedAt
    ? 'Esta venta se modificó después del borrador; al recuperarlo se reemplazan esos cambios.'
    : null;

  // Recalcular totales cuando cambie el tipo de documento (afecta si se aplica IVA o no)
  useEffect(() => {
    if (items.length > 0) {
      setItems(items.map(item => calculateItemTotals(item)));
    }
  }, [formData.document_type, formData.aiu_enabled]);

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

  const handleAddItem = async (product) => {
    // Verificar stock antes de agregar al carrito
    const stock = parseFloat(product.current_stock || 0);
    // Producto configurado para venderse con stock en 0: solo se avisa.
    if (stock <= 0 && product.track_inventory && product.product_type !== 'service' && product.allow_negative_stock) {
      toast(`${product.name} no tiene stock; se permite venderlo en negativo.`, { icon: '⚠️' });
    } else if (stock <= 0 && product.track_inventory && product.product_type !== 'service') {
      // Buscar equivalentes con stock
      try {
        const res = await equivalencesAPI.getByProductId(product.id);
        const groups = res?.data || [];
        const alts = [];
        const seen = new Set();
        for (const group of groups) {
          for (const member of (group.members || [])) {
            if (member.product_id === product.id) continue;
            if (seen.has(member.product_id)) continue;
            // Disponible real (stock menos cantidad en trámite) cuando el backend
            // lo expone; si no, cae a available_stock/current_stock como antes.
            const memberStock = parseFloat(member.available_real ?? member.available_stock ?? member.current_stock ?? 0);
            if (memberStock > 0) {
              seen.add(member.product_id);
              alts.push({
                product_id: member.product_id,
                sku: member.sku,
                name: member.name,
                available_stock: memberStock,
                sale_price: member.sale_price,
                base_price: member.sale_price
              });
            }
          }
        }
        if (alts.length > 0) {
          setStockAlternatives(alts);
          toast.error(`Sin stock de ${product.name}. Se encontraron ${alts.length} equivalente(s) disponible(s).`);
          setShowProductSearch(false);
          setSearchTerm('');
          return;
        }
      } catch (e) {
        // Si falla la búsqueda de equivalentes, continuar con el flujo normal
      }
      toast.error(`Sin stock de ${product.name} y no hay equivalentes disponibles.`);
      return;
    }

    const existingIndex = items.findIndex(item => item.product_id === product.id && !item.combo_group_id);

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
        unit_price: toInteger(product.base_price, 0),
        discount_percentage: 0,
        tax_percentage: taxPct,
        price_includes_tax: product.price_includes_tax || false,
        has_tax: product.has_tax !== false,
        technician_id: '',
      };
      setItems([...items, calculateItemTotals(newItem)]);
    }
    setStockAlternatives([]);
    setShowProductSearch(false);
    setSearchTerm('');
  };

  const handleBarcodeScan = async (code) => {
    setShowScanner(false);
    try {
      const response = await productsAPI.getByBarcode(code);
      if (response?.data) {
        await handleAddItem(response.data);

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

    if (formData.aiu_enabled) {
      // Factura AIU: la línea es costo directo sin IVA (el IVA va solo sobre
      // la Utilidad). Si el precio traía IVA incluido, se le extrae.
      tax = 0;
      total = hasTax && priceIncludesTax
        ? taxBase - Math.round((taxBase * taxPercentage) / (100 + taxPercentage))
        : taxBase;
    } else if (!hasTax) {
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

  // Combo -> sus componentes como líneas normales con el mismo combo_group_id
  // (ver components/combos/ComboPickerModal.jsx y utils/comboLines.js del backend).
  const handleAddCombo = ({ combo, quantity, show_breakdown, items: comboItems }) => {
    const groupId = newComboGroupId();
    const newLines = comboItems.map(({ product, quantity: qty, unit_price }) => calculateItemTotals({
      item_type: product.product_type === 'service' ? 'service' : 'product',
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      quantity: qty,
      unit_price: toInteger(unit_price, 0),
      discount_percentage: 0,
      tax_percentage: product.has_tax === false ? 0 : (product.tax_percentage || 19),
      price_includes_tax: product.price_includes_tax || false,
      has_tax: product.has_tax !== false,
      technician_id: '',
      combo_id: combo.id,
      combo_group_id: groupId,
      combo_name: combo.name,
      combo_quantity: quantity,
      combo_show_breakdown: show_breakdown,
    }));
    setItems(prev => [...prev, ...newLines]);
    setShowComboPicker(false);

    const short = comboItems.filter(({ product, quantity: qty }) =>
      product.track_inventory && product.product_type !== 'service' && parseFloat(product.current_stock || 0) < qty);
    if (short.length > 0) {
      toast(`Stock insuficiente de: ${short.map(s => s.product.name).join(', ')}`, { icon: '⚠️' });
    }
  };

  const handleRemoveCombo = (groupId) => {
    setItems(prev => prev.filter(item => item.combo_group_id !== groupId));
  };

  const handleComboBreakdownChange = (groupId, showBreakdown) => {
    setItems(prev => prev.map(item => (item.combo_group_id === groupId
      ? { ...item, combo_show_breakdown: showBreakdown }
      : item)));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + toInteger(item.subtotal, 0), 0);
    const discount = items.reduce((sum, item) => sum + toInteger(item.discount_amount, 0), 0);
    const tax = items.reduce((sum, item) => sum + toInteger(item.tax_amount, 0), 0);
    const total = items.reduce((sum, item) => sum + toInteger(item.total, 0), 0);
    // Descuento global -- preview del lado del cliente; el backend recalcula
    // y persiste el valor real al guardar (ver resolveGlobalDiscount).
    const globalDiscountValue = toInteger(formData.global_discount_value, 0);
    const globalDiscount = globalDiscountValue <= 0 ? 0
      : formData.global_discount_type === 'percentage'
        ? Math.round(total * Math.min(globalDiscountValue, 100) / 100)
        : Math.min(globalDiscountValue, total);
    if (formData.aiu_enabled) {
      // Vista previa AIU; el backend recalcula al guardar.
      const direct = total;
      const admin = Math.round(direct * toNumber(formData.aiu_admin_pct) / 100);
      const unforeseen = Math.round(direct * toNumber(formData.aiu_unforeseen_pct) / 100);
      const profit = Math.round(direct * toNumber(formData.aiu_profit_pct) / 100);
      const aiuTax = Math.round(profit * toNumber(aiuDefaults.iva_rate) / 100);
      const aiuSubtotal = direct + admin + unforeseen + profit;
      return {
        subtotal, discount, tax: aiuTax, total: aiuSubtotal + aiuTax, globalDiscount: 0, grandTotal: aiuSubtotal + aiuTax,
        aiu: { direct, admin, unforeseen, profit, subtotal: aiuSubtotal },
      };
    }
    const grandTotal = total - globalDiscount;
    return { subtotal, discount, tax, total, globalDiscount, grandTotal };
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (items.length === 0) {
      toast('Debe agregar al menos un producto');
      return;
    }
    const hasTrackedProducts = items.some(
      item => item.item_type !== 'service' && item.item_type !== 'free_line' && item.product_id
    );
    if (hasTrackedProducts && !formData.warehouse_id) {
      toast('Esta venta tiene productos: selecciona una bodega para poder confirmarla después');
      return;
    }
    await submitSale(formData.document_type);
  };

  const submitSale = async (docType) => {
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
          tax_percentage: toInteger(item.tax_percentage),
          technician_id: item.technician_id || undefined,
          ...(item.combo_group_id ? {
            combo_id: item.combo_id || null,
            combo_group_id: item.combo_group_id,
            combo_name: item.combo_name,
            combo_quantity: item.combo_quantity,
            combo_show_breakdown: item.combo_show_breakdown !== false,
          } : {}),
        }))
      };

      // El document_type NO se envía al crear — se elige al confirmar la
      // venta. Excepción: en modo cotización de CRM (con o sin oportunidad
      // de origen) nace directo como 'cotizacion' -- si además viene de una
      // oportunidad, el backend necesita opportunity_id en este mismo
      // request para vincular quote_sale_id y mover la etapa a 'cotizado'.
      if (!isEditMode) {
        if (isCrmQuoteMode) {
          saleData.document_type = 'cotizacion';
          if (opportunityId) saleData.opportunity_id = opportunityId;
        } else {
          delete saleData.document_type;
        }
      }

      if (showQuickCustomer && quickCustomer.full_name) {
        saleData.customer_data = quickCustomer;
        delete saleData.customer_id;
      }

      if (isEditMode) {
        await updateSale(id, saleData);
        draft.clear();
        toast.success('Venta actualizada exitosamente');
        navigate(`/sales/${id}`);
      } else {
        const result = await createSale(saleData);
        draft.clear();
        if (opportunityId) {
          toast.success('Cotización creada y vinculada a la oportunidad');
        } else if (isCrmQuoteMode) {
          toast.success('Cotización creada exitosamente');
        } else {
          const docLabel = docType === 'factura' ? 'Factura' : docType === 'cotizacion' ? 'Cotización' : 'Remisión';
          toast.success(`${docLabel} creada exitosamente`);
        }
        navigate(`/sales/${result.id}`);
      }
    } catch (error) {
      toast.error(error.message || 'Error al guardar la venta');
    }
  };

  // Fila de un ítem de la tabla. inCombo = componente de un combo (se
  // edita igual que cualquier línea; el combo solo agrupa).
  const renderItemRow = (item, index, inCombo = false) => (
    <tr key={index} className={`hover:bg-gray-50 transition-colors ${inCombo ? 'bg-emerald-50/30' : ''}`}>
      <td className={`py-4 px-4 ${inCombo ? 'pl-8 border-l-4 border-emerald-300' : ''}`}>
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
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full"><WrenchScrewdriverIcon className="w-3 h-3" /> Servicio</span>
          )}
          {item.item_type === 'free_line' && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full"><PencilSquareIcon className="w-3 h-3" /> Línea libre · No mueve inventario</span>
          )}
          {item.item_type !== 'free_line' && item.product_sku && (
            <span className="text-sm text-gray-500">SKU: {item.product_sku}</span>
          )}
        </div>
        {item.price_includes_tax && (
          <div className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1 font-medium"><LightBulbIcon className="w-3 h-3" /> Precio incluye IVA</div>
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
        <NumericInput
          value={item.unit_price}
          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
          className="text-right w-full input"
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
          {formatCurrency(item.total)}
        </span>
      </td>
      {technicians.length > 0 && (
        <td className="py-4 px-4">
          <select
            value={item.technician_id || ''}
            onChange={(e) => {
              const updated = [...items];
              updated[index] = { ...updated[index], technician_id: e.target.value };
              setItems(updated);
            }}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="">— ninguno —</option>
            {technicians.map(t => (
              <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
            ))}
          </select>
        </td>
      )}
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
  );

  // Columnas antes de "Total": producto, cantidad, precio, desc. y (si se ve) IVA
  const columnsBeforeTotal = 4 + (!(hideRemisionTax && formData.document_type === 'remision') ? 1 : 0);

  // Encabezado de un combo + sus componentes. show_breakdown solo cambia cómo
  // se ve el combo en el PDF / factura DIAN; aquí siempre se editan las líneas.
  const renderComboGroup = (entry) => [
    <tr key={`combo-${entry.groupId}`} className="bg-emerald-50 border-t-2 border-emerald-200">
      <td colSpan={columnsBeforeTotal - 1} className="py-2 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-gray-900">{entry.name}</span>
          {entry.quantity !== 1 && <span className="text-xs text-gray-500">× {entry.quantity}</span>}
          <select
            value={entry.showBreakdown ? 'breakdown' : 'summary'}
            onChange={(e) => handleComboBreakdownChange(entry.groupId, e.target.value === 'breakdown')}
            className="text-xs border border-emerald-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            title="Cómo se muestra el combo en el documento impreso y en la factura electrónica"
          >
            <option value="breakdown">Documento: desglosado</option>
            <option value="summary">Documento: solo nombre y total</option>
          </select>
        </div>
      </td>
      <td className="py-2 px-4 text-right text-xs text-gray-500">Total combo</td>
      <td className="py-2 px-4 text-right font-semibold text-gray-900">{formatCurrency(entry.total)}</td>
      {technicians.length > 0 && <td />}
      <td className="py-2 px-4">
        <button
          type="button"
          onClick={() => handleRemoveCombo(entry.groupId)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Quitar combo completo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>,
    ...entry.rows.map(({ item, index }) => renderItemRow(item, index, true)),
  ];

  const totals = calculateTotals();

  return (
    <Layout>
      <div className="space-y-4 max-w-7xl mx-auto" {...draft.bind}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(isCrmQuoteRoute ? '/crm/pipeline' : '/sales')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                {isEditMode
                  ? 'Editar Venta'
                  : opportunityId
                    ? 'Cotización desde el Pipeline'
                    : isCrmQuoteMode
                      ? 'Nueva Cotización'
                      : 'Nueva Venta'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {isEditMode
                  ? 'Modifica los datos de la venta'
                  : opportunityId
                    ? 'Se vinculará automáticamente a la oportunidad al guardar'
                    : isCrmQuoteMode
                      ? 'Se guardará como cotización -- queda visible en Ventas para facturarla o convertirla luego'
                      : 'Crea una nueva venta, factura o cotización'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => { draft.clear(); navigate(isCrmQuoteRoute ? '/crm/pipeline' : '/sales'); }}>
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

        <DraftRecoveryBanner
          pending={draftPending}
          summary={draftSummary}
          warning={draftWarning}
          onRestore={handleRestoreDraft}
          onDiscard={draft.discard}
        />
        <DraftRecoveryBanner
          conflict
          pending={draft.conflict}
          summary={summarizeDraft(draft.conflict?.data)}
          onRestore={handleUseRemoteDraft}
          onDiscard={() => draft.resolveConflict(false)}
        />

        {draftWarnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">Revisa el borrador recuperado:</p>
                <ul className="mt-1 list-disc pl-5 space-y-0.5">
                  {draftWarnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </div>
              <button type="button" onClick={() => setDraftWarnings([])} className="text-amber-700 hover:text-amber-900" title="Cerrar">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {!isEditMode && opportunityId && (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-accent/[0.05] border border-accent/15 rounded-xl text-sm text-gray-700">
            <Target className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <p>
              Estás generando la cotización de una oportunidad del <strong>Pipeline</strong>. Cliente y valor estimado
              ya quedaron precargados — reemplaza la línea de estimado por los productos o servicios reales antes de
              guardar. Al guardar, la oportunidad pasará a la etapa <strong>Cotizado</strong> automáticamente.
            </p>
          </div>
        )}

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
                  {/* Tipo de Documento — solo visible en modo edición */}
                  {isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Documento
                    </label>
                    <select
                      name="document_type"
                      value={formData.document_type}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="remision">Remisión</option>
                      <option value="factura">Factura</option>
                      {/* Con CRM activo, cotizar es un formulario propio del CRM
                          (ver isCrmQuoteMode más arriba) -- se deja la opción
                          solo si esta venta YA es una cotización, para no
                          dejar una edición sin poder guardar su tipo actual. */}
                      {(!enabledModules?.includes('crm') || currentSale?.document_type === 'cotizacion') && (
                        <option value="cotizacion">Cotización</option>
                      )}
                    </select>
                  </div>
                  )}

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

                {/* Placa del Vehículo y Kilometraje — controlado por configuración del tenant */}
                {vehiclePlateEnabled && (
                <>
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

                {/* Tipo de vehículo — mismo gate que la placa. NO se puede
                    condicionar a document_type==='cotizacion' porque una
                    venta nueva siempre nace con document_type=null (se
                    decide hasta "Confirmar"); mostrarlo aquí es gratis si
                    luego no se usa. */}
                {vehiclePlateEnabled && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de vehículo
                      <span className="text-gray-400 text-xs ml-2">(para poder agregar diagrama de intervención si es cotización)</span>
                    </label>
                    <select
                      name="vehicle_type"
                      value={formData.vehicle_type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="">Sin especificar</option>
                      <option value="automovil">Automóvil</option>
                      <option value="camioneta">Camioneta</option>
                      <option value="motocicleta">Motocicleta</option>
                      <option value="camion">Camión</option>
                      <option value="otro">Otro</option>
                    </select>

                    {/* El diagrama solo puede vivir en una cotización que YA
                        existe (las marcas se guardan contra /sales/:id/...),
                        así que en "Nueva Venta" solo se puede avisar; en
                        "Editar Venta" (currentSale.id ya existe) se embebe
                        directo aquí, igual que pidió el usuario. */}
                    {formData.vehicle_type && enabledModules?.includes('workshop') && (
                      isEditMode && currentSale ? (
                        <div className="mt-3">
                          <DiagramMapEditor
                            entityType="sale"
                            entityId={currentSale.id}
                            vehicleType={formData.vehicle_type}
                            disabled={currentSale.status !== 'draft'}
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
                          Guarda la cotización primero — el diagrama de intervención aparecerá en la página de la cotización justo después de guardarla.
                        </p>
                      )
                    )}
                  </div>
                )}

                {/* Marca / Línea / Año del vehículo */}
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Marca</label>
                    <input
                      type="text"
                      name="vehicle_brand"
                      value={formData.vehicle_brand}
                      onChange={handleInputChange}
                      onFocus={() => setShowBrandDropdown(true)}
                      onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
                      autoComplete="off"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                      placeholder="Chevrolet"
                    />
                    {showBrandDropdown && brandSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {brandSuggestions.map(b => (
                          <button
                            key={b}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData(prev => ({ ...prev, vehicle_brand: b }));
                              setShowBrandDropdown(false);
                            }}
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50"
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    )}
                    {showBrandDropdown && formData.vehicle_brand?.trim() && brandSuggestions.length === 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
                        <p className="text-xs text-gray-400">
                          Sin sugerencias — puedes escribir la marca directamente
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Línea</label>
                    <input
                      type="text"
                      name="vehicle_model"
                      value={formData.vehicle_model}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                      placeholder="Aveo"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
                    <input
                      type="number"
                      name="vehicle_year"
                      value={formData.vehicle_year}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                      placeholder="2015"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Marca y línea se usan para filtrar productos compatibles al buscar
                </p>

                {/* Kilometraje */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilometraje
                    <span className="text-gray-400 text-xs ml-2">(Opcional)</span>
                  </label>
                  <NumericInput
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Ej: 85.000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Kilometraje del vehículo al momento del servicio
                  </p>
                </div>
                </>
                )}

                {/* Técnico — controlado por configuración del tenant */}
                {technicianFieldEnabled && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <WrenchScrewdriverIcon className="w-4 h-4 inline mr-1" />
                    Técnico Asignado
                    <span className="text-gray-400 text-xs ml-2">(Opcional)</span>
                  </label>
                  <select
                    name="technician_id"
                    value={formData.technician_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Sin técnico asignado</option>
                    {Array.isArray(technicians) && technicians.map(tech => (
                      <option key={tech.id} value={tech.id}>
                        {tech.first_name} {tech.last_name}
                      </option>
                    ))}
                  </select>
                  {technicianFieldEnabled && Array.isArray(technicians) && technicians.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No hay técnicos activos. Crea usuarios con rol &quot;Técnico&quot; en el módulo de usuarios.
                    </p>
                  )}
                </div>
                )}

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
                      onClick={() => setShowComboPicker(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                      title="Agregar un combo de productos/servicios"
                    >
                      <Layers className="w-4 h-4" />
                      Combo
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

                {/* Alternativas de equivalencia cuando no hay stock */}
                {stockAlternatives.length > 0 && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-amber-800">
                        Equivalentes disponibles ({stockAlternatives.length})
                      </p>
                      <button onClick={() => setStockAlternatives([])} className="text-amber-600 hover:text-amber-800 text-xs">✕ Cerrar</button>
                    </div>
                    <div className="space-y-1.5">
                      {stockAlternatives.map(alt => (
                        <button
                          key={alt.product_id}
                          onClick={() => {
                            handleAddItem({
                              id: alt.product_id,
                              sku: alt.sku,
                              name: alt.name,
                              current_stock: alt.available_stock,
                              base_price: alt.sale_price || alt.base_price,
                              has_tax: true,
                              tax_percentage: 19,
                              product_type: 'simple',
                              track_inventory: true
                            });
                            setStockAlternatives([]);
                          }}
                          className="w-full flex items-center justify-between p-2 bg-white border border-amber-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-left"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{alt.name}</p>
                            <p className="text-xs text-gray-500">{alt.sku} · Stock: <span className="text-green-600 font-medium">{alt.available_stock}</span></p>
                          </div>
                          <span className="text-xs font-medium text-blue-600">Agregar al carrito</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                          {technicians.length > 0 && (
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">
                              Técnico
                            </th>
                          )}
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {groupDocumentItems(items).map(entry => (entry.type === 'line'
                          ? renderItemRow(entry.item, entry.index)
                          : renderComboGroup(entry)))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>

            {/* Aviso líneas libres - solo formulario, no aparece en PDF */}
            {items.some(i => i.item_type === 'free_line') && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Las líneas libres no afectan el inventario</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {items.filter(i => i.item_type === 'free_line').length === 1
                      ? 'Tienes 1 línea libre en esta venta. '
                      : `Tienes ${items.filter(i => i.item_type === 'free_line').length} líneas libres en esta venta. `}
                    Si vendiste un repuesto físico, usa <strong>Agregar Producto</strong> para que el stock se descuente automáticamente.
                  </p>
                </div>
              </div>
            )}

            {/* Factura AIU -- IVA solo sobre la Utilidad (ver backend services/sales/aiu.service.js) */}
            {/* Solo si el tenant habilitó AIU, o si la venta ya es AIU (editarla). */}
            {items.length > 0 && formData.document_type !== 'remision' && (aiuDefaults.enabled || formData.aiu_enabled) && (
              <Card className="mb-6">
                <div className="p-6 space-y-4">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={!!formData.aiu_enabled}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setFormData(f => ({
                          ...f,
                          aiu_enabled: on,
                          aiu_admin_pct: f.aiu_admin_pct !== '' ? f.aiu_admin_pct : aiuDefaults.admin_pct,
                          aiu_unforeseen_pct: f.aiu_unforeseen_pct !== '' ? f.aiu_unforeseen_pct : aiuDefaults.unforeseen_pct,
                          aiu_profit_pct: f.aiu_profit_pct !== '' ? f.aiu_profit_pct : aiuDefaults.profit_pct,
                          ...(on ? { global_discount_value: 0 } : {}),
                        }));
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">Factura AIU</span> (Administración, Imprevistos, Utilidad)
                      <span className="block text-xs text-gray-500">Las líneas son el costo directo; el IVA se liquida solo sobre la Utilidad.</span>
                    </span>
                  </label>
                  {formData.aiu_enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { key: 'aiu_admin_pct', label: 'Administración %' },
                        { key: 'aiu_unforeseen_pct', label: 'Imprevistos %' },
                        { key: 'aiu_profit_pct', label: 'Utilidad %' },
                      ].map(f => (
                        <label key={f.key} className="block">
                          <span className="text-xs text-gray-600">{f.label}</span>
                          <input
                            type="number" min="0" max="100" step="0.01"
                            value={formData[f.key]}
                            onChange={(e) => setFormData(d => ({ ...d, [f.key]: e.target.value }))}
                            className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </label>
                      ))}
                      <label className="block sm:col-span-3">
                        <span className="text-xs text-gray-600">Contrato de servicios AIU por concepto de</span>
                        <input
                          type="text"
                          value={formData.aiu_object}
                          onChange={(e) => setFormData(d => ({ ...d, aiu_object: e.target.value }))}
                          placeholder="Ej: mantenimiento preventivo de la flota"
                          className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </Card>
            )}

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
                                -{formatCurrency(totals.discount)}
                              </span>
                            </div>
                          )}
                          {totals.globalDiscount > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>Descuento global:</span>
                              <span className="font-medium">
                                -{formatCurrency(totals.globalDiscount)}
                              </span>
                            </div>
                          )}
                          {!formData.aiu_enabled && <GlobalDiscountInput formData={formData} setFormData={setFormData} canDiscount={canApplyDiscount} />}
                          <div className="border-t-2 border-gray-300 pt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-gray-900">TOTAL:</span>
                              <span className="text-2xl font-bold text-blue-600">
                                {formatCurrency(totals.grandTotal)}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Factura / Cotización: mostrar subtotal + IVA + total discriminados */
                        <>
                          {totals.aiu && (
                            <>
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>Costo directo:</span>
                                <span className="font-medium text-gray-900">{formatCurrency(totals.aiu.direct)}</span>
                              </div>
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>Administración ({toNumber(formData.aiu_admin_pct)}%):</span>
                                <span className="font-medium text-gray-900">{formatCurrency(totals.aiu.admin)}</span>
                              </div>
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>Imprevistos ({toNumber(formData.aiu_unforeseen_pct)}%):</span>
                                <span className="font-medium text-gray-900">{formatCurrency(totals.aiu.unforeseen)}</span>
                              </div>
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>Utilidad ({toNumber(formData.aiu_profit_pct)}%):</span>
                                <span className="font-medium text-gray-900">{formatCurrency(totals.aiu.profit)}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal:</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(totals.aiu ? totals.aiu.subtotal : totals.subtotal)}
                            </span>
                          </div>

                          {!totals.aiu && totals.discount > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>Descuento:</span>
                              <span className="font-medium">
                                -{formatCurrency(totals.discount)}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between text-sm text-gray-600">
                            <span>{totals.aiu ? 'IVA sobre la Utilidad:' : 'IVA:'}</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(totals.tax)}
                            </span>
                          </div>

                          {totals.globalDiscount > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>Descuento global:</span>
                              <span className="font-medium">
                                -{formatCurrency(totals.globalDiscount)}
                              </span>
                            </div>
                          )}
                          {!formData.aiu_enabled && <GlobalDiscountInput formData={formData} setFormData={setFormData} canDiscount={canApplyDiscount} />}

                          <div className="border-t-2 border-gray-300 pt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-gray-900">TOTAL:</span>
                              <span className="text-2xl font-bold text-blue-600">
                                {formatCurrency(totals.grandTotal)}
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

        <ComboPickerModal
          isOpen={showComboPicker}
          onClose={() => setShowComboPicker(false)}
          onConfirm={handleAddCombo}
        />

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
                <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
                  <PencilSquareIcon className="w-4 h-4" /> Escribe al menos 2 caracteres para buscar
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
                <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
                  <SearchSvgIcon className="w-4 h-4" /> No se encontraron productos con "{searchTerm}"
                </p>
              </div>
            )}

            {/* Lista de productos encontrados */}
            {!isSearching && searchResults.length > 0 && (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {searchResults.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleAddItem(product)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start gap-3">
                      {/* Miniatura */}
                      {product.image_url && (
                        <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 mt-0.5">
                          <img
                            src={`${product.image_url.startsWith('http') ? '' : getServerOrigin()}${product.image_url}`}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.parentElement.style.display='none'; }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500 mt-1">SKU: {product.sku}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {product.product_type === 'service' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full"><WrenchScrewdriverIcon className="w-3 h-3" /> Servicio</span>
                          ) : (
                            <span className={`text-sm font-medium ${
                              product.current_stock > 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              Stock: {product.current_stock || 0}
                              {product.in_process_qty > 0 && (
                                <span className="text-amber-600 font-normal">
                                  {' '}· En trámite: {parseFloat(product.in_process_qty)} · Disp.: {parseFloat(product.available_real ?? (product.current_stock - product.in_process_qty))}
                                </span>
                              )}
                            </span>
                          )}
                          {product._equivalentsWithStock > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              {product._equivalentsWithStock} equivalente(s) disponible(s)
                            </span>
                          )}
                          {product.category?.name && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {product.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-2 shrink-0 flex flex-col items-end gap-1">
                        <p className="font-semibold text-lg text-blue-600">
                          {formatCurrency(product.base_price || 0)}
                        </p>
                        {product.price_includes_tax && (
                          <p className="text-xs text-blue-600">
                            (IVA {product.tax_percentage || 19}% incluido)
                          </p>
                        )}
                        {product.has_tax === false && (
                          <p className="text-xs text-green-600">(Exento de IVA)</p>
                        )}
                        {product.has_tax !== false && !product.price_includes_tax && (
                          <p className="text-xs text-gray-500">+ IVA {product.tax_percentage || 19}%</p>
                        )}
                        {product.image_url && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setViewingImage(product); }}
                            className="mt-1 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                            Ver foto
                          </button>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>

        {/* Visor de imagen de producto */}
        {viewingImage && (
          <ProductImageViewer product={viewingImage} onClose={() => setViewingImage(null)} />
        )}

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