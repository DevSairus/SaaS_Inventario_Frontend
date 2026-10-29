import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, FileDown, Mail, MessageCircle, CheckCircle, ShoppingCart, Trash2, XCircle, Link2 } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/common/Modal';
import ProductSearchInput from '../../components/common/ProductSearchInput';
import OrderLineForm from '../../components/order-lists/OrderLineForm';
import useAuthStore from '../../store/authStore';
import { bestPhone, buildWaLink } from '../../utils/whatsapp';
import {
  getOrderList, updateOrderListItem, deleteOrderListItem, updateOrderList, closeOrderList,
  cancelOrderList, getOrderListPdf, sendOrderListEmail, logOrderListSend, getPurchaseDraft,
} from '../../api/orderLists';

// Mismos roles que routes/inventory/orderLists.routes.js (revisar, enviar, cerrar)
const MANAGE_ROLES = ['admin', 'manager', 'warehouse_keeper', 'super_admin'];

const STATUS = {
  open: { label: 'Abierto', cls: 'bg-orange-100 text-orange-800' },
  ordered: { label: 'Pedido realizado', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Descartado', cls: 'bg-gray-100 text-gray-700' },
};
const CHANNEL = { email: 'Correo', whatsapp: 'WhatsApp' };

const fmtQty = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toLocaleString('es-CO', { maximumFractionDigits: 2 });
};
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const userName = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email || '';
const errMsg = (e, fallback) => e.response?.data?.message || fallback;

// Texto del pedido para WhatsApp (sin precios)
const whatsappText = (list) => {
  const lines = list.items.map((i, idx) => {
    const code = i.supplier_code || i.product?.sku;
    const name = i.product?.name || i.description;
    return `${idx + 1}. ${code ? `[${code}] ` : ''}${name} — ${fmtQty(i.quantity)}${i.notes ? ` (${i.notes})` : ''}`;
  });
  return [
    `Hola${list.supplier?.contact_name ? ` ${list.supplier.contact_name}` : ''}, les compartimos nuestro pedido ${list.list_number}:`,
    '',
    ...lines,
    ...(list.notes ? ['', list.notes] : []),
    '',
    'Por favor confírmennos disponibilidad, precios y tiempo de entrega. ¡Gracias!',
  ].join('\n');
};

function ItemRow({ item, editable, onChanged }) {
  const [qty, setQty] = useState(String(Number(item.quantity)));
  const [notes, setNotes] = useState(item.notes || '');
  const [linking, setLinking] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setQty(String(Number(item.quantity))); setNotes(item.notes || ''); }, [item.quantity, item.notes]);

  const save = async (data) => {
    setBusy(true);
    try {
      const res = await updateOrderListItem(item.id, data);
      if (data.product_id) toast.success(res.message || 'Línea enlazada');
      onChanged();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo actualizar la línea'));
      setQty(String(Number(item.quantity)));
      setNotes(item.notes || '');
    } finally {
      setBusy(false);
    }
  };

  const saveQty = () => {
    const q = Number(String(qty).replace(',', '.'));
    if (q === Number(item.quantity)) return;
    if (!(q > 0)) { toast.error('La cantidad debe ser mayor que cero'); setQty(String(Number(item.quantity))); return; }
    save({ quantity: q });
  };
  const saveNotes = () => { if ((item.notes || '') !== notes.trim()) save({ notes: notes.trim() }); };
  const remove = async () => {
    if (!window.confirm('¿Quitar esta línea del pedido?')) return;
    try { await deleteOrderListItem(item.id); onChanged(); } catch (e) { toast.error(errMsg(e, 'No se pudo eliminar la línea')); }
  };

  const p = item.product;
  const low = p && Number(p.current_stock) <= Number(p.min_stock);

  return (
    <tr className={busy ? 'opacity-60' : ''}>
      <td className="px-4 py-3 align-top">
        {p ? (
          <>
            <p className="font-medium text-gray-900">{p.name}</p>
            <p className="text-xs text-gray-500">
              SKU {p.sku}{item.supplier_code && <> · Cód. proveedor <span className="font-medium">{item.supplier_code}</span></>}
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-gray-900">{item.description}</p>
            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[11px] rounded bg-amber-100 text-amber-800">Línea libre (no está en el catálogo)</span>
            {editable && !linking && (
              <button onClick={() => setLinking(true)} className="ml-2 text-xs text-orange-600 hover:underline inline-flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Enlazar a producto
              </button>
            )}
            {linking && (
              <div className="mt-2 max-w-sm">
                <ProductSearchInput
                  value={search}
                  onChange={setSearch}
                  onSelect={(prod) => { setLinking(false); save({ product_id: prod.id }); }}
                  onClear={() => { setSearch(''); setLinking(false); }}
                  autoFocus
                />
              </div>
            )}
          </>
        )}
      </td>
      <td className="px-3 py-3 align-top text-sm hidden md:table-cell">
        {p ? (
          <span className={low ? 'text-red-600 font-medium' : 'text-gray-700'}>
            {fmtQty(p.current_stock)} <span className="text-xs text-gray-400">/ mín {fmtQty(p.min_stock)}</span>
          </span>
        ) : '—'}
      </td>
      <td className="px-3 py-3 align-top">
        {editable ? (
          <input
            type="number" min="0" step="any" value={qty}
            onChange={(e) => setQty(e.target.value)}
            onBlur={saveQty}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-orange-500"
          />
        ) : <span className="font-semibold">{fmtQty(item.quantity)}</span>}
      </td>
      <td className="px-3 py-3 align-top">
        {editable ? (
          <input
            type="text" value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="—"
            className="w-full min-w-[8rem] px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
          />
        ) : <span className="text-sm text-gray-600">{item.notes || '—'}</span>}
      </td>
      <td className="px-3 py-3 align-top text-xs text-gray-500 hidden lg:table-cell">
        {userName(item.adder)}
        <span className="block">{fmtDateTime(item.created_at)}</span>
      </td>
      <td className="px-3 py-3 align-top text-right">
        {editable && (
          <button onClick={remove} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Quitar">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  );
}

export default function OrderListDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canManage = MANAGE_ROLES.includes(user?.role);

  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState({ to: '', cc: '', message: '' });

  const load = useCallback(async () => {
    try {
      const res = await getOrderList(id);
      setList(res.data);
      setNotes(res.data.notes || '');
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo cargar el pedido'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <Layout><div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" /></div></Layout>;
  }
  if (!list) {
    return <Layout><div className="p-12 text-center text-gray-500">Pedido no encontrado. <Link to="/order-lists" className="text-orange-600">Volver</Link></div></Layout>;
  }

  const isOpen = list.status === 'open';
  const supplier = list.supplier || {};
  const supplierName = supplier.business_name || supplier.name;
  const freeCount = list.items.filter((i) => !i.product_id).length;
  const hasItems = list.items.length > 0;
  const waPhone = bestPhone(supplier) || supplier.contact_phone;

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      toast.success(res?.message || okMsg);
      await load();
      return res;
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo completar la acción'));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveNotes = () => {
    if ((list.notes || '') === notes.trim()) return;
    run(() => updateOrderList(list.id, { notes: notes.trim() }), 'Observaciones guardadas');
  };

  const downloadPdf = async () => {
    setBusy(true);
    try {
      const blob = await getOrderListPdf(list.id);
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.error('No se pudo generar el PDF');
    } finally {
      setBusy(false);
    }
  };

  const openEmail = () => {
    setEmail({ to: [supplier.email, supplier.contact_email].filter(Boolean).join(', '), cc: '', message: '' });
    setShowEmail(true);
  };
  const sendEmail = async () => {
    const res = await run(() => sendOrderListEmail(list.id, { to: email.to, cc: email.cc, message: email.message }), 'Pedido enviado');
    if (res) setShowEmail(false);
  };

  const sendWhatsapp = () => {
    const link = buildWaLink(waPhone, whatsappText(list));
    if (!link) { toast.error('El proveedor no tiene celular registrado'); return; }
    window.open(link, '_blank');
    // Best-effort: solo se sabe que se abrió el enlace.
    logOrderListSend(list.id, { channel: 'whatsapp', to: waPhone }).then(load).catch(() => {});
  };

  const markOrdered = () => {
    if (!window.confirm(`¿Marcar el pedido ${list.list_number} como realizado? Pasa al historial y la próxima anotación para ${supplierName} abrirá un pedido nuevo.`)) return;
    run(() => closeOrderList(list.id, { notes: notes.trim() }), 'Pedido realizado');
  };

  const discard = () => {
    if (!window.confirm(`¿Descartar el pedido ${list.list_number}? Queda en el historial como descartado.`)) return;
    run(() => cancelOrderList(list.id), 'Pedido descartado');
  };

  const createPurchase = async () => {
    setBusy(true);
    try {
      const res = await getPurchaseDraft(list.id);
      navigate('/purchases/new', { state: { prefilledData: res.data } });
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo preparar la compra'), { duration: 6000 });
    } finally {
      setBusy(false);
    }
  };

  const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50';

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="min-w-0">
            <button onClick={() => navigate(isOpen ? '/order-lists' : '/order-lists?tab=history')} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-1">
              <ArrowLeft className="w-4 h-4" /> Pedidos a proveedores
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{supplierName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{list.list_number}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS[list.status]?.cls}`}>{STATUS[list.status]?.label}</span>
              {list.ordered_at && <span>· {fmtDateTime(list.ordered_at)}{list.orderer && ` por ${userName(list.orderer)}`}</span>}
              {list.purchase && (
                <span>· Compra <Link to={`/purchases/${list.purchase.id}`} className="text-orange-600 hover:underline">{list.purchase.purchase_number}</Link></span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {[supplier.contact_name, supplier.mobile || supplier.phone, supplier.email].filter(Boolean).join(' · ')}
            </p>
          </div>

          {canManage && list.status !== 'cancelled' && (
            <div className="flex flex-wrap gap-2">
              <button onClick={downloadPdf} disabled={busy || !hasItems} className={`${btn} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}>
                <FileDown className="w-4 h-4" /> PDF
              </button>
              <button onClick={openEmail} disabled={busy || !hasItems} className={`${btn} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}>
                <Mail className="w-4 h-4" /> Correo
              </button>
              <button onClick={sendWhatsapp} disabled={busy || !hasItems} className={`${btn} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}>
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
              {!list.purchase_id && (
                <button
                  onClick={createPurchase}
                  disabled={busy || !hasItems}
                  title={freeCount ? 'Enlaza las líneas libres a un producto para crear la compra' : 'Precargar una compra con estas cantidades'}
                  className={`${btn} border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}
                >
                  <ShoppingCart className="w-4 h-4" /> Crear compra
                </button>
              )}
              {isOpen && (
                <>
                  <button onClick={markOrdered} disabled={busy || !hasItems} className={`${btn} bg-green-600 text-white hover:bg-green-700`}>
                    <CheckCircle className="w-4 h-4" /> Marcar como pedido
                  </button>
                  <button onClick={discard} disabled={busy} className={`${btn} text-red-600 hover:bg-red-50`}>
                    <XCircle className="w-4 h-4" /> Descartar
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {isOpen && freeCount > 0 && (
          <div className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2">
            Hay {freeCount} línea(s) libre(s). Se pueden pedir así, pero para convertir el pedido en compra deben enlazarse a un producto del catálogo (o crearlo primero).
          </div>
        )}

        {isOpen && (
          <div className="bg-white rounded-xl shadow-md p-4">
            <OrderLineForm supplierId={list.supplier_id} onAdded={load} compact />
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {hasItems ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-3 py-3 hidden md:table-cell">Stock</th>
                    <th className="px-3 py-3">Cantidad</th>
                    <th className="px-3 py-3">Nota</th>
                    <th className="px-3 py-3 hidden lg:table-cell">Anotado por</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {list.items.map((item) => (
                    <ItemRow key={item.id} item={item} editable={isOpen} onChanged={load} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-8 text-center text-gray-500 text-sm">La lista está vacía.</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-md p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones para el proveedor</label>
            {isOpen ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                rows={3}
                placeholder="Ej: entregar en la sede norte, confirmar antes de despachar..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 resize-none"
              />
            ) : <p className="text-sm text-gray-600 whitespace-pre-line">{list.notes || '—'}</p>}
            <p className="text-xs text-gray-400 mt-1">Salen en el PDF, el correo y el WhatsApp, igual que las notas de cada línea.</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Envíos al proveedor</p>
            {(list.sent_log || []).length === 0 ? (
              <p className="text-sm text-gray-400">Aún no se ha enviado.</p>
            ) : (
              <ul className="text-sm text-gray-600 space-y-1">
                {[...list.sent_log].reverse().map((s, i) => (
                  <li key={i}>
                    {fmtDateTime(s.date)} · {CHANNEL[s.channel] || s.channel}
                    {s.to && <span className="text-gray-400"> → {Array.isArray(s.to) ? s.to.join(', ') : s.to}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={showEmail} onClose={() => setShowEmail(false)} title={`Enviar pedido ${list.list_number}`} size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Para</label>
            <input type="text" value={email.to} onChange={(e) => setEmail({ ...email, to: e.target.value })} placeholder="correo@proveedor.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CC (opcional)</label>
            <input type="text" value={email.cc} onChange={(e) => setEmail({ ...email, cc: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje (opcional)</label>
            <textarea rows={3} value={email.message} onChange={(e) => setEmail({ ...email, message: e.target.value })} placeholder="Si lo dejas vacío se usa un mensaje estándar." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
          </div>
          <p className="text-xs text-gray-500">Se adjunta el PDF del pedido (sin precios).</p>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowEmail(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">Cancelar</button>
            <button onClick={sendEmail} disabled={busy} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium disabled:opacity-50">
              {busy ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
