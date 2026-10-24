// "Nuevo negocio": crea la oportunidad y su cotización en un solo paso.
// Los precios salen del catálogo (producto/combo) y no se editan; el asesor
// solo elige productos, cantidades y un descuento global (% o $).
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import CustomerSearchInput from '../common/CustomerSearchInput';
import QuoteLinesEditor, { QuoteSummary, computeTotals, buildSaleItems } from './QuoteLinesEditor';
import crmApi from '../../api/crm';
import customersApi from '../../api/customers';
import salesApi from '../../api/sales';
import { toInteger } from '../../utils/formatters';
import { notifyGoalMilestones } from '../../store/goalMilestoneStore';

const SOURCES = [
  ['walk_in', 'Mostrador'], ['whatsapp', 'WhatsApp'], ['llamada', 'Llamada'], ['referido', 'Referido'],
  ['redes', 'Redes sociales'], ['web', 'Web'], ['recompra_recurrente', 'Recompra recurrente'],
];

const EMPTY_FORM = { customer_id: '', source: 'walk_in', expected_close_date: '' };
const EMPTY_CUSTOMER = { full_name: '', customer_type: 'individual', phone: '', email: '' };

// `initialCustomer` preselecciona un cliente existente; sin él, `initialPhone`
// abre el formulario de cliente nuevo con ese teléfono (p. ej. desde un chat).
export default function NewDealModal({ isOpen, onClose, onCreated, initialCustomer = null, initialPhone = '', initialSource = '' }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState(EMPTY_CUSTOMER);
  const [lines, setLines] = useState([]);
  const [discount, setDiscount] = useState({ type: 'percentage', value: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...EMPTY_FORM, customer_id: initialCustomer?.id || '', source: initialSource || EMPTY_FORM.source });
    setNewCustomerMode(!initialCustomer && !!initialPhone);
    setNewCustomerForm({ ...EMPTY_CUSTOMER, phone: initialPhone || '' });
    setLines([]);
    setDiscount({ type: 'percentage', value: '' });
    // El buscador solo muestra clientes de la lista: si el preseleccionado no
    // vino en los primeros 200, se agrega para que aparezca elegido.
    const withInitial = (list) => (initialCustomer && !list.some(c => c.id === initialCustomer.id) ? [initialCustomer, ...list] : list);
    if (customers.length === 0) {
      customersApi.getAll({ limit: 200, is_active: true })
        .then(res => setCustomers(withInitial(res.data.data || [])))
        .catch(() => setCustomers(withInitial([])));
    } else {
      setCustomers(withInitial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const totals = useMemo(() => computeTotals(lines, discount), [lines, discount]);

  const canSubmit = (newCustomerMode ? newCustomerForm.full_name.trim() : form.customer_id) && lines.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newCustomerMode ? !newCustomerForm.full_name.trim() : !form.customer_id) {
      toast.error(newCustomerMode ? 'Escribe el nombre del cliente nuevo' : 'Selecciona un cliente');
      return;
    }
    if (lines.length === 0) {
      toast.error('Agrega al menos un producto o combo');
      return;
    }

    setSaving(true);
    let opportunity = null;
    try {
      let customerId = form.customer_id;
      if (newCustomerMode) {
        const res = await customersApi.create(newCustomerForm);
        customerId = res.data.data.id;
        setCustomers(c => [...c, res.data.data]);
        notifyGoalMilestones(res.data.gamification);
      }

      const oppRes = await crmApi.createOpportunity({
        customer_id: customerId,
        source: form.source,
        expected_value: totals.grandTotal || null,
        expected_close_date: form.expected_close_date || null,
      });
      opportunity = oppRes.data.data;

      await salesApi.create({
        customer_id: customerId,
        document_type: 'cotizacion',
        opportunity_id: opportunity.id,
        items: buildSaleItems(lines),
        global_discount_type: discount.type,
        global_discount_value: toInteger(discount.value, 0),
      });

      onCreated({ total: totals.grandTotal, quoteCreated: true });
    } catch (err) {
      if (opportunity) {
        toast.error('Negocio creado, pero la cotización falló. Ábrelo y usa "Crear cotización".', { duration: 6000 });
        onCreated({ total: totals.grandTotal, quoteCreated: false });
      } else {
        toast.error(err.response?.data?.message || 'Error al crear el negocio');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title="Nuevo negocio" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label className="block text-sm font-medium text-gray-700">Cliente *</label>
            <button type="button" onClick={() => setNewCustomerMode(m => !m)}
              className="text-xs font-medium text-accent hover:underline">
              {newCustomerMode ? 'Buscar cliente existente' : '+ Cliente nuevo'}
            </button>
          </div>
          {newCustomerMode ? (
            <div className="space-y-3 border border-accent/15 bg-accent/[0.03] rounded-lg p-3">
              <Input label="Nombre completo *" value={newCustomerForm.full_name}
                onChange={e => setNewCustomerForm(f => ({ ...f, full_name: e.target.value }))} required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={newCustomerForm.customer_type}
                    onChange={e => setNewCustomerForm(f => ({ ...f, customer_type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="individual">Persona Natural</option>
                    <option value="company">Empresa</option>
                  </select>
                </div>
                <Input label="Teléfono" value={newCustomerForm.phone}
                  onChange={e => setNewCustomerForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <Input label="Email" type="email" value={newCustomerForm.email}
                onChange={e => setNewCustomerForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          ) : (
            <CustomerSearchInput customers={customers} value={form.customer_id}
              onChange={v => setForm(f => ({ ...f, customer_id: v }))} />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origen</label>
            <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2">
              {SOURCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <Input label="Cierre esperado" type="date" value={form.expected_close_date}
            onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))} />
        </div>

        <QuoteLinesEditor lines={lines} onChange={setLines} />

        <QuoteSummary totals={totals} discount={discount} onDiscountChange={setDiscount}>
          <div className="flex sm:justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving} className="flex-1 sm:flex-none">Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving || !canSubmit}
              className="flex-1 sm:flex-none !bg-gradient-to-r !from-orange-500 !via-rose-500 !to-fuchsia-600 hover:!opacity-90 !shadow-sm !shadow-rose-500/30 disabled:!opacity-50">
              {saving ? 'Creando...' : 'Crear negocio'}
            </Button>
          </div>
        </QuoteSummary>
      </form>
    </Modal>
  );
}
