import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSalesStore from '../../store/salesStore';
import useBranchStore from '../../store/branchStore';
import useTenantStore from '../../store/tenantStore';
import useAuthStore from '../../store/authStore';
import Layout from '../../components/layout/Layout';
import DianStatusBadge from '../../components/dian/DianStatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import RegisterSalePaymentModal from '../../components/sales/RegisterSalePaymentModal';
import salesApi from '../../api/sales';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { SALE_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../../constants/salesStatus';
import { bestPhone, buildWaLink } from '../../utils/whatsapp';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

const STATUS_LABELS = SALE_STATUS_LABELS;
const PAYMENT_LABELS = PAYMENT_STATUS_LABELS;

const DOC_LABELS = {
  remision:     'Remisión',
  factura:      'Factura',
  cotizacion:   'Cotización',
  nota_credito: 'Nota Crédito',
  nota_debito:  'Nota Débito',
};

// Remisión que se puede facturar desde el listado (el backend revalida todo:
// devoluciones, datos DIAN del cliente, resolución activa...). Solo las del
// mes en curso -- ver services/sales/remisionInvoicing.service.js.
const isInvoiceableRemision = (sale) => {
  if (sale.document_type !== 'remision' || !['pending', 'completed'].includes(sale.status) || sale.invoiced_in_sale_id) return false;
  const d = new Date(sale.sale_date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

// Marca de facturación de remisiones junto al tipo de documento.
function InvoicingTag({ sale }) {
  const cls = 'ml-1.5 inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300';
  if (sale.invoiced_in_sale_id) return <span className={cls} title="Incluida en una factura electrónica">Facturada</span>;
  if (sale.is_consolidated_invoice) return <span className={cls} title="Factura que agrupa varias remisiones">Agrupada</span>;
  if (sale.document_type === 'factura' && sale.remision_number) {
    return <span className={cls} title="Factura emitida desde una remisión">{sale.remision_number}</span>;
  }
  return null;
}

// Antigüedad de un documento por cobrar (days_overdue lo calcula el backend:
// negativo = aún no vence; sin fecha de vencimiento se asumen 30 días). Los
// borradores no vencen: todavía no son cartera.
function AgingBadge({ sale }) {
  if (sale.status === 'draft') {
    return (
      <div>
        <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">Borrador</span>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Sin confirmar</p>
      </div>
    );
  }
  const days = sale.days_overdue;
  if (days === null || days === undefined) return <span className="text-xs text-gray-300 dark:text-gray-700">—</span>;
  let cls = 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400';
  let label = `Vence en ${-days} día${days === -1 ? '' : 's'}`;
  if (days > 0) {
    cls = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    label = `Vencida hace ${days} día${days === 1 ? '' : 's'}`;
  } else if (days === 0) {
    cls = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    label = 'Vence hoy';
  } else if (days >= -5) {
    cls = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  }
  return (
    <div>
      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{label}</span>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
        {sale.due_date ? formatDate(sale.due_date) : 'Sin plazo (30 días)'}
      </p>
    </div>
  );
}

// Texto del recordatorio de pago por WhatsApp (enlace wa.me, mismo patrón del CRM).
const reminderText = (sale) => {
  const doc = sale.document_type ? `la ${(DOC_LABELS[sale.document_type] || 'documento').toLowerCase()}` : 'la venta';
  return `Hola ${sale.customer_name || ''}, te recordamos que ${doc} ${sale.sale_number} del ${formatDate(sale.sale_date)} tiene un saldo pendiente de ${formatCurrency(sale.balance)}. ¡Gracias!`;
};

const daysAgoLabel = (date) => {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return 'hoy';
  return days === 1 ? 'ayer' : `hace ${days} días`;
};

// Cobrar (o confirmar, si es borrador: el backend no admite abonos a un
// borrador, se cobra al confirmarlo) + recordatorio por WhatsApp, que queda
// como interacción del cliente.
function CollectActions({ sale, onCollect, onRemind }) {
  const text = reminderText(sale);
  const waLink = buildWaLink(bestPhone(sale.customer) || sale.customer_phone, text);
  const isDraft = sale.status === 'draft';
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onCollect}
          className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors whitespace-nowrap ${isDraft ? 'bg-violet-600 hover:bg-violet-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isDraft ? 'Confirmar y cobrar' : 'Registrar pago'}
        </button>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onRemind(text)}
            title="Enviar recordatorio de pago por WhatsApp"
            className="p-1.5 text-green-600 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
          </a>
        )}
      </div>
      {sale.last_reminder_at && (
        <p
          className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 whitespace-nowrap"
          title={`${sale.reminder_count} recordatorio${sale.reminder_count === 1 ? '' : 's'} enviado${sale.reminder_count === 1 ? '' : 's'}`}
        >
          Recordado {daysAgoLabel(sale.last_reminder_at)}{sale.reminder_count > 1 ? ` · ${sale.reminder_count} veces` : ''}
        </p>
      )}
    </div>
  );
}

// Filtro de antigüedad de "Por cobrar" (lo aplica el backend: parámetro aging).
const AGING_FILTERS = [
  { key: '',         label: 'Todas' },
  { key: 'overdue',  label: 'Vencidas' },
  { key: 'upcoming', label: 'Por vencer' },
  { key: 'draft',    label: 'Borradores' },
];

export default function SalesPage() {
  // Remisiones ocultas (Ajustes > Visibilidad de remisiones): el backend ya
  // no las devuelve a nadie salvo al superadmin impersonando; acá solo se
  // quita la opción del filtro.
  const tenantFeatures = useTenantStore(s => s.features);
  const isImpersonating = useAuthStore(s => s.isImpersonating);
  const hideRemisiones = tenantFeatures?.hide_remisiones_for_non_admin === true && !isImpersonating();
  const navigate = useNavigate();
  const { sales, loading, fetchSales, setFilters, filters, stats, fetchStats, page, pageSize, total } = useSalesStore();
  const { branches, fetchBranches } = useBranchStore();
  const hasCrm = (useTenantStore(s => s.enabledModules) || []).includes('crm');

  const [searchInput, setSearchInput] = useState(filters.customer_name || '');
  const [showFilters, setShowFilters] = useState(false);

  // Vista "Por cobrar": facturas/remisiones con saldo (lo que vence antes
  // primero) y, al final, los borradores de venta. Queda en el store para
  // que al volver del detalle de una venta se mantenga.
  const pendingView = filters.payment_view === 'pending';
  const [payingSale, setPayingSale] = useState(null);

  // Cualquier cambio de filtro vuelve a la página 1.
  const applyFilters = (updated) => {
    setFilters(updated);
    setSelectedIds([]);
    fetchSales({ ...updated, page: 1 });
  };

  const setPaymentView = (view) => {
    if (view === filters.payment_view) return;
    applyFilters({ payment_view: view, aging: '' });
  };

  const handlePageChange = (newPage) => {
    setSelectedIds([]);
    fetchSales({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCollect = (sale) => {
    if (sale.status === 'draft') navigate(`/sales/${sale.id}`, { state: { from: '/sales', openConfirm: true } });
    else setPayingSale(sale);
  };

  // Best-effort: el mensaje ya salió por wa.me; si falla el registro no se
  // bloquea nada. Sin cliente registrado no hay historial donde guardarlo.
  const handleRemind = (sale, message) => {
    if (!sale.customer_id) return;
    salesApi.registerPaymentReminder(sale.id, { message })
      .then(() => {
        useSalesStore.setState(st => ({
          sales: st.sales.map(s => (s.id === sale.id
            ? { ...s, last_reminder_at: new Date().toISOString(), reminder_count: (s.reminder_count || 0) + 1 }
            : s)),
        }));
        toast.success(hasCrm ? 'Recordatorio registrado en el historial del cliente (CRM)' : 'Recordatorio registrado', { duration: 3000 });
      })
      .catch(() => { /* best-effort */ });
  };

  // Facturar remisiones (una, o varias del mismo cliente agrupadas)
  const canInvoiceRemisiones = tenantFeatures?.allow_remision_to_invoice === true && !hideRemisiones;
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmInvoicing, setConfirmInvoicing] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const selectedSales = sales.filter(s => selectedIds.includes(s.id));
  const selectedCustomerId = selectedSales[0]?.customer_id;
  const selectedTotal = selectedSales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
  const isSelectable = (sale) => isInvoiceableRemision(sale)
    && (!selectedCustomerId || (sale.customer_id === selectedCustomerId && sale.branch_id === selectedSales[0]?.branch_id));
  const toggleSelected = (saleId) => setSelectedIds(ids => (ids.includes(saleId) ? ids.filter(i => i !== saleId) : [...ids, saleId]));

  const handleInvoiceSelected = async () => {
    setConfirmInvoicing(false);
    setInvoicing(true);
    try {
      const res = selectedIds.length === 1
        ? await salesApi.convertToInvoice(selectedIds[0])
        : await salesApi.consolidateInvoice(selectedIds);
      toast.success(res.data?.message || 'Factura creada', { duration: 6000 });
      const invoiceId = res.data?.data?.sale_id || res.data?.data?.id;
      setSelectedIds([]);
      if (invoiceId) navigate(`/sales/${invoiceId}`);
      else fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error facturando las remisiones', { duration: 8000 });
    } finally {
      setInvoicing(false);
    }
  };

  useEffect(() => {
    fetchSales();
    fetchStats();
    fetchBranches();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.customer_name) {
        applyFilters({ customer_name: searchInput });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleFilterChange = (key, value) => applyFilters({ [key]: value });

  // Limpia los filtros pero conserva la vista (Todas / Por cobrar).
  const handleReset = () => {
    setSearchInput('');
    applyFilters({ status: '', customer_name: '', from_date: '', to_date: '', document_type: '', vehicle_plate: '', branch_id: '' });
  };

  const handlePaymentSaved = () => {
    setPayingSale(null);
    fetchSales();
    fetchStats();
  };

  const hasActiveFilters = filters.status || filters.from_date || filters.to_date || filters.document_type || filters.vehicle_plate || filters.branch_id;

  return (
    <Layout>
      <div className="space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Ventas</h1>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
              {loading ? 'Cargando...' : `${total} resultado${total !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            id="tour-sales-new"
            onClick={() => navigate('/sales/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Nueva venta
          </button>
        </div>

        <div className="inline-flex p-1 bg-gray-100 dark:bg-white/5 rounded-lg">
          {[
            { key: '',        label: 'Todas' },
            { key: 'pending', label: 'Por cobrar', count: (stats?.pending_count || 0) + (stats?.draft_count || 0) },
          ].map(tab => (
            <button
              key={tab.key || 'all'}
              onClick={() => setPaymentView(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                (filters.payment_view || '') === tab.key
                  ? 'bg-white dark:bg-graphite text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {stats && !pendingView && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Total ventas',  value: stats.sales_count ?? 0,     isCurrency: false },
              { label: 'Monto total',   value: stats.total_amount ?? 0,    isCurrency: true  },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-500">{s.label}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                  {s.isCurrency ? formatCurrency(s.value) : s.value}
                </p>
              </div>
            ))}
            <button
              onClick={() => setPaymentView('pending')}
              className="text-left bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 px-4 py-3 hover:border-orange-300 dark:hover:border-orange-800/60 transition-colors"
              title="Ver documentos pendientes de pago"
            >
              <p className="text-xs text-gray-500 dark:text-gray-500">Por cobrar</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(stats.pending_amount ?? 0)}</p>
              {stats.overdue_amount > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{formatCurrency(stats.overdue_amount)} vencido</p>
              )}
              {stats.draft_count > 0 && (
                <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">+ {formatCurrency(stats.draft_amount)} en borradores</p>
              )}
            </button>
          </div>
        )}

        {stats && pendingView && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-500">Saldo por cobrar</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(stats.pending_amount ?? 0)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stats.pending_count ?? 0} documento{stats.pending_count === 1 ? '' : 's'}</p>
            </div>
            <div className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-500">Vencido</p>
              <p className={`text-lg font-semibold mt-0.5 ${stats.overdue_amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {formatCurrency(stats.overdue_amount ?? 0)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stats.overdue_count ?? 0} documento{stats.overdue_count === 1 ? '' : 's'}</p>
            </div>
            <div className="col-span-2 lg:col-span-1 bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-500">Borradores sin confirmar</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(stats.draft_amount ?? 0)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {stats.draft_count ?? 0} venta{stats.draft_count === 1 ? '' : 's'} · aún no son cartera
              </p>
            </div>
          </div>
        )}

        {pendingView && (
          <div className="flex flex-wrap gap-1.5">
            {AGING_FILTERS.map(a => (
              <button
                key={a.key || 'all'}
                onClick={() => applyFilters({ aging: a.key })}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  (filters.aging || '') === a.key
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800/40 dark:text-blue-300'
                    : 'bg-white dark:bg-graphite border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        <div id="tour-sales-search" className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 p-3 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por cliente o placa..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 dark:placeholder-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
                hasActiveFilters ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800/40 dark:text-blue-300' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              Filtros
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
              <select
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
                className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="pending">Confirmada</option>
                <option value="completed">Entregada</option>
                <option value="cancelled">Cancelada</option>
              </select>
              <select
                value={filters.document_type}
                onChange={e => handleFilterChange('document_type', e.target.value)}
                className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los documentos</option>
                {!hideRemisiones && <option value="remision">Remisión</option>}
                <option value="factura">Factura</option>
                <option value="nota_credito">Nota Crédito</option>
                <option value="nota_debito">Nota Débito</option>
              </select>
              <input
                type="date"
                value={filters.from_date}
                onChange={e => handleFilterChange('from_date', e.target.value)}
                className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 dark:text-gray-400"
              />
              <input
                type="date"
                value={filters.to_date}
                onChange={e => handleFilterChange('to_date', e.target.value)}
                className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 dark:text-gray-400"
              />
              {branches.length > 1 && (
                <select
                  value={filters.branch_id}
                  onChange={e => handleFilterChange('branch_id', e.target.value)}
                  className="text-sm border border-gray-200 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las sedes</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {canInvoiceRemisiones && selectedIds.length > 0 && (
          <div className="flex items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-lg px-4 py-3">
            <p className="text-sm text-indigo-900 dark:text-indigo-200">
              {selectedIds.length} remisi{selectedIds.length === 1 ? 'ón' : 'ones'} de {selectedSales[0]?.customer_name} · {formatCurrency(selectedTotal)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-white dark:hover:bg-white/5"
              >
                Quitar selección
              </button>
              <button
                onClick={() => setConfirmInvoicing(true)}
                disabled={invoicing}
                className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {invoicing ? 'Facturando...' : selectedIds.length === 1 ? 'Facturar electrónicamente' : 'Agrupar en una factura'}
              </button>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={confirmInvoicing}
          onCancel={() => setConfirmInvoicing(false)}
          onConfirm={handleInvoiceSelected}
          title={selectedIds.length === 1 ? 'Facturar electrónicamente' : 'Agrupar en una factura'}
          message={selectedIds.length === 1
            ? `La remisión ${selectedSales[0]?.sale_number} se convertirá en factura electrónica y se enviará a la DIAN.`
            : `Se emitirá una factura electrónica por ${formatCurrency(selectedTotal)} con las remisiones ${selectedSales.map(s => s.sale_number).join(', ')}. Pagos, cartera e inventario siguen en cada remisión.`}
          confirmText="Facturar"
        />

        <div id="tour-sales-table" className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                {pendingView ? 'No hay documentos pendientes de pago' : 'No hay ventas que mostrar'}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                {hasActiveFilters || searchInput || filters.aging
                  ? 'Intenta con otros filtros'
                  : pendingView ? 'Todas las ventas están al día' : 'Crea tu primera venta con el botón de arriba'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <table className="hidden lg:table min-w-full divide-y divide-gray-100 dark:divide-white/10">
                <thead className="bg-gray-50 dark:bg-graphite-2">
                  <tr>
                    {canInvoiceRemisiones && <th className="w-8 px-3 py-3" />}
                    {[
                      '#', 'Cliente', 'Documento',
                      ...(branches.length > 1 ? ['Sede'] : []),
                      'Fecha',
                      ...(pendingView ? ['Vencimiento', 'Total', 'Saldo', ''] : ['Total', 'Pago', 'Estado', 'DIAN']),
                    ].map((h, i) => (
                      <th key={h || `col-${i}`} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {sales.map(sale => {
                    const st = STATUS_LABELS[sale.status]          || STATUS_LABELS.draft;
                    const pt = PAYMENT_LABELS[sale.payment_status] || PAYMENT_LABELS.pending;
                    return (
                      <tr
                        key={sale.id}
                        onClick={() => navigate(`/sales/${sale.id}`)}
                        className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        {canInvoiceRemisiones && (
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            {isInvoiceableRemision(sale) && (
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(sale.id)}
                                disabled={!selectedIds.includes(sale.id) && !isSelectable(sale)}
                                onChange={() => toggleSelected(sale.id)}
                                title={isSelectable(sale) || selectedIds.includes(sale.id) ? 'Seleccionar para facturar' : 'Solo se agrupan remisiones del mismo cliente y sede'}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
                              />
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[11rem] truncate" title={sale.sale_number}>{sale.sale_number}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{sale.customer_name}</p>
                          {sale.vehicle_plate && <p className="text-xs text-gray-500 dark:text-gray-500">{sale.vehicle_plate}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {DOC_LABELS[sale.document_type] || '—'}
                          <InvoicingTag sale={sale} />
                          {sale.converted_to_work_order_id && (
                            <span
                              className="ml-1.5 inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                              title="Esta cotización ya fue convertida en una Orden de Trabajo"
                            >
                              → OT
                            </span>
                          )}
                        </td>
                        {branches.length > 1 && (
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{sale.branch?.name || '—'}</td>
                        )}
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(sale.sale_date)}</td>
                        {pendingView ? (
                          <>
                            <td className="px-4 py-3"><AgingBadge sale={sale} /></td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatCurrency(sale.total_amount)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(sale.balance)}</p>
                              {sale.payment_status === 'partial' && <p className="text-[11px] text-gray-400 dark:text-gray-500">Abonado {formatCurrency(sale.paid_amount)}</p>}
                            </td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <CollectActions sale={sale} onCollect={() => handleCollect(sale)} onRemind={text => handleRemind(sale, text)} />
                            </td>
                          </>
                        ) : (
                          <>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatCurrency(sale.total_amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${pt.cls}`}>{pt.label}</span>
                            {sale.payment_status === 'partial' && sale.balance > 0 && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5 whitespace-nowrap">Saldo {formatCurrency(sale.balance)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            {['factura', 'nota_credito', 'nota_debito'].includes(sale.document_type) ? (
                              <DianStatusBadge sale={sale} />
                            ) : (
                              <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                            )}
                          </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile */}
              <div className="lg:hidden divide-y divide-gray-100">
                {sales.map(sale => {
                  const st = STATUS_LABELS[sale.status]          || STATUS_LABELS.draft;
                  const pt = PAYMENT_LABELS[sale.payment_status] || PAYMENT_LABELS.pending;
                  if (pendingView) {
                    return (
                      <div
                        key={sale.id}
                        onClick={() => navigate(`/sales/${sale.id}`)}
                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{sale.customer_name}</p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">{DOC_LABELS[sale.document_type] || 'Venta'} {sale.sale_number} · {formatDate(sale.sale_date)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatCurrency(sale.balance)}</p>
                            {sale.payment_status === 'partial' && <p className="text-[11px] text-gray-400 whitespace-nowrap">de {formatCurrency(sale.total_amount)}</p>}
                          </div>
                        </div>
                        <div className="flex items-end justify-between gap-2 mt-2">
                          <AgingBadge sale={sale} />
                          <div onClick={e => e.stopPropagation()}>
                            <CollectActions sale={sale} onCollect={() => handleCollect(sale)} onRemind={text => handleRemind(sale, text)} />
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={sale.id}
                      onClick={() => navigate(`/sales/${sale.id}`)}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{sale.customer_name}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{sale.sale_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(sale.total_amount)}</p>
                          {sale.payment_status === 'partial' && sale.balance > 0 && (
                            <p className="text-[11px] text-gray-500 whitespace-nowrap">Saldo {formatCurrency(sale.balance)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pt.cls}`}>{pt.label}</span>
                        {sale.document_type === 'factura' && <DianStatusBadge sale={sale} />}
                        {sale.converted_to_work_order_id && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">→ OT</span>
                        )}
                        {branches.length > 1 && sale.branch?.name && (
                          <span className="text-xs text-gray-500">{sale.branch.name}</span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">{formatDate(sale.sale_date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {total > pageSize && (
          <div className="bg-white dark:bg-graphite rounded-lg border border-gray-200 dark:border-white/10 px-4 py-3">
            <Pagination currentPage={page} totalPages={Math.ceil(total / pageSize)} onPageChange={handlePageChange} />
          </div>
        )}

        {payingSale && (
          <RegisterSalePaymentModal
            invoice={payingSale}
            onClose={() => setPayingSale(null)}
            onSuccess={handlePaymentSaved}
          />
        )}

      </div>
    </Layout>
  );
}