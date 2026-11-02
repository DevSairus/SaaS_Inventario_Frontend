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

// El status vive bajo requireModule('crm'): sin CRM responde 403 y se trata
// como no operativo (wa.me).
export function loadWhatsAppPitboxStatus() {
  if (!cached.promise || Date.now() - cached.at > STATUS_TTL_MS) {
    cached = {
      at: Date.now(),
      promise: crmApi.getWhatsAppCloudStatus()
        .then((res) => !!res.data?.data?.operational)
        .catch(() => false),
    };
  }
  return cached.promise;
}

export function invalidateWhatsAppPitboxStatus() {
  cached = { at: 0, promise: null };
}

function ChatToast({ t, text, actionLabel, onAction }) {
  return (
    <span className="flex items-center gap-3">
      <span>{text}</span>
      <button type="button" onClick={() => { toast.dismiss(t.id); onAction(); }}
        className="!p-0 !text-sm font-semibold text-emerald-700 underline whitespace-nowrap">
        {actionLabel}
      </button>
    </span>
  );
}

export default function useWhatsAppPitbox() {
  const navigate = useNavigate();
  const [operational, setOperational] = useState(null);

  useEffect(() => {
    let alive = true;
    loadWhatsAppPitboxStatus().then((ok) => { if (alive) setOperational(ok); });
    return () => { alive = false; };
  }, []);

  const notifyWindowClosed = useCallback((phone) => {
    const digits = formatColombianPhone(phone);
    toast((t) => (
      <ChatToast t={t} text="El cliente no te ha escrito en las últimas 24 h. Envía una plantilla desde el chat para retomar."
        actionLabel="Abrir chat" onAction={() => navigate(`/crm/whatsapp?phone=${digits}`)} />
    ), { duration: 8000, icon: '⏰' });
  }, [navigate]);

  const sendViaWhatsApp = useCallback(async ({ phone, customerId, text = '', hasCrm = true }) => {
    const ok = await loadWhatsAppPitboxStatus();
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
    const openChat = () => navigate(`/crm/whatsapp?phone=${digits}`);
    if (!String(text).trim()) {
      openChat();
      return { channel: 'pitbox', opened: true };
    }
    try {
      const res = await crmApi.sendWhatsAppText({ to: digits, body: text });
      const conversationId = res.data?.data?.conversation_id;
      toast.success((t) => (
        <ChatToast t={t} text="Enviado por WhatsApp Pitbox" actionLabel="Ver chat"
          onAction={() => navigate(conversationId ? `/crm/whatsapp?c=${conversationId}` : `/crm/whatsapp?phone=${digits}`)} />
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

  return { operational, sendViaWhatsApp, notifyWindowClosed };
}
