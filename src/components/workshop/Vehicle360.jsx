// frontend/src/components/workshop/Vehicle360.jsx
// Piezas de la hoja de vida 360 en la ficha del vehículo (VehicleDetailPage):
// indicadores, línea de tiempo, kilometraje, peritajes, galería, propietarios
// y consultas RUNT. Los datos vienen de GET /workshop/vehicles/:id/360.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Wrench, ClipboardCheck, CalendarClock, UserRound, ShieldCheck, Bell, Gauge, Car, AlertTriangle, Globe, Plus, Pencil,
} from 'lucide-react';
import Modal from '../common/Modal';
import CustomerSearchInput from '../common/CustomerSearchInput';
import OdometerChart from './OdometerChart';
import { vehiclesApi } from '../../api/workshop';
import { usePermissions } from '../../store/tenantPermissionsStore';
import { CONCEPTS, STATUSES, fmtScore, scoreColor, REQUESTER_TYPES, PURPOSES } from '../../constants/inspection';

const COP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => (d ? new Date(String(d).length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('es-CO'));
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

export const TABS_360 = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'timeline', label: 'Línea de tiempo' },
  { key: 'km', label: 'Kilometraje' },
  { key: 'inspections', label: 'Peritajes' },
  { key: 'gallery', label: 'Galería' },
  { key: 'owners', label: 'Propietarios' },
  { key: 'runt', label: 'RUNT' },
];

// ── Indicadores ───────────────────────────────────────────────────────
export function Vehicle360Kpis({ data, unit }) {
  if (!data) return null;
  const s = data.summary;
  const li = s.last_inspection;
  const tiles = [
    { label: 'Visitas al taller', value: fmtNum(s.visits), sub: s.open_orders ? `${s.open_orders} OT abierta(s)` : s.last_visit ? `Última hace ${s.days_since_last_visit} días` : 'Sin visitas' },
    { label: 'Invertido en el taller', value: COP(s.total_spent), sub: s.avg_ticket ? `Promedio ${COP(s.avg_ticket)} por OT entregada` : 'OT entregadas' },
    { label: 'Uso estimado', value: s.usage ? `${fmtNum(Math.round(s.usage.km_per_day * 30))} ${unit}/mes` : '—', sub: s.usage ? `≈ ${fmtNum(s.usage.estimated_km)} ${unit} hoy` : 'Faltan lecturas' },
    {
      label: 'Último peritaje',
      value: li ? fmtScore(li.score) : '—',
      valueColor: li ? scoreColor(li.score) : undefined,
      sub: li ? `${CONCEPTS[li.concept]?.short || ''} · ${fmtDate(li.date)}` : 'Sin peritajes',
    },
  ];
  const alerts = [];
  if (s.odometer_anomalies) alerts.push(`${s.odometer_anomalies} lectura(s) de ${unit === 'h' ? 'horómetro' : 'odómetro'} menor(es) a una anterior`);
  if (s.runt?.has_pledges) alerts.push('El RUNT reporta prenda');
  if (s.runt?.has_liens) alerts.push('El RUNT reporta gravámenes / limitaciones');
  if (s.documents?.soat?.status === 'vencido') alerts.push('SOAT vencido');
  if (s.documents?.tecnomecanica?.status === 'vencido') alerts.push('Técnico-mecánica vencida');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white border border-gray-100 rounded-xl p-3">
            <p className="text-[11px] text-gray-500">{t.label}</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5" style={t.valueColor ? { color: t.valueColor } : undefined}>{t.value}</p>
            <p className="text-[11px] text-gray-400 truncate">{t.sub}</p>
          </div>
        ))}
      </div>
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-800 flex gap-2">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{alerts.join(' · ')}</span>
        </div>
      )}
      {li?.sections?.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">Salud por sistema (peritaje {li.number})</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
            {li.sections.filter((x) => x.score !== null).map((x) => (
              <div key={x.key}>
                <div className="flex justify-between text-xs"><span className="text-gray-600 truncate">{x.label}</span><span className="font-semibold text-gray-800">{fmtScore(x.score)}</span></div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-1"><div className="h-full rounded-full" style={{ width: `${x.score}%`, backgroundColor: scoreColor(x.score) }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Línea de tiempo ───────────────────────────────────────────────────
const EVENT_META = {
  work_order: { icon: Wrench, color: '#f97316' },
  maintenance: { icon: CalendarClock, color: '#059669' },
  inspection: { icon: ClipboardCheck, color: '#2563eb' },
  appointment: { icon: CalendarClock, color: '#7c3aed' },
  owner: { icon: UserRound, color: '#0891b2' },
  runt: { icon: ShieldCheck, color: '#4b5563' },
  reminder: { icon: Bell, color: '#9ca3af' },
  odometer_alert: { icon: Gauge, color: '#dc2626' },
  created: { icon: Car, color: '#9ca3af' },
};
const FILTERS = [
  ['all', 'Todo'], ['work_order', 'OT'], ['inspection', 'Peritajes'], ['owner', 'Propietarios'], ['runt', 'RUNT'], ['appointment', 'Citas'],
];

export function Vehicle360Timeline({ data, unit }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const events = (data?.timeline || []).filter((e) => filter === 'all' || e.type === filter || (filter === 'work_order' && e.type === 'maintenance'));
  const open = (e) => {
    if (e.ref?.kind === 'work_order') navigate(`/workshop/work-orders/${e.ref.id}`);
    if (e.ref?.kind === 'inspection') navigate(`/workshop/inspections/${e.ref.id}`);
  };
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-2.5 py-1 text-xs rounded-full border ${filter === k ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>
      {events.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Sin eventos.</p> : (
        <ol className="relative">
          {events.map((e, i) => {
            const m = EVENT_META[e.type] || EVENT_META.created;
            const Icon = m.icon;
            const clickable = e.ref?.kind === 'work_order' || e.ref?.kind === 'inspection';
            return (
              <li key={i} className="relative pl-10 pb-5 last:pb-0">
                {i < events.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-200" />}
                <span className="absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${m.color}18`, color: m.color }}>
                  <Icon size={15} />
                </span>
                <div onClick={clickable ? () => open(e) : undefined} className={clickable ? 'cursor-pointer group' : ''}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className={`text-sm font-semibold ${e.alert ? 'text-red-700' : 'text-gray-900'} ${clickable ? 'group-hover:text-blue-700' : ''}`}>{e.title}</p>
                    <p className="text-xs text-gray-400">{fmtDate(e.date)}</p>
                  </div>
                  {e.detail && <p className={`text-xs mt-0.5 ${e.alert ? 'text-red-600' : 'text-gray-600'} line-clamp-2`}>{e.detail}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-500">
                    {e.mileage != null && <span>{fmtNum(e.mileage)} {unit}</span>}
                    {e.amount ? <span>{COP(e.amount)}</span> : null}
                    {e.technician && <span>Téc. {e.technician}</span>}
                    {e.invoice && <span>Factura {e.invoice.number}</span>}
                    {e.photos ? <span>{e.photos} foto(s)</span> : null}
                    {e.is_public && <span className="text-blue-600 flex items-center gap-0.5"><Globe size={10} /> público</span>}
                  </div>
                  {e.maintenance?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">{e.maintenance.map((x) => <span key={x} className="text-[11px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{x}</span>)}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ── Kilometraje ───────────────────────────────────────────────────────
const SOURCE_LABEL = { ot_ingreso: 'Ingreso OT', ot_entrega: 'Entrega OT', peritaje: 'Peritaje', mantenimiento: 'Mantenimiento' };

export function Vehicle360Odometer({ data }) {
  const od = data?.odometer;
  if (!od) return null;
  const unit = od.unit;
  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-gray-800">{unit === 'h' ? 'Horómetro' : 'Kilometraje'} en el tiempo</h3>
          {od.usage && <p className="text-xs text-gray-500">Uso promedio {fmtNum(od.usage.km_per_day)} {unit}/día · {od.usage.readings} lecturas</p>}
        </div>
        <OdometerChart readings={od.readings} unit={unit} height={260} />
      </div>
      {od.anomalies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-800 flex items-center gap-2"><AlertTriangle size={15} /> Lecturas menores a una anterior</p>
          <ul className="mt-2 space-y-1 text-xs text-red-800">
            {od.anomalies.map((a, i) => (
              <li key={i}>{fmtDate(a.date)}: {fmtNum(a.value)} {unit} ({SOURCE_LABEL[a.source] || a.source} {a.ref || ''}) — antes se registró {fmtNum(a.previous_value)} {unit} ({a.previous_ref || fmtDate(a.previous_date)}). Diferencia: {fmtNum(a.drop)} {unit}.</li>
            ))}
          </ul>
          <p className="text-[11px] text-red-700 mt-2">Puede ser un error de digitación en la OT o un odómetro alterado/cambiado. Revisa la fuente antes de concluir.</p>
        </div>
      )}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500"><tr className="text-left"><th className="px-4 py-2 font-medium">Fecha</th><th className="px-4 py-2 font-medium">Fuente</th><th className="px-4 py-2 font-medium text-right">Lectura</th></tr></thead>
          <tbody className="divide-y divide-gray-50">
            {[...od.readings].reverse().map((r, i) => (
              <tr key={i} className={r.anomaly ? 'bg-red-50/60' : ''}>
                <td className="px-4 py-2 text-gray-700">{fmtDate(r.date)}</td>
                <td className="px-4 py-2 text-gray-600">{SOURCE_LABEL[r.source] || r.source} {r.ref && <span className="font-mono text-xs">{r.ref}</span>}</td>
                <td className={`px-4 py-2 text-right font-medium ${r.anomaly ? 'text-red-700' : 'text-gray-900'}`}>{r.anomaly && '⚠ '}{fmtNum(r.value)} {unit}</td>
              </tr>
            ))}
            {od.readings.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">Sin lecturas registradas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Peritajes ─────────────────────────────────────────────────────────
export function Vehicle360Inspections({ data, vehicleId, unit }) {
  const navigate = useNavigate();
  const can = usePermissions();
  const list = data?.inspections || [];
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Peritajes ({list.length})</h3>
        {can('workshop.inspections.write') && (
          <button onClick={() => navigate(`/workshop/inspections?new=1&vehicle_id=${vehicleId}`)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"><Plus size={13} /> Nuevo peritaje</button>
        )}
      </div>
      {list.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Este vehículo no tiene peritajes.</p> : (
        <div className="divide-y divide-gray-50">
          {list.map((i) => {
            const c = CONCEPTS[i.concept];
            return (
              <button key={i.id} onClick={() => navigate(`/workshop/inspections/${i.id}`)} className="w-full flex items-center gap-4 py-3 text-left hover:bg-gray-50 rounded-lg px-1">
                <span className="text-xl font-black w-12 text-center" style={{ color: scoreColor(i.score) }}>{fmtScore(i.score)}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-800">{i.number}</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded ${STATUSES[i.status]?.cls}`}>{STATUSES[i.status]?.label}</span>
                    {c && <span className={`text-[11px] px-1.5 py-0.5 rounded-full border ${c.cls}`}>{c.short}</span>}
                    {i.is_public && <Globe size={11} className="text-blue-500" />}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">{fmtDate(i.inspected_at)} · {REQUESTER_TYPES[i.requester_type]} · {PURPOSES[i.purpose]}{i.mileage != null ? ` · ${fmtNum(i.mileage)} ${unit}` : ''}{i.inspector ? ` · ${i.inspector}` : ''}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Galería ───────────────────────────────────────────────────────────
export function Vehicle360Gallery({ data }) {
  const navigate = useNavigate();
  const photos = data?.gallery || [];
  const [view, setView] = useState(null);
  if (!photos.length) return <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-sm text-gray-400">Sin fotos. Las fotos de ingreso/entrega de las OT y las de los peritajes aparecen aquí.</div>;
  const LABEL = { ot_ingreso: 'Ingreso', ot_entrega: 'Entrega', peritaje: 'Peritaje' };
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {photos.map((p, i) => (
          <button key={`${p.url}-${i}`} onClick={() => setView(p)} className="text-left">
            {p.type === 'video'
              ? <video src={p.url} className="w-full h-24 object-cover rounded-lg bg-gray-100" muted />
              : <img src={p.url} alt={p.caption || 'Foto'} loading="lazy" className="w-full h-24 object-cover rounded-lg border border-gray-100" />}
            <span className="block text-[10px] text-gray-500 mt-0.5 truncate">{fmtDate(p.date)} · {LABEL[p.source] || ''} {p.ref?.number}</span>
          </button>
        ))}
      </div>
      {view && (
        <Modal isOpen onClose={() => setView(null)} title={`${LABEL[view.source] || ''} ${view.ref?.number || ''} · ${fmtDate(view.date)}`} size="lg">
          {view.type === 'video' ? <video src={view.url} controls className="w-full rounded-lg" /> : <img src={view.url} alt={view.caption || ''} className="w-full rounded-lg" />}
          {view.caption && <p className="text-sm text-gray-600 mt-2">{view.caption}</p>}
          <button onClick={() => navigate(view.ref?.kind === 'inspection' ? `/workshop/inspections/${view.ref.id}` : `/workshop/work-orders/${view.ref.id}`)} className="mt-3 text-sm text-blue-600 hover:underline">Abrir {view.ref?.number}</button>
        </Modal>
      )}
    </div>
  );
}

// ── Propietarios ──────────────────────────────────────────────────────
export function Vehicle360Owners({ data, vehicleId, onChanged }) {
  const navigate = useNavigate();
  const can = usePermissions();
  const owners = data?.owners || [];
  const [showTransfer, setShowTransfer] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const SOURCE = { inicial: 'Registro inicial', cambio: 'Traspaso', manual: 'Manual' };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Historial de propietarios</h3>
        <button onClick={() => setShowTransfer(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs hover:bg-gray-800"><UserRound size={13} /> Registrar traspaso</button>
      </div>
      {owners.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Sin propietarios registrados.</p> : (
        <ol className="space-y-2">
          {owners.map((o) => (
            <li key={o.id} className={`border rounded-lg px-3 py-2.5 ${o.current ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <button onClick={() => o.customer_id && navigate(`/customers/${o.customer_id}`)} className="text-sm font-semibold text-gray-900 hover:text-blue-700">{o.customer_name || 'Cliente eliminado'}</button>
                  {o.current && <span className="ml-2 text-[11px] bg-blue-600 text-white px-1.5 py-0.5 rounded">Actual</span>}
                  <p className="text-xs text-gray-500">{fmtDate(o.started_at)} → {o.ended_at ? fmtDate(o.ended_at) : 'hoy'} · {SOURCE[o.source]}{o.customer_tax_id ? ` · Doc. ${o.customer_tax_id}` : ''}</p>
                  {o.notes && <p className="text-xs text-gray-600 mt-0.5">{o.notes}</p>}
                </div>
                {can('workshop.vehicles.owners') && (
                  <button onClick={() => setEditRow(o)} className="p-1.5 text-gray-400 hover:text-gray-700" aria-label="Corregir"><Pencil size={14} /></button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="text-[11px] text-gray-400 mt-3">Cada cambio de propietario (en la ficha, una OT o una cita) queda registrado aquí. El portal público solo muestra cuántos propietarios ha tenido, nunca sus datos.</p>

      {showTransfer && <TransferModal vehicleId={vehicleId} onClose={() => setShowTransfer(false)} onDone={() => { setShowTransfer(false); onChanged(); }} />}
      {editRow && <EditOwnerModal vehicleId={vehicleId} row={editRow} onClose={() => setEditRow(null)} onDone={() => { setEditRow(null); onChanged(); }} />}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function TransferModal({ vehicleId, onClose, onDone }) {
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await vehiclesApi.transferOwner(vehicleId, { customer_id: customerId, date, notes });
      toast.success('Traspaso registrado');
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo registrar el traspaso');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Registrar traspaso" size="sm">
      <div className="space-y-3">
        <div><label className="block text-xs text-gray-500 mb-1">Nuevo propietario *</label><CustomerSearchInput value={customerId} onChange={(id) => setCustomerId(id || '')} /></div>
        <div><label className="block text-xs text-gray-500 mb-1">Fecha del traspaso</label><input type="date" max={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
        <div><label className="block text-xs text-gray-500 mb-1">Nota</label><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Ej. compraventa, sucesión…" /></div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancelar</button>
          <button onClick={go} disabled={busy || !customerId} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">{busy ? 'Guardando…' : 'Registrar'}</button>
        </div>
      </div>
    </Modal>
  );
}

function EditOwnerModal({ vehicleId, row, onClose, onDone }) {
  const [form, setForm] = useState({ started_at: row.started_at, ended_at: row.ended_at || '', notes: row.notes || '' });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const payload = { started_at: form.started_at, notes: form.notes };
      if (row.ended_at) payload.ended_at = form.ended_at;
      await vehiclesApi.updateOwner(vehicleId, row.id, payload);
      toast.success('Registro corregido');
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo corregir');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Corregir: ${row.customer_name || 'propietario'}`} size="sm">
      <div className="space-y-3">
        <div><label className="block text-xs text-gray-500 mb-1">Desde</label><input type="date" value={form.started_at} onChange={(e) => setForm((f) => ({ ...f, started_at: e.target.value }))} className={inputCls} /></div>
        {row.ended_at && <div><label className="block text-xs text-gray-500 mb-1">Hasta</label><input type="date" value={form.ended_at} onChange={(e) => setForm((f) => ({ ...f, ended_at: e.target.value }))} className={inputCls} /></div>}
        <div><label className="block text-xs text-gray-500 mb-1">Nota</label><input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} /></div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancelar</button>
          <button onClick={go} disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">Guardar</button>
        </div>
      </div>
    </Modal>
  );
}

// ── RUNT ──────────────────────────────────────────────────────────────
export function Vehicle360Runt({ data, onConsult }) {
  const list = data?.runt || [];
  const yn = (b) => (b === true ? <span className="text-red-600 font-semibold">Reporta</span> : b === false ? <span className="text-emerald-600">No</span> : '—');
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Consultas RUNT guardadas</h3>
        <button onClick={onConsult} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs hover:bg-gray-800"><ShieldCheck size={13} /> Consultar RUNT</button>
      </div>
      {list.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Aún no se ha consultado el RUNT desde la ficha. Cada consulta queda guardada con su fecha.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b border-gray-100"><tr className="text-left">
              <th className="py-2 pr-3 font-medium">Fecha</th><th className="py-2 pr-3 font-medium">Estado</th><th className="py-2 pr-3 font-medium">Prendas</th><th className="py-2 pr-3 font-medium">Gravámenes</th><th className="py-2 pr-3 font-medium">SOAT</th><th className="py-2 font-medium">Tecnomecánica</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 pr-3">{fmtDate(s.consulted_at)}</td><td className="py-2 pr-3">{s.estado || '—'}</td>
                  <td className="py-2 pr-3">{yn(s.has_pledges)}</td><td className="py-2 pr-3">{yn(s.has_liens)}</td>
                  <td className="py-2 pr-3">{fmtDate(s.soat_expiry)}</td><td className="py-2">{fmtDate(s.tecnomecanica_expiry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
