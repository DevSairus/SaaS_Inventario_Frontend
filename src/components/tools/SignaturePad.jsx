import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

/**
 * Firma en pantalla (mouse, dedo o lápiz). onChange recibe un data URL PNG,
 * o null cuando se borra. El lienzo se dibuja a la resolución del dispositivo
 * para que la firma no salga pixelada en el acta.
 *
 * Los trazos se guardan como puntos, así que si cambia el ancho (rotar el
 * celular/tablet, abrir el teclado, redimensionar la ventana) la firma se
 * redibuja escalada en vez de borrarse. Con setPointerCapture el trazo no se
 * corta si el dedo se sale un poco del recuadro.
 */
export default function SignaturePad({ onChange, height = 160 }) {
  const canvasRef = useRef(null);
  const strokes = useRef([]);      // [[{x, y}, ...], ...] en px CSS
  const current = useRef(null);    // trazo en curso
  const activePointer = useRef(null);
  const widthRef = useRef(0);
  const [empty, setEmpty] = useState(true);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    for (const s of strokes.current) {
      if (s.length === 1) {              // un toque suelto = punto
        ctx.beginPath();
        ctx.arc(s[0].x, s[0].y, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = '#111827';
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(s[0].x, s[0].y);
      for (let i = 1; i < s.length; i += 1) ctx.lineTo(s[i].x, s[i].y);
      ctx.stroke();
    }
  }, []);

  const emit = useCallback(() => {
    onChange?.(strokes.current.length ? canvasRef.current.toDataURL('image/png') : null);
  }, [onChange]);

  // Dimensiona el lienzo y lo mantiene al día cuando cambia el ancho.
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const ratio = window.devicePixelRatio || 1;
      const prev = widthRef.current;
      if (prev && Math.abs(prev - rect.width) < 0.5) return;
      if (prev && strokes.current.length) {
        const k = rect.width / prev;
        strokes.current = strokes.current.map((s) => s.map((p) => ({ x: p.x * k, y: p.y })));
      }
      widthRef.current = rect.width;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      paint();
      if (prev && strokes.current.length) emit();
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);
    window.addEventListener('resize', resize);
    return () => { ro?.disconnect(); window.removeEventListener('resize', resize); };
  }, [paint, emit]);

  const point = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e) => {
    if (activePointer.current !== null) return;       // ignora el 2.º dedo / la palma
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    activePointer.current = e.pointerId;
    current.current = [point(e)];
    strokes.current.push(current.current);
    setEmpty(false);
    paint();
  };

  const move = (e) => {
    if (activePointer.current !== e.pointerId || !current.current) return;
    e.preventDefault();
    // getCoalescedEvents recupera los puntos intermedios: trazo más suave con lápiz/dedo.
    const evts = e.nativeEvent?.getCoalescedEvents?.() || [e];
    for (const ev of (evts.length ? evts : [e])) current.current.push(point(ev));
    paint();
  };

  const end = (e) => {
    if (activePointer.current !== e.pointerId) return;
    activePointer.current = null;
    current.current = null;
    emit();
  };

  const clear = () => {
    strokes.current = [];
    current.current = null;
    activePointer.current = null;
    setEmpty(true);
    paint();
    onChange?.(null);
  };

  return (
    <div>
      <div className="relative rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white">
        <canvas
          ref={canvasRef}
          style={{ height, touchAction: 'none' }}
          className="w-full block cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
        {empty && <span className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 pointer-events-none">Firme aquí</span>}
      </div>
      <button type="button" onClick={clear} className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
        <Eraser className="w-3.5 h-3.5" /> Borrar firma
      </button>
    </div>
  );
}
