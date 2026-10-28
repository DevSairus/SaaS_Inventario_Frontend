// frontend/src/components/consents/ConsentRequestModal.jsx
// Solicitar una autorización al cliente (habeas data o acta de ingreso):
//   - Enlace: enviarlo por WhatsApp/correo o mostrar el QR para que el
//     cliente lo abra en su celular (ConsentPublicPage).
//   - Mostrador: el código llega al correo/WhatsApp del cliente, él se lo
//     dicta al asesor y el asesor lo digita aquí.
//   - Firma física: registrar que el cliente firmó el formato en papel
//     (solo administración).
// Al abrirse crea la solicitud o reutiliza la pendiente (backend:
// consent.service.js#createConsentRequest).
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Mail, MessageCircle, QrCode, KeyRound, PenLine, ExternalLink } from 'lucide-react';
import Modal from '../common/Modal';
import { consentsAPI } from '../../api/consents';
import useAuthStore from '../../store/authStore';

const CHANNEL_LABELS = { email: 'Correo', whatsapp: 'WhatsApp' };

const TABS = [
  { id: 'link', label: 'Enviar enlace', Icon: MessageCircle },
  { id: 'counter', label: 'En mostrador', Icon: KeyRound },
  { id: 'physical', label: 'Firma física', Icon: PenLine },
];

export default function ConsentRequestModal({
  isOpen, onClose, kind, customerId = null, workOrderId = null,
  otpChannels = [], offerHabeas = false, onChanged,
}) {
  const { user } = useAuthStore();
  const canPhysical = ['admin', 'manager', 'super_admin'].includes(user?.role);
  const [consent, setConsent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('link');
  const [busy, setBusy] = useState(false);

  const [otp, setOtp] = useState(null);
  const [code, setCode] = useState('');
  const [marketing, setMarketing] = useState(null);
  const [acceptHabeas, setAcceptHabeas] = useState(false);
  const [physical, setPhysical] = useState({ signer_name: '', signer_document: '', notes: '', file: null });

  const isHabeas = kind === 'habeas_data';
  const needsMarketing = isHabeas || (offerHabeas && acceptHabeas);

  useEffect(() => {
    if (!isOpen) return;
    setConsent(null);
    setOtp(null);
    setCode('');
    setMarketing(null);
    setAcceptHabeas(false);
    setTab('link');
    setLoading(true);
    consentsAPI.create({ kind, customer_id: customerId, work_order_id: workOrderId })
      .then((c) => {
        setConsent(c);
        if (c.otp_expires_at && new Date(c.otp_expires_at) > new Date()) setOtp({ channel: c.otp_channel });
      })
      .catch((e) => {
        toast.error(e?.response?.data?.message || 'No se pudo crear la solicitud');
        onClose();
      })
      .finally(() => setLoading(false));
  }, [isOpen, kind, customerId, workOrderId]);

  const finish = (msg) => {
    toast.success(msg);
    onChanged?.();
    onClose();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(consent.public_url);
      toast.success('Enlace copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const sendLink = async (channel) => {
    setBusy(true);
    try {
      const r = await consentsAPI.sendLink(consent.id, [channel]);
      if (channel === 'whatsapp') {
        if (r.whatsapp?.sent) toast.success('Enlace enviado por WhatsApp');
        else if (r.whatsapp?.whatsapp_url) window.open(r.whatsapp.whatsapp_url, '_blank');
        else toast.error(r.whatsapp?.error || 'No se pudo enviar por WhatsApp');
      } else if (r.email?.sent) {
        toast.success('Enlace enviado por correo');
      } else {
        toast.error(r.email?.error || 'No se pudo enviar el correo');
      }
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo enviar el enlace');
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async (channel) => {
    setBusy(true);
    try {
      const r = await consentsAPI.sendOtp(consent.id, channel);
      setOtp(r);
      setCode('');
      toast.success(`Código enviado por ${CHANNEL_LABELS[channel]} ${r.destination || ''}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo enviar el código');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const r = await consentsAPI.verify(consent.id, {
        code,
        marketing_opt_in: marketing === true,
        accept_habeas: offerHabeas && acceptHabeas,
      });
      finish(r.habeas_accepted ? 'Acta y tratamiento de datos autorizados' : 'Autorización registrada');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Código incorrecto');
    } finally {
      setBusy(false);
    }
  };

  const registerPhysical = async () => {
    setBusy(true);
    try {
      await consentsAPI.registerPhysical(consent.id, { ...physical, marketing_opt_in: marketing === true });
      finish('Autorización física registrada');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo registrar');
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async () => {
    if (!window.confirm('¿Anular esta solicitud? El enlace enviado dejará de funcionar.')) return;
    setBusy(true);
    try {
      await consentsAPI.cancel(consent.id);
      finish('Solicitud anulada');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo anular');
    } finally {
      setBusy(false);
    }
  };

  const marketingBlock = needsMarketing && (
    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">¿El cliente autoriza recibir publicidad?</p>
      <div className="flex gap-4">
        {[{ v: true, l: 'Sí autoriza' }, { v: false, l: 'No autoriza' }].map((o) => (
          <label key={String(o.v)} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="radio" checked={marketing === o.v} onChange={() => setMarketing(o.v)} />
            {o.l}
          </label>
        ))}
      </div>
    </div>
  );

  const habeasBlock = offerHabeas && (
    <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
      <input type="checkbox" className="mt-0.5" checked={acceptHabeas} onChange={(e) => setAcceptHabeas(e.target.checked)} />
      El cliente también autoriza el tratamiento de sus datos personales (habeas data pendiente)
    </label>
  );

  const title = isHabeas ? 'Autorización de tratamiento de datos' : 'Autorización de ingreso del vehículo';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      {loading || !consent ? (
        <p className="text-sm text-gray-500">Preparando la solicitud…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-gray-200 dark:border-white/10">
            {TABS.filter((t) => t.id !== 'physical' || canPhysical).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                  tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <t.Icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'link' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                El cliente abre el enlace en su celular, lee el documento y lo confirma con un código que le llega a su
                {otpChannels.length ? ` ${otpChannels.map((c) => (c.channel === 'email' ? 'correo' : 'WhatsApp')).join(' o ')}` : ' correo o WhatsApp'}.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {consent.qr_data_url && (
                  <div className="text-center shrink-0">
                    <img src={consent.qr_data_url} alt="QR de la autorización" className="w-40 h-40 border border-gray-200 rounded-lg" />
                    <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1"><QrCode size={12} /> Muéstralo al cliente</p>
                  </div>
                )}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex gap-2">
                    <input readOnly value={consent.public_url} className="flex-1 min-w-0 text-xs border border-gray-300 dark:border-white/10 rounded-lg px-2 py-2 bg-gray-50 dark:bg-white/5" />
                    <button type="button" onClick={copyLink} className="px-2 border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50" title="Copiar enlace">
                      <Copy size={14} />
                    </button>
                    <a href={consent.public_url} target="_blank" rel="noopener noreferrer" className="px-2 border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 flex items-center" title="Abrir">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => sendLink('whatsapp')}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                      <MessageCircle size={14} /> WhatsApp
                    </button>
                    <button type="button" disabled={busy} onClick={() => sendLink('email')}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/10 hover:bg-gray-50 disabled:opacity-50">
                      <Mail size={14} /> Correo
                    </button>
                  </div>
                  {otpChannels.length === 0 && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                      El cliente no tiene correo ni WhatsApp disponible para recibir el código. Registra su correo, o usa la firma física.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'counter' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Muestra o lee el documento al cliente. El código le llega a él: pídele que te lo dicte.
              </p>
              {habeasBlock}
              {marketingBlock}
              {otpChannels.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">Sin correo ni WhatsApp disponible para enviar el código.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {otpChannels.map((c) => (
                    <button key={c.channel} type="button" disabled={busy} onClick={() => sendOtp(c.channel)}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/10 hover:bg-gray-50 disabled:opacity-50">
                      {otp ? 'Reenviar' : 'Enviar código'} por {CHANNEL_LABELS[c.channel]} <span className="text-gray-400">{c.destination}</span>
                    </button>
                  ))}
                </div>
              )}
              {otp && (
                <div className="flex gap-2">
                  <input inputMode="numeric" maxLength={6} value={code} placeholder="000000"
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="w-36 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-lg tracking-[0.3em] font-mono" />
                  <button type="button" onClick={verify}
                    disabled={busy || code.length !== 6 || (needsMarketing && marketing === null)}
                    className="flex-1 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                    Verificar y registrar
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'physical' && canPhysical && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Para clientes que firmaron el formato en papel. Adjunta el escaneo: queda privado y es la prueba de la autorización.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={physical.signer_name} onChange={(e) => setPhysical((p) => ({ ...p, signer_name: e.target.value }))}
                  placeholder="Nombre de quien firmó *" className="border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm" />
                <input value={physical.signer_document} onChange={(e) => setPhysical((p) => ({ ...p, signer_document: e.target.value }))}
                  placeholder="Documento" className="border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm" />
              </div>
              <label className="block text-sm text-gray-700 dark:text-gray-300">
                <span className="block mb-1">Escaneo o foto del documento firmado (JPG, PNG o PDF, máx. 10 MB)</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setPhysical((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700" />
              </label>
              <textarea value={physical.notes} onChange={(e) => setPhysical((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notas (dónde se archiva el documento firmado, etc.)" rows={2}
                className="w-full border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm" />
              {marketingBlock}
              <button type="button" onClick={registerPhysical}
                disabled={busy || !physical.signer_name.trim() || (isHabeas && marketing === null)}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                Registrar autorización firmada
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10 text-xs text-gray-400">
            <span>
              Documento v{consent.document_version?.version}
              {consent.expires_at ? ` · enlace vence ${new Date(consent.expires_at).toLocaleDateString('es-CO')}` : ''}
            </span>
            <button type="button" onClick={cancelRequest} disabled={busy} className="text-red-500 hover:underline">
              Anular solicitud
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
