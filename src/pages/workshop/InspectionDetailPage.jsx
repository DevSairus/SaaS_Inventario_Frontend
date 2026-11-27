// frontend/src/pages/workshop/InspectionDetailPage.jsx
// Diligenciar un peritaje (borrador) o verlo (finalizado / anulado).
// Mientras es borrador los cambios se guardan solos (debounce) y el servidor
// devuelve el puntaje recalculado; de la respuesta solo se toman el puntaje,
// el concepto sugerido y el resultado por sistema, para no pisar lo que el
// perito siga escribiendo.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Camera, CheckCircle2, ChevronDown, ChevronRight, FileDown, Globe, Link2, Lock,
  ShieldAlert, Trash2, XCircle, Loader2, AlertTriangle, Fingerprint, Image as ImageIcon, ClipboardList, Car, Flag,
  Receipt, MessageCircle,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/common/Modal';
import NumericInput from '../../components/inputs/NumericInput';
import SignaturePad from '../../components/tools/SignaturePad';
import RuntConsultaModal from '../../components/workshop/RuntConsultaModal';
import VehicleBodyDiagram from '../../components/workshop/VehicleBodyDiagram';
import CustomerSearchInput from '../../components/common/CustomerSearchInput';
import ProductSearchInput from '../../components/common/ProductSearchInput';
import useWhatsAppPitbox from '../../hooks/useWhatsAppPitbox';
import useTenantStore from '../../store/tenantStore';
import { productSalePrice } from '../../utils/salePricing';
import { inspectionsApi, vehiclesApi } from '../../api/workshop';
import { usePermissions } from '../../store/tenantPermissionsStore';
import {
  CONCEPTS, RATINGS, STATUSES, REQUESTER_TYPES, PURPOSES, DAMAGE_TYPES, SEVERITIES,
  REPAINT_MICRONS, FILLER_MICRONS, bodyKindFor, zoneLabel, fmtScore, scoreColor,
} from '../../constants/inspection';

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-500';
const labelCls = 'block text-xs text-gray-500 mb-1';
const fmtDate = (d) => (d ? new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const TABS = [
  { key: 'checklist', label: 'Inspección', icon: ClipboardList },
  { key: 'body', label: 'Carrocería', icon: Car },
  { key: 'identity', label: 'Identidad y RUNT', icon: Fingerprint },
  { key: 'photos', label: 'Fotos', icon: ImageIcon },
  { key: 'close', label: 'Concepto y cierre', icon: Flag },
];

export default function InspectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = usePermissions();
  const [insp, setInsp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('checklist');
  const [saveState, setSaveState] = useState('idle'); // idle | pending | saving | saved | error
  const [runtList, setRuntList] = useState([]);
  const [showRunt, setShowRunt] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const hasSales = useTenantStore((s) => s.enabledModules?.includes('sales'));

  // Cambios pendientes de enviar (se acumulan entre debounces).
  const pending = useRef({ items: new Map() });
  const timer = useRef(null);

  const editable = insp?.status === 'draft' && can('workshop.inspections.write');
  const kind = bodyKindFor(insp?.vehicle?.vehicle_type);

  const load = useCallback(async () => {
    try {
      const r = await inspectionsApi.get(id);
      setInsp(r.data.data);
      vehiclesApi.get360(r.data.data.vehicle_id).then((x) => setRuntList(x.data.data.runt || [])).catch(() => {});
    } catch {
      toast.error('No se pudo cargar el peritaje');
      navigate('/workshop/inspections');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  // ── Guardado automático ─────────────────────────────────────────────
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const { items, ...rest } = pending.current;
    const body = { ...rest };
    if (items.size) body.items = [...items.entries()].map(([itemId, patch]) => ({ id: itemId, ...patch }));
    if (!Object.keys(body).length) return true;
    pending.current = { items: new Map() };
    setSaveState('saving');
    try {
      const r = await inspectionsApi.update(id, body);
      const d = r.data.data;
      setInsp((cur) => ({ ...cur, score: d.score, suggested_concept: d.suggested_concept, section_scores: d.section_scores, photos: d.photos, runt_snapshot: d.runt_snapshot, runt_snapshot_id: d.runt_snapshot_id, identity: { ...cur.identity, vin_expected: d.identity?.vin_expected, engine_expected: d.identity?.engine_expected } }));
      setSaveState('saved');
      return true;
    } catch (e) {
      setSaveState('error');
      toast.error(e.response?.data?.message || 'No se pudo guardar');
      return false;
    }
  }, [id]);

  const queue = useCallback((patch, delay = 900) => {
    Object.assign(pending.current, patch);
    setSaveState('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  }, [flush]);

  const queueItem = useCallback((itemId, patch) => {
    const cur = pending.current.items.get(itemId) || {};
    pending.current.items.set(itemId, { ...cur, ...patch });
    setInsp((s) => ({ ...s, items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }));
    setSaveState('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }, [flush]);

  const setField = (k, v, delay) => {
    setInsp((s) => ({ ...s, [k]: v }));
    queue({ [k]: v }, delay);
  };

  // Guardar antes de salir de la página.
  useEffect(() => () => { clearTimeout(timer.current); flush(); }, [flush]);

  // ── Acciones ────────────────────────────────────────────────────────
  const openPdf = async () => {
    await flush();
    try {
      const r = await inspectionsApi.pdf(id);
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('No se pudo generar el PDF');
    }
  };

  const togglePublic = async () => {
    try {
      const r = await inspectionsApi.update(id, { is_public: !insp.is_public });
      setInsp(r.data.data);
      toast.success(r.data.data.is_public ? 'Publicado en el portal del vehículo' : 'Retirado del portal del vehículo');
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cambiar la publicación');
    }
  };

  const copyVerify = async () => {
    if (!insp.verify_url) return;
    await navigator.clipboard.writeText(insp.verify_url);
    toast.success('Enlace de verificación copiado');
  };

  const removeDraft = async () => {
    if (!window.confirm('¿Eliminar este borrador? No se puede deshacer.')) return;
    try {
      await inspectionsApi.remove(id);
      toast.success('Borrador eliminado');
      navigate('/workshop/inspections');
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const progress = useMemo(() => {
    const items = insp?.items || [];
    const rated = items.filter((i) => i.rating).length;
    return { rated, total: items.length, pct: items.length ? Math.round((rated / items.length) * 100) : 0 };
  }, [insp?.items]);

  if (loading || !insp) {
    return <Layout><div className="flex items-center justify-center h-80"><Loader2 className="animate-spin text-blue-600" size={28} /></div></Layout>;
  }

  const v = insp.vehicle || {};
  const st = STATUSES[insp.status];
  const concept = CONCEPTS[insp.concept || insp.suggested_concept];
  const score = insp.score === null || insp.score === undefined ? null : Number(insp.score);

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
        {/* Encabezado */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/workshop/inspections')} className="p-2 hover:bg-gray-100 rounded-lg mt-0.5" aria-label="Volver"><ArrowLeft size={18} /></button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-mono text-xl font-extrabold text-gray-900">{insp.number}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                {insp.is_public && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1"><Globe size={11} /> Público</span>}
                {insp.status === 'draft' && <SaveIndicator state={saveState} />}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                <Link to={`/workshop/vehicles/${v.id}`} className="font-mono font-bold text-blue-600 hover:underline">{v.plate}</Link>
                {' · '}{[
                  [v.brand, v.model, v.year].filter(Boolean).join(' '),
                  `${REQUESTER_TYPES[insp.requester_type]}: ${insp.requester_name || '—'}`,
                  PURPOSES[insp.purpose],
                ].filter(Boolean).join(' · ')}
              </p>
              {insp.status === 'cancelled' && <p className="text-xs text-red-600 mt-1">Anulado el {fmtDate(insp.cancelled_at)}: {insp.cancel_reason}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={openPdf} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"><FileDown size={15} /> PDF</button>
            {insp.sale && insp.sale.status !== 'cancelled' ? (
              <Link to={`/sales/${insp.sale.id}`} className="flex items-center gap-1.5 px-3 py-2 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-lg text-sm hover:bg-emerald-100">
                <Receipt size={15} /> {insp.sale.status === 'draft' ? 'Venta en borrador' : `Venta ${insp.sale.sale_number}`}
              </Link>
            ) : hasSales && insp.status !== 'cancelled' && can('workshop.inspections.write') && (
              <button onClick={async () => { await flush(); setShowBilling(true); }} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"><Receipt size={15} /> Facturar</button>
            )}
            {insp.status === 'finalized' && (
              <>
                {can('workshop.inspections.write') && (
                  <button onClick={() => setShowWhatsApp(true)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"><MessageCircle size={15} className="text-green-600" /> WhatsApp</button>
                )}
                <button onClick={copyVerify} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"><Link2 size={15} /> Enlace de verificación</button>
                {can('workshop.inspections.write') && (
                  <button onClick={togglePublic} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                    <Globe size={15} /> {insp.is_public ? 'Quitar del portal' : 'Publicar en el portal'}
                  </button>
                )}
                {can('workshop.inspections.cancel') && (
                  <button onClick={() => setShowCancel(true)} className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"><XCircle size={15} /> Anular</button>
                )}
              </>
            )}
            {editable && (
              <>
                <button onClick={removeDraft} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50" title="Eliminar borrador"><Trash2 size={15} /></button>
                <button onClick={async () => { if (await flush()) setShowFinalize(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  <CheckCircle2 size={15} /> Finalizar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Resultado en vivo */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
            <ScoreRing score={score} />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{insp.concept ? 'Concepto' : 'Concepto sugerido'}</p>
              {concept ? <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${concept.cls}`}>{concept.label}</span> : <p className="text-sm text-gray-400">Califica los puntos</p>}
              <p className="text-[11px] text-gray-400 mt-1">{progress.rated}/{progress.total} puntos calificados</p>
            </div>
          </div>
          <div className="lg:col-span-3 bg-white border border-gray-100 rounded-xl p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
              {(insp.section_scores || []).map((s) => (
                <div key={s.key} className="min-w-0">
                  <div className="flex justify-between text-xs"><span className="text-gray-600 truncate">{s.label}</span><span className="font-semibold" style={{ color: scoreColor(s.score) }}>{fmtScore(s.score)}</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${s.score ?? 0}%`, backgroundColor: scoreColor(s.score) }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition ${tab === key ? 'border-blue-600 text-blue-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              <Icon size={15} /> {label}
              {key === 'checklist' && <span className="text-[11px] text-gray-400">{progress.pct}%</span>}
            </button>
          ))}
        </div>

        {tab === 'checklist' && (
          <ChecklistTab insp={insp} editable={editable} onItem={queueItem}
            onPhotos={(itemId, added) => setInsp((s) => ({ ...s, items: s.items.map((it) => (it.id === itemId ? { ...it, photos: [...(it.photos || []), ...added] } : it)) }))} />
        )}
        {tab === 'body' && <BodyTab insp={insp} kind={kind} editable={editable} setField={setField} />}
        {tab === 'identity' && (
          <IdentityTab insp={insp} editable={editable} setField={setField} runtList={runtList} onConsultRunt={() => setShowRunt(true)} />
        )}
        {tab === 'photos' && <PhotosTab insp={insp} editable={editable} setInsp={setInsp} setField={setField} />}
        {tab === 'close' && <CloseTab insp={insp} editable={editable} setField={setField} />}
      </div>

      {showRunt && (
        <RuntConsultaModal
          placa={v.plate || ''}
          onClose={() => setShowRunt(false)}
          onConfirm={async (data) => {
            setShowRunt(false);
            try {
              const r = await vehiclesApi.saveRuntSnapshot(v.id, data);
              const snap = r.data.data;
              setRuntList((l) => [snap, ...l]);
              setField('runt_snapshot_id', snap.id, 0);
              toast.success('Consulta RUNT guardada y asociada al peritaje');
            } catch (e) {
              toast.error(e.response?.data?.message || 'No se pudo guardar la consulta RUNT');
            }
          }}
        />
      )}
      {showFinalize && (
        <FinalizeModal insp={insp} onClose={() => setShowFinalize(false)} onDone={(d) => { setShowFinalize(false); setInsp(d); }} />
      )}
      {showCancel && (
        <CancelModal insp={insp} onClose={() => setShowCancel(false)} onDone={(d) => { setShowCancel(false); setInsp(d); }} />
      )}
      {showBilling && (
        <BillingModal insp={insp} onClose={() => setShowBilling(false)}
          onDone={(out) => { setShowBilling(false); navigate(`/sales/${out.sale_id}`); }} />
      )}
      {showWhatsApp && <WhatsAppModal insp={insp} onClose={() => setShowWhatsApp(false)} />}
    </Layout>
  );
}

// ── Piezas ────────────────────────────────────────────────────────────

function SaveIndicator({ state }) {
  const map = {
    pending: { text: 'Cambios sin guardar', cls: 'text-gray-400' },
    saving: { text: 'Guardando…', cls: 'text-gray-400' },
    saved: { text: 'Guardado', cls: 'text-emerald-600' },
    error: { text: 'Error al guardar', cls: 'text-red-600' },
  };
  const m = map[state];
  return m ? <span className={`text-xs ${m.cls}`}>{m.text}</span> : null;
}

function ScoreRing({ score }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="flex-shrink-0" role="img" aria-label={`Puntaje ${fmtScore(score)} de 100`}>
      <circle cx="34" cy="34" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
      <circle cx="34" cy="34" r={r} fill="none" stroke={scoreColor(score)} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(c * pct) / 100} ${c}`} transform="rotate(-90 34 34)" />
      <text x="34" y="39" textAnchor="middle" fontSize="16" fontWeight="700" fill="#111827">{fmtScore(score)}</text>
    </svg>
  );
}

function ChecklistTab({ insp, editable, onItem, onPhotos }) {
  const [open, setOpen] = useState(() => new Set((insp.template_snapshot || []).slice(0, 1).map((s) => s.key)));
  const [uploading, setUploading] = useState(null);
  const toggle = (k) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const upload = async (item, files) => {
    if (!files?.length) return;
    setUploading(item.id);
    try {
      const r = await inspectionsApi.uploadPhotos(insp.id, [...files], item.id);
      onPhotos(item.id, r.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron subir las fotos');
    } finally {
      setUploading(null);
    }
  };

  const markAll = (secKey, rating) => {
    for (const it of insp.items.filter((i) => i.section_key === secKey && !i.rating)) onItem(it.id, { rating });
  };

  return (
    <div className="space-y-3">
      {(insp.template_snapshot || []).map((sec) => {
        const items = insp.items.filter((i) => i.section_key === sec.key);
        const rated = items.filter((i) => i.rating).length;
        const ss = (insp.section_scores || []).find((s) => s.key === sec.key);
        const isOpen = open.has(sec.key);
        return (
          <div key={sec.key} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <button onClick={() => toggle(sec.key)} className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />} {sec.label}
                <span className="text-xs font-normal text-gray-400">peso {sec.weight}</span>
              </span>
              <span className="flex items-center gap-3 text-xs">
                <span className={rated === items.length ? 'text-emerald-600' : 'text-gray-400'}>{rated}/{items.length}</span>
                <span className="font-bold w-8 text-right" style={{ color: scoreColor(ss?.score) }}>{fmtScore(ss?.score)}</span>
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-gray-50">
                {editable && rated < items.length && (
                  <div className="px-4 pt-2 text-right">
                    <button onClick={() => markAll(sec.key, 'bueno')} className="text-xs text-emerald-700 hover:underline">Marcar pendientes como “Bueno”</button>
                  </div>
                )}
                <div className="divide-y divide-gray-50">
                  {items.map((it) => (
                    <ItemRow key={it.id} it={it} editable={editable} onItem={onItem} uploading={uploading === it.id} onUpload={(f) => upload(it, f)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ItemRow({ it, editable, onItem, uploading, onUpload }) {
  const [showNotes, setShowNotes] = useState(!!it.notes);
  const fileRef = useRef(null);
  return (
    <div className={`px-4 py-3 ${it.rating === 'malo' && it.critical ? 'bg-red-50/60' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex-1 min-w-[180px]">
          <p className="text-sm text-gray-800">
            {it.label}
            {it.critical && <span className="ml-1.5 text-[10px] uppercase tracking-wide font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded" title="Si se califica como malo, el concepto es No recomendado">Crítico</span>}
          </p>
        </div>
        {it.kind === 'measure' && (
          <div className="flex items-center gap-1 w-32">
            <NumericInput value={it.measure ?? ''} disabled={!editable} onChange={(e) => onItem(it.id, { measure: e.target.value === '' ? null : e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right disabled:bg-gray-50" placeholder="Valor" />
            <span className="text-xs text-gray-500 w-8">{it.unit}</span>
          </div>
        )}
        <div className="flex gap-1" role="radiogroup" aria-label={`Calificación de ${it.label}`}>
          {RATINGS.map((r) => (
            <button key={r.value} type="button" role="radio" aria-checked={it.rating === r.value} disabled={!editable}
              onClick={() => onItem(it.id, { rating: it.rating === r.value ? null : r.value })}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition disabled:cursor-default ${it.rating === r.value ? r.cls : `bg-white ${r.idle}`}`}>
              {r.label}
            </button>
          ))}
        </div>
        {editable && (
          <div className="flex gap-1">
            <button type="button" onClick={() => setShowNotes((s) => !s)} className={`px-2 py-1.5 text-xs rounded-lg border ${showNotes || it.notes ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Nota</button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1" title="Agregar foto">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}{(it.photos || []).length || ''}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => { onUpload(e.target.files); e.target.value = ''; }} />
          </div>
        )}
      </div>
      {(showNotes || (!editable && it.notes)) && (
        <textarea value={it.notes || ''} disabled={!editable} onChange={(e) => onItem(it.id, { notes: e.target.value })} rows={2}
          placeholder="Observación…" className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none disabled:bg-gray-50" />
      )}
      {(it.photos || []).length > 0 && (
        <div className="flex gap-2 mt-2 overflow-x-auto">
          {it.photos.map((p) => (
            <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="flex-shrink-0">
              <img src={p.url} alt={it.label} className="h-16 w-20 object-cover rounded-lg border border-gray-200" />
            </a>
          ))}
          {editable && (
            <button type="button" onClick={() => onItem(it.id, { photos: [] })} className="text-[11px] text-gray-400 hover:text-red-600 self-end">Quitar fotos</button>
          )}
        </div>
      )}
    </div>
  );
}

function BodyTab({ insp, kind, editable, setField }) {
  const [zone, setZone] = useState(null);
  const [draft, setDraft] = useState({ damage: 'golpe', severity: 'leve', notes: '' });
  const marks = insp.body_marks || [];
  const paint = insp.paint_readings || {};
  const zoneMarks = marks.map((m, idx) => ({ ...m, idx })).filter((m) => m.zone === zone);
  const microns = zone ? paint[zone] : undefined;

  const addMark = () => {
    setField('body_marks', [...marks, { zone, ...draft, notes: draft.notes.trim() || null }], 300);
    setDraft((d) => ({ ...d, notes: '' }));
  };
  const removeMark = (idx) => setField('body_marks', marks.filter((_, i) => i !== idx), 300);
  const setMicrons = (val) => {
    const next = { ...paint };
    if (val === '' || val === null) delete next[zone]; else next[zone] = Number(val);
    setField('paint_readings', next);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-3">{editable ? 'Toca una zona para registrar daños o el espesor de pintura.' : 'Daños registrados por zona.'}</p>
        <VehicleBodyDiagram kind={kind} marks={marks} paint={paint} selected={zone} onSelect={setZone} />
      </div>
      <div className="lg:col-span-3 space-y-4">
        {zone ? (
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">{zoneLabel(kind, zone)}</h3>
              <button onClick={() => setZone(null)} className="text-xs text-gray-400 hover:text-gray-700">Cerrar</button>
            </div>
            <div className="flex items-end gap-3">
              <div className="w-40">
                <label className={labelCls}>Espesor de pintura (µm)</label>
                <NumericInput value={microns ?? ''} disabled={!editable} onChange={(e) => setMicrons(e.target.value)} className={inputCls} placeholder="Ej. 120" />
              </div>
              {microns > FILLER_MICRONS ? <p className="text-xs text-red-600 pb-2">Posible masilla (&gt; {FILLER_MICRONS} µm)</p>
                : microns > REPAINT_MICRONS ? <p className="text-xs text-orange-600 pb-2">Posible repintura (&gt; {REPAINT_MICRONS} µm)</p>
                  : microns ? <p className="text-xs text-emerald-600 pb-2">Rango de pintura original</p> : null}
            </div>
            {zoneMarks.length > 0 && (
              <ul className="space-y-1.5">
                {zoneMarks.map((m) => (
                  <li key={m.idx} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEVERITIES[m.severity]?.color }} />
                    <span className="font-medium">{DAMAGE_TYPES[m.damage]}</span>
                    <span className="text-xs text-gray-500">{SEVERITIES[m.severity]?.label}</span>
                    {m.notes && <span className="text-xs text-gray-600 truncate">· {m.notes}</span>}
                    {editable && <button onClick={() => removeMark(m.idx)} className="ml-auto text-gray-400 hover:text-red-600" aria-label="Quitar"><Trash2 size={14} /></button>}
                  </li>
                ))}
              </ul>
            )}
            {editable && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end border-t border-gray-50 pt-3">
                <div><label className={labelCls}>Daño</label>
                  <select value={draft.damage} onChange={(e) => setDraft((d) => ({ ...d, damage: e.target.value }))} className={inputCls}>
                    {Object.entries(DAMAGE_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select></div>
                <div><label className={labelCls}>Severidad</label>
                  <select value={draft.severity} onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value }))} className={inputCls}>
                    {Object.entries(SEVERITIES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                  </select></div>
                <div><label className={labelCls}>Nota</label>
                  <input value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} className={inputCls} placeholder="Opcional" /></div>
                <button onClick={addMark} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800">Agregar daño</button>
              </div>
            )}
            <p className="text-[11px] text-gray-400">Un daño “Grave” impide el concepto “Aprobado”.</p>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">Selecciona una zona del diagrama.</div>
        )}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Resumen de carrocería</h3>
          {marks.length === 0 && Object.keys(paint).length === 0 ? <p className="text-xs text-gray-400">Sin daños ni lecturas registradas.</p> : (
            <ul className="text-sm space-y-1">
              {marks.map((m, i) => (
                <li key={i} className="flex gap-2"><span className="w-2 h-2 mt-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: SEVERITIES[m.severity]?.color }} />
                  <span><b>{zoneLabel(kind, m.zone)}</b>: {DAMAGE_TYPES[m.damage]} ({SEVERITIES[m.severity]?.label.toLowerCase()}){m.notes ? ` · ${m.notes}` : ''}</span></li>
              ))}
              {Object.entries(paint).map(([z, mic]) => (
                <li key={z} className={`text-xs ${mic > REPAINT_MICRONS ? 'text-orange-700 font-medium' : 'text-gray-600'}`}>{zoneLabel(kind, z)}: {mic} µm</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const TRI = [
  { value: true, label: 'Coincide', cls: 'bg-emerald-600 text-white border-emerald-600' },
  { value: false, label: 'No coincide', cls: 'bg-red-600 text-white border-red-600' },
  { value: null, label: 'Sin verificar', cls: 'bg-gray-500 text-white border-gray-500' },
];

function TriSelect({ value, onChange, disabled }) {
  const cur = value === true || value === false ? value : null;
  return (
    <div className="flex gap-1">
      {TRI.map((o) => (
        <button key={String(o.value)} type="button" disabled={disabled} onClick={() => onChange(o.value)}
          className={`px-2 py-1 text-xs rounded-lg border ${cur === o.value ? o.cls : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'} disabled:cursor-default`}>{o.label}</button>
      ))}
    </div>
  );
}

function IdentityTab({ insp, editable, setField, runtList, onConsultRunt }) {
  const id = insp.identity || {};
  const setId = (k, val) => setField('identity', { ...id, [k]: val });
  const snap = insp.runt_snapshot || runtList.find((s) => s.id === insp.runt_snapshot_id);
  const mismatch = [id.vin_match, id.engine_match, id.chassis_match, id.plate_match].some((x) => x === false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Fingerprint size={15} className="text-blue-600" /> Improntas e identificación</h3>
        {mismatch && <p className="text-xs bg-red-50 text-red-700 rounded-lg px-3 py-2 flex gap-2"><ShieldAlert size={14} className="flex-shrink-0 mt-0.5" /> Hay una verificación que no coincide: el concepto queda en “No recomendado”.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>VIN / chasis registrado</label><p className="font-mono text-sm text-gray-800 py-2">{id.vin_expected || '—'}</p></div>
          <div><label className={labelCls}>VIN leído en el vehículo</label><input value={id.vin_read || ''} disabled={!editable} onChange={(e) => setId('vin_read', e.target.value.toUpperCase())} className={`${inputCls} font-mono`} /></div>
        </div>
        <div className="flex items-center justify-between"><span className="text-xs text-gray-500">VIN</span><TriSelect value={id.vin_match} disabled={!editable} onChange={(x) => setId('vin_match', x)} /></div>
        <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Número de chasis (impronta)</span><TriSelect value={id.chassis_match} disabled={!editable} onChange={(x) => setId('chassis_match', x)} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-50">
          <div><label className={labelCls}>N° de motor registrado</label><p className="font-mono text-sm text-gray-800 py-2">{id.engine_expected || '—'}</p></div>
          <div><label className={labelCls}>N° de motor leído</label><input value={id.engine_read || ''} disabled={!editable} onChange={(e) => setId('engine_read', e.target.value.toUpperCase())} className={`${inputCls} font-mono`} /></div>
        </div>
        <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Motor</span><TriSelect value={id.engine_match} disabled={!editable} onChange={(x) => setId('engine_match', x)} /></div>
        <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Placa vs. documentos</span><TriSelect value={id.plate_match} disabled={!editable} onChange={(x) => setId('plate_match', x)} /></div>
        <div><label className={labelCls}>Observaciones de identificación</label>
          <textarea value={id.notes || ''} disabled={!editable} onChange={(e) => setId('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
        {!id.vin_expected && !id.engine_expected && (
          <p className="text-[11px] text-gray-400">El vehículo no tiene VIN ni número de motor en su ficha; complétalos (o consulta el RUNT) para comparar.</p>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-800">Consulta RUNT</h3>
          {editable && <button onClick={onConsultRunt} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs hover:bg-gray-800">Consultar RUNT ahora</button>}
        </div>
        {snap ? (
          <RuntCard snap={snap} />
        ) : (
          <p className="text-xs text-gray-400">Sin consulta asociada. La consulta necesita el documento del propietario y el captcha del RUNT.</p>
        )}
        {editable && runtList.length > 0 && (
          <div>
            <label className={labelCls}>Usar una consulta guardada del vehículo</label>
            <select value={insp.runt_snapshot_id || ''} onChange={(e) => setField('runt_snapshot_id', e.target.value || null, 0)} className={inputCls}>
              <option value="">— Ninguna —</option>
              {runtList.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.consulted_at)}{s.estado ? ` · ${s.estado}` : ''}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export function RuntCard({ snap }) {
  const yn = (b) => (b === true ? <span className="text-red-600 font-semibold">Reporta</span> : b === false ? <span className="text-emerald-600">No reporta</span> : '—');
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <dt className="text-xs text-gray-500">Fecha</dt><dd>{fmtDate(snap.consulted_at)}</dd>
      <dt className="text-xs text-gray-500">Estado</dt><dd>{snap.estado || '—'}</dd>
      <dt className="text-xs text-gray-500">Prendas</dt><dd>{yn(snap.has_pledges)}</dd>
      <dt className="text-xs text-gray-500">Gravámenes</dt><dd>{yn(snap.has_liens)}</dd>
      <dt className="text-xs text-gray-500">SOAT vence</dt><dd>{snap.soat_expiry || '—'}</dd>
      <dt className="text-xs text-gray-500">Tecnomecánica vence</dt><dd>{snap.tecnomecanica_expiry || '—'}</dd>
    </dl>
  );
}

function PhotosTab({ insp, editable, setInsp, setField }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const photos = insp.photos || [];
  const itemPhotos = (insp.items || []).flatMap((it) => (it.photos || []).map((p) => ({ ...p, caption: it.label })));

  const upload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const r = await inspectionsApi.uploadPhotos(insp.id, [...files]);
      setInsp((s) => ({ ...s, photos: [...(s.photos || []), ...r.data.data] }));
      toast.success(r.data.message);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron subir las fotos');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Fotos generales ({photos.length})</h3>
          {editable && (
            <>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-60">
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />} Agregar fotos
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
            </>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mb-3">Sugerido: frente, atrás, ambos costados, tablero con el kilometraje, motor, VIN y número de motor.</p>
        {photos.length === 0 ? <p className="text-xs text-gray-400">Sin fotos.</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photos.map((p, i) => (
              <div key={p.url} className="space-y-1">
                <a href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={p.caption || `Foto ${i + 1}`} className="w-full h-32 object-cover rounded-lg border border-gray-200" /></a>
                {editable ? (
                  <div className="flex gap-1">
                    <input value={p.caption || ''} placeholder="Leyenda" onChange={(e) => setField('photos', photos.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))}
                      className="flex-1 min-w-0 border border-gray-200 rounded px-2 py-1 text-xs" />
                    <button onClick={() => setField('photos', photos.filter((_, j) => j !== i), 0)} className="text-gray-400 hover:text-red-600 px-1" aria-label="Quitar foto"><Trash2 size={13} /></button>
                  </div>
                ) : p.caption && <p className="text-xs text-gray-600">{p.caption}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
      {itemPhotos.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Fotos de los puntos inspeccionados ({itemPhotos.length})</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {itemPhotos.map((p) => (
              <a key={p.url} href={p.url} target="_blank" rel="noreferrer" title={p.caption}>
                <img src={p.url} alt={p.caption} className="w-full h-20 object-cover rounded-lg border border-gray-200" />
                <span className="block text-[10px] text-gray-500 truncate mt-0.5">{p.caption}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CloseTab({ insp, editable, setField }) {
  const suggested = CONCEPTS[insp.suggested_concept];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Concepto</h3>
        <p className="text-xs text-gray-500">
          Sugerido por el puntaje: {suggested ? <b>{suggested.label}</b> : '—'}. El perito decide el concepto final.
        </p>
        <div className="space-y-2">
          {Object.entries(CONCEPTS).map(([k, c]) => (
            <label key={k} className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 ${editable ? 'cursor-pointer' : ''} ${insp.concept === k ? c.cls : 'border-gray-200'}`}>
              <input type="radio" name="concept" disabled={!editable} checked={insp.concept === k} onChange={() => setField('concept', k, 0)} />
              <span className="text-sm font-medium">{c.label}</span>
              {insp.suggested_concept === k && <span className="ml-auto text-[11px] text-gray-500">sugerido</span>}
            </label>
          ))}
          {editable && insp.concept && (
            <button onClick={() => setField('concept', null, 0)} className="text-xs text-gray-500 hover:underline">Usar el sugerido</button>
          )}
        </div>
        {insp.concept && insp.suggested_concept && insp.concept !== insp.suggested_concept && (
          <p className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2 flex gap-2"><AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> El concepto elegido difiere del sugerido; explica el motivo en la conclusión.</p>
        )}
        <div><label className={labelCls}>Valor del peritaje</label>
          <NumericInput value={insp.price ?? ''} disabled={insp.status === 'cancelled'} onChange={(e) => setField('price', e.target.value === '' ? null : e.target.value)} className={inputCls} /></div>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <div><label className={labelCls}>Conclusión</label>
          <textarea value={insp.conclusion || ''} disabled={!editable} onChange={(e) => setField('conclusion', e.target.value)} rows={5} className={`${inputCls} resize-y`}
            placeholder="Estado general del vehículo, hallazgos principales…" /></div>
        <div><label className={labelCls}>Recomendaciones</label>
          <textarea value={insp.recommendations || ''} disabled={!editable} onChange={(e) => setField('recommendations', e.target.value)} rows={4} className={`${inputCls} resize-y`}
            placeholder="Reparaciones sugeridas antes de la compra, mantenimientos pendientes…" /></div>
      </div>
      <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Firma del perito</h3>
        {insp.inspector_signature ? (
          <div className="flex items-end gap-4">
            <img src={insp.inspector_signature} alt="Firma del perito" className="h-20 border border-gray-200 rounded-lg bg-white" />
            {editable && <button onClick={() => setField('inspector_signature', null, 0)} className="text-xs text-gray-500 hover:underline">Volver a firmar</button>}
          </div>
        ) : editable ? (
          <SignaturePad onChange={(sig) => { if (sig) setField('inspector_signature', sig, 1500); }} height={140} />
        ) : <p className="text-xs text-gray-400">Sin firma.</p>}
      </div>
    </div>
  );
}

function FinalizeModal({ insp, onClose, onDone }) {
  const [concept, setConcept] = useState(insp.concept || insp.suggested_concept || '');
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const pendingItems = (insp.items || []).filter((i) => !i.rating).length;

  const go = async () => {
    setBusy(true);
    try {
      const r = await inspectionsApi.finalize(insp.id, { concept, is_public: isPublic });
      toast.success(r.data.message);
      onDone(r.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo finalizar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Finalizar ${insp.number}`} size="sm">
      <div className="space-y-4">
        {pendingItems > 0 ? (
          <p className="text-sm bg-amber-50 text-amber-800 rounded-lg px-3 py-2">Faltan {pendingItems} punto(s) por calificar. Usa “N/A” en los que no apliquen.</p>
        ) : (
          <>
            <div className="flex items-center gap-3"><ScoreRing score={insp.score === null ? null : Number(insp.score)} /><p className="text-sm text-gray-600">Después de finalizar no se puede editar; para corregir hay que anular y hacer uno nuevo.</p></div>
            <div><label className={labelCls}>Concepto final</label>
              <select value={concept} onChange={(e) => setConcept(e.target.value)} className={inputCls}>
                {Object.entries(CONCEPTS).map(([k, c]) => <option key={k} value={k}>{c.label}{insp.suggested_concept === k ? ' (sugerido)' : ''}</option>)}
              </select></div>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mt-0.5" />
              <span>Publicar el resumen en el portal del vehículo (sticker QR). <span className="text-xs text-gray-500 block">Muestra fecha, puntaje y concepto; nunca los datos del solicitante.</span></span>
            </label>
            {!insp.inspector_signature && <p className="text-xs text-gray-500 flex gap-1.5"><Lock size={13} className="mt-0.5" /> El peritaje no tiene firma del perito (pestaña “Concepto y cierre”).</p>}
          </>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Volver</button>
          <button onClick={go} disabled={busy || pendingItems > 0 || !concept} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">{busy ? 'Finalizando…' : 'Finalizar'}</button>
        </div>
      </div>
    </Modal>
  );
}

function CancelModal({ insp, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const r = await inspectionsApi.cancel(insp.id, reason);
      toast.success(r.data.message);
      onDone(r.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo anular');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Anular ${insp.number}`} size="sm">
      <div className="space-y-3">
        <p className="text-sm text-gray-600">El enlace de verificación seguirá funcionando y mostrará el peritaje como <b>anulado</b>.</p>
        <div><label className={labelCls}>Motivo *</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={`${inputCls} resize-none`} /></div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Volver</button>
          <button onClick={go} disabled={busy || !reason.trim()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">{busy ? 'Anulando…' : 'Anular'}</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Facturar ──────────────────────────────────────────────────────────
// Crea una venta en borrador con el servicio del peritaje; se confirma como
// factura o remisión en Ventas (impuestos, numeración y DIAN normales).
const DOC_TYPES = [['13', 'Cédula de ciudadanía'], ['31', 'NIT'], ['22', 'Cédula de extranjería'], ['41', 'Pasaporte']];

function BillingModal({ insp, onClose, onDone }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState(null);
  const [productText, setProductText] = useState('');
  const [price, setPrice] = useState('');
  const [mode, setMode] = useState('existing'); // existing | new
  const [customerId, setCustomerId] = useState('');
  const [docType, setDocType] = useState('13');
  const [requester, setRequester] = useState({});

  useEffect(() => {
    inspectionsApi.billingDefaults(insp.id).then((r) => {
      const d = r.data.data;
      if (d.product) { setProduct(d.product); setProductText(d.product.name); }
      if (d.price !== null && d.price !== undefined) setPrice(String(d.price));
      setCustomerId(d.customer_id || '');
      setRequester(d.requester || {});
      if (!d.customer_id && d.requester?.name && d.requester?.document) setMode('new');
    }).catch((e) => toast.error(e.response?.data?.message || 'No se pudieron cargar los datos'))
      .finally(() => setLoading(false));
  }, [insp.id]);

  const go = async () => {
    if (!product) return toast.error('Selecciona el servicio');
    if (mode === 'existing' && !customerId) return toast.error('Selecciona el cliente');
    setBusy(true);
    try {
      const r = await inspectionsApi.createSale(insp.id, {
        product_id: product.id,
        unit_price: price,
        ...(mode === 'existing' ? { customer_id: customerId } : { new_customer: { document_type: docType } }),
      });
      toast.success(r.data.message);
      onDone(r.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo crear la venta');
    } finally {
      setBusy(false);
    }
  };

  const canCreateNew = requester.name && requester.document;
  return (
    <Modal isOpen onClose={onClose} title={`Facturar ${insp.number}`} size="md">
      {loading ? <Loader2 className="animate-spin text-blue-600 mx-auto" /> : (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Servicio *</label>
            <ProductSearchInput value={productText} onChange={setProductText} hasSelection={!!product}
              onSelect={(p) => { setProduct(p); setProductText(p.name); if (!price) setPrice(String(productSalePrice(p) || '')); }}
              onClear={() => { setProduct(null); setProductText(''); }} show={{ price: true }} placeholder="Ej. Servicio de peritaje" />
            <p className="text-[11px] text-gray-400 mt-1">Usa un producto de tipo servicio (su cuenta de ingreso e impuestos se aplican a la factura). La próxima vez se propone el mismo.</p>
          </div>
          <div className="w-48">
            <label className={labelCls}>Valor *</label>
            <NumericInput value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className={labelCls}>Cliente a facturar</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" checked={mode === 'existing'} onChange={() => setMode('existing')} /> Cliente registrado</label>
            {mode === 'existing' && <CustomerSearchInput value={customerId} onChange={(id) => setCustomerId(id || '')} />}
            <label className={`flex items-center gap-2 text-sm ${canCreateNew ? '' : 'opacity-50'}`}>
              <input type="radio" disabled={!canCreateNew} checked={mode === 'new'} onChange={() => setMode('new')} />
              Crear cliente con los datos del solicitante
            </label>
            {mode === 'new' && (
              <div className="ml-6 text-sm bg-gray-50 rounded-lg px-3 py-2 space-y-2">
                <p><b>{requester.name}</b> · Doc. {requester.document}{requester.phone ? ` · ${requester.phone}` : ''}{requester.email ? ` · ${requester.email}` : ''}</p>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className={inputCls}>
                  {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            )}
            {!canCreateNew && <p className="text-[11px] text-gray-400">Para crear el cliente se necesitan nombre y documento del solicitante.</p>}
          </div>
          <p className="text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2">Se crea una venta en borrador. En Ventas eliges factura electrónica o remisión y registras el pago.</p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancelar</button>
            <button onClick={go} disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">{busy ? 'Creando…' : 'Crear venta'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── WhatsApp ──────────────────────────────────────────────────────────
function WhatsAppModal({ insp, onClose }) {
  const [phone, setPhone] = useState(insp.requester?.mobile || insp.requester?.phone || insp.requester_phone || '');
  const [busy, setBusy] = useState(false);
  const { sendFromBackend } = useWhatsAppPitbox();
  const go = async () => {
    setBusy(true);
    const r = await sendFromBackend(async () => (await inspectionsApi.sendWhatsApp(insp.id, phone)).data, {
      sentText: 'Certificado enviado por WhatsApp',
      errorText: 'No se pudo enviar el certificado',
    });
    setBusy(false);
    if (r) onClose();
  };
  return (
    <Modal isOpen onClose={onClose} title="Enviar certificado por WhatsApp" size="sm">
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Se envía a <b>{insp.requester_name || 'el solicitante'}</b> el enlace de verificación, donde puede ver el peritaje y descargar el PDF.</p>
        <div><label className={labelCls}>Celular</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="3001234567" /></div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancelar</button>
          <button onClick={go} disabled={busy || !phone.trim()} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">{busy ? 'Enviando…' : 'Enviar'}</button>
        </div>
      </div>
    </Modal>
  );
}
