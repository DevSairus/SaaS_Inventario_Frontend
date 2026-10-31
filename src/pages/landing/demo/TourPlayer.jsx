import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import useTourRunner from './useTourRunner';
import { Cursor, Highlight, useTargetBox } from './Cursor';
import { C, CANVAS_W, CANVAS_H, FONT_TITLE } from './theme';

/* ─── Íconos de los controles ─── */
const Svg = ({ children }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const PlayIcon = () => <Svg><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" /></Svg>;
const PauseIcon = () => <Svg><rect x="6" y="4" width="4" height="16" fill="currentColor" /><rect x="14" y="4" width="4" height="16" fill="currentColor" /></Svg>;
const RestartIcon = () => <Svg><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" /></Svg>;
const PrevIcon = () => <Svg><polyline points="15 18 9 12 15 6" /></Svg>;
const NextIcon = () => <Svg><polyline points="9 18 15 12 9 6" /></Svg>;


const ctrlBtn = (extra) => ({
  height: 36, minWidth: 36, padding: '0 10px', borderRadius: 10, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  color: C.white, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', ...extra,
});

/**
 * Reproductor de un tour: lienzo fijo escalado + cursor + controles + frase explicativa.
 * Montar con key={tour.id} para que cada tour arranque desde cero.
 */
export default function TourPlayer({ tour, active, manual, hasNext, onNextTour, onRequestDemo }) {
  const runner = useTourRunner(tour, { active, manual });
  const { view, status, chapters, chapter, fraction } = runner;
  const { Screen } = tour;

  /* Lienzo: en escritorio se escala completo al ancho disponible. En pantallas angostas
   * (< 640 px) el lienzo completo quedaría ilegible, así que se muestra una "cámara"
   * ampliada que sigue al cursor (o al punto que pida tour.camera). */
  const outerRef = useRef(null);
  const canvasRef = useRef(null);
  const [width, setWidth] = useState(CANVAS_W);
  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return undefined;
    const measure = () => {
      setWidth(el.clientWidth || CANVAS_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  /* Escala: el lienzo llena el ancho de su columna (máx. 100 %). */
  const compact = width < 640;
  const fit = Math.min(width / CANVAS_W, 1) || 1;
  const baseZoom = compact ? Math.min(1, Math.max(fit, width / 440)) : fit;
  const frameW = compact ? width : Math.round(CANVAS_W * fit);
  const viewH = compact ? Math.round(width * 1.05) : Math.round(CANVAS_H * fit);

  // La medida del cursor usa la escala real del lienzo (ver useTargetBox).
  const cursorBox = useTargetBox(canvasRef, view.target, baseZoom, view.mock);
  const ringBox = useTargetBox(canvasRef, view.highlight, baseZoom, view.mock);

  let zoom = baseZoom;
  let camX = 0;
  let camY = 0;
  if (compact) {
    const hint = tour.camera ? tour.camera(view.mock) : null;
    zoom = hint && hint.zoom ? Math.min(1, Math.max(fit, hint.zoom)) : baseZoom;
    const visW = width / zoom;
    const visH = viewH / zoom;
    const fx = hint ? hint.x : cursorBox ? cursorBox.x + cursorBox.w / 2 : visW / 2;
    const fy = hint ? hint.y : cursorBox ? cursorBox.y + cursorBox.h / 2 : visH / 2;
    camX = Math.min(Math.max(fx - visW / 2, 0), Math.max(0, CANVAS_W - visW));
    camY = Math.min(Math.max(fy - visH / 2, 0), Math.max(0, CANVAS_H - visH));
  }

  const onKeyDown = useCallback((e) => {
    if (e.target !== e.currentTarget) return; // los botones manejan su propio teclado
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (manual) runner.next(); else runner.toggle(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); runner.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); runner.prev(); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); runner.restart(); }
  }, [manual, runner]);

  const playing = status === 'playing';
  const finished = status === 'finished';
  const lastChapter = chapters.length - 1;

  return (
    <div
      role="group"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`Recorrido: ${tour.title}. ${manual ? 'Enter o flecha derecha: siguiente paso.' : 'Espacio: reproducir o pausar.'} Flechas: cambiar de paso. R: reiniciar.`}
      style={{ outlineOffset: 4 }}
    >
      {/* Lienzo (centrado; su ancho sale de la altura disponible en pantallas bajas) */}
      <div ref={outerRef} style={{ width: '100%' }}>
      <div
        style={{
          position: 'relative', width: frameW, maxWidth: '100%', margin: '0 auto', height: viewH, overflow: 'hidden',
          borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)', background: '#0D0D0D',
        }}
      >
        <div
          ref={canvasRef}
          role="img"
          aria-label={`Animación demostrativa: ${tour.title}`}
          style={{
            position: 'absolute', left: 0, top: 0, width: CANVAS_W, height: CANVAS_H,
            transform: `translate(${-camX * zoom}px, ${-camY * zoom}px) scale(${zoom})`, transformOrigin: '0 0',
            transition: !manual && compact ? 'transform 650ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        >
          <div aria-hidden="true">
            <Screen state={view.mock} typing={view.typing} />
          </div>
          <Highlight box={ringBox} />
          <Cursor box={cursorBox} press={view.press} animate={!manual} />
        </div>

        {finished && (
          <div
            className="pbd-anim pbd-fade"
            style={{
              position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center',
              padding: '1.5rem', background: 'rgba(11,12,16,0.88)', backdropFilter: 'blur(4px)',
            }}
          >
            <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, color: C.white, fontSize: 'clamp(1.05rem, 2.6vw, 1.6rem)', maxWidth: 520, lineHeight: 1.3 }}>
              {tour.summary}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => onRequestDemo(tour)}
                style={{
                  background: C.accent, color: C.white, border: 'none', borderRadius: 10, cursor: 'pointer',
                  padding: '11px 22px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                  boxShadow: '0 4px 16px rgba(207,58,11,0.35)',
                }}
              >
                Solicitar demo →
              </button>
              <button
                type="button"
                onClick={hasNext ? onNextTour : runner.restart}
                style={{ ...ctrlBtn(), height: 'auto', padding: '11px 20px', fontSize: 14 }}
              >
                {hasNext ? 'Ver otro recorrido' : 'Ver de nuevo'}
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Frase explicativa (región en vivo para lectores de pantalla) */}
      <p
        aria-live="polite"
        aria-atomic="true"
        style={{
          margin: '8px 0 6px', minHeight: compact ? '2.6em' : '1.4em', textAlign: 'center',
          fontFamily: FONT_TITLE, fontWeight: 600, fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
          color: C.white, lineHeight: 1.35,
        }}
      >
        {view.caption}
      </p>

      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" aria-label="Reiniciar recorrido" title="Reiniciar" onClick={runner.restart} style={ctrlBtn()}>
          <RestartIcon />
        </button>
        <button type="button" aria-label="Paso anterior" title="Paso anterior" onClick={runner.prev} style={ctrlBtn()}>
          <PrevIcon />{manual && 'Anterior'}
        </button>
        {!manual && (
          <button
            type="button"
            aria-label={playing ? 'Pausar' : 'Reproducir'}
            title={playing ? 'Pausar' : 'Reproducir'}
            onClick={runner.toggle}
            style={ctrlBtn({ background: C.accent, border: '1px solid transparent', minWidth: 44 })}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
        )}
        <button
          type="button"
          aria-label="Paso siguiente"
          title="Paso siguiente"
          onClick={runner.next}
          disabled={finished}
          style={ctrlBtn(manual
            ? { background: C.accent, border: '1px solid transparent', opacity: finished ? 0.5 : 1 }
            : { opacity: finished ? 0.5 : 1 })}
        >
          {manual ? 'Siguiente' : ''}<NextIcon />
        </button>

        {/* Progreso por pasos */}
        <div
          role="group"
          aria-label="Progreso del recorrido"
          style={{ display: 'flex', gap: 5, flex: '1 1 200px', maxWidth: 460, minWidth: 160, marginLeft: 8 }}
        >
          {chapters.map((ch, k) => {
            const done = finished || k < chapter;
            const current = !finished && k === chapter;
            const fill = done ? 1 : current ? fraction : 0;
            return (
              <button
                key={ch.start}
                type="button"
                onClick={() => runner.goTo(k)}
                aria-label={`Ir al paso ${k + 1} de ${chapters.length}: ${ch.title}`}
                aria-current={current ? 'step' : undefined}
                title={ch.title}
                style={{ flex: 1, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <span style={{ display: 'block', width: '100%', height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
                  <span style={{
                    display: 'block', height: '100%', width: `${fill * 100}%`,
                    background: k === lastChapter && done ? C.signalL : C.accentL,
                    transition: manual ? 'none' : 'width 0.3s linear',
                  }} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
