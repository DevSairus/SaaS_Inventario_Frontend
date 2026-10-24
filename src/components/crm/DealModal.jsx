// Ventana del negocio: muestra la cotización ligada (fotos, totales) con
// acciones de venta (WhatsApp, imprimir, copiar link), edición con guardado
// explícito (cerrar sin guardar no cambia nada) y seguimientos.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle, Phone, Printer, Link2, Pencil, Loader2, CalendarClock, Check, FileText, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import QuoteLinesEditor, { QuoteSummary, computeTotals, buildSaleItems, linesFromSaleItems } from './QuoteLinesEditor';
import crmApi from '../../api/crm';
import salesApi from '../../api/sales';
import { formatCurrency, toInteger } from '../../utils/formatters';
import { buildWaLink, bestPhone } from '../../utils/whatsapp';

const QUOTE_STATUS = {
  borrador: { label: 'Borrador', cls: 'bg-gray-100 text-gray-600' },
  enviada: { label: 'Enviada', cls: 'bg-sky-50 text-sky-700' },
  aprobada: { label: 'Aprobada', cls: 'bg-emerald-50 text-emerald-700' },
  parcial: { label: 'Aprobada parcial', cls: 'bg-amber-50 text-amber-700' },
  rechazada: { label: 'Rechazada', cls: 'bg-red-50 text-red-700' },
  vencida: { label: 'Vencida', cls: 'bg-gray-100 text-gray-500' },
};

const GRADIENT_BTN = '!bg-gradient-to-r !from-orange-500 !via-rose-500 !to-fuchsia-600 hover:!opacity-90 !shadow-sm !shadow-rose-500/30 disabled:!opacity-50';
const ACTION_BTN = 'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-50';

const customerName = (c) => (c ? (c.business_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Cliente') : 'Cliente');

const discountFromSale = (sale) => ({
  type: sale?.global_discount_type || 'percentage',
  value: Number(sale?.global_discount_value) > 0 ? String(Number(sale.global_discount_value)) : '',
});

const defaultDueAt = () => {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setHours(10, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function DealModal({ opportunity, stage, startInCreate = false, onClose, onChanged }) {
  const navigate = useNavigate();
  const isOpen = !!opportunity;
  const [quoteId, setQuoteId] = useState(null);
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('view'); // view | edit | create
  const [lines, setLines] = useState([]);
  const [discount, setDiscount] = useState({ type: 'percentage', value: '' });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null); // 'wa' | 'print' | 'link'
  const [followUps, setFollowUps] = useState([]);
  const [fuForm, setFuForm] = useState({ title: '', due_at: '' });
  const [fuSaving, setFuSaving] = useState(false);

  const loadSale = useCallback(async (id) => {
    if (!id) { setSale(null); setLines([]); return; }
    setLoading(true);
    try {
      const res = await salesApi.getById(id);
      const data = res.data.data;
      setSale(data);
      setLines(linesFromSaleItems(data.items));
      setDiscount(discountFromSale(data));
    } catch {
      toast.error('No se pudo cargar la cotización');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFollowUps = useCallback(async (oppId) => {
    try {
      const res = await crmApi.listFollowUps({ status: 'pendiente' });
      setFollowUps((res.data.data || []).filter(t => t.opportunity_id === oppId));
    } catch { setFollowUps([]); }
  }, []);

  useEffect(() => {
    if (!opportunity) return;
    setLines([]);
    setDiscount({ type: 'percentage', value: '' });
    setMode(startInCreate && !opportunity.quote_sale_id ? 'create' : 'view');
    setSale(null);
    setLoading(!!opportunity.quote_sale_id);
    setQuoteId(opportunity.quote_sale_id || null);
    setFuForm({ title: 'Llamar para cerrar la cotización', due_at: defaultDueAt() });
    loadSale(opportunity.quote_sale_id);
    loadFollowUps(opportunity.id);
  }, [opportunity, startInCreate, loadSale, loadFollowUps]);

  const totals = useMemo(() => computeTotals(lines, discount), [lines, discount]);
  const customer = opportunity?.customer;
  const phone = bestPhone(customer);
  const status = QUOTE_STATUS[sale?.quote_status || 'borrador'];
  const editing = mode !== 'view';

  const startCreate = () => { setLines([]); setDiscount({ type: 'percentage', value: '' }); setMode('create'); };
  const cancelEdit = () => {
    setLines(linesFromSaleItems(sale?.items));
    setDiscount(discountFromSale(sale));
    setMode('view');
  };

  const handleSave = async () => {
    if (lines.length === 0) { toast.error('Agrega al menos un producto o combo'); return; }
    setSaving(true);
    try {
      const payload = {
        items: buildSaleItems(lines),
        global_discount_type: discount.type,
        global_discount_value: toInteger(discount.value, 0),
      };
      let id = quoteId;
      if (mode === 'create') {
        const res = await salesApi.create({
          ...payload, customer_id: opportunity.customer_id, document_type: 'cotizacion', opportunity_id: opportunity.id,
        });
        id = res.data.data?.id;
        setQuoteId(id);
      } else {
        await salesApi.update(id, payload);
      }
      await crmApi.updateOpportunity(opportunity.id, { expected_value: totals.grandTotal || null }).catch(() => {});
      toast.success(mode === 'create' ? 'Cotización creada' : 'Cambios guardados');
      setMode('view');
      await loadSale(id);
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo guardar la cotización');
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsApp = async () => {
    const win = window.open('', '_blank');
    setBusy('wa');
    try {
      const res = await salesApi.sendWhatsApp(quoteId);
      const { channel, waLink, message } = res.data;
      if (channel === 'cloud_api') {
        win?.close();
        toast.success(message || 'Cotización enviada por WhatsApp Pitbox.', { duration: 5000 });
      } else if (waLink && win) {
        win.location.href = waLink;
        toast.success('Se abrió WhatsApp con el mensaje listo. Presiona Enviar.', { duration: 5000 });
      } else {
        win?.close();
        toast.error('No se pudo generar el enlace de WhatsApp.');
      }
      loadSale(quoteId);
    } catch (e) {
      win?.close();
      toast.error(e.response?.data?.message || 'Error al enviar por WhatsApp');
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = async () => {
    const win = window.open('', '_blank');
    setBusy('print');
    try {
      const res = await salesApi.generatePDF(quoteId);
      const url = URL.createObjectURL(res.data);
      if (win) {
        win.location.href = url;
        win.onload = () => win.print();
      }
    } catch {
      win?.close();
      toast.error('Error al generar el PDF');
    } finally {
      setBusy(null);
    }
  };

  const handleCopyLink = async () => {
    setBusy('link');
    try {
      const res = await salesApi.generateShareLink(quoteId);
      if (!res.data.url) throw new Error();
      await navigator.clipboard.writeText(res.data.url);
      toast.success('Enlace copiado');
      loadSale(quoteId);
    } catch {
      toast.error('No se pudo copiar el enlace');
    } finally {
      setBusy(null);
    }
  };

  const handleAddFollowUp = async (e) => {
    e.preventDefault();
    if (!fuForm.title.trim() || !fuForm.due_at) { toast.error('Escribe qué hacer y cuándo'); return; }
    setFuSaving(true);
    try {
      await crmApi.createFollowUp({
        customer_id: opportunity.customer_id,
        opportunity_id: opportunity.id,
        title: fuForm.title.trim(),
        due_at: new Date(fuForm.due_at).toISOString(),
      });
      toast.success('Seguimiento programado');
      setFuForm({ title: 'Llamar para cerrar la cotización', due_at: defaultDueAt() });
      loadFollowUps(opportunity.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo programar el seguimiento');
    } finally {
      setFuSaving(false);
    }
  };

  const completeFollowUp = async (id) => {
    try {
      await crmApi.completeFollowUp(id);
      setFollowUps(fs => fs.filter(f => f.id !== id));
      toast.success('Seguimiento completado');
    } catch {
      toast.error('No se pudo completar el seguimiento');
    }
  };

  const waLink = phone ? buildWaLink(phone, '') : null;

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title="Negocio" size="lg">
      {opportunity && (
        <div className="space-y-5">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-bold text-gray-900 break-words">{customerName(customer)}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                {stage && (
                  <span className="px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: stage.color || '#64748b' }}>
                    {stage.label}
                  </span>
                )}
                {sale && (
                  <>
                    <span className="flex items-center gap-1 text-gray-500"><FileText size={12} /> {sale.sale_number}</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${status.cls}`}>{status.label}</span>
                  </>
                )}
              </div>
              {phone && (
                <div className="mt-2 flex items-center gap-2">
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noreferrer" title="Abrir chat de WhatsApp"
                      className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">
                      <MessageCircle size={16} />
                    </a>
                  )}
                  <a href={`tel:${phone}`} title="Llamar" className="p-2 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition">
                    <Phone size={16} />
                  </a>
                  <span className="text-sm text-gray-500 truncate">{phone}</span>
                </div>
              )}
            </div>
            {(sale || editing) && (
              <div className="sm:text-right shrink-0">
                <p className="text-xs uppercase tracking-wide text-gray-400">Total</p>
                <p className="text-3xl font-extrabold tabular-nums bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600 bg-clip-text text-transparent">
                  {formatCurrency(totals.grandTotal)}
                </p>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : !sale && !editing ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-8 text-center">
              <FileText size={28} className="text-gray-300" />
              <p className="text-sm text-gray-600">Este negocio aún no tiene cotización</p>
              <Button type="button" variant="primary" onClick={startCreate} className={GRADIENT_BTN}>Crear cotización</Button>
            </div>
          ) : (
            <>
              {!editing && (
                <div className="flex flex-wrap gap-2 whitespace-nowrap [&>button]:flex-1 [&>button]:basis-[40%] lg:[&>button]:basis-0">
                  <button type="button" onClick={handleWhatsApp} disabled={!!busy}
                    className="!basis-full lg:!basis-0 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600 shadow-sm shadow-rose-500/30 hover:opacity-90 active:scale-95 transition disabled:opacity-60">
                    {busy === 'wa' ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} Enviar por WhatsApp
                  </button>
                  <button type="button" onClick={handlePrint} disabled={!!busy} className={ACTION_BTN}>
                    {busy === 'print' ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Imprimir
                  </button>
                  <button type="button" onClick={handleCopyLink} disabled={!!busy} className={ACTION_BTN}>
                    {busy === 'link' ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />} Copiar link
                  </button>
                  <button type="button" onClick={() => setMode('edit')} className={`${ACTION_BTN} !basis-full lg:!basis-0`}>
                    <Pencil size={16} /> Editar
                  </button>
                </div>
              )}

              <QuoteLinesEditor lines={lines} onChange={setLines} readOnly={!editing}
                label={editing ? 'Productos de la cotización *' : 'Productos cotizados'} />

              {!editing && <QuoteSummary totals={totals} discount={discount} readOnly sticky={false} />}

              {!editing && (
                <section className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-800"><CalendarClock size={16} className="text-rose-500" /> Seguimiento</p>
                  {followUps.length > 0 && (
                    <ul className="space-y-2">
                      {followUps.map(f => (
                        <li key={f.id} className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 break-words">{f.title}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(f.due_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <button type="button" onClick={() => completeFollowUp(f.id)} title="Marcar como hecho"
                            className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 shrink-0">
                            <Check size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form onSubmit={handleAddFollowUp} className="flex flex-col sm:flex-row gap-2">
                    <input value={fuForm.title} onChange={e => setFuForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="¿Qué hay que hacer?" className="input flex-1 min-w-0" />
                    <input type="datetime-local" value={fuForm.due_at} onChange={e => setFuForm(f => ({ ...f, due_at: e.target.value }))}
                      className="input sm:!w-52" />
                    <Button type="submit" variant="secondary" disabled={fuSaving} className="shrink-0">
                      {fuSaving ? 'Guardando...' : 'Programar'}
                    </Button>
                  </form>
                </section>
              )}

              {editing ? (
                <QuoteSummary totals={totals} discount={discount} onDiscountChange={setDiscount}>
                  <div className="flex sm:justify-end gap-2">
                    <Button type="button" variant="secondary" disabled={saving} className="flex-1 sm:flex-none"
                      onClick={mode === 'create' ? () => setMode('view') : cancelEdit}>Cancelar</Button>
                    <Button type="button" variant="primary" disabled={saving || lines.length === 0} onClick={handleSave} className={`flex-1 sm:flex-none ${GRADIENT_BTN}`}>
                      {saving ? 'Guardando...' : mode === 'create' ? 'Crear cotización' : 'Guardar cambios'}
                    </Button>
                  </div>
                </QuoteSummary>
              ) : (
                <button type="button" onClick={() => navigate(`/customers/${opportunity.customer_id}`)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  <ExternalLink size={12} /> Ver ficha del cliente
                </button>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
