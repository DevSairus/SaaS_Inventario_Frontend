import { useState, useEffect, useRef, useCallback } from 'react';
import Quagga from '@ericblade/quagga2';

const BarcodeScanner = ({ onDetect, onClose }) => {
  const scannerRef = useRef(null);
  const detectedRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [error, setError] = useState(null);

  /* =========================
     INIT QUAGGA (CONFIG ESTABLE)
  ========================= */
  const initQuagga = useCallback(async () => {
    try {
      if (!scannerRef.current) return;

      // Limpieza defensiva
      try {
        Quagga.stop();
        Quagga.offDetected();
        Quagga.CameraAccess?.release();
      } catch (_) {}

      await Quagga.init({
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: scannerRef.current,
          constraints: {
            facingMode: 'environment'
          },
          area: { // ROI central (CRÍTICO)
            top: '30%',
            right: '10%',
            left: '10%',
            bottom: '30%'
          }
        },
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'upc_reader',
            'upc_e_reader',
            'code_128_reader'
          ]
        },
        locate: false,              // 🔴 CLAVE
        numOfWorkers: 2,
        frequency: 20               // 🔴 CLAVE
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

    initQuagga();

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
        Quagga.CameraAccess?.release();
      } catch (_) {}
    };
  }, [initQuagga, onDetect]);

  /* =========================
     UI
  ========================= */
  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
          <span className="font-semibold">📷 Escanear Código</span>
          <button onClick={onClose} className="text-2xl">✕</button>
        </div>

        {/* Camera */}
        <div className="relative bg-black h-[360px] overflow-hidden">
          <div
            id="interactive"
            ref={scannerRef}
            className="w-full h-full"
          />

          {started && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-36 border-4 border-green-400 rounded-xl" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 text-center text-sm text-gray-600">
          {started ? 'Acerca el código al recuadro' : 'Iniciando cámara…'}
        </div>
      </div>

      {/* CSS crítico */}
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
