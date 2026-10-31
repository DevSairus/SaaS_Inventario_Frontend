import MockIcon from './MockIcon';

/** Aviso tipo react-hot-toast (arriba al centro, fondo #363636 como en la app). */
export default function MockToast({ show, children }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', top: 14, left: 0, right: 0, zIndex: 45, display: 'flex',
        justifyContent: 'center', pointerEvents: 'none',
        opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.25s, transform 0.25s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, background: '#363636', color: '#fff',
        padding: '9px 16px', borderRadius: 8, fontSize: 12.5, boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
      }}>
        <span style={{
          width: 16, height: 16, borderRadius: '50%', background: '#10B981',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MockIcon name="check" size={10} color="#fff" strokeWidth={3} />
        </span>
        {children}
      </div>
    </div>
  );
}
