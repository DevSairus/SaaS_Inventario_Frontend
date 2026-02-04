import { useState, useEffect, useRef, useCallback } from 'react';
import Quagga from '@ericblade/quagga2';

const BarcodeScanner = ({ onDetect, onClose }) => {
  const scannerRef = useRef(null);
  const detectedRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('checking');

  /* =========================
     PERMISOS DE CÁMARA
  ========================= */
  const checkCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      return true;
    } catch (err) {
      console.error('Camera permission error:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('❌ Permiso de cámara denegado.');
        setPermissionStatus('denied');
      } else if (err.name === 'NotFoundError') {
        setError('📷 No se encontró cámara en el dispositivo.');
        setPermissionStatus('no-camera');
      } else {
        setError('❌ Error al acceder a la cámara.');
        setPermissionStatus('error');
      }
      return false;
    }
  }, []);

  /* =========================
     INIT QUAGGA
  ========================= */
  const initQuagga = useCallback(async () => {
    try {
      if (!scannerRef.current) return;

      // Limpieza defensiva
      try {
        Quagga.stop();
        Quagga.offDetected();
        if (Quagga.CameraAccess) {
          Quagga.CameraAccess.release();
        }
      } catch (_) {}

      await Quagga.init({
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: scannerRef.current,
          constraints: {
            facingMode: 'environment'
          }
        },
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'upc_reader',
            'upc_e_reader',
            'code_128_reader',
            'code_39_reader',
            'code_93_reader',
            'codabar_reader',
            'i2of5_reader'
          ]
        },
        locate: true,
        locator: {
          patchSize: 'medium',
          halfSample: true
        },
        numOfWorkers: navigator.hardwareConcurrency || 4,
        frequency: 10
      });

      Quagga.start();
      setStarted(true);
      setError(null);
    } catch (err) {
      console.error('Quagga init error:', err);
      setError('No se pudo iniciar el escáner.');
    }
  }, []);

  /* =========================
     EFECTO PRINCIPAL
  ========================= */
  useEffect(() => {
    detectedRef.current = false;

    checkCameraPermission().then((ok) => {
      if (ok) initQuagga();
    });

    const onDetectedHandler = (result) => {
      if (detectedRef.current) return;

      const code = result?.codeResult?.code;
      if (code) {
        detectedRef.current = true;
        navigator.vibrate?.(200);
        onDetect(code);
      }
    };

    Quagga.onDetected(onDetectedHandler);

    return () => {
      Quagga.offDetected(onDetectedHandler);
      try {
        Quagga.stop();
        if (Quagga.CameraAccess) {
          Quagga.CameraAccess.release();
        }
      } catch (_) {}
    };
  }, [checkCameraPermission, initQuagga, onDetect]);

  /* =========================
     REINTENTAR PERMISO
  ========================= */
  const handleRequestPermission = async () => {
    setError(null);
    setPermissionStatus('checking');
    const ok = await checkCameraPermission();
    if (ok) initQuagga();
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
          <span className="font-semibold">📷 Escanear Código de Barras</span>
          <button
            onClick={onClose}
            className="text-2xl hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Camera */}
        <div className="relative bg-black h-[360px] sm:h-[420px] overflow-hidden">
          <div
            id="interactive"
            ref={scannerRef}
            className="w-full h-full"
          />

          {started && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-36 border-4 border-green-400 rounded-xl shadow-lg" />
            </div>
          )}

          {permissionStatus === 'checking' && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-3" />
              <p>Verificando cámara...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 text-white p-6 text-center">
              <p className="mb-4">{error}</p>

              {permissionStatus === 'denied' && (
                <button
                  onClick={handleRequestPermission}
                  className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Solicitar permiso
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 text-center text-sm text-gray-600">
          {started
            ? '✅ Escáner activo – acerca el código'
            : 'Esperando cámara…'}
        </div>
      </div>

      {/* CSS crítico para Quagga */}
      <style>
        {`
          #interactive video,
          #interactive canvas {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover;
          }
        `}
      </style>
    </div>
  );
};

export default BarcodeScanner;
