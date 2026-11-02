import { useCallback } from 'react';
import toast from 'react-hot-toast';
import useWhatsAppPitbox from '../../hooks/useWhatsAppPitbox';

// Resultado del aviso automático de recepción (Configuración → Datos
// personales → "Avisar al cliente al recibir el vehículo"). Compartido por el
// formulario completo de OT y el modal de OT rápida: los dos reciben el mismo
// `reception_notice` del backend (workOrders.controller.js#finishWorkOrderCreation).
export default function useReceptionNotice() {
  const { resolveWaResult } = useWhatsAppPitbox();

  return useCallback((notice) => {
    if (!notice) return;
    const sentBy = [notice.whatsapp?.sent && 'WhatsApp', notice.email?.sent && 'correo'].filter(Boolean);
    if (sentBy.length) toast.success(`Aviso de recepción enviado al cliente por ${sentBy.join(' y ')}`);
    if (notice.whatsapp && !notice.whatsapp.sent) resolveWaResult(notice.whatsapp);
  }, [resolveWaResult]);
}
