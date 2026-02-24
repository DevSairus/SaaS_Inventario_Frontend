import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import customersApi from '../../api/customers';
import { vehiclesApi, workOrdersApi } from '../../api/workshop';
import { ArrowLeft, Phone, Mail, MapPin, FileText, Car, Wrench, ChevronRight } from 'lucide-react';
import { PencilIcon } from '@heroicons/react/24/outline';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const SALE_STATUS = {
  draft:     { label: 'Borrador',   cls: 'bg-gray-100 text-gray-600' },
  pending:   { label: 'Pendiente',  cls: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completada', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada',  cls: 'bg-red-100 text-red-600' },
};

const OT_STATUS = {
  recibido:   { label: 'Recibido',   cls: 'bg-blue-100 text-blue-700' },
  en_proceso: { label: 'En Proceso', cls: 'bg-yellow-100 text-yellow-700' },
  en_espera:  { label: 'En Espera',  cls: 'bg-orange-100 text-orange-700' },
  listo:      { label: 'Listo',      cls: 'bg-green-100 text-green-700' },
  entregado:  { label: 'Entregado',  cls: 'bg-gray-100 text-gray-600' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-red-100 text-red-600' },
};

export default function CustomerDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer]   = useState(null);
  const [vehicles, setVehicles]   = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editForm,  setEditForm]  = useState({});
  const [saving,    setSaving]    = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, vRes, otRes] = await Promise.all([
        customersApi.getById(id),
        vehiclesApi.list({ customer_id: id, limit: 100 }),
        workOrdersApi.list({ customer_id: id, limit: 100 }),
      ]);
      setCustomer(cRes.data.data);
      setVehicles(vRes.data.data || []);
      setWorkOrders(otRes.data.data || []);
    } catch {
      toast.error('Error cargando cliente');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = () => {
    setEditForm({
      full_name:     customer.full_name || `${customer.first_name||''} ${customer.last_name||''}`.trim(),
      tax_id:        customer.tax_id || '',
      phone:         customer.phone || '',
      mobile:        customer.mobile || '',
      email:         customer.email || '',
      address:       customer.address || '',
      city:          customer.city || '',
      notes:         customer.notes || '',
      customer_type: customer.customer_type || 'individual',
      business_name: customer.business_name || '',
    });
    setEditModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await customersApi.update(id, editForm);
      setCustomer(res.data.data);
      setEditModal(false);
      toast.success('Cliente actualizado');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    </Layout>
  );
  if (!customer) return null;

  const sales         = customer.sales || [];
  const totalFact     = sales.reduce((s, v) => s + parseFloat(v.total_amount || 0), 0);
  const displayName   = customer.business_name || customer.full_name
    || `${customer.first_name||''} ${customer.last_name||''}`.trim();

  // Agrupar OTs por vehículo para la sección de vehículos
  const otsByVehicle  = workOrders.reduce((acc, ot) => {
    const vid = ot.vehicle_id || 'sin_vehiculo';
    if (!acc[vid]) acc[vid] = [];
    acc[vid].push(ot);
    return acc;
  }, {});

  // Vehículos únicos (de la lista + los que aparecen en OTs pero no están vinculados)
  const vehicleMap    = {};
  vehicles.forEach(v => { vehicleMap[v.id] = v; });
  workOrders.forEach(ot => {
    if (ot.vehicle && !vehicleMap[ot.vehicle_id]) vehicleMap[ot.vehicle_id] = ot.vehicle;
  });
  const allVehicles   = Object.values(vehicleMap);

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/customers')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${customer.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {customer.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {customer.customer_type === 'business' ? 'Empresa' : 'Persona natural'}
                {customer.tax_id && ` · CC/NIT: ${customer.tax_id}`}
              </p>
            </div>
          </div>
          <button onClick={openEdit}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition">
            <PencilIcon className="h-4 w-4" /> Editar
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total facturado', value: COP(totalFact),      emoji: '💰' },
            { label: 'Facturas venta',  value: sales.length,        emoji: '📄' },
            { label: 'Órd. de trabajo', value: workOrders.length,   emoji: '🔧' },
            { label: 'Vehículos',       value: allVehicles.length,  emoji: '🏍️' },
          ].map(({ label, value, emoji }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="text-xl mb-1">{emoji}</div>
              <p className="text-lg font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Contacto */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-sm text-gray-800 mb-2">Contacto</h2>
            {[
              { Icon: Phone,  label: 'Teléfono',  val: customer.phone || customer.mobile },
              { Icon: Mail,   label: 'Email',     val: customer.email },
              { Icon: MapPin, label: 'Ciudad',    val: customer.city },
              { Icon: MapPin, label: 'Dirección', val: customer.address },
            ].filter(x => x.val).map(({ Icon, label, val }) => (
              <div key={label} className="flex items-start gap-2 text-sm">
                <Icon size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-gray-700">{val}</p>
                </div>
              </div>
            ))}
            {customer.notes && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Notas</p>
                <p className="text-sm text-gray-600">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Ventas recientes */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={15} className="text-purple-600" />
              <h2 className="font-semibold text-sm text-gray-800">Ventas recientes</h2>
            </div>
            {sales.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileText size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin ventas registradas</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {sales.slice(0, 8).map(sale => {
                  const ss = SALE_STATUS[sale.status] || SALE_STATUS.pending;
                  return (
                    <div key={sale.id} onClick={() => navigate(`/sales/${sale.id}`)}
                      className="flex items-center justify-between py-2.5 hover:bg-gray-50 rounded-lg px-1 cursor-pointer transition">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-800">{sale.sale_number}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ss.cls}`}>{ss.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(sale.sale_date)}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{COP(sale.total_amount)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Vehículos + Órdenes de Trabajo ── */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Car size={15} className="text-orange-500" />
            <h2 className="font-semibold text-sm text-gray-800">Vehículos y Órdenes de Trabajo</h2>
          </div>

          {allVehicles.length === 0 && workOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Car size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Sin vehículos ni órdenes de trabajo registradas</p>
              <button onClick={() => navigate('/workshop/work-orders/new')}
                className="mt-3 text-sm text-orange-600 hover:underline">+ Nueva OT</button>
            </div>
          ) : allVehicles.length > 0 ? (
            /* Vista por vehículo */
            <div className="space-y-3">
              {allVehicles.map(v => {
                const ots = otsByVehicle[v.id] || [];
                return (
                  <div key={v.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    {/* Cabecera del vehículo */}
                    <div className="flex items-center justify-between bg-orange-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Car size={15} className="text-orange-500" />
                        <span className="font-mono font-bold text-gray-900">{v.plate}</span>
                        <span className="text-sm text-gray-600">{v.brand} {v.model} {v.year}</span>
                        {v.color && <span className="text-xs text-gray-400">· {v.color}</span>}
                      </div>
                      <span className="text-xs text-orange-600 font-medium">
                        {ots.length} OT{ots.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* OTs de este vehículo */}
                    {ots.length === 0 ? (
                      <p className="text-xs text-gray-400 px-4 py-3 italic">Sin órdenes de trabajo</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {ots.map(ot => {
                          const sc = OT_STATUS[ot.status] || OT_STATUS.recibido;
                          return (
                            <div key={ot.id} onClick={() => navigate(`/workshop/work-orders/${ot.id}`)}
                              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Wrench size={12} className="text-gray-400" />
                                  <span className="font-mono text-xs font-bold text-gray-700">{ot.order_number}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sc.cls}`}>{sc.label}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5 ml-4">
                                  {fmtDate(ot.received_at)}
                                  {ot.technician && ` · ${ot.technician.first_name} ${ot.technician.last_name}`}
                                </p>
                                {ot.problem_description && (
                                  <p className="text-xs text-gray-500 mt-0.5 ml-4 line-clamp-1">{ot.problem_description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-800">{ot.total_amount ? COP(ot.total_amount) : '—'}</p>
                                <ChevronRight size={14} className="text-gray-300" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* OTs sin vehículo vinculado */}
              {otsByVehicle['sin_vehiculo']?.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3">
                    <span className="text-sm text-gray-500 italic">OTs sin vehículo vinculado</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {otsByVehicle['sin_vehiculo'].map(ot => {
                      const sc = OT_STATUS[ot.status] || OT_STATUS.recibido;
                      return (
                        <div key={ot.id} onClick={() => navigate(`/workshop/work-orders/${ot.id}`)}
                          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-gray-700">{ot.order_number}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sc.cls}`}>{sc.label}</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800">{ot.total_amount ? COP(ot.total_amount) : '—'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Sin vehículos vinculados pero hay OTs → mostrar solo OTs */
            <div className="space-y-2">
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-3">
                ⚠️ Las motos de las OTs no están vinculadas a este cliente. Puedes asignarlas desde cada vehículo.
              </p>
              {workOrders.map(ot => {
                const sc = OT_STATUS[ot.status] || OT_STATUS.recibido;
                return (
                  <div key={ot.id} onClick={() => navigate(`/workshop/work-orders/${ot.id}`)}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-800">{ot.order_number}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sc.cls}`}>{sc.label}</span>
                        {ot.vehicle && (
                          <span className="text-xs font-mono text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                            {ot.vehicle.plate}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(ot.received_at)}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{ot.total_amount ? COP(ot.total_amount) : '—'}</p>
                  </div>
                );
              })}
            </div>
          )}

          {(allVehicles.length > 0 || workOrders.length > 0) && (
            <button onClick={() => navigate('/workshop/work-orders/new')}
              className="mt-4 w-full border border-dashed border-orange-300 text-orange-600 text-sm py-2 rounded-lg hover:bg-orange-50 transition">
              + Nueva OT para este cliente
            </button>
          )}
        </div>

      </div>

      {/* Modal editar */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Editar Cliente" size="large">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select value={editForm.customer_type}
                onChange={e => setEditForm(f => ({ ...f, customer_type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="individual">Persona Natural</option>
                <option value="business">Empresa</option>
              </select>
            </div>
            <Input label="Nombre completo *" value={editForm.full_name}
              onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} required />
          </div>
          {editForm.customer_type === 'business' && (
            <Input label="Razón Social" value={editForm.business_name}
              onChange={e => setEditForm(f => ({ ...f, business_name: e.target.value }))} />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Cédula / NIT" value={editForm.tax_id} onChange={e => setEditForm(f => ({ ...f, tax_id: e.target.value }))} />
            <Input label="Email" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Teléfono" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Ciudad" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <Input label="Dirección" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              rows="2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setEditModal(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}