import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Button from '../common/Button';

// Confirmación reforzada para el borrado de un tenant: desde la migración a
// schema-per-tenant esta acción es IRREVERSIBLE (dropea el schema dedicado
// del tenant y limpia cualquier fila huérfana en public), así que un simple
// "¿estás seguro?" ya no es suficiente -- hay que escribir el nombre exacto
// de la empresa, mismo patrón que usan GitHub/Vercel para borrados de este tipo.
const DeleteTenantModal = ({ open, tenant, loading, error, onConfirm, onCancel }) => {
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (open) setConfirmText('');
  }, [open, tenant]);

  if (!open || !tenant) return null;

  const expected = tenant.company_name;
  const matches = confirmText.trim().toLowerCase() === expected.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onCancel} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            Eliminar empresa permanentemente
          </h3>

          <p className="text-sm text-gray-600 text-center mb-4">
            Esto borra <strong>todos</strong> los datos de "{expected}" (ventas, inventario,
            órdenes de taller, facturas, usuarios) de forma irreversible. No hay respaldo
            automático ni forma de deshacerlo.
          </p>

          <p className="text-sm text-gray-700 text-center mb-2">
            Escribe <strong>{expected}</strong> para confirmar:
          </p>

          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expected}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            autoFocus
          />

          {error && (
            <p className="text-sm text-red-600 text-center mb-4">{error}</p>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => onConfirm(confirmText)}
              loading={loading}
              disabled={!matches || loading}
              className="flex-1"
            >
              Eliminar permanentemente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteTenantModal;