// frontend/src/components/consents/HabeasDataPanel.jsx
// Estado de la autorización de tratamiento de datos (habeas data) de un
// cliente, con las acciones: solicitar, descargar constancia, retirar la
// autorización de publicidad y revocar (a pedido del titular).
// No se muestra si el tenant no tiene habeas data activo y el cliente nunca
// tuvo una solicitud.
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, FileDown } from 'lucide-react';
import { consentsAPI } from '../../api/consents';
import useAuthStore from '../../store/authStore';
import ConsentRequestModal from './ConsentRequestModal';

export const HABEAS_STATUS = {
  accepted: { label: 'Autorizado',   cls: 'bg-green-100 text-green-700' },
  pending:  { label: 'Pendiente',    cls: 'bg-amber-100 text-amber-700' },
  rejected: { label: 'No autorizó',  cls: 'bg-red-100 text-red-700' },
  revoked:  { label: 'Revocado',     cls: 'bg-red-100 text-red-700' },
  none:     { label: 'Sin solicitar', cls: 'bg-gray-100 text-gray-600' },
};

export function HabeasStatusBadge({ status, className = '' }) {
  const s = HABEAS_STATUS[status || 'none'] || HABEAS_STATUS.none;
  return <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${s.cls} ${className}`}>Datos: {s.label}</span>;
}

export default function HabeasDataPanel({ customerId }) {
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'manager', 'super_admin'].includes(user?.role);
  const [data, setData] = useState(null);
  const [showRequest, setShowRequest] = useState(false);

  const load = useCallback(() => {
    consentsAPI.forCustomer(customerId).then(setData).catch(() => setData(null));
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  if (!data || (!data.enabled && !data.habeas_data_status)) return null;

  const latestAccepted = data.consents.find((c) => c.status === 'accepted');

  const openPdf = async (id) => {
    try {
      const blob = await consentsAPI.pdfBlob(id);
      window.open(URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })), '_blank');
    } catch {
      toast.error('No se pudo generar la constancia');
    }
  };

  const optOut = async () => {
    const reason = window.prompt('El cliente ya no recibirá publicidad. Motivo (opcional):', 'Solicitud del titular');
    if (reason === null) return;
    try {
      await consentsAPI.marketingOptOut(customerId, reason);
      toast.success('Autorización de publicidad retirada');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo actualizar');
    }
  };

  const revoke = async () => {
    const reason = window.prompt('Revocar la autorización de tratamiento de datos. Motivo (obligatorio):');
    if (!reason?.trim()) return;
    try {
      await consentsAPI.revoke(latestAccepted.id, reason);
      toast.success('Autorización revocada');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo revocar');
    }
  };

  const status = data.habeas_data_status || 'none';

  return (
    <div className="pt-2 border-t border-gray-100 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 flex items-center gap-1"><ShieldCheck size={12} /> Tratamiento de datos</p>
        <HabeasStatusBadge status={status} />
      </div>
      {status === 'accepted' && (
        <p className="text-xs text-gray-500">
          {data.habeas_data_at ? `Desde ${new Date(data.habeas_data_at).toLocaleDateString('es-CO')} · ` : ''}
          Publicidad: <strong className={data.marketing_opt_in ? 'text-green-700' : 'text-gray-600'}>{data.marketing_opt_in ? 'Sí' : 'No'}</strong>
        </p>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {data.enabled && status !== 'accepted' && (
          <button type="button" onClick={() => setShowRequest(true)} className="font-medium text-blue-600 hover:underline">
            {status === 'pending' ? 'Ver solicitud / reenviar' : 'Solicitar autorización'}
          </button>
        )}
        {latestAccepted && (
          <button type="button" onClick={() => openPdf(latestAccepted.id)} className="font-medium text-gray-600 hover:underline flex items-center gap-1">
            <FileDown size={12} /> Constancia
          </button>
        )}
        {latestAccepted?.physical_document && (
          <button type="button" onClick={() => consentsAPI.openPhysicalDocument(latestAccepted.id).catch(() => toast.error('No se pudo abrir el documento'))}
            className="font-medium text-gray-600 hover:underline">
            Documento firmado
          </button>
        )}
        {data.marketing_opt_in && (
          <button type="button" onClick={optOut} className="text-gray-500 hover:underline">Retirar publicidad</button>
        )}
        {isAdmin && latestAccepted && (
          <button type="button" onClick={revoke} className="text-red-500 hover:underline">Revocar</button>
        )}
        {data.enabled && status === 'accepted' && (
          <button type="button" onClick={() => setShowRequest(true)} className="text-gray-500 hover:underline"
            title="Pedir de nuevo (p. ej. si cambió el documento)">
            Volver a solicitar
          </button>
        )}
      </div>

      <ConsentRequestModal
        isOpen={showRequest}
        onClose={() => setShowRequest(false)}
        kind="habeas_data"
        customerId={customerId}
        otpChannels={data.otp_channels}
        onChanged={load}
      />
    </div>
  );
}
