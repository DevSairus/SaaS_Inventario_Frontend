/**
 * Sección "Mira cómo funciona" del landing: menú de recorridos + reproductor.
 * Se carga con React.lazy desde LandingPage.jsx (queda fuera del bundle inicial).
 *
 * - Sin llamadas a la API ni a la base de datos: todo es una animación local.
 * - Arranca solo al entrar en pantalla y se pausa al salir o al cambiar de pestaña.
 * - Con prefers-reduced-motion funciona en modo manual (un paso por pulsación).
 */
import { useEffect, useRef, useState } from 'react';
import TOURS from './tours';
import TourMenu from './TourMenu';
import TourCarousel from './TourCarousel';
import TourPlayer from './TourPlayer';
import useReducedMotion from './useReducedMotion';
import { C, FONT_TITLE } from './theme';

const CSS = `
  @keyframes pbdRipple { from { transform: scale(0.3); opacity: 0.85; } to { transform: scale(1.7); opacity: 0; } }
  @keyframes pbdBlink  { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
  @keyframes pbdFade   { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pbdRing   { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

  .pbd-ripple { position: absolute; left: -12px; top: -12px; width: 26px; height: 26px; border-radius: 50%;
    border: 2px solid ${C.accentL}; background: rgba(240,87,43,0.25); animation: pbdRipple 0.5s ease-out forwards; }
  .pbd-caret { animation: pbdBlink 0.9s steps(1) infinite; }
  .pbd-fade  { animation: pbdFade 0.22s ease-out; }
  .pbd-ring  { animation: pbdRing 0.9s ease-in-out infinite; }

  /* Móvil / tablet: una sola columna (título, selector, reproductor, carrusel). */
  .pbd-wrap { margin: 0 auto; max-width: 1100px; }
  .pbd-top { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }
  .pbd-left { text-align: center; }
  .pbd-aud { flex-direction: row !important; }
  .pbd-aud-item { flex: 1 1 0; padding: 10px 12px !important; }
  .pbd-aud-hint, .pbd-aud-count { display: none !important; }
  .pbd-bottom { margin-top: 16px; }
  .pbd-car-arrow { display: none; }

  .pbd-car { scrollbar-width: none; }
  .pbd-car::-webkit-scrollbar { display: none; }
  .pbd-card:hover .pbd-card-thumb { opacity: 1 !important; }
  .pbd-card .pbd-card-play { transition: transform 0.2s, background 0.2s; }
  .pbd-card:hover .pbd-card-play { transform: scale(1.12); background: rgba(207,58,11,0.9) !important; }
  .pbd-card:focus-visible { outline: 2px solid ${C.accentL}; outline-offset: 3px; border-radius: 10px; }
  .pbd-aud-item:hover { background: rgba(255,255,255,0.07) !important; }

  /* Escritorio: título + selector a la izquierda, reproductor a la derecha.
   * El ancho del reproductor sale de la ALTURA de la ventana (16:10), así el reproductor,
   * la frase y los controles caben en pantalla, y el bloque se centra sin huecos a los lados.
   * 188 px = barra de navegación + relleno + frase + controles. */
  @media (min-width: 901px) {
    .pbd-wrap { max-width: min(1100px, calc(224px + max(520px, (100vh - 188px) * 1.6))); }
    .pbd-top { grid-template-columns: 200px minmax(0, 1fr); gap: 24px; }
    .pbd-left { text-align: left; }
    .pbd-aud { flex-direction: column !important; }
    .pbd-aud-item { flex: none; padding: 16px !important; }
    .pbd-aud-hint, .pbd-aud-count { display: block !important; }
    .pbd-car-arrow { display: inline-flex; }
    .pbd-bottom { margin-top: 22px; }
  }

  /* Portátiles / ventanas bajas */
  @media (min-width: 901px) and (max-height: 820px) {
    .pbd-section { padding-top: 5.25rem !important; padding-bottom: 1.75rem !important; }
    .pbd-head p { display: none; }
    .pbd-aud-item { padding: 12px 14px !important; }
    .pbd-bottom { margin-top: 14px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .pbd-anim, .pbd-ripple { animation: none !important; transition: none !important; }
    .pbd-caret { animation: none !important; opacity: 1; }
  }
`;

/** true mientras el elemento está (al menos en parte) en pantalla; se actualiza en ambos sentidos. */
function useLiveInView(threshold) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

export default function DemoSection({ onCta }) {
  const [tourId, setTourId] = useState(TOURS[0].id);
  const [playerRef, inView] = useLiveInView(0.35);
  const pageVisible = usePageVisible();
  const reduced = useReducedMotion();

  const tourIndex = Math.max(0, TOURS.findIndex((t) => t.id === tourId));
  const tour = TOURS[tourIndex];
  // Solo los recorridos de la categoría activa: el carrusel y "Ver otro recorrido" se quedan en ella.
  const categoryTours = TOURS.filter((t) => t.audience === tour.audience);
  const hasNext = categoryTours.length > 1;
  const nextTour = () => {
    const pos = categoryTours.findIndex((t) => t.id === tour.id);
    setTourId(categoryTours[(pos + 1) % categoryTours.length].id);
  };
  const selectAudience = (id) => {
    const first = TOURS.find((t) => t.audience === id);
    if (first) setTourId(first.id);
  };

  return (
    <section
      id="demo"
      className="pbd-section"
      style={{
        background: `linear-gradient(165deg, ${C.inkD} 0%, #121317 100%)`,
        padding: 'clamp(5.25rem,7vw,6rem) clamp(1.5rem,5vw,4rem) clamp(2.75rem,5vw,4.5rem)',
      }}
    >
      <style>{CSS}</style>
      <div className="pbd-wrap">
        <div className="pbd-top">
          <div className="pbd-left">
            <div className="pbd-head">
              <div style={{ display: 'inline-block', background: 'rgba(207,58,11,0.1)', border: '1px solid rgba(207,58,11,0.25)', borderRadius: 100, padding: '5px 14px', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: C.accentL, fontWeight: 700, letterSpacing: '0.05em' }}>Mira cómo funciona</span>
              </div>
              <h2 style={{
                fontFamily: FONT_TITLE, fontSize: 'clamp(1.35rem,2.2vw,1.65rem)', fontWeight: 700,
                color: C.white, letterSpacing: '-0.02em', lineHeight: 1.18, margin: '0 0 10px',
              }}>
                Míralo trabajar antes de pedir tu demo
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
                Lo que vive tu cliente y cómo lo manejas tú desde el backoffice. Los datos son de ejemplo.
              </p>
            </div>
            <TourMenu tours={TOURS} activeAudience={tour.audience} onSelectAudience={selectAudience} />
          </div>

          <div ref={playerRef} style={{ minWidth: 0 }}>
            <TourPlayer
              key={tour.id}
              tour={tour}
              active={inView && pageVisible}
              manual={reduced}
              hasNext={hasNext}
              onNextTour={nextTour}
              onRequestDemo={(t) => onCta({ tourId: t.id, title: t.title, module: t.module })}
            />
          </div>
        </div>

        <div className="pbd-bottom">
          <TourCarousel key={tour.audience} tours={categoryTours} activeId={tour.id} onSelect={setTourId} />
        </div>
      </div>
    </section>
  );
}
