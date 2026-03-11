// frontend/src/pages/settings/WhatsAppSettingsPage.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Layout from '../../components/layout/Layout';
import whatsappApi from '../../api/whatsapp';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  DISCONNECTED: { text: 'Desconectado',    color: 'text-red-600',    bg: 'bg-red-50',    dot: 'bg-red-500'    },
  CONNECTING:   { text: 'Conectando...',   color: 'text-yellow-600', bg: 'bg-yellow-50', dot: 'bg-yellow-400' },
  QR_READY:     { text: 'Escanear QR',     color: 'text-blue-600',   bg: 'bg-blue-50',   dot: 'bg-blue-500 animate-pulse' },
  CONNECTED:    { text: 'Conectado ✓',     color: 'text-green-600',  bg: 'bg-green-50',  dot: 'bg-green-500'  },
};

export default function WhatsAppSettingsPage() {
  const [status, setStatus]   = useState('DISCONNECTED');
  const [qr, setQr]           = useState(null);
  const [loading, setLoading] = useState(false);
  const intervalRef           = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await whatsappApi.getStatus();
      setStatus(data.status);
      setQr(data.qr || null);
    } catch {
      // silent
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling: arranca cuando conectando/QR, se detiene cuando conectado o desconectado
  useEffect(() => {
    const needsPolling = status === 'CONNECTING' || status === 'QR_READY';

    if (needsPolling && !intervalRef.current) {
      intervalRef.current = setInterval(fetchStatus, 3000);
    } else if (!needsPolling && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, fetchStatus]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await whatsappApi.connect();
      setStatus('CONNECTING');
      toast.success('Iniciando conexión... Espera el código QR');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al conectar');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await whatsappApi.disconnect();
      setStatus('DISCONNECTED');
      setQr(null);
      toast.success('WhatsApp desconectado');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al desconectar');
    } finally {
      setLoading(false);
    }
  };

  const info = STATUS_LABELS[status] || STATUS_LABELS.DISCONNECTED;

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">WhatsApp</h1>
        <p className="text-sm text-gray-500 mb-8">
          Conecta tu número de WhatsApp para enviar facturas, remisiones y cotizaciones directamente a tus clientes.
        </p>

        {/* Status card */}
        <div className={`rounded-xl border p-5 mb-6 ${info.bg}`}>
          <div className="flex items-center gap-3 mb-1">
            <span className={`w-3 h-3 rounded-full ${info.dot}`} />
            <span className={`font-semibold text-sm ${info.color}`}>{info.text}</span>
          </div>
          {status === 'CONNECTED' && (
            <p className="text-xs text-green-700 mt-1">
              Puedes enviar documentos PDF desde cualquier venta, remisión o cotización.
            </p>
          )}
          {status === 'QR_READY' && (
            <p className="text-xs text-blue-700 mt-1">
              Abre WhatsApp en tu celular → Dispositivos vinculados → Vincular dispositivo → escanea el código.
            </p>
          )}
          {(status === 'DISCONNECTED') && (
            <p className="text-xs text-red-700 mt-1">
              Haz clic en "Conectar" para generar el código QR.
            </p>
          )}
        </div>

        {/* QR Code */}
        {qr && status === 'QR_READY' && (
          <div className="flex flex-col items-center mb-6 p-6 bg-white border-2 border-blue-200 rounded-2xl shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-4">Escanea este código QR con WhatsApp</p>
            <img
              src={qr}
              alt="WhatsApp QR Code"
              className="w-64 h-64 rounded-lg"
            />
            <p className="text-xs text-gray-400 mt-4 text-center">
              El código expira en pocos minutos. Si expira, vuelve a hacer clic en "Conectar".
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {status !== 'CONNECTED' && (
            <button
              onClick={handleConnect}
              disabled={loading || status === 'CONNECTING' || status === 'QR_READY'}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              <WhatsAppIcon className="w-4 h-4" />
              {status === 'CONNECTING' ? 'Conectando...' : status === 'QR_READY' ? 'Esperando escaneo...' : 'Conectar WhatsApp'}
            </button>
          )}

          {status === 'CONNECTED' && (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 font-semibold rounded-lg text-sm transition-colors"
            >
              Desconectar
            </button>
          )}

          <button
            onClick={fetchStatus}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors"
          >
            Actualizar
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-10 p-5 bg-gray-50 rounded-xl border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">¿Cómo funciona?</h2>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Haz clic en <strong>Conectar WhatsApp</strong></li>
            <li>Espera a que aparezca el código QR (puede tomar 10-30 segundos)</li>
            <li>Abre WhatsApp en tu celular → <em>Dispositivos vinculados → Vincular dispositivo</em></li>
            <li>Escanea el código QR con tu celular</li>
            <li>¡Listo! Ahora puedes enviar documentos desde cualquier venta</li>
          </ol>
          <p className="text-xs text-gray-400 mt-3">
            * El número que vincules será el que aparezca como remitente. El cliente recibirá el PDF directamente en su WhatsApp.
          </p>
        </div>
      </div>
    </Layout>
  );
}

function WhatsAppIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}