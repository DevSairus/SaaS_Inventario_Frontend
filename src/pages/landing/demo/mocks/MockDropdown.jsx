import { M } from '../theme';

/**
 * Lista desplegable bajo un campo. Debe ir dentro de un contenedor con
 * position: relative que envuelva al campo.
 */
export default function MockDropdown({ open, children }) {
  if (!open) return null;
  return (
    <div
      className="pbd-anim pbd-fade"
      style={{
        position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, zIndex: 25,
        background: M.panel2, border: `1px solid ${M.border2}`, borderRadius: 9,
        boxShadow: '0 12px 30px rgba(0,0,0,0.5)', overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}
