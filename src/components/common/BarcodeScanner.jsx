import { useEffect, useRef, useState, useCallback } from 'react';
import Quagga from '@ericblade/quagga2';

const BarcodeScanner = ({ onDetect, onClose }) => {
  const scannerRef = useRef(null);
  const videoRef = useRef(null);

  // Control general
  const lockedRef = useRef(false);

  // Quagga stabilization
  const bufferRef = useRef({});
  const frameCountRef = useRef(0);

  // HID (USB scanner)
  const hidBufferRef = useRef('');
  const hidLastTimeRef = useRef(0);

  const [mode, setMode] = useState(null); // native | quagga
  const [started, setStarted] = useState(false);

  /* =====================================================
     🔫 USB HID SCANNER (KEYBOARD)
  ===================================================== */
  useEffect(() => {
    const onKeyDown = (e) => {
      if (lockedRef.current) return;

      const now = Date.now();

      // Reset si es escritura humana
      if (now - hidLastTimeRef.current > 100) {
        hidBufferRef.current = '';
      }

      hidLastTimeRef.current = now;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (hidBufferRef.current.length >= 4) {
          lockedRef.current = true;
          navigator.vibrate?.(100);
          onDetect(hidBufferRef.current);
        }
        hidBufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        hidBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDetect]);

  /* =====================================================
     📷 BARCODE DETECTOR API (NATIVO)
  ===================================================== */
  const startNativeScanner = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const detector = new window.BarcodeDetector({
        formats: [
          'ean_13',
          'ean_8',
          'upc_a',
          'upc_e',
          'code_128',
          'code_39'
        ]
      });

      setMode('native');
      setStarted(true);

      const scan = async () => {
        if (lockedRef.current) return;

        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            lockedRef.current = true;
            navigator.vibrate?.(200);
            onDetect(barcodes[0].rawValue);
            return;
          }
        } catch (_) {}

        requestAnimationFrame(scan);
      };

      scan();
    } catch (err) {
      console.warn('BarcodeDetector no disponible, usando Quagga', err);
      startQuagga();
    }
  }, [onDetect]);

  /* =====================================================
     📦 QUAGGA (FALLBACK)
  ===================================================== */
  const startQuagga = useCallback(async () => {
    try {
      Quagga.stop();
      Quagga.offDetected();
      Quagga.CameraAccess?.release();
    } catch (_) {}

    await Quagga.init({
      inputStream: {
        type: 'LiveStream',
        target: scannerRef.current,
        constraints: { facingMode: 'environment' },
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
    setMode('quagga');
    setStarted(true);

    const onDetected = (result) => {
      if (lockedRef.current) return;

      const code = result?.codeResult?.code;
      if (!code) return;

      frameCountRef.current++;
      bufferRef.current[code] = (bufferRef.current[code] || 0) + 1;

      if (frameCountRef.current >= 20) {
        let best = null;
        let count = 0;

        for (const [k, v] of Object.entries(bufferRef.current)) {
          if (v > count) {
            best = k;
            count = v;
          }
        }

        if (count >= 5) {
          lockedRef.current = true;
          navigator.vibrate?.(200);
          onDetect(best);
        }

        bufferRef.current = {};
        frameCountRef.current = 0;
      }
    };

    Quagga.onDetected(onDetected);
  }, [onDetect]);

  /* =====================================================
     INIT
  ===================================================== */
  useEffect(() => {
    lockedRef.current = false;

    if ('BarcodeDetector' in window) {
      startNativeScanner();
    } else {
      startQuagga();
    }

    return () => {
      try {
        Quagga.stop();
        Quagga.CameraAccess?.release();
      } catch (_) {}

      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, [startNativeScanner, startQuagga]);

  /* =====================================================
     UI
  ===================================================== */
  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
          <span className="font-semibold">
            📷 Escanear Código ({mode === 'native' ? 'Alta precisión' : 'Compatibilidad'})
          </span>
          <button onClick={onClose} className="text-2xl">✕</button>
        </div>

        <div className="relative bg-black h-[360px] overflow-hidden">

          {/* Native */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${mode === 'native' ? 'block' : 'hidden'}`}
          />

          {/* Quagga */}
          <div
            id="interactive"
            ref={scannerRef}
            className={`w-full h-full ${mode === 'quagga' ? 'block' : 'hidden'}`}
          />

          {started && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-36 border-4 border-green-400 rounded-xl" />
            </div>
          )}
        </div>

        <div className="px-5 py-4 bg-gray-50 text-center text-sm text-gray-600">
          Cámara o pistola USB – escaneo automático
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
