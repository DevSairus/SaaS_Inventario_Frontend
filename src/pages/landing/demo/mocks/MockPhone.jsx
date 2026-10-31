/**
 * Celular del cliente final, compartido por los tours "de cara al cliente":
 *   - MockPhone : página pública en tema claro (seguimiento de la orden, cotización).
 *   - WaPhone   : chat de WhatsApp con mensajes entrantes del taller.
 *
 * La página pública se dibuja en tema claro a propósito: así la ve el cliente en su celular.
 * `scroll` (px) desplaza el contenido con una transición; si el cursor va a apuntar a algo que
 * se mueve con el scroll, el guion debe esperar ~700 ms antes del `move`/`click`.
 */
import MockIcon from './MockIcon';

export const pubCard = {
  background: '#fff', borderRadius: 10, padding: '9px 11px',
  boxShadow: '0 1px 2px rgba(15,23,42,0.05)', flexShrink: 0,
};
export const pubLabel = {
  fontSize: 7.5, fontWeight: 700, letterSpacing: 0.5, color: '#6b7280', textTransform: 'uppercase',
};

const FRAME = {
  margin: '10px auto 14px', borderRadius: 26, border: '6px solid #262A33',
  overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
};

export default function MockPhone({
  title, subtitle, icon = 'wrench', color = '#3b82f6', width = 250, height = 410, scroll = 0, children,
}) {
  return (
    <div style={{ ...FRAME, width, background: '#f1f5f9', color: '#111827' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: color, color: '#fff', padding: '10px 12px' }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MockIcon name={icon} size={12} color="#fff" />
        </span>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700, fontSize: 11.5 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 8.5, opacity: 0.85 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ height, overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            padding: 8, display: 'flex', flexDirection: 'column', gap: 7,
            transform: `translateY(${-scroll}px)`, transition: 'transform 0.6s ease',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Campo de texto de la página pública (clara). `id` es el data-demo-id del cursor. */
export function PhoneField({ id, label, value = '', placeholder = '', typing = false }) {
  return (
    <div>
      {label && <div style={{ fontSize: 7.5, fontWeight: 600, color: '#4b5563', marginBottom: 2 }}>{label}</div>}
      <div
        data-demo-id={id}
        style={{
          height: 24, boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 8px',
          borderRadius: 6, background: '#fff', border: `1px solid ${typing ? '#3b82f6' : '#d1d5db'}`,
          fontSize: 9.5, color: '#111827', overflow: 'hidden', whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: value ? '#111827' : '#9ca3af' }}>{value || (typing ? '' : placeholder)}</span>
        {typing && (
          <span className="pbd-anim pbd-caret" style={{ display: 'inline-block', width: 1.5, height: 11, marginLeft: 1, background: '#2563eb' }} />
        )}
      </div>
    </div>
  );
}

/**
 * Chat de WhatsApp visto desde el celular del cliente: mensajes ENTRANTES del taller.
 * messages: [{ text, time, card?: { title, sub, link } }]
 * Los textos son ilustrativos (no se copian de las plantillas reales del backend).
 */
export function WaPhone({ name, width = 250, height = 400, messages }) {
  return (
    <div style={{ ...FRAME, width, background: '#0B141A', color: '#E9EDEF' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#202C33', padding: '9px 12px' }}>
        <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#4B5B64', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MockIcon name="wrench" size={12} color="#E9EDEF" />
        </span>
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 8.5, color: '#8696A0' }}>Cuenta de empresa</div>
        </div>
      </div>
      <div style={{ height, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
        {messages.map((m, i) => (
          <div
            key={m.text}
            data-demo-id={m.card && m.card.link ? 'wa-link' : `wa-msg-${i}`}
            className="pbd-anim pbd-fade"
            style={{ alignSelf: 'flex-start', maxWidth: '88%', background: '#202C33', borderRadius: '2px 10px 10px 10px', padding: 6 }}
          >
            {m.card && (
              <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 7, padding: '7px 9px', marginBottom: 5, borderLeft: '3px solid #53BDEB' }}>
                <div style={{ fontSize: 10, fontWeight: 700 }}>{m.card.title}</div>
                <div style={{ fontSize: 9, color: '#A7B4BC', marginTop: 1 }}>{m.card.sub}</div>
                {m.card.link && <div style={{ fontSize: 9, color: '#53BDEB', marginTop: 3 }}>{m.card.link}</div>}
              </div>
            )}
            <div style={{ fontSize: 10.5, lineHeight: 1.4, padding: '1px 4px' }}>{m.text}</div>
            <div style={{ textAlign: 'right', fontSize: 8.5, color: '#8696A0', padding: '2px 4px 0' }}>{m.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
