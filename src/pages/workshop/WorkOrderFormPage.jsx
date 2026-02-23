import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import useWorkshopStore from '../../store/workshopStore';
import { vehiclesApi } from '../../api/workshop';
import axios from '../../api/axios';
import { ArrowLeft, Save, Car, User, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Componentes fuera del render principal para evitar re-montaje ──
const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function WorkOrderFormPage() {
  const navigate = useNavigate();
  const { createOrder } = useWorkshopStore();
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    plate: '', brand: '', model: '', year: '', color: '', fuel_type: 'gasolina'
  });
  const [form, setForm] = useState({
    vehicle_id: '', customer_id: '', technician_id: '',
    warehouse_id: '', mileage_in: '', problem_description: '',
    promised_at: '', notes: ''
  });

  useEffect(() => {
    vehiclesApi.list({ limit: 200 }).then(r => setVehicles(r.data.data || [])).catch(() => {});
    axios.get('/customers?limit=200').then(r => setCustomers(r.data.data || [])).catch(() => {});
    axios.get('/users?limit=100&role=technician').then(r => {
      const list = r.data.data?.users || r.data.users || r.data.data || [];
      setTechnicians(Array.isArray(list) ? list : []);
    }).catch(() => {});
    axios.get('/inventory/warehouses').then(r => setWarehouses(r.data.data || [])).catch(() => {});
  }, []);

  const handleVehicleChange = useCallback((vehicleId) => {
    const v = vehicles.find(v => v.id === vehicleId);
    const autoCustomerId = v?.customer_id || v?.customer?.id || '';
    setForm(f => ({ ...f, vehicle_id: vehicleId, customer_id: autoCustomerId || f.customer_id }));
  }, [vehicles]);

  const handleNewVehicleChange = useCallback((key, value) => {
    setNewVehicle(p => ({ ...p, [key]: value }));
  }, []);

  const handleFormChange = useCallback((key, value) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  const handleCreateVehicle = async () => {
    if (!newVehicle.plate) return toast.error('La placa es requerida');
    try {
      const res = await vehiclesApi.create({ ...newVehicle, customer_id: form.customer_id || null });
      const v = res.data.data;
      setVehicles(prev => [v, ...prev]);
      setForm(f => ({ ...f, vehicle_id: v.id }));
      setShowNewVehicle(false);
      setNewVehicle({ plate: '', brand: '', model: '', year: '', color: '', fuel_type: 'gasolina' });
      toast.success('Vehículo registrado');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al registrar vehículo');
    }
  };

  const handleSubmit = async () => {
    if (!form.vehicle_id) return toast.error('Selecciona un vehículo');
    setSaving(true);
    try {
      const order = await createOrder(form);
      navigate(`/workshop/work-orders/${order.id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al crear la OT');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/workshop/work-orders')} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nueva Orden de Trabajo</h1>
            <p className="text-sm text-gray-500">Ingreso de vehículo al taller</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Sección Vehículo */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Car size={16} className="text-blue-600" />
              <h2 className="font-semibold text-gray-800 text-sm">Vehículo</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Vehículo *">
                <select
                  value={form.vehicle_id}
                  onChange={e => handleVehicleChange(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seleccionar vehículo...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.plate} — {v.brand} {v.model} {v.year}
                    </option>
                  ))}
                </select>
                {form.vehicle_id && (() => {
                  const v = vehicles.find(x => x.id === form.vehicle_id);
                  const owner = v?.customer
                    ? (v.customer.business_name || `${v.customer.first_name} ${v.customer.last_name}`)
                    : null;
                  return owner ? (
                    <p className="text-xs text-blue-600 mt-1">👤 Propietario: <span className="font-medium">{owner}</span> (autocompletado)</p>
                  ) : null;
                })()}
              </Field>
              <div className="flex items-end">
                <button
                  onClick={() => setShowNewVehicle(!showNewVehicle)}
                  className="w-full border border-dashed border-blue-300 text-blue-600 text-sm py-2 rounded-lg hover:bg-blue-50 transition"
                >
                  + Registrar nuevo vehículo
                </button>
              </div>
            </div>

            {showNewVehicle && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg space-y-3">
                <p className="text-xs font-semibold text-blue-700">Nuevo vehículo</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[['Placa *', 'plate'], ['Marca', 'brand'], ['Modelo', 'model']].map(([lbl, key]) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500 mb-0.5 block">{lbl}</label>
                      <input
                        value={newVehicle[key]}
                        onChange={e => handleNewVehicleChange(key, e.target.value)}
                        className={inputCls}
                        placeholder={lbl}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Año</label>
                    <input
                      type="number"
                      value={newVehicle.year}
                      onChange={e => handleNewVehicleChange('year', e.target.value)}
                      className={inputCls}
                      placeholder="2020"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Color</label>
                    <input
                      value={newVehicle.color}
                      onChange={e => handleNewVehicleChange('color', e.target.value)}
                      className={inputCls}
                      placeholder="Blanco"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Combustible</label>
                    <select
                      value={newVehicle.fuel_type}
                      onChange={e => handleNewVehicleChange('fuel_type', e.target.value)}
                      className={inputCls}
                    >
                      {['gasolina','diesel','gas','hibrido','electrico','otro'].map(f => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleCreateVehicle}
                  className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded-lg hover:bg-blue-700"
                >
                  Guardar vehículo
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Kilometraje de ingreso">
                <input
                  type="number"
                  value={form.mileage_in}
                  onChange={e => handleFormChange('mileage_in', e.target.value)}
                  className={inputCls}
                  placeholder="85000"
                />
              </Field>
            </div>
          </div>

          {/* Sección Cliente & Técnico */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-blue-600" />
              <h2 className="font-semibold text-gray-800 text-sm">Cliente & Técnico</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Cliente">
                <select
                  value={form.customer_id}
                  onChange={e => handleFormChange('customer_id', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Sin cliente asignado</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.business_name || `${c.first_name} ${c.last_name}`}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Técnico asignado">
                <select
                  value={form.technician_id}
                  onChange={e => handleFormChange('technician_id', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Sin asignar</option>
                  {technicians
                    .filter(t => t.role === 'technician' && t.is_active !== false)
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                    ))
                  }
                </select>
              </Field>
              <Field label="Bodega de repuestos">
                <select
                  value={form.warehouse_id}
                  onChange={e => handleFormChange('warehouse_id', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seleccionar bodega...</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </Field>
              <Field label="Fecha prometida de entrega">
                <input
                  type="datetime-local"
                  value={form.promised_at}
                  onChange={e => handleFormChange('promised_at', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* Sección Problema */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Wrench size={16} className="text-blue-600" />
              <h2 className="font-semibold text-gray-800 text-sm">Problema reportado</h2>
            </div>
            <Field label="Descripción del problema">
              <textarea
                value={form.problem_description}
                onChange={e => handleFormChange('problem_description', e.target.value)}
                className={`${inputCls} h-24 resize-none`}
                placeholder="Describir el problema que reporta el cliente..."
              />
            </Field>
            <div className="mt-3">
              <Field label="Notas internas">
                <textarea
                  value={form.notes}
                  onChange={e => handleFormChange('notes', e.target.value)}
                  className={`${inputCls} h-16 resize-none`}
                  placeholder="Notas internas del taller..."
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate('/workshop/work-orders')}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-60 transition"
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Crear Orden'}
          </button>
        </div>
      </div>
    </Layout>
  );
}