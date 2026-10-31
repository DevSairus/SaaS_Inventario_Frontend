import { M } from '../theme';

const BORDER = {
  normal: M.border2,
  ok: 'rgba(16,185,129,0.6)',
  warn: 'rgba(245,158,11,0.6)',
};

/**
 * Campo de formulario. `id` es el data-demo-id al que apunta el cursor.
 * `typing` muestra el cursor de escritura parpadeando.
 */
export default function MockInput({
  id, label, value = '', placeholder = '', typing = false, state = 'normal',
  hint, multiline = false, height = 64, mono = false, leading, trailing,
}) {
  return (
    <div style={{ minWidth: 0 }}>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 600, color: M.muted, marginBottom: 4 }}>{label}</div>
      )}
      <div
        data-demo-id={id}
        style={{
          height: multiline ? height : 32, boxSizing: 'border-box',
          display: 'flex', alignItems: multiline ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 8,
          padding: multiline ? '8px 10px' : '0 10px', borderRadius: 8,
          background: M.bg, border: `1px solid ${BORDER[state] || BORDER.normal}`,
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
          fontSize: 12, color: M.text, overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: 7, minWidth: 0, flex: 1 }}>
          {leading}
          <span style={{
            minWidth: 0, whiteSpace: multiline ? 'pre-wrap' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            color: value ? M.text : M.faint,
          }}>
            {value || (typing ? '' : placeholder)}
            {typing && (
              <span
                className="pbd-anim pbd-caret"
                style={{ display: 'inline-block', width: 1.5, height: 14, marginLeft: 1, verticalAlign: 'middle', background: M.blueSoft }}
              />
            )}
          </span>
        </div>
        {trailing}
      </div>
      {hint && <div style={{ fontSize: 10, color: M.amber, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}
