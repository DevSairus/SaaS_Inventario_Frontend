// hooks/useWhatsAppPitbox.jsx
// Un solo criterio para todos los botones de WhatsApp: con WhatsApp Pitbox
// operativo (Cloud API o demo) el mensaje sale por Pitbox y queda en el chat
// del cliente; si no, se abre wa.me como siempre.
//   - sendViaWhatsApp: el texto lo arma la pantalla (CRM, seguimientos).
//   - sendFromBackend: el endpoint arma y envía el mensaje (OT, ventas, citas…)
//     y la pantalla solo muestra el resultado.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import crmApi from '../api/crm';
import useAuthStore from '../store/authStore';
import { buildWaLink, formatColombianPhone, trackWhatsAppInteraction } from '../utils/whatsapp';

const STATUS_TTL_MS = 60 * 1000;
let cached = { at: 0, promise: null };
// Último estado conocido: permite decidir en el mismo clic (sin await) y que
// el navegador no bloquee la pestaña de wa.me. null = nunca se ha cargado.
let lastKnown = null;

// El status vive bajo requireModule('crm'): sin CRM responde 403 y se trata
// como no operativo (wa.me).
export function loadWhatsAppPitboxStatus() {
  if (!cached.promise || Date.now() - cached.at > STATUS_TTL_MS) {
    cached = {
      at: Date.now(),
      promise: crmApi.getWhatsAppCloudStatus()
        .then((res) => !!res.data?.data?.operational)
        .catch(() => false)
        .then((ok) => { lastKnown = ok; return ok; }),
    };
  }
  return cached.promise;
}

// Estado vigente o null si venció (otra pestaña/tenant pudo cambiarlo).
const known = () => (Date.now() - cached.at > STATUS_TTL_MS ? null : lastKnown);

export function invalidateWhatsAppPitboxStatus() {
  cached = { at: 0, promise: null };
  lastKnown = null;
}

// Otra sesión puede ser otro tenant: su conexión de WhatsApp no es la misma.
useAuthStore.subscribe((state, prev) => {
  if (state.token !== prev.token) invalidateWhatsAppPitboxStatus();
});

function ChatToast({ t, text, actions }) {
  return (
    <span className="flex flex-col gap-1.5">
      <span>{text}</span>
      <span className="flex gap-3">
        {actions.map(({ label, onClick }) => (
          <button key={label} type="button" onClick={() => { toast.dismiss(t.id); onClick(); }}
            className="!p-0 !text-sm font-semibold text-emerald-700 underline whitespace-nowrap">
            {label}
          </button>
        ))}
      </span>
    </span>
  );
}

export default function useWhatsAppPitbox() {
  const navigate = useNavigate();
  const [operational, setOperational] = useState(lastKnown);

  useEffect(() => {
    let alive = true;
    loadWhatsAppPitboxStatus().then((ok) => { if (alive) setOperational(ok); });
    return () => { alive = false; };
  }, []);

  const chatAction = useCallback((phone) => ({
    label: 'Abrir chat',
    onClick: () => navigate(`/crm/whatsapp?phone=${formatColombianPhone(phone)}`),
  }), [navigate]);

  // El clic en el aviso es un gesto del usuario, así que esta pestaña no se bloquea.
  const waMeAction = (waLink) => ({ label: 'Abrir WhatsApp', onClick: () => window.open(waLink, '_blank', 'noreferrer') });

  const notifyWindowClosed = useCallback((phone) => {
    toast((t) => (
      <ChatToast t={t} text="El cliente no te ha escrito en las últimas 24 h. Envía una plantilla desde el chat para retomar."
        actions={[chatAction(phone)]} />
    ), { duration: 8000, icon: '⏰' });
  }, [chatAction]);

  // Envío que el backend devolvió como wa.me sin pestaña abierta. `reason` es
  // el fallback_reason del backend (ver services/whatsappDelivery.js).
  const notifyWaMeFallback = useCallback(({ phone, waLink, reason }) => {
    phone = phone || waLink.match(/wa\.me\/(\d+)/)?.[1];
    const pitboxFailed = reason === 'window_closed' || reason === 'error';
    const text = reason === 'window_closed'
      ? 'El cliente no te ha escrito en las últimas 24 h: envíale una plantilla desde el chat o ábrelo en WhatsApp.'
      : pitboxFailed
        ? 'No salió por WhatsApp Pitbox (falló la conexión con Meta).'
        : 'Mensaje listo para enviar por WhatsApp.';
    toast((t) => (
      <ChatToast t={t} text={text}
        actions={pitboxFailed && phone ? [chatAction(phone), waMeAction(waLink)] : [waMeAction(waLink)]} />
    ), { duration: 10000, icon: pitboxFailed ? '⚠️' : '💬' });
  }, [chatAction]);

  // Resultado de un envío que arma el backend ({ channel, waLink | whatsapp_url,
  // fallback_reason }). `win` es la pestaña abierta en el clic, si la hay.
  const resolveWaResult = useCallback((result, { win = null, sentText = 'Enviado por WhatsApp Pitbox.' } = {}) => {
    const waLink = result?.waLink || result?.whatsapp_url;
    if (result?.channel === 'cloud_api') {
      win?.close();
      if (sentText) toast.success(sentText);
    } else if (waLink && win) {
      win.location.href = waLink;
    } else {
      win?.close();
      if (waLink) notifyWaMeFallback({ waLink, reason: result.fallback_reason });
      else toast.error(result?.error || 'No se pudo generar el enlace de WhatsApp.');
    }
  }, [notifyWaMeFallback]);

  // Clic en un botón cuyo envío arma el backend. La pestaña de wa.me se abre
  // en el mismo clic (si no, el navegador la bloquea) y solo si Pitbox no está
  // activo. `request` devuelve el resultado; errores van a toast salvo que el
  // llamador ya los muestre (toastErrors: false). null = falló.
  const sendFromBackend = useCallback(async (request, {
    sentText,
    errorText = 'No se pudo enviar por WhatsApp',
    toastErrors = true,
  } = {}) => {
    const win = known() === true ? null : window.open('', '_blank');
    loadWhatsAppPitboxStatus();
    try {
      const result = await request();
      resolveWaResult(result, { win, sentText });
      return result;
    } catch (e) {
      win?.close();
      if (toastErrors) toast.error(e.response?.data?.message || errorText);
      return null;
    }
  }, [resolveWaResult]);

  const sendViaWhatsApp = useCallback(async ({ phone, customerId, text = '', hasCrm = true }) => {
    const ok = known() ?? await loadWhatsAppPitboxStatus();
    loadWhatsAppPitboxStatus();
    if (!ok) {
      const link = buildWaLink(phone, text);
      if (!link) {
        toast.error('El cliente no tiene teléfono');
        return { channel: null };
      }
      window.open(link, '_blank', 'noreferrer');
      trackWhatsAppInteraction(customerId, text, hasCrm);
      return { channel: 'wa_me' };
    }

    // Meta exige el número con indicativo; a 10 dígitos sin él se les antepone 57.
    const digits = formatColombianPhone(phone);
    if (!digits) {
      toast.error('El cliente no tiene teléfono');
      return { channel: null };
    }
    if (!String(text).trim()) {
      navigate(`/crm/whatsapp?phone=${digits}`);
      return { channel: 'pitbox', opened: true };
    }
    try {
      const res = await crmApi.sendWhatsAppText({ to: digits, body: text });
      const conversationId = res.data?.data?.conversation_id;
      toast.success((t) => (
        <ChatToast t={t} text="Enviado por WhatsApp Pitbox"
          actions={[{
            label: 'Ver chat',
            onClick: () => navigate(conversationId ? `/crm/whatsapp?c=${conversationId}` : `/crm/whatsapp?phone=${digits}`),
          }]} />
      ), { duration: 6000 });
      return { channel: 'pitbox', conversationId };
    } catch (e) {
      if (e.response?.status === 409) {
        notifyWindowClosed(digits);
        return { channel: 'pitbox', windowClosed: true };
      }
      toast.error(e.response?.data?.message || 'No se pudo enviar por WhatsApp Pitbox');
      return { channel: 'pitbox', error: true };
    }
  }, [navigate, notifyWindowClosed]);

  return { operational, sendViaWhatsApp, sendFromBackend, resolveWaResult, notifyWindowClosed };
}
