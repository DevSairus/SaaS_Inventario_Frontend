import { M, FONT_BODY, CANVAS_W, CANVAS_H } from '../theme';

/** Marco tipo ventana de navegador que ocupa todo el lienzo (960×600). */
export default function MockWindow({ title = 'pitbox.app', sidebar, children }) {
  return (
    <div style={{
      width: CANVAS_W, height: CANVAS_H, display: 'flex', flexDirection: 'column',
      background: M.bg, color: M.text, fontFamily: FONT_BODY, fontSize: 12,
      position: 'relative', overflow: 'hidden', border: `1px solid ${M.border}`,
    }}>
      <div style={{
        height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 12px', background: M.chrome, borderBottom: `1px solid ${M.border}`,
      }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
          <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.85 }} />
        ))}
        <div style={{
          margin: '0 auto', transform: 'translateX(-18px)', minWidth: 240, textAlign: 'center',
          padding: '4px 14px', borderRadius: 7, background: 'rgba(255,255,255,0.06)',
          color: M.muted, fontSize: 11,
        }}>
          {title}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {sidebar}
        <main style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
