import { useState } from 'react';
import { Monitor, Shield, Smartphone } from 'lucide-react';
import { respondRemoteSession } from '../../api/support';
import toast from 'react-hot-toast';

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 1024);

export default function RemoteConsentModal({ session, onRespond }) {
  const [responding, setResponding] = useState(false);

  const handleResponse = async (consent) => {
    setResponding(true);
    try {
      await respondRemoteSession(session.id, consent);
      toast.success(consent ? 'Acceso autorizado' : 'Acceso rechazado');
      onRespond?.(consent);
    } catch {
      toast.error('Error al procesar tu respuesta');
    }
    setResponding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-7 h-7 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Solicitud de Acceso Remoto</h3>
          <p className="text-sm text-gray-500 mt-2">
            <span className="font-medium text-gray-700">
              {session.agent?.first_name} {session.agent?.last_name}
            </span>{' '}
            del equipo de soporte {session.mode === 'remote_control' ? 'quiere controlar tu pantalla' : 'quiere ver tu pantalla'} para ayudarte.
          </p>
        </div>

        <div className="px-6 pb-2">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {session.mode === 'remote_control' ? (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-yellow-500" />
                  <span>Podrá <strong>hacer clic y escribir</strong> en tu pantalla</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Puedes <strong>detener</strong> el acceso en cualquier momento</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Solo podrá <strong>ver</strong> tu pantalla, no controlarla</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Puedes <strong>detener</strong> el acceso en cualquier momento</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Ticket: <strong>{session.ticket?.subject}</strong></span>
            </div>
          </div>
        </div>

        {isMobile && (
          <div className="mx-6 mb-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-yellow-600 shrink-0" />
            <p className="text-xs text-yellow-700">La compartición de pantalla puede no funcionar bien en dispositivos móviles. Se recomienda usar un navegador de escritorio.</p>
          </div>
        )}

        <div className="px-6 py-4 flex gap-3">
          <button
            onClick={() => handleResponse(false)}
            disabled={responding}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
          >
            Rechazar
          </button>
          <button
            onClick={() => handleResponse(true)}
            disabled={responding}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {responding ? 'Procesando...' : 'Compartir pantalla'}
          </button>
        </div>
      </div>
    </div>
  );
}
