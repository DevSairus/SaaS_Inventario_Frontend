// Plantillas de Meta de la empresa: cuál usa cada envío de Pitbox y el
// catálogo sincronizado. El backend valida la plantilla al guardar; las que
// no sirven para un mensaje se muestran deshabilitadas con el motivo.
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import crmApi from '../../api/crm';

const keyOf = (t) => (t ? `${t.name}|${t.language}` : '');

const STATUS = {
  APPROVED: ['Aprobada', 'bg-emerald-50 text-emerald-700'],
  PENDING: ['En revisión', 'bg-amber-50 text-amber-700'],
  REJECTED: ['Rechazada', 'bg-red-50 text-red-700'],
  PAUSED: ['Pausada', 'bg-gray-100 text-gray-600'],
  DISABLED: ['Desactivada', 'bg-gray-100 text-gray-600'],
};
const CATEGORY = { UTILITY: 'Utilidad', MARKETING: 'Marketing', AUTHENTICATION: 'Autenticación' };

function requirementText(ev) {
  const vars = ev.body_vars.map((v, i) => `{{${i + 1}}} ${v}`).join(', ');
  return ev.url_path
    ? <>Utilidad · cuerpo con {vars} · botón &quot;Visitar sitio web&quot; dinámico terminado en <code className="px-1 bg-gray-100 rounded">{ev.url_path}{'{{1}}'}</code></>
    : <>Utilidad · cuerpo con {vars} · sin botón de URL dinámica</>;
}

function EventRow({ ev, saving, onSave }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-800">{ev.label}</label>
      <select
        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white disabled:opacity-50"
        value={keyOf(ev.selected)}
        disabled={saving}
        onChange={(e) => onSave(ev.key, e.target.value)}
      >
        <option value="">Sin plantilla (texto o wa.me)</option>
        {ev.selected && !ev.templates.some((t) => keyOf(t) === keyOf(ev.selected)) && (
          <option value={keyOf(ev.selected)}>{ev.selected.name} ({ev.selected.language}) — no sincronizada</option>
        )}
        {ev.templates.map((t) => (
          <option key={keyOf(t)} value={keyOf(t)} disabled={!!t.error}>
            {t.name} ({t.language}){t.error ? ` — ${t.error}` : ''}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-gray-500">{requirementText(ev)}</p>
    </div>
  );
}

function TemplateCard({ t, usedIn }) {
  const [statusLabel, statusCls] = STATUS[t.status] || [t.status, 'bg-gray-100 text-gray-600'];
  const parts = t.components_schema || [];
  const body = parts.find((c) => c.type === 'BODY')?.text;
  const buttons = parts.find((c) => c.type === 'BUTTONS')?.buttons || [];
  return (
    <div className="p-3 border border-gray-200 rounded-lg space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-gray-800">{t.name}</span>
        <span className="text-[11px] text-gray-400">{t.language}</span>
        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${statusCls}`}>{statusLabel}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{CATEGORY[t.category] || t.category || 'Sin categoría'}</span>
      </div>
      {body && <p className="whitespace-pre-wrap text-xs rounded-lg bg-[#d9fdd3] px-3 py-2 text-gray-900">{body}</p>}
      {buttons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {buttons.map((b, i) => (
            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-600" title={b.url || ''}>
              {b.text || b.type}
            </span>
          ))}
        </div>
      )}
      <p className="text-[11px] text-gray-500">
        {usedIn.length ? `Se usa en: ${usedIn.join(', ')}` : 'Disponible para el chat, campañas y recordatorios.'}
      </p>
    </div>
  );
}

export default function WaEventTemplatesSection({ reloadKey = 0 }) {
  const [events, setEvents] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [saving, setSaving] = useState(null);

  const load = useCallback(async () => {
    const [ev, all] = await Promise.allSettled([crmApi.listWaEventTemplates(), crmApi.listWaTemplates()]);
    setEvents(ev.status === 'fulfilled' ? ev.value.data.data || [] : []);
    setCatalog(all.status === 'fulfilled' ? all.value.data.data || [] : []);
  }, []);

  useEffect(() => { load(); }, [load, reloadKey]);

  const groups = useMemo(() => events.reduce((acc, ev) => {
    (acc[ev.group] ||= []).push(ev);
    return acc;
  }, {}), [events]);

  const usedIn = useCallback(
    (t) => events.filter((ev) => keyOf(ev.selected) === keyOf(t)).map((ev) => ev.label),
    [events],
  );

  const save = async (event, value) => {
    const [name = '', language = 'es'] = value.split('|');
    setSaving(event);
    try {
      await crmApi.setWaEventTemplate(event, { name, language });
      toast.success(name ? 'Plantilla asignada' : 'Plantilla quitada: se enviará como texto');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo guardar la plantilla');
    } finally {
      setSaving(null);
    }
  };

  if (!events.length) return null;

  return (
    <div className="space-y-5">
      <div className="pt-3 border-t border-gray-100 space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-700">Plantillas por mensaje</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Con plantilla asignada el mensaje sale siempre por ella, aunque el cliente no haya escrito en 24 h. Sin plantilla se envía como texto si el chat está abierto, o por wa.me.
          </p>
        </div>
        {Object.entries(groups).map(([group, list]) => (
          <div key={group} className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{group}</p>
            {list.map((ev) => (
              <EventRow key={ev.key} ev={ev} saving={saving === ev.key} onSave={save} />
            ))}
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-gray-100 space-y-2">
        <p className="text-xs font-medium text-gray-700">Catálogo de plantillas ({catalog.length})</p>
        {catalog.length === 0 ? (
          <p className="text-[11px] text-gray-500">Aún no hay plantillas. Créalas en Meta y pulsa “Sincronizar plantillas”.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {catalog.map((t) => <TemplateCard key={keyOf(t)} t={t} usedIn={usedIn(t)} />)}
          </div>
        )}
      </div>
    </div>
  );
}
