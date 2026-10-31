import { C, M, FONT_TITLE } from '../theme';
import MockIcon from './MockIcon';

/**
 * Menú lateral simplificado. Etiquetas y orden salen de la app real (captura del 30/oct/2026).
 * En Taller se muestran solo las primeras opciones y no se incluye "Aprobaciones NEXA":
 * el lienzo es de 600 px de alto y el resto no aporta a la historia del tour.
 *
 * Cada subopción lleva data-demo-id="nav-<slug>" (p. ej. nav-orden-de-trabajo) para que
 * el cursor pueda hacer clic en ella desde un guion.
 */
const GROUPS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'taller', label: 'Taller', children: ['Histórico', 'Orden de Trabajo', 'Vehículos', 'Agenda de citas'] },
  { id: 'ventas', label: 'Ventas', children: ['Nueva Venta', 'Historial Ventas', 'Clientes'] },
  { id: 'crm', label: 'CRM' },
  { id: 'cotizaciones', label: 'Cotizaciones', children: ['Nueva cotización', 'Listado'] },
  { id: 'cartera', label: 'Cartera' },
  { id: 'tesoreria', label: 'Tesorería' },
  { id: 'contabilidad', label: 'Contabilidad', children: ['Plan de Cuentas', 'Asientos Contables', 'Mapeo de Cuentas', 'Reportes Financieros'] },
  { id: 'nomina', label: 'Nómina' },
  { id: 'inventario', label: 'Inventario', children: ['Productos', 'Compras', 'Pedidos a proveedores', 'Alertas de Stock'] },
  { id: 'informes', label: 'Informes' },
  { id: 'soporte', label: 'Soporte' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'ajustes', label: 'Ajustes' },
];

const ACTIVE = C.accentL;
const ACTIVE_BG = 'rgba(207,58,11,0.16)';

const slug = (text) => text
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function MockSidebar({ active = 'taller', activeChild }) {
  return (
    <aside style={{
      width: 188, flexShrink: 0, background: M.panel, borderRight: `1px solid ${M.border}`,
      padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 6px 10px' }}>
        <div style={{
          width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(155deg, ${C.graphite2}, ${C.ink})`, border: '1px solid rgba(207,58,11,0.45)',
        }}>
          <MockIcon name="stopwatch" size={13} color={C.accentL} />
        </div>
        <span style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 14, color: M.text }}>Pitbox</span>
      </div>

      {GROUPS.map((g) => {
        const isActive = g.id === active;
        return (
          <div key={g.id}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 7,
              color: isActive ? ACTIVE : M.muted, fontWeight: isActive ? 600 : 500, fontSize: 12,
              background: isActive ? ACTIVE_BG : 'transparent',
            }}>
              <span style={{
                width: 13, height: 13, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${isActive ? ACTIVE : M.faint}`,
              }} />
              {g.label}
            </div>
            {isActive && g.children && (
              <div style={{ margin: '1px 0 3px 0', padding: '0 0 0 6px' }}>
                {g.children.map((child) => {
                  const on = child === activeChild;
                  return (
                    <div
                      key={child}
                      data-demo-id={`nav-${slug(child)}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6,
                        fontSize: 11.5, color: on ? ACTIVE : M.muted, fontWeight: on ? 600 : 400,
                        background: on ? ACTIVE_BG : 'transparent',
                      }}
                    >
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: on ? ACTIVE : M.faint, flexShrink: 0 }} />
                      {child}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div style={{
        marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 6px 0', borderTop: `1px solid ${M.border}`,
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%', background: C.accent, color: '#fff', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
        }}>A</span>
        <div style={{ lineHeight: 1.25, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: M.text }}>Admin Pitbox</div>
          <div style={{ fontSize: 9.5, color: M.faint }}>Administrador</div>
        </div>
      </div>
    </aside>
  );
}
