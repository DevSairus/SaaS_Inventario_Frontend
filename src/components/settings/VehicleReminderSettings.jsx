// frontend/src/components/settings/VehicleReminderSettings.jsx
// Configuración → Taller: recordatorios de vencimiento de SOAT y
// técnico-mecánica que Pitbox le envía al cliente antes de que venzan.
// Se guarda en business_config.vehicle_reminders con el botón "Guardar
// Cambios" de la página. Backend: services/vehicleReminderService.js.
import { useEffect, useState } from 'react';
import Card from '../common/Card';

const DEFAULTS = {
  enabled: true,
  days_before: [15, 7, 3],
  email: true,
  whatsapp: false,
  whatsapp_template: '',
  whatsapp_language: 'es',
};

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';

// Igual que sanitizeDays del backend: enteros de 1 a 90, sin repetir, máximo 5.
const parseDays = (text) => [...new Set(String(text).split(/[,\s;]+/)
  .map((d) => parseInt(d, 10))
  .filter((d) => Number.isInteger(d) && d >= 1 && d <= 90))]
  .sort((a, b) => b - a)
  .slice(0, 5);

function Toggle({ checked, onChange, title, description }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1 mr-4">
        <p className="font-medium text-gray-900 text-sm">{title}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function VehicleReminderSettings({ businessConfig, onChange }) {
  const settings = { ...DEFAULTS, ...(businessConfig?.vehicle_reminders || {}) };
  const set = (key, value) => onChange({ ...settings, [key]: value });

  const daysToText = (days) => (Array.isArray(days) ? days.join(', ') : String(days ?? ''));
  const [daysText, setDaysText] = useState(daysToText(settings.days_before));
  useEffect(() => { setDaysText(daysToText(settings.days_before)); }, [businessConfig?.vehicle_reminders?.days_before]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsedDays = parseDays(daysText);
  const noChannel = settings.enabled && settings.email === false && !settings.whatsapp;

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-1">Recordatorios de SOAT y técnico-mecánica</h2>
        <p className="text-sm text-gray-500 mb-5">
          Pitbox le avisa al cliente, a las 8:00 a. m., cuando el SOAT o la revisión técnico-mecánica de su vehículo
          está por vencer, según las fechas registradas en la ficha del vehículo. Solo se avisa antes del vencimiento.
          Cada aviso queda en la ficha del vehículo, en <strong>Recordatorios enviados</strong>.
        </p>
        <div className="space-y-4">
          <Toggle
            checked={settings.enabled !== false}
            onChange={(v) => set('enabled', v)}
            title="Enviar recordatorios de vencimiento"
            description="No se le escribe al cliente que rechazó o revocó la autorización de tratamiento de datos."
          />

          {settings.enabled !== false && (
            <>
              <div className="max-w-sm">
                <label className="block text-sm font-medium text-gray-700 mb-1">Días de anticipación</label>
                <input
                  value={daysText}
                  onChange={(e) => setDaysText(e.target.value)}
                  onBlur={() => {
                    const days = parsedDays.length ? parsedDays : DEFAULTS.days_before;
                    set('days_before', days);
                    setDaysText(days.join(', '));
                  }}
                  className={inputCls}
                  placeholder="15, 7, 3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separados por coma, de 1 a 90 días, hasta 5 avisos por documento. Por ejemplo, 15, 7, 3 avisa 15, 7 y 3 días antes.
                </p>
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-700 mb-2">Canales</p>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={settings.email !== false} onChange={(e) => set('email', e.target.checked)} className="w-4 h-4 rounded" />
                    Correo
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={!!settings.whatsapp} onChange={(e) => set('whatsapp', e.target.checked)} className="w-4 h-4 rounded" />
                    WhatsApp (requiere WhatsApp conectado)
                  </label>
                </div>
                {noChannel && <p className="text-xs text-red-600 mt-1">Elige al menos un canal o no se enviará ningún recordatorio.</p>}
              </div>

              {settings.whatsapp && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla de WhatsApp</label>
                    <input
                      value={settings.whatsapp_template || ''}
                      onChange={(e) => set('whatsapp_template', e.target.value.trim())}
                      className={inputCls}
                      placeholder="recordatorio_vencimiento"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Plantilla de Meta de categoría Servicio con 4 variables en el cuerpo: {'{{1}}'} nombre del cliente,
                      {' {{2}}'} documento (SOAT o revisión técnico-mecánica), {'{{3}}'} placa y {'{{4}}'} fecha de vencimiento.
                      Sin plantilla, el WhatsApp solo sale si el cliente te escribió en las últimas 24 h.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Idioma de la plantilla</label>
                    <input
                      value={settings.whatsapp_language || 'es'}
                      onChange={(e) => set('whatsapp_language', e.target.value.trim())}
                      className={inputCls}
                      placeholder="es"
                    />
                    <p className="text-xs text-gray-500 mt-1">El código con que la aprobó Meta (es, es_CO…).</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export default VehicleReminderSettings;
