import { useEffect, useRef, useState, useCallback } from 'react';
import { Monitor, X, Smartphone } from 'lucide-react';
import { useRemoteSocket } from '../../hooks/useRemoteSocket';
import { endRemoteSession } from '../../api/support';
import toast from 'react-hot-toast';
import InputReplayer from './InputReplayer';

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 1024);

export default function ScreenShareClient({ sessionId, onEnd }) {
  const { emit, on } = useRemoteSocket();
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const endedRef = useRef(false);
  const startedRef = useRef(false);
  const teardownTimerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('starting');

  const cleanup = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    videoRef.current = null;
  }, []);

  // Se retrasa un tick para poder cancelarla si React (StrictMode, solo en dev)
  // vuelve a invocar el efecto inmediatamente después: eso no es un unmount real,
  // es la misma instancia del componente re-verificando su cleanup. Sin este
  // retraso, ese cleanup fantasma reseteaba el guard y disparaba un segundo
  // getDisplayMedia (el diálogo de compartir pantalla aparecía dos veces).
  const scheduleTeardown = useCallback(() => {
    teardownTimerRef.current = setTimeout(() => {
      teardownTimerRef.current = null;
      startedRef.current = false;
      cleanup();
      if (!endedRef.current) onEnd?.();
    }, 0);
  }, [cleanup, onEnd]);

  const handleEnd = useCallback(async (skipEmit) => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (!skipEmit) emit('session:end', { sessionId });
    cleanup();
    try { await endRemoteSession(sessionId); } catch { /* */ }
    onEnd?.();
  }, [sessionId, emit, cleanup, onEnd]);

  const startCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser', frameRate: 15, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
        preferCurrentTab: true,
      });
      streamRef.current = stream;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      videoRef.current = video;

      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d');

      stream.getVideoTracks()[0].onended = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        streamRef.current = null;
        videoRef.current = null;
        setStatus('paused');
      };

      setStatus('sharing');

      intervalRef.current = setInterval(() => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const reader = new FileReader();
          reader.onloadend = () => {
            emit('session:frame', { sessionId, frame: reader.result });
          };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.5);
      }, 83);

    } catch (err) {
      if (err.name === 'NotAllowedError') toast.error('Cancelaste el compartir pantalla');
      else toast.error('No se pudo compartir la pantalla');
      handleEnd();
    }
  }, [sessionId, emit, handleEnd]);

  useEffect(() => {
    if (!sessionId) return;

    // Si había un cleanup pendiente de un remount fantasma (StrictMode en dev),
    // se cancela: sigue siendo el mismo montaje lógico, no un unmount real.
    if (teardownTimerRef.current) {
      clearTimeout(teardownTimerRef.current);
      teardownTimerRef.current = null;
    }

    emit('session:join', { sessionId });

    if (startedRef.current) {
      return () => scheduleTeardown();
    }
    startedRef.current = true;

    const unsubEnded = on('session:ended', () => {
      console.log('[ScreenShare] session:ended recibido');
      handleEnd(true);
    });
    startCapture();

    return () => {
      unsubEnded();
      scheduleTeardown();
    };
  }, [sessionId]);

  if (endedRef.current) return null;

  if (isMobile && status === 'starting') {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-72 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="px-4 py-3 text-center">
          <Smartphone className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-white text-sm font-medium mb-1">Dispositivo móvil detectado</p>
          <p className="text-gray-400 text-xs mb-3">La compartición de pantalla puede no funcionar en móviles.</p>
          <button onClick={() => handleEnd()} className="px-3 py-1.5 bg-gray-700 text-white rounded text-xs">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <>
    <InputReplayer sessionId={sessionId} />
    <div className="fixed bottom-4 right-4 z-50 w-72 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-blue-400" />
          <span className="text-white text-xs font-medium">
            {status === 'paused' ? 'Compartición pausada' : 'Compartiendo pantalla'}
          </span>
          <span className={`w-2 h-2 rounded-full ${status === 'sharing' ? 'bg-green-400 animate-pulse' : status === 'paused' ? 'bg-gray-400' : 'bg-yellow-400'}`} />
        </div>
        <button onClick={() => handleEnd()} className="p-1 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      {status === 'starting' && (
        <div className="flex items-center justify-center h-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mx-auto mb-1" />
            <p className="text-[10px] text-gray-400">Selecciona qué compartir...</p>
          </div>
        </div>
      )}

      {status === 'paused' && (
        <div className="px-3 py-3 text-center">
          <p className="text-[10px] text-gray-400 mb-2">El agente ya no ve tu pantalla</p>
          <button
            onClick={() => { setStatus('starting'); startCapture(); }}
            className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700 mr-2"
          >
            Re-compartir
          </button>
        </div>
      )}

      <div className="px-3 py-2 flex justify-between items-center">
        <span className="text-[10px] text-gray-400">
          {status === 'sharing' ? 'Transmitiendo al agente' : status === 'paused' ? 'Pausado' : 'Preparando...'}
        </span>
        <button onClick={() => handleEnd()} className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] hover:bg-red-700">Terminar</button>
      </div>
    </div>
    </>
  );
}
