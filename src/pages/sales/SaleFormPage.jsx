// frontend/src/pages/sales/SaleFormPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import useSalesStore from '../../store/salesStore';
import useBranchStore from '../../store/branchStore';
import useTenantStore from '../../store/tenantStore';
import useAuthStore from '../../store/authStore';
import DiagramMapEditor from '../../components/workshop/DiagramMapEditor';
import { brandsForType } from '../../constants/vehicleBrands';
import { VEHICLE_TYPE_OPTIONS } from '../../constants/vehicleTypes';
import useCustomersStore from '../../store/customersStore';
import useProductsStore from '../../store/productsStore';
import { warehousesService } from '../../api/warehouses';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import NumericInput from '../../components/inputs/NumericInput';
import Modal from '../../components/common/Modal';
import Combobox, { HighlightMatch } from '../../components/common/Combobox';
import { useListNavigation } from '../../components/common/searchDropdown';
import customersApi from '../../api/customers';
import Layout from '../../components/layout/Layout';
import DraftRecoveryBanner from '../../components/common/DraftRecoveryBanner';
import useFormDraft from '../../hooks/useFormDraft';
import { 
  Plus, 
  Trash2, 
  Search, 
  User, 
  Calendar,
  Package,
  ShoppingCart,
  X,
  Save,
  ArrowLeft,
  Target,
  Layers,
  ChevronDown
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
import ProjectSelect from '../../components/projects/ProjectSelect';
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
            className="border border-gray-200 rounded-lg px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Monto fijo o porcentaje"
          >
            <option value="fixed">$</option>
            <option value="percentage">%</option>
          </select>
          <NumericInput
            value={formData.global_discount_value}
            onChange={e => setFormData(f => ({ ...f, global_discount_value: e.target.value }))}
            placeholder={formData.global_discount_type === 'percentage' ? '%' : '$'}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs flex-1 min-w-0 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  // /quotes/new y /quotes/:id/edit: formulario de cotización fuera del CRM
  // (Cotizaciones es su propia sección, accesible con Ventas, Taller o CRM).
  const isQuotesRoute = location.pathname.startsWith('/quotes');
  const { createSale, updateSale, fetchSaleById, currentSale, loading } = useSalesStore();
  const isCrmQuoteMode = isCrmQuoteRoute || isQuotesRoute || Boolean(opportunityId)
    || (Boolean(id) && currentSale?.id === id && currentSale?.document_type === 'cotizacion');
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
    quote_valid_until: '',
    // Módulo Proyectos: ?project_id= al crear desde la ficha del proyecto.
    project_id: searchParams.get('project_id') || null,
  });
  const [currentProject, setCurrentProject] = useState(null);

  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  // null = según haya datos del vehículo (ver vehicleOpen)
  const [showVehicle, setShowVehicle] = useState(null);
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
  // Teclado en el modal de búsqueda de productos (↑↓ / Enter / Esc)
  const productNav = useListNavigation({
    count: searchTerm.trim().length >= 2 ? searchResults.length : 0,
    open: showProductSearch,
    resetKey: searchResults,
    onPick: (i) => searchResults[i] && handleAddItem(searchResults[i]),
    onClose: () => { setShowProductSearch(false); setSearchTerm(''); setSearchResults([]); },
  });
  const [showScanner, setShowScanner] = useState(false);
  const [showComboPicker, setShowComboPicker] = useState(false);
  const [stockAlternatives, setStockAlternatives] = useState([]);

  // Estados para búsqueda de clientes
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  const customerLabel = (c) =>
    (c.customer_type === 'company' && c.business_name) || `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.business_name || '';

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
    } else {
      // El listado inicial viene paginado: si el cliente no está, se consulta directo
      customersApi.getById(opportunityCustomerId)
        .then(r => {
          const c = r.data?.data;
          if (c) setCustomerSearchTerm(c.business_name || `${c.first_name || ''} ${c.last_name || ''}`.trim());
        })
        .catch(() => {});
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
    let stale = false;
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

        if (!stale) setSearchResults(results);
      } catch (error) {
        if (!stale) setSearchResults([]);
      } finally {
        if (!stale) setIsSearching(false);
      }
    };

    const timer = setTimeout(searchProductsDebounced, 300);
    return () => { stale = true; clearTimeout(timer); };
  }, [searchTerm, searchProducts, formData.vehicle_brand, formData.vehicle_model, formData.vehicle_year]);


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
        quote_valid_until: currentSale.quote_valid_until ? String(currentSale.quote_valid_until).slice(0, 10) : '',
        project_id: currentSale.project_id || null,
      });
      setCurrentProject(currentSale.project || null);

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
          // El precio IVA incluido es del producto (la línea no lo guarda):
          // sin esto, al editar se sumaba el IVA encima del precio.
          price_includes_tax: !!item.product?.price_includes_tax,
          has_tax: item.product ? item.product.has_tax !== false && item.product.tax_config?.iva_status !== 'excluido' : true,
          inc_rate: toNumber(item.inc_rate),
          inc_amount: toInteger(item.inc_amount, 0),
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
  // Ojo: en una venta nueva id y currentSale?.id son ambos undefined -- sin
  // el `isEditMode &&` la comparación daba true y reventaba con currentSale null.
  const saleLoaded = isEditMode && currentSale?.id === id;
  const saleUpdatedAt = saleLoaded ? (currentSale.updated_at || currentSale.updatedAt || null) : null;
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
      const taxPct = ivaRateOf(product);

      const newItem = {
        item_type: product.product_type === 'service' ? 'service' : 'product',
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: 1,
        unit_price: toInteger(product.base_price, 0),
        discount_percentage: 0,
        tax_percentage: taxPct,
        inc_rate: incRateOf(product),
        price_includes_tax: product.price_includes_tax || false,
        has_tax: product.has_tax !== false && product.tax_config?.iva_status !== 'excluido',
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

  // Tarifa de IVA del producto -- mismo criterio que taxService.calculateItemTaxes:
  // excluido o has_tax=false sin IVA, exento al 0 %, sin tarifa 19 %. Antes un
  // producto con tarifa 0 entraba con 19 % (`|| 19`).
  const ivaRateOf = (product) => {
    const status = product?.tax_config?.iva_status;
    if (product?.has_tax === false || status === 'excluido' || status === 'exento') return 0;
    const rate = Number(product?.tax_percentage ?? 19);
    return Number.isFinite(rate) ? rate : 19;
  };

  // Equivalente con stock: se lee el producto completo (la equivalencia no
  // trae su IVA ni si el precio lo incluye).
  const handleAddAlternative = async (alt) => {
    try {
      const res = await productsAPI.getById(alt.product_id);
      const product = res?.data;
      if (!product) throw new Error('not found');
      await handleAddItem({ ...product, current_stock: product.current_stock ?? alt.available_stock });
    } catch {
      toast.error(`No se pudo cargar ${alt.name}`);
    }
    setStockAlternatives([]);
  };

  // Impoconsumo (INC) del producto -- mismo criterio que taxService.calculateItemTaxes
  // en el backend: tarifa de product.tax_config.inc, sobre la base sin IVA.
  const incRateOf = (product) => {
    const inc = product?.tax_config?.inc;
    return inc?.enabled && Number(inc.rate) > 0 ? Number(inc.rate) : 0;
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
    let inc = 0;
    let total = 0;
    const incRate = toNumber(item.inc_rate);

    if (formData.aiu_enabled) {
      // Factura AIU: la línea es costo directo sin IVA (el IVA va solo sobre
      // la Utilidad). Si el precio traía IVA incluido, se le extrae.
      tax = 0;
      total = hasTax && priceIncludesTax
        ? taxBase - Math.round((taxBase * taxPercentage) / (100 + taxPercentage))
        : taxBase;
    } else if (!hasTax) {
      // Producto exento de IVA (el INC, si lo tiene, se sigue cobrando)
      tax = 0;
      inc = Math.round((taxBase * incRate) / 100);
      total = taxBase + inc;
    } else if (priceIncludesTax) {
      // El precio YA INCLUYE los impuestos: se extraen IVA e INC juntos
      const netBase = taxBase / (1 + (taxPercentage + incRate) / 100);
      tax = Math.round((netBase * taxPercentage) / 100);
      inc = Math.round((netBase * incRate) / 100);
      total = taxBase;
    } else {
      // El precio NO incluye impuestos - se suman IVA e INC sobre la base
      tax = Math.round((taxBase * taxPercentage) / 100);
      inc = Math.round((taxBase * incRate) / 100);
      total = taxBase + tax + inc;
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
      inc_amount: inc,
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
      tax_percentage: ivaRateOf(product),
      inc_rate: incRateOf(product),
      price_includes_tax: product.price_includes_tax || false,
      has_tax: product.has_tax !== false && product.tax_config?.iva_status !== 'excluido',
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
    const inc = items.reduce((sum, item) => sum + toInteger(item.inc_amount, 0), 0);
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
    return { subtotal, discount, tax, inc, total, globalDiscount, grandTotal };
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
        toast.success(isCrmQuoteMode ? 'Cotización actualizada' : 'Venta actualizada exitosamente');
        navigate(isCrmQuoteMode ? `/quotes/${id}` : `/sales/${id}`, { state: location.state });
      } else {
        const result = await createSale(saleData);
        draft.clear();
        if (opportunityId) {
          toast.success('Cotización creada y vinculada a la oportunidad');
        } else if (isCrmQuoteMode) {
          toast.success('Cotización creada exitosamente');
        } else {
          // Fuera del modo cotización la venta nace siempre como borrador sin
          // tipo de documento (se elige al confirmarla).
          toast.success('Borrador de venta guardado');
        }
        navigate(isCrmQuoteMode ? `/quotes/${result.id}` : `/sales/${result.id}`);
      }
    } catch (error) {
      toast.error(error.message || 'Error al guardar la venta');
    }
  };

  // Fila de un ítem de la tabla. inCombo = componente de un combo (se
  // edita igual que cualquier línea; el combo solo agrupa).
  const renderItemRow = (item, index, inCombo = false) => (
    <tr key={index} className={`hover:bg-gray-50 transition-colors ${inCombo ? 'bg-emerald-50/30' : ''}`}>
      <td className={`py-1.5 px-2 ${inCombo ? 'pl-6 border-l-4 border-emerald-300' : ''}`}>
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
            className="w-full px-2 py-0.5 border border-indigo-300 rounded text-sm font-medium text-gray-900 focus:ring-2 focus:ring-indigo-400"
          />
        ) : (
          <div className="text-sm font-medium text-gray-900 leading-tight">{item.product_name}</div>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs">
          {item.item_type === 'service' && (
            <span className="inline-flex items-center gap-1 font-semibold text-purple-600 bg-purple-50 px-1.5 rounded-full"><WrenchScrewdriverIcon className="w-3 h-3" /> Servicio</span>
          )}
          {item.item_type === 'free_line' && (
            <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 bg-indigo-50 px-1.5 rounded-full"><PencilSquareIcon className="w-3 h-3" /> Línea libre · No mueve inventario</span>
          )}
          {item.item_type !== 'free_line' && item.product_sku && (
            <span className="text-gray-500">SKU: {item.product_sku}</span>
          )}
          {item.price_includes_tax && (
            <span className="inline-flex items-center gap-1 text-blue-600 font-medium"><LightBulbIcon className="w-3 h-3" /> Precio incluye IVA</span>
          )}
          {item.has_tax === false && (
            <span className="text-green-600 font-medium">✓ Exento de IVA</span>
          )}
        </div>
      </td>
      <td className="py-1.5 px-2">
        <Input
          type="number"
          {...INPUT_CONFIG.quantity}
          value={item.quantity}
          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
          className="text-center w-full !py-1"
        />
      </td>
      <td className="py-1.5 px-2">
        <NumericInput
          value={item.unit_price}
          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
          className="text-right w-full input !py-1"
        />
      </td>
      <td className="py-1.5 px-2">
        <Input
          type="number"
          {...INPUT_CONFIG.percentage}
          value={item.discount_percentage}
          onChange={(e) => handleItemChange(index, 'discount_percentage', e.target.value)}
          className="text-right w-full !py-1"
        />
      </td>
      {!(hideRemisionTax && formData.document_type === 'remision') && (
      <td className="py-1.5 px-2">
        <Input
          type="number"
          {...INPUT_CONFIG.percentage}
          value={item.tax_percentage}
          onChange={(e) => handleItemChange(index, 'tax_percentage', e.target.value)}
          className={`text-right w-full !py-1 ${
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
      <td className="py-1.5 px-2 text-right">
        <span className="text-sm font-semibold text-gray-900">
          {formatCurrency(item.total)}
        </span>
      </td>
      {technicians.length > 0 && (
        <td className="py-1.5 px-2">
          <select
            value={item.technician_id || ''}
            onChange={(e) => {
              const updated = [...items];
              updated[index] = { ...updated[index], technician_id: e.target.value };
              setItems(updated);
            }}
            className="w-full text-xs border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="">— ninguno —</option>
            {technicians.map(t => (
              <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
            ))}
          </select>
        </td>
      )}
      <td className="py-1.5 px-2">
        <button
          type="button"
          onClick={() => handleRemoveItem(index)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      <td colSpan={columnsBeforeTotal - 1} className="py-1.5 px-2">
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
      <td className="py-1.5 px-2 text-right text-xs text-gray-500">Total combo</td>
      <td className="py-1.5 px-2 text-right font-semibold text-gray-900">{formatCurrency(entry.total)}</td>
      {technicians.length > 0 && <td />}
      <td className="py-1.5 px-2">
        <button
          type="button"
          onClick={() => handleRemoveCombo(entry.groupId)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Quitar combo completo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>,
    ...entry.rows.map(({ item, index }) => renderItemRow(item, index, true)),
  ];

  const totals = calculateTotals();
  const showTaxColumn = !(hideRemisionTax && formData.document_type === 'remision');
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';
  const fieldCls = 'w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const freeLineCount = items.filter(i => i.item_type === 'free_line').length;
  // Datos del vehículo plegables: abiertos de entrada solo si ya hay alguno.
  const hasVehicleData = Boolean(formData.vehicle_plate || formData.vehicle_type || formData.vehicle_brand
    || formData.vehicle_model || formData.vehicle_year || formData.mileage);
  const vehicleOpen = showVehicle ?? hasVehicleData;
  const vehicleSummary = [formData.vehicle_plate, [formData.vehicle_brand, formData.vehicle_model, formData.vehicle_year].filter(Boolean).join(' ')]
    .filter(Boolean).join(' · ');

  const addFreeLine = () => setItems([...items, calculateItemTotals({
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
  })]);

  const scanIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  return (
    <Layout>
      <div className="space-y-3 max-w-7xl mx-auto" {...draft.bind}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => navigate(isCrmQuoteRoute ? '/crm/pipeline' : isCrmQuoteMode ? '/quotes' : '/sales')}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {isEditMode
                  ? (isCrmQuoteMode ? 'Editar Cotización' : 'Editar Venta')
                  : opportunityId
                    ? 'Cotización desde el Pipeline'
                    : isCrmQuoteMode
                      ? 'Nueva Cotización'
                      : 'Nueva Venta'}
              </h1>
              <p className="text-xs text-gray-500 truncate">
                {isEditMode
                  ? (isCrmQuoteMode
                    ? 'Si la cotización ya se envió, cambiar los ítems la deja otra vez pendiente de aprobación'
                    : 'Modifica los datos de la venta')
                  : opportunityId
                    ? 'Se vinculará automáticamente a la oportunidad al guardar'
                    : isCrmQuoteMode
                      ? 'Se guarda en Cotizaciones; pasa a Ventas solo cuando el cliente la aprueba y la conviertes'
                      : 'Crea una nueva venta: remisión o factura'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => {
              draft.clear();
              if (isEditMode) navigate(isCrmQuoteMode ? `/quotes/${id}` : `/sales/${id}`, { state: location.state });
              else navigate(isCrmQuoteRoute ? '/crm/pipeline' : isCrmQuoteMode ? '/quotes' : '/sales');
            }}>
              Cancelar
            </Button>
            <Button
              size="sm"
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
          <div className="flex items-start gap-2.5 px-3 py-2 bg-accent/[0.05] border border-accent/15 rounded-xl text-xs text-gray-700">
            <Target className="w-4 h-4 text-accent flex-shrink-0" />
            <p>
              Cotización de una oportunidad del <strong>Pipeline</strong>: cliente y valor estimado precargados. Reemplaza la
              línea de estimado por los productos o servicios reales; al guardar, la oportunidad pasa a <strong>Cotizado</strong>.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Datos generales */}
          <div className="card !p-3">
            <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-x-3 gap-y-2 items-start">
              {/* Cliente -- vacío = CONSUMIDOR FINAL (lo asigna el backend al guardar) */}
              <div className="col-span-2 md:col-span-6 lg:col-span-4">
                <label className={labelCls}>
                  <User className="w-3.5 h-3.5 inline mr-1" />
                  Cliente
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <Combobox
                      placeholder="Consumidor final (222222222222) — busca por nombre, NIT o teléfono"
                      items={customers}
                      value={formData.customer_id || null}
                      displayValue={customerSearchTerm}
                      onSelect={(customer) => {
                        setFormData(prev => ({ ...prev, customer_id: customer.id }));
                        setCustomerSearchTerm(customerLabel(customer));
                      }}
                      onClear={() => {
                        setFormData(prev => ({ ...prev, customer_id: '' }));
                        setCustomerSearchTerm('');
                      }}
                      getSearchText={c => `${customerLabel(c)} ${c.business_name || ''} ${c.tax_id || ''} ${c.phone || ''} ${c.email || ''}`}
                      remoteSearch={q => customersApi.getAll({ search: q, limit: 30 }).then(r => r.data?.data || [])}
                      disabled={showQuickCustomer}
                      panelMinWidth={320}
                      renderItem={(customer, q) => (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              <HighlightMatch text={customerLabel(customer)} query={q} />
                            </p>
                            {(customer.tax_id || customer.phone) && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {customer.tax_id && <HighlightMatch text={customer.tax_id} query={q} />}
                                {customer.tax_id && customer.phone ? ' · ' : ''}
                                {customer.phone && <HighlightMatch text={customer.phone} query={q} />}
                              </p>
                            )}
                          </div>
                          {customer.customer_type === 'company' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex-shrink-0">Empresa</span>
                          )}
                        </div>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={showQuickCustomer ? "primary" : "outline"}
                    onClick={() => {
                      setShowQuickCustomer(!showQuickCustomer);
                      if (!showQuickCustomer) {
                        setCustomerSearchTerm('');
                        setFormData(prev => ({ ...prev, customer_id: '' }));
                      }
                    }}
                    title="Agregar cliente rápido"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Tipo de Documento — solo visible al editar un borrador de
                  venta; una cotización sigue siéndolo hasta convertirla. */}
              {isEditMode && !isCrmQuoteMode && (
                <div className="col-span-1 md:col-span-2 lg:col-span-2">
                  <label className={labelCls}>Tipo de documento</label>
                  <select
                    name="document_type"
                    value={formData.document_type}
                    onChange={handleInputChange}
                    required
                    className={fieldCls}
                  >
                    <option value="remision">Remisión</option>
                    <option value="factura">Factura</option>
                  </select>
                </div>
              )}

              <div className="col-span-1 md:col-span-2 lg:col-span-2">
                <label className={labelCls}>
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  Fecha *
                </label>
                <input
                  type="date"
                  name="sale_date"
                  value={formData.sale_date}
                  onChange={handleInputChange}
                  required
                  className={fieldCls}
                />
              </div>

              {/* Vigencia -- vacía al crear, el backend usa la del tenant (15 días por defecto). */}
              {isCrmQuoteMode && (
                <div className="col-span-1 md:col-span-2 lg:col-span-2">
                  <label className={labelCls}>Válida hasta</label>
                  <input
                    type="date"
                    name="quote_valid_until"
                    value={formData.quote_valid_until}
                    min={formData.sale_date}
                    onChange={handleInputChange}
                    title={!isEditMode ? 'Si la dejas vacía se usa la vigencia por defecto' : undefined}
                    className={fieldCls}
                  />
                </div>
              )}

              <div className={`col-span-1 md:col-span-2 ${isCrmQuoteMode ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                <label className={labelCls}>
                  <Package className="w-3.5 h-3.5 inline mr-1" />
                  Bodega
                </label>
                <select
                  name="warehouse_id"
                  value={formData.warehouse_id}
                  onChange={handleInputChange}
                  className={fieldCls}
                >
                  <option value="">Sin bodega específica</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Técnico — controlado por configuración del tenant */}
              {technicianFieldEnabled && (
                <div className="col-span-1 md:col-span-3 lg:col-span-3">
                  <label className={labelCls}>
                    <WrenchScrewdriverIcon className="w-3.5 h-3.5 inline mr-1" />
                    Técnico asignado
                  </label>
                  <select
                    name="technician_id"
                    value={formData.technician_id}
                    onChange={handleInputChange}
                    className={fieldCls}
                    title={Array.isArray(technicians) && technicians.length === 0 ? 'No hay técnicos activos. Crea usuarios con rol "Técnico" en el módulo de usuarios.' : undefined}
                  >
                    <option value="">Sin técnico asignado</option>
                    {Array.isArray(technicians) && technicians.map(tech => (
                      <option key={tech.id} value={tech.id}>
                        {tech.first_name} {tech.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <ProjectSelect
                className={`col-span-2 md:col-span-3 ${isCrmQuoteMode ? 'lg:col-span-2' : 'lg:col-span-3'} [&_label]:text-xs [&_label]:text-gray-600 [&_select]:py-1.5`}
                value={formData.project_id}
                currentProject={currentProject}
                onChange={(projectId) => setFormData(prev => ({ ...prev, project_id: projectId }))}
              />
            </div>

            {/* Cliente Rápido */}
            {showQuickCustomer && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-blue-900 flex items-center">
                    <User className="w-3.5 h-3.5 mr-1.5" />
                    Cliente rápido
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowQuickCustomer(false)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input name="full_name" value={quickCustomer.full_name} onChange={handleQuickCustomerChange}
                    required={showQuickCustomer} placeholder="Nombre completo *" className={fieldCls} />
                  <input name="tax_id" value={quickCustomer.tax_id} onChange={handleQuickCustomerChange}
                    placeholder="NIT / Cédula" className={fieldCls} />
                  <input type="email" name="email" value={quickCustomer.email} onChange={handleQuickCustomerChange}
                    placeholder="Correo (opcional)" className={fieldCls} />
                  <input name="phone" value={quickCustomer.phone} onChange={handleQuickCustomerChange}
                    placeholder="Teléfono" className={fieldCls} />
                </div>
              </div>
            )}

            {/* Vehículo (placa, tipo, marca/línea/año, km) — plegable; lo
                controla la configuración del tenant. */}
            {vehiclePlateEnabled && (
              <div className="mt-2 border-t border-gray-100 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVehicle(!vehicleOpen)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${vehicleOpen ? '' : '-rotate-90'}`} />
                  Vehículo <span className="font-normal text-gray-400">(opcional)</span>
                  {!vehicleOpen && vehicleSummary && <span className="font-semibold text-gray-800 ml-1">{vehicleSummary}</span>}
                </button>
                {vehicleOpen && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-2">
                      <div>
                        <label className={labelCls}>Placa</label>
                        <input
                          type="text"
                          name="vehicle_plate"
                          value={formData.vehicle_plate}
                          onChange={handleInputChange}
                          className={`${fieldCls} uppercase`}
                          placeholder="ABC123"
                          maxLength="20"
                        />
                      </div>
                      {/* Tipo de vehículo — NO se puede condicionar a
                          document_type==='cotizacion' porque una venta nueva
                          nace con document_type=null (se decide al confirmar). */}
                      <div>
                        <label className={labelCls} title="Para poder agregar diagrama de intervención si es cotización">Tipo</label>
                        <select
                          name="vehicle_type"
                          value={formData.vehicle_type}
                          onChange={handleInputChange}
                          className={fieldCls}
                        >
                          <option value="">Sin especificar</option>
                          {VEHICLE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div className="relative">
                        <label className={labelCls} title="Marca y línea filtran los productos compatibles al buscar">Marca</label>
                        <input
                          type="text"
                          name="vehicle_brand"
                          value={formData.vehicle_brand}
                          onChange={handleInputChange}
                          onFocus={() => setShowBrandDropdown(true)}
                          onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
                          autoComplete="off"
                          className={fieldCls}
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
                      </div>
                      <div>
                        <label className={labelCls}>Línea</label>
                        <input
                          type="text"
                          name="vehicle_model"
                          value={formData.vehicle_model}
                          onChange={handleInputChange}
                          className={fieldCls}
                          placeholder="Aveo"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Año</label>
                        <input
                          type="number"
                          name="vehicle_year"
                          value={formData.vehicle_year}
                          onChange={handleInputChange}
                          className={fieldCls}
                          placeholder="2015"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Kilometraje</label>
                        <NumericInput
                          name="mileage"
                          value={formData.mileage}
                          onChange={handleInputChange}
                          className={fieldCls}
                          placeholder="85.000"
                        />
                      </div>
                    </div>

                    {/* El diagrama solo puede vivir en una cotización que YA
                        existe (las marcas se guardan contra /sales/:id/...):
                        al crear solo se avisa; al editar se embebe aquí. */}
                    {formData.vehicle_type && enabledModules?.includes('workshop') && (
                      isEditMode && currentSale ? (
                        <div className="mt-2">
                          <DiagramMapEditor
                            entityType="sale"
                            entityId={currentSale.id}
                            vehicleType={formData.vehicle_type}
                            disabled={currentSale.status !== 'draft'}
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 mt-2">
                          Guarda la cotización primero — el diagrama de intervención aparecerá en la página de la cotización justo después de guardarla.
                        </p>
                      )
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_310px] gap-3 items-start">
            {/* Productos */}
            <div className="card !p-3 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center">
                  <ShoppingCart className="w-4 h-4 text-blue-600 mr-1.5" />
                  <h2 className="text-sm font-semibold text-gray-900">
                    Productos ({items.length})
                  </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowProductSearch(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Producto
                  </Button>
                  <button
                    type="button"
                    onClick={addFreeLine}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1 text-sm font-medium shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Línea libre
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowComboPicker(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1 text-sm font-medium shadow-sm"
                    title="Agregar un combo de productos/servicios"
                  >
                    <Layers className="w-4 h-4" />
                    Combo
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1 text-sm font-medium shadow-sm"
                    title="Escanear código de barras con cámara o pistola USB"
                  >
                    {scanIcon}
                    Escanear
                  </button>
                </div>
              </div>

              {/* Alternativas de equivalencia cuando no hay stock */}
              {stockAlternatives.length > 0 && (
                <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-amber-800">
                      Equivalentes disponibles ({stockAlternatives.length})
                    </p>
                    <button type="button" onClick={() => setStockAlternatives([])} className="text-amber-600 hover:text-amber-800 text-xs">✕ Cerrar</button>
                  </div>
                  <div className="space-y-1">
                    {stockAlternatives.map(alt => (
                      <button
                        type="button"
                        key={alt.product_id}
                        onClick={() => handleAddAlternative(alt)}
                        className="w-full flex items-center justify-between px-2 py-1.5 bg-white border border-amber-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-left"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{alt.name}</p>
                          <p className="text-xs text-gray-500">{alt.sku} · Stock: <span className="text-green-600 font-medium">{alt.available_stock}</span></p>
                        </div>
                        <span className="text-xs font-medium text-blue-600">Agregar</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {items.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <ShoppingCart className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium mb-3">No hay productos agregados</p>
                  <div className="flex gap-2 justify-center">
                    <Button type="button" size="sm" onClick={() => setShowProductSearch(true)} variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar producto
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-1"
                    >
                      {scanIcon}
                      Escanear
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                          Cant.
                        </th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                          Precio unit.
                        </th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                          Desc. %
                        </th>
                        {showTaxColumn && (
                          <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                            IVA %
                          </th>
                        )}
                        <th className="text-right py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                          Total
                        </th>
                        {technicians.length > 0 && (
                          <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                            Técnico
                          </th>
                        )}
                        <th className="w-9"></th>
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

              {/* Aviso líneas libres - solo formulario, no aparece en PDF */}
              {freeLineCount > 0 && (
                <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  <strong>{freeLineCount === 1 ? '1 línea libre' : `${freeLineCount} líneas libres`}: no afectan el inventario.</strong>{' '}
                  Si vendiste un repuesto físico, usa <strong>Producto</strong> para que el stock se descuente.
                </p>
              )}
            </div>

            {/* Resumen lateral */}
            <div className="space-y-3 lg:sticky lg:top-4">
              {/* Factura AIU -- IVA solo sobre la Utilidad (ver backend services/sales/aiu.service.js) */}
              {/* Solo si el tenant habilitó AIU, o si la venta ya es AIU (editarla). */}
              {items.length > 0 && formData.document_type !== 'remision' && (aiuDefaults.enabled || formData.aiu_enabled) && (
                <div className="card !p-3 space-y-2">
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
                      <span className="font-medium">Factura AIU</span>
                      <span className="block text-xs text-gray-500">Las líneas son el costo directo; el IVA se liquida solo sobre la Utilidad.</span>
                    </span>
                  </label>
                  {formData.aiu_enabled && (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'aiu_admin_pct', label: 'Admón. %' },
                        { key: 'aiu_unforeseen_pct', label: 'Imprev. %' },
                        { key: 'aiu_profit_pct', label: 'Utilidad %' },
                      ].map(f => (
                        <label key={f.key} className="block">
                          <span className="text-xs text-gray-600">{f.label}</span>
                          <input
                            type="number" min="0" max="100" step="0.01"
                            value={formData[f.key]}
                            onChange={(e) => setFormData(d => ({ ...d, [f.key]: e.target.value }))}
                            className="mt-0.5 w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </label>
                      ))}
                      <label className="block col-span-3">
                        <span className="text-xs text-gray-600">Contrato de servicios AIU por concepto de</span>
                        <input
                          type="text"
                          value={formData.aiu_object}
                          onChange={(e) => setFormData(d => ({ ...d, aiu_object: e.target.value }))}
                          placeholder="Ej: mantenimiento preventivo de la flota"
                          className="mt-0.5 w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Totales */}
              <div className="card !p-3 space-y-1.5">
                {!showTaxColumn ? (
                  /* Remisión: mostrar solo el total (IVA incluido pero no discriminado) */
                  <>
                    {totals.discount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Descuento:</span>
                        <span className="font-medium">-{formatCurrency(totals.discount)}</span>
                      </div>
                    )}
                    {totals.globalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Descuento global:</span>
                        <span className="font-medium">-{formatCurrency(totals.globalDiscount)}</span>
                      </div>
                    )}
                    {!formData.aiu_enabled && <GlobalDiscountInput formData={formData} setFormData={setFormData} canDiscount={canApplyDiscount} />}
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
                        <span className="font-medium">-{formatCurrency(totals.discount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{totals.aiu ? 'IVA sobre la Utilidad:' : 'IVA:'}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(totals.tax)}</span>
                    </div>

                    {!totals.aiu && totals.inc > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>INC (impoconsumo):</span>
                        <span className="font-medium text-gray-900">{formatCurrency(totals.inc)}</span>
                      </div>
                    )}

                    {totals.globalDiscount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Descuento global:</span>
                        <span className="font-medium">-{formatCurrency(totals.globalDiscount)}</span>
                      </div>
                    )}
                    {!formData.aiu_enabled && <GlobalDiscountInput formData={formData} setFormData={setFormData} canDiscount={canApplyDiscount} />}
                  </>
                )}
                <div className="border-t-2 border-gray-300 pt-2 flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">TOTAL:</span>
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>

              {/* Notas */}
              <div className="card !p-3">
                <label className={labelCls}>Notas adicionales</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                  placeholder="Observaciones, condiciones especiales..."
                />
              </div>
            </div>
          </div>
        </form>

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
                placeholder="Buscar por nombre, SKU o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={productNav.onKeyDown}
                autoComplete="off"
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
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
            {isSearching && searchTerm.length >= 2 && searchResults.length === 0 && (
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
            {searchResults.length > 0 && searchTerm.trim().length >= 2 && (
              <>
              <div ref={productNav.listRef} role="listbox" className={`max-h-96 overflow-y-auto space-y-2 transition-opacity ${isSearching ? 'opacity-60' : ''}`}>
                {searchResults.map((product, index) => (
                  <div
                    key={product.id}
                    data-index={index}
                    role="option"
                    aria-selected={index === productNav.activeIndex}
                    onClick={() => handleAddItem(product)}
                    onMouseEnter={() => productNav.setActiveIndex(index)}
                    className={`w-full text-left p-4 border rounded-lg cursor-pointer transition-colors duration-150 ${
                      index === productNav.activeIndex
                        ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-500/40'
                        : 'border-gray-200 dark:border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      {/* Miniatura */}
                      {product.image_url && (
                        <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 mt-0.5">
                          <img
                            src={`${product.image_url.startsWith('http') ? '' : getServerOrigin()}${product.image_url}`}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { e.target.parentElement.style.display='none'; }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100"><HighlightMatch text={product.name} query={searchTerm} /></p>
                        <p className="text-sm text-gray-500 mt-1">SKU: <HighlightMatch text={product.sku} query={searchTerm} /></p>
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
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 text-center">
                {searchResults.length} resultado(s) · ↑↓ para moverse · Enter para agregar · Esc para cerrar
              </p>
              </>
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