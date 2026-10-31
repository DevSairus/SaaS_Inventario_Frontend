import { useLayoutEffect, useState } from 'react';
import { C, CANVAS_W, CANVAS_H } from './theme';

/**
 * Mide un elemento [data-demo-id] dentro del lienzo, en coordenadas del lienzo
 * (el lienzo está escalado con transform: se divide entre la escala).
 * Se vuelve a medir cada vez que cambia el estado de la pantalla mock.
 */
export function useTargetBox(canvasRef, id, scale, dep) {
  const [box, setBox] = useState(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!id || !canvas) { setBox(null); return; }
    const el = canvas.querySelector(`[data-demo-id="${id}"]`);
    if (!el) return; // el elemento aún no existe: se conserva la medida anterior
    const c = canvas.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const s = c.width / CANVAS_W || scale || 1; // escala real del lienzo (puede estar en transición)
    const next = {
      x: (r.left - c.left) / s,
      y: (r.top - c.top) / s,
      w: r.width / s,
      h: r.height / s,
      at: el.getAttribute('data-demo-at') || 'center',
    };
    setBox((prev) => (
      prev && prev.x === next.x && prev.y === next.y && prev.w === next.w
        && prev.h === next.h && prev.at === next.at ? prev : next
    ));
  }, [canvasRef, id, scale, dep]);

  return box;
}

/** Cursor falso con ondita de clic. `press` aumenta en cada clic. */
export function Cursor({ box, press, animate }) {
  const home = { x: CANVAS_W - 70, y: CANVAS_H - 50 };
  let x = home.x;
  let y = home.y;
  if (box) {
    x = box.at === 'start' ? box.x + 28 : box.x + box.w / 2;
    y = box.y + box.h / 2;
  }
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', left: 0, top: 0, zIndex: 60, pointerEvents: 'none',
        transform: `translate(${x}px, ${y}px)`,
        opacity: box ? 1 : 0,
        transition: animate
          ? 'transform 650ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms'
          : 'none',
      }}
    >
      {press > 0 && <span key={press} className="pbd-ripple" />}
      <svg width="22" height="22" viewBox="0 0 24 24" style={{ display: 'block', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))' }}>
        <path d="M4 2l15 9-6.5 1.6L9.5 19z" fill={C.white} stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Anillo de resaltado sobre un elemento. */
export function Highlight({ box }) {
  if (!box) return null;
  const pad = 5;
  return (
    <div
      aria-hidden="true"
      className="pbd-anim pbd-ring"
      style={{
        position: 'absolute', zIndex: 55, pointerEvents: 'none',
        left: box.x - pad, top: box.y - pad, width: box.w + pad * 2, height: box.h + pad * 2,
        border: `2px solid ${C.accentL}`, borderRadius: 10,
        boxShadow: '0 0 0 4px rgba(240,87,43,0.18), 0 0 22px rgba(240,87,43,0.35)',
      }}
    />
  );
}
