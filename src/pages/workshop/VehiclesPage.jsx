import { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useWorkshopStore from '../../store/workshopStore';
import { vehiclesApi } from '../../api/workshop';
import { vehiclesApiOffline } from '../../api/workshopOffline';
import RuntConsultaModal from '../../components/workshop/RuntConsultaModal';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Car, Plus, Search, History, X, Wrench, Clock,
  AlertTriangle, CheckCircle, ChevronRight, Gauge,
  User, FileText, Package, Banknote, XCircle, PencilLine,
  Trash2, Save,
} from 'lucide-react';

const FUEL_OPTIONS = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'diesel',   label: 'Diésel' },
  { value: 'gas',      label: 'Gas / GNV' },
  { value: 'hibrido',  label: 'Híbrido' },
  { value: 'electrico',label: 'Eléctrico' },
  { value: 'otro',     label: 'Otro' },
];
const FUEL_LABELS = Object.fromEntries(FUEL_OPTIONS.map(o => [o.value, o.label]));
const STATUS_CONFIG = {
  recibido:   { label: 'Recibido',   color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500',   icon: Clock },
  en_proceso: { label: 'En Proceso', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', icon: Wrench },
  en_espera:  { label: 'En Espera',  color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', icon: AlertTriangle },
  listo:      { label: 'Listo',      color: 'bg-green-100 text-green-700',   dot: 'bg-green-500',  icon: CheckCircle },
  entregado:  { label: 'Entregado',  color: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400',   icon: CheckCircle },
  cancelado:  { label: 'Cancelado',  color: 'bg-red-100 text-red-600',       dot: 'bg-red-400',    icon: XCircle },
};
const PAYMENT_CONFIG = {
  paid:    { label: 'Pagado',    color: 'text-green-600' },
  partial: { label: 'Parcial',   color: 'text-orange-500' },
  pending: { label: 'Pendiente', color: 'text-red-500' },
};
const COP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const EMPTY_VEHICLE = { plate: '', brand: '', model: '', year: '', color: '', fuel_type: 'gasolina', engine_number: '', vin: '', soat_number: '', soat_expiry: '', tecnomecanica_number: '', tecnomecanica_expiry: '', customer_id: '', notes: '' };

/* ── Modal: Crear vehículo ─────────────────────────────────────────── */
function CreateVehicleModal({ onClose, onCreated }) {
  const [form, setForm]             = useState(EMPTY_VEHICLE);
  const [saving, setSaving]         = useState(false);
  const [showRunt, setShowRunt]     = useState(false);
  const [customers, setCustomers]   = useState([]);
  const [custSearch, setCustSearch] = useState('');

  useEffect(() => {
    axios.get('/customers?limit=500').then(r => setCustomers(r.data.data || [])).catch(() => {});
  }, []);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleRuntConfirm = (data) => {
    setForm(p => ({
      ...p,
      plate:                data.plate                || p.plate,
      brand:                data.brand                || p.brand,
      model:                data.model                || p.model,
      year:                 data.year                 || p.year,
      color:                data.color                || p.color,
      fuel_type:            data.fuel_type            || p.fuel_type,
      engine_number:        data.engine_number        || p.engine_number,
      vin:                  data.vin                  || p.vin,
      soat_number:          data.soat_number          || p.soat_number,
      soat_expiry:          data.soat_expiry          || p.soat_expiry,
      tecnomecanica_number: data.tecnomecanica_number || p.tecnomecanica_number,
      tecnomecanica_expiry: data.tecnomecanica_expiry || p.tecnomecanica_expiry,
    }));
    setShowRunt(false);
    const extras = [data.soat_number && 'SOAT', data.tecnomecanica_number && 'Tecno.'].filter(Boolean).join(' y ');
    toast.success(extras ? `Datos RUNT cargados — incluye ${extras}` : 'Datos del RUNT cargados');
  };

  const handleSave = async () => {
    if (!form.plate.trim()) return toast.error('La placa es requerida');
    setSaving(true);
    try {
      const res = await vehiclesApiOffline.create({
        ...form,
        plate: form.plate.toUpperCase().trim(),
        year:  form.year ? parseInt(form.year) : null,
        soat_expiry:          form.soat_expiry          || null,
        tecnomecanica_expiry: form.tecnomecanica_expiry || null,
        customer_id:          form.customer_id          || null,
      });
      toast.success(res.data.data._pendingSync ? 'Vehículo guardado sin conexión — se sincronizará automáticamente' : 'Vehículo registrado');
      onCreated(res.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al crear vehículo');
    } finally { setSaving(false); }
  };

  const filteredCustomers = customers.filter(c => {
    const name = (c.business_name || `${c.first_name} ${c.last_name}`).toLowerCase();
    return name.includes(custSearch.toLowerCase()) || (c.phone || '').includes(custSearch);
  }).slice(0, 8);
  const selCustomer = customers.find(c => c.id === form.customer_id);

  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Car size={18} className="text-blue-600" />
              <span className="font-semibold text-gray-900">Nuevo vehículo</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowRunt(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-50 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-100 transition">
                <Search size={12} /> Consultar RUNT
              </button>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            {/* Placa + Año */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Placa *</label>
                <input value={form.plate} onChange={e => setF('plate', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="ABC123" maxLength={7} className={`${inputCls} font-mono uppercase tracking-widest`} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Año modelo</label>
                <input value={form.year} onChange={e => setF('year', e.target.value)}
                  placeholder="2020" type="number" className={inputCls} />
              </div>
            </div>
            {/* Marca + Línea */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Marca</label>
                <input value={form.brand} onChange={e => setF('brand', e.target.value)} placeholder="Chevrolet" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Línea / Modelo</label>
                <input value={form.model} onChange={e => setF('model', e.target.value)} placeholder="Spark" className={inputCls} />
              </div>
            </div>
            {/* Color + Combustible */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Color</label>
                <input value={form.color} onChange={e => setF('color', e.target.value)} placeholder="Blanco" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Combustible</label>
                <select value={form.fuel_type} onChange={e => setF('fuel_type', e.target.value)} className={inputCls}>
                  {FUEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            {/* N° Motor + VIN */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">N° Motor</label>
                <input value={form.engine_number} onChange={e => setF('engine_number', e.target.value)}
                  placeholder="Motor serial" className={`${inputCls} font-mono`} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">VIN / Chasis</label>
                <input value={form.vin} onChange={e => setF('vin', e.target.value)} placeholder="VIN" className={`${inputCls} font-mono`} />
              </div>
            </div>
            {/* SOAT */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-600">SOAT</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">N° póliza</label>
                  <input value={form.soat_number} onChange={e => setF('soat_number', e.target.value)} placeholder="Nro. póliza" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Vencimiento</label>
                  <input type="date" value={form.soat_expiry} onChange={e => setF('soat_expiry', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
            {/* Tecnomecánica */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-600">Tecnomecánica</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">N° certificado</label>
                  <input value={form.tecnomecanica_number} onChange={e => setF('tecnomecanica_number', e.target.value)} placeholder="Nro. certificado" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Vencimiento</label>
                  <input type="date" value={form.tecnomecanica_expiry} onChange={e => setF('tecnomecanica_expiry', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
            {/* Propietario */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Propietario (cliente)</label>
              {selCustomer ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      {selCustomer.business_name || `${selCustomer.first_name} ${selCustomer.last_name}`}
                    </p>
                    {selCustomer.phone && <p className="text-xs text-blue-500">{selCustomer.phone}</p>}
                  </div>
                  <button onClick={() => { setF('customer_id', ''); setCustSearch(''); }} className="text-blue-400 hover:text-blue-600 p-1">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input value={custSearch} onChange={e => setCustSearch(e.target.value)}
                    placeholder="Buscar cliente por nombre o teléfono..." className={inputCls} />
                  {custSearch && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-44 overflow-y-auto">
                      {filteredCustomers.map(c => (
                        <button key={c.id} onClick={() => { setF('customer_id', c.id); setCustSearch(''); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition">
                          <p className="font-medium text-gray-800">{c.business_name || `${c.first_name} ${c.last_name}`}</p>
                          {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-5 py-4 flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !form.plate.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition">
              <Save size={15} /> {saving ? 'Guardando...' : 'Crear vehículo'}
            </button>
          </div>
        </div>
      </div>

      {showRunt && (
        <RuntConsultaModal placa={form.plate} onConfirm={handleRuntConfirm} onClose={() => setShowRunt(false)} />
      )}
    </>
  );
}

/* ── Modal: Confirmar borrado ──────────────────────────────────────── */
function DeleteConfirm({ vehicle, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-red-50 rounded-xl flex-shrink-0">
            <Trash2 size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Eliminar vehículo</h3>
            <p className="text-sm text-gray-500 mt-1">
              ¿Eliminar <span className="font-mono font-bold text-gray-800">{vehicle.plate}</span>
              {vehicle.brand ? ` — ${vehicle.brand} ${vehicle.model || ''}` : ''}?
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Página principal ──────────────────────────────────────────────── */
export default function VehiclesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { vehicles, vehiclesTotal, vehiclesLoading, fetchVehicles } = useWorkshopStore();
  // Prellenar búsqueda si se llega desde el escáner de placa/VIN (workshop/scan)
  const [search, setSearch]               = useState(() => searchParams.get('search') || '');
  const [page, setPage]                   = useState(1);
  const [showHistory, setShowHistory]     = useState(null);
  const [history, setHistory]             = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState(null);

  useEffect(() => { fetchVehicles({ search, page, limit: 25 }); }, [search, page]);

  const openHistory = async (vehicle) => {
    setShowHistory(vehicle); setHistory(null); setExpandedOrder(null);
    try { const res = await vehiclesApi.getHistory(vehicle.id); setHistory(res.data.data.history); }
    catch { setHistory([]); }
  };
  const closeHistory = () => { setShowHistory(null); setHistory(null); setExpandedOrder(null); };
  const toggleOrder  = (id) => setExpandedOrder(prev => prev === id ? null : id);

  const handleCreated = useCallback(() => {
    setShowCreate(false);
    fetchVehicles({ search, page, limit: 25 });
  }, [search, page]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await vehiclesApi.remove(deleteTarget.id);
      toast.success(`Vehículo ${deleteTarget.plate} eliminado`);
      setDeleteTarget(null);
      fetchVehicles({ search, page, limit: 25 });
    } catch (e) { toast.error(e.response?.data?.message || 'Error al eliminar'); }
  };

  const totalFacturado = history ? history.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0) : 0;

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl"><Car size={22} className="text-white" /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Vehículos</h1>
              <p className="text-sm text-gray-500">{vehiclesTotal} registrados</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            <Plus size={16} /> Nuevo vehículo
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por placa, marca o modelo..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Lista */}
        {vehiclesLoading ? (
          <div className="text-center py-16 text-gray-400">Cargando...</div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-16">
            <Car size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-4">No hay vehículos registrados</p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition">
              <Plus size={14} /> Registrar primer vehículo
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Placa</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Vehículo</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Propietario</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Km</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vehicles.map(v => {
                  const owner = v.customer ? (v.customer.business_name || `${v.customer.first_name} ${v.customer.last_name}`) : '—';
                  return (
                    <tr key={v.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900 text-sm">{v.plate}</span>
                          {v.fuel_type && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded hidden sm:inline">
                              {FUEL_LABELS[v.fuel_type]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">{v.brand} {v.model}</p>
                        <p className="text-xs text-gray-400">{v.year}{v.color ? ` · ${v.color}` : ''}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-sm text-gray-600">{owner}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm text-gray-500">
                          {v.current_mileage ? `${v.current_mileage.toLocaleString()} km` : '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => navigate(`/workshop/vehicles/${v.id}`)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition" title="Editar">
                            <PencilLine size={14} />
                          </button>
                          <button onClick={() => openHistory(v)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                            <History size={12} /> Historial
                          </button>
                          <button onClick={() => setDeleteTarget(v)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {vehiclesTotal > 25 && (
          <div className="flex justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
            <span className="px-3 py-1.5 text-sm text-gray-500">Pág. {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 25 >= vehiclesTotal}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50">Siguiente →</button>
          </div>
        )}

        {/* Modales */}
        {showCreate && <CreateVehicleModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
        {deleteTarget && <DeleteConfirm vehicle={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}

        {/* Historial */}
        {showHistory && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeHistory}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl"><Car size={20} className="text-blue-600" /></div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg font-mono">{showHistory.plate}</h3>
                      <p className="text-sm text-gray-500">{showHistory.brand} {showHistory.model} {showHistory.year}{showHistory.color ? ` · ${showHistory.color}` : ''}</p>
                    </div>
                  </div>
                  <button onClick={closeHistory} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                    <X size={18} />
                  </button>
                </div>
                {history && history.length > 0 && (
                  <div className="flex gap-6 mt-4 pt-4 border-t border-gray-50">
                    <div><p className="text-xl font-bold text-gray-900">{history.length}</p><p className="text-xs text-gray-400">visitas</p></div>
                    <div><p className="text-xl font-bold text-gray-900">{history.filter(o => o.status === 'entregado').length}</p><p className="text-xs text-gray-400">completadas</p></div>
                    <div><p className="text-xl font-bold text-gray-900">{COP(totalFacturado)}</p><p className="text-xs text-gray-400">facturado total</p></div>
                    {showHistory.current_mileage && (
                      <div><p className="text-xl font-bold text-gray-900">{showHistory.current_mileage.toLocaleString()} km</p><p className="text-xs text-gray-400">km actuales</p></div>
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-y-auto flex-1 p-5">
                {!history ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mb-3" />
                    <p className="text-sm">Cargando historial...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12">
                    <History size={36} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-500 font-medium">Sin órdenes de trabajo</p>
                    <p className="text-sm text-gray-400 mt-1">Este vehículo aún no ha ingresado al taller</p>
                    <button onClick={() => { closeHistory(); navigate('/workshop/work-orders/new'); }}
                      className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition">
                      <Plus size={14} /> Crear primera OT
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gray-200" />
                    <div className="space-y-3">
                      {history.map((order, idx) => {
                        const sc         = STATUS_CONFIG[order.status] || STATUS_CONFIG.recibido;
                        const StatusIcon = sc.icon;
                        const pc         = order.sale ? (PAYMENT_CONFIG[order.sale.payment_status] || PAYMENT_CONFIG.pending) : null;
                        const isOpen     = expandedOrder === order.id;
                        const techName   = order.technician ? `${order.technician.first_name} ${order.technician.last_name}` : null;
                        return (
                          <div key={order.id} className="relative pl-10">
                            <div className="absolute left-0 top-3.5 w-10 flex items-center justify-center">
                              <div className={`w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center ${sc.dot}`}>
                                <StatusIcon size={10} className="text-white" />
                              </div>
                            </div>
                            <div className={`bg-white border rounded-xl transition-all ${isOpen ? 'border-blue-200 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
                              <button className="w-full text-left p-3.5" onClick={() => toggleOrder(order.id)}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-bold text-gray-900 text-sm">{order.order_number}</span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                                      {idx === 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Más reciente</span>}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                                      <span>{fmtDate(order.received_at)}</span>
                                      {order.delivered_at && (<><span>→</span><span>{fmtDate(order.delivered_at)}</span></>)}
                                      {order.mileage_in && <span className="flex items-center gap-1"><Gauge size={10} /> {parseInt(order.mileage_in).toLocaleString()} km</span>}
                                    </div>
                                    {order.problem_description && <p className="text-xs text-gray-500 mt-1 truncate">{order.problem_description}</p>}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-bold text-gray-900">{COP(order.total_amount)}</p>
                                    {pc && <p className={`text-xs font-medium ${pc.color}`}>{pc.label}</p>}
                                    <ChevronRight size={14} className={`ml-auto mt-1 text-gray-300 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                  </div>
                                </div>
                              </button>
                              {isOpen && (
                                <div className="border-t border-gray-100 px-3.5 pb-3.5 pt-3 space-y-3">
                                  {techName && <div className="flex items-center gap-2 text-xs text-gray-500"><User size={12} className="text-gray-400" />Técnico: <span className="font-medium text-gray-700">{techName}</span></div>}
                                  {(order.mileage_in || order.mileage_out) && (
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                      <Gauge size={12} className="text-gray-400" />
                                      {order.mileage_in && <span>Entrada: <span className="font-medium text-gray-700">{parseInt(order.mileage_in).toLocaleString()} km</span></span>}
                                      {order.mileage_out && <span>Salida: <span className="font-medium text-gray-700">{parseInt(order.mileage_out).toLocaleString()} km</span></span>}
                                    </div>
                                  )}
                                  {order.work_performed && (
                                    <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5">
                                      <p className="font-medium text-gray-700 mb-0.5 flex items-center gap-1"><Wrench size={11} /> Trabajo realizado</p>
                                      <p className="leading-relaxed">{order.work_performed}</p>
                                    </div>
                                  )}
                                  {order.items && order.items.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1"><Package size={11} /> Repuestos y servicios</p>
                                      <div className="space-y-1">
                                        {order.items.map(item => (
                                          <div key={item.id} className="flex justify-between text-xs text-gray-600">
                                            <span className="truncate mr-2">
                                              {item.quantity > 1 && <span className="text-gray-400">{item.quantity}× </span>}
                                              {item.product_name}
                                              {item.item_type === 'service' && <span className="ml-1 text-gray-400 text-[10px]">(servicio)</span>}
                                            </span>
                                            <span className="font-medium text-gray-800 flex-shrink-0">{COP(item.total)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {order.sale && (
                                    <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-2.5">
                                      <div className="flex items-center gap-1.5 text-gray-500 flex-wrap">
                                        <Banknote size={12} />
                                        <span>Remisión <span className="font-mono font-medium">{order.sale.sale_number}</span></span>
                                        {pc && <span className={`font-medium ${pc.color}`}>· {pc.label}</span>}
                                        {order.sale.paid_amount > 0 && order.sale.payment_status !== 'paid' && <span className="text-gray-400">({COP(order.sale.paid_amount)} pagados)</span>}
                                      </div>
                                      <button onClick={() => navigate(`/sales/${order.sale.id}`)}
                                        className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition font-medium">
                                        <FileText size={11} /> Ver remisión
                                      </button>
                                    </div>
                                  )}
                                  <button onClick={() => navigate(`/workshop/work-orders/${order.id}`)}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                    Ver orden de trabajo completa <ChevronRight size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {history && history.length > 0 && (
                <div className="border-t border-gray-100 p-4 flex justify-between items-center">
                  <button onClick={() => { closeHistory(); navigate('/workshop/work-orders/new'); }}
                    className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-700 transition">
                    <Plus size={15} /> Nueva OT para este vehículo
                  </button>
                  <button onClick={closeHistory} className="text-sm text-gray-400 hover:text-gray-600 transition">Cerrar</button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}