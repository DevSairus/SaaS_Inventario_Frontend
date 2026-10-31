/**
 * Tour · Seguimiento público de la orden (~16 s) — audiencia: cliente
 *
 * Referencia real: pages/workshop/WorkOrderPublicPage.jsx
 *   - Estados y textos (STATUS_CONFIG): Recibido · En proceso · En espera · ¡Listo! · Entregado.
 *   - "Repuestos y servicios": lo aprobado con check verde y lo nuevo con el rótulo
 *     "Nuevo, pendiente de tu aprobación", casilla, "Nuevo total si apruebas lo pendiente",
 *     nombre + documento y botón "Enviar mi decisión".
 *
 * Diferencia con el tour "Crear una orden de trabajo" (que termina en esta página): aquí la
 * historia es la del cliente. Recibe el enlace, ve el avance y aprueba un repuesto adicional sin
 * llamar al taller. Si se quiere evitar repetición, se pueden recortar los pasos 8 y 9 de ese tour.
 *
 * DISEÑO: la izquierda es un registro de "lo que hace el taller" (eventos), no una pantalla de la
 * app. No se dibuja el selector de estado de la OT porque no hay captura de esa UI. La derecha es
 * el celular del cliente.
 *
 * POR CONFIRMAR: que la página pública se actualice sola o solo al recargar (el guion dice "lo ve
 * tu cliente en su enlace", sin prometer tiempo real); texto del mensaje de WhatsApp (ilustrativo).
 *
 * DATOS: todos ficticios. Mismos de los tours de RUNT / orden de trabajo (Carlos Ruiz, ABC123).
 */
import { M, FONT_TITLE } from '../theme';
import MockWindow from '../mocks/MockWindow';
import MockIcon from '../mocks/MockIcon';
import MockPhone, { PhoneField, WaPhone, pubCard, pubLabel } from '../mocks/MockPhone';

const OT_NUMBER = 'DEM-OT-0042';
const WORKSHOP = { name: 'Taller Demo', phone: '300 000 0000' };
const CUSTOMER = { name: 'Carlos Ruiz', doc: '1.000.000.001' };
const VEHICLE = { plate: 'ABC123', model: 'Mazda 3' };
const TECHNICIAN = 'Andrés Mejía';

const fmt = (n) => `$ ${Number(n).toLocaleString('es-CO')}`;
const APPROVED = [
  { name: 'Pastillas de freno', sub: 'x1 · IVA $ 19.000', total: 119000 },
  { name: 'Mano de obra — Frenos', sub: 'x1', total: 80000 },
];
const EXTRA = { name: 'Líquido de frenos', sub: 'x1 · IVA $ 5.700', total: 35700 };
const BASE_TOTAL = 199000;

/* phase: 0 chat · 1 recibido · 2 en proceso · 3 pendiente de aprobación · 4 aprobado · 5 listo */
const STATUS = [
  null,
  { tag: 'Recibido', color: '#3b82f6', bg: '#eff6ff', desc: 'Tu vehículo fue recibido en el taller.', step: 0 },
  { tag: 'En proceso', color: '#f59e0b', bg: '#fffbeb', desc: 'Estamos trabajando en tu vehículo.', step: 1 },
  { tag: 'En espera', color: '#f97316', bg: '#fff7ed', desc: 'Esperando repuesto o aprobación.', step: 1 },
  { tag: 'En proceso', color: '#f59e0b', bg: '#fffbeb', desc: 'Estamos trabajando en tu vehículo.', step: 1 },
  { tag: '¡Listo!', color: '#10b981', bg: '#ecfdf5', desc: 'Tu vehículo está listo para ser recogido.', step: 2 },
];
const TRACK = ['Recibido', 'En proceso', 'Listo', 'Entregado'];

/* ───────────── Registro del taller (izquierda) ───────────── */

const FEED = [
  { at: 1, time: '10:05', icon: 'clipboard', text: 'Orden creada y enlace enviado por WhatsApp', tone: M.blueSoft },
  { at: 2, time: '11:20', icon: 'wrench', text: `${TECHNICIAN} empezó a trabajar`, tone: M.amber },
  { at: 3, time: '2:40', icon: 'plus', text: `Repuesto adicional enviado a aprobación · ${fmt(EXTRA.total)}`, tone: M.orange },
  { at: 4, time: '2:48', icon: 'check', text: `${CUSTOMER.name} aprobó el repuesto`, tone: M.green },
  { at: 5, time: '4:10', icon: 'shield', text: 'Vehículo listo para entregar', tone: M.green },
];

function WorkshopFeed({ phase }) {
  return (
    <div style={{ width: 360, flexShrink: 0, padding: '24px 0 0 26px' }}>
      <div style={{ fontSize: 10.5, color: M.faint, letterSpacing: '0.08em', fontWeight: 700 }}>LO QUE HACE EL TALLER</div>
      <div style={{ fontFamily: FONT_TITLE, fontSize: 21, fontWeight: 700, margin: '4px 0 2px' }}>{OT_NUMBER}</div>
      <div style={{ fontSize: 12, color: M.muted, marginBottom: 18 }}>{VEHICLE.model} · {VEHICLE.plate} · {CUSTOMER.name}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FEED.map((e) => {
          const on = phase >= e.at;
          return (
            <div
              key={e.at}
              className={on ? 'pbd-anim pbd-fade' : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
                background: M.panel, border: `1px solid ${M.border}`,
                opacity: on ? 1 : 0.18, transition: 'opacity 0.3s',
              }}
            >
              <span style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MockIcon name={e.icon} size={13} color={e.tone} />
              </span>
              <span style={{ fontSize: 12, lineHeight: 1.3, flex: 1 }}>{e.text}</span>
              <span style={{ fontSize: 10.5, color: M.faint }}>{e.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── Celular del cliente (derecha) ───────────── */

function ItemRow({ name, sub, total, pending, checked, approved }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6, padding: pending ? '4px 5px' : 0, borderRadius: 6, background: pending ? '#fffbeb' : 'transparent' }}>
      {pending && !approved ? (
        <span style={{ width: 11, height: 11, borderRadius: 3, border: '1.5px solid #9ca3af', background: checked ? '#2563eb' : '#fff', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {checked && <MockIcon name="check" size={7} color="#fff" strokeWidth={3.5} />}
        </span>
      ) : (
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#22c55e', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MockIcon name="check" size={7} color="#fff" strokeWidth={3.5} />
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 7.5, color: '#9ca3af' }}>
          {sub}{pending && !approved && <span style={{ color: '#2563eb', fontWeight: 600 }}> · Nuevo, pendiente de tu aprobación</span>}
        </div>
      </div>
      <div style={{ fontSize: 9.5, fontWeight: 600 }}>{fmt(total)}</div>
    </div>
  );
}

function TrackingPage({ s, typing }) {
  const cfg = STATUS[s.phase] || STATUS[1];
  const pendingBox = s.phase === 3;
  const hasExtra = s.phase >= 3;
  const extraApproved = s.phase >= 4;
  const total = BASE_TOTAL + (extraApproved ? EXTRA.total : 0);
  return (
    <>
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
            const done = i < cfg.step;
            const current = i === cfg.step;
            const lit = i <= cfg.step;
            return (
              <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {i > 0 && <span style={{ position: 'absolute', top: 6, right: '50%', width: '100%', height: 2, background: lit ? '#2563eb' : '#e5e7eb', transition: 'background 0.4s' }} />}
                <span style={{
                  width: 14, height: 14, borderRadius: '50%', zIndex: 1, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: lit ? '#2563eb' : '#e5e7eb', boxShadow: current ? '0 0 0 3px rgba(37,99,235,0.22)' : 'none', transition: 'background 0.4s, box-shadow 0.4s',
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

      {s.phase >= 2 && (
        <div className="pbd-anim pbd-fade" style={{ ...pubCard, border: pendingBox ? '2px solid #2563eb' : '2px solid transparent' }}>
          <div style={pubLabel}>Repuestos y servicios</div>
          {APPROVED.map((i) => <ItemRow key={i.name} {...i} />)}
          {hasExtra && <ItemRow {...EXTRA} pending checked approved={extraApproved} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, paddingTop: 5, borderTop: '1px solid #f3f4f6', fontSize: 10, fontWeight: 700 }}>
            <span>{pendingBox ? 'Nuevo total si apruebas lo pendiente' : 'Total aprobado'}</span>
            <span style={{ color: pendingBox ? '#2563eb' : '#111827' }}>{fmt(pendingBox ? BASE_TOTAL + EXTRA.total : total)}</span>
          </div>
          {pendingBox && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 7 }}>
              <PhoneField id="pname" placeholder="Nombre completo" value={s.pname} typing={typing === 'pname'} />
              <PhoneField id="pdoc" placeholder="Documento de identidad (cédula)" value={s.pdoc} typing={typing === 'pdoc'} />
              <div data-demo-id="btn-enviar" style={{ textAlign: 'center', background: '#2563eb', color: '#fff', borderRadius: 6, padding: '6px 0', fontSize: 9, fontWeight: 700 }}>
                Enviar mi decisión
              </div>
            </div>
          )}
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
    </>
  );
}

function CustomerPhone({ s, typing }) {
  if (s.phase === 0) {
    return (
      <WaPhone
        name={WORKSHOP.name} width={270} height={440}
        messages={[{
          text: `Hola ${CUSTOMER.name.split(' ')[0]}, recibimos tu ${VEHICLE.model}. Sigue el estado de tu vehículo desde este enlace, sin llamar al taller.`,
          time: '10:06 a. m.',
          card: { title: `Orden ${OT_NUMBER}`, sub: `${VEHICLE.model} · ${VEHICLE.plate}`, link: 'pitbox.app/orden/demo' },
        }]}
      />
    );
  }
  return (
    <MockPhone title={WORKSHOP.name} subtitle={WORKSHOP.phone} width={270} height={440} icon="wrench">
      <TrackingPage s={s} typing={typing} />
    </MockPhone>
  );
}

/* ───────────── Pantalla ───────────── */

export function MockSeguimiento({ state: s, typing }) {
  return (
    <MockWindow title="pitbox.app · seguimiento de la orden">
      <div style={{ display: 'flex', position: 'absolute', inset: 0 }}>
        <WorkshopFeed phase={s.phase} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 10.5, color: M.faint, letterSpacing: '0.08em', fontWeight: 700, marginTop: 6 }}>LO QUE VE TU CLIENTE EN SU CELULAR</div>
          <CustomerPhone s={s} typing={typing} />
        </div>
      </div>
    </MockWindow>
  );
}

/* ───────────── Guion ───────────── */

const steps = [
  { do: 'caption', text: 'Tu cliente recibe un enlace por WhatsApp' },
  { do: 'set', patch: { phase: 0 } },
  { do: 'wait', ms: 1400 },
  { do: 'click', on: 'wa-link', set: { phase: 1 } },
  { do: 'wait', ms: 900 },

  { do: 'caption', text: 'Ve en qué etapa va su vehículo, sin llamar' },
  { do: 'wait', ms: 700 },
  { do: 'set', patch: { phase: 2 } },
  { do: 'wait', ms: 2200 },

  { do: 'caption', text: 'Si falta aprobar un repuesto, lo decide desde ahí' },
  { do: 'set', patch: { phase: 3 } },
  { do: 'wait', ms: 1200 },
  { do: 'type', into: 'pname', field: 'pname', text: CUSTOMER.name, perChar: 40 },
  { do: 'type', into: 'pdoc', field: 'pdoc', text: CUSTOMER.doc, perChar: 40 },
  { do: 'click', on: 'btn-enviar', set: { phase: 4 } },
  { do: 'wait', ms: 1400 },

  { do: 'caption', text: 'Y se entera apenas su vehículo está listo' },
  { do: 'set', patch: { phase: 5 } },
  { do: 'wait', ms: 2800 },
];

const tourSeguimientoOrden = {
  id: 'seguimiento-orden',
  title: 'Seguimiento público de la orden',
  module: 'Taller',
  audience: 'cliente',
  duration: 16,
  summary: 'Tu cliente sigue su vehículo desde el celular, aprueba repuestos adicionales y se entera cuando está listo, sin llamar al taller.',
  Screen: MockSeguimiento,
  camera: () => ({ x: 660, y: 300, zoom: 0.78 }),
  initialState: { phase: 0, pname: '', pdoc: '' },
  steps,
};

export default tourSeguimientoOrden;
