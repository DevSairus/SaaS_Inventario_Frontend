import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import SignatureField from '../tools/SignatureField';

/**
 * Toma la firma de un rol sobre un acta ya creada (despacho de materiales,
 * lote de herramientas). Al aceptar el lienzo llama a onSign({ name, document, signature });
 * si onSign no falla, se cierra. Una firma ya registrada no se reemplaza.
 */
export default function SignRoleModal({ title, label, action, onSign, onClose }) {
  const [busy, setBusy] = useState(false);
  const submit = async (value) => {
    if (!value || busy) return;
    setBusy(true);
    try {
      await onSign(value);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo registrar la firma');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={title} size="sm">
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Firma de <strong>{label}</strong> ({String(action).toLowerCase()}). Una vez registrada no se puede reemplazar.
        </p>
        <SignatureField label={label} role={action} value={null} onChange={submit} askDocument required />
      </div>
    </Modal>
  );
}
