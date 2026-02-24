// frontend/src/pages/sales/SaleDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useSalesStore from '../../store/salesStore';
import { 
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  PencilIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import Layout from '../../components/layout/Layout';
import salesApi from '../../api/sales';
import { movementsAPI } from '../../api/movements';
import ConfirmSaleWithPaymentModal from '../../components/sales/ConfirmSaleWithPaymentModal';
import useTenantStore from '../../store/tenantStore';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentSale, loading, fetchSaleById, confirmSale, cancelSale } = useSalesStore();
  const { features, fetchFeatures } = useTenantStore();
  const hideRemisionTax = features?.hide_remision_tax === true;
  const [confirmDialog, setConfirmDialog] = useState({ show: false, action: null });
  const [showConfirmWithPayment, setShowConfirmWithPayment] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [lastPaymentIndex, setLastPaymentIndex] = useState(null);

  const openPaymentReceipt = async (paymentIndex) => {
    try {
      const res = await salesApi.generatePaymentReceipt(id, paymentIndex);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      toast.error('Error al generar recibo');
    }
  };

  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'efectivo',
    payment_date: new Date().toISOString().split('T')[0]
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [saleMovements, setSaleMovements] = useState([]);

  useEffect(() => {
    if (id) {
      fetchSaleById(id);
      fetchFeatures();
    }
  }, [id]);

  // Traer movimientos cuando la venta esté confirmada o entregada
  useEffect(() => {
    const loadMovements = async () => {
      if (currentSale && (currentSale.status === 'pending' || currentSale.status === 'completed') && id) {
        try {
          const response = await movementsAPI.getBySaleId(id);
          setSaleMovements(response.data || []);
        } catch (e) {
          setSaleMovements([]);
        }
      } else {
        setSaleMovements([]);
      }
    };
    loadMovements();
  }, [currentSale?.status, id]);

  const handleConfirmWithPayment = async (paymentData) => {
    try {
      setConfirmingPayment(true);
      if (['pending', 'completed'].includes(currentSale?.status)) {
        // Venta confirmada o completada: solo registrar pago
        await salesApi.registerPayment(id, {
          amount: paymentData.paid_amount ?? currentSale?.total_amount,
          payment_method: paymentData.payment_method,
          payment_date: new Date().toISOString().split('T')[0],
        });
      } else {
        // Borrador normal: confirmar + mover stock + registrar pago
        await confirmSale(id, paymentData);
      }
      setShowConfirmWithPayment(false);
      fetchSaleById(id);
    } catch (error) {
      toast.error('Error registrando pago: ' + (error.response?.data?.message || error.message));
    } finally {
      setConfirmingPayment(false);
    }
};

  const handleCancel = async () => {
    try {
      await cancelSale(id);
      setConfirmDialog({ show: false, action: null });
      fetchSaleById(id);
    } catch (error) {
      toast.error('Error cancelando venta: ' + error.message);
    }
  };

  const handleRegisterPayment = async () => {
    try {
      setSavingPayment(true);
      const result = await salesApi.registerPayment(id, {
        amount: parseFloat(paymentData.amount),
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date
      });
      setShowPaymentForm(false);
      setPaymentData({ amount: '', payment_method: 'efectivo', payment_date: new Date().toISOString().split('T')[0] });
      // Guardar índice del pago recién registrado para ofrecer recibo
      const newHistory = result?.data?.data?.payment_history || [];
      setLastPaymentIndex(newHistory.length - 1);
      await fetchSaleById(id);
    } catch (error) {
      toast.error('Error registrando pago: ' + (error.response?.data?.message || error.message));
    } finally {
      setSavingPayment(false);
    }
  };

  // Abrir PDF en nueva pestaña para imprimir
  const handlePrint = async () => {
    try {
      const response = await salesApi.generatePDF(id);
      const url = URL.createObjectURL(response.data);
      const printWindow = window.open(url, '_blank');
      
      // Esperar a que cargue y ejecutar print automáticamente
      if (printWindow) {
        printWindow.onload = function() {
          printWindow.print();
        };
      }
    } catch (error) {
      toast.error('Error al generar el PDF');
    }
  };

  // window.open() no envía headers → el token no llega al backend.
  // salesApi.generatePDF() usa axios (con interceptor Bearer), recibe blob,
  // y lo abre en nueva pestaña vía object URL.
  const handleDownloadPDF = async () => {
    try {
      const response = await salesApi.generatePDF(id);
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Error al generar el PDF');
    }
  };

  if (loading || !currentSale) return <Loading />;

  const sale = currentSale;

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'secondary',
      pending: 'info',
      completed: 'success',
      cancelled: 'danger',
    };

    const labels = {
      draft: 'Borrador',
      pending: 'Confirmada',
      completed: 'Entregada',
      cancelled: 'Cancelada',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getPaymentStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      partial: 'info',
      paid: 'success',
    };

    const labels = {
      pending: 'Pendiente (A Crédito)',
      partial: 'Pago Parcial',
      paid: 'Pagado',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
      credito: 'Crédito',
    };
    return labels[method] || method;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="no-print">
          <button
            onClick={() => navigate('/sales')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Volver a Ventas
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{sale.sale_number}</h1>
              <div className="flex items-center space-x-4 mt-2">
                {getStatusBadge(sale.status)}
                {getPaymentStatusBadge(sale.payment_status)}
                <span className="text-sm text-gray-600">
                  {sale.document_type === 'remision' ? 'Remisión' :
                  sale.document_type === 'factura' ? 'Factura' : 'Cotización'}
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              {sale.status === 'draft' && (
                <>
                  <Button
                    variant="secondary"
                    icon={PencilIcon}
                    onClick={() => navigate(`/sales/${id}/edit`)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="primary"
                    icon={CheckIcon}
                    onClick={() => setShowConfirmWithPayment(true)}
                  >
                    Confirmar
                  </Button>
                </>
              )}
              {['pending', 'completed'].includes(sale.status) && sale.payment_status !== 'paid' && (
                <Button
                  variant="primary"
                  icon={CheckIcon}
                  onClick={() => setShowConfirmWithPayment(true)}
                >
                  Registrar Pago
                </Button>
              )}

              {sale.status === 'draft' && (
                <Button
                  variant="danger"
                  icon={XMarkIcon}
                  onClick={() => setConfirmDialog({ show: true, action: 'cancel' })}
                >
                  Cancelar
                </Button>
              )}

              <Button
                variant="secondary"
                icon={PrinterIcon}
                onClick={handlePrint}
              >
                Imprimir
              </Button>

              <Button
                variant="secondary"
                icon={DocumentArrowDownIcon}
                onClick={handleDownloadPDF}
              >
                PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Contenido imprimible */}
        <div className="print-content">
          {/* Título visible solo en impresión */}
          <div className="hidden" style={{ display: 'none' }}>
            {/* Este bloque se muestra solo al imprimir gracias a los estilos @media print */}
          </div>
          <style>{`
            @media print {
              .print-header-only { display: block !important; margin-bottom: 24px; }
            }
            .print-header-only { display: none; }
          `}</style>
          <div className="print-header-only">
            <h1 className="text-2xl font-bold">{sale.sale_number}</h1>
            <p className="text-sm text-gray-600">
              {sale.document_type === 'remision' ? 'Remisión' :
              sale.document_type === 'factura' ? 'Factura' : 'Cotización'}
              {' · '}Estado: {sale.status === 'draft' ? 'Borrador' : sale.status === 'pending' ? 'Confirmada' : sale.status === 'completed' ? 'Entregada' : 'Cancelada'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Información principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Datos de la venta */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Información de la Venta</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Fecha de Venta</p>
                    <p className="font-medium">{formatDateTime(sale.sale_date)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Método de Pago</p>
                    <p className="font-medium">{getPaymentMethodLabel(sale.payment_method)}</p>
                  </div>

                  {sale.delivery_date && (
                    <div>
                      <p className="text-sm text-gray-600">Fecha de Entrega</p>
                      <p className="font-medium">{formatDate(sale.delivery_date)}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-600">Creado por</p>
                    <p className="font-medium">{sale.created_by_name || 'Sistema'}</p>
                  </div>
                </div>

                {sale.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">Observaciones</p>
                    <p className="mt-1 text-gray-900">{sale.notes}</p>
                  </div>
                )}
              </div>

              {/* Items de la venta */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Productos</h2>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Producto
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Cantidad
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Precio Unit.
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Desc.
                        </th>
                        {!(hideRemisionTax && sale.document_type === 'remision') && (
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            IVA
                          </th>
                        )}
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sale.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {item.product_name}
                            </div>
                            {item.item_type === 'free_line' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mt-0.5">
                                ✏️ Línea libre · No mueve inventario
                              </span>
                            ) : (
                              <div className="text-xs text-gray-500">{item.product_sku}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-red-600">
                            {item.discount_amount > 0 ? `-${formatCurrency(item.discount_amount)}` : '-'}
                          </td>
                          {!(hideRemisionTax && sale.document_type === 'remision') && (
                            <td className="px-4 py-3 text-right text-sm">
                              {formatCurrency(item.tax_amount)}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right text-sm font-semibold">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Aviso líneas libres - no-print para que no salga en PDF/impresión */}
                {sale.items?.some(i => i.item_type === 'free_line') && (
                  <div className="no-print flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-4">
                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Esta venta contiene líneas libres</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {sale.items.filter(i => i.item_type === 'free_line').length === 1
                          ? 'Una línea libre no descuenta stock del inventario. '
                          : `${sale.items.filter(i => i.item_type === 'free_line').length} líneas libres no descontaron stock del inventario. `}
                        Si se vendió un repuesto físico con línea libre, ajusta el inventario manualmente.
                      </p>
                    </div>
                  </div>
                )}

                {/* Totales */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-end">
                    <div className="w-80 space-y-2">
                      {!(hideRemisionTax && sale.document_type === 'remision') && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
                        </div>
                      )}
                      {sale.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Descuento:</span>
                          <span>-{formatCurrency(sale.discount_amount)}</span>
                        </div>
                      )}
                      {!(hideRemisionTax && sale.document_type === 'remision') && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">IVA:</span>
                          <span className="font-medium">{formatCurrency(sale.tax_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xl font-bold border-t pt-2">
                        <span>TOTAL:</span>
                        <span className="text-blue-600">{formatCurrency(sale.total_amount)}</span>
                      </div>

                      {/* Resumen de pagos — siempre visible si hay algo pagado o pendiente */}
                      <div className="border-t pt-2 space-y-1.5 mt-1">
                        {(sale.paid_amount > 0) && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Pagado:</span>
                            <span className="font-medium">{formatCurrency(sale.paid_amount)}</span>
                          </div>
                        )}
                        {sale.payment_status !== 'paid' && (
                          <div className="flex justify-between text-sm text-orange-600">
                            <span>Saldo pendiente:</span>
                            <span className="font-medium">{formatCurrency(sale.total_amount - (sale.paid_amount || 0))}</span>
                          </div>
                        )}
                        {sale.payment_status === 'paid' && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span className="font-semibold">Completamente Pagada ✓</span>
                          </div>
                        )}
                        {/* Botón recibo — visible si hay pagos (con o sin historial) */}
                        {(sale.paid_amount > 0) && (
                          <button
                            onClick={() => openPaymentReceipt(sale.payment_history ? sale.payment_history.length - 1 : -1)}
                            className="mt-1 w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Imprimir recibo de pago
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historial de Pagos */}
              {sale.payment_history && sale.payment_history.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">Historial de Pagos</h2>
                  <div className="space-y-3">
                    {sale.payment_history.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {formatDateTime(payment.date)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            Método: {payment.method || 'Efectivo'}
                            {payment.notes && ` • ${payment.notes}`}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1.5">
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(payment.amount)}
                          </div>
                          <button
                            onClick={() => openPaymentReceipt(index)}
                            className="no-print flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded-md px-2 py-0.5 hover:bg-blue-50 transition"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Recibo
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Información del cliente */}
            <div className="space-y-6">
              {/* Cliente */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-lg font-semibold">Cliente</h2>
                  {sale.customer_id && (
                    <Link
                      to={`/customers`}
                      className="no-print text-sm text-blue-600 hover:text-blue-700"
                    >
                      Ver clientes
                    </Link>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Nombre</p>
                    <p className="font-medium">{sale.customer_name}</p>
                  </div>

                  {sale.customer_tax_id && (
                    <div>
                      <p className="text-sm text-gray-600">NIT / Cédula</p>
                      <p className="font-medium">{sale.customer_tax_id}</p>
                    </div>
                  )}

                  {sale.customer_phone && (
                    <div>
                      <p className="text-sm text-gray-600">Teléfono</p>
                      <p className="font-medium">{sale.customer_phone}</p>
                    </div>
                  )}

                  {sale.customer_email && (
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{sale.customer_email}</p>
                    </div>
                  )}

                  {sale.customer_address && (
                    <div>
                      <p className="text-sm text-gray-600">Dirección</p>
                      <p className="font-medium">{sale.customer_address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Movimientos de Inventario - oculto en impresión */}
              {(sale.status === 'pending' || sale.status === 'completed') && (
                <div className="no-print bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">Movimientos de Inventario</h2>

                  {saleMovements.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No hay movimientos registrados</p>
                  ) : (
                    <div className="space-y-3">
                      {saleMovements.map((mov) => (
                        <div key={mov.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${mov.movement_type === 'entrada' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono text-gray-500">{mov.movement_number}</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${mov.movement_type === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {mov.movement_type === 'entrada' ? 'Entrada' : 'Salida'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 mt-0.5 truncate">{mov.product?.name || mov.notes}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">Cantidad: {mov.quantity}</span>
                              <span className="text-xs text-gray-500">{mov.previous_stock} → {mov.new_stock}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Timeline / Historial - oculto en impresión */}
              <div className="no-print bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Historial</h2>

                <div className="space-y-4">
                  <div className="flex">
                    <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                    <div className="ml-4">
                      <p className="text-sm font-medium">Venta creada</p>
                      <p className="text-xs text-gray-600">
                        {formatDateTime(sale.created_at)}
                      </p>
                    </div>
                  </div>

                  {sale.status === 'pending' && (
                    <div className="flex">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
                      <div className="ml-4">
                        <p className="text-sm font-medium">Venta confirmada</p>
                        <p className="text-xs text-gray-600">
                          Inventario actualizado
                        </p>
                      </div>
                    </div>
                  )}

                  {sale.status === 'completed' && (
                    <div className="flex">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 bg-purple-500 rounded-full"></div>
                      <div className="ml-4">
                        <p className="text-sm font-medium">Mercancía entregada</p>
                        <p className="text-xs text-gray-600">
                          {formatDate(sale.delivery_date)}
                        </p>
                      </div>
                    </div>
                  )}

                  {sale.status === 'cancelled' && (
                    <div className="flex">
                      <div className="flex-shrink-0 w-2 h-2 mt-2 bg-red-500 rounded-full"></div>
                      <div className="ml-4">
                        <p className="text-sm font-medium">Venta cancelada</p>
                        <p className="text-xs text-gray-600">
                          {formatDateTime(sale.updated_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dialogs de confirmación - ocultos en impresión */}
        <div className="no-print">
          <ConfirmSaleWithPaymentModal
            isOpen={showConfirmWithPayment}
            onClose={() => setShowConfirmWithPayment(false)}
            onConfirm={handleConfirmWithPayment}
            saleTotal={Math.max(0, (sale?.total_amount || 0) - (sale?.paid_amount || 0))}
            loading={confirmingPayment}
          />

          <ConfirmDialog
            open={confirmDialog.show && confirmDialog.action === 'cancel'}
            onCancel={() => setConfirmDialog({ show: false, action: null })}
            onConfirm={handleCancel}
            title="Cancelar Venta"
            message="¿Estás seguro de cancelar esta venta? Si ya fue confirmada, se revertirá el inventario."
            confirmText="Cancelar Venta"
            confirmVariant="danger"
          />
        </div>
      </div>
    </Layout>
  );
}