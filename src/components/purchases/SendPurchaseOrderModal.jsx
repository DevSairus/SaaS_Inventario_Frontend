// frontend/src/components/purchases/SendPurchaseOrderModal.jsx
//
// Envía la orden de compra al proveedor por correo con el PDF adjunto
// (POST /inventory/purchases/:id/send-email). Precarga el correo del
// proveedor y el de su contacto; las respuestas llegan al correo de la
// empresa (replyTo en el backend).
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { purchasesAPI } from '../../api/purchases';

export default function SendPurchaseOrderModal({ purchase, isOpen, onClose, onSent }) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen || !purchase) return;
    const s = purchase.supplier || {};
    setTo([s.email, s.contact_email].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', '));
    setCc('');
    setMessage(`Adjuntamos la orden de compra ${purchase.purchase_number}. Por favor confirmar recibido y fecha de entrega.`);
  }, [isOpen, purchase]);

  if (!isOpen || !purchase) return null;

  const send = async () => {
    if (!to.trim()) { toast('Indica al menos un correo de destino'); return; }
    setSending(true);
    try {
      const res = await purchasesAPI.sendOrderEmail(purchase.id, { to, cc, message });
      toast.success(res.message || 'Orden enviada');
      onSent?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo enviar la orden');
    } finally {
      setSending(false);
    }
  };

  const lastSent = (purchase.order_emails || []).slice(-1)[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-graphite rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Enviar orden {purchase.purchase_number}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {lastSent && (
            <p className="text-xs text-gray-500 bg-gray-50 dark:bg-white/5 rounded p-2">
              Última vez enviada el {new Date(lastSent.date).toLocaleString('es-CO')} a {(lastSent.to || []).join(', ')}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Para</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="correo@proveedor.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2 dark:text-gray-100" />
            <p className="text-[11px] text-gray-400 mt-0.5">Varios correos separados por coma.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Copia (opcional)</label>
            <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="compras@tuempresa.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensaje</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2 dark:text-gray-100" />
          </div>
          <p className="text-xs text-gray-500">
            Se adjunta el PDF de la orden. Las respuestas del proveedor llegarán al correo de tu empresa.
            {purchase.status === 'draft' && ' La orden está en borrador: el PDF saldrá marcado como BORRADOR.'}
          </p>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
          <button onClick={send} disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <PaperAirplaneIcon className="w-4 h-4" /> {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
