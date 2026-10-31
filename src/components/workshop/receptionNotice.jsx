import toast from 'react-hot-toast';

// Resultado del aviso automático de recepción (Configuración → Datos
// personales → "Avisar al cliente al recibir el vehículo"). Si WhatsApp no
// salió por Cloud API, se ofrece el wa.me para enviarlo desde el celular.
// Compartido por el formulario completo de OT y el modal de OT rápida: los
// dos reciben el mismo `reception_notice` del backend
// (workOrders.controller.js#finishWorkOrderCreation).
export function notifyReceptionResult(notice) {
  if (!notice) return;
  const sentBy = [notice.whatsapp?.sent && 'WhatsApp', notice.email?.sent && 'correo'].filter(Boolean);
  if (sentBy.length) toast.success(`Aviso de recepción enviado al cliente por ${sentBy.join(' y ')}`);
  const waUrl = notice.whatsapp?.whatsapp_url;
  if (waUrl) {
    toast((t) => (
      <span className="flex items-center gap-3 text-sm">
        Aviso de recepción listo para WhatsApp
        <button
          type="button"
          className="px-2 py-1 rounded bg-green-600 text-white text-xs font-medium"
          onClick={() => { window.open(waUrl, '_blank'); toast.dismiss(t.id); }}
        >
          Enviar
        </button>
      </span>
    ), { duration: 20000 });
  }
}
