// frontend/src/components/purchases/DianInvoiceViewModal.jsx
//
// Representación de una factura recibida, construida con los datos que
// tenemos: el encabezado del Excel de la DIAN (CUFE, emisor, fechas,
// impuestos, retenciones, total) y, si ya se descargó el XML, sus líneas.
// No es la representación gráfica original del emisor.
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { XMarkIcon, ArrowDownTrayIcon, ArrowTopRightOnSquareIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { dianDocumentsAPI } from '../../api/dianDocuments';
import { formatCurrency } from '../../utils/formatters';

const fmtDate = (d) => {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split('-');
  return y && m && day ? `${day}/${m}/${y}` : s;
};

const STATUS_LABELS = { pending: 'Pendiente por cargar', loaded: 'Cargada en Pitbox', discarded: 'Descartada' };

const Row = ({ label, value, strong, negative }) => (
  <div className="flex justify-between text-sm py-0.5">
    <span className="text-gray-600 dark:text-gray-400">{label}</span>
    <span className={`${strong ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'} ${negative ? 'text-orange-600 dark:text-orange-400' : ''}`}>
      {negative ? '-' : ''}{formatCurrency(value)}
    </span>
  </div>
);

export default function DianInvoiceViewModal({ documentId, onClose, onChanged, onLoad }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await dianDocumentsAPI.getById(documentId);
      setDoc(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error cargando el documento');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [documentId]);

  const fetchXml = async () => {
    setFetching(true);
    try {
      await dianDocumentsAPI.fetchXml(documentId);
      toast.success('Detalle obtenido desde la DIAN');
      await load();
      onChanged?.();
    } catch (e) {
      toast.error(e.response?.data?.message || 'La DIAN no devolvió el detalle');
      await load();
    } finally {
      setFetching(false);
    }
  };

  const print = () => {
    const node = document.getElementById('dian-invoice-print');
    if (!node) return;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Factura ${doc.document_number}</title>
      <style>body{font-family:system-ui,Arial,sans-serif;color:#111;padding:24px;font-size:12px}
      table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e5e7eb;padding:4px;text-align:left}
      .r{text-align:right}.muted{color:#6b7280}.no-print{display:none}h2{margin:0 0 4px}img{width:120px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}</style></head><body>${node.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  if (loading || !doc) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-graphite rounded-xl p-8 text-sm text-gray-500">Cargando documento...</div>
      </div>
    );
  }

  const otherTaxes = Object.entries(doc.other_taxes || {});
  const detail = doc.detail && !doc.detail.error ? doc.detail : null;
  const subtotal = detail?.totals?.subtotal ?? doc.estimated_subtotal;
  const retentions = Number(doc.rete_renta || 0) + Number(doc.rete_iva || 0) + Number(doc.rete_ica || 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-graphite rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-graphite border-b border-gray-200 dark:border-white/10 px-5 py-3 flex items-center justify-between gap-2 z-10">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{doc.document_type || 'Documento'} {doc.document_number}</h2>
            <p className="text-xs text-gray-500">{STATUS_LABELS[doc.status]}{doc.purchase ? ` · Compra ${doc.purchase.purchase_number}` : ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={print} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5" title="Imprimir">
              <PrinterIcon className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div id="dian-invoice-print" className="p-5 space-y-5">
          {/* Emisor / Receptor / QR */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 grid">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase muted">Emisor (proveedor)</div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{doc.issuer_name || '—'}</h2>
                <div className="text-sm text-gray-700 dark:text-gray-300">NIT {doc.issuer_nit || '—'}</div>
                {detail?.supplier?.address && <div className="text-xs text-gray-500 muted">{detail.supplier.address}</div>}
                {detail?.supplier?.email && <div className="text-xs text-gray-500 muted">{detail.supplier.email}</div>}
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase muted">Receptor</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{doc.receiver_name || '—'}</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">NIT {doc.receiver_nit || '—'}</div>
              </div>
              <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><div className="text-xs text-gray-500 muted">Número</div><div className="font-medium">{doc.document_number || '—'}</div></div>
                <div><div className="text-xs text-gray-500 muted">Emisión</div><div className="font-medium">{fmtDate(doc.issue_date)}</div></div>
                <div><div className="text-xs text-gray-500 muted">Recepción</div><div className="font-medium">{fmtDate(doc.reception_date)}</div></div>
                <div>
                  <div className="text-xs text-gray-500 muted">Vencimiento</div>
                  <div className="font-medium">{fmtDate(detail?.invoice?.due_date)}</div>
                  {detail?.invoice?.term_days > 0 && <div className="text-xs text-gray-500 muted">{detail.invoice.term_days} días de plazo</div>}
                  {!detail && <div className="text-[11px] text-gray-400 muted">Viene en el XML</div>}
                </div>
                <div>
                  <div className="text-xs text-gray-500 muted">Forma de pago</div>
                  <div className="font-medium">
                    {detail?.invoice?.payment_form === 'credit' ? 'Crédito' : detail?.invoice?.payment_form === 'cash' ? 'Contado' : (doc.payment_form || '—')}
                  </div>
                  {detail?.invoice?.payment_terms_note && <div className="text-xs text-gray-500 muted">{detail.invoice.payment_terms_note}</div>}
                </div>
                <div><div className="text-xs text-gray-500 muted">Medio de pago</div><div className="font-medium">{doc.payment_method || '—'}</div></div>
                <div><div className="text-xs text-gray-500 muted">Divisa</div><div className="font-medium">{doc.currency || 'COP'}</div></div>
                <div><div className="text-xs text-gray-500 muted">Estado DIAN</div><div className="font-medium">{doc.dian_status || '—'}</div></div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-start text-center">
              {doc.qr_data_url
                ? <img src={doc.qr_data_url} alt="QR de consulta DIAN" className="w-36 h-36" />
                : <div className="w-36 h-36 bg-gray-100 dark:bg-white/5 rounded" />}
              <a href={doc.qr_url} target="_blank" rel="noreferrer" className="no-print mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                Consultar en la DIAN <ArrowTopRightOnSquareIcon className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase muted">CUFE / CUDE</div>
            <div className="text-xs font-mono break-all text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 rounded p-2">{doc.cufe}</div>
          </div>

          {/* Nota crédito/débito: factura que afecta (BillingReference del XML) */}
          {doc.related_invoice && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-900/20 p-3 text-sm">
              <div className="font-semibold text-blue-900 dark:text-blue-200">
                Afecta la factura {doc.related_invoice.number || '—'}{doc.related_invoice.issue_date ? ` del ${fmtDate(doc.related_invoice.issue_date)}` : ''}
              </div>
              {doc.related_invoice.registry ? (
                <div className="text-xs text-blue-800 dark:text-blue-300 mt-0.5">
                  En el registro: {STATUS_LABELS[doc.related_invoice.registry.status]}
                  {doc.related_invoice.registry.purchase ? ` · Compra ${doc.related_invoice.registry.purchase.purchase_number}` : ''}
                  {' '}— la devolución o ajuste al proveedor se registra aparte, sobre esa compra.
                </div>
              ) : (
                <div className="text-xs text-blue-800 dark:text-blue-300 mt-0.5">La factura original no está en el registro (puede ser de un periodo anterior).</div>
              )}
              {doc.related_invoice.cufe && <div className="text-[11px] font-mono break-all text-blue-700/70 mt-1">{doc.related_invoice.cufe}</div>}
            </div>
          )}

          {/* Líneas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Detalle</div>
              {!detail && !doc.has_xml && (
                <button
                  onClick={fetchXml}
                  disabled={fetching}
                  className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-blue-900/20 disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" /> {fetching ? 'Consultando DIAN...' : 'Obtener detalle desde DIAN'}
                </button>
              )}
            </div>
            {detail ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-200 dark:border-white/10">
                      <th className="text-left py-2 pr-2">Código</th>
                      <th className="text-left py-2 pr-2">Descripción</th>
                      <th className="text-right py-2 pr-2 r">Cant.</th>
                      <th className="text-right py-2 pr-2 r">Vr. unitario</th>
                      <th className="text-right py-2 pr-2 r">IVA</th>
                      <th className="text-right py-2 r">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.items || []).map((it, idx) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-white/5">
                        <td className="py-1.5 pr-2 text-xs text-gray-500">{it.sku && !String(it.sku).startsWith('TEMP-') ? it.sku : ''}</td>
                        <td className="py-1.5 pr-2">{it.name}</td>
                        <td className="py-1.5 pr-2 text-right r">{it.quantity}</td>
                        <td className="py-1.5 pr-2 text-right r">{formatCurrency(it.unit_price)}</td>
                        <td className="py-1.5 pr-2 text-right r">{it.tax_percentage}%</td>
                        <td className="py-1.5 text-right r">{formatCurrency(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500 bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                {doc.is_invoice
                  ? 'El Excel de la DIAN solo trae el encabezado de la factura. Para ver los productos, el plazo y la fecha de vencimiento, obtén el detalle desde la DIAN o carga el ZIP de la factura.'
                  : (doc.has_xml
                    ? 'Detalle descargado. Las notas no se cargan como compra; arriba se muestra la factura que afectan.'
                    : 'Obtén el detalle desde la DIAN para ver qué factura afecta esta nota.')}
                {doc.xml_fetch_error && (
                  <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">Último intento: {doc.xml_fetch_error}</div>
                )}
                {doc.detail?.error && <div className="mt-1 text-xs text-red-600">{doc.detail.error}</div>}
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-full sm:w-80 space-y-0.5">
              <Row label={detail ? 'Subtotal' : 'Subtotal (estimado)'} value={subtotal} />
              <Row label="IVA" value={doc.iva} />
              {Number(doc.inc) > 0 && <Row label="INC" value={doc.inc} />}
              {Number(doc.ica) > 0 && <Row label="ICA" value={doc.ica} />}
              {otherTaxes.map(([k, v]) => <Row key={k} label={k} value={v} />)}
              <div className="border-t border-gray-200 dark:border-white/10 my-1" />
              <Row label="Total factura" value={doc.total} strong />
              {Number(doc.rete_renta) > 0 && <Row label="Rete Renta" value={doc.rete_renta} negative />}
              {Number(doc.rete_iva) > 0 && <Row label="Rete IVA" value={doc.rete_iva} negative />}
              {Number(doc.rete_ica) > 0 && <Row label="Rete ICA" value={doc.rete_ica} negative />}
              {retentions > 0 && <Row label="Neto a pagar" value={Number(doc.total) - retentions} strong />}
            </div>
          </div>

          <p className="text-[11px] text-gray-400 muted">
            Representación construida por Pitbox a partir del reporte de documentos de la DIAN{detail ? ' y del XML de la factura' : ''}.
            No reemplaza la representación gráfica del emisor.
          </p>
        </div>

        {doc.status === 'pending' && doc.is_invoice && (
          <div className="sticky bottom-0 bg-white dark:bg-graphite border-t border-gray-200 dark:border-white/10 px-5 py-3 flex justify-end gap-2">
            <button
              onClick={() => onLoad?.(doc)}
              disabled={!detail}
              title={detail ? '' : 'Primero obtén el detalle desde la DIAN'}
              className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Revisar y cargar como compra
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
