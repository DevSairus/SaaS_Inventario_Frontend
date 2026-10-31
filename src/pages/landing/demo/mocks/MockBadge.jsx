const TONES = {
  blue:   { fg: '#93C5FD', bg: 'rgba(59,130,246,0.16)' },
  amber:  { fg: '#FCD34D', bg: 'rgba(245,158,11,0.16)' },
  green:  { fg: '#6EE7B7', bg: 'rgba(16,185,129,0.16)' },
  orange: { fg: '#FDBA74', bg: 'rgba(249,115,22,0.16)' },
  gray:   { fg: '#D1D5DB', bg: 'rgba(156,163,175,0.16)' },
  red:    { fg: '#FCA5A5', bg: 'rgba(239,68,68,0.16)' },
};

/** Insignia de estado (Recibido, En Proceso, Listo…). */
export default function MockBadge({ tone = 'blue', children, id }) {
  const t = TONES[tone] || TONES.blue;
  return (
    <span
      data-demo-id={id}
      style={{
        display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 100,
        fontSize: 10.5, fontWeight: 600, background: t.bg, color: t.fg, whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
