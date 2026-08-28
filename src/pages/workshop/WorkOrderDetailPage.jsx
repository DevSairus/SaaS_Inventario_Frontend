import { useEffect, useState, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import useWorkshopStore from '../../store/workshopStore';
import useProductsStore from '../../store/productsStore';
import useTenantStore from '../../store/tenantStore';
import useAuthStore from '../../store/authStore';
import { productsAPI } from '../../api/products';
import { workOrdersApi } from '../../api/workshop';
import { workOrdersApiOffline } from '../../api/workshopOffline';
import axios from '../../api/axios';
import Combobox from '../../components/common/Combobox';
import BarcodeScanner from '../../components/common/BarcodeScanner';
import {
  ArrowLeft, Wrench, Car, User, Package, Plus, Trash2, Pencil,
  Camera, FileText, AlertTriangle, CheckCircle, Clock, DollarSign,
  Printer, Download, ClipboardList, Share2, Image, Link2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ClipboardDocumentListIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import ProductImageViewer from '../../components/products/ProductImageViewer';
import DiagramMapEditor from '../../components/workshop/DiagramMapEditor';
import NumericInput from '../../components/inputs/NumericInput';
import CompleteCustomerDianModal from '../../components/dian/CompleteCustomerDianModal';

const STATUS_FLOW = ['recibido', 'en_proceso', 'en_espera', 'listo', 'entregado'];

// Transiciones permitidas: solo avance, sin retroceder a 'recibido'
const STATUS_TRANSITIONS = {
  recibido:   ['en_proceso', 'en_espera'],
  en_proceso: ['en_espera', 'listo'],
  en_espera:  ['en_proceso', 'listo'],
  listo:      ['entregado'],
  entregado:  [],
  cancelado:  [],
};
const STATUS_CONFIG = {
  recibido:   { label: 'Recibido',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',     icon: Clock },
  en_proceso: { label: 'En Proceso',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Wrench },
  en_espera:  { label: 'En Espera',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', icon: AlertTriangle },
  listo:      { label: 'Listo',       color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',   icon: CheckCircle },
  entregado:  { label: 'Entregado',   color: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',     icon: CheckCircle },
  cancelado:  { label: 'Cancelado',   color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',       icon: AlertTriangle },
};

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600';

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    currentOrder: order, orderLoading,
    fetchOrder, patchCurrentOrder, changeStatus, revertStatus, addItem, updateItem, removeItem, generateSale, uploadPhotos, deletePhoto,
    sendQuoteRequest, resendQuoteRequest, applyApprovedItems,
  } = useWorkshopStore();
  const { searchProducts } = useProductsStore();
  const { features, fetchFeatures } = useTenantStore();
  // Config propia de la OT, separada de hide_remision_tax (que solo aplica a
  // remisiones/facturas de Ventas) para que activar/desactivar una no afecte
  // a la otra por accidente.
  const hideWorkOrderTax = features?.hide_workorder_tax === true;
  const { user } = useAuthStore();
  // El técnico ve/opera la OT (diagnóstico, checklist, ítems) pero no debe
  // ver ningún valor monetario -- ni de repuestos, mano de obra, servicios
  // ni totales -- para que no negocie precios con el cliente en el taller.
  const hidePrices = user?.role === 'technician';

  // Reversar estado (solo admin) — OT bloqueada en 'listo'/'entregado'
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertTarget, setRevertTarget] = useState('en_proceso');
  const [revertReason, setRevertReason] = useState('');
  const [reverting, setReverting] = useState(false);
  const canRevert = ['admin', 'super_admin'].includes(user?.role);

  const openRevertModal = () => {
    setRevertTarget('en_proceso');
    setRevertReason('');
    setShowRevertModal(true);
  };

  const confirmRevert = async () => {
    if (!revertReason.trim()) {
      toast.error('Indica el motivo de la reversión');
      return;
    }
    setReverting(true);
    try {
      const result = await revertStatus(id, revertTarget, revertReason.trim());
      if (result?.document_voided?.method === 'nota_credito') {
        toast.success('Factura anulada mediante nota crédito — revisa el estado del envío a DIAN', { duration: 6000 });
      }
      setShowRevertModal(false);
    } catch {
      // el store ya muestra el toast de error
    } finally {
      setReverting(false);
    }
  };

  // Descuento global de la OT
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountForm, setDiscountForm] = useState({ discount_type: 'fixed', discount_value: 0 });
  const [savingDiscount, setSavingDiscount] = useState(false);

  const startEditDiscount = () => {
    setDiscountForm({
      discount_type: order?.discount_type || 'fixed',
      discount_value: order?.discount_value || 0,
    });
    setEditingDiscount(true);
  };

  const saveDiscount = async () => {
    setSavingDiscount(true);
    try {
      const res = await workOrdersApiOffline.update(id, {
        discount_type: discountForm.discount_type,
        discount_value: discountForm.discount_value,
      }, order?.updated_at);
      patchCurrentOrder(res.data.data);
      toast.success(res.data.data._pendingSync
        ? 'Descuento guardado sin conexión — se sincronizará automáticamente'
        : 'Descuento actualizado');
      setEditingDiscount(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo guardar el descuento');
    } finally {
      setSavingDiscount(false);
    }
  };

  // Búsqueda de producto
  const [searchTerm, setSearchTerm]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [viewingImage, setViewingImage] = useState(null);
  const [isSearching, setIsSearching]     = useState(false);
  const [showScanner, setShowScanner]     = useState(false);

  // Formulario agregar ítem
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    product_id: '', product_name: '', item_type: 'repuesto', quantity: 1, unit_price: '', technician_id: '', requires_approval: false,
  });
  const [addingItem, setAddingItem] = useState(false);
  const [stockAlternatives, setStockAlternatives] = useState([]);

  // Edición de ítem pendiente (aún sin aprobar/rechazar por el cliente)
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemVals, setEditItemVals]   = useState({ product_name: '', quantity: '', unit_price: '' });
  const [savingEditItem, setSavingEditItem] = useState(false);
  // Ref además del state: el guard tiene que ser SÍNCRONO. `savingEditItem`
  // (state) no bloquea un doble-click/doble-tap disparado antes de que React
  // repinte el botón como disabled -- eso mandaba dos PATCH casi simultáneos
  // y, si el segundo llegaba al backend con datos de formulario obsoletos,
  // el resultado en pantalla podía verse como si el valor se hubiera sumado
  // en vez de reemplazado.
  const savingEditItemRef = useRef(false);

  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditItemVals({ product_name: item.product_name || '', quantity: item.quantity, unit_price: item.unit_price });
  };
  const cancelEditItem = () => setEditingItemId(null);
  const saveEditItem = async (item) => {
    if (savingEditItemRef.current) return;
    savingEditItemRef.current = true;
    setSavingEditItem(true);
    try {
      const payload = { quantity: editItemVals.quantity, unit_price: editItemVals.unit_price };
      if (item.item_type === 'free_line') payload.product_name = editItemVals.product_name;
      await updateItem(id, item.id, payload);
      setEditingItemId(null);
    } catch { /* el store ya muestra el toast de error */ }
    finally {
      savingEditItemRef.current = false;
      setSavingEditItem(false);
    }
  };

  const [generatingSale, setGeneratingSale] = useState(false);
  const [sendingWA, setSendingWA]            = useState(false);
  const [copyingLink, setCopyingLink]        = useState(false);
  // Modal de tipo de documento al generar venta desde OT
  const [showGenSaleModal, setShowGenSaleModal] = useState(false);
  // Se abre si generateSale (o el reintento tras completarlo) responde
  // DIAN_CUSTOMER_INCOMPLETE -- ver customerDianReadiness.js en el backend.
  const [dianIncompleteModal, setDianIncompleteModal] = useState(null); // { customerId, missingFields, docType } | null
  // Edición de km de salida
  const [editingMileageOut, setEditingMileageOut] = useState(false);
  const [mileageOutVal, setMileageOutVal]         = useState('');
  const [savingMileageOut, setSavingMileageOut]   = useState(false);
  // Edición de diagnóstico / trabajo realizado
  const [editingDiagnosis, setEditingDiagnosis]         = useState(false);
  const [diagnosisVal, setDiagnosisVal]                 = useState('');
  const [savingDiagnosis, setSavingDiagnosis]           = useState(false);
  const [editingWorkPerformed, setEditingWorkPerformed] = useState(false);
  const [workPerformedVal, setWorkPerformedVal]         = useState('');
  const [savingWorkPerformed, setSavingWorkPerformed]   = useState(false);

  const handleSendWhatsApp = async () => {
    const win = window.open('', '_blank');
    setSendingWA(true);
    try {
      const res = await workOrdersApi.sendWhatsApp(id);
      const { waLink } = res.data;
      if (waLink && win) {
        win.location.href = waLink;
        toast.success('Se abrió WhatsApp con el enlace de la OT. Presiona Enviar ↑', { duration: 5000 });
      } else {
        win?.close();
        toast.error('No se pudo generar el enlace de WhatsApp.');
      }
    } catch (e) {
      win?.close();
      const msg = e.response?.data?.message || e.message || 'Error al generar enlace de WhatsApp';
      toast.error(msg, { duration: 6000 });
    } finally {
      setSendingWA(false);
    }
  };

  const handleCopyLink = async () => {
    setCopyingLink(true);
    try {
      const res = await workOrdersApi.generateShareToken(id);
      const shareUrl = res.data?.data?.share_url;
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Enlace copiado al portapapeles');
      } else {
        toast.error('No se pudo generar el enlace.');
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Error al generar el enlace';
      toast.error(msg);
    } finally {
      setCopyingLink(false);
    }
  };

  const [sendingQuote, setSendingQuote] = useState(false);
  const [resendingQuoteId, setResendingQuoteId] = useState(null);
  const [applyingQuoteId, setApplyingQuoteId] = useState(null);
  const [showApprovedItems, setShowApprovedItems] = useState(false);

  const handleSendQuoteRequest = async () => {
    const win = window.open('', '_blank');
    setSendingQuote(true);
    try {
      const data = await sendQuoteRequest(id);
      if (data?.whatsapp_url && win) {
        win.location.href = data.whatsapp_url;
      } else {
        win?.close();
      }
    } catch {
      win?.close();
    } finally {
      setSendingQuote(false);
    }
  };

  const handleResendQuoteRequest = async (quoteRequestId) => {
    const win = window.open('', '_blank');
    setResendingQuoteId(quoteRequestId);
    try {
      const data = await resendQuoteRequest(id, quoteRequestId);
      if (data?.whatsapp_url && win) {
        win.location.href = data.whatsapp_url;
      } else {
        win?.close();
      }
    } catch {
      win?.close();
    } finally {
      setResendingQuoteId(null);
    }
  };

  const handleApplyApprovedItems = async (quoteRequestId) => {
    setApplyingQuoteId(quoteRequestId);
    try {
      await applyApprovedItems(id, quoteRequestId);
    } finally {
      setApplyingQuoteId(null);
    }
  };

  const photoInCameraRef   = useRef(null);
  const photoInGalleryRef  = useRef(null);
  const photoOutCameraRef  = useRef(null);
  const photoOutGalleryRef = useRef(null);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(null); // 'in' | 'out' | null

  useEffect(() => { fetchOrder(id); fetchFeatures(); }, [id]);

  // Búsqueda debounced (con filtro vehicular si la OT tiene vehículo)
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const vehicleParams = {};
        if (order?.vehicle?.brand && order?.vehicle?.model) {
          vehicleParams.applies_to_brand = order.vehicle.brand;
          vehicleParams.applies_to_line = order.vehicle.model;
          if (order.vehicle.year) vehicleParams.applies_to_year = order.vehicle.year;
        }
        let results = await searchProducts(searchTerm, vehicleParams);
        results = Array.isArray(results) ? results : [];

        // Verificar equivalentes para productos con stock 0
        const zeroStockIds = results.filter(p => parseFloat(p.current_stock || 0) <= 0 && p.track_inventory && p.product_type !== 'service').map(p => p.id);
        if (zeroStockIds.length > 0) {
          try {
            const { equivalencesAPI } = await import('../../api/equivalences');
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
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, order?.vehicle]);

  const handleSelectProduct = (product) => {
    setNewItem(prev => ({
      ...prev,
      product_id:   product.id,
      product_name: product.name,
      unit_price:   product.base_price || '',
      item_type:    product.is_labor ? 'mano_obra' : (product.product_type === 'service' ? 'servicio' : 'repuesto'),
    }));
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleBarcodeScan = async (code) => {
    setShowScanner(false);
    try {
      const res = await productsAPI.getByBarcode(code);
      if (res?.data) {
        handleSelectProduct(res.data);
        setShowAddItem(true);
        if (navigator.vibrate) navigator.vibrate(200);
      } else {
        toast.error(`Código "${code}" no corresponde a ningún producto registrado.`);
      }
    } catch {
      toast.error(`No se encontró ningún producto con el código "${code}". Verifica que esté registrado en el inventario.`);
    }
  };

  const resetAddForm = () => {
    setNewItem({ product_id: '', product_name: '', item_type: 'repuesto', quantity: 1, unit_price: '', technician_id: '', requires_approval: false });
    setSearchTerm('');
    setSearchResults([]);
    setShowAddItem(false);
  };

  const handleAddItem = async () => {
    const isFreeLine = newItem.item_type === 'free_line';
    if (isFreeLine) {
      if (!newItem.product_name.trim()) return toast.error('Escribe una descripción para la línea libre.');
    } else if (!newItem.product_id) {
      return toast.error('Debes seleccionar un producto antes de agregar.');
    }
    if (!newItem.unit_price)  return toast.error('El precio unitario es requerido. Verifica que el producto tenga un precio configurado.');
    setAddingItem(true);
    try {
      await addItem(id, {
        product_id:    isFreeLine ? undefined : newItem.product_id,
        product_name:  isFreeLine ? newItem.product_name.trim() : undefined,
        item_type:     newItem.item_type,
        quantity:      newItem.quantity,
        unit_price:    newItem.unit_price,
        technician_id: newItem.technician_id || undefined,
        requires_approval: newItem.requires_approval || undefined,
      });
      resetAddForm();
    } catch (e) {
      const data = e?.response?.data || {};
      const msg = data.message || '';
      if (msg.toLowerCase().includes('stock')) {
        if (data.alternatives && data.alternatives.length > 0) {
          setStockAlternatives(data.alternatives);
          toast.error(`Sin stock suficiente. Se encontraron ${data.alternatives.length} equivalente(s) disponible(s).`);
        } else {
          toast.error(`Sin stock suficiente: ${msg}`);
        }
      } else if (msg.toLowerCase().includes('bodega')) {
        toast.error('La OT no tiene bodega asignada. Asigna una bodega en el panel lateral antes de agregar repuestos.');
      } else {
        toast.error(msg || 'No se pudo agregar el ítem. Intenta de nuevo.');
      }
    } finally {
      setAddingItem(false);
    }
  };

  const handleGenerateSale = () => {
    setShowGenSaleModal(true);
  };

  const confirmGenerateSale = async (docType) => {
    setShowGenSaleModal(false);
    setGeneratingSale(true);
    try {
      await generateSale(id, { document_type: docType });
    } catch (e) {
      const data = e?.response?.data || {};
      const msg = data.message || '';
      if (data.code === 'DIAN_CUSTOMER_INCOMPLETE') {
        setDianIncompleteModal({ customerId: data.customerId, missingFields: data.missingFields || [], docType });
      } else if (msg.toLowerCase().includes('ítems') || msg.toLowerCase().includes('items')) {
        toast.error('La OT no tiene ítems. Agrega al menos un repuesto o servicio antes de generar el documento.');
      } else if (msg.toLowerCase().includes('estado') || msg.toLowerCase().includes('listo')) {
        toast.error('La OT debe estar en estado "Listo" para generar el documento.');
      } else if (msg.toLowerCase().includes('stock')) {
        if (data.alternatives && data.alternatives.length > 0) {
          setStockAlternatives(data.alternatives);
          toast.error(`Sin stock suficiente. Se encontraron ${data.alternatives.length} equivalente(s) disponible(s).`);
        } else {
          toast.error(`Sin stock suficiente: ${msg}`);
        }
      } else {
        toast.error(msg || 'No se pudo generar el documento. Intenta de nuevo.');
      }
    } finally {
      setGeneratingSale(false);
    }
  };

  const saveMileageOut = async () => {
    if (!mileageOutVal && mileageOutVal !== 0) return toast.error('Ingresa el kilometraje de entrega');
    const km = parseInt(mileageOutVal);
    if (isNaN(km) || km < 0) return toast.error('El kilometraje debe ser un número válido');
    setSavingMileageOut(true);
    try {
      const res = await workOrdersApiOffline.update(id, { mileage_out: km }, order?.updated_at);
      patchCurrentOrder({ mileage_out: km });
      setEditingMileageOut(false);
      toast.success(res.data.data._pendingSync ? 'Km de entrega guardado sin conexión — se sincronizará automáticamente' : 'Km de entrega guardado');
    } catch {
      toast.error('No se pudo guardar el kilometraje de entrega');
    } finally {
      setSavingMileageOut(false);
    }
  };

  const saveDiagnosis = async () => {
    setSavingDiagnosis(true);
    try {
      const res = await workOrdersApiOffline.update(id, { diagnosis: diagnosisVal.trim() }, order?.updated_at);
      patchCurrentOrder({ diagnosis: diagnosisVal.trim() });
      setEditingDiagnosis(false);
      toast.success(res.data.data._pendingSync ? 'Diagnóstico guardado sin conexión — se sincronizará automáticamente' : 'Diagnóstico guardado');
    } catch {
      toast.error('No se pudo guardar el diagnóstico');
    } finally {
      setSavingDiagnosis(false);
    }
  };

  const saveWorkPerformed = async () => {
    setSavingWorkPerformed(true);
    try {
      const res = await workOrdersApiOffline.update(id, { work_performed: workPerformedVal.trim() }, order?.updated_at);
      patchCurrentOrder({ work_performed: workPerformedVal.trim() });
      setEditingWorkPerformed(false);
      toast.success(res.data.data._pendingSync ? 'Trabajo realizado guardado sin conexión — se sincronizará automáticamente' : 'Trabajo realizado guardado');
    } catch {
      toast.error('No se pudo guardar el trabajo realizado');
    } finally {
      setSavingWorkPerformed(false);
    }
  };

  const handlePhotos = async (phase, files) => {
    if (!files.length) return;
    try {
      await uploadPhotos(id, phase, Array.from(files));
    } catch (e) {
      const msg = e?.response?.data?.message || '';
      toast.error(msg || `No se pudieron subir las fotos de ${phase === 'in' ? 'ingreso' : 'salida'}. Verifica el formato y tamaño de los archivos.`);
    }
  };

  // ── PDF handlers ────────────────────────────────────────────────
  const openPDF = async (type, params = {}) => {
    try {
      const res = await workOrdersApi.getPDF(id, type, params);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      toast.error('No se pudo generar el PDF. Si el problema persiste, recarga la página e intenta de nuevo.');
    }
  };

  // ── Checklist de ingreso ─────────────────────────────────────────
  const [showChecklist, setShowChecklist]     = useState(false);
  const [checklist,     setChecklist]         = useState({});
  const [savingChecklist, setSavingChecklist] = useState(false);

  const openChecklist = () => {
    setChecklist(order.checklist_in || {});
    setShowChecklist(true);
  };

  const saveChecklist = async () => {
    setSavingChecklist(true);
    try {
      const res = await workOrdersApiOffline.updateChecklist(id, checklist, order?.updated_at);
      // Actualizar store directamente — Sequelize no devuelve checklist_in en el refetch
      patchCurrentOrder({ checklist_in: { ...checklist } });
      setShowChecklist(false);
      toast.success(res.data.data._pendingSync ? 'Inventario guardado sin conexión — se sincronizará automáticamente' : 'Inventario guardado');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo guardar el inventario de ingreso. Intenta de nuevo.');
    } finally {
      setSavingChecklist(false);
    }
  };

  const setCL = (key, val) => setChecklist(p => ({ ...p, [key]: val }));

  // ── Control de calidad (previo a la entrega) ──────────────────────
  const [savingQC, setSavingQC] = useState(false);
  const QC_ITEMS = [
    { key: 'limpieza_final',       label: 'Limpieza final' },
    { key: 'torques_finales',      label: 'Torques finales' },
    { key: 'entrega_repuestos',    label: 'Entrega de repuestos' },
  ];
  const toggleQC = async (key) => {
    const current = !!(order.quality_checklist || {})[key];
    const next = { ...(order.quality_checklist || {}), [key]: !current };
    setSavingQC(true);
    patchCurrentOrder({ quality_checklist: next }); // optimista
    try {
      await workOrdersApiOffline.update(id, { quality_checklist: { [key]: !current } }, order?.updated_at);
    } catch (e) {
      patchCurrentOrder({ quality_checklist: order.quality_checklist }); // revertir
      toast.error(e?.response?.data?.message || 'No se pudo guardar el control de calidad');
    } finally {
      setSavingQC(false);
    }
  };

  // ── Estado técnico ────────────────────────────────────────────
  const [technicians,      setTechnicians]      = useState([]);
  const [editingTech,      setEditingTech]      = useState(false);
  const [selectedTechId,   setSelectedTechId]   = useState('');
  const [savingTech,       setSavingTech]        = useState(false);

  // ── Estado bodega ─────────────────────────────────────────────
  const [warehouses,       setWarehouses]        = useState([]);
  const [editingWarehouse, setEditingWarehouse]  = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [savingWarehouse,  setSavingWarehouse]   = useState(false);

  // ── Estado cliente ────────────────────────────────────────────
  const [customers,        setCustomers]         = useState([]);
  const [editingCustomer,  setEditingCustomer]   = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [savingCustomer,   setSavingCustomer]    = useState(false);

  useEffect(() => {
    axios.get('/users?limit=100&role=technician').then(r => {
      const list = r.data.data?.users || r.data.users || r.data.data || [];
      setTechnicians(Array.isArray(list) ? list.filter(t => t.is_active !== false) : []);
    }).catch(() => {});
    axios.get('/inventory/warehouses').then(r => {
      setWarehouses(r.data.data || []);
    }).catch(() => {});
    axios.get('/customers?limit=500').then(r => {
      setCustomers(r.data.data || []);
    }).catch(() => {});
  }, []);

  const saveTechnician = async () => {
    setSavingTech(true);
    try {
      const res = await workOrdersApiOffline.update(id, { technician_id: selectedTechId || null }, order?.updated_at);
      if (res.data.data._pendingSync) {
        patchCurrentOrder({ technician_id: selectedTechId || null });
        toast.success('Técnico guardado sin conexión — se sincronizará automáticamente');
      } else {
        await fetchOrder(id);
        toast.success('Técnico actualizado');
      }
      setEditingTech(false);
    } catch {
      toast.error('No se pudo actualizar el técnico. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setSavingTech(false);
    }
  };

  const saveCustomer = async () => {
    // customer_id es obligatorio desde la creación (ver workOrders.controller#create) --
    // no se ofrece "Quitar cliente" acá, solo cambiarlo por otro existente.
    if (!selectedCustomerId) return toast.error('Debes seleccionar un cliente de la lista.');
    setSavingCustomer(true);
    try {
      const res = await workOrdersApiOffline.update(id, { customer_id: selectedCustomerId }, order?.updated_at);
      if (res.data.data._pendingSync) {
        patchCurrentOrder({ customer_id: selectedCustomerId });
        toast.success('Cliente guardado sin conexión — se sincronizará automáticamente');
      } else {
        await fetchOrder(id);
        toast.success('Cliente actualizado');
      }
      setEditingCustomer(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar el cliente. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setSavingCustomer(false);
    }
  };

  const saveWarehouse = async () => {
    if (!selectedWarehouseId) return toast.error('Debes seleccionar una bodega de la lista.');
    setSavingWarehouse(true);
    try {
      const res = await workOrdersApiOffline.update(id, { warehouse_id: selectedWarehouseId }, order?.updated_at);
      if (res.data.data._pendingSync) {
        patchCurrentOrder({ warehouse_id: selectedWarehouseId });
        toast.success('Bodega guardada sin conexión — se sincronizará automáticamente');
      } else {
        await fetchOrder(id);
        toast.success('Bodega asignada');
      }
      setEditingWarehouse(false);
    } catch {
      toast.error('No se pudo asignar la bodega. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setSavingWarehouse(false);
    }
  };

  // ── Loading / Not found ──
  if (orderLoading) {
    return (
      <Layout>
        <div className="p-10 text-center text-gray-400 dark:text-gray-500">Cargando orden...</div>
      </Layout>
    );
  }
  if (!order) {
    return (
      <Layout>
        <div className="p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Orden no encontrada</p>
          <button onClick={() => navigate('/workshop/work-orders')} className="text-blue-600 dark:text-blue-400 underline text-sm">
            Volver al listado
          </button>
        </div>
      </Layout>
    );
  }

  const sc         = STATUS_CONFIG[order.status] || STATUS_CONFIG.recibido;
  // 'listo' ahora también bloquea edición (ver revertStatus en el backend) --
  // solo se puede seguir editando en recibido/en_proceso/en_espera.
  const isClosed   = ['listo', 'entregado', 'cancelado'].includes(order.status);
  const isLocked   = ['listo', 'entregado'].includes(order.status); // reversable por admin
  const StatusIcon = sc.icon;
  const nextStatuses = STATUS_TRANSITIONS[order.status] || [];

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/workshop/work-orders')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{order.order_number}</h1>
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                  <StatusIcon size={11} /> {sc.label}
                </span>
                {order.settled_at && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <DollarSign size={11} /> Comisión liquidada
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ingresado: {new Date(order.received_at).toLocaleDateString('es-CO')}
                {order.promised_at && ` · Entrega: ${new Date(order.promised_at).toLocaleDateString('es-CO')}`}
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            {/* listo->entregado sigue permitido aunque 'listo' ya esté bloqueada para
                edición -- isClosed no aplica acá, solo el terminal real (entregado/cancelado) */}
            {!['entregado', 'cancelado'].includes(order.status) && nextStatuses.map(s => (
              <button key={s} onClick={() => {
                if (s === 'listo') {
                  const hasAnyItem = order.items?.some(
                    i => i.item_type === 'repuesto' || i.item_type === 'servicio' || i.item_type === 'mano_de_obra' || i.item_type === 'mano_obra'
                  );
                  if (!hasAnyItem) {
                    toast.error('La OT debe tener al menos un repuesto o servicio antes de marcarla como Lista');
                    return;
                  }
                }
                changeStatus(id, s);
              }}
                className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-white/10 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition">
                → {STATUS_CONFIG[s].label}
              </button>
            ))}
            {!isClosed && (
              <button
                onClick={() => {
                  const itemsConStock = order.items?.filter(i => i.item_type === 'repuesto' && i.inventory_movement_id) || [];
                  const msg = itemsConStock.length > 0
                    ? `¿Cancelar la OT ${order.order_number}?\n\nSe devolverán al inventario ${itemsConStock.length} repuesto(s) descontados:\n${itemsConStock.map(i => `• ${i.product_name} (×${parseFloat(i.quantity)})`).join('\n')}\n\nEsta acción no se puede deshacer.`
                    : `¿Cancelar la OT ${order.order_number}?\n\nEsta acción no se puede deshacer.`;
                  if (window.confirm(msg)) changeStatus(id, 'cancelado');
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                Cancelar OT
              </button>
            )}
            {['listo', 'entregado'].includes(order.status) && !order.sale_id && (
              <button onClick={handleGenerateSale} disabled={generatingSale}
                className="px-4 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 flex items-center gap-1.5 transition">
                <FileText size={13} />
                {generatingSale ? 'Generando...' : 'Generar Documento'}
              </button>
            )}
            {order.sale_id && (
              <button onClick={() => navigate(`/sales/${order.sale_id}`)}
                className="px-4 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40 dark:hover:bg-blue-900/50 flex items-center gap-1.5 transition">
                <FileText size={13} /> Ver Remisión {order.sale?.sale_number}
              </button>
            )}
            {isLocked && canRevert && (
              <button onClick={openRevertModal}
                className="px-4 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/40 dark:hover:bg-amber-900/50 flex items-center gap-1.5 transition">
                <AlertTriangle size={13} /> Reversar estado
              </button>
            )}

            {/* ── Separador ── */}
            <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1" />

            {/* ── Botones PDF ── */}
            <button onClick={openChecklist}
              className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/40 dark:hover:bg-purple-900/50 flex items-center gap-1.5 transition"
              title="Inventario de ingreso">
              <ClipboardList size={13} /> Inventario
            </button>
            <button onClick={() => openPDF('intake')}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 dark:bg-graphite-2 dark:text-gray-300 dark:border-white/10 dark:hover:bg-white/10 flex items-center gap-1.5 transition"
              title="Imprimir orden de ingreso">
              <Printer size={13} /> Ingreso
            </button>
            {!hidePrices && (
              <button onClick={() => openPDF('workorder')}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40 dark:hover:bg-blue-900/50 flex items-center gap-1.5 transition"
                title="Imprimir OT completa">
                <Download size={13} /> OT
              </button>
            )}
            <button onClick={() => openPDF('technician')}
              className="px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/40 dark:hover:bg-orange-900/50 flex items-center gap-1.5 transition"
              title="Hoja para el técnico — sin precios, para dejar en el vehículo">
              <Wrench size={13} /> Hoja técnico
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-4">

            {/* Vehículo */}
            <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Car size={15} className="text-blue-600" />
                <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Vehículo</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div><span className="text-gray-400 dark:text-gray-500 text-xs block">Placa</span>
                  <p className="font-mono font-bold text-gray-900">{order.vehicle?.plate}</p></div>
                <div><span className="text-gray-400 dark:text-gray-500 text-xs block">Marca / Modelo</span>
                  <p className="font-medium">{order.vehicle?.brand} {order.vehicle?.model}</p></div>
                <div><span className="text-gray-400 dark:text-gray-500 text-xs block">Año</span>
                  <p className="font-medium">{order.vehicle?.year || '—'}</p></div>
                <div><span className="text-gray-400 dark:text-gray-500 text-xs block">Color</span>
                  <p className="font-medium">{order.vehicle?.color || '—'}</p></div>
                <div><span className="text-gray-400 dark:text-gray-500 text-xs block">Km entrada</span>
                  <p className="font-medium">{order.mileage_in?.toLocaleString() || '—'}</p></div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500 text-xs block">Km salida</span>
                  {editingMileageOut ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <NumericInput
                        value={mileageOutVal}
                        onChange={e => setMileageOutVal(e.target.value)}
                        placeholder="Ej: 87500"
                        autoFocus
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button onClick={saveMileageOut} disabled={savingMileageOut}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
                        {savingMileageOut ? '...' : '✓'}
                      </button>
                      <button onClick={() => setEditingMileageOut(false)}
                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{order.mileage_out ? order.mileage_out.toLocaleString() : '—'}</p>
                      {!isClosed && (
                        <button
                          onClick={() => { setMileageOutVal(order.mileage_out || ''); setEditingMileageOut(true); }}
                          className="text-xs text-blue-500 hover:text-blue-700 underline">
                          {order.mileage_out ? 'Editar' : 'Registrar'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trabajo */}
            <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wrench size={15} className="text-blue-600" />
                <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Trabajo</h2>
              </div>
              <div className="space-y-3 text-sm">
                {order.problem_description && (
                  <div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Problema reportado</span>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-2">{order.problem_description}</p>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">Diagnóstico</span>
                    {!isClosed && !editingDiagnosis && (
                      <button
                        onClick={() => { setDiagnosisVal(order.diagnosis || ''); setEditingDiagnosis(true); }}
                        className="text-xs text-blue-500 hover:text-blue-700 underline">
                        {order.diagnosis ? 'Editar' : 'Agregar'}
                      </button>
                    )}
                  </div>
                  {editingDiagnosis ? (
                    <div className="space-y-1.5">
                      <textarea
                        value={diagnosisVal}
                        onChange={e => setDiagnosisVal(e.target.value)}
                        placeholder="Ej: Se detecta desgaste en pastillas de freno delanteras..."
                        rows={3}
                        autoFocus
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                      />
                      <div className="flex gap-2">
                        <button onClick={saveDiagnosis} disabled={savingDiagnosis}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
                          {savingDiagnosis ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button onClick={() => setEditingDiagnosis(false)}
                          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    order.diagnosis
                      ? <p className="text-gray-700 bg-gray-50 rounded-lg p-2 dark:bg-white/5 dark:text-gray-300 whitespace-pre-wrap">{order.diagnosis}</p>
                      : <p className="text-gray-400 text-xs">Sin diagnóstico registrado</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">Trabajo realizado / Observaciones</span>
                    {!isClosed && !editingWorkPerformed && (
                      <button
                        onClick={() => { setWorkPerformedVal(order.work_performed || ''); setEditingWorkPerformed(true); }}
                        className="text-xs text-blue-500 hover:text-blue-700 underline">
                        {order.work_performed ? 'Editar' : 'Agregar'}
                      </button>
                    )}
                  </div>
                  {editingWorkPerformed ? (
                    <div className="space-y-1.5">
                      <textarea
                        value={workPerformedVal}
                        onChange={e => setWorkPerformedVal(e.target.value)}
                        placeholder="Ej: Se cambian pastillas y se rectifican discos delanteros..."
                        rows={3}
                        autoFocus
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                      />
                      <div className="flex gap-2">
                        <button onClick={saveWorkPerformed} disabled={savingWorkPerformed}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
                          {savingWorkPerformed ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button onClick={() => setEditingWorkPerformed(false)}
                          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    order.work_performed
                      ? <p className="text-gray-700 bg-gray-50 rounded-lg p-2 dark:bg-white/5 dark:text-gray-300 whitespace-pre-wrap">{order.work_performed}</p>
                      : <p className="text-gray-400 text-xs">Sin trabajo/observaciones registradas</p>
                  )}
                </div>
              </div>
            </div>

            {/* Mapa de intervención (diagramas interactivos) */}
            <DiagramMapEditor
              workOrderId={order.id}
              vehicleType={order.vehicle?.vehicle_type}
              disabled={isClosed}
            />

            {/* Repuestos & Servicios */}
            <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-blue-600" />
                  <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Repuestos & Servicios</h2>
                </div>
                {!isClosed && (
                  <button
                    onClick={() => { setShowAddItem(v => !v); if (showAddItem) resetAddForm(); }}
                    className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-700">
                    <Plus size={13} /> Agregar
                  </button>
                )}
              </div>

              {/* Formulario agregar ítem */}
              {showAddItem && (
                <div className="mb-4 p-3 bg-blue-50 rounded-xl space-y-3 border border-blue-100">

                  {/* Línea libre: sin producto de catálogo, se escribe la descripción a mano */}
                  {newItem.item_type === 'free_line' ? (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
                      <input
                        autoFocus
                        type="text"
                        value={newItem.product_name}
                        onChange={e => setNewItem(p => ({ ...p, product_name: e.target.value }))}
                        placeholder="Descripción del ítem..."
                        className={inputCls}
                      />
                      <p className="text-xs text-indigo-600 mt-1">Línea libre · No mueve inventario</p>
                    </div>
                  ) : (
                  /* Búsqueda */
                  <div className="relative">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Buscar producto</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          autoFocus
                          type="text"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          placeholder="Nombre, SKU o código de barras..."
                          className={inputCls}
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setShowScanner(true)}
                        title="Escanear código de barras"
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 flex-shrink-0 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none"
                          viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4m6-18h4a2 2 0 012 2v4m0 6v4a2 2 0 01-2 2h-4M9 9h1v1H9zm5 0h1v1h-1zm-5 5h1v1H9zm5 0h1v1h-1z" />
                        </svg>
                      </button>
                    </div>

                    {/* Producto seleccionado */}
                    {newItem.product_id && (
                      <div className="mt-2 flex items-center justify-between bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs">
                        <span>✓ <strong>{newItem.product_name}</strong></span>
                        <button
                          onClick={() => setNewItem(p => ({ ...p, product_id: '', product_name: '', unit_price: '' }))}
                          className="text-green-500 hover:text-red-500 ml-2 font-bold">✕
                        </button>
                      </div>
                    )}

                    {/* Sin resultados */}
                    {!newItem.product_id && searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-3">No se encontraron productos</p>
                    )}

                    {/* Lista de resultados — overlay más ancho que el campo de búsqueda
                        (se sale de la columna de 2/3 del grid en pantallas grandes) para
                        que quepa cómodo el costo interno junto al precio y el stock. */}
                    {!newItem.product_id && searchResults.length > 0 && (
                      <div className="absolute z-20 mt-1 left-0 w-full xl:w-[150%] max-h-72 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg divide-y divide-gray-50">
                        {searchResults.map(p => (
                          <button key={p.id} onClick={() => handleSelectProduct(p)}
                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition">
                            <div className="flex items-center justify-between gap-3">
                              {p.image_url && (
                                <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                  <img
                                    src={p.image_url.startsWith('http') ? p.image_url : `${import.meta.env.VITE_API_URL?.replace('/api','') ?? ''}${p.image_url}`}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.parentElement.style.display='none'; }}
                                  />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                                <p className="text-xs text-gray-400">
                                  {p.sku && <span className="mr-2">{p.sku}</span>}
                                  {p.product_type === 'service'
                                    ? <span className="text-purple-600">Servicio</span>
                                    : <span className={p.current_stock > 0 ? 'text-green-600' : 'text-red-500'}>
                                        Stock: {p.current_stock || 0}
                                      </span>
                                  }
                                  {p._equivalentsWithStock > 0 && (
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                      {p._equivalentsWithStock} equivalente(s) disponible(s)
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {p.image_url && (
                                  <button type="button"
                                    onClick={(e) => { e.stopPropagation(); setViewingImage(p); }}
                                    className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                    title="Ver imagen">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                    </svg>
                                  </button>
                                )}
                                {!hidePrices && (
                                  <div className="text-right leading-tight">
                                    <span className="block text-sm font-semibold text-blue-600">{COP(p.base_price)}</span>
                                    {/* Costo registrado — solo informativo para quien agrega el
                                        ítem (visibilidad de margen), no se guarda en el ítem de la OT. */}
                                    {p.average_cost > 0 && (
                                      <span className="block text-[11px] text-gray-400">Costo: {COP(p.average_cost)}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  )}

                  {/* Campos del ítem */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Tipo</label>
                      <select value={newItem.item_type}
                        onChange={e => setNewItem(p => {
                          const nextType = e.target.value;
                          const togglingFreeLine = (nextType === 'free_line') !== (p.item_type === 'free_line');
                          // Solo se limpia el producto/descripción al entrar o salir de
                          // "Línea libre" — entre repuesto/servicio/mano_obra se conserva
                          // el producto ya seleccionado (comportamiento previo).
                          return togglingFreeLine
                            ? { ...p, item_type: nextType, product_id: '', product_name: '', unit_price: '' }
                            : { ...p, item_type: nextType };
                        })}
                        className={inputCls}>
                        <option value="repuesto">Repuesto</option>
                        <option value="servicio">Servicio</option>
                        <option value="mano_obra">Mano de Obra</option>
                        <option value="free_line">Línea libre</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Cantidad</label>
                      <input type="number" min="0.001" step="any" value={newItem.quantity}
                        onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))}
                        className={inputCls} />
                    </div>
                    {!hidePrices && (
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-0.5 block">Precio unitario</label>
                        <NumericInput value={newItem.unit_price}
                          onChange={e => setNewItem(p => ({ ...p, unit_price: e.target.value }))}
                          className={inputCls} />
                      </div>
                    )}
                    <label className="col-span-2 flex items-center gap-2 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newItem.requires_approval}
                        onChange={e => setNewItem(p => ({ ...p, requires_approval: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-amber-700">
                        Requiere aprobación del cliente <span className="text-amber-500">(no descuenta inventario hasta que apruebe)</span>
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAddItem}
                      disabled={(newItem.item_type === 'free_line' ? !newItem.product_name.trim() : !newItem.product_id) || addingItem}
                      className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                      {addingItem ? 'Agregando...' : 'Agregar ítem'}
                    </button>
                    <button onClick={resetAddForm}
                      className="text-gray-500 text-xs px-3 py-2 hover:bg-gray-100 rounded-lg transition">
                      Cancelar
                    </button>
                  </div>

                  {/* Alternativas de equivalencia cuando no hay stock */}
                  {stockAlternatives.length > 0 && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
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
                              setNewItem(p => ({
                                ...p,
                                product_id: alt.product_id,
                                product_name: alt.name,
                                unit_price: alt.sale_price || p.unit_price
                              }));
                              setStockAlternatives([]);
                            }}
                            className="w-full flex items-center justify-between p-2 bg-white border border-amber-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-left"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{alt.name}</p>
                              <p className="text-xs text-gray-500">{alt.sku} · Stock: <span className="text-green-600 font-medium">{alt.available_stock}</span></p>
                            </div>
                            <span className="text-xs font-medium text-blue-600">Seleccionar</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Lista ítems */}
              {(!order.items || order.items.length === 0) ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin ítems aún</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {order.items.map(item => {
                    const isPending = (item.approval_status || 'aprobado') === 'pendiente';
                    const isEditingThis = editingItemId === item.id;
                    return (
                    <div key={item.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            item.item_type === 'repuesto'
                              ? 'bg-orange-100 text-orange-700'
                              : item.item_type === 'mano_obra'
                                ? 'bg-blue-100 text-blue-700'
                                : item.item_type === 'free_line'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.item_type === 'mano_obra'
                              ? 'Mano de obra'
                              : item.item_type === 'free_line'
                                ? 'Línea libre'
                                : item.item_type}
                          </span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                            {item.product_name || item.product?.name}
                          </span>
                          {isPending && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700">
                              {item.quote_request_id ? 'Cotización enviada' : 'Pendiente de enviar'}
                            </span>
                          )}
                          {item.approval_status === 'rechazado' && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-700">
                              Rechazado por el cliente
                            </span>
                          )}
                        </div>
                        {!isEditingThis && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {hidePrices ? `Cantidad: ${item.quantity}` : <>{item.quantity} × {COP(item.unit_price)}</>}
                            {!hidePrices && !hideWorkOrderTax && parseFloat(item.tax_amount) > 0 && (
                              <> · IVA {COP(item.tax_amount)}</>
                            )}
                            {item.item_technician && (
                              <span className="ml-2 text-blue-500">
                                · {item.item_technician.first_name} {item.item_technician.last_name}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!hidePrices && (
                          <span className="text-sm font-semibold text-gray-900">{COP(item.total)}</span>
                        )}
                        {!isClosed && isPending && !isEditingThis && (
                          <button onClick={() => startEditItem(item)}
                            className="p-1 text-gray-300 hover:text-blue-500 transition"
                            title="Editar ítem pendiente">
                            <Pencil size={14} />
                          </button>
                        )}
                        {!isClosed && (
                          <button onClick={() => removeItem(id, item.id)}
                            className="p-1 text-gray-300 hover:text-red-500 transition">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    {isEditingThis && (
                      <div className="mt-2 p-2.5 bg-gray-50 dark:bg-graphite-2 rounded-lg flex flex-wrap items-end gap-2">
                        {item.item_type === 'free_line' && (
                          <input type="text" value={editItemVals.product_name}
                            onChange={e => setEditItemVals(v => ({ ...v, product_name: e.target.value }))}
                            placeholder="Descripción" className={`${inputCls} flex-1 min-w-[140px] !py-1.5`} />
                        )}
                        <NumericInput value={editItemVals.quantity}
                          onChange={e => setEditItemVals(vals => ({ ...vals, quantity: e.target.value }))}
                          placeholder="Cantidad" className={`${inputCls} w-20 !py-1.5`} />
                        {!hidePrices && (
                          <NumericInput value={editItemVals.unit_price}
                            onChange={e => setEditItemVals(vals => ({ ...vals, unit_price: e.target.value }))}
                            placeholder="Precio" className={`${inputCls} w-28 !py-1.5`} />
                        )}
                        <button onClick={() => saveEditItem(item)} disabled={savingEditItem}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                          {savingEditItem ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button onClick={cancelEditItem} disabled={savingEditItem}
                          className="text-xs text-gray-500 px-2 py-1.5 hover:text-gray-700">
                          Cancelar
                        </button>
                      </div>
                    )}
                    </div>
                    );
                  })}
                </div>
              )}

              {/* Totales — ocultos para el rol técnico */}
              {!hidePrices && order.items?.length > 0 && (() => {
                // El total real solo cuenta ítems 'aprobado' (ver calcTotals en el
                // backend). Si hay ítems 'pendiente' de aprobación del cliente, se
                // muestra además un estimado con lo que sumarían si se aprueban.
                const pendingValue = order.items
                  .filter(i => i.approval_status === 'pendiente')
                  .reduce((s, i) => s + parseFloat(i.total || 0), 0);
                const estimatedTotal = parseFloat(order.total_amount || 0) + pendingValue;

                return (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                  {hideWorkOrderTax ? (
                    /* IVA oculto: mostrar solo total (IVA incluido, no discriminado) */
                    <>
                      {parseFloat(order.discount_amount) > 0 && (
                        <div className="flex justify-between text-xs text-red-500">
                          <span>Descuento</span><span>-{COP(order.discount_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm text-gray-900 pt-1 border-t border-gray-100">
                        <span>Total</span><span>{COP(order.total_amount)}</span>
                      </div>
                    </>
                  ) : (
                    /* IVA visible: mostrar subtotal + IVA + descuento + total */
                    <>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Subtotal</span><span>{COP(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>IVA</span><span>{COP(order.tax_amount)}</span>
                      </div>
                      {parseFloat(order.discount_amount) > 0 && (
                        <div className="flex justify-between text-xs text-red-500">
                          <span>Descuento</span><span>-{COP(order.discount_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm text-gray-900 pt-1 border-t border-gray-100">
                        <span>Total</span><span>{COP(order.total_amount)}</span>
                      </div>
                    </>
                  )}
                  {pendingValue > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-dashed border-amber-200">
                      <div className="flex justify-between text-xs font-medium text-amber-700">
                        <span>Total estimado (con pendientes)</span><span>{COP(estimatedTotal)}</span>
                      </div>
                      <p className="text-[10px] text-amber-600/80 mt-0.5">
                        Incluye {COP(pendingValue)} en ítems que aún esperan aprobación del cliente — no se facturan hasta que se aprueben.
                      </p>
                    </div>
                  )}
                  {!isClosed && (
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-100">
                      {!editingDiscount ? (
                        <button onClick={startEditDiscount} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                          {parseFloat(order.discount_value) > 0 ? 'Editar descuento global' : '+ Aplicar descuento global'}
                        </button>
                      ) : (
                        <div className="flex items-end gap-2 flex-wrap">
                          <select value={discountForm.discount_type}
                            onChange={e => setDiscountForm(f => ({ ...f, discount_type: e.target.value }))}
                            className={`${inputCls} w-32 !py-1.5`}>
                            <option value="fixed">Monto ($)</option>
                            <option value="percentage">Porcentaje (%)</option>
                          </select>
                          <NumericInput value={discountForm.discount_value}
                            onChange={e => setDiscountForm(f => ({ ...f, discount_value: e.target.value }))}
                            placeholder={discountForm.discount_type === 'percentage' ? '%' : '$'}
                            className={`${inputCls} w-28 !py-1.5`} />
                          <button onClick={saveDiscount} disabled={savingDiscount}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {savingDiscount ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button onClick={() => setEditingDiscount(false)} disabled={savingDiscount}
                            className="text-xs text-gray-500 px-2 py-1.5 hover:text-gray-700">
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })()}

                {/* Botones imprimir OT desde sección ítems */}
                {order.items?.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {!hidePrices && (
                      <button onClick={() => openPDF('workorder')}
                        className="flex-1 flex items-center justify-center gap-2 text-xs text-blue-600 border border-blue-200 rounded-lg py-2 hover:bg-blue-50 transition">
                        <Download size={12}/> Descargar OT completa (PDF)
                      </button>
                    )}
                    <button onClick={() => openPDF('technician')}
                      className="flex-1 flex items-center justify-center gap-2 text-xs text-orange-600 border border-orange-200 rounded-lg py-2 hover:bg-orange-50 transition">
                      <Wrench size={12}/> Hoja para el técnico (sin precios)
                    </button>
                  </div>
                )}
            </div>

            {/* Cotizaciones con aprobación del cliente */}
            {(() => {
              const pendingUnsent = (order.items || []).filter(i => i.approval_status === 'pendiente' && !i.quote_request_id);
              const quoteRequests = order.quote_requests || [];
              if (pendingUnsent.length === 0 && quoteRequests.length === 0) return null;

              return (
                <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={15} className="text-amber-600" />
                    <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Cotizaciones</h2>
                  </div>

                  {pendingUnsent.length > 0 && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <p className="text-xs font-medium text-amber-700 mb-2">
                        {pendingUnsent.length} ítem(s) pendiente(s) de enviar a cotizar
                      </p>
                      <ul className="space-y-1 mb-3">
                        {pendingUnsent.map(i => (
                          <li key={i.id} className="text-xs text-gray-600 flex justify-between">
                            <span>{i.product_name} × {i.quantity}</span>
                            {!hidePrices && <span className="font-medium">{COP(i.total)}</span>}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={handleSendQuoteRequest}
                        disabled={sendingQuote || !order.customer}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-amber-600 rounded-lg py-2 hover:bg-amber-700 disabled:opacity-60 transition"
                        title={!order.customer ? 'La OT necesita un cliente asignado' : ''}
                      >
                        <Share2 size={12} /> {sendingQuote ? 'Enviando...' : 'Enviar cotización al cliente'}
                      </button>
                    </div>
                  )}

                  {quoteRequests.length > 0 && (
                    <div className="space-y-2">
                      {quoteRequests.map(q => {
                        const approvedUnapplied = (q.items || []).filter(
                          i => i.approval_status === 'aprobado' && i.item_type === 'repuesto' && !i.inventory_movement_id
                        );
                        return (
                          <div key={q.id} className="border border-gray-100 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                q.status === 'enviada' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {q.status === 'enviada' ? 'Esperando respuesta' : 'Respondida'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(q.sent_at).toLocaleDateString('es-CO')}
                              </span>
                            </div>
                            {q.status === 'respondida' && (
                              <p className="text-xs text-gray-500 mb-1.5">
                                {q.approved_by_name} · {new Date(q.responded_at).toLocaleDateString('es-CO')}
                              </p>
                            )}
                            <ul className="space-y-1">
                              {(q.items || []).map(i => (
                                <li key={i.id} className="text-xs flex justify-between items-center">
                                  <span className="text-gray-600">{i.product_name} × {i.quantity}</span>
                                  <span className={
                                    i.approval_status === 'aprobado' ? 'text-green-600 font-medium'
                                      : i.approval_status === 'rechazado' ? 'text-red-500 font-medium'
                                      : 'text-amber-600 font-medium'
                                  }>
                                    {i.approval_status === 'aprobado' ? 'Aprobado' : i.approval_status === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            {q.status === 'enviada' && (
                              <button
                                onClick={() => handleResendQuoteRequest(q.id)}
                                disabled={resendingQuoteId === q.id}
                                className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg py-1.5 hover:bg-blue-100 disabled:opacity-60 transition"
                                title="El cliente no ha respondido — vuelve a enviarle el mismo enlace"
                              >
                                <Share2 size={12} /> {resendingQuoteId === q.id ? 'Reenviando...' : 'Reenviar al cliente'}
                              </button>
                            )}
                            {approvedUnapplied.length > 0 && (
                              <button
                                onClick={() => handleApplyApprovedItems(q.id)}
                                disabled={applyingQuoteId === q.id}
                                className="mt-2 w-full text-xs font-medium text-white bg-green-600 rounded-lg py-1.5 hover:bg-green-700 disabled:opacity-60 transition"
                              >
                                {applyingQuoteId === q.id ? 'Aplicando...' : `Aplicar ${approvedUnapplied.length} ítem(s) aprobado(s)`}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Ítems aprobados por el cliente */}
            {(() => {
              const quoteMap = Object.fromEntries((order.quote_requests || []).map(q => [q.id, q]));
              const approvedItems = (order.items || []).filter(
                i => i.quote_request_id && i.approval_status === 'aprobado'
              );
              if (approvedItems.length === 0) return null;
              const totalApproved = approvedItems.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);

              return (
                <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
                  <button
                    onClick={() => setShowApprovedItems(v => !v)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle size={15} className="text-green-600" />
                      <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                        Ítems aprobados por el cliente ({approvedItems.length})
                      </h2>
                    </div>
                    <span className="text-xs text-blue-600 font-medium">
                      {showApprovedItems ? 'Ocultar ▲' : 'Mostrar ▼'}
                    </span>
                  </button>

                  {showApprovedItems && (
                    <div className="mt-3 divide-y divide-gray-50">
                      {approvedItems.map(i => {
                        const q = quoteMap[i.quote_request_id];
                        return (
                          <div key={i.id} className="flex items-center justify-between py-2 gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                {i.product_name || i.product?.name}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {hidePrices ? `Cantidad: ${i.quantity}` : <>{i.quantity} × {COP(i.unit_price)}</>}
                                {q?.approved_by_name && (
                                  <span className="ml-2 text-green-600">
                                    · Aprobado por {q.approved_by_name}
                                    {q.responded_at && ` (${new Date(q.responded_at).toLocaleDateString('es-CO')})`}
                                  </span>
                                )}
                              </p>
                            </div>
                            {!hidePrices && (
                              <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{COP(i.total)}</span>
                            )}
                          </div>
                        );
                      })}
                      {!hidePrices && (
                        <div className="flex justify-between pt-2 text-sm font-bold text-gray-900">
                          <span>Total aprobado</span>
                          <span>{COP(totalApproved)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Fotos */}
            {['in', 'out'].map(phase => {
              const photos     = phase === 'in' ? order.photos_in : order.photos_out;
              const cameraRef  = phase === 'in' ? photoInCameraRef  : photoOutCameraRef;
              const galleryRef = phase === 'in' ? photoInGalleryRef : photoOutGalleryRef;
              const label      = phase === 'in' ? 'Fotos de Ingreso' : 'Fotos de Salida';
              return (
                <div key={phase} className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Camera size={15} className="text-blue-600" />
                      <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{label}</h2>
                      <span className="text-xs text-gray-400">{photos?.length || 0} archivo(s)</span>
                    </div>
                    {!isClosed && (
                      <div className="relative">
                        <button
                          onClick={() => setUploadMenuOpen(uploadMenuOpen === phase ? null : phase)}
                          className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus size={12} /> Subir
                        </button>
                        {uploadMenuOpen === phase && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setUploadMenuOpen(null)} />
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                              <button
                                onClick={() => { cameraRef.current?.click(); setUploadMenuOpen(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                <Camera size={14} /> Tomar foto
                              </button>
                              <button
                                onClick={() => { galleryRef.current?.click(); setUploadMenuOpen(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                <Image size={14} /> Elegir de galería
                              </button>
                            </div>
                          </>
                        )}
                        {/* accept="image/*,video/*" combinado con capture hace que muchos
                            navegadores móviles no abran la cámara nativa (Android/iOS no
                            resuelven si debe ser foto o video). Con accept solo de imagen,
                            capture="environment" sí dispara la cámara de forma confiable.
                            Para video, el usuario puede grabarlo y adjuntarlo desde galería. */}
                        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                          onChange={e => handlePhotos(phase, e.target.files)} />
                        <input ref={galleryRef} type="file" accept="image/*,video/*" multiple className="hidden"
                          onChange={e => handlePhotos(phase, e.target.files)} />
                      </div>
                    )}
                  </div>
                  {photos?.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {photos.map((photo, idx) => {
                        const src = photo.url?.startsWith('http') ? photo.url : `${(import.meta.env.VITE_API_URL || '').replace(/\/api$/, '')}${photo.url}`;
                        return (
                          <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                            {photo.type === 'video' ? (
                              <video src={src} className="w-full h-full object-cover" controls muted />
                            ) : (
                              <img src={src} alt={`foto ${idx + 1}`} className="w-full h-full object-cover" />
                            )}
                            {!isClosed && (
                              <button onClick={() => deletePhoto(id, phase, idx)}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition">
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-3">Sin fotos</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Cliente */}
            <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-blue-600" />
                  <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Cliente</h2>
                </div>
                {!isClosed && !editingCustomer && (
                  <button
                    onClick={() => { setSelectedCustomerId(order.customer?.id || ''); setEditingCustomer(true); }}
                    className="text-xs text-blue-600 font-medium hover:underline">
                    {order.customer ? 'Cambiar' : 'Asignar'}
                  </button>
                )}
              </div>
              {editingCustomer ? (
                <div className="space-y-2">
                  <Combobox
                    placeholder="Buscar por nombre o teléfono..."
                    items={customers}
                    value={selectedCustomerId}
                    displayValue={(() => {
                      const c = customers.find(c => c.id === selectedCustomerId);
                      return c ? (c.business_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()) : '';
                    })()}
                    onSelect={c => setSelectedCustomerId(c.id)}
                    onClear={() => setSelectedCustomerId('')}
                    filterFn={(c, q) => {
                      const s = q.toLowerCase();
                      const n = (c.business_name || `${c.first_name || ''} ${c.last_name || ''}`).toLowerCase();
                      return n.includes(s) || (c.phone || '').includes(s) || (c.tax_id || '').includes(s);
                    }}
                    renderItem={c => (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                          {c.business_name || `${c.first_name || ''} ${c.last_name || ''}`}
                        </p>
                        {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                      </div>
                    )}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingCustomer(false)}
                      className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button onClick={saveCustomer} disabled={savingCustomer || !selectedCustomerId}
                      className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
                      {savingCustomer ? '...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : order.customer ? (
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    {order.customer.business_name || `${order.customer.first_name} ${order.customer.last_name}`}
                  </p>
                  {order.customer.phone && <p className="text-gray-500 text-xs mt-1">{order.customer.phone}</p>}
                  {order.customer.email && <p className="text-gray-500 text-xs">{order.customer.email}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} className="text-amber-500" />
                  <span className="text-amber-700">Sin cliente — asígnalo lo antes posible</span>
                </div>
              )}
            </div>

            {/* Técnico */}
            <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wrench size={15} className="text-blue-600" />
                  <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Técnico</h2>
                </div>
                {!isClosed && !editingTech && (
                  <button
                    onClick={() => { setSelectedTechId(order.technician?.id || ''); setEditingTech(true); }}
                    className="text-xs text-blue-600 font-medium hover:underline">
                    {order.technician ? 'Cambiar' : 'Asignar'}
                  </button>
                )}
              </div>
              {editingTech ? (
                <div className="space-y-2">
                  <Combobox
                    placeholder="Buscar técnico..."
                    items={technicians}
                    value={selectedTechId}
                    displayValue={(() => {
                      const t = technicians.find(t => t.id === selectedTechId);
                      return t ? `${t.first_name} ${t.last_name}` : '';
                    })()}
                    onSelect={t => setSelectedTechId(t.id)}
                    onClear={() => setSelectedTechId('')}
                    filterFn={(t, q) => `${t.first_name} ${t.last_name}`.toLowerCase().includes(q.toLowerCase())}
                    renderItem={t => (
                      <span className="font-medium text-gray-800 dark:text-gray-200">{t.first_name} {t.last_name}</span>
                    )}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingTech(false)}
                      className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button onClick={saveTechnician} disabled={savingTech}
                      className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
                      {savingTech ? '...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                order.technician
                  ? <p className="text-sm font-medium text-gray-900">{order.technician.first_name} {order.technician.last_name}</p>
                  : <p className="text-sm text-gray-400 italic">Sin asignar</p>
              )}
            </div>

            {/* Bodega */}
            <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-blue-600" />
                  <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Bodega de repuestos</h2>
                </div>
                {!isClosed && !editingWarehouse && (
                  <button
                    onClick={() => { setSelectedWarehouseId(order.warehouse_id || ''); setEditingWarehouse(true); }}
                    className="text-xs text-blue-600 font-medium hover:underline">
                    {order.warehouse ? 'Cambiar' : 'Asignar'}
                  </button>
                )}
              </div>
              {editingWarehouse ? (
                <div className="space-y-2">
                  <Combobox
                    placeholder="Buscar bodega..."
                    items={warehouses}
                    value={selectedWarehouseId}
                    displayValue={(() => {
                      const w = warehouses.find(w => w.id === selectedWarehouseId);
                      return w ? w.name : '';
                    })()}
                    onSelect={w => setSelectedWarehouseId(w.id)}
                    onClear={() => setSelectedWarehouseId('')}
                    filterFn={(w, q) => w.name.toLowerCase().includes(q.toLowerCase())}
                    renderItem={w => <span className="font-medium text-gray-800 dark:text-gray-200">{w.name}</span>}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingWarehouse(false)}
                      className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button onClick={saveWarehouse} disabled={savingWarehouse || !selectedWarehouseId}
                      className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
                      {savingWarehouse ? '...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                order.warehouse
                  ? <p className="text-sm font-medium text-gray-900">{order.warehouse.name}</p>
                  : (
                    <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <AlertTriangle size={12} className="text-amber-500" />
                      <span className="text-amber-700">Sin bodega — necesaria para agregar repuestos</span>
                    </div>
                  )
              )}
            </div>

            {/* Notas */}
            {order.notes && (
              <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
                <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">Notas</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{order.notes}</p>
              </div>
            )}

            {/* Remisión generada */}
            {order.sale && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={15} className="text-green-600" />
                  <h2 className="font-semibold text-sm text-green-800">Remisión Generada</h2>
                </div>
                <p className="text-sm font-mono font-bold text-green-700">{order.sale.sale_number}</p>
                {!hidePrices && <p className="text-xs text-green-600 mt-0.5">{COP(order.sale.total_amount)}</p>}
                <button onClick={() => navigate(`/sales/${order.sale_id}`)}
                  className="mt-2 text-xs text-green-700 underline hover:text-green-900">
                  Ver remisión →
                </button>
              </div>
            )}

            {/* ── Control de calidad (previo a la entrega) ── */}
            <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={15} className="text-green-600" />
                <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Control de calidad</h2>
              </div>
              <div className="space-y-2">
                {QC_ITEMS.map(({ key, label }) => {
                  const checked = !!(order.quality_checklist || {})[key];
                  const disabled = savingQC || ['entregado', 'cancelado'].includes(order.status);
                  return (
                    <label key={key}
                      className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 border ${
                        checked ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'
                      } ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-gray-100'}`}>
                      <span className="text-gray-700">{label}</span>
                      <input type="checkbox" checked={checked} disabled={disabled}
                        onChange={() => toggleQC(key)}
                        className="w-4 h-4 accent-green-600" />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ── Inventario de ingreso (resumen) ── */}
            <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ClipboardList size={15} className="text-purple-600" />
                  <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Inventario ingreso</h2>
                </div>
                <button onClick={openChecklist}
                  className="text-xs text-purple-600 font-medium hover:underline">
                  {order.checklist_in && Object.keys(order.checklist_in).length > 0 ? 'Editar' : 'Completar'}
                </button>
              </div>
              {order.checklist_in && Object.keys(order.checklist_in).length > 0 ? (
                <div className="space-y-1.5">
                  {typeof order.checklist_in.fuel_level === 'number' && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">⛽ Combustible</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {['Vacío','1/4','1/2','3/4','Lleno'][order.checklist_in.fuel_level]}
                      </span>
                    </div>
                  )}
                  {[
                    { key: 'estado_general', label: 'Estado general' },
                    { key: 'testigos',       label: 'Testigos' },
                    { key: 'espejos',        label: 'Espejos' },
                    { key: 'luces',          label: 'Luces' },
                  ].map(({ key, label }) => {
                    const v = order.checklist_in[key];
                    if (v === undefined || v === null) return null;
                    return (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{label}</span>
                        <span className={v ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                          {v ? '✓ OK' : '✗ No'}
                        </span>
                      </div>
                    );
                  })}
                  {order.checklist_in.observations && (
                    <p className="text-xs text-gray-500 italic pt-1 border-t border-gray-100 mt-1">
                      {order.checklist_in.observations.slice(0, 80)}{order.checklist_in.observations.length > 80 ? '…' : ''}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No completado aún</p>
              )}
              <div className="mt-3 flex gap-2">
                <button onClick={() => openPDF('intake')}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition">
                  <Printer size={12}/> Imprimir ingreso
                </button>
                {!hidePrices && (
                  <button onClick={() => openPDF('workorder')}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg py-1.5 hover:bg-blue-50 transition">
                    <Download size={12}/> OT PDF
                  </button>
                )}
                <button
                  onClick={handleSendWhatsApp}
                  disabled={sendingWA}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-green-700 border border-green-300 rounded-lg py-1.5 hover:bg-green-50 transition disabled:opacity-60"
                  title="Enviar enlace de estado por WhatsApp"
                >
                  <Share2 size={12}/> {sendingWA ? 'Enviando...' : 'WhatsApp'}
                </button>
                <button
                  onClick={handleCopyLink}
                  disabled={copyingLink}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition disabled:opacity-60"
                  title="Copiar enlace público de la OT"
                >
                  <Link2 size={12}/> {copyingLink ? 'Copiando...' : 'Copiar enlace'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>


            {/* BarcodeScanner — dentro de Layout para z-index correcto */}
      {showScanner && (
        <BarcodeScanner
          onDetect={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ── MODAL CHECKLIST INGRESO ─────────────────────────────── */}
      {showChecklist && (() => {
        // Solo editable en estado "recibido"
        const checklistReadonly = order.status !== 'recibido';
        const ITEMS = [
          { key: 'estado_general', label: 'Estado general' },
          { key: 'testigos',       label: 'Testigos' },
          { key: 'tanque',         label: 'Tanque combustible' },
          { key: 'espejos',        label: 'Espejos' },
          { key: 'sillin',         label: 'Sillín' },
          { key: 'luces',          label: 'Luces' },
          { key: 'carenaje',       label: 'Carenaje / plásticos' },
          { key: 'llantas',        label: 'Llantas' },
          { key: 'rele_encendido', label: 'Rele de encendido' },
        ];
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-50 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <ClipboardList size={18} className="text-purple-600" />
                  <h2 className="font-bold text-gray-900">Inventario de ingreso</h2>
                  {checklistReadonly && (
                    <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                      Solo lectura
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!checklistReadonly && (
                    <button
                      type="button"
                      onClick={() => {
                        const allOk = {};
                        ITEMS.forEach(({ key }) => { allOk[key] = true; });
                        setChecklist(prev => ({ ...prev, ...allOk }));
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-300 text-green-700 rounded-lg text-xs font-semibold transition"
                      title="Marcar todos los ítems como OK"
                    >
                      <CheckCircle size={13} /> Todo OK
                    </button>
                  )}
                  <button onClick={() => setShowChecklist(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                    ✕
                  </button>
                </div>
              </div>

              {/* Aviso readonly */}
              {checklistReadonly && (
                <div className="mx-5 mt-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                  <AlertTriangle size={13} />
                  El inventario solo puede editarse cuando la OT está en estado <strong className="ml-1">Recibido</strong>.
                </div>
              )}

              <div className="p-5 space-y-4">

                {/* Nivel de combustible */}
                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Nivel de combustible</p>
                  <div className="flex gap-2">
                    {[
                      { val: 0, label: 'Vacío' },
                      { val: 1, label: '1/4' },
                      { val: 2, label: '1/2' },
                      { val: 3, label: '3/4' },
                      { val: 4, label: 'Lleno' },
                    ].map(({ val, label }) => {
                      const active = (checklist.fuel_level ?? -1) === val;
                      return (
                        <button key={val} type="button"
                          disabled={checklistReadonly}
                          onClick={() => !checklistReadonly && setCL('fuel_level', val)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${
                            active
                              ? 'bg-green-500 text-white border-green-500'
                              : checklistReadonly
                                ? 'border-gray-100 text-gray-300 cursor-default'
                                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Items */}
                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Estado de elementos</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {ITEMS.map(({ key, label }) => {
                      const v = checklist[key]; // true | false | null | undefined
                      // undefined = sin registrar, null = N/A explícito
                      const isOk  = v === true;
                      const isBad = v === false;
                      const isNA  = v === null;
                      const isUnset = v === undefined;
                      return (
                        <div key={key} className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                          isUnset ? 'bg-gray-50' : isOk ? 'bg-green-50' : isBad ? 'bg-red-50' : 'bg-gray-50'
                        }`}>
                          <span className="text-sm text-gray-700 font-medium">{label}</span>
                          <div className="flex gap-1.5">
                            <button type="button"
                              disabled={checklistReadonly}
                              onClick={() => !checklistReadonly && setCL(key, true)}
                              className={`px-3 py-1 rounded-md text-xs font-semibold border transition ${
                                isOk
                                  ? 'bg-green-500 text-white border-green-500 shadow-sm'
                                  : checklistReadonly
                                    ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-default'
                                    : 'bg-white text-gray-400 border-gray-300 hover:border-green-400 hover:text-green-600'
                              }`}>
                              OK
                            </button>
                            <button type="button"
                              disabled={checklistReadonly}
                              onClick={() => !checklistReadonly && setCL(key, false)}
                              className={`px-3 py-1 rounded-md text-xs font-semibold border transition ${
                                isBad
                                  ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                  : checklistReadonly
                                    ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-default'
                                    : 'bg-white text-gray-400 border-gray-300 hover:border-red-400 hover:text-red-500'
                              }`}>
                              MAL
                            </button>
                            <button type="button"
                              disabled={checklistReadonly}
                              onClick={() => !checklistReadonly && setCL(key, null)}
                              className={`px-2 py-1 rounded-md text-xs font-semibold border transition ${
                                isNA
                                  ? 'bg-gray-400 text-white border-gray-400 shadow-sm'
                                  : checklistReadonly
                                    ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-default'
                                    : 'bg-white text-gray-300 border-gray-200 hover:border-gray-400 hover:text-gray-500'
                              }`}>
                              N/A
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Observaciones */}
                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Observaciones (rayones, golpes, faltantes)
                  </p>
                  <textarea
                    value={checklist.observations || ''}
                    onChange={e => !checklistReadonly && setCL('observations', e.target.value)}
                    readOnly={checklistReadonly}
                    rows={3}
                    placeholder={checklistReadonly ? '' : 'Ej: Rayón en guardabarro derecho, espejo izquierdo roto...'}
                    className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none ${
                      checklistReadonly ? 'bg-gray-50 text-gray-500 cursor-default' : 'focus:ring-2 focus:ring-purple-400'
                    }`}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-5 border-t border-gray-100 bg-white rounded-b-2xl">
                <button onClick={() => openPDF('intake')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition">
                  <Printer size={14} /> Imprimir ingreso
                </button>
                {!checklistReadonly && (
                  <button onClick={saveChecklist} disabled={savingChecklist}
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-60 transition">
                    {savingChecklist ? 'Guardando...' : 'Guardar inventario'}
                  </button>
                )}
                {checklistReadonly && (
                  <button onClick={() => setShowChecklist(false)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          </div>
        )
        })()}

        {/* ── Modal: selección de tipo de documento al generar desde OT ── */}
        {viewingImage && (
        <ProductImageViewer product={viewingImage} onClose={() => setViewingImage(null)} />
      )}

      {showGenSaleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">¿Qué documento deseas generar?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  La OT quedará marcada como <strong>Entregada</strong>
                </p>
              </div>
              <div className="p-5 space-y-3">
                {[
                  {
                    type: 'remision',
                    Icon: ClipboardDocumentListIcon,
                    label: 'Remisión',
                    desc: 'Documento de entrega. Sin efecto fiscal inmediato.',
                    color: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
                    badge: 'text-blue-700 bg-blue-100',
                  },
                  {
                    type: 'factura',
                    Icon: DocumentTextIcon,
                    label: 'Factura',
                    desc: 'Documento fiscal con validez ante la DIAN.',
                    color: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
                    badge: 'text-emerald-700 bg-emerald-100',
                  },
                ].map(({ type, Icon, label, desc, color, badge }) => (
                  <button
                    key={type}
                    disabled={generatingSale}
                    onClick={() => confirmGenerateSale(type)}
                    className={`w-full flex items-start gap-4 p-4 border-2 rounded-xl transition-all text-left disabled:opacity-60 ${color}`}
                  >
                    <Icon className="w-6 h-6 shrink-0 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{label}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge}`}>{label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={() => setShowGenSaleModal(false)}
                  className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

      {showRevertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-graphite-2 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-white/10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Reversar estado de la OT</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                La OT está bloqueada en <strong>{STATUS_CONFIG[order.status]?.label}</strong>. Al reversar podrás
                volver a editarla.
                {order.sale_id && (
                  <>
                    {' '}Tiene un documento generado
                    {order.sale?.document_type === 'factura' ? ' (factura)' : ' (remisión)'} — se anulará
                    automáticamente{order.sale?.document_type === 'factura' && order.sale?.dian_status === 'accepted'
                      ? ' mediante una nota crédito, porque ya fue aceptada por DIAN' : ''}.
                  </>
                )}
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Volver a estado</label>
                <select
                  value={revertTarget}
                  onChange={e => setRevertTarget(e.target.value)}
                  className={inputCls}
                >
                  <option value="recibido">Recibido</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="en_espera">En Espera</option>
                  {order.status === 'entregado' && <option value="listo">Listo</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Motivo (obligatorio)</label>
                <textarea
                  value={revertReason}
                  onChange={e => setRevertReason(e.target.value)}
                  rows={3}
                  placeholder="Ej: el cliente pidió agregar un repuesto adicional antes de facturar"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-2">
              <button
                onClick={() => setShowRevertModal(false)}
                disabled={reverting}
                className="flex-1 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRevert}
                disabled={reverting || !revertReason.trim()}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition disabled:opacity-60"
              >
                {reverting ? 'Reversando...' : 'Reversar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CompleteCustomerDianModal
        open={!!dianIncompleteModal}
        customerId={dianIncompleteModal?.customerId}
        missingFields={dianIncompleteModal?.missingFields || []}
        onClose={() => setDianIncompleteModal(null)}
        onCompleted={() => {
          const docType = dianIncompleteModal?.docType;
          setDianIncompleteModal(null);
          if (docType) confirmGenerateSale(docType);
        }}
      />
    </Layout>
  );
}