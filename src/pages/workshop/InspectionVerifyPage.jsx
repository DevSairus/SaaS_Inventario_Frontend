// frontend/src/pages/workshop/InspectionVerifyPage.jsx
// Verificación pública del certificado de peritaje: /peritaje/:token (QR del
// PDF). Sin login. No muestra datos del solicitante ni del propietario; VIN y
// motor llegan enmascarados desde el backend.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../../api/axios';
import VehicleBodyDiagram from '../../components/workshop/VehicleBodyDiagram';
import { CONCEPTS, RATING_LABELS, bodyKindFor, zoneLabel, DAMAGE_TYPES, SEVERITIES, fmtScore, scoreColor, PURPOSES } from '../../constants/inspection';
import { VEHICLE_TYPE_LABELS } from '../../constants/vehicleTypes';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '—');
const RATING_CLS = { bueno: 'text-emerald-700', regular: 'text-amber-700', malo: 'text-red-700', na: 'text-gray-400' };

export default function InspectionVerifyPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`/public/inspections/${token}`)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(e.response?.data?.message || 'Certificado no encontrado'));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm text-center">
          <p className="text-3xl mb-2" aria-hidden="true">✖</p>
          <h1 className="font-bold text-gray-900">Certificado no válido</h1>
          <p className="text-sm text-gray-500 mt-1">{error}. Si alguien te entregó este documento, desconfía de él y consulta directamente al taller.</p>
        </div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-sm text-gray-500">Verificando certificado…</div>;

  const v = data.vehicle || {};
  const color = data.workshop?.primary_color || '#2563eb';
  const cancelled = data.status === 'cancelled';
  const concept = CONCEPTS[data.concept];
  const score = data.score === null ? null : Number(data.score);
  const kind = bodyKindFor(v.vehicle_type);
  const unit = data.meter_unit === 'h' ? 'h' : 'km';
  const apiBase = import.meta.env.VITE_API_URL || '/api';

  return (
    <div className="min-h-screen bg-slate-100">
      <header style={{ backgroundColor: color }} className="text-white">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-3">
          {data.workshop?.logo_url && <img src={data.workshop.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain bg-white/20 p-1" />}
          <div className="min-w-0">
            <h1 className="font-bold leading-tight truncate">{data.workshop?.name}</h1>
            <p className="text-white/75 text-xs">{[data.workshop?.tax_id && `NIT ${data.workshop.tax_id}`, data.workshop?.phone].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div className={`rounded-2xl p-4 border ${cancelled ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className={`font-semibold ${cancelled ? 'text-red-800' : 'text-emerald-800'}`}>
            {cancelled ? '✖ Este peritaje fue ANULADO por el taller' : '✔ Certificado auténtico'}
          </p>
          <p className="text-sm text-gray-700 mt-0.5">
            Peritaje <b className="font-mono">{data.number}</b> del {fmtDate(data.inspected_at)}
            {cancelled && data.cancelled_at ? `, anulado el ${fmtDate(data.cancelled_at)}` : ''}. Compara estos datos con el documento que recibiste.
          </p>
        </div>

        <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-wrap items-center gap-5">
          <div className="flex-1 min-w-[180px]">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Vehículo</p>
            <p className="font-mono text-3xl font-black text-gray-900">{v.plate}</p>
            <p className="text-sm text-gray-600">{[v.brand, v.model, v.year, v.color].filter(Boolean).join(' · ')}</p>
            <p className="text-xs text-gray-500 mt-1">{VEHICLE_TYPE_LABELS[v.vehicle_type]} · {data.mileage != null ? `${Number(data.mileage).toLocaleString('es-CO')} ${unit}` : 'sin lectura'} · {PURPOSES[data.purpose]}</p>
            {(v.vin || v.engine_number) && <p className="text-[11px] text-gray-400 font-mono mt-1">VIN {v.vin || '—'} · Motor {v.engine_number || '—'}</p>}
          </div>
          <div className={`text-center ${cancelled ? 'opacity-50' : ''}`}>
            <p className="text-4xl font-black" style={{ color: scoreColor(score) }}>{fmtScore(score)}<span className="text-base text-gray-400 font-medium">/100</span></p>
            {concept && <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${concept.cls}`}>{concept.label}</span>}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Resultado por sistema</h2>
          <div className="space-y-2">
            {(data.section_scores || []).filter((s) => s.score !== null).map((s) => (
              <div key={s.key}>
                <div className="flex justify-between text-sm"><span className="text-gray-700">{s.label}</span><span className="font-semibold text-gray-900">{fmtScore(s.score)}</span></div>
                <div className="h-2 bg-gray-100 rounded-full mt-1"><div className="h-full rounded-full" style={{ width: `${s.score}%`, backgroundColor: scoreColor(s.score) }} /></div>
              </div>
            ))}
          </div>
        </section>

        <details className="bg-white rounded-2xl shadow-sm p-5">
          <summary className="text-xs font-semibold uppercase tracking-wide text-gray-500 cursor-pointer">Detalle de la inspección</summary>
          <div className="mt-3 space-y-4">
            {(data.template_snapshot || []).map((sec) => (
              <div key={sec.key}>
                <p className="text-sm font-semibold text-gray-800 mb-1">{sec.label}</p>
                <ul className="divide-y divide-gray-50">
                  {(data.items || []).filter((i) => i.section_key === sec.key).map((i) => (
                    <li key={i.item_key} className="py-1.5 text-sm flex flex-wrap gap-x-3">
                      <span className="flex-1 min-w-[160px] text-gray-700">{i.label}</span>
                      {i.measure != null && <span className="text-gray-500">{Number(i.measure).toLocaleString('es-CO')} {i.unit}</span>}
                      <span className={`font-medium ${RATING_CLS[i.rating] || ''}`}>{RATING_LABELS[i.rating] || '—'}</span>
                      {i.notes && <span className="w-full text-xs text-gray-500">{i.notes}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>

        {((data.body_marks || []).length > 0 || Object.keys(data.paint_readings || {}).length > 0) && (
          <section className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Carrocería</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <VehicleBodyDiagram kind={kind} marks={data.body_marks} paint={data.paint_readings} compact />
              <ul className="text-sm space-y-1">
                {(data.body_marks || []).map((m, i) => (
                  <li key={i}><span className="font-medium">{zoneLabel(kind, m.zone)}</span>: {DAMAGE_TYPES[m.damage]} ({SEVERITIES[m.severity]?.label.toLowerCase()}){m.notes ? ` · ${m.notes}` : ''}</li>
                ))}
                {Object.entries(data.paint_readings || {}).map(([z, mic]) => <li key={z} className="text-xs text-gray-600">{zoneLabel(kind, z)}: {mic} µm</li>)}
              </ul>
            </div>
          </section>
        )}

        {data.runt && (
          <section className="bg-white rounded-2xl shadow-sm p-5 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Consulta RUNT ({fmtDate(data.runt.consulted_at)})</h2>
            <p>Estado: {data.runt.estado || '—'} · Prendas: {data.runt.has_pledges ? 'reporta' : data.runt.has_pledges === false ? 'no reporta' : '—'} · Gravámenes: {data.runt.has_liens ? 'reporta' : data.runt.has_liens === false ? 'no reporta' : '—'}</p>
          </section>
        )}

        {(data.conclusion || data.recommendations) && (
          <section className="bg-white rounded-2xl shadow-sm p-5 text-sm space-y-2">
            {data.conclusion && <div><h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Conclusión</h2><p className="whitespace-pre-line text-gray-800">{data.conclusion}</p></div>}
            {data.recommendations && <div><h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Recomendaciones</h2><p className="whitespace-pre-line text-gray-800">{data.recommendations}</p></div>}
          </section>
        )}

        {(data.photos || []).length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Fotos</h2>
            <div className="grid grid-cols-3 gap-2">
              {data.photos.map((p) => <a key={p.url} href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={p.caption || 'Foto del peritaje'} className="w-full h-24 object-cover rounded-lg" /></a>)}
            </div>
          </section>
        )}

        <div className="text-center space-y-2 pb-6">
          <a href={`${apiBase}/public/inspections/${token}/pdf`} target="_blank" rel="noreferrer" className="inline-block text-sm font-semibold text-white rounded-xl px-5 py-2.5" style={{ backgroundColor: color }}>Descargar certificado (PDF)</a>
          <p className="text-[11px] text-gray-400">Perito: {data.inspector || '—'} · El peritaje refleja el estado del vehículo en la fecha indicada.</p>
        </div>
      </main>
    </div>
  );
}
