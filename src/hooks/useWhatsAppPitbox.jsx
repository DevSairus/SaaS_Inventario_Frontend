// hooks/useWhatsAppPitbox.jsx
// Un solo criterio para todos los botones de WhatsApp: con WhatsApp Pitbox
// operativo (Cloud API o demo) el mensaje sale por Pitbox y queda en el chat
// del cliente; si no, se abre wa.me como siempre.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import crmApi from '../api/crm';
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

export function invalidateWhatsAppPitboxStatus() {
  cached = { at: 0, promise: null };
  lastKnown = null;
}

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

  // Envíos del backend (cotizaciones, OT, portal) que devolvieron wa.me: con
  // Pitbox activo pasa por ventana cerrada o un error con Meta; sin Pitbox,
  // porque el navegador bloqueó la pestaña.
  const notifyWaMeFallback = useCallback(({ phone, waLink }) => {
    phone = phone || waLink.match(/wa\.me\/(\d+)/)?.[1];
    const pitbox = lastKnown === true;
    toast((t) => (
      <ChatToast t={t}
        text={pitbox
          ? 'No salió por WhatsApp Pitbox (el cliente no ha escrito en 24 h o falló la conexión con Meta).'
          : 'El navegador bloqueó la pestaña de WhatsApp.'}
        actions={pitbox && phone ? [chatAction(phone), waMeAction(waLink)] : [waMeAction(waLink)]} />
    ), { duration: 10000, icon: '⚠️' });
  }, [chatAction]);

  const sendViaWhatsApp = useCallback(async ({ phone, customerId, text = '', hasCrm = true }) => {
    const ok = lastKnown ?? await loadWhatsAppPitboxStatus();
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

  return { operational, sendViaWhatsApp, notifyWindowClosed, notifyWaMeFallback };
}
