import { M } from '../theme';

/**
 * Tabla simple.
 * columns: [{ key, label, width }]  (width en fr, por defecto 1)
 * rows:    [{ id?, cells: { [key]: node } }]  (`id` = data-demo-id de la fila)
 */
export default function MockTable({ columns, rows }) {
  const template = columns.map((c) => `${c.width || 1}fr`).join(' ');
  return (
    <div style={{ border: `1px solid ${M.border}`, borderRadius: 10, overflow: 'hidden', background: M.panel }}>
      <div style={{
        display: 'grid', gridTemplateColumns: template, gap: 10, padding: '8px 12px',
        background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${M.border}`,
        fontSize: 10.5, fontWeight: 700, color: M.faint, letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>
        {columns.map((c) => <span key={c.key}>{c.label}</span>)}
      </div>
      {rows.map((row, i) => (
        <div
          key={row.id || i}
          data-demo-id={row.id}
          style={{
            display: 'grid', gridTemplateColumns: template, gap: 10, padding: '0 12px', height: 38,
            alignItems: 'center', fontSize: 12, color: M.text,
            borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${M.border}`,
          }}
        >
          {columns.map((c) => <span key={c.key} style={{ minWidth: 0 }}>{row.cells[c.key]}</span>)}
        </div>
      ))}
    </div>
  );
}
