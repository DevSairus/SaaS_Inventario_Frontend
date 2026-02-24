import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { vehiclesApi } from '../../api/workshop';
import axios from '../../api/axios';
import {
  ArrowLeft, Car, Wrench, User, Save, X, PencilLine,
  ChevronRight, AlertTriangle, CheckCircle, Clock,
  FileText, Hash, Fuel, Gauge, Palette
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── helpers ──────────────────────────────────────────────────────────
const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const FUEL_LABELS = {
  gasolina: 'Gasolina', diesel: 'Diésel', gas: 'Gas',
  hibrido: 'Híbrido', electrico: 'Eléctrico', otro: 'Otro'
};

const OT_STATUS = {
  recibido:   { label: 'Recibido',   cls: 'bg-blue-100 text-blue-700' },
  en_proceso: { label: 'En Proceso', cls: 'bg-yellow-100 text-yellow-700' },
  en_espera:  { label: 'En Espera',  cls: 'bg-orange-100 text-orange-700' },
  listo:      { label: 'Listo',      cls: 'bg-green-100 text-green-700' },
  entregado:  { label: 'Entregado',  cls: 'bg-gray-100 text-gray-600' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-red-100 text-red-600' },
};

// Evalúa vencimiento de un documento
function docStatus(expiryDate) {
  if (!expiryDate) return null;
  const today  = new Date(); today.setHours(0,0,0,0);
  const expiry = new Date(expiryDate + 'T12:00:00');
  const days   = Math.round((expiry - today) / 86400000);
  if (days < 0)  return { icon: AlertTriangle, cls: 'text-red-600 bg-red-50 border-red-200', label: `Venció hace ${Math.abs(days)} días` };
  if (days <= 30) return { icon: Clock,         cls: 'text-orange-600 bg-orange-50 border-orange-200', label: `Vence en ${days} días` };
  return           { icon: CheckCircle,         cls: 'text-green-600 bg-green-50 border-green-200', label: `Vigente (${days} días)` };
}

// ── componente principal ──────────────────────────────────────────────
export default function VehicleDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [vehicle,  setVehicle]  = useState(null);
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({});
  const [customers, setCustomers] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [showCustDrop, setShowCustDrop] = useState(false);

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    axios.get('/customers?limit=500').then(r => setCustomers(r.data.data || [])).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await vehiclesApi.getHistory(id);
      setVehicle(res.data.data.vehicle);
      setHistory(res.data.data.history || []);
    } catch {
      toast.error('Error cargando vehículo');
      navigate('/workshop/vehicles');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    const v = vehicle;
    setForm({
      plate:                  v.plate || '',
      brand:                  v.brand || '',
      model:                  v.model || '',
      year:                   v.year || '',
      color:                  v.color || '',
      fuel_type:              v.fuel_type || 'gasolina',
      current_mileage:        v.current_mileage || '',
      // Identificación técnica
      vin:                    v.vin || '',
      engine:                 v.engine || '',
      engine_number:          v.engine_number || '',
      ownership_card:         v.ownership_card || '',
      // Documentos
      soat_number:            v.soat_number || '',
      soat_expiry:            v.soat_expiry || '',
      tecnomecanica_number:   v.tecnomecanica_number || '',
      tecnomecanica_expiry:   v.tecnomecanica_expiry || '',
      // Propietario
      customer_id:            v.customer_id || '',
      notes:                  v.notes || '',
    });
    setCustSearch(v.customer
      ? (v.customer.business_name || `${v.customer.first_name} ${v.customer.last_name}`)
      : '');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.plate) return toast.error('La placa es requerida');
    setSaving(true);
    try {
      const res = await vehiclesApi.update(id, {
        ...form,
        soat_expiry:          form.soat_expiry          || null,
        tecnomecanica_expiry: form.tecnomecanica_expiry  || null,
        customer_id:          form.customer_id           || null,
      });
      // Recargar para tener customer incluido
      const reloaded = await vehiclesApi.getHistory(id);
      setVehicle(reloaded.data.data.vehicle);
      setHistory(reloaded.data.data.history || []);
      setEditing(false);
      toast.success('Vehículo actualizado');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const setF = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    </Layout>
  );
  if (!vehicle) return null;

  const owner     = vehicle.customer
    ? (vehicle.customer.business_name || `${vehicle.customer.first_name} ${vehicle.customer.last_name}`)
    : null;
  const soatSt    = docStatus(vehicle.soat_expiry);
  const tecnomSt  = docStatus(vehicle.tecnomecanica_expiry);
  const activeOTs = history.filter(o => !['entregado','cancelado'].includes(o.status));
  const custFiltered = customers.filter(c => {
    const n = (c.business_name || c.full_name || `${c.first_name} ${c.last_name}`).toLowerCase();
    return n.includes(custSearch.toLowerCase()) || (c.phone||'').includes(custSearch);
  }).slice(0, 8);

  // ── RENDER ──────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/workshop/vehicles')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl font-extrabold text-gray-900 tracking-wide">{vehicle.plate}</span>
                {activeOTs.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {activeOTs.length} OT activa{activeOTs.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{vehicle.brand} {vehicle.model} {vehicle.year}</p>
            </div>
          </div>
          {!editing ? (
            <button onClick={startEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              <PencilLine size={15} /> Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                <X size={15}/> Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                <Save size={15}/> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          )}
        </div>

        {/* ── VISTA / EDICIÓN ── */}
        {!editing ? (
          /* ─── MODO VISTA ─────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Datos básicos */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Car size={14} className="text-blue-500"/> Información del vehículo
              </h2>
              {[
                { icon: Palette,  label: 'Color',       val: vehicle.color },
                { icon: Fuel,     label: 'Combustible', val: FUEL_LABELS[vehicle.fuel_type] },
                { icon: Gauge,    label: 'Kilometraje', val: vehicle.current_mileage ? `${vehicle.current_mileage.toLocaleString()} km` : null },
              ].filter(x => x.val).map(({ icon: Icon, label, val }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <Icon size={13} className="text-gray-400 flex-shrink-0"/>
                  <span className="text-gray-500 text-xs w-24">{label}</span>
                  <span className="text-gray-800 font-medium">{val}</span>
                </div>
              ))}

              {/* Separador técnico */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Identificación técnica</p>
                {[
                  { label: 'VIN / Chasis', val: vehicle.vin },
                  { label: 'Motor',        val: vehicle.engine },
                  { label: 'N° motor',     val: vehicle.engine_number },
                  { label: 'T. propiedad', val: vehicle.ownership_card },
                ].filter(x => x.val).map(({ label, val }) => (
                  <div key={label} className="flex items-start gap-2 text-sm">
                    <Hash size={12} className="text-gray-300 mt-0.5 flex-shrink-0"/>
                    <span className="text-gray-500 text-xs w-24">{label}</span>
                    <span className="font-mono text-gray-800 text-xs break-all">{val}</span>
                  </div>
                ))}
                {!vehicle.vin && !vehicle.engine && !vehicle.engine_number && !vehicle.ownership_card && (
                  <p className="text-xs text-gray-400 italic">Sin datos técnicos registrados</p>
                )}
              </div>

              {/* Propietario */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Propietario</p>
                {owner ? (
                  <button onClick={() => navigate(`/customers/${vehicle.customer_id}`)}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <User size={13}/> {owner}
                  </button>
                ) : (
                  <p className="text-xs text-gray-400 italic">Sin propietario — <button onClick={startEdit} className="text-blue-500 hover:underline">asignar</button></p>
                )}
              </div>

              {vehicle.notes && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Notas</p>
                  <p className="text-sm text-gray-600">{vehicle.notes}</p>
                </div>
              )}
            </div>

            {/* Documentos */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText size={14} className="text-purple-500"/> Documentos
              </h2>

              {/* SOAT */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500">SOAT</p>
                {vehicle.soat_number || vehicle.soat_expiry ? (
                  <div className="space-y-1">
                    {vehicle.soat_number && (
                      <p className="text-sm font-mono text-gray-800">{vehicle.soat_number}</p>
                    )}
                    {vehicle.soat_expiry && soatSt && (
                      <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${soatSt.cls}`}>
                        <soatSt.icon size={12}/>
                        <span>{fmtDate(vehicle.soat_expiry)}</span>
                        <span className="ml-auto">{soatSt.label}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No registrado</p>
                )}
              </div>

              {/* Tecno-mecánica */}
              <div className="space-y-1 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500">Técnico-mecánica</p>
                {vehicle.tecnomecanica_number || vehicle.tecnomecanica_expiry ? (
                  <div className="space-y-1">
                    {vehicle.tecnomecanica_number && (
                      <p className="text-sm font-mono text-gray-800">{vehicle.tecnomecanica_number}</p>
                    )}
                    {vehicle.tecnomecanica_expiry && tecnomSt && (
                      <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${tecnomSt.cls}`}>
                        <tecnomSt.icon size={12}/>
                        <span>{fmtDate(vehicle.tecnomecanica_expiry)}</span>
                        <span className="ml-auto">{tecnomSt.label}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No registrada</p>
                )}
              </div>

              {/* Alertas si hay vencimientos próximos */}
              {(soatSt?.cls.includes('red') || soatSt?.cls.includes('orange') ||
                tecnomSt?.cls.includes('red') || tecnomSt?.cls.includes('orange')) && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Atención documentos</p>
                  {soatSt?.cls.includes('red') && <p className="text-xs text-amber-700">SOAT vencido</p>}
                  {soatSt?.cls.includes('orange') && <p className="text-xs text-amber-700">SOAT por vencer</p>}
                  {tecnomSt?.cls.includes('red') && <p className="text-xs text-amber-700">Tecno-mecánica vencida</p>}
                  {tecnomSt?.cls.includes('orange') && <p className="text-xs text-amber-700">Tecno-mecánica por vencer</p>}
                </div>
              )}
            </div>

            {/* OTs recientes */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Wrench size={14} className="text-orange-500"/> Historial OTs
                </h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{history.length}</span>
              </div>
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Wrench size={24} className="mx-auto mb-2 opacity-20"/>
                  <p className="text-xs">Sin historial</p>
                  <button onClick={() => navigate('/workshop/work-orders/new')}
                    className="mt-2 text-xs text-blue-500 hover:underline">+ Nueva OT</button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 -mx-1">
                  {history.map(ot => {
                    const sc = OT_STATUS[ot.status] || OT_STATUS.recibido;
                    return (
                      <div key={ot.id} onClick={() => navigate(`/workshop/work-orders/${ot.id}`)}
                        className="flex items-center justify-between px-1 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-gray-800">{ot.order_number}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sc.cls}`}>{sc.label}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(ot.received_at).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold text-gray-700">{ot.total_amount ? COP(ot.total_amount) : '—'}</p>
                          <ChevronRight size={13} className="text-gray-300"/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button onClick={() => navigate('/workshop/work-orders/new')}
                className="mt-3 w-full border border-dashed border-orange-200 text-orange-600 text-xs py-2 rounded-lg hover:bg-orange-50 transition">
                + Nueva OT para esta moto
              </button>
            </div>
          </div>

        ) : (
          /* ─── MODO EDICIÓN ───────────────────────────── */
          <div className="space-y-4">

            {/* Datos básicos */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Car size={14} className="text-blue-500"/> Datos básicos
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[['Placa *','plate','text'],['Marca','brand','text'],['Modelo','model','text'],['Año','year','number'],['Color','color','text']].map(([lbl, k, type]) => (
                  <div key={k}>
                    <label className="block text-xs text-gray-500 mb-1">{lbl}</label>
                    <input type={type} value={form[k]} placeholder={lbl} className={inputCls}
                      onChange={e => setF(k, k === 'plate' ? e.target.value.toUpperCase() : e.target.value)} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Combustible</label>
                  <select value={form.fuel_type} onChange={e => setF('fuel_type', e.target.value)} className={inputCls}>
                    {Object.entries(FUEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kilometraje actual</label>
                  <input type="number" value={form.current_mileage} placeholder="85000" className={inputCls}
                    onChange={e => setF('current_mileage', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Identificación técnica */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Hash size={14} className="text-gray-500"/> Identificación técnica
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['VIN / Chasis', 'vin',           'Ej: 3GNBABCX0AB123456'],
                  ['Cilindraje / Tipo motor', 'engine', 'Ej: 150cc, 1.6L'],
                  ['N° serie motor', 'engine_number', 'Número grabado en el motor'],
                  ['N° tarjeta de propiedad', 'ownership_card', 'Número del documento'],
                ].map(([lbl, k, ph]) => (
                  <div key={k}>
                    <label className="block text-xs text-gray-500 mb-1">{lbl}</label>
                    <input value={form[k]} placeholder={ph} className={inputCls}
                      onChange={e => setF(k, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Documentos */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <FileText size={14} className="text-purple-500"/> Documentos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* SOAT */}
                <div className="space-y-3 pb-4 sm:pb-0 sm:pr-4 sm:border-r border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SOAT</p>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Número de póliza</label>
                    <input value={form.soat_number} placeholder="N° de póliza" className={inputCls}
                      onChange={e => setF('soat_number', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fecha de vencimiento</label>
                    <input type="date" value={form.soat_expiry} className={inputCls}
                      onChange={e => setF('soat_expiry', e.target.value)} />
                  </div>
                  {form.soat_expiry && docStatus(form.soat_expiry) && (() => {
                    const s = docStatus(form.soat_expiry);
                    return (
                      <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg border ${s.cls}`}>
                        <s.icon size={12}/> {s.label}
                      </div>
                    );
                  })()}
                </div>

                {/* Tecno-mecánica */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Técnico-mecánica</p>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Número de certificado</label>
                    <input value={form.tecnomecanica_number} placeholder="N° de certificado" className={inputCls}
                      onChange={e => setF('tecnomecanica_number', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fecha de vencimiento</label>
                    <input type="date" value={form.tecnomecanica_expiry} className={inputCls}
                      onChange={e => setF('tecnomecanica_expiry', e.target.value)} />
                  </div>
                  {form.tecnomecanica_expiry && docStatus(form.tecnomecanica_expiry) && (() => {
                    const s = docStatus(form.tecnomecanica_expiry);
                    return (
                      <div className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg border ${s.cls}`}>
                        <s.icon size={12}/> {s.label}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Propietario & Notas */}
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <User size={14} className="text-green-500"/> Propietario y notas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Propietario</label>
                  <div className="relative">
                    <input value={custSearch} placeholder="Buscar cliente..."
                      className={inputCls}
                      onChange={e => { setCustSearch(e.target.value); setShowCustDrop(true); }}
                      onFocus={() => setShowCustDrop(true)}
                    />
                    {showCustDrop && custSearch && (
                      <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto"
                        onMouseDown={e => e.preventDefault()}>
                        {custFiltered.length === 0
                          ? <p className="text-xs text-gray-400 text-center py-3">Sin resultados</p>
                          : custFiltered.map(c => {
                            const name = c.business_name || c.full_name || `${c.first_name} ${c.last_name}`;
                            return (
                              <button key={c.id} type="button"
                                onClick={() => { setF('customer_id', c.id); setCustSearch(name); setShowCustDrop(false); }}
                                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0">
                                {name}{c.phone && <span className="text-xs text-gray-400 ml-2">{c.phone}</span>}
                              </button>
                            );
                          })
                        }
                        <button type="button" onClick={() => { setF('customer_id', ''); setCustSearch(''); setShowCustDrop(false); }}
                          className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-t border-gray-100">
                          × Quitar propietario
                        </button>
                      </div>
                    )}
                  </div>
                  {form.customer_id && (
                    <p className="text-xs text-green-600 mt-1">✓ Propietario seleccionado</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notas internas</label>
                  <textarea value={form.notes} placeholder="Notas sobre el vehículo..."
                    className={`${inputCls} h-24 resize-none`}
                    onChange={e => setF('notes', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}