import { useEffect, useState } from 'react';
import { Mail, MapPin, Pencil, Phone, Smartphone, Car, Wrench, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import PhoneCountryCodeSelect, { DEFAULT_COUNTRY_CODE } from '../common/PhoneCountryCodeSelect';
import axios from '../../api/axios';
import { vehiclesApi, workOrdersApi } from '../../api/workshop';
import { formatCurrency, formatDate } from '../../utils/formatters';

// Consulta del cliente desde la OT (o cualquier documento): datos, vehículos,
// últimas OT y ventas, y edición rápida SOLO de los datos de contacto. Los
// demás datos (documento, tributarios, retenciones) se editan en Clientes.
const CONTACT_FIELDS = ['phone', 'mobile', 'mobile_country_code', 'email', 'address', 'city'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const customerName = (c) => c?.business_name || [c?.first_name, c?.last_name].filter(Boolean).join(' ') || 'Cliente';

const contactOf = (c) => Object.fromEntries(CONTACT_FIELDS.map((k) => [
  k, k === 'mobile_country_code' ? (c?.[k] || DEFAULT_COUNTRY_CODE) : (c?.[k] || ''),
]));

const OT_STATUS = {
  recibido: 'Recibida', en_proceso: 'En proceso', en_espera: 'En espera',
  listo: 'Lista', entregado: 'Entregada', cancelado: 'Cancelada',
};

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-white/15 rounded-lg text-sm bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500 focus:border-transparent';

function Row({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
      <Icon size={14} className="mt-0.5 shrink-0 text-gray-400" />
      <span className="break-all">{children}</span>
    </div>
  );
}

export default function CustomerQuickViewModal({ isOpen, customerId, onClose, onUpdated, currentOrderId }) {
  const [customer, setCustomer] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(contactOf(null));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !customerId) return;
    let alive = true;
    setLoading(true);
    setEditing(false);
    Promise.allSettled([
      axios.get(`/customers/${customerId}`),
      vehiclesApi.list({ customer_id: customerId, limit: 20 }),
      workOrdersApi.list({ customer_id: customerId, limit: 6 }),
    ]).then(([c, v, o]) => {
      if (!alive) return;
      if (c.status === 'fulfilled') {
        setCustomer(c.value.data.data);
        setForm(contactOf(c.value.data.data));
      } else {
        toast.error('No se pudo cargar el cliente');
      }
      setVehicles(v.status === 'fulfilled' ? (v.value.data.data || []) : []);
      setOrders(o.status === 'fulfilled' ? (o.value.data.data || []) : []);
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [isOpen, customerId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const save = async () => {
    const email = form.email.trim().toLowerCase();
    if (email && !EMAIL_RE.test(email)) return toast.error('El correo no es válido');
    const payload = Object.fromEntries(CONTACT_FIELDS.map((k) => [k, typeof form[k] === 'string' ? form[k].trim() || null : form[k]]));
    payload.email = email || null;
    payload.mobile_country_code = form.mobile_country_code || DEFAULT_COUNTRY_CODE;
    setSaving(true);
    try {
      const res = await axios.put(`/customers/${customerId}`, payload);
      const updated = { ...customer, ...res.data.data };
      setCustomer(updated);
      setForm(contactOf(updated));
      setEditing(false);
      onUpdated?.(updated);
      toast.success('Datos de contacto actualizados');
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar el cliente');
    } finally {
      setSaving(false);
    }
  };

  const sales = customer?.sales || [];
  const otherOrders = orders.filter((o) => o.id !== currentOrderId).slice(0, 5);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={customer ? customerName(customer) : 'Cliente'} size="md">
      {loading && !customer ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : !customer ? (
        <p className="text-sm text-gray-500">Cliente no disponible.</p>
      ) : (
        <div className="space-y-5">
          {/* Identificación */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
            {customer.tax_id && <span>Documento: <b className="text-gray-800 dark:text-gray-200">{customer.tax_id}</b></span>}
            {customer.customer_type && <span>{customer.customer_type === 'company' ? 'Persona jurídica' : 'Persona natural'}</span>}
            {Number(customer.payment_terms) > 0 && <span>Crédito: {customer.payment_terms} días</span>}
          </div>

          {/* Contacto */}
          <section className="rounded-lg border border-gray-200 dark:border-white/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Contacto</h4>
              {!editing && (
                <button type="button" onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                  <Pencil size={12} /> Editar
                </button>
              )}
            </div>
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Celular (WhatsApp)</label>
                    <div className="flex gap-2">
                      <PhoneCountryCodeSelect value={form.mobile_country_code} onChange={set('mobile_country_code')} />
                      <input value={form.mobile} onChange={set('mobile')} className={inputCls} type="tel" inputMode="tel" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Teléfono</label>
                    <input value={form.phone} onChange={set('phone')} className={inputCls} type="tel" inputMode="tel" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-gray-500">Correo</label>
                    <input value={form.email} onChange={set('email')} className={inputCls} type="email" inputMode="email" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Dirección</label>
                    <input value={form.address} onChange={set('address')} className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Ciudad</label>
                    <input value={form.city} onChange={set('city')} className={inputCls} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setForm(contactOf(customer)); setEditing(false); }}
                    className="rounded-lg border border-gray-200 dark:border-white/15 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">
                    Cancelar
                  </button>
                  <button type="button" onClick={save} disabled={saving}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Row icon={Smartphone}>{customer.mobile ? `+${customer.mobile_country_code || DEFAULT_COUNTRY_CODE} ${customer.mobile}` : null}</Row>
                <Row icon={Phone}>{customer.phone}</Row>
                <Row icon={Mail}>{customer.email}</Row>
                <Row icon={MapPin}>{[customer.address, customer.city].filter(Boolean).join(', ') || null}</Row>
                {!customer.mobile && !customer.phone && !customer.email && (
                  <p className="text-xs text-amber-700">Sin datos de contacto — usa Editar para agregarlos.</p>
                )}
              </div>
            )}
          </section>

          {/* Vehículos */}
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200">
              <Car size={14} /> Vehículos ({vehicles.length})
            </h4>
            {vehicles.length ? (
              <div className="flex flex-wrap gap-2">
                {vehicles.map((v) => (
                  <span key={v.id} className="rounded-md border border-gray-200 dark:border-white/10 px-2 py-1 text-xs text-gray-700 dark:text-gray-300">
                    <b>{v.plate}</b>{[v.brand, v.model, v.year].filter(Boolean).length ? ` · ${[v.brand, v.model, v.year].filter(Boolean).join(' ')}` : ''}
                  </span>
                ))}
              </div>
            ) : <p className="text-xs text-gray-500">Sin vehículos registrados.</p>}
          </section>

          {/* Historial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200">
                <Wrench size={14} /> Otras OT
              </h4>
              {otherOrders.length ? (
                <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  {otherOrders.map((o) => (
                    <li key={o.id} className="flex justify-between gap-2">
                      <span><b className="text-gray-800 dark:text-gray-200">{o.order_number}</b> {o.vehicle?.plate || ''}</span>
                      <span>{OT_STATUS[o.status] || o.status} · {formatDate(o.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-gray-500">Sin otras órdenes.</p>}
            </section>
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200">
                <Receipt size={14} /> Últimas ventas
              </h4>
              {sales.length ? (
                <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  {sales.slice(0, 5).map((s) => (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span><b className="text-gray-800 dark:text-gray-200">{s.sale_number || '—'}</b> · {formatDate(s.sale_date)}</span>
                      <span>{formatCurrency(s.total_amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-gray-500">Sin ventas.</p>}
            </section>
          </div>
        </div>
      )}
    </Modal>
  );
}
