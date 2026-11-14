// frontend/src/components/dian/InvoiceEmailRecipients.jsx
/**
 * Envío del PDF+XML de una factura aceptada a varios correos.
 *  - Principal: el correo del comprador en la factura.
 *  - Adicionales: por defecto los del cliente; aquí se pueden reemplazar solo
 *    para esta factura (sale.additional_emails_override).
 * Muestra el resultado del último envío por destinatario (sale.email_delivery).
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { sendInvoiceEmail } from '../../api/dian';

const STATUS_VIEW = {
  sent: { Icon: CheckCircle2, className: 'text-green-600', label: 'Enviado' },
  failed: { Icon: XCircle, className: 'text-red-600', label: 'Falló' },
  skipped: { Icon: MinusCircle, className: 'text-amber-600', label: 'No enviado' },
};

export default function InvoiceEmailRecipients({ sale, onUpdate }) {
  const hasOverride = Array.isArray(sale.additional_emails_override);
  const [text, setText] = useState(hasOverride ? sale.additional_emails_override.join(', ') : '');
  const [edited, setEdited] = useState(false);
  const [loading, setLoading] = useState(false);

  const delivery = sale.email_delivery;

  const submit = async (payload) => {
    setLoading(true);
    try {
      const res = await sendInvoiceEmail(sale.id, payload);
      toast.success(res?.data?.message || 'Documento enviado por correo');
      setEdited(false);
      onUpdate?.();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al enviar el documento por correo');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => submit(edited ? { additional_emails: text } : {});
  const handleResetToCustomer = () => {
    setText('');
    submit({ use_customer_list: true });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <Mail className="w-4 h-4" /> Envío por correo al comprador
      </div>

      <div className="text-xs text-gray-600">
        Correo principal: <span className="font-medium text-gray-800">{sale.customer_email || 'sin correo registrado'}</span>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Correos adicionales de esta factura
        </label>
        <input
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); setEdited(true); }}
          placeholder={hasOverride ? 'Solo el correo principal' : 'Vacío: se usan los adicionales del cliente'}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">Separados por coma. Máximo 10. Cada destinatario recibe su propio correo.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={handleSend}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          <Mail className="w-3.5 h-3.5" />
          {delivery ? 'Reenviar por correo' : 'Enviar por correo'}
        </button>
        {hasOverride && (
          <button
            type="button"
            disabled={loading}
            onClick={handleResetToCustomer}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Volver a la lista del cliente y enviar
          </button>
        )}
      </div>

      {delivery?.recipients?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">
            Último envío: {delivery.sent_at ? new Date(delivery.sent_at).toLocaleString('es-CO') : ''}
          </p>
          <ul className="space-y-0.5">
            {delivery.recipients.map((r) => {
              const view = STATUS_VIEW[r.status] || STATUS_VIEW.skipped;
              const { Icon } = view;
              return (
                <li key={r.email} className="flex items-start gap-1.5 text-xs">
                  <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${view.className}`} />
                  <span className="text-gray-800 break-all">{r.email}</span>
                  <span className={view.className}>{view.label}{r.error ? ` — ${r.error}` : ''}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
