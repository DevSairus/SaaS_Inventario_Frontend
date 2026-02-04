import { useState, useEffect, useRef, useCallback } from 'react';
import Quagga from '@ericblade/quagga2';

const BarcodeScanner = ({ onDetect, onClose }) => {
  const scannerRef = useRef(null);

  const bufferRef = useRef({});
  const frameCountRef = useRef(0);
  const lockedRef = useRef(false);

  const [started, setStarted] = useState(false);

  /* =========================
     INIT QUAGGA
  ========================= */
  const initQuagga = useCallback(async () => {
    try {
      if (!scannerRef.current) return;

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
          area: {
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
        locate: false,
        frequency: 20,
        numOfWorkers: 2
      });

      Quagga.start();
      setStarted(true);
    } catch (err) {
      console.error(err);
    }
  }, []);

  /* =========================
     EFECTO PRINCIPAL
  ========================= */
  useEffect(() => {
    initQuagga();

    const onDetected = (result) => {
      if (lockedRef.current) return;

      const code = result?.codeResult?.code;
      if (!code) return;

      frameCountRef.current++;

      bufferRef.current[code] = (bufferRef.current[code] || 0) + 1;

      // Cada 20 frames evaluamos consenso
      if (frameCountRef.current >= 20) {
        let bestCode = null;
        let bestCount = 0;

        for (const [key, count] of Object.entries(bufferRef.current)) {
          if (count > bestCount) {
            bestCount = count;
            bestCode = key;
          }
        }

        // Umbral de confianza
        if (bestCount >= 5) {
          lockedRef.current = true;
          navigator.vibrate?.(200);
          onDetect(bestCode);
        }

        // Reset buffer
        bufferRef.current = {};
        frameCountRef.current = 0;
      }
    };

    Quagga.onDetected(onDetected);

    return () => {
      Quagga.offDetected(onDetected);
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

        <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
          <span className="font-semibold">📷 Escanear Código</span>
          <button onClick={onClose} className="text-2xl">✕</button>
        </div>

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

        <div className="px-5 py-4 bg-gray-50 text-center text-sm text-gray-600">
          Escanea manteniendo el código fijo
        </div>
      </div>

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
