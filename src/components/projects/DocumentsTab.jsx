import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getProjectDocuments } from '../../api/projects';
import { formatCurrency, formatDate } from '../../utils/formatters';
import AttachmentsPanel from '../attachments/AttachmentsPanel';
import { CONTRACT_STATUS } from './projectConstants';

const SALE_TYPE = { factura: 'Factura', remision: 'Remisión', cotizacion: 'Cotización', nota_credito: 'Nota crédito', nota_debito: 'Nota débito' };
const SALE_STATUS = { draft: 'Borrador', pending: 'Pendiente', completed: 'Confirmada', cancelled: 'Anulada' };
const PURCHASE_STATUS = { draft: 'Borrador', confirmed: 'Confirmada', partially_received: 'Recibida parcial', received: 'Recibida', cancelled: 'Cancelada' };
const TRANSFER_STATUS = { draft: 'Borrador', sent: 'En tránsito', received: 'Recibido', closed: 'Cerrado', cancelled: 'Cancelado' };
const LIST_STATUS = { open: 'Abierto', ordered: 'Pedido', cancelled: 'Descartado' };
const PAYMENT = { pending: 'Pendiente', partial: 'Abonado', paid: 'Pagado' };
const QUOTE_STATUS = { borrador: 'Borrador', enviada: 'Enviada', aprobada: 'Aprobada', parcial: 'Aprobada parcial', rechazada: 'Rechazada', vencida: 'Vencida' };

// Estado que se muestra: la cotización-contrato con su avance, las demás
// cotizaciones por su respuesta y las ventas por estado y pago.
function saleStatusText(s, contract) {
  if (s.document_type === 'cotizacion') {
    if (contract && contract.quote_id === s.id && contract.invoiced_cuts > 0) {
      const st = CONTRACT_STATUS[s.quote_status]?.label || QUOTE_STATUS[s.quote_status] || s.quote_status;
      return s.quote_status === 'facturada' ? `Contrato · ${st}` : `Contrato · ${st} · ${contract.progress_pct} % facturado`;
    }
    return QUOTE_STATUS[s.quote_status] || SALE_STATUS[s.status] || s.status;
  }
  return `${SALE_STATUS[s.status] || s.status}${s.payment_status && s.status === 'completed' ? ` · ${PAYMENT[s.payment_status] || s.payment_status}` : ''}`;
}

function Section({ title, count, action, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title} <span className="text-gray-400 font-normal">({count})</span></h3>
        {action}
      </div>
      {count === 0 ? <p className="px-4 py-4 text-sm text-gray-500">Ninguno todavía.</p> : <div className="overflow-x-auto">{children}</div>}
    </div>
  );
}

const th = 'px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase';
const td = 'px-4 py-2';
const money = (v) => (v === null || v === undefined ? '—' : formatCurrency(v));

/**
 * Todo lo que lleva el proyecto: ventas, compras, gastos, traslados y pedidos.
 */
export default function DocumentsTab({ project, canManage }) {
  const [docs, setDocs] = useState(null);

  useEffect(() => {
    getProjectDocuments(project.id)
      .then((r) => setDocs(r.data))
      .catch((e) => toast.error(e.response?.data?.message || 'Error al cargar los documentos'));
  }, [project.id]);

  if (!docs) return <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;

  const open = !['closed', 'cancelled'].includes(project.status);
  const newLink = (to, label) => (canManage && open ? <Link to={to} className="text-sm text-orange-600 hover:underline">{label}</Link> : null);

  return (
    <div className="space-y-5">
      <AttachmentsPanel entityType="project" entityId={project.id} title="Documentos del proyecto (contrato, planos, actas, fotos)" defaultKind="contract" />
      <Section title="Ventas y cotizaciones" count={docs.sales.length} action={newLink(`/sales/new?project_id=${project.id}`, '+ Nueva venta')}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40"><tr><th className={th}>Documento</th><th className={th}>Fecha</th><th className={th}>Estado</th><th className={`${th} text-right`}>Total</th></tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {docs.sales.map((s) => (
              <tr key={s.id}>
                <td className={td}>
                  <Link to={`/sales/${s.id}`} className="text-orange-600 hover:underline">{s.sale_number}</Link> <span className="text-xs text-gray-500">{SALE_TYPE[s.document_type] || 'Borrador'}</span>
                  {s.project_cut_id && <span className="ml-2 text-xs text-gray-500">· corte de obra</span>}
                  {docs.contract?.invoiced_cuts > 0 && ['factura', 'remision'].includes(s.document_type) && !s.project_cut_id && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-sky-50 text-sky-700" title="Venta del proyecto que no sale de un corte: adicional o venta aparte">Fuera del contrato</span>
                  )}
                </td>
                <td className={td}>{formatDate(s.sale_date)}</td>
                <td className={td}>{saleStatusText(s, docs.contract)}</td>
                <td className={`${td} text-right tabular-nums`}>{money(s.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Compras" count={docs.purchases.length} action={newLink('/purchases/new', '+ Nueva compra')}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40"><tr><th className={th}>Compra</th><th className={th}>Proveedor</th><th className={th}>Fecha</th><th className={th}>Estado</th><th className={`${th} text-right`}>Total</th></tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {docs.purchases.map((p) => (
              <tr key={p.id}>
                <td className={td}><Link to={`/purchases/${p.id}`} className="text-orange-600 hover:underline">{p.purchase_number}</Link>{p.invoice_number && <span className="text-xs text-gray-500"> · Fact. {p.invoice_number}</span>}</td>
                <td className={td}>{p.supplier?.business_name || p.supplier?.name || p.supplier_name || '—'}</td>
                <td className={td}>{formatDate(p.purchase_date)}</td>
                <td className={td}>{PURCHASE_STATUS[p.status] || p.status}{p.warehouse_id && p.warehouse_id !== project.warehouse_id ? <span className="block text-xs text-amber-700">Se recibe en otra bodega: cuenta al despacharse a la obra</span> : null}</td>
                <td className={`${td} text-right tabular-nums`}>{money(p.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Gastos" count={docs.expenses.length} action={newLink('/expenses', 'Ir a gastos')}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40"><tr><th className={th}>Gasto</th><th className={th}>Descripción</th><th className={th}>Fecha</th><th className={th}>Pago</th><th className={`${th} text-right`}>Base</th></tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {docs.expenses.map((e) => (
              <tr key={e.id}>
                <td className={td}>{e.expense_number}</td>
                <td className={td}>{e.description}</td>
                <td className={td}>{formatDate(e.expense_date)}</td>
                <td className={td}>{PAYMENT[e.payment_status] || e.payment_status}</td>
                <td className={`${td} text-right tabular-nums`}>{money(e.subtotal ?? e.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Traslados" count={docs.transfers.length}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40"><tr><th className={th}>Traslado</th><th className={th}>Movimiento</th><th className={th}>Fecha</th><th className={th}>Estado</th></tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {docs.transfers.map((t) => (
              <tr key={t.id}>
                <td className={td}><Link to={`/inventory/transfers/${t.id}`} className="text-orange-600 hover:underline">{t.transfer_number}</Link></td>
                <td className={td}>
                  {t.direction === 'to_project' ? 'Despacho a la obra' : t.direction === 'from_project' ? 'Reintegro desde la obra' : 'Otro'}
                  <span className="block text-xs text-gray-500">{t.fromWarehouse?.name} → {t.toWarehouse?.name}</span>
                </td>
                <td className={td}>{formatDate(t.transfer_date)}</td>
                <td className={td}>
                  {TRANSFER_STATUS[t.status] || t.status}
                  {t.status === 'sent' && <Link to={`/inventory/transfers/${t.id}/receive`} className="ml-2 text-orange-600 hover:underline">Recibir</Link>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Pedidos a proveedores" count={docs.order_lists.length}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/40"><tr><th className={th}>Pedido</th><th className={th}>Proveedor</th><th className={th}>Fecha</th><th className={th}>Estado</th></tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {docs.order_lists.map((l) => (
              <tr key={l.id}>
                <td className={td}><Link to={`/order-lists/${l.id}`} className="text-orange-600 hover:underline">{l.list_number}</Link></td>
                <td className={td}>{l.supplier?.business_name || l.supplier?.name}</td>
                <td className={td}>{formatDate(l.created_at)}</td>
                <td className={td}>{LIST_STATUS[l.status] || l.status}{l.purchase_id ? ' · con compra' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
