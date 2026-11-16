import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ExclamationTriangleIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Layout from '../../components/layout/Layout';
import CustomerSearchInput from '../../components/common/CustomerSearchInput';
import ProductSearchInput from '../../components/common/ProductSearchInput';
import { recurringInvoicesApi } from '../../api/sales';
import { branchesService } from '../../api/branches';
import { formatCurrency } from '../../utils/formatters';
import useAuthStore from '../../store/authStore';

// Facturación recurrente: contratos que emiten solos su factura electrónica
// (a crédito, con el precio y el plazo del contrato) cada mes, bimestre,
// trimestre, semestre o año.

const STAFF_ROLES = ['admin', 'manager', 'accountant', 'super_admin'];
const FREQUENCIES = [[1, 'Mensual'], [2, 'Bimestral'], [3, 'Trimestral'], [6, 'Semestral'], [12, 'Anual']];
const STATUS = {
  active: ['Activo', 'bg-green-50 text-green-700'],
  paused: ['En pausa', 'bg-amber-50 text-amber-700'],
  finished: ['Terminado', 'bg-gray-100 text-gray-600'],
  cancelled: ['Cancelado', 'bg-gray-100 text-gray-500'],
};
const DIAN = { accepted: 'Aceptada', rejected: 'Rechazada', pending: 'Pendiente', sending: 'Enviando', sent: 'Enviada' };
const inputCls = 'mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const today = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
const emptyForm = () => ({ customer_id: '', customer_name: '', name: '', branch_id: '', items: [], frequency_months: 1, billing_day: 1, start_date: today(), end_date: '', max_invoices: '', credit_days: 30, notes: '' });

export default function RecurringInvoicesPage() {
  const { user } = useAuthStore();
  const isStaff = STAFF_ROLES.includes(user?.role);
  const [status, setStatus] = useState('active');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null); // null | form
  const [detail, setDetail] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setRows((await recurringInvoicesApi.list(status ? { status } : {})).data || []); }
    catch { toast.error('Error cargando los contratos'); }
    finally { setLoading(false); }
  };
  const loadPreview = async () => {
    try { setPreview((await recurringInvoicesApi.preview(month)).data); } catch { setPreview(null); }
  };
  useEffect(() => { load(); }, [status]);
  useEffect(() => { loadPreview(); }, [month]);
  const refresh = () => { load(); loadPreview(); };

  const openDetail = async (id) => {
    try { setDetail((await recurringInvoicesApi.get(id)).data); } catch { toast.error('Error cargando el contrato'); }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Facturación recurrente</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-3xl">
              Contratos que emiten solos su factura electrónica en la fecha que toca: a crédito, con el precio y el plazo del contrato.
              Cada factura se envía a la DIAN y al correo del cliente y entra a cartera. Los productos con ingreso diferido (anualidades) se amortizan solos.
            </p>
          </div>
          {isStaff && (
            <button onClick={() => setEditing(emptyForm())} className="flex items-center gap-1 px-4 py-2 rounded-md bg-blue-600 text-white text-sm">
              <PlusIcon className="h-4 w-4" /> Nuevo contrato
            </button>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-semibold text-gray-900">Por facturar en</h2>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
            {preview && <span className="text-sm text-gray-600">{preview.items.length} factura(s) · subtotal <b>{formatCurrency(preview.total)}</b> (sin impuestos)</span>}
          </div>
          {preview?.items?.length > 0 && (
            <ul className="mt-3 divide-y divide-gray-100 text-sm">
              {preview.items.map((p) => (
                <li key={`${p.id}-${p.date}`} className="py-1.5 flex justify-between gap-3">
                  <span>{p.date}{p.overdue && <span className="ml-2 text-xs text-amber-700">atrasada</span>} · {p.customer_name} — {p.name}</span>
                  <span>{formatCurrency(p.subtotal)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="active">Activos</option>
            <option value="paused">En pausa</option>
            <option value="finished">Terminados</option>
            <option value="cancelled">Cancelados</option>
            <option value="">Todos</option>
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Contrato</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Frecuencia</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
                <th className="px-3 py-2 text-left">Próxima factura</th>
                <th className="px-3 py-2 text-center">Emitidas</th>
                <th className="px-3 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Cargando…</td></tr>}
              {!loading && !rows.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">No hay contratos.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} onClick={() => openDetail(r.id)} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer align-top">
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {r.name}
                    {r.last_error && <div className="flex gap-1 text-xs text-red-600 mt-1"><ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" /> {r.last_error}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{r.customer_name}</td>
                  <td className="px-3 py-2">{r.frequency_label} · día {r.billing_day}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.subtotal)}</td>
                  <td className="px-3 py-2">{r.next_run_date || '—'}</td>
                  <td className="px-3 py-2 text-center">{r.invoices_count}{r.max_invoices ? ` / ${r.max_invoices}` : ''}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS[r.status]?.[1]}`}>{STATUS[r.status]?.[0]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <ContractForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); setDetail(null); }} />}
      {detail && (
        <ContractDetail
          contract={detail}
          isStaff={isStaff}
          onClose={() => setDetail(null)}
          onEdit={() => setEditing({ ...emptyForm(), ...detail, end_date: detail.end_date || '', max_invoices: detail.max_invoices || '', branch_id: detail.branch_id || '', notes: detail.notes || '' })}
          onChanged={async () => { refresh(); await openDetail(detail.id); }}
        />
      )}
    </Layout>
  );
}

function ContractForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  useEffect(() => { branchesService.getAll().then((r) => setBranches(r.data || r || [])).catch(() => {}); }, []);

  const addProduct = (p) => {
    const price = Number(p.sale_price || p.base_price || 0);
    set('items', [...form.items, { product_id: p.id, description: p.name, quantity: 1, unit_price: price, discount_percentage: 0 }]);
    setSearch('');
  };
  const setItem = (i, k, v) => set('items', form.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const subtotal = form.items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0) * (1 - Number(i.discount_percentage || 0) / 100), 0);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, max_invoices: form.max_invoices || null, end_date: form.end_date || null, branch_id: form.branch_id || null };
      const res = form.id ? await recurringInvoicesApi.update(form.id, payload) : await recurringInvoicesApi.create(payload);
      toast.success(res.message || 'Contrato guardado');
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error guardando el contrato');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl my-8 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{form.id ? 'Editar contrato' : 'Nuevo contrato recurrente'}</h2>
          <button onClick={onClose} aria-label="Cerrar"><XMarkIcon className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-sm text-gray-700">Cliente *</span>
            <CustomerSearchInput
              customers={form.customer_id && form.customer_name ? [{ id: form.customer_id, full_name: form.customer_name, business_name: form.customer_name }] : []}
              value={form.customer_id} onChange={(v) => set('customer_id', v)} />
          </div>
          <label className="block"><span className="text-sm text-gray-700">Nombre del contrato *</span>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="Plan Taller Básico" /></label>
          <label className="block"><span className="text-sm text-gray-700">Frecuencia</span>
            <select value={form.frequency_months} onChange={(e) => set('frequency_months', Number(e.target.value))} className={inputCls}>
              {FREQUENCIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></label>
          <label className="block"><span className="text-sm text-gray-700">Día de facturación (1 a 28)</span>
            <input type="number" min="1" max="28" value={form.billing_day} onChange={(e) => set('billing_day', Number(e.target.value))} className={inputCls} /></label>
          <label className="block"><span className="text-sm text-gray-700">Inicio *</span>
            <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputCls} /></label>
          <label className="block"><span className="text-sm text-gray-700">Plazo de crédito (días)</span>
            <input type="number" min="0" max="365" value={form.credit_days} onChange={(e) => set('credit_days', Number(e.target.value))} className={inputCls} /></label>
          <label className="block"><span className="text-sm text-gray-700">Fin (opcional)</span>
            <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} className={inputCls} /></label>
          <label className="block"><span className="text-sm text-gray-700">Número de facturas (opcional)</span>
            <input type="number" min="1" value={form.max_invoices} onChange={(e) => set('max_invoices', e.target.value)} className={inputCls} placeholder="Sin límite" /></label>
          <label className="block sm:col-span-2"><span className="text-sm text-gray-700">Sede (resolución de facturación)</span>
            <select value={form.branch_id} onChange={(e) => set('branch_id', e.target.value)} className={inputCls}>
              <option value="">Sede principal</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select></label>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Productos y servicios (precio pactado, sin impuestos)</h3>
          <ProductSearchInput value={search} onChange={setSearch} onSelect={addProduct} show={{ price: true }} placeholder="Agregar producto o servicio…" />
          <div className="mt-2 space-y-2">
            {form.items.map((it, i) => (
              <div key={`${it.product_id}-${i}`} className="grid grid-cols-12 gap-2 items-end border border-gray-100 rounded-md p-2">
                <div className="col-span-12 sm:col-span-5 text-sm text-gray-800 pb-2">{it.description}</div>
                <label className="col-span-4 sm:col-span-2 text-xs text-gray-600">Cant.<input type="number" min="0" step="any" value={it.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} className={inputCls} /></label>
                <label className="col-span-4 sm:col-span-2 text-xs text-gray-600">Precio<input type="number" min="0" value={it.unit_price} onChange={(e) => setItem(i, 'unit_price', e.target.value)} className={inputCls} /></label>
                <label className="col-span-3 sm:col-span-2 text-xs text-gray-600">Desc. %<input type="number" min="0" max="99" value={it.discount_percentage} onChange={(e) => setItem(i, 'discount_percentage', e.target.value)} className={inputCls} /></label>
                <button onClick={() => set('items', form.items.filter((_, idx) => idx !== i))} className="col-span-1 text-red-500 pb-2" aria-label="Quitar"><TrashIcon className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">Subtotal por factura: <b>{formatCurrency(subtotal)}</b>. El IVA y las retenciones se calculan al emitir, como en una venta normal.</p>
        </div>

        <label className="block"><span className="text-sm text-gray-700">Observaciones de la factura</span>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={inputCls} placeholder="Se agrega solo el período facturado" /></label>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 text-sm">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

function ContractDetail({ contract: c, isStaff, onClose, onEdit, onChanged }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const res = await fn();
      toast.success(res.message);
      await onChanged();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error', { duration: 8000 });
      await onChanged();
    } finally {
      setBusy(false);
    }
  };
  const open = ['active', 'paused'].includes(c.status);
  const due = c.status === 'active' && c.next_run_date && c.next_run_date <= today();

  return (
    <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-40 overflow-y-auto p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl my-8 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h2 className="text-lg font-semibold">{c.name}</h2>
            <p className="text-sm text-gray-600">{c.customer_name} · {c.frequency_label}, día {c.billing_day} · crédito {c.credit_days} días · subtotal {formatCurrency(c.subtotal)}</p>
            <p className="text-sm text-gray-600">Próxima factura: <b>{c.next_run_date || '—'}</b> · emitidas {c.invoices_count}{c.max_invoices ? ` de ${c.max_invoices}` : ''}{c.end_date ? ` · hasta ${c.end_date}` : ''}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar"><XMarkIcon className="h-5 w-5 text-gray-500" /></button>
        </div>
        {c.last_error && <div className="bg-red-50 text-red-700 text-sm rounded-md p-3 flex gap-2"><ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" /> {c.last_error}</div>}

        {isStaff && open && (
          <div className="flex flex-wrap gap-2">
            {due && <button disabled={busy} onClick={() => act(() => recurringInvoicesApi.runNow(c.id), 'Se emitirán ahora las facturas vencidas de este contrato y se enviarán a la DIAN. ¿Continuar?')} className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">{c.last_error ? 'Reintentar ahora' : 'Facturar ahora'}</button>}
            <button disabled={busy} onClick={onEdit} className="px-3 py-2 rounded-md border border-gray-300 text-sm">Editar</button>
            {c.status === 'active'
              ? <button disabled={busy} onClick={() => act(() => recurringInvoicesApi.setStatus(c.id, 'paused'))} className="px-3 py-2 rounded-md border border-gray-300 text-sm">Pausar</button>
              : <button disabled={busy} onClick={() => act(() => recurringInvoicesApi.setStatus(c.id, 'active'))} className="px-3 py-2 rounded-md border border-gray-300 text-sm">Reanudar</button>}
            <button disabled={busy} onClick={() => act(() => recurringInvoicesApi.setStatus(c.id, 'cancelled'), 'El contrato deja de facturar para siempre. ¿Terminarlo?')} className="px-3 py-2 rounded-md border border-red-300 text-red-700 text-sm">Terminar</button>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Líneas</h3>
          <ul className="text-sm divide-y divide-gray-100">
            {c.items.map((it, i) => (
              <li key={i} className="py-1 flex justify-between"><span>{it.description} × {it.quantity}{Number(it.discount_percentage) ? ` (−${it.discount_percentage} %)` : ''}</span><span>{formatCurrency(it.unit_price)}</span></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Historial</h3>
          {!c.runs.length && <p className="text-sm text-gray-500">Aún no se ha emitido ninguna factura.</p>}
          <table className="w-full text-sm">
            <tbody>
              {c.runs.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 align-top">
                  <td className="py-1.5 pr-3">{r.period_date}</td>
                  <td className="py-1.5 pr-3">
                    {r.sale ? <Link to={`/sales/${r.sale.id}`} className="text-blue-600 hover:underline">{r.sale.dian_invoice_number || r.sale.sale_number}</Link> : '—'}
                    {r.sale && <span className="ml-2 text-xs text-gray-500">{formatCurrency(r.sale.total_amount)} · DIAN {DIAN[r.sale.dian_status] || r.sale.dian_status || '—'}</span>}
                  </td>
                  <td className="py-1.5">
                    {r.status === 'issued' && <span className="text-xs text-green-700">Emitida</span>}
                    {r.status === 'failed' && <span className="text-xs text-red-600">Falló: {r.message}</span>}
                    {r.status === 'processing' && <span className="text-xs text-gray-500">En proceso</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
