/**
 * Tour 1 · Crear una orden de trabajo (~24 s)
 *
 * Referencia real (capturas del 30/oct/2026):
 *   - Formulario  → pages/workshop/WorkOrderFormPage.jsx ("Nueva Orden de Trabajo")
 *   - Detalle     → pages/workshop/WorkOrderDetailPage.jsx (tarjeta "Inventario ingreso")
 *   - Seguimiento → pages/workshop/WorkOrderPublicPage.jsx (página pública del cliente)
 *
 * Simplificaciones deliberadas (el lienzo mide 960×600):
 *   - Formulario sin "Notas internas" ni banner de borrador.
 *   - Detalle sin "Mapa de intervención", "Control de calidad", fotos ni botones de cambio
 *     de estado (solo tenemos la captura de una OT en estado "Listo").
 *   - Seguimiento público: se ve el encabezado, el avance, los repuestos, el vehículo y el técnico
 *     (sin "Fechas", "Problema reportado" ni "Contactar al taller").
 *
 * Todos los datos son ficticios. Para actualizar el tour cuando cambie la UI:
 * textos y constantes en este archivo, guion en `steps`.
 */
import { M, FONT_TITLE } from '../theme';
import MockWindow from '../mocks/MockWindow';
import MockSidebar from '../mocks/MockSidebar';
import MockInput from '../mocks/MockInput';
import MockButton from '../mocks/MockButton';
import MockBadge from '../mocks/MockBadge';
import MockTable from '../mocks/MockTable';
import MockToast from '../mocks/MockToast';
import MockModal from '../mocks/MockModal';
import MockDropdown from '../mocks/MockDropdown';
import MockIcon from '../mocks/MockIcon';

const OT_NUMBER = 'DEM-OT-0042';
const ENTRY_DATE = '30/10/2026';
const VEHICLE = { plate: 'ABC123', label: 'Mazda 3 2022', model: 'Mazda 3', year: '2022', color: 'Gris' };
const CUSTOMER = { name: 'Carlos Ruiz', phone: '300 000 0000', email: 'carlos.ruiz@ejemplo.com' };
const TECHNICIANS = ['Andrés Mejía', 'Laura Gómez', 'Julián Torres'];
const WAREHOUSE = 'Bodega Principal';
const WORKSHOP = { name: 'Taller Demo', phone: '300 000 0000' };
const PROBLEM = 'Ruido en frenos delanteros';

/* Repuestos y servicios que el cliente ve al final (IVA 19 % ya incluido en el repuesto). */
const PUBLIC_ITEMS = {
  parts: [{ name: 'Pastillas de freno', qty: 1, iva: '$ 19.000', price: '$ 119.000' }],
  labor: [{ name: 'Mano de obra — Frenos', qty: 1, price: '$ 80.000' }],
  total: '$ 199.000',
};

/* ───────────── Piezas locales ───────────── */

function Card({ icon, title, right, children, style }) {
  return (
    <div style={{ background: M.panel, border: `1px solid ${M.border}`, borderRadius: 12, padding: '8px 12px 10px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <MockIcon name={icon} size={14} color={M.blueSoft} />
        <span style={{ fontWeight: 600, fontSize: 12.5, color: M.text, flex: 1 }}>{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, color: M.faint, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: value === '—' ? M.faint : M.text }}>{value}</div>
    </div>
  );
}

const hintOf = (filled, text) => (filled ? '\u00a0' : text); // \u00a0 reserva la línea y evita saltos de layout

/* ───────────── Pantallas ───────────── */

function ListView() {
  return (
    <div style={{ padding: '18px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 19, fontWeight: 700, color: M.text }}>Histórico de órdenes</div>
          <div style={{ fontSize: 11.5, color: M.muted, marginTop: 2 }}>Vehículos en el taller</div>
        </div>
        <MockButton id="btn-nueva-ot"><MockIcon name="plus" size={13} color="#fff" /> Nueva OT</MockButton>
      </div>
      <div style={{ marginBottom: 12 }}>
        <MockInput
          placeholder="Buscar por placa, cliente, número de OT..."
          leading={<MockIcon name="search" size={13} color={M.faint} />}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <MockBadge tone="gray">Todas</MockBadge>
        <MockBadge tone="blue">Recibido</MockBadge>
        <MockBadge tone="amber">En Proceso</MockBadge>
        <MockBadge tone="orange">En Espera</MockBadge>
        <MockBadge tone="green">Listo</MockBadge>
      </div>
      <MockTable
        columns={[
          { key: 'ot', label: 'Orden', width: 1.1 },
          { key: 'veh', label: 'Vehículo', width: 1.6 },
          { key: 'cli', label: 'Cliente', width: 1.3 },
          { key: 'est', label: 'Estado', width: 1 },
        ]}
        rows={[
          { cells: { ot: <b>DEM-OT-0041</b>, veh: 'Renault Duster · DEF456', cli: 'María Londoño', est: <MockBadge tone="blue">Recibido</MockBadge> } },
          { cells: { ot: <b>DEM-OT-0040</b>, veh: 'Chevrolet Spark · GHJ321', cli: 'Pedro Ospina', est: <MockBadge tone="amber">En Proceso</MockBadge> } },
          { cells: { ot: <b>DEM-OT-0039</b>, veh: 'Kia Picanto · KLM654', cli: 'Luisa Parra', est: <MockBadge tone="green">Listo</MockBadge> } },
        ]}
      />
    </div>
  );
}

function FormView({ s, typing }) {
  const allFilled = s.vehSel && s.cliente && s.mileage && s.promised && s.problema;
  return (
    <div style={{ padding: '12px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ padding: 6, borderRadius: 8, color: M.muted }}><MockIcon name="arrowLeft" size={16} /></div>
        <div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 19, fontWeight: 700, color: M.text }}>Nueva Orden de Trabajo</div>
          <div style={{ fontSize: 11.5, color: M.muted }}>Ingreso de vehículo al taller</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {/* Vehículo: búsqueda + registrar nuevo + consulta RUNT; debajo, el kilometraje */}
        <Card icon="car" title="Vehículo *">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <MockInput
                id="veh-input" label="Buscar por placa, marca o modelo" placeholder="ABC123, Honda, CBR..."
                value={s.vehQuery} typing={typing === 'vehQuery'} state={s.vehSel ? 'ok' : 'normal'}
                leading={<MockIcon name="search" size={13} color={M.faint} />}
              />
              <MockDropdown open={s.vehOpen}>
                <div data-demo-id="veh-option" style={{ padding: '8px 10px', background: M.blueBg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5 }}>{VEHICLE.plate}</b>
                    <span style={{ fontSize: 11, color: M.muted }}>{VEHICLE.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: M.blueSoft, marginTop: 2 }}>{CUSTOMER.name}</div>
                </div>
              </MockDropdown>
            </div>
            <MockButton id="btn-nuevo-vehiculo" variant="dashed" style={{ height: 32, boxSizing: 'border-box' }}>
              <MockIcon name="plus" size={12} /> Registrar nuevo vehículo
            </MockButton>
            <MockButton id="btn-runt" variant="orange" style={{ height: 32, boxSizing: 'border-box' }}>
              <MockIcon name="search" size={12} /> Consultar RUNT
            </MockButton>
          </div>
          <div style={{ width: '48.5%', marginTop: 8 }}>
            <MockInput
              id="km-input" label="Kilometraje de ingreso *" placeholder="85000"
              value={s.mileage} typing={typing === 'mileage'} state={s.mileage ? 'ok' : 'normal'}
            />
          </div>
        </Card>

        {/* Cliente & Técnico: cuadrícula de 2 × 2 */}
        <Card icon="user" title="Cliente & Técnico">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12, rowGap: 6, alignItems: 'start' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <MockInput
                  id="cliente-input" label="Cliente *" placeholder="Buscar por nombre o teléfono..."
                  value={s.cliente} state={s.cliente ? 'ok' : 'warn'}
                  leading={<MockIcon name="search" size={13} color={M.faint} />}
                  hint={hintOf(s.cliente, 'Campo obligatorio — selecciona o registra un cliente')}
                />
              </div>
              <MockButton
                variant="green" small
                style={{ width: 32, height: 32, boxSizing: 'border-box', marginTop: 17, border: '1px dashed rgba(16,185,129,0.55)', padding: 0 }}
              >
                <MockIcon name="plus" size={13} />
              </MockButton>
            </div>
            <div style={{ position: 'relative' }}>
              <MockInput
                id="tecnico-input" label="Técnico asignado" placeholder="Buscar técnico..."
                value={s.tecnico} state={s.tecnico ? 'ok' : 'normal'}
                leading={<MockIcon name="search" size={13} color={M.faint} />}
              />
              <MockDropdown open={s.tecOpen}>
                {TECHNICIANS.map((t, i) => (
                  <div
                    key={t}
                    data-demo-id={i === 0 ? 'tec-option' : undefined}
                    style={{ padding: '8px 10px', fontSize: 12, fontWeight: 500, background: i === 0 ? M.blueBg : 'transparent' }}
                  >
                    {t}
                  </div>
                ))}
              </MockDropdown>
            </div>
            <MockInput
              label="Bodega de repuestos" value={WAREHOUSE}
              leading={<MockIcon name="search" size={13} color={M.faint} />}
              trailing={<MockIcon name="x" size={11} color={M.faint} />}
            />
            <MockInput
              id="fecha-input" label="Fecha prometida de entrega *" placeholder="dd/mm/aaaa --:-- -----"
              value={s.promised} state={s.promised ? 'ok' : 'warn'}
              trailing={<MockIcon name="calendar" size={13} color={M.muted} />}
              hint={hintOf(s.promised, 'Campo obligatorio — indica cuándo estará listo su vehículo')}
            />
          </div>
        </Card>

        <Card icon="wrench" title="Problema reportado *">
          <MockInput
            id="problema-input" label="Descripción *" multiline height={44}
            placeholder="Describir el problema que reporta el cliente..."
            value={s.problema} typing={typing === 'problema'} state={s.problema ? 'normal' : 'warn'}
          />
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
        <MockButton variant="ghost" style={{ flex: 1 }}>Cancelar</MockButton>
        <MockButton id="btn-crear" disabled={!allFilled} style={{ flex: 1 }}>
          <MockIcon name="save" size={14} color="#fff" /> Crear Orden
        </MockButton>
      </div>
    </div>
  );
}

/* Botón pequeño de la tarjeta "Inventario ingreso" (icono arriba, texto debajo). */
function MiniAction({ id, icon, children, tone = 'plain' }) {
  const green = tone === 'green';
  return (
    <div
      data-demo-id={id}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
        padding: '6px 2px', borderRadius: 8, textAlign: 'center', fontSize: 9.5, lineHeight: 1.15, fontWeight: 600,
        color: green ? '#6EE7B7' : M.muted,
        background: green ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${green ? 'rgba(16,185,129,0.5)' : M.border2}`,
      }}
    >
      <MockIcon name={icon} size={13} />
      <span>{children}</span>
    </div>
  );
}

function DetailView({ s }) {
  const km = s.mileage ? `${Number(s.mileage).toLocaleString('es-CO')} km` : '—';
  return (
    <div style={{ padding: '14px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ padding: 6, color: M.muted }}><MockIcon name="arrowLeft" size={16} /></div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: FONT_TITLE, fontSize: 20, fontWeight: 700 }}>{OT_NUMBER}</span>
            <MockBadge tone="blue">Recibido</MockBadge>
          </div>
          <div style={{ fontSize: 11.5, color: M.muted, marginTop: 2 }}>Ingresado: {ENTRY_DATE}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
        <MockButton small variant="soft"><MockIcon name="box" size={12} color="#C4B5FD" /> Inventario</MockButton>
        <MockButton small variant="soft"><MockIcon name="printer" size={12} /> Ingreso</MockButton>
        <MockButton small variant="soft"><MockIcon name="download" size={12} color={M.blueSoft} /> OT</MockButton>
        <MockButton small variant="orange"><MockIcon name="wrench" size={12} /> Hoja técnico</MockButton>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 12, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Card icon="car" title="Vehículo">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', rowGap: 9, columnGap: 10 }}>
              <Field label="Placa" value={VEHICLE.plate} />
              <Field label="Marca / Modelo" value={VEHICLE.model} />
              <Field label="Año" value={VEHICLE.year} />
              <Field label="Color" value={VEHICLE.color} />
              <Field label="Km entrada" value={km} />
              <Field label="Km salida" value="—" />
            </div>
          </Card>
          <Card icon="wrench" title="Trabajo">
            <div style={{ fontSize: 10, color: M.faint, marginBottom: 4 }}>Problema reportado</div>
            <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', fontSize: 12, minHeight: 16, marginBottom: 10 }}>
              {s.problema || '—'}
            </div>
            <div style={{ fontSize: 10, color: M.faint }}>Diagnóstico</div>
            <div style={{ fontSize: 11, color: M.muted, marginBottom: 8 }}>Sin diagnóstico registrado</div>
            <div style={{ fontSize: 10, color: M.faint }}>Trabajo realizado / Observaciones</div>
            <div style={{ fontSize: 11, color: M.muted }}>Sin trabajo/observaciones registradas</div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Card icon="user" title="Cliente">
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{CUSTOMER.name}</div>
            <div style={{ fontSize: 11, color: M.muted, marginTop: 2 }}>{CUSTOMER.phone}</div>
            <div style={{ fontSize: 11, color: M.muted }}>{CUSTOMER.email}</div>
          </Card>
          <Card icon="wrench" title="Técnico">
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.tecnico || '—'}</div>
          </Card>
          <Card icon="box" title="Bodega de repuestos">
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{WAREHOUSE}</div>
          </Card>
          <Card
            icon="clipboard" title="Inventario ingreso"
            right={<span style={{ fontSize: 11, color: '#C4B5FD', fontWeight: 600 }}>Completar</span>}
          >
            <div style={{ fontSize: 10.5, color: M.faint, marginBottom: 8 }}>No completado aún</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
              <MiniAction icon="printer">Imprimir ingreso</MiniAction>
              <MiniAction icon="download">OT PDF</MiniAction>
              <MiniAction id="btn-whatsapp" icon="message" tone="green">WhatsApp</MiniAction>
              <MiniAction icon="link">Copiar enlace</MiniAction>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Seguimiento público (WorkOrderPublicPage) ─────────────
 * Es la única pantalla en tema claro: así la ve el cliente en su celular.
 * publicStep: 0 Recibido · 1 En proceso · 2 Listo. */
const TRACK = ['Recibido', 'En proceso', 'Listo', 'Entregado'];
const PUBLIC_STATUS = [
  { tag: 'Recibido', color: '#3b82f6', bg: '#eff6ff', desc: 'Tu vehículo fue recibido en el taller.' },
  { tag: 'En proceso', color: '#f59e0b', bg: '#fffbeb', desc: 'Estamos trabajando en tu vehículo.' },
  { tag: '¡Listo!', color: '#10b981', bg: '#ecfdf5', desc: 'Tu vehículo está listo para ser recogido.' },
];

const pubCard = { background: '#fff', borderRadius: 10, padding: '9px 11px', boxShadow: '0 1px 2px rgba(15,23,42,0.05)', flexShrink: 0 };
const pubLabel = { fontSize: 7.5, fontWeight: 700, letterSpacing: 0.5, color: '#6b7280', textTransform: 'uppercase' };

function PubRow({ name, sub, price }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6 }}>
      <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#22c55e', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MockIcon name="check" size={7} color="#fff" strokeWidth={3.5} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 7.5, color: '#9ca3af' }}>{sub}</div>
      </div>
      <div style={{ fontSize: 9.5, fontWeight: 600 }}>{price}</div>
    </div>
  );
}

function PublicPhone({ step }) {
  const cfg = PUBLIC_STATUS[step] || PUBLIC_STATUS[0];
  return (
    <div style={{
      width: 250, margin: '10px auto 14px', background: '#f1f5f9', color: '#111827', borderRadius: 26,
      border: '6px solid #262A33', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#3b82f6', color: '#fff', padding: '10px 12px' }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MockIcon name="wrench" size={12} color="#fff" />
        </span>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700, fontSize: 11.5 }}>{WORKSHOP.name}</div>
          <div style={{ fontSize: 8.5, opacity: 0.85 }}>{WORKSHOP.phone}</div>
        </div>
      </div>

      <div style={{ height: 410, overflow: 'hidden', padding: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ ...pubCard, padding: 0, overflow: 'hidden' }}>
          <div style={{ background: cfg.bg, padding: '9px 11px', transition: 'background 0.4s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={pubLabel}>Orden de trabajo</span>
              <span style={{ fontSize: 8.5, fontWeight: 700, color: cfg.color }}>● {cfg.tag}</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, margin: '3px 0 2px' }}>{OT_NUMBER}</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: cfg.color }}>{cfg.desc}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 11px 9px' }}>
            {TRACK.map((label, i) => {
              const done = i < step;
              const current = i === step;
              const lit = i <= step;
              return (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {i > 0 && (
                    <span style={{
                      position: 'absolute', top: 6, right: '50%', width: '100%', height: 2,
                      background: lit ? '#2563eb' : '#e5e7eb', transition: 'background 0.4s',
                    }} />
                  )}
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%', zIndex: 1, boxSizing: 'border-box',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: lit ? '#2563eb' : '#e5e7eb',
                    boxShadow: current ? '0 0 0 3px rgba(37,99,235,0.22)' : 'none',
                    transition: 'background 0.4s, box-shadow 0.4s',
                  }}>
                    {done && <MockIcon name="check" size={8} color="#fff" strokeWidth={3.5} />}
                    {current && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                    {!lit && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#9ca3af' }} />}
                  </span>
                  <span style={{ fontSize: 7.5, marginTop: 4, color: lit ? '#2563eb' : '#9ca3af', fontWeight: lit ? 600 : 400 }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {step === 2 && (
          <div className="pbd-anim pbd-fade" style={pubCard}>
            <div style={pubLabel}>Repuestos y servicios</div>
            <div style={{ fontSize: 8, color: '#2563eb', marginTop: 6 }}>● Repuestos</div>
            {PUBLIC_ITEMS.parts.map((p) => (
              <PubRow key={p.name} name={p.name} sub={`x${p.qty} · IVA ${p.iva}`} price={p.price} />
            ))}
            <div style={{ fontSize: 8, color: '#059669', marginTop: 8 }}>● Servicios / Mano de obra</div>
            {PUBLIC_ITEMS.labor.map((l) => (
              <PubRow key={l.name} name={l.name} sub={`x${l.qty}`} price={l.price} />
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid #f3f4f6', fontSize: 10, fontWeight: 700 }}>
              <span>Total aprobado</span><span>{PUBLIC_ITEMS.total}</span>
            </div>
          </div>
        )}

        <div style={pubCard}>
          <div style={pubLabel}>Vehículo</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <div style={{ flex: 1.1, background: '#f8fafc', borderRadius: 7, padding: '5px 8px' }}>
              <div style={{ fontSize: 7.5, color: '#6b7280' }}>Placa</div>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, fontFamily: 'ui-monospace, Menlo, monospace' }}>{VEHICLE.plate}</div>
            </div>
            <div style={{ flex: 1, background: '#f8fafc', borderRadius: 7, padding: '5px 8px' }}>
              <div style={{ fontSize: 7.5, color: '#6b7280' }}>Marca / Modelo</div>
              <div style={{ fontSize: 9.5, fontWeight: 600, marginTop: 2 }}>{VEHICLE.model}</div>
            </div>
          </div>
        </div>

        <div style={{ ...pubCard, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MockIcon name="user" size={11} color="#2563eb" />
          </span>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: 7.5, color: '#6b7280' }}>Técnico asignado</div>
            <div style={{ fontSize: 10, fontWeight: 700 }}>{TECHNICIANS[0]}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MockOrdenTrabajo({ state: s, typing }) {
  const activeChild = s.view === 'form' ? 'Orden de Trabajo' : 'Histórico';
  return (
    <MockWindow sidebar={<MockSidebar active="taller" activeChild={activeChild} />}>
      {s.view === 'list' && <ListView />}
      {s.view === 'form' && <FormView s={s} typing={typing} />}
      {s.view === 'detail' && <DetailView s={s} />}
      <MockToast show={s.toast}>{s.toastText}</MockToast>
      <MockModal open={s.phone} width={310}>
        <div style={{ padding: '10px 0 0' }}>
          <div style={{ textAlign: 'center', fontSize: 11, color: M.muted }}>Lo que ve tu cliente · sin iniciar sesión</div>
          <PublicPhone step={s.publicStep} />
        </div>
      </MockModal>
    </MockWindow>
  );
}

/* ───────────── Guion ───────────── */

const steps = [
  // 1 · Abrir la orden desde el menú Taller
  { do: 'caption', text: 'Abre una orden en segundos' },
  { do: 'wait', ms: 400 },
  { do: 'click', on: 'nav-orden-de-trabajo', set: { view: 'form' } },
  { do: 'wait', ms: 300 },

  // 2 · Buscar el vehículo por placa
  { do: 'caption', text: 'Busca el vehículo por placa' },
  { do: 'type', into: 'veh-input', field: 'vehQuery', text: VEHICLE.plate },
  { do: 'set', patch: { vehOpen: true } },
  { do: 'wait', ms: 450 },
  { do: 'click', on: 'veh-option', set: { vehOpen: false, vehSel: true, vehQuery: `${VEHICLE.plate} · ${VEHICLE.label}` } },
  { do: 'wait', ms: 250 },

  // 3 · El propietario se completa solo
  { do: 'caption', text: 'El cliente se completa solo' },
  { do: 'set', patch: { cliente: CUSTOMER.name } },
  { do: 'highlight', on: 'cliente-input', ms: 1000 },

  // 4 · Kilometraje y fecha prometida (campos obligatorios de la app real)
  { do: 'caption', text: 'Anota el kilometraje y la fecha de entrega' },
  { do: 'type', into: 'km-input', field: 'mileage', text: '62400' },
  { do: 'click', on: 'fecha-input', set: { promised: '03/11/2026 04:00 p. m.' } },
  { do: 'wait', ms: 400 },

  // 5 · Técnico
  { do: 'caption', text: 'Asigna al técnico responsable' },
  { do: 'click', on: 'tecnico-input', set: { tecOpen: true } },
  { do: 'wait', ms: 400 },
  { do: 'click', on: 'tec-option', set: { tecOpen: false, tecnico: TECHNICIANS[0] } },
  { do: 'wait', ms: 250 },

  // 6 · Problema reportado
  { do: 'caption', text: 'Registra lo que reporta el cliente' },
  { do: 'type', into: 'problema-input', field: 'problema', text: PROBLEM, perChar: 38 },
  { do: 'wait', ms: 350 },

  // 7 · Crear la orden
  { do: 'caption', text: 'Orden creada con su número' },
  { do: 'click', on: 'btn-crear', set: { view: 'detail', toast: true, toastText: 'Orden creada', camFocus: { x: 500, y: 240 } } },
  { do: 'wait', ms: 1300 },
  { do: 'set', patch: { toast: false } },

  // 8 · Compartir el seguimiento (tarjeta "Inventario ingreso" → WhatsApp)
  { do: 'caption', text: 'Tu cliente sigue el estado desde su celular, sin iniciar sesión' },
  { do: 'set', patch: { camFocus: null } },
  { do: 'click', on: 'btn-whatsapp', set: { toast: true, toastText: 'Enlace de la orden enviado por WhatsApp' } },
  { do: 'wait', ms: 600 },
  { do: 'set', patch: { toast: false, phone: true } },
  { do: 'wait', ms: 1200 },
  { do: 'set', patch: { publicStep: 1 } },
  { do: 'wait', ms: 1300 },

  // 9 · Avance hasta "Listo", con lo aprobado
  { do: 'caption', text: 'Y se entera apenas su vehículo está listo' },
  { do: 'set', patch: { publicStep: 2 } },
  { do: 'wait', ms: 2400 },
];

const tourOrdenTrabajo = {
  id: 'orden-trabajo',
  title: 'Crear una orden de trabajo',
  module: 'Taller',
  audience: 'negocio',
  duration: 24,
  summary: 'Una orden de trabajo completa, con técnico y seguimiento para tu cliente, en menos de un minuto.',
  Screen: MockOrdenTrabajo,
  // Pantallas angostas: al abrir el celular del cliente la cámara lo enfoca completo.
  // `camFocus` (en el guion) fija la cámara mientras el cursor apunta a un elemento que ya no existe.
  camera: (s) => (s.phone ? { x: 480, y: 300, zoom: 0.6 } : s.camFocus || null),
  initialState: {
    view: 'list',
    vehQuery: '', vehOpen: false, vehSel: false,
    cliente: '', mileage: '', promised: '',
    tecOpen: false, tecnico: '',
    problema: '', camFocus: null,
    toast: false, toastText: '',
    phone: false, publicStep: 0,
  },
  steps,
};

export default tourOrdenTrabajo;
