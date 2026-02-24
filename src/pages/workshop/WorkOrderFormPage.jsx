import { useState, useEffect, useCallback, useRef } from 'react';
import Combobox from '../../components/common/Combobox';
import Layout from '../../components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import useWorkshopStore from '../../store/workshopStore';
import { vehiclesApi } from '../../api/workshop';
import axios from '../../api/axios';
import { ArrowLeft, Save, Car, User, Wrench, Plus, X, Search, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}


export default function WorkOrderFormPage() {
  const navigate        = useNavigate();
  const { createOrder } = useWorkshopStore();
  const [saving,   setSaving]   = useState(false);
  const [vehicles,    setVehicles]    = useState([]);
  const [customers,   setCustomers]   = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [warehouses,  setWarehouses]  = useState([]);

  const [selVehicle,  setSelVehicle]  = useState(null);
  const [vehicleDisp, setVehicleDisp] = useState('');
  const [selCustomer, setSelCustomer] = useState(null);
  const [custDisp,    setCustDisp]    = useState('');
  const [loadingCust, setLoadingCust] = useState(false);
  const [custAutoFilled, setCustAutoFilled] = useState(false); // vino de la moto, no manual

  const [showNewVehicle,  setShowNewVehicle]  = useState(false);
  const [newVehicle, setNewVehicle] = useState({ plate: '', brand: '', model: '', year: '', color: '', fuel_type: 'gasolina' });
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ first_name: '', last_name: '', phone: '', tax_id: '' });
  const [savingCust,  setSavingCust]  = useState(false);

  const [form, setForm] = useState({
    vehicle_id: '', customer_id: '', technician_id: '',
    warehouse_id: '', mileage_in: '', problem_description: '', promised_at: '', notes: ''
  });

  useEffect(() => {
    vehiclesApi.list({ limit: 500 }).then(r => setVehicles(r.data.data || [])).catch(() => {});
    axios.get('/customers?limit=500').then(r => setCustomers(r.data.data || [])).catch(() => {});
    axios.get('/users?limit=100&role=technician').then(r => {
      const list = r.data.data?.users || r.data.users || r.data.data || [];
      setTechnicians(Array.isArray(list) ? list.filter(t => t.role === 'technician' && t.is_active !== false) : []);
    }).catch(() => {});
    axios.get('/inventory/warehouses').then(r => setWarehouses(r.data.data || [])).catch(() => {});
  }, []);

  const clearVehicle = useCallback(() => {
    setSelVehicle(null); setVehicleDisp('');
    setSelCustomer(null); setCustDisp('');
    setCustAutoFilled(false);
    setForm(f => ({ ...f, vehicle_id: '', customer_id: '' }));
  }, []);

  const selectVehicle = useCallback(async (v) => {
    setSelVehicle(v);
    setVehicleDisp([v.plate, v.brand, v.model, v.year].filter(Boolean).join(' '));
    setSelCustomer(null); setCustDisp('');
    setForm(f => ({ ...f, vehicle_id: v.id, customer_id: '' }));

    // 1. Objeto incluido directamente desde Sequelize
    let c = v.customer || null;
    // 2. Buscar en lista local por customer_id del vehículo
    if (!c && v.customer_id) c = customers.find(x => x.id === v.customer_id) || null;
    // 3. Fetch directo al API por customer_id del vehículo
    if (!c && v.customer_id) {
      setLoadingCust(true);
      try {
        const r = await axios.get(`/customers/${v.customer_id}`);
        c = r.data?.data || null;
      } catch { c = null; }
      finally { setLoadingCust(false); }
    }
    // 4. Fallback: buscar cliente en el historial de OTs del vehículo
    //    (pasa cuando el vehículo no tiene customer_id pero sus OTs sí lo tienen)
    if (!c) {
      setLoadingCust(true);
      try {
        const r = await vehiclesApi.getHistory(v.id);
        const history = r.data?.data?.history || [];
        // Tomar el cliente de la OT más reciente que tenga uno
        const otConCliente = history.find(ot => ot.customer);
        if (otConCliente?.customer) {
          c = otConCliente.customer;
        } else {
          // Si viene solo el customer_id sin el objeto
          const otConId = history.find(ot => ot.customer_id);
          if (otConId?.customer_id) {
            c = customers.find(x => x.id === otConId.customer_id) || null;
            if (!c) {
              const r2 = await axios.get(`/customers/${otConId.customer_id}`);
              c = r2.data?.data || null;
            }
          }
        }
      } catch { c = null; }
      finally { setLoadingCust(false); }
    }

    if (c) {
      const name = c.business_name || c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
      setSelCustomer(c);
      setCustDisp(name);
      setCustAutoFilled(true);
      // Asegurar que está en la lista
      setCustomers(prev => prev.some(x => x.id === c.id) ? prev : [c, ...prev]);
      setForm(f => ({ ...f, vehicle_id: v.id, customer_id: c.id }));
    }
  }, [customers]);

  const selectCustomer = useCallback(c => {
    setSelCustomer(c);
    const name = c.business_name || c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
    setCustDisp(name);
    setCustAutoFilled(false);
    setForm(f => ({ ...f, customer_id: c.id }));
  }, []);

  const clearCustomer = useCallback(() => {
    setSelCustomer(null); setCustDisp('');
    setCustAutoFilled(false);
    setForm(f => ({ ...f, customer_id: '' }));
  }, []);

  const handleCreateVehicle = async () => {
    if (!newVehicle.plate) return toast.error('La placa es requerida');
    try {
      const res = await vehiclesApi.create({ ...newVehicle, customer_id: form.customer_id || null });
      const v   = { ...res.data.data, customer: selCustomer };
      setVehicles(prev => [v, ...prev]);
      selectVehicle(v);
      setShowNewVehicle(false);
      setNewVehicle({ plate: '', brand: '', model: '', year: '', color: '', fuel_type: 'gasolina' });
      toast.success('Vehículo registrado');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.first_name) return toast.error('El nombre es requerido');
    setSavingCust(true);
    try {
      const res = await axios.post('/customers', newCustomer);
      const c   = res.data.data;
      setCustomers(prev => [c, ...prev]);
      selectCustomer(c);
      setShowNewCustomer(false);
      setNewCustomer({ first_name: '', last_name: '', phone: '', tax_id: '' });
      toast.success('Cliente registrado');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSavingCust(false); }
  };

  const handleSubmit = async () => {
    if (!form.vehicle_id) return toast.error('Selecciona un vehículo');
    setSaving(true);
    try {
      const order = await createOrder(form);
      navigate(`/workshop/work-orders/${order.id}`);
    } catch (e) { toast.error(e.response?.data?.message || 'Error al crear la OT'); }
    finally { setSaving(false); }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/workshop/work-orders')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nueva Orden de Trabajo</h1>
            <p className="text-sm text-gray-500">Ingreso de vehículo al taller</p>
          </div>
        </div>

        <div className="space-y-5">

          {/* ── Vehículo ── */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Car size={16} className="text-blue-600" />
              <h2 className="font-semibold text-gray-800 text-sm">Vehículo *</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Field label="Buscar por placa, marca o modelo">
                  <Combobox
                    placeholder="ABC123, Honda, CBR..."
                    items={vehicles}
                    value={form.vehicle_id}
                    displayValue={vehicleDisp}
                    onSelect={selectVehicle}
                    onClear={clearVehicle}
                    filterFn={(v, q) => {
                      const s = q.toLowerCase();
                      return (v.plate||'').toLowerCase().includes(s)
                        || (v.brand||'').toLowerCase().includes(s)
                        || (v.model||'').toLowerCase().includes(s)
                        || String(v.year||'').includes(s);
                    }}
                    renderItem={v => (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900 text-sm">{v.plate}</span>
                          <span className="text-xs text-gray-500">{v.brand} {v.model} {v.year}</span>
                        </div>
                        {v.customer
                          ? <p className="text-xs text-blue-500 mt-0.5">👤 {v.customer.business_name || `${v.customer.first_name} ${v.customer.last_name}`}</p>
                          : <p className="text-xs text-gray-300 mt-0.5">Sin propietario</p>
                        }
                      </div>
                    )}
                  />
                  {selVehicle && (
                    <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs">
                      <Car size={12} className="text-blue-500" />
                      <span className="font-mono font-bold text-blue-800">{selVehicle.plate}</span>
                      <span className="text-blue-600">{selVehicle.brand} {selVehicle.model} {selVehicle.year}</span>
                    </div>
                  )}
                </Field>
              </div>
              <div className="flex items-end">
                <button type="button" onClick={() => setShowNewVehicle(v => !v)}
                  className="w-full border border-dashed border-blue-300 text-blue-600 text-sm py-2 rounded-lg hover:bg-blue-50 transition">
                  + Registrar nuevo vehículo
                </button>
              </div>
            </div>

            {showNewVehicle && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-blue-700">Nuevo vehículo</p>
                  <button type="button" onClick={() => setShowNewVehicle(false)}><X size={13} className="text-blue-400" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[['Placa *','plate'],['Marca','brand'],['Modelo','model']].map(([lbl, key]) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500 block mb-0.5">{lbl}</label>
                      <input value={newVehicle[key]} placeholder={lbl} className={inputCls}
                        onChange={e => setNewVehicle(p => ({ ...p, [key]: key==='plate' ? e.target.value.toUpperCase() : e.target.value }))} />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-gray-500 block mb-0.5">Año</label>
                    <input type="number" value={newVehicle.year} placeholder="2020" className={inputCls}
                      onChange={e => setNewVehicle(p => ({ ...p, year: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-0.5">Color</label>
                    <input value={newVehicle.color} placeholder="Blanco" className={inputCls}
                      onChange={e => setNewVehicle(p => ({ ...p, color: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-0.5">Combustible</label>
                    <select value={newVehicle.fuel_type} className={inputCls}
                      onChange={e => setNewVehicle(p => ({ ...p, fuel_type: e.target.value }))}>
                      {['gasolina','diesel','gas','hibrido','electrico','otro'].map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <button type="button" onClick={handleCreateVehicle}
                  className="flex items-center gap-1.5 bg-blue-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700">
                  <Save size={12}/> Guardar vehículo
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Kilometraje de ingreso">
                <input type="number" value={form.mileage_in} placeholder="85000" className={inputCls}
                  onChange={e => setForm(f => ({ ...f, mileage_in: e.target.value }))} />
              </Field>
            </div>
          </div>

          {/* ── Cliente & Técnico ── */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-blue-600" />
              <h2 className="font-semibold text-gray-800 text-sm">Cliente & Técnico</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <Field label="Cliente">
                {showNewCustomer ? (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-green-700">Nuevo cliente</p>
                      <button type="button" onClick={() => setShowNewCustomer(false)}><X size={13} className="text-green-400"/></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[['Nombre *','first_name'],['Apellido','last_name'],['Teléfono','phone'],['Cédula/NIT','tax_id']].map(([lbl, k]) => (
                        <div key={k}>
                          <label className="text-xs text-gray-500 block mb-0.5">{lbl}</label>
                          <input value={newCustomer[k]} placeholder={lbl} className={inputCls}
                            onChange={e => setNewCustomer(p => ({ ...p, [k]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={handleCreateCustomer} disabled={savingCust}
                      className="w-full flex items-center justify-center gap-1.5 bg-green-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60">
                      <Save size={12}/> {savingCust ? 'Guardando...' : 'Guardar cliente'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Combobox
                          placeholder="Buscar por nombre o teléfono..."
                          items={customers}
                          value={form.customer_id}
                          displayValue={custDisp}
                          onSelect={selectCustomer}
                          onClear={clearCustomer}
                          filterFn={(c, q) => {
                            const s = q.toLowerCase();
                            const n = (c.business_name || c.full_name || `${c.first_name||''} ${c.last_name||''}`).toLowerCase();
                            return n.includes(s) || (c.phone||'').includes(s) || (c.tax_id||'').includes(s);
                          }}
                          renderItem={c => (
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {c.business_name || c.full_name || `${c.first_name||''} ${c.last_name||''}`}
                              </p>
                              {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                            </div>
                          )}
                        />
                      </div>
                      <button type="button" onClick={() => setShowNewCustomer(true)}
                        className="px-3 border border-dashed border-green-300 text-green-600 rounded-lg hover:bg-green-50"
                        title="Nuevo cliente">
                        <Plus size={14}/>
                      </button>
                    </div>
                    {loadingCust && (
                      <div className="flex items-center gap-2 text-xs text-blue-500 bg-blue-50 rounded-lg px-3 py-2">
                        <Loader size={11} className="animate-spin"/> Buscando propietario...
                      </div>
                    )}
                    {!loadingCust && selCustomer && (
                      <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                        <User size={11} className="text-green-500"/>
                        <span className="font-medium text-green-800">
                          {selCustomer.business_name || selCustomer.full_name || `${selCustomer.first_name||''} ${selCustomer.last_name||''}`}
                        </span>
                        {selCustomer && custAutoFilled && <span className="ml-auto text-green-400">✓ propietario</span>}
                      </div>
                    )}
                    {!loadingCust && selVehicle && !selCustomer && (
                      <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <span>⚠️</span>
                        <span className="text-amber-700">Sin propietario registrado</span>
                        <button type="button" onClick={() => setShowNewCustomer(true)}
                          className="ml-auto text-amber-600 font-medium hover:underline">+ Agregar</button>
                      </div>
                    )}
                  </div>
                )}
              </Field>

              <Field label="Técnico asignado">
                <Combobox
                  placeholder="Buscar técnico..."
                  items={technicians}
                  value={form.technician_id}
                  displayValue={(() => { const t = technicians.find(t => t.id === form.technician_id); return t ? `${t.first_name} ${t.last_name}` : ''; })()}
                  onSelect={t => setForm(f => ({ ...f, technician_id: t.id }))}
                  onClear={() => setForm(f => ({ ...f, technician_id: '' }))}
                  filterFn={(t, q) => `${t.first_name} ${t.last_name}`.toLowerCase().includes(q.toLowerCase())}
                  renderItem={t => <span className="font-medium text-gray-800">{t.first_name} {t.last_name}</span>}
                />
              </Field>
              <Field label="Bodega de repuestos">
                <Combobox
                  placeholder="Buscar bodega..."
                  items={warehouses}
                  value={form.warehouse_id}
                  displayValue={(() => { const w = warehouses.find(w => w.id === form.warehouse_id); return w ? w.name : ''; })()}
                  onSelect={w => setForm(f => ({ ...f, warehouse_id: w.id }))}
                  onClear={() => setForm(f => ({ ...f, warehouse_id: '' }))}
                  filterFn={(w, q) => w.name.toLowerCase().includes(q.toLowerCase())}
                  renderItem={w => <span className="font-medium text-gray-800">{w.name}</span>}
                />
              </Field>
              <Field label="Fecha prometida">
                <input type="datetime-local" value={form.promised_at} className={inputCls}
                  onChange={e => setForm(f => ({ ...f, promised_at: e.target.value }))} />
              </Field>
            </div>
          </div>

          {/* ── Problema ── */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Wrench size={16} className="text-blue-600" />
              <h2 className="font-semibold text-gray-800 text-sm">Problema reportado</h2>
            </div>
            <Field label="Descripción">
              <textarea value={form.problem_description} className={`${inputCls} h-24 resize-none`}
                placeholder="Describir el problema que reporta el cliente..."
                onChange={e => setForm(f => ({ ...f, problem_description: e.target.value }))} />
            </Field>
            <div className="mt-3">
              <Field label="Notas internas">
                <textarea value={form.notes} className={`${inputCls} h-16 resize-none`}
                  placeholder="Notas internas del taller..."
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={() => navigate('/workshop/work-orders')}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving || !form.vehicle_id}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-60 transition">
            <Save size={16}/>
            {saving ? 'Guardando...' : 'Crear Orden'}
          </button>
        </div>
      </div>
    </Layout>
  );
}