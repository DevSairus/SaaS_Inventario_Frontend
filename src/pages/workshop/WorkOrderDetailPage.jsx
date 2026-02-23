import { useEffect, useState, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import useWorkshopStore from '../../store/workshopStore';
import useProductsStore from '../../store/productsStore';
import useTenantStore from '../../store/tenantStore';
import { productsAPI } from '../../api/products';
import BarcodeScanner from '../../components/common/BarcodeScanner';
import {
  ArrowLeft, Wrench, Car, User, Package, Plus, Trash2,
  Camera, FileText, AlertTriangle, CheckCircle, Clock, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  recibido:   { label: 'Recibido',    color: 'bg-blue-100 text-blue-700',     icon: Clock },
  en_proceso: { label: 'En Proceso',  color: 'bg-yellow-100 text-yellow-700', icon: Wrench },
  en_espera:  { label: 'En Espera',   color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  listo:      { label: 'Listo',       color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  entregado:  { label: 'Entregado',   color: 'bg-gray-100 text-gray-600',     icon: CheckCircle },
  cancelado:  { label: 'Cancelado',   color: 'bg-red-100 text-red-600',       icon: AlertTriangle },
};

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    currentOrder: order, orderLoading,
    fetchOrder, changeStatus, addItem, removeItem, generateSale, uploadPhotos, deletePhoto,
  } = useWorkshopStore();
  const { searchProducts } = useProductsStore();
  const { features, fetchFeatures } = useTenantStore();
  const hideRemisionTax = features?.hide_remision_tax === true;

  // Búsqueda de producto
  const [searchTerm, setSearchTerm]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching]     = useState(false);
  const [showScanner, setShowScanner]     = useState(false);

  // Formulario agregar ítem
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    product_id: '', product_name: '', item_type: 'repuesto', quantity: 1, unit_price: '',
  });
  const [addingItem, setAddingItem] = useState(false);

  const [generatingSale, setGeneratingSale] = useState(false);

  const photoInRef  = useRef(null);
  const photoOutRef = useRef(null);

  useEffect(() => { fetchOrder(id); fetchFeatures(); }, [id]);

  // Búsqueda debounced
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchProducts(searchTerm);
        setSearchResults(Array.isArray(results) ? results : []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectProduct = (product) => {
    setNewItem(prev => ({
      ...prev,
      product_id:   product.id,
      product_name: product.name,
      unit_price:   product.base_price || '',
      item_type:    product.product_type === 'service' ? 'servicio' : 'repuesto',
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
        toast.error('Producto no encontrado: ' + code);
      }
    } catch {
      toast.error('Producto no encontrado: ' + code);
    }
  };

  const resetAddForm = () => {
    setNewItem({ product_id: '', product_name: '', item_type: 'repuesto', quantity: 1, unit_price: '' });
    setSearchTerm('');
    setSearchResults([]);
    setShowAddItem(false);
  };

  const handleAddItem = async () => {
    if (!newItem.product_id) return toast.error('Selecciona un producto');
    if (!newItem.unit_price)  return toast.error('Ingresa el precio');
    setAddingItem(true);
    try {
      await addItem(id, {
        product_id: newItem.product_id,
        item_type:  newItem.item_type,
        quantity:   newItem.quantity,
        unit_price: newItem.unit_price,
      });
      resetAddForm();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al agregar ítem');
    } finally {
      setAddingItem(false);
    }
  };

  const handleGenerateSale = async () => {
    if (!window.confirm('¿Generar remisión desde esta OT? La OT quedará marcada como entregada.')) return;
    setGeneratingSale(true);
    try {
      await generateSale(id); // el store ya muestra el toast
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al generar remisión');
    } finally {
      setGeneratingSale(false);
    }
  };

  const handlePhotos = async (phase, files) => {
    if (!files.length) return;
    try {
      await uploadPhotos(id, phase, Array.from(files));
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al subir fotos');
    }
  };

  // ── Loading / Not found ──
  if (orderLoading) {
    return (
      <Layout>
        <div className="p-10 text-center text-gray-400">Cargando orden...</div>
      </Layout>
    );
  }
  if (!order) {
    return (
      <Layout>
        <div className="p-10 text-center">
          <p className="text-gray-500 mb-4">Orden no encontrada</p>
          <button onClick={() => navigate('/workshop/work-orders')} className="text-blue-600 underline text-sm">
            Volver al listado
          </button>
        </div>
      </Layout>
    );
  }

  const sc         = STATUS_CONFIG[order.status] || STATUS_CONFIG.recibido;
  const isClosed   = ['entregado', 'cancelado'].includes(order.status);
  const StatusIcon = sc.icon;
  const nextStatuses = STATUS_TRANSITIONS[order.status] || [];

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/workshop/work-orders')}
              className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{order.order_number}</h1>
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                  <StatusIcon size={11} /> {sc.label}
                </span>
                {order.settled_at && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    <DollarSign size={11} /> Comisión liquidada
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Ingresado: {new Date(order.received_at).toLocaleDateString('es-CO')}
                {order.promised_at && ` · Entrega: ${new Date(order.promised_at).toLocaleDateString('es-CO')}`}
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {!isClosed && nextStatuses.map(s => (
              <button key={s} onClick={() => changeStatus(id, s)}
                className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                → {STATUS_CONFIG[s].label}
              </button>
            ))}
            {!isClosed && (
              <button onClick={() => changeStatus(id, 'cancelado')}
                className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">
                Cancelar OT
              </button>
            )}
            {['listo', 'entregado'].includes(order.status) && !order.sale_id && (
              <button onClick={handleGenerateSale} disabled={generatingSale}
                className="px-4 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 flex items-center gap-1.5 transition">
                <FileText size={13} />
                {generatingSale ? 'Generando...' : 'Generar Remisión'}
              </button>
            )}
            {order.sale_id && (
              <button onClick={() => navigate(`/sales/${order.sale_id}`)}
                className="px-4 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 transition">
                <FileText size={13} /> Ver Remisión {order.sale?.sale_number}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-4">

            {/* Vehículo */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Car size={15} className="text-blue-600" />
                <h2 className="font-semibold text-sm text-gray-800">Vehículo</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div><span className="text-gray-400 text-xs block">Placa</span>
                  <p className="font-mono font-bold text-gray-900">{order.vehicle?.plate}</p></div>
                <div><span className="text-gray-400 text-xs block">Marca / Modelo</span>
                  <p className="font-medium">{order.vehicle?.brand} {order.vehicle?.model}</p></div>
                <div><span className="text-gray-400 text-xs block">Año</span>
                  <p className="font-medium">{order.vehicle?.year || '—'}</p></div>
                <div><span className="text-gray-400 text-xs block">Color</span>
                  <p className="font-medium">{order.vehicle?.color || '—'}</p></div>
                <div><span className="text-gray-400 text-xs block">Km entrada</span>
                  <p className="font-medium">{order.mileage_in?.toLocaleString() || '—'}</p></div>
                <div><span className="text-gray-400 text-xs block">Km salida</span>
                  <p className="font-medium">{order.mileage_out?.toLocaleString() || '—'}</p></div>
              </div>
            </div>

            {/* Trabajo */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wrench size={15} className="text-blue-600" />
                <h2 className="font-semibold text-sm text-gray-800">Trabajo</h2>
              </div>
              <div className="space-y-3 text-sm">
                {order.problem_description && (
                  <div>
                    <span className="text-xs text-gray-400 block mb-1">Problema reportado</span>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-2">{order.problem_description}</p>
                  </div>
                )}
                {order.diagnosis && (
                  <div>
                    <span className="text-xs text-gray-400 block mb-1">Diagnóstico</span>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-2">{order.diagnosis}</p>
                  </div>
                )}
                {order.work_performed && (
                  <div>
                    <span className="text-xs text-gray-400 block mb-1">Trabajo realizado</span>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-2">{order.work_performed}</p>
                  </div>
                )}
                {!order.problem_description && !order.diagnosis && !order.work_performed && (
                  <p className="text-gray-400 text-xs">Sin descripción registrada</p>
                )}
              </div>
            </div>

            {/* Repuestos & Servicios */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-blue-600" />
                  <h2 className="font-semibold text-sm text-gray-800">Repuestos & Servicios</h2>
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

                  {/* Búsqueda */}
                  <div>
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

                    {/* Lista de resultados */}
                    {!newItem.product_id && searchResults.length > 0 && (
                      <div className="mt-1 max-h-52 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm divide-y divide-gray-50">
                        {searchResults.map(p => (
                          <button key={p.id} onClick={() => handleSelectProduct(p)}
                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                                <p className="text-xs text-gray-400">
                                  {p.sku && <span className="mr-2">{p.sku}</span>}
                                  {p.product_type === 'service'
                                    ? <span className="text-purple-600">Servicio</span>
                                    : <span className={p.current_stock > 0 ? 'text-green-600' : 'text-red-500'}>
                                        Stock: {p.current_stock || 0}
                                      </span>
                                  }
                                </p>
                              </div>
                              <span className="text-sm font-semibold text-blue-600 flex-shrink-0">
                                {COP(p.base_price)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Campos del ítem */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Tipo</label>
                      <select value={newItem.item_type}
                        onChange={e => setNewItem(p => ({ ...p, item_type: e.target.value }))}
                        className={inputCls}>
                        <option value="repuesto">Repuesto</option>
                        <option value="servicio">Servicio</option>
                        <option value="mano_obra">Mano de Obra</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-0.5 block">Cantidad</label>
                      <input type="number" min="0.001" step="any" value={newItem.quantity}
                        onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))}
                        className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 mb-0.5 block">Precio unitario</label>
                      <input type="number" min="0" value={newItem.unit_price}
                        onChange={e => setNewItem(p => ({ ...p, unit_price: e.target.value }))}
                        className={inputCls} />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={handleAddItem} disabled={!newItem.product_id || addingItem}
                      className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                      {addingItem ? 'Agregando...' : 'Agregar ítem'}
                    </button>
                    <button onClick={resetAddForm}
                      className="text-gray-500 text-xs px-3 py-2 hover:bg-gray-100 rounded-lg transition">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Lista ítems */}
              {(!order.items || order.items.length === 0) ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin ítems aún</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2.5 gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            item.item_type === 'repuesto'
                              ? 'bg-orange-100 text-orange-700'
                              : item.item_type === 'mano_obra'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.item_type === 'mano_obra' ? 'Mano de obra' : item.item_type}
                          </span>
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {item.product_name || item.product?.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.quantity} × {COP(item.unit_price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-900">{COP(item.total)}</span>
                        {!isClosed && (
                          <button onClick={() => removeItem(id, item.id)}
                            className="p-1 text-gray-300 hover:text-red-500 transition">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totales */}
              {order.items?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                  {hideRemisionTax ? (
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
                </div>
              )}
            </div>

            {/* Fotos */}
            {['in', 'out'].map(phase => {
              const photos = phase === 'in' ? order.photos_in : order.photos_out;
              const ref    = phase === 'in' ? photoInRef : photoOutRef;
              const label  = phase === 'in' ? 'Fotos de Ingreso' : 'Fotos de Salida';
              return (
                <div key={phase} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Camera size={15} className="text-blue-600" />
                      <h2 className="font-semibold text-sm text-gray-800">{label}</h2>
                      <span className="text-xs text-gray-400">{photos?.length || 0} foto(s)</span>
                    </div>
                    {!isClosed && (
                      <>
                        <button onClick={() => ref.current?.click()}
                          className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
                          <Plus size={12} /> Subir
                        </button>
                        <input ref={ref} type="file" accept="image/*" multiple className="hidden"
                          onChange={e => handlePhotos(phase, e.target.files)} />
                      </>
                    )}
                  </div>
                  {photos?.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {photos.map((photo, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={photo.url?.startsWith('http') ? photo.url : `${(import.meta.env.VITE_API_URL || '').replace(/\/api$/, '')}${photo.url}`}
                            alt={`foto ${idx + 1}`}
                            className="w-full h-full object-cover" />
                          {!isClosed && (
                            <button onClick={() => deletePhoto(id, phase, idx)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition">
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      ))}
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
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <User size={15} className="text-blue-600" />
                <h2 className="font-semibold text-sm text-gray-800">Cliente</h2>
              </div>
              {order.customer ? (
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    {order.customer.business_name || `${order.customer.first_name} ${order.customer.last_name}`}
                  </p>
                  {order.customer.phone && <p className="text-gray-500 text-xs mt-1">{order.customer.phone}</p>}
                  {order.customer.email && <p className="text-gray-500 text-xs">{order.customer.email}</p>}
                </div>
              ) : <p className="text-sm text-gray-400">Sin cliente</p>}
            </div>

            {/* Técnico */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench size={15} className="text-blue-600" />
                <h2 className="font-semibold text-sm text-gray-800">Técnico</h2>
              </div>
              {order.technician
                ? <p className="text-sm font-medium text-gray-900">{order.technician.first_name} {order.technician.last_name}</p>
                : <p className="text-sm text-gray-400">Sin asignar</p>}
            </div>

            {/* Bodega */}
            {order.warehouse && (
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <h2 className="font-semibold text-sm text-gray-800 mb-1">Bodega</h2>
                <p className="text-sm text-gray-600">{order.warehouse.name}</p>
              </div>
            )}

            {/* Notas */}
            {order.notes && (
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <h2 className="font-semibold text-sm text-gray-800 mb-2">Notas</h2>
                <p className="text-sm text-gray-600">{order.notes}</p>
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
                <p className="text-xs text-green-600 mt-0.5">{COP(order.sale.total_amount)}</p>
                <button onClick={() => navigate(`/sales/${order.sale_id}`)}
                  className="mt-2 text-xs text-green-700 underline hover:text-green-900">
                  Ver remisión →
                </button>
              </div>
            )}
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
    </Layout>
  );
}