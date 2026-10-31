import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Car, User, Plus, X, Loader, Zap, AlertTriangle } from 'lucide-react';
import Modal from '../common/Modal';
import Combobox, { HighlightMatch } from '../common/Combobox';
import NumericInput from '../inputs/NumericInput';
import axios from '../../api/axios';
import { vehiclesApi, workOrdersApi } from '../../api/workshop';
import { notifyReceptionResult } from './receptionNotice';

/**
 * OT rápida: recibir un vehículo con lo mínimo (placa, cliente, km y el
 * motivo opcional) para no frenar la recepción -- pensado para el celular
 * del taller. Marca, modelo, RUNT, etc. se completan después desde la ficha
 * del vehículo (la OT muestra un aviso cuando faltan).
 *
 * Todo se crea en UNA sola llamada (POST /workshop/work-orders/quick): si el
 * vehículo o el cliente no existen, el backend los crea en la misma
 * transacción que la OT. No usa la cola offline a propósito: si no hay red,
 * se muestra el error y no se crea nada.
 */

// Igual que el backend (services/workshop/vehiclePlate.service.js): solo
// para comparar/buscar, "ABC-123" y "abc 123" son la misma placa.
const normalizePlate = (p) => String(p || '').toUpperCase().replace(/[\s-]/g, '');

const customerName = (c) =>
  c ? (c.business_name || c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()) : '';

const EMPTY_CUSTOMER = { first_name: '', last_name: '', mobile: '', tax_id: '' };

// text-base (16px) en los inputs propios: en iPhone, menos de eso hace zoom al enfocar.
const inputCls = 'w-full border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-graphite-2 dark:text-gray-100';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function QuickWorkOrderModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const plateRef = useRef(null);

  const [plate, setPlate] = useState('');
  // idle | loading | found | notfound
  const [lookup, setLookup] = useState({ status: 'idle', vehicle: null });

  const [customer, setCustomer] = useState(null);
  const [custAutoFilled, setCustAutoFilled] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState(EMPTY_CUSTOMER);

  const [mileage, setMileage] = useState('');
  const [motive, setMotive] = useState('');
  const [saving, setSaving] = useState(false);

  // Reiniciar cada vez que se abre (el modal vive montado en la página).
  useEffect(() => {
    if (!isOpen) return;
    setPlate(''); setLookup({ status: 'idle', vehicle: null });
    setCustomer(null); setCustAutoFilled(false);
    setShowNewCustomer(false); setNewCustomer(EMPTY_CUSTOMER);
    setMileage(''); setMotive(''); setSaving(false);
    // Autofoco en la placa: el Modal común no expone ref, se enfoca al montar.
    const t = setTimeout(() => plateRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Buscar el vehículo por placa mientras se escribe (debounce). Desde 3
  // caracteres: menos que eso no es una placa y solo generaría ruido.
  const normalized = normalizePlate(plate);
  useEffect(() => {
    if (!isOpen) return;
    if (normalized.length < 3) { setLookup({ status: 'idle', vehicle: null }); return; }
    let stale = false;
    setLookup(l => ({ ...l, status: 'loading' }));
    const t = setTimeout(async () => {
      try {
        const res = await vehiclesApi.getByPlate(normalized);
        if (stale) return;
        const v = res.data?.data || null;
        setLookup({ status: v ? 'found' : 'notfound', vehicle: v });
      } catch {
        // Si falla la búsqueda no se bloquea nada: el backend vuelve a buscar
        // la placa al crear, así que nunca se duplica el vehículo por esto.
        if (!stale) setLookup({ status: 'notfound', vehicle: null });
      }
    }, 400);
    return () => { stale = true; clearTimeout(t); };
  }, [normalized, isOpen]);

  // Propietario del vehículo encontrado → cliente de la OT. Solo pisa un
  // cliente que también se haya puesto solo (no uno elegido a mano), y si la
  // placa deja de coincidir se quita el que se había autocompletado.
  const foundVehicle = lookup.status === 'found' ? lookup.vehicle : null;
  useEffect(() => {
    if (foundVehicle?.customer) {
      if (!customer || custAutoFilled) {
        setCustomer(foundVehicle.customer);
        setCustAutoFilled(true);
        setShowNewCustomer(false);
      }
    } else if (custAutoFilled) {
      setCustomer(null);
      setCustAutoFilled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundVehicle?.id]);

  const selectCustomer = (c) => { setCustomer(c); setCustAutoFilled(false); };
  const clearCustomer = () => { setCustomer(null); setCustAutoFilled(false); };

  // Lo que se tecleó en la búsqueda precarga "Nuevo cliente" si no apareció:
  // un celular colombiano (10 dígitos, empieza en 3) va a Celular, otros
  // números a Cédula/NIT y el texto al Nombre.
  const prefillNewCustomer = (q) => {
    const text = String(q || '').trim();
    const digits = text.replace(/[\s.-]/g, '');
    const isNumber = /^\d+$/.test(digits);
    setNewCustomer({
      ...EMPTY_CUSTOMER,
      ...(!isNumber ? { first_name: text }
        : (digits.length === 10 && digits.startsWith('3')) ? { mobile: digits }
        : { tax_id: digits }),
    });
  };

  const currentMileage = Number(foundVehicle?.current_mileage) || 0;
  const mileageLower = mileage !== '' && currentMileage > 0 && Number(mileage) < currentMileage;

  const hasCustomer = showNewCustomer
    ? !!newCustomer.first_name.trim() && !!newCustomer.mobile.replace(/\D/g, '')
    : !!customer;
  const canSubmit = !!normalized && hasCustomer && mileage !== '' && !saving && lookup.status !== 'loading';

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!normalized) return toast.error('La placa es requerida');
    if (showNewCustomer) {
      if (!newCustomer.first_name.trim()) return toast.error('El nombre del cliente es requerido');
      if (!newCustomer.mobile.replace(/\D/g, '')) return toast.error('El celular del cliente es requerido');
    } else if (!customer) {
      return toast.error('Selecciona un cliente o registra uno nuevo');
    }
    if (mileage === '' || isNaN(Number(mileage)) || Number(mileage) < 0) {
      return toast.error('El kilometraje de ingreso es requerido');
    }

    setSaving(true);
    try {
      const payload = {
        plate: plate.trim(),
        mileage_in: Number(mileage),
        problem_description: motive.trim() || null,
        ...(showNewCustomer
          ? { new_customer: { ...newCustomer, first_name: newCustomer.first_name.trim() } }
          : { customer_id: customer.id }),
      };
      const res = await workOrdersApi.quickCreate(payload);
      const order = res.data.data;
      toast.success(`Orden ${order.order_number} creada`);
      notifyReceptionResult(res.data.reception_notice);
      onClose?.();
      navigate(`/workshop/work-orders/${order.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo crear la OT. Revisa la conexión e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={saving ? () => {} : onClose} title="OT rápida" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Recibe el vehículo con lo mínimo. Marca, modelo y demás datos se completan después.
        </p>

        {/* Placa */}
        <div>
          <label className={labelCls} htmlFor="quick-ot-plate">Placa *</label>
          <div className="relative">
            <Car size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              id="quick-ot-plate"
              ref={plateRef}
              autoFocus
              value={plate}
              onChange={e => setPlate(e.target.value.toUpperCase())}
              placeholder="ABC123"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={20}
              className={`${inputCls} pl-10 font-mono text-lg font-bold tracking-wider uppercase`}
            />
          </div>
          {lookup.status === 'loading' && (
            <p className="flex items-center gap-1.5 text-xs text-blue-500 mt-1.5">
              <Loader size={12} className="animate-spin" /> Buscando vehículo...
            </p>
          )}
          {foundVehicle && (
            <div className="mt-1.5 text-xs bg-blue-50 border border-blue-100 dark:bg-blue-900/30 dark:border-blue-800/40 rounded-lg px-3 py-2 text-blue-800 dark:text-blue-300">
              <span className="font-semibold">Vehículo registrado:</span>{' '}
              {[foundVehicle.plate, foundVehicle.brand, foundVehicle.model, foundVehicle.year].filter(Boolean).join(' ')}
              {!foundVehicle.brand && !foundVehicle.model && <span className="text-blue-500"> (sin marca/modelo)</span>}
              {currentMileage > 0 && <span className="block text-blue-500 mt-0.5">Último km registrado: {currentMileage.toLocaleString('es-CO')}</span>}
            </div>
          )}
          {lookup.status === 'notfound' && (
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
              Placa nueva: el vehículo se registra al crear la OT (solo con la placa).
            </p>
          )}
        </div>

        {/* Cliente */}
        <div>
          <label className={labelCls}>Cliente *</label>
          {showNewCustomer ? (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-green-700 dark:text-green-300">Nuevo cliente</p>
                <button type="button" onClick={() => setShowNewCustomer(false)} title="Buscar un cliente existente">
                  <X size={16} className="text-green-500" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={newCustomer.first_name} placeholder="Nombre *" className={inputCls} autoComplete="off"
                  onChange={e => setNewCustomer(p => ({ ...p, first_name: e.target.value }))} />
                <input value={newCustomer.last_name} placeholder="Apellido" className={inputCls} autoComplete="off"
                  onChange={e => setNewCustomer(p => ({ ...p, last_name: e.target.value }))} />
                <input value={newCustomer.mobile} placeholder="Celular *" className={inputCls} type="tel" inputMode="tel" autoComplete="off"
                  onChange={e => setNewCustomer(p => ({ ...p, mobile: e.target.value }))} />
                <input value={newCustomer.tax_id} placeholder="Cédula/NIT (opcional)" className={inputCls} inputMode="numeric" autoComplete="off"
                  onChange={e => setNewCustomer(p => ({ ...p, tax_id: e.target.value }))} />
              </div>
              <p className="text-[11px] text-green-700/80 dark:text-green-300/80">
                Si la cédula/NIT ya está registrada, se usa ese cliente.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <Combobox
                    placeholder="Buscar por nombre, teléfono o cédula..."
                    items={customer ? [customer] : []}
                    value={customer?.id || ''}
                    displayValue={customerName(customer)}
                    onSelect={selectCustomer}
                    onClear={clearCustomer}
                    onQueryChange={prefillNewCustomer}
                    remoteSearch={q => axios.get('/customers', { params: { search: q, limit: 30 } }).then(r => r.data.data || [])}
                    getSearchText={c => `${customerName(c)} ${c.phone || ''} ${c.mobile || ''} ${c.tax_id || ''}`}
                    emptyText="Escribe al menos 2 letras para buscar"
                    renderItem={(c, q) => (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          <HighlightMatch text={customerName(c)} query={q} />
                        </p>
                        {(c.tax_id || c.mobile || c.phone) && (
                          <p className="text-xs text-gray-400">
                            {c.tax_id && <><HighlightMatch text={c.tax_id} query={q} />{(c.mobile || c.phone) ? ' · ' : ''}</>}
                            {(c.mobile || c.phone) && <HighlightMatch text={c.mobile || c.phone} query={q} />}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>
                <button type="button" onClick={() => { clearCustomer(); setShowNewCustomer(true); }}
                  className="flex items-center gap-1 px-3 border border-dashed border-green-300 text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-sm whitespace-nowrap"
                  title="Registrar cliente nuevo">
                  <Plus size={16} /> Nuevo
                </button>
              </div>
              {customer && (
                <div className="flex items-center gap-2 text-xs bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/40 rounded-lg px-3 py-2">
                  <User size={12} className="text-green-500" />
                  <span className="font-medium text-green-800 dark:text-green-300">{customerName(customer)}</span>
                  {custAutoFilled && <span className="ml-auto text-green-500">✓ propietario</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Kilometraje */}
        <div>
          <label className={labelCls} htmlFor="quick-ot-km">Kilometraje *</label>
          <NumericInput
            id="quick-ot-km"
            value={mileage}
            onChange={e => setMileage(e.target.value)}
            placeholder="Ej: 45.000"
            inputMode="numeric"
            className={inputCls}
          />
          {mileageLower && (
            <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2 mt-1.5">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              El kilometraje es menor al último registrado ({currentMileage.toLocaleString('es-CO')}). Verifícalo; igual puedes crear la OT.
            </p>
          )}
        </div>

        {/* Motivo */}
        <div>
          <label className={labelCls} htmlFor="quick-ot-motive">Motivo / qué pide el cliente</label>
          <input
            id="quick-ot-motive"
            value={motive}
            onChange={e => setMotive(e.target.value)}
            placeholder="Ej: cambio de aceite, ruido en frenos (opcional)"
            maxLength={500}
            className={inputCls}
          />
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Entrega prometida: hoy a las 6:00 p. m. (o mañana, si ya pasó esa hora). Puedes cambiarla en la OT.
        </p>

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={saving}
            className="flex-1 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={!canSubmit}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-base font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <><Loader size={16} className="animate-spin" /> Creando...</> : <><Zap size={16} /> Crear OT</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
