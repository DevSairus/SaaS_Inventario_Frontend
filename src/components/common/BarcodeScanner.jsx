import { useState, useEffect, useRef, useCallback } from 'react';
import Quagga from '@ericblade/quagga2';

const BarcodeScanner = ({ onDetect, onClose }) => {
  const scannerRef = useRef(null);
  const detectedRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [error, setError] = useState(null);

  const initQuagga = useCallback(async () => {
    try {
      if (!scannerRef.current) return;

      await Quagga.init({
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: scannerRef.current, // 🔴 CLAVE
          constraints: {
            width: { min: 640 },
            height: { min: 480 },
            facingMode: 'environment'
          }
        },
        decoder: {
          readers: [
            'EAN13Reader',
            'EAN8Reader',
            'UPC_AReader',
            'UPC_EReader',
            'Code128Reader',
            'Code39Reader',
            'ITFReader'
          ]
        },
        locate: true
      });

      Quagga.start();
      setStarted(true);
    } catch (err) {
      console.error('Quagga init error:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }, []);

  useEffect(() => {
    detectedRef.current = false;
    initQuagga();

    const onDetectedHandler = (result) => {
      if (detectedRef.current) return;
      const code = result?.codeResult?.code;
      if (code) {
        detectedRef.current = true;
        onDetect(code);
      }
    };

    Quagga.onDetected(onDetectedHandler);

    return () => {
      Quagga.offDetected(onDetectedHandler);
      Quagga.stop();
      Quagga.CameraAccess.release(); // ✅ AQUÍ sí
    };
  }, [initQuagga, onDetect]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
          <span className="font-semibold">Escanear Código de Barras</span>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Camera */}
        <div className="relative bg-black min-h-[320px]">
          <div ref={scannerRef} className="w-full h-full" />

          {started && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-32 border-2 border-green-400 rounded-lg" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 text-center text-sm text-gray-500">
          Acerca el código a la cámara
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
