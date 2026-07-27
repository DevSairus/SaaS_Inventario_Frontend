import { useEffect, useRef, useState, useCallback } from 'react';
import { Monitor, X, Wifi, WifiOff, MousePointer, Keyboard } from 'lucide-react';
import { useRemoteSocket } from '../../../hooks/useRemoteSocket';

export default function RemoteViewer({ sessionId, onEnd }) {
  const { emit, on } = useRemoteSocket();
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const [controlMode, setControlMode] = useState(false);
  const controlModeRef = useRef(false);
  const frameSize = useRef({ w: 0, h: 0 });
  const frameSeqRef = useRef(0);
  const drawnSeqRef = useRef(0);

  // Mantener ref sincronizado con estado
  useEffect(() => { controlModeRef.current = controlMode; }, [controlMode]);

  // Enviar input al cliente
  const sendInput = useCallback((input) => {
    console.log(`[RemoteViewer] Sending input:`, input.type);
    emit('session:input', { sessionId, input });
  }, [emit, sessionId]);

  // Calcular coordenadas normalizadas [0..1] relativas al frame original
  const getNormalizedCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }, []);

  // Mouse handlers
  // Nota: no se envían 'mousedown'/'mouseup' como eventos de input separados —
  // el 'click' de abajo ya los sintetiza del lado del cliente. Mandar los tres
  // por cada clic físico duplicaba la interacción (y si el primer par ya
  // cambiaba el layout del cliente, el segundo disparo caía en otro elemento:
  // eso producía el "abre y cierra varias veces").
  const handleMouseDown = useCallback((e) => {
    if (!controlMode) return;
    e.preventDefault();
    // preventDefault() cancela el foco automático del navegador en mousedown;
    // sin esto el canvas nunca queda enfocado y el teclado del agente no llega.
    canvasRef.current?.focus();
  }, [controlMode]);

  const handleClick = useCallback((e) => {
    if (!controlMode) return;
    e.preventDefault();
    const coords = getNormalizedCoords(e);
    if (coords) {
      console.log(`[RemoteViewer] Click at (${coords.x.toFixed(3)}, ${coords.y.toFixed(3)})`);
      sendInput({ type: 'click', ...coords, button: e.button });
    }
  }, [controlMode, getNormalizedCoords, sendInput]);

  const handleDoubleClick = useCallback((e) => {
    if (!controlMode) return;
    e.preventDefault();
    const coords = getNormalizedCoords(e);
    if (coords) sendInput({ type: 'dblclick', ...coords });
  }, [controlMode, getNormalizedCoords, sendInput]);

  const handleMouseMove = useCallback((e) => {
    if (!controlMode) return;
    const coords = getNormalizedCoords(e);
    if (coords) sendInput({ type: 'mousemove', ...coords });
  }, [controlMode, getNormalizedCoords, sendInput]);

  // Wheel necesita passive:false para poder hacer preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e) => {
      if (!controlModeRef.current) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      sendInput({ type: 'wheel', deltaX: e.deltaX, deltaY: e.deltaY, x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [sendInput]);

  // Keyboard handlers
  const handleKeyDown = useCallback((e) => {
    if (!controlMode) return;
    // No capturar atajos del navegador (Ctrl+C, Ctrl+V, etc.)
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    sendInput({
      type: 'keydown',
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
    });
  }, [controlMode, sendInput]);

  const handleKeyUp = useCallback((e) => {
    if (!controlMode) return;
    if (e.ctrlKey || e.metaKey) return;
    sendInput({ type: 'keyup', key: e.key, code: e.code });
  }, [controlMode, sendInput]);

  // Socket + frame rendering
  useEffect(() => {
    if (!sessionId) return;

    emit('session:join', { sessionId });

    const unsubFrame = on('session:frame', ({ frame }) => {
      if (!canvasRef.current || !frame) return;
      // Cada frame se decodifica async (new Image()); si uno más viejo tarda
      // más que uno más nuevo, puede terminar de decodificar después y pisar
      // el frame actual ("imágenes fantasma"). Se descarta cualquier frame
      // que llegue a dibujarse fuera de orden.
      const seq = ++frameSeqRef.current;

      // El frame puede llegar como dataURL de texto (base64) o binario
      // (ArrayBuffer/Blob) según la versión del cliente — se maneja cualquiera
      // de los dos en vez de asumir uno solo (envolver un string en Blob
      // produce una imagen corrupta que nunca dispara onload).
      let url = null;
      let src = frame;
      if (typeof frame !== 'string') {
        const blob = frame instanceof Blob ? frame : new Blob([frame], { type: 'image/jpeg' });
        url = URL.createObjectURL(blob);
        src = url;
      }
      const img = new Image();
      img.onload = () => {
        if (url) URL.revokeObjectURL(url);
        if (seq < drawnSeqRef.current) return;
        drawnSeqRef.current = seq;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        frameSize.current = { w: img.width, h: img.height };
        canvas.getContext('2d').drawImage(img, 0, 0);
        if (status !== 'connected') setStatus('connected');
        frameCount.current++;
      };
      img.onerror = () => { if (url) URL.revokeObjectURL(url); };
      img.src = src;
    });

    const unsubEnded = on('session:ended', () => {
      console.log('[RemoteViewer] session:ended recibido');
      setStatus('ended');
    });

    const fpsInterval = setInterval(() => {
      setFps(frameCount.current * 2);
      frameCount.current = 0;
    }, 500);

    // Atajos de teclado globales
    const handleGlobalKey = (e) => {
      if (e.key === 'Escape') setControlMode(false);
    };
    window.addEventListener('keydown', handleGlobalKey);

    return () => {
      unsubFrame();
      unsubEnded();
      clearInterval(fpsInterval);
      window.removeEventListener('keydown', handleGlobalKey);
    };
  }, [sessionId]);

  const handleEnd = () => {
    emit('session:end', { sessionId });
    onEnd?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-blue-400" />
          <span className="text-white font-medium text-sm">Acceso Remoto</span>
          <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
            status === 'connected' ? 'bg-green-900 text-green-300' :
            status === 'ended' ? 'bg-red-900 text-red-300' :
            'bg-gray-700 text-gray-300'
          }`}>
            {status === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {status === 'connecting' && 'Esperando al cliente...'}
            {status === 'connected' && `${fps} fps`}
            {status === 'ended' && 'Finalizada'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle control mode */}
          {status === 'connected' && (
            <button
              onClick={() => setControlMode(!controlMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                controlMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <MousePointer className="w-3 h-3" />
              {controlMode ? 'Control activo' : 'Activar control'}
            </button>
          )}
          <button onClick={handleEnd} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-4">
        {status === 'ended' ? (
          <div className="text-center">
            <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 font-medium">Sesión finalizada</p>
            <button onClick={handleEnd} className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm">Cerrar</button>
          </div>
        ) : status !== 'connected' ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Esperando que el cliente comparta su pantalla...</p>
          </div>
        ) : null}
        <canvas
          ref={canvasRef}
          tabIndex={0}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleMouseMove}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          className={`max-w-full max-h-full rounded-lg shadow-2xl border bg-black outline-none ${
            controlMode ? 'border-blue-500 cursor-crosshair' : 'border-gray-700'
          } ${status === 'connected' ? '' : 'hidden'}`}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {controlMode ? (
            <span className="flex items-center gap-1.5 text-blue-400">
              <Keyboard className="w-3 h-3" />
              Click y teclado se envían al cliente · Esc para salir
            </span>
          ) : (
            <span>Solo visualización</span>
          )}
        </div>
        <button onClick={handleEnd} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
          Terminar sesión
        </button>
      </div>
    </div>
  );
}
