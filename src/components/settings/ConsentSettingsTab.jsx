// frontend/src/components/settings/ConsentSettingsTab.jsx
// Configuración → Datos personales:
//   - Habeas data: activar la solicitud, formato estándar de Pitbox o el
//     documento propio del tenant, y los datos que lleva el documento.
//   - Código de verificación por WhatsApp (plantilla de Meta).
//   - Ingreso de vehículos: acta de ingreso con aceptación del cliente,
//     condiciones del servicio, ítems del inventario y aviso de recepción.
// Se guarda dentro de business_config (habeas_data / otp / vehicle_intake)
// con el botón "Guardar Cambios" de la página. Backend: consent.service.js.
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Plus, Trash2 } from 'lucide-react';
import Card from '../common/Card';
import Modal from '../common/Modal';
import { consentsAPI } from '../../api/consents';
import { renderLegalMarkdown } from '../../utils/legalMarkdown';

const DEFAULT_ITEMS = [
  { key: 'estado_general', label: 'Estado general' },
  { key: 'testigos',       label: 'Testigos' },
  { key: 'tanque',         label: 'Tanque combustible' },
  { key: 'espejos',        label: 'Espejos' },
  { key: 'sillin',         label: 'Sillín' },
  { key: 'luces',          label: 'Luces' },
  { key: 'carenaje',       label: 'Carenaje / plásticos' },
  { key: 'llantas',        label: 'Llantas' },
  { key: 'rele_encendido', label: 'Rele de encendido' },
];

// Campos que cambian el texto del documento: al editarlos se actualiza la
// "Fecha de actualización" que aparece en él.
const HABEAS_DOC_FIELDS = ['document_mode', 'custom_content', 'business_kind', 'activity_description', 'policy_url', 'privacy_email', 'city'];

const today = () => new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

const slugKey = (label, existing) => {
  const base = String(label || 'item')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'item';
  let key = base;
  let n = 2;
  while (existing.includes(key)) key = `${base}_${n++}`;
  return key;
};

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';

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

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function ModeChoice({ value, onChange, name }) {
  return (
    <div className="flex flex-wrap gap-4">
      {[
        { v: 'standard', l: 'Formato estándar de Pitbox' },
        { v: 'custom', l: 'Documento propio' },
      ].map((o) => (
        <label key={o.v} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="radio" name={name} checked={(value || 'standard') === o.v} onChange={() => onChange(o.v)} />
          {o.l}
        </label>
      ))}
    </div>
  );
}

export default function ConsentSettingsTab({ businessConfig, onChange }) {
  const habeas = businessConfig?.habeas_data || {};
  const otp = businessConfig?.otp || {};
  const intake = businessConfig?.vehicle_intake || {};
  const items = Array.isArray(intake.checklist_items) && intake.checklist_items.length ? intake.checklist_items : DEFAULT_ITEMS;

  const [preview, setPreview] = useState(null); // { title, content, missing, variables }
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [newItem, setNewItem] = useState('');

  const setHabeas = (key, value) => {
    const next = { ...habeas, [key]: value };
    if (HABEAS_DOC_FIELDS.includes(key)) next.document_updated_at = today();
    onChange('habeas_data', next);
  };
  const setOtp = (key, value) => onChange('otp', { ...otp, [key]: value });
  const setIntake = (key, value) => onChange('vehicle_intake', { ...intake, [key]: value });

  const openPreview = async (kind) => {
    setLoadingPreview(true);
    try {
      const data = await consentsAPI.preview(kind, { habeas_data: habeas, vehicle_intake: { ...intake, checklist_items: items } });
      setPreview({ ...data, title: kind === 'habeas_data' ? 'Autorización de tratamiento de datos' : 'Condiciones de ingreso del vehículo' });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo generar la vista previa');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Copia el formato estándar (ya con los datos de la empresa) como punto de
  // partida del documento propio.
  const copyStandard = async (kind) => {
    try {
      const data = await consentsAPI.preview(kind, kind === 'habeas_data'
        ? { habeas_data: { ...habeas, document_mode: 'standard' } }
        : { vehicle_intake: { ...intake, terms_mode: 'standard' } });
      if (kind === 'habeas_data') setHabeas('custom_content', data.content);
      else setIntake('custom_terms', data.content);
    } catch {
      toast.error('No se pudo cargar el formato estándar');
    }
  };

  const variableLabels = useMemo(
    () => Object.fromEntries((preview?.variables || []).map((v) => [v.key, v.label])),
    [preview]
  );

  const renameItem = (idx, label) => setIntake('checklist_items', items.map((it, i) => (i === idx ? { ...it, label } : it)));
  const removeItem = (idx) => setIntake('checklist_items', items.filter((_, i) => i !== idx));
  const addItem = () => {
    if (!newItem.trim()) return;
    setIntake('checklist_items', [...items, { key: slugKey(newItem, items.map((i) => i.key)), label: newItem.trim() }]);
    setNewItem('');
  };

  return (
    <>
      {/* ── Habeas data ── */}
      <Card>
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-xl font-semibold mb-1">Tratamiento de datos personales (Habeas Data)</h2>
            <p className="text-sm text-gray-500">
              Solicita a tus clientes la autorización de la Ley 1581 de 2012. El cliente lee el documento desde un enlace o en
              mostrador y lo confirma con un código que le llega a su correo o WhatsApp. Las campañas de WhatsApp solo se envían a
              quienes autorizaron publicidad.
            </p>
          </div>

          <Toggle
            checked={!!habeas.enabled}
            onChange={(v) => setHabeas('enabled', v)}
            title="Solicitar autorización de tratamiento de datos"
            description="Muestra el estado en la ficha del cliente y permite enviar la solicitud. No bloquea ventas ni órdenes."
          />

          <Field label="Documento">
            <ModeChoice name="habeas_mode" value={habeas.document_mode} onChange={(v) => setHabeas('document_mode', v)} />
          </Field>

          {habeas.document_mode === 'custom' ? (
            <Field
              label="Tu documento (Markdown)"
              hint="Puedes usar variables como {{razon_social}}, {{nit}}, {{direccion}}, {{telefono}}, {{correo_datos}}, {{url_politica}}. La autorización de publicidad se pide aparte en la pantalla del cliente."
            >
              <textarea
                rows={14}
                value={habeas.custom_content || ''}
                onChange={(e) => setHabeas('custom_content', e.target.value)}
                className={`${inputCls} font-mono text-xs`}
                placeholder="# AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES&#10;..."
              />
              <button type="button" onClick={() => copyStandard('habeas_data')} className="mt-2 text-xs text-blue-600 hover:underline">
                Partir del formato estándar
              </button>
            </Field>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tipo de negocio" hint="Define qué finalidades adicionales incluye el formato (taller y/o venta de productos).">
                <select value={habeas.business_kind || 'auto'} onChange={(e) => setHabeas('business_kind', e.target.value)} className={inputCls}>
                  <option value="auto">Automático (según módulos activos)</option>
                  <option value="workshop">Taller</option>
                  <option value="store">Comercio (sin taller)</option>
                  <option value="both">Taller y comercio</option>
                </select>
              </Field>
              <Field label="Actividad comercial" hint="Ej: el mantenimiento y reparación de motocicletas y la venta de repuestos">
                <input value={habeas.activity_description || ''} onChange={(e) => setHabeas('activity_description', e.target.value)} className={inputCls} />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Ciudad / departamento" hint="Domicilio del responsable">
              <input value={habeas.city || ''} onChange={(e) => setHabeas('city', e.target.value)} className={inputCls} placeholder="Medellín, Antioquia" />
            </Field>
            <Field label="Correo para protección de datos" hint="Si se deja vacío se usa el correo de la empresa">
              <input type="email" value={habeas.privacy_email || ''} onChange={(e) => setHabeas('privacy_email', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Enlace a la política de tratamiento" hint="Opcional, pero recomendado">
              <input value={habeas.policy_url || ''} onChange={(e) => setHabeas('policy_url', e.target.value)} className={inputCls} placeholder="https://..." />
            </Field>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-gray-500">
              Razón social, NIT, dirección y teléfono se toman de la pestaña General.
              {habeas.document_updated_at ? ` Última actualización del documento: ${habeas.document_updated_at}.` : ''}
            </p>
            <button type="button" onClick={() => openPreview('habeas_data')} disabled={loadingPreview}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline disabled:opacity-50">
              <Eye size={14} /> Vista previa
            </button>
          </div>
        </div>
      </Card>

      {/* ── Código por WhatsApp ── */}
      <Card>
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">Código de verificación</h2>
            <p className="text-sm text-gray-500">
              El código (OTP) se genera en Pitbox y se envía por correo electrónico o por tu WhatsApp Cloud API (Configuración →
              WhatsApp). No se usan mensajes de texto (SMS). Para WhatsApp, Meta exige una plantilla aprobada de categoría
              <strong> Autenticación</strong> si el cliente no te ha escrito en las últimas 24 horas.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Plantilla de WhatsApp para el código" hint="Nombre exacto de la plantilla aprobada en Meta (con botón «Copiar código»). Vacío = solo correo, o WhatsApp dentro de la ventana de 24 h.">
              <input value={otp.whatsapp_template || ''} onChange={(e) => setOtp('whatsapp_template', e.target.value.trim())} className={inputCls} placeholder="codigo_verificacion" />
            </Field>
            <Field label="Idioma de las plantillas">
              <input value={otp.whatsapp_language || 'es'} onChange={(e) => setOtp('whatsapp_language', e.target.value.trim())} className={inputCls} placeholder="es" />
            </Field>
          </div>
        </div>
      </Card>

      {/* ── Ingreso de vehículos ── */}
      <Card>
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-xl font-semibold mb-1">Ingreso de vehículos al taller</h2>
            <p className="text-sm text-gray-500">
              Acta de ingreso: el cliente revisa el inventario (kilometraje, combustible, estado, objetos dejados, fotos) y las
              condiciones del servicio, y las acepta con el código. La constancia queda en el PDF de ingreso.
            </p>
          </div>

          <Toggle
            checked={!!intake.enabled}
            onChange={(v) => setIntake('enabled', v)}
            title="Solicitar autorización de ingreso del vehículo"
            description="Agrega la tarjeta «Autorización de ingreso» en la OT. Una vez aceptada, el inventario de ingreso queda bloqueado."
          />
          <Toggle
            checked={!!intake.notify_on_reception}
            onChange={(v) => setIntake('notify_on_reception', v)}
            title="Avisar al cliente al recibir el vehículo"
            description="Al crear la OT se envía al cliente el enlace de seguimiento (y el acta, si está activa) por correo y WhatsApp Cloud. Si WhatsApp no sale solo, Pitbox te ofrece enviarlo desde tu WhatsApp."
          />

          <Field
            label="Plantilla de WhatsApp para el aviso de recepción (opcional)"
            hint="Plantilla de Meta de categoría Servicio con 4 variables en el cuerpo: {{1}} nombre del cliente, {{2}} número de OT, {{3}} placa, {{4}} enlace. Sin plantilla, WhatsApp solo sale si el cliente te escribió en las últimas 24 h."
          >
            <input value={intake.whatsapp_reception_template || ''} onChange={(e) => setIntake('whatsapp_reception_template', e.target.value.trim())} className={inputCls} placeholder="vehiculo_recibido" />
          </Field>

          <Field label="Condiciones del servicio">
            <ModeChoice name="intake_mode" value={intake.terms_mode} onChange={(v) => setIntake('terms_mode', v)} />
          </Field>

          {intake.terms_mode === 'custom' ? (
            <Field label="Tus condiciones (Markdown)" hint="Variables: {{razon_social}}, {{nit}}, {{dias_bodegaje}}, {{tarifa_bodegaje}}, {{tope_sin_aprobacion}}">
              <textarea rows={12} value={intake.custom_terms || ''} onChange={(e) => setIntake('custom_terms', e.target.value)} className={`${inputCls} font-mono text-xs`} />
              <button type="button" onClick={() => copyStandard('vehicle_intake')} className="mt-2 text-xs text-blue-600 hover:underline">
                Partir del formato estándar
              </button>
            </Field>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Días para retirar antes de cobrar bodegaje">
                <input type="number" min="1" value={intake.storage_days ?? 15} onChange={(e) => setIntake('storage_days', e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Tarifa de bodegaje" hint="Valor diario en pesos, o un texto">
                <input value={intake.storage_fee ?? ''} onChange={(e) => setIntake('storage_fee', e.target.value)} className={inputCls} placeholder="15000" />
              </Field>
              <Field label="Tope sin nueva aprobación" hint="Valor en pesos, o un texto">
                <input value={intake.max_amount_without_approval ?? ''} onChange={(e) => setIntake('max_amount_without_approval', e.target.value)} className={inputCls} placeholder="200000" />
              </Field>
            </div>
          )}

          <Field label="Ítems del inventario de ingreso" hint="Cada ítem se marca OK / Novedad / N/A al recibir el vehículo.">
            <div className="space-y-1.5">
              {items.map((it, idx) => (
                <div key={it.key} className="flex gap-2">
                  <input value={it.label} onChange={(e) => renameItem(idx, e.target.value)} className={inputCls} />
                  <button type="button" onClick={() => removeItem(idx)} className="px-2 text-gray-400 hover:text-red-500" title="Quitar">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Nuevo ítem (ej. Llanta de repuesto)"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} className={inputCls} />
                <button type="button" onClick={addItem} className="px-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50" title="Agregar">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </Field>

          <div className="flex justify-end">
            <button type="button" onClick={() => openPreview('vehicle_intake')} disabled={loadingPreview}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline disabled:opacity-50">
              <Eye size={14} /> Vista previa de las condiciones
            </button>
          </div>
        </div>
      </Card>

      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title={preview?.title || ''} size="lg">
        {preview && (
          <div className="space-y-3">
            {preview.missing?.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Faltan datos para poder enviar este documento: {preview.missing.map((k) => variableLabels[k] || k).join(', ')}.
              </div>
            )}
            <div
              className="text-sm text-gray-700 leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1 [&_h3]:font-semibold [&_h3]:mt-3 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: renderLegalMarkdown(preview.content) }}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
