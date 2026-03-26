import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';

/**
 * BarcodeScanner
 *
 * Estrategia de motores:
 *  1. Native BarcodeDetector con pdf_417 — si el dispositivo lo soporta (más fluido)
 *  2. Native BarcodeDetector sin pdf_417 — para QR/1D rápidos cuando no hay soporte pdf_417
 *  3. ZXing BrowserMultiFormatReader     — fallback completo (más pesado, pero universal)
 *
 * Props:
 *  onDetect(code: string)
 *  onClose()
 *  hint?         — texto de ayuda debajo del visor
 *  formatFilter? — 'pdf417' para rechazar códigos puramente numéricos
 */
const BarcodeScanner = ({ onDetect, onClose, hint, formatFilter }) => {
  const videoRef       = useRef(null);
  const lockedRef      = useRef(false);
  const readerRef      = useRef(null);
  const rafRef         = useRef(null);

  const hidBufferRef   = useRef('');
  const hidLastTimeRef = useRef(0);

  const [mode,    setMode]    = useState(null);
  const [started, setStarted] = useState(false);
  const [error,   setError]   = useState('');

  /* ─── fireDetect ─────────────────────────────────────── */
  const fireDetect = useCallback((code) => {
    if (formatFilter === 'pdf417' && /^\d+$/.test(code.trim())) return;
    onDetect(code);
  }, [onDetect, formatFilter]);

  /* ─── HID (pistola USB) ───────────────────────────────── */
  useEffect(() => {
    const onKeyDown = (e) => {
      if (lockedRef.current) return;
      const now = Date.now();
      if (now - hidLastTimeRef.current > 100) hidBufferRef.current = '';
      hidLastTimeRef.current = now;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (hidBufferRef.current.length >= 4) {
          lockedRef.current = true;
          navigator.vibrate?.(100);
          fireDetect(hidBufferRef.current);
        }
        hidBufferRef.current = '';
        return;
      }
      if (e.key.length === 1) hidBufferRef.current += e.key;
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fireDetect]);

  /* ─── Native BarcodeDetector ──────────────────────────── */
  const startNative = useCallback(async (formats) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    videoRef.current.srcObject = stream;
    await videoRef.current.play();

    const detector = new window.BarcodeDetector({ formats });
    setStarted(true);

    const scan = async () => {
      if (lockedRef.current) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          lockedRef.current = true;
          navigator.vibrate?.(200);
          fireDetect(barcodes[0].rawValue);
          return;
        }
      } catch (_) {}
      rafRef.current = requestAnimationFrame(scan);
    };
    rafRef.current = requestAnimationFrame(scan);
  }, [fireDetect]);

  /* ─── ZXing fallback ──────────────────────────────────── */
  const startZxing = useCallback(async () => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.PDF_417,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.AZTEC,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 300,
      delayBetweenScanSuccess:  500,
    });
    readerRef.current = reader;

    await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (lockedRef.current || !result) return;
      lockedRef.current = true;
      navigator.vibrate?.(200);
      fireDetect(result.getText());
    });

    setStarted(true);
  }, [fireDetect]);

  /* ─── INIT ────────────────────────────────────────────── */
  useEffect(() => {
    lockedRef.current = false;

    (async () => {
      try {
        if ('BarcodeDetector' in window) {
          const supported = await window.BarcodeDetector.getSupportedFormats();

          if (supported.includes('pdf_417')) {
            // Dispositivo soporta PDF417 nativo — el más fluido
            setMode('native-full');
            await startNative(supported);
          } else {
            // Dispositivo tiene Native pero sin PDF417 — usar ZXing
            setMode('zxing');
            await startZxing();
          }
        } else {
          setMode('zxing');
          await startZxing();
        }
      } catch (err) {
        console.error('Scanner init error:', err);
        setError('No se pudo acceder a la cámara. Verifica los permisos e intenta de nuevo.');
      }
    })();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { readerRef.current?.reset(); } catch (_) {}
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, [startNative, startZxing]);

  /* ─── UI ──────────────────────────────────────────────── */
  const modeLabel = mode === 'native-full'
    ? 'Alta precisión'
    : mode === 'zxing'
      ? 'Modo compatible'
      : 'Iniciando...';

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
          <span className="font-semibold text-sm">
            📷 Escanear código — <span className="text-gray-400 font-normal">{modeLabel}</span>
          </span>
          <button onClick={onClose} className="text-2xl leading-none">✕</button>
        </div>

        {/* Visor */}
        <div className="relative bg-black h-[360px] overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {started && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative w-72 h-28">
                <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br" />
                <div className="absolute inset-x-0 top-0 h-0.5 bg-green-400 opacity-80 animate-scan" />
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="text-4xl">🚫</span>
              <p className="text-white text-sm">{error}</p>
            </div>
          )}

          {!started && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 text-center text-sm text-gray-500">
          {hint || 'Apunta al código de barras — pistola USB o cámara'}
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%   { top: 0%; }
          100% { top: 100%; }
        }
        .animate-scan {
          animation: scan 1.8s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;