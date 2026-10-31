import { M } from '../theme';

const VARIANTS = {
  primary: { background: M.blue, color: '#fff', border: '1px solid transparent' },
  ghost:   { background: 'transparent', color: M.muted, border: `1px solid ${M.border2}` },
  soft:    { background: 'rgba(255,255,255,0.06)', color: M.text, border: `1px solid ${M.border2}` },
  orange:  { background: 'rgba(249,115,22,0.14)', color: '#FDBA74', border: '1px solid rgba(249,115,22,0.45)' },
  green:   { background: 'rgba(16,185,129,0.14)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.45)' },
  dashed:  { background: 'transparent', color: M.blueSoft, border: '1px dashed rgba(96,165,250,0.5)' },
};

/** Botón de la mini-interfaz. `id` es el data-demo-id al que apunta el cursor. */
export default function MockButton({ id, children, variant = 'primary', disabled = false, small = false, style }) {
  return (
    <div
      data-demo-id={id}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: small ? '5px 10px' : '8px 14px', borderRadius: small ? 7 : 9,
        fontSize: small ? 11 : 12, fontWeight: 600, whiteSpace: 'nowrap', userSelect: 'none',
        opacity: disabled ? 0.55 : 1, transition: 'opacity 0.2s, background 0.2s',
        ...VARIANTS[variant], ...style,
      }}
    >
      {children}
    </div>
  );
}
