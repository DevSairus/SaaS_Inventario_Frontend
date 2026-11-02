// Plantilla de Meta (Utilidad, con botón) que usa cada envío de Pitbox.
// El backend valida la plantilla al guardar; las que no sirven se muestran
// deshabilitadas con el motivo.
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import crmApi from '../../api/crm';

const keyOf = (t) => (t ? `${t.name}|${t.language}` : '');

export default function WaEventTemplatesSection({ reloadKey = 0 }) {
  const [events, setEvents] = useState([]);
  const [saving, setSaving] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await crmApi.listWaEventTemplates();
      setEvents(res.data.data || []);
    } catch {
      setEvents([]);
    }
  }, []);

  useEffect(() => { load(); }, [load, reloadKey]);

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
    <div className="pt-3 border-t border-gray-100 space-y-3">
      <div>
        <p className="text-xs font-medium text-gray-700">Plantillas por mensaje</p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Con plantilla asignada el mensaje sale siempre por ella, con botón al documento, aunque el cliente no haya escrito en 24 h.
        </p>
      </div>
      {events.map((ev) => (
        <div key={ev.key} className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-800">{ev.label}</label>
          <select
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white disabled:opacity-50"
            value={keyOf(ev.selected)}
            disabled={saving === ev.key}
            onChange={(e) => save(ev.key, e.target.value)}
          >
            <option value="">Sin plantilla (texto o wa.me)</option>
            {ev.templates.map((t) => (
              <option key={keyOf(t)} value={keyOf(t)} disabled={!!t.error}>
                {t.name} ({t.language}){t.error ? ` — ${t.error}` : ''}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500">
            Categoría Utilidad · cuerpo con {ev.body_vars.map((v, i) => `{{${i + 1}}} ${v}`).join(', ')} · botón
            &quot;Visitar sitio web&quot; dinámico con la URL terminada en <code className="px-1 bg-gray-100 rounded">{ev.url_path}{'{{1}}'}</code>
          </p>
        </div>
      ))}
    </div>
  );
}
