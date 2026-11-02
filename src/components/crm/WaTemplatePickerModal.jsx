// Elegir y enviar una plantilla aprobada de Meta para retomar (o iniciar) un
// chat cuando la ventana de 24 h está cerrada. {{1}} = nombre, {{2}} = taller.
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import crmApi from '../../api/crm';
import { buildTemplatePayload } from '../../utils/waChat';

export default function WaTemplatePickerModal({ isOpen, onClose, phone, customerName, companyName, onSent }) {
  const [templates, setTemplates] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTemplates(null);
    setChosen(null);
    crmApi.listWaTemplates({ status: 'APPROVED' })
      .then((res) => setTemplates(res.data.data || []))
      .catch(() => setTemplates([]));
  }, [isOpen]);

  const payload = chosen ? buildTemplatePayload({ template: chosen, customerName, companyName }) : null;

  const send = async () => {
    if (!payload?.ok || sending) return;
    setSending(true);
    try {
      const res = await crmApi.sendWhatsAppTemplate({
        to: phone,
        template_name: chosen.name,
        language: chosen.language,
        components: payload.components,
      });
      toast.success('Plantilla enviada. Podrás escribirle libremente cuando responda.');
      onSent?.(res.data.data?.conversation_id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo enviar la plantilla');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !sending && onClose()} title="Enviar plantilla" size="md">
      <div className="space-y-4">
        {templates === null && (
          <div className="flex justify-center py-6 text-gray-400"><Loader2 className="animate-spin" size={20} /></div>
        )}
        {templates?.length === 0 && (
          <p className="text-sm text-gray-500">
            No hay plantillas aprobadas. Sincronízalas en Configuración → Meta y WhatsApp → Plantillas Meta.
          </p>
        )}
        {templates?.length > 0 && (
          <div className="space-y-1.5">
            {templates.map((t) => (
              <label key={`${t.name}-${t.language}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition ${
                  chosen === t ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                <input type="radio" name="wa-template" checked={chosen === t} onChange={() => setChosen(t)} />
                <span className="font-medium text-gray-800 truncate">{t.name}</span>
                <span className="ml-auto text-[11px] text-gray-400">{t.language}</span>
              </label>
            ))}
          </div>
        )}
        {payload && (
          payload.ok ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Así le llega</p>
              <p className="whitespace-pre-wrap text-sm rounded-lg bg-[#d9fdd3] px-3 py-2 text-gray-900">{payload.preview}</p>
            </div>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{payload.reason}</p>
          )
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={sending}>Cancelar</Button>
          <Button onClick={send} disabled={!payload?.ok || sending}>
            {sending ? 'Enviando…' : 'Enviar plantilla'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
