import { useEffect, useRef, useState } from 'react';

/**
 * Componente de diagnóstico — SOLO PARA PRUEBAS, borrar después
 * Muestra exactamente qué está pasando en cada paso del scanner
 */
const BarcodeScannerTest = ({ onClose }) => {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState('');

  const log = (msg) => setLogs(prev => [`${new Date().toISOString().slice(11,19)} ${msg}`, ...prev.slice(0, 20)]);

  useEffect(() => {
    let active = true;

    const start = async () => {
      // 1. Cámara
      log('Solicitando cámara...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        log(`✅ Cámara OK — tracks: ${stream.getVideoTracks().length}`);
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        log(`📐 Resolución: ${settings.width}x${settings.height}`);

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        log('▶️ Video reproduciéndose');

        // 2. zbar-wasm
        log('Cargando zbar-wasm...');
        let scanImageData;
        try {
          const mod = await import('@undecaf/zbar-wasm');
          scanImageData = mod.scanImageData;
          log('✅ zbar-wasm cargado');
        } catch (e) {
          log(`❌ zbar-wasm FALLÓ: ${e.message}`);
          return;
        }

        // 3. Loop
        log('🔄 Iniciando loop de escaneo...');
        let frameCount = 0;

        const scan = async () => {
          if (!active) return;
          const video  = videoRef.current;
          const canvas = canvasRef.current;
          const ctx    = canvas.getContext('2d', { willReadFrequently: true });

          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            frameCount++;

            if (frameCount % 30 === 0) log(`📷 Frame ${frameCount} — ${canvas.width}x${canvas.height}`);

            try {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const symbols   = await scanImageData(imageData);
              if (symbols.length > 0) {
                const decoded = symbols[0].decode();
                log(`🎉 DETECTADO: ${decoded.slice(0, 60)}`);
                setResult(decoded);
                active = false;
                return;
              }
            } catch (e) {
              if (frameCount < 5) log(`⚠️ scanImageData error: ${e.message}`);
            }
          } else {
            if (frameCount < 3) log(`⏳ Video readyState: ${video.readyState}`);
          }

          rafRef.current = requestAnimationFrame(scan);
        };

        rafRef.current = requestAnimationFrame(scan);

      } catch (e) {
        log(`❌ Error cámara: ${e.message}`);
      }
    };

    start();
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
        <span className="font-bold text-sm">🔬 Diagnóstico Scanner</span>
        <button onClick={onClose} className="text-xl">✕</button>
      </div>

      <video ref={videoRef} playsInline muted className="w-full h-40 object-cover bg-black" />
      <canvas ref={canvasRef} className="hidden" />

      {result && (
        <div className="mx-3 my-2 p-3 bg-green-900 rounded text-green-300 text-xs font-mono break-all">
          <strong>RESULTADO:</strong> {result}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {logs.map((l, i) => (
          <p key={i} className={`text-xs font-mono ${l.includes('❌') ? 'text-red-400' : l.includes('✅') || l.includes('🎉') ? 'text-green-400' : 'text-gray-300'}`}>
            {l}
          </p>
        ))}
      </div>
    </div>
  );
};

export default BarcodeScannerTest;