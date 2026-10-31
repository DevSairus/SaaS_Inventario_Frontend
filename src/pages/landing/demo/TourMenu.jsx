import { AUDIENCES } from './tours';
import { C, FONT_TITLE } from './theme';

/**
 * Selector de tipo de demo (columna vertical a un lado del reproductor; en móvil pasa a
 * dos botones en fila encima). Elegir un tipo salta a su primer recorrido; la lista de
 * recorridos vive en el carrusel inferior (TourCarousel).
 */
export default function TourMenu({ tours, activeAudience, onSelectAudience }) {
  return (
    <nav className="pbd-aud" aria-label="Tipo de recorrido" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {AUDIENCES.map((a) => {
        const count = tours.filter((t) => t.audience === a.id).length;
        if (!count) return null;
        const on = a.id === activeAudience;
        return (
          <button
            key={a.id}
            type="button"
            className="pbd-aud-item"
            aria-pressed={on}
            onClick={() => onSelectAudience(a.id)}
            style={{
              textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', padding: 16, borderRadius: 14,
              border: `1.5px solid ${on ? C.accentL : 'rgba(255,255,255,0.12)'}`,
              background: on ? 'rgba(207,58,11,0.14)' : 'rgba(255,255,255,0.03)',
            }}
          >
            <span style={{ display: 'block', fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 15, lineHeight: 1.25, color: on ? C.white : 'rgba(255,255,255,0.82)' }}>
              {a.label}
            </span>
            <span className="pbd-aud-hint" style={{ display: 'block', marginTop: 4, fontSize: 12, lineHeight: 1.4, color: 'rgba(255,255,255,0.5)' }}>
              {a.hint}
            </span>
            <span className="pbd-aud-count" style={{ display: 'block', marginTop: 10, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: on ? C.accentL : 'rgba(255,255,255,0.4)' }}>
              {count} recorridos
            </span>
          </button>
        );
      })}
    </nav>
  );
}
