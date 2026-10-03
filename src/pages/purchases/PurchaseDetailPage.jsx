import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePurchasesStore } from '../../store/purchasesStore';
import useProductsStore from '../../store/productsStore';
import Layout from '../../components/layout/Layout';
import ConfirmPurchaseWithPaymentModal from '../../components/purchases/ConfirmPurchaseWithPaymentModal';
import SupportDocumentPanel from '../../components/dian/SupportDocumentPanel';
import RadianEventsPanel from '../../components/purchases/RadianEventsPanel';
import SendPurchaseOrderModal from '../../components/purchases/SendPurchaseOrderModal';
import { purchasesAPI } from '../../api/purchases';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const PurchaseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const {
    purchase,
    isLoading,
    fetchPurchaseById,
    confirmPurchase,
    receivePurchase,
    cancelPurchase
  } = usePurchasesStore();

  const { fetchProducts } = useProductsStore();

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ invoice_number: '', due_date: '' });
  const [savingInvoice, setSavingInvoice] = useState(false);

  const saveSupplierInvoice = async () => {
    if (!invoiceForm.invoice_number.trim()) { toast('Indica el número de factura'); return; }
    setSavingInvoice(true);
    try {
      await purchasesAPI.registerInvoice(id, { invoice_number: invoiceForm.invoice_number.trim(), due_date: invoiceForm.due_date || undefined });
      toast.success('Factura registrada: la compra ya figura en cuentas por pagar');
      setInvoiceForm({ invoice_number: '', due_date: '' });
      fetchPurchaseById(id);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo registrar la factura');
    } finally {
      setSavingInvoice(false);
    }
  };
  const [loadingPdf, setLoadingPdf] = useState(false);

  // PDF de la orden de compra en una pestaña nueva.
  const openOrderPdf = async () => {
    setLoadingPdf(true);
    try {
      const res = await purchasesAPI.getOrderPdf(id);
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error('No se pudo generar el PDF de la orden');
    } finally {
      setLoadingPdf(false);
    }
  };
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingPurchase, setConfirmingPurchase] = useState(false);
  const [receivedItems, setReceivedItems] = useState([]);
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    if (id) {
      fetchPurchaseById(id);
    }
  }, [id]);

  useEffect(() => {
    if (purchase && purchase.items) {
      setReceivedItems(
        purchase.items.map(item => ({
          item_id: item.id,
          // Por defecto se recibe lo pendiente (pedido - ya recibido).
          received_quantity: Math.max(parseFloat(item.quantity || 0) - parseFloat(item.received_quantity || 0), 0)
        }))
      );
    }
  }, [purchase]);

  const handleConfirm = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmWithPayment = async (paymentData) => {
    setConfirmingPurchase(true);
    const success = await confirmPurchase(id, paymentData);
    setConfirmingPurchase(false);
    if (success) {
      setShowConfirmModal(false);
      toast.success('Compra confirmada exitosamente');
    }
  };

  const pendingOf = (item) => Math.max(parseFloat(item.quantity || 0) - parseFloat(item.received_quantity || 0), 0);

  const handleReceive = async () => {
    const toReceive = receivedItems.filter(r => parseFloat(r.received_quantity) > 0);
    if (toReceive.length === 0) {
      toast('Indica la cantidad recibida de al menos un producto');
      return;
    }
    const isPartial = (purchase.items || []).some(item => {
      const now = parseFloat(receivedItems.find(r => r.item_id === item.id)?.received_quantity || 0);
      return now < pendingOf(item);
    });
    const success = await receivePurchase(id, receivedItems);
    if (success) {
      await fetchProducts();
      
      toast.success(isPartial
        ? 'Recepción parcial registrada. La compra queda abierta para lo pendiente.'
        : 'Compra recibida completamente. Stock y precios actualizados.');
      setShowReceiveModal(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      toast('Por favor ingrese un motivo de cancelación');
      return;
    }

    const success = await cancelPurchase(id, cancellationReason);
    if (success) {
      toast.success('Compra cancelada exitosamente');
      setShowCancelModal(false);
    }
  };

  const updateReceivedQuantity = (itemId, quantity) => {
    setReceivedItems(prev =>
      prev.map(item =>
        item.item_id === itemId
          ? { ...item, received_quantity: Math.max(parseFloat(quantity) || 0, 0) }
          : item
      )
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Borrador' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmada' },
      partially_received: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Recibida parcial' },
      received: { bg: 'bg-green-100', text: 'text-green-800', label: 'Recibida' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // purchase_date/expected_delivery_date/received_date son campos "solo
  // fecha" (medianoche UTC) -- hay que leer los componentes en UTC, no
  // locales, o en Bogotá (UTC-5) se muestra un día menos (mismo bug que
  // documenta formatDate en utils/formatters.js; se recrea el formato largo
  // en español que ya tenía esta página en vez de usar el 'dd/MM/yyyy'
  // corto del util compartido). cancelled_at sí es un timestamp real -- ese
  // usa formatDateTime normal, sin este ajuste.
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const parsed = new Date(dateString);
    const utcAsLocal = new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
    return utcAsLocal.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading || !purchase) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Cargando detalles de la compra...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/purchases')}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Orden de Compra {purchase.purchase_number}
              </h1>
              <p className="text-gray-600 mt-1">
                {formatDate(purchase.purchase_date)}
              </p>
            </div>
          </div>
          <div>
            {getStatusBadge(purchase.status)}
          </div>
        </div>

        {/* Orden confirmada sin factura ni mercancía: todavía es un pedido. */}
        {['confirmed', 'partially_received', 'received'].includes(purchase.status) && !purchase.invoice_number && (
          <div className="mb-3 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            {purchase.status === 'confirmed' && (
              <p className="mb-2">
                Pedido al proveedor: entrará a cuentas por pagar cuando recibas la mercancía o registres la factura del proveedor.
              </p>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs text-blue-700">N° factura del proveedor</label>
                <input
                  value={invoiceForm.invoice_number}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, invoice_number: e.target.value }))}
                  placeholder="Ej: FE-12345"
                  className="px-2 py-1.5 border border-blue-200 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-blue-700">Vence (opcional)</label>
                <input
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="px-2 py-1.5 border border-blue-200 rounded-lg text-sm bg-white"
                />
              </div>
              <button
                onClick={saveSupplierInvoice}
                disabled={savingInvoice}
                className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingInvoice ? 'Guardando...' : 'Registrar factura'}
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {purchase.status !== 'cancelled' && (
            <>
              <button
                onClick={openOrderPdf}
                disabled={loadingPdf}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {loadingPdf ? 'Generando...' : 'PDF'}
              </button>
              <button
                onClick={() => setShowSendModal(true)}
                className="border border-blue-300 hover:bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Enviar al proveedor
                {purchase.order_emails?.length > 0 && <span className="text-xs text-blue-500">({purchase.order_emails.length})</span>}
              </button>
            </>
          )}
          {purchase.status === 'draft' && (
            <>
              <button
                onClick={handleConfirm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Confirmar Compra
              </button>
              <button
                onClick={() => navigate(`/purchases/edit/${id}`)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
            </>
          )}

          {['confirmed', 'partially_received'].includes(purchase.status) && (
            <button
              onClick={() => setShowReceiveModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {purchase.status === 'partially_received' ? 'Recibir Pendiente' : 'Recibir Compra'}
            </button>
          )}

          {['received', 'partially_received'].includes(purchase.status) && (
            <button
              onClick={() => setShowReturnModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Crear Devolución
            </button>
          )}

          {(purchase.status === 'draft' || purchase.status === 'confirmed') && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar Compra
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Items and Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Productos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio Unitario
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchase.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.product?.name || 'Producto no encontrado'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.product?.sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(item.unit_cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      Total:
                    </td>
                    <td className="px-6 py-4 text-right text-lg font-bold text-gray-900">
                      {formatCurrency(purchase.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Retenciones (Fase C) — el tenant, como comprador, retiene a
                este proveedor. Solo aparece si aplicó alguna. */}
            {purchase.total_retentions > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-1">
                {Array.isArray(purchase.applied_retentions) && purchase.applied_retentions.length > 0 ? (
                  purchase.applied_retentions.map((l, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-orange-600">
                      <span>
                        {{ '07': 'ReteFuente', '05': 'ReteIVA', '06': 'ReteICA' }[l.code] || l.code} · {l.concept} ({l.rate}{l.code === '06' ? '‰' : '%'} sobre {formatCurrency(l.base)}):
                      </span>
                      <span>-{formatCurrency(l.amount)}</span>
                    </div>
                  ))
                ) : (<>
                {purchase.retefuente_amount > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>ReteFuente ({purchase.retefuente_rate}%):</span>
                    <span>-{formatCurrency(purchase.retefuente_amount)}</span>
                  </div>
                )}
                {purchase.reteiva_amount > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>ReteIVA ({purchase.reteiva_rate}%):</span>
                    <span>-{formatCurrency(purchase.reteiva_amount)}</span>
                  </div>
                )}
                {purchase.reteica_amount > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>ReteICA ({purchase.reteica_rate}‰):</span>
                    <span>-{formatCurrency(purchase.reteica_amount)}</span>
                  </div>
                )}
                </>)}
                <div className="flex justify-between text-base font-bold text-green-700 border-t border-gray-200 pt-2">
                  <span>Neto a pagar al proveedor:</span>
                  <span>{formatCurrency(purchase.total_amount - purchase.total_retentions)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Recepciones (parciales o totales) */}
          {Array.isArray(purchase.receipts) && purchase.receipts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Recepciones</h2>
              <div className="space-y-3">
                {purchase.receipts.map((r) => (
                  <div key={r.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">
                        Recepción {r.number} · {formatDate(r.date)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${r.is_final ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {r.is_final ? 'Completa la compra' : 'Parcial'}
                      </span>
                    </div>
                    <ul className="mt-1 text-sm text-gray-600">
                      {(r.items || []).map((it) => (
                        <li key={it.item_id}>{it.product_name}: <span className="font-medium">{it.quantity}</span></li>
                      ))}
                    </ul>
                    {r.amounts && (
                      <div className="mt-1 text-xs text-gray-500">
                        Valor contabilizado: {formatCurrency(Number(r.amounts.inventory || 0) + Number(r.amounts.tax || 0))}
                        {' '}(inventario {formatCurrency(r.amounts.inventory)} + IVA {formatCurrency(r.amounts.tax)})
                      </div>
                    )}
                    {r.notes && <p className="mt-1 text-xs text-gray-500">{r.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {purchase.notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Notas</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{purchase.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Supplier Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Proveedor</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-medium text-gray-900">{purchase.supplier?.name}</p>
              </div>
              {purchase.supplier?.contact_name && (
                <div>
                  <p className="text-sm text-gray-600">Contacto</p>
                  <p className="font-medium text-gray-900">{purchase.supplier.contact_name}</p>
                </div>
              )}
              {purchase.supplier?.phone && (
                <div>
                  <p className="text-sm text-gray-600">Teléfono</p>
                  <p className="font-medium text-gray-900">{purchase.supplier.phone}</p>
                </div>
              )}
              {purchase.supplier?.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{purchase.supplier.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Documento Soporte DIAN — solo si la compra está marcada como
              tal (proveedor no obligado a facturar, ver purchases.controller.js).
              No se muestra para compras normales con factura del proveedor. */}
          <SupportDocumentPanel
            sourceType="purchase"
            sourceId={purchase.id}
            requiresSupportDocument={!!purchase.requires_support_document}
            hasSupplier={!!purchase.supplier}
          />

          {/* Eventos RADIAN — solo aparece si la compra tiene CUFE (factura
              electrónica del proveedor importada con XML válido). */}
          <RadianEventsPanel purchase={purchase} />

          {/* Additional Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Información Adicional</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Fecha de Compra</p>
                <p className="font-medium text-gray-900">{formatDate(purchase.purchase_date)}</p>
              </div>
              {purchase.expected_delivery_date && (
                <div>
                  <p className="text-sm text-gray-600">Entrega Esperada</p>
                  <p className="font-medium text-gray-900">{formatDate(purchase.expected_delivery_date)}</p>
                </div>
              )}
              {purchase.received_date && (
                <div>
                  <p className="text-sm text-gray-600">Fecha de Recepción</p>
                  <p className="font-medium text-green-600">{formatDate(purchase.received_date)}</p>
                </div>
              )}
              {purchase.payment_method && (
                <div>
                  <p className="text-sm text-gray-600">Método de Pago</p>
                  <p className="font-medium text-gray-900">{purchase.payment_method}</p>
                </div>
              )}
              {purchase.invoice_number && (
                <div>
                  <p className="text-sm text-gray-600">Número de Factura</p>
                  <p className="font-medium text-gray-900">{purchase.invoice_number}</p>
                </div>
              )}
              {purchase.reference && (
                <div>
                  <p className="text-sm text-gray-600">Referencia</p>
                  <p className="font-medium text-gray-900">{purchase.reference}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cancellation Info */}
          {purchase.status === 'cancelled' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-4">Información de Cancelación</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-red-600">Fecha de Cancelación</p>
                  <p className="font-medium text-red-900">{formatDateTime(purchase.cancelled_at)}</p>
                </div>
                {purchase.cancellation_reason && (
                  <div>
                    <p className="text-sm text-red-600">Motivo</p>
                    <p className="font-medium text-red-900">{purchase.cancellation_reason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <SendPurchaseOrderModal
        purchase={purchase}
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSent={() => fetchPurchaseById(id)}
      />

      {/* Confirm With Payment Modal */}
      <ConfirmPurchaseWithPaymentModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmWithPayment}
        purchaseTotal={Math.max(parseFloat(purchase?.total_amount || 0) - parseFloat(purchase?.total_retentions || 0), 0)}
        retentions={parseFloat(purchase?.total_retentions || 0)}
        defaultCreditDays={purchase?.payment_terms || 0}
        loading={confirmingPurchase}
      />

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Recibir Compra</h2>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Al recibir esta compra se actualizará automáticamente:
                    </h3>
                    <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside space-y-1">
                      <li>Stock actual de los productos</li>
                      <li>Costo promedio (average_cost)</li>
                      <li>Último costo de compra (last_purchase_cost)</li>
                      <li>Precio de venta base (si tiene margen de ganancia configurado)</li>
                    </ul>
                    <p className="text-sm text-yellow-700 mt-2">
                      Verifique las cantidades recibidas antes de confirmar. Si llega solo una parte, registre lo que llegó:
                      la compra queda como "Recibida parcial" y podrá recibir el resto después. Cada recepción genera su
                      propio asiento contable por el valor de lo recibido.
                    </p>
                  </div>
                </div>
              </div>

              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pedida</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ya recibida</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Recibir ahora</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchase.items?.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{item.product?.name}</div>
                        <div className="text-sm text-gray-500">{item.product?.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">{parseFloat(item.received_quantity || 0)}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{pendingOf(item)}</td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          value={receivedItems.find(r => r.item_id === item.id)?.received_quantity ?? 0}
                          onChange={(e) => updateReceivedQuantity(item.id, e.target.value)}
                          min="0"
                          max={pendingOf(item)}
                          disabled={pendingOf(item) <= 0}
                          step="any"
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReceive}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Confirmar Recepción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-800">Cancelar Compra</h2>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4">
                ¿Está seguro de cancelar esta compra? Esta acción no se puede deshacer.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo de Cancelación <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ingrese el motivo de la cancelación"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Cancelar Compra
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-800">Crear Devolución a Proveedor</h2>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-orange-100 rounded-full p-2 flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-800 font-medium">
                    ¿Desea iniciar una devolución para la compra <span className="font-bold">{purchase.purchase_number}</span>?
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Se abrirá el formulario de devolución con esta compra pre-seleccionada. Podrá elegir qué productos y cantidades devolver.
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p><span className="font-medium">Proveedor:</span> {purchase.supplier?.name}</p>
                <p><span className="font-medium">Total compra:</span> {formatCurrency(purchase.total_amount)}</p>
                <p><span className="font-medium">Productos:</span> {purchase.items?.length} ítem(s)</p>
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowReturnModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  navigate('/inventory/supplier-returns/new', { state: { purchase } });
                }}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
};

export default PurchaseDetailPage;