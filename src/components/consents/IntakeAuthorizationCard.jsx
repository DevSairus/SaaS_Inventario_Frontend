// frontend/src/components/consents/IntakeAuthorizationCard.jsx
// Tarjeta "Autorización de ingreso" en el detalle de la OT: estado del acta
// de ingreso (inventario + condiciones del servicio) que el cliente acepta
// con OTP, y acciones para solicitarla, descargar la constancia o anularla.
// `info` viene de GET /consents/work-order/:id (ver WorkOrderDetailPage).
import { useState } from 'react';
import toast from 'react-hot-toast';
import { FileSignature, FileDown } from 'lucide-react';
import { consentsAPI } from '../../api/consents';
import useAuthStore from '../../store/authStore';
import ConsentRequestModal from './ConsentRequestModal';
import { HabeasStatusBadge } from './HabeasDataPanel';

const STATUS = {
  accepted:  { label: 'Aceptada por el cliente', cls: 'bg-green-100 text-green-700' },
  pending:   { label: 'Pendiente',               cls: 'bg-amber-100 text-amber-700' },
  rejected:  { label: 'Rechazada',               cls: 'bg-red-100 text-red-700' },
  revoked:   { label: 'Anulada',                 cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Anulada',                 cls: 'bg-gray-100 text-gray-600' },
  expired:   { label: 'Vencida',                 cls: 'bg-gray-100 text-gray-600' },
  none:      { label: 'Sin solicitar',           cls: 'bg-gray-100 text-gray-600' },
};

const VIA = { public_link: 'enlace del cliente', counter: 'mostrador', physical: 'firma física' };

export default function IntakeAuthorizationCard({ workOrderId, info, onChanged }) {
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'manager', 'super_admin'].includes(user?.role);
  const [showRequest, setShowRequest] = useState(false);

  if (!info || (!info.enabled && info.consents.length === 0)) return null;
  if (!info.customer) return null;

  const current = info.consents[0] || null;
  const accepted = info.consents.find((c) => c.status === 'accepted');
  const status = accepted ? 'accepted' : current?.status || 'none';
  const s = STATUS[status] || STATUS.none;
  const offerHabeas = info.habeas_enabled && info.customer.habeas_data_status !== 'accepted';

  const openPdf = async (id) => {
    try {
      const blob = await consentsAPI.pdfBlob(id);
      window.open(URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })), '_blank');
    } catch {
      toast.error('No se pudo generar la constancia');
    }
  };

  const revoke = async () => {
    const reason = window.prompt('Anular el acta aceptada (podrás corregir el inventario y pedirla de nuevo). Motivo:');
    if (!reason?.trim()) return;
    try {
      await consentsAPI.revoke(accepted.id, reason);
      toast.success('Acta anulada');
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo anular');
    }
  };

  return (
    <div className="bg-white dark:bg-graphite border border-gray-100 dark:border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileSignature size={15} className="text-emerald-600" />
          <h2 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Autorización de ingreso</h2>
        </div>
        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${s.cls}`}>{s.label}</span>
      </div>

      {accepted ? (
        <p className="text-xs text-gray-500">
          {new Date(accepted.accepted_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
          {' · '}por {VIA[accepted.accepted_via] || accepted.accepted_via}
          {accepted.signer_name ? ` · ${accepted.signer_name}` : ''}
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          El cliente revisa el inventario de ingreso y las condiciones del servicio, y las acepta con un código.
        </p>
      )}

      {info.habeas_enabled && (
        <div className="mt-2"><HabeasStatusBadge status={info.customer.habeas_data_status} /></div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {!accepted && info.enabled && (
          <button type="button" onClick={() => setShowRequest(true)}
            className="flex-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg py-1.5 px-2">
            {status === 'pending' ? 'Ver / reenviar solicitud' : 'Solicitar autorización'}
          </button>
        )}
        {accepted && (
          <button type="button" onClick={() => openPdf(accepted.id)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50">
            <FileDown size={12} /> Constancia
          </button>
        )}
        {accepted?.physical_document && (
          <button type="button" onClick={() => consentsAPI.openPhysicalDocument(accepted.id).catch(() => toast.error('No se pudo abrir el documento'))}
            className="flex-1 text-xs text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50">
            Documento firmado
          </button>
        )}
        {accepted && isAdmin && (
          <button type="button" onClick={revoke} className="text-xs text-red-500 hover:underline px-2">Anular</button>
        )}
      </div>

      <ConsentRequestModal
        isOpen={showRequest}
        onClose={() => setShowRequest(false)}
        kind="vehicle_intake"
        workOrderId={workOrderId}
        otpChannels={info.otp_channels}
        offerHabeas={offerHabeas}
        onChanged={onChanged}
      />
    </div>
  );
}
