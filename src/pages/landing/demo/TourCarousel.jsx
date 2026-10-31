import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { replay } from './useTourRunner';
import { C, CANVAS_W, CANVAS_H, FONT_TITLE } from './theme';

/* Tarjeta: miniatura 16:10 de la pantalla mock (se escala el lienzo de 960×600). */
const CARD_W = 208;
const GAP = 12;
const THUMB_H = Math.round((CARD_W * CANVAS_H) / CANVAS_W);
const SCALE = CARD_W / CANVAS_W;

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Fotograma representativo del tour (a ~55 % del guion), sin animar. */
function Thumb({ tour }) {
  const mock = useMemo(
    () => replay(tour, Math.max(1, Math.round(tour.steps.length * 0.55))).mock,
    [tour],
  );
  const { Screen } = tour;
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${SCALE})`, transformOrigin: '0 0' }}>
        <Screen state={mock} typing={null} />
      </div>
    </div>
  );
}

const Chevron = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points={dir === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
  </svg>
);

const arrowStyle = (side) => ({
  position: 'absolute', top: THUMB_H / 2 - 18, [side]: -6, zIndex: 3, width: 36, height: 36,
  borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: C.white, background: 'rgba(11,12,16,0.92)',
  border: '1px solid rgba(255,255,255,0.22)', boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
});

/**
 * Carrusel horizontal de recorridos (estilo lista de videos) bajo el reproductor.
 * Muestra todos los tours en orden; el activo se centra solo al cambiar.
 */
export default function TourCarousel({ tours, activeId, onSelect }) {
  const scroller = useRef(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, tours.length]);

  // Centra la tarjeta activa solo en horizontal (no mueve la página).
  useEffect(() => {
    const el = scroller.current;
    const card = el && el.querySelector('[aria-current="true"]');
    if (!card) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: Math.max(0, card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2), behavior: reduce ? 'auto' : 'smooth' });
  }, [activeId]);

  const page = (dir) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * (CARD_W + GAP) * 2, behavior: 'smooth' });
  };

  return (
    <div className="pbd-car-wrap" style={{ position: 'relative' }}>
      {edge.left && (
        <button type="button" className="pbd-car-arrow" aria-label="Recorridos anteriores" onClick={() => page(-1)} style={arrowStyle('left')}>
          <Chevron dir="left" />
        </button>
      )}
      {edge.right && (
        <button type="button" className="pbd-car-arrow" aria-label="Más recorridos" onClick={() => page(1)} style={arrowStyle('right')}>
          <Chevron dir="right" />
        </button>
      )}
      <div
        ref={scroller}
        className="pbd-car"
        onScroll={update}
        role="list"
        aria-label="Recorridos disponibles"
        style={{ position: 'relative', display: 'flex', gap: GAP, overflowX: 'auto', padding: '4px 4px 6px', scrollSnapType: 'x proximity' }}
      >
        {tours.map((t, i) => {
          const on = t.id === activeId;
          return (
            <button
              key={t.id}
              type="button"
              role="listitem"
              className="pbd-card"
              aria-current={on ? 'true' : undefined}
              onClick={() => onSelect(t.id)}
              style={{ flex: `0 0 ${CARD_W}px`, width: CARD_W, padding: 0, border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', scrollSnapAlign: 'start' }}
            >
              <span
                className="pbd-card-thumb"
                style={{
                  position: 'relative', display: 'block', width: CARD_W, height: THUMB_H, borderRadius: 10, overflow: 'hidden',
                  background: '#0D0D0D', opacity: on ? 1 : 0.78, transition: 'opacity 0.2s, box-shadow 0.2s',
                  boxShadow: on ? `0 0 0 2px ${C.accentL}, 0 8px 24px rgba(207,58,11,0.25)` : '0 0 0 1px rgba(255,255,255,0.14)',
                }}
              >
                <Thumb tour={t} />
                <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)' }} />
                <span style={{ position: 'absolute', top: 6, left: 6, fontFamily: FONT_TITLE, fontSize: 11, fontWeight: 700, color: C.white, background: 'rgba(0,0,0,0.65)', borderRadius: 6, padding: '2px 7px' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ position: 'absolute', bottom: 6, right: 6, fontSize: 11, fontWeight: 600, color: C.white, background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '2px 6px' }}>
                  {fmt(t.duration)}
                </span>
                {on ? (
                  <span style={{ position: 'absolute', bottom: 6, left: 6, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.white, background: C.accent, borderRadius: 6, padding: '2px 7px' }}>
                    Viendo
                  </span>
                ) : (
                  <span className="pbd-card-play" aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', width: 34, height: 34, marginLeft: -17, marginTop: -17, borderRadius: '50%', background: 'rgba(11,12,16,0.7)', border: '1px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={C.white}><polygon points="7 4 20 12 7 20 7 4" /></svg>
                  </span>
                )}
              </span>
              <span style={{ display: 'block', marginTop: 8, padding: '0 2px' }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: on ? C.white : 'rgba(255,255,255,0.82)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.title}
                </span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 11.5, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.module}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
