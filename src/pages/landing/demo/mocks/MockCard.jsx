import { M } from '../theme';
import MockIcon from './MockIcon';

/** Tarjeta con título e ícono (igual a las tarjetas de la app real, simplificada). */
export default function MockCard({ id, icon, title, right, children, style }) {
  return (
    <div
      data-demo-id={id}
      style={{ background: M.panel, border: `1px solid ${M.border}`, borderRadius: 12, padding: '8px 12px 10px', ...style }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        {icon && <MockIcon name={icon} size={14} color={M.blueSoft} />}
        <span style={{ fontWeight: 600, fontSize: 12.5, color: M.text, flex: 1 }}>{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}
