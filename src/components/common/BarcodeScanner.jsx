import { useEffect, useRef, useState, useCallback } from 'react';
import { scanImageData } from '@undecaf/zbar-wasm';

/**
 * BarcodeScanner
 *
 * Motor: zbar-wasm (WebAssembly)
 *  - Lee PDF417, QR, EAN-13, Code128, Aztec, DataMatrix, etc.
 *  - No bloquea el hilo principal (WASM)
 *  - Compatible con móvil (Opera/Chrome Android) y PC
 *
 * Props:
 *  onDetect(code: string)
 *  onClose()
 *  hint?         — texto de ayuda debajo del visor
 *  formatFilter? — 'pdf417' para rechazar códigos puramente numéricos
 */
const BarcodeScanner = ({ onDetect, onClose, hint, formatFilter }) => {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const lockedRef  = useRef(false);
  const rafRef     = useRef(null);
  const streamRef  = useRef(null);

  const hidBufferRef   = useRef('');
  const hidLastTimeRef = useRef(0);

  const [started, setStarted] = useState(false);
  const [error,   setError]   = useState('');

  const fireDetect = useCallback((code) => {
    if (formatFilter === 'pdf417' && /^\d+$/.test(code.trim())) return;
    onDetect(code);
  }, [onDetect, formatFilter]);

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

  useEffect(() => {
    let active = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d', { willReadFrequently: true });
        setStarted(true);

        const scan = async () => {
          if (!active || lockedRef.current) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            try {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const symbols   = await scanImageData(imageData);
              if (symbols.length > 0 && !lockedRef.current) {
                lockedRef.current = true;
                navigator.vibrate?.(200);
                fireDetect(symbols[0].decode());
                return;
              }
            } catch (_) {}
          }
          rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
      } catch (err) {
        console.error('Scanner error:', err);
        setError('No se pudo acceder a la cámara. Verifica los permisos e intenta de nuevo.');
      }
    };

    start();

    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [fireDetect]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
          <span className="font-semibold text-sm">📷 Escanear código</span>
          <button onClick={onClose} className="text-2xl leading-none">✕</button>
        </div>
        <div className="relative bg-black h-[360px] overflow-hidden">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
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
        <div className="px-5 py-3 bg-gray-50 text-center text-sm text-gray-500">
          {hint || 'Apunta al código de barras — pistola USB o cámara'}
        </div>
      </div>
      <style>{`
        @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
        .animate-scan { animation: scan 1.8s ease-in-out infinite alternate; }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;