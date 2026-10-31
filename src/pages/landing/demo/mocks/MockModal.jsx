import { M } from '../theme';

/** Modal sobre el contenido de la ventana. Aparece con un fundido (sin transformar). */
export default function MockModal({ open, width = 420, children }) {
  if (!open) return null;
  return (
    <div
      className="pbd-anim pbd-fade"
      style={{
        position: 'absolute', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.62)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width, maxWidth: '92%', background: M.panel, border: `1px solid ${M.border2}`,
        borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,0.55)', overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}
