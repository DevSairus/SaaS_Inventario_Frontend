import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';

/**
 * BarcodeScanner
 *
 * Motor único: ZXing BrowserMultiFormatReader
 *  - Soporta PDF417, QR, Aztec, DataMatrix y todos los 1D (EAN, Code128, etc.)
 *  - Más confiable que Native BarcodeDetector para PDF417 colombiano laminado
 *
 * Props:
 *  onDetect(code: string)
 *  onClose()
 *  hint?         — texto de ayuda debajo del visor
 *  formatFilter? — 'pdf417' para rechazar códigos puramente numéricos (EAN, impresos)
 */
const BarcodeScanner = ({ onDetect, onClose, hint, formatFilter }) => {
  const videoRef       = useRef(null);
  const lockedRef      = useRef(false);
  const readerRef      = useRef(null);

  // HID (pistola USB – actúa como teclado)
  const hidBufferRef   = useRef('');
  const hidLastTimeRef = useRef(0);

  const [started, setStarted] = useState(false);
  const [error,   setError]   = useState('');

  /* =====================================================
     FIRE DETECT — aplica filtro opcional antes de notificar
  ===================================================== */
  const fireDetect = useCallback((code) => {
    if (formatFilter === 'pdf417' && /^\d+$/.test(code.trim())) return;
    onDetect(code);
  }, [onDetect, formatFilter]);

  /* =====================================================
     🔫 USB HID SCANNER (KEYBOARD)
     La pistola envía los caracteres muy rápido y termina con Enter.
  ===================================================== */
  useEffect(() => {
    const onKeyDown = (e) => {
      if (lockedRef.current) return;

      const now = Date.now();
      if (now - hidLastTimeRef.current > 100) {
        hidBufferRef.current = '';
      }
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

      if (e.key.length === 1) {
        hidBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fireDetect]);

  /* =====================================================
     📦 ZXING — motor principal
     Soporta PDF417, QR, Aztec, DataMatrix y todos los 1D.
  ===================================================== */
  const startZxing = useCallback(async () => {
    try {
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
      // TRY_HARDER mejora la detección de PDF417 en ángulos no perfectos
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 150,
        delayBetweenScanSuccess:  500,
      });
      readerRef.current = reader;

      await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (lockedRef.current) return;
          if (result) {
            lockedRef.current = true;
            navigator.vibrate?.(200);
            fireDetect(result.getText());
          }
        }
      );

      setStarted(true);
    } catch (err) {
      console.error('ZXing error:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos e intenta de nuevo.');
    }
  }, [fireDetect]);

  /* =====================================================
     INIT & CLEANUP
  ===================================================== */
  useEffect(() => {
    lockedRef.current = false;
    startZxing();

    return () => {
      try { readerRef.current?.reset(); } catch (_) {}
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, [startZxing]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
          <span className="font-semibold text-sm">
            📷 Escanear código
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

          {/* Recuadro guía — proporción ancha para PDF417 */}
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

          {/* Error de cámara */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="text-4xl">🚫</span>
              <p className="text-white text-sm">{error}</p>
            </div>
          )}

          {/* Spinner inicial */}
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