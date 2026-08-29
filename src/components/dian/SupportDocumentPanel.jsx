// frontend/src/components/dian/SupportDocumentPanel.jsx
/**
 * Panel de estado/acciones del Documento Soporte DIAN (tipo 05) para un
 * origen Purchase o Expense. Contraparte de DianDetailPanel (que es
 * exclusivo de Sale/factura — ver nota en DianStatusBadge.jsx) porque el
 * modelo de datos es distinto: SupportDocument vive en tabla propia
 * (support_document_number/cuds en vez de dian_invoice_number/cufe) y no
 * hay fila hasta que el documento se genera por primera vez.
 *
 * Props:
 *  sourceType         — 'purchase' | 'expense'
 *  sourceId           — id de la compra o el gasto
 *  requiresSupportDocument — bool; si es false el panel no se muestra
 *  hasSupplier        — bool; false solo puede pasar en 'expense' (una
 *                        compra siempre requiere proveedor). Si es false,
 *                        "Generar" abre el modal de datos ad-hoc del
 *                        vendedor en vez de enviar directo.
 *  onSellerLinked(supplier) — se dispara si desde el modal ad-hoc el
 *                        usuario decide crear el proveedor con esos datos
 *                        y quedó vinculado al gasto (para que el padre
 *                        refresque la lista/detalle).
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Clock, Send, CheckCircle2, XCircle, RefreshCw, FileText, FileMinus, FilePlus, PlusCircle } from 'lucide-react';
import {
  sendSupportDocument,
  getSupportDocumentStatus,
  checkSupportDocumentStatus,
  getSupportDocumentAdjustments,
  resendSupportDocumentAdjustment,
} from '../../api/dian';
import AdHocSellerModal from './AdHocSellerModal';
import SupportDocumentAdjustmentModal from './SupportDocumentAdjustmentModal';
import { getPrimaryDianReason } from './DianStatusBadge';

const STATUS_CONFIG = {
  none: {
    label: 'Sin generar',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    Icon: Clock,
  },
  pending: {
    label: 'Pendiente',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Icon: Clock,
  },
  sending: {
    label: 'Enviando',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    Icon: Send,
  },
  accepted: {
    label: 'Aceptado',
    className: 'bg-green-100 text-green-800 border-green-200',
    Icon: CheckCircle2,
  },
  rejected: {
    label: 'Rechazado',
    className: 'bg-red-100 text-red-800 border-red-200',
    Icon: XCircle,
  },
};

export default function SupportDocumentPanel({
  sourceType,
  sourceId,
  requiresSupportDocument,
  hasSupplier = true,
  onSellerLinked,
}) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showAdHocModal, setShowAdHocModal] = useState(false);
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [missingSupplierFields, setMissingSupplierFields] = useState(null);
  const [adjustments, setAdjustments] = useState([]);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  // Fase 5 — detalle de error expandible por Nota de Ajuste, mismo patrón
  // que showErrorDetail del Documento Soporte principal (arriba), pero
  // puede haber varias notas a la vez: se guarda un set de ids expandidos
  // en vez de un solo booleano.
  const [expandedAdjErrors, setExpandedAdjErrors] = useState(() => new Set());
  const toggleAdjError = (id) => {
    setExpandedAdjErrors(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  // Reintento de una Nota de Ajuste en 'rejected' (ej. tras un error de red
  // transitorio con el webservice DIAN, ver resendSupportDocumentAdjustment)
  // -- se guarda el id en vez de un booleano porque puede haber varias notas
  // a la vez, mismo criterio que expandedAdjErrors arriba.
  const [resendingAdjId, setResendingAdjId] = useState(null);
  const handleResendAdjustment = async (adjustmentId) => {
    setResendingAdjId(adjustmentId);
    try {
      const res = await resendSupportDocumentAdjustment(adjustmentId);
      toast.success(res.data?.message || 'Nota de Ajuste reenviada');
      loadAdjustments(doc?.id);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al reenviar la Nota de Ajuste');
    } finally {
      setResendingAdjId(null);
    }
  };

  const load = useCallback(() => {
    if (!sourceId) return;
    setLoading(true);
    getSupportDocumentStatus(sourceType, sourceId)
      .then(res => setDoc(res.data?.data || null))
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, [sourceType, sourceId]);

  useEffect(() => { load(); }, [load]);

  // Las Notas de Ajuste solo existen sobre un SupportDocument ya aceptado
  // (tiene id propio, distinto de sourceId/sourceType) — se cargan aparte
  // una vez se conoce ese id.
  const loadAdjustments = useCallback((supportDocumentId) => {
    if (!supportDocumentId) return;
    getSupportDocumentAdjustments(supportDocumentId)
      .then(res => setAdjustments(res.data?.data || []))
      .catch(() => setAdjustments([]));
  }, []);

  useEffect(() => {
    if (doc?.id && doc?.dian_status === 'accepted') loadAdjustments(doc.id);
  }, [doc?.id, doc?.dian_status, loadAdjustments]);

  if (!requiresSupportDocument) return null;

  const status = doc?.dian_status || 'none';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.none;
  const { Icon } = config;
  const primaryReason = getPrimaryDianReason(doc?.dian_error_message);
  const hasExtraDetail = !!doc?.dian_error_message && doc.dian_error_message.trim() !== primaryReason.trim();

  const doSend = async (seller = null) => {
    setActing(true);
    setMissingSupplierFields(null);
    try {
      const res = await sendSupportDocument(sourceType, sourceId, seller);
      const accepted = res.data?.data?.accepted;
      toast.success(accepted ? 'Documento Soporte aceptado por la DIAN' : 'Documento Soporte enviado (pendiente de aceptación)');
      setShowAdHocModal(false);
      load();
    } catch (e) {
      const data = e.response?.data || {};
      if (data.code === 'DIAN_SUPPLIER_INCOMPLETE') {
        setMissingSupplierFields(data.missingFields || []);
        toast.error(data.message || 'Faltan datos del proveedor/vendedor');
      } else {
        toast.error(data.message || 'Error al generar el Documento Soporte');
      }
    } finally {
      setActing(false);
    }
  };

  const handleGenerate = () => {
    if (sourceType === 'expense' && !hasSupplier) {
      setShowAdHocModal(true);
      return;
    }
    doSend(null);
  };

  const handleCheck = async () => {
    setActing(true);
    try {
      await checkSupportDocumentStatus(sourceType, sourceId);
      toast.success('Estado actualizado');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al consultar DIAN');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
          <FileText className="w-4 h-4" /> Documento Soporte DIAN
        </h4>
        {!loading && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
            <Icon className="w-3.5 h-3.5" /> {config.label}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-gray-500">Consultando estado...</p>
        ) : (
          <>
            {doc?.support_document_number && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Número</span>
                <span className="font-mono font-medium">{doc.support_document_number}</span>
              </div>
            )}
            {doc?.cuds && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-gray-500 flex-shrink-0">CUDS</span>
                <span className="font-mono text-xs text-gray-700 text-right break-all" title={doc.cuds}>
                  {doc.cuds}
                </span>
              </div>
            )}
            {doc?.dian_sent_at && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Enviado</span>
                <span>{new Date(doc.dian_sent_at).toLocaleString('es-CO')}</span>
              </div>
            )}
            {doc?.dian_accepted_at && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Aceptado</span>
                <span className="text-green-700">{new Date(doc.dian_accepted_at).toLocaleString('es-CO')}</span>
              </div>
            )}

            {status === 'rejected' && doc?.dian_error_message && (
              <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700">
                <p><span className="font-medium">Motivo:</span> {primaryReason}</p>
                {hasExtraDetail && (
                  <>
                    <button type="button" onClick={() => setShowErrorDetail(v => !v)}
                      className="mt-1 text-xs text-red-600 hover:text-red-800 underline">
                      {showErrorDetail ? 'Ocultar detalle completo' : 'Ver detalle completo'}
                    </button>
                    {showErrorDetail && (
                      <pre className="mt-2 whitespace-pre-wrap break-words bg-white border border-red-200 rounded-lg p-3 text-xs text-red-800 font-mono">
                        {doc.dian_error_message}
                      </pre>
                    )}
                  </>
                )}
              </div>
            )}

            {missingSupplierFields && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Faltan datos del proveedor para generar el documento
                {sourceType === 'purchase' || hasSupplier
                  ? ': completa su ficha en Proveedores (' + missingSupplierFields.join(', ') + ').'
                  : '.'}
              </div>
            )}

            <div className="flex gap-2 pt-1 flex-wrap">
              {status !== 'accepted' && (
                <button disabled={acting} onClick={handleGenerate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                  <Send className="w-3.5 h-3.5" />
                  {status === 'rejected' ? 'Reintentar' : 'Generar Documento Soporte'}
                </button>
              )}
              {doc && (
                <button disabled={acting} onClick={handleCheck}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-50">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Consultar Estado
                </button>
              )}
              {status === 'accepted' && (
                <button disabled={acting} onClick={() => setShowAdjustmentModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium">
                  <PlusCircle className="w-3.5 h-3.5" />
                  Nota de Ajuste
                </button>
              )}
            </div>

            {adjustments.length > 0 && (
              <div className="pt-3 mt-1 border-t border-gray-100 space-y-2">
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notas de Ajuste</h5>
                {adjustments.map(adj => {
                  const isCredit = adj.adjustment_type === 'credit';
                  const AdjIcon = isCredit ? FileMinus : FilePlus;
                  const adjConfig = STATUS_CONFIG[adj.dian_status] || STATUS_CONFIG.none;
                  // Fase 5 — mismo patrón de detalle expandible que ya tiene
                  // el Documento Soporte principal (primaryReason/
                  // hasExtraDetail arriba), pero por cada nota: el campo
                  // dian_error_message ya existía en el modelo desde la
                  // Fase 4, solo faltaba mostrarlo acá.
                  const adjPrimaryReason = getPrimaryDianReason(adj.dian_error_message);
                  const adjHasExtraDetail = !!adj.dian_error_message && adj.dian_error_message.trim() !== adjPrimaryReason.trim();
                  const isExpanded = expandedAdjErrors.has(adj.id);
                  return (
                    <div key={adj.id} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <AdjIcon className={`w-3.5 h-3.5 ${isCredit ? 'text-red-500' : 'text-orange-500'}`} />
                          <span className="font-mono">{adj.adjustment_number || 'sin número'}</span>
                          <span className="text-gray-400">·</span>
                          <span>{isCredit ? 'Crédito' : 'Débito'}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium border ${adjConfig.className}`}>
                          {adjConfig.label}
                        </span>
                      </div>
                      {adj.dian_status === 'rejected' && adj.dian_error_message && (
                        <div className="mt-2 bg-red-50 rounded-lg p-2 text-red-700">
                          <p><span className="font-medium">Motivo:</span> {adjPrimaryReason}</p>
                          {adjHasExtraDetail && (
                            <>
                              <button type="button" onClick={() => toggleAdjError(adj.id)}
                                className="mt-1 text-xs text-red-600 hover:text-red-800 underline">
                                {isExpanded ? 'Ocultar detalle completo' : 'Ver detalle completo'}
                              </button>
                              {isExpanded && (
                                <pre className="mt-2 whitespace-pre-wrap break-words bg-white border border-red-200 rounded-lg p-2 text-red-800 font-mono">
                                  {adj.dian_error_message}
                                </pre>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {(adj.dian_status === 'rejected' || adj.dian_status === 'pending') && (
                        <button type="button" disabled={resendingAdjId === adj.id}
                          onClick={() => handleResendAdjustment(adj.id)}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50">
                          <RefreshCw className={`w-3 h-3 ${resendingAdjId === adj.id ? 'animate-spin' : ''}`} />
                          Reintentar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {showAdHocModal && (
        <AdHocSellerModal
          open={showAdHocModal}
          expenseId={sourceId}
          onClose={() => setShowAdHocModal(false)}
          onSubmitAdHoc={(seller) => doSend(seller)}
          onSupplierCreated={(supplier) => {
            setShowAdHocModal(false);
            onSellerLinked?.(supplier);
            // El gasto ya quedó con supplier_id vinculado (ver
            // AdHocSellerModal) — se reintenta el envío ya sin `seller`
            // ad-hoc, para que tome el proveedor real recién creado.
            doSend(null);
          }}
          submitting={acting}
        />
      )}

      {showAdjustmentModal && (
        <SupportDocumentAdjustmentModal
          isOpen={showAdjustmentModal}
          supportDocumentId={doc?.id}
          onClose={() => setShowAdjustmentModal(false)}
          onSuccess={() => loadAdjustments(doc?.id)}
        />
      )}
    </div>
  );
}
