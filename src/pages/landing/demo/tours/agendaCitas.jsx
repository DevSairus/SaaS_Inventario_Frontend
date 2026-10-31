/**
 * Tour · Agenda de citas con aviso al cliente (~16 s) — audiencia: cliente
 *
 * Referencia real:
 *   - Agenda   → pages/workshop/AppointmentsPage.jsx (encabezado "Agenda de citas", botones "Nueva cita",
 *                "Link de agenda", "Horarios"; calendario del mes; tarjetas con Confirmar / Recibir · Crear OT /
 *                Reagendar / Recordatorio / Cancelar; marca "Recordada" cuando se envía el recordatorio)
 *   - Nueva    → components/workshop/NewAppointmentModal.jsx (búsqueda por placa, cliente o teléfono;
 *                "Celular WhatsApp *"; horarios; "Motivo"; "Dejarla confirmada y avisar por WhatsApp")
 *
 * IMPORTANTE (verificado en el código): en la app el recordatorio NO se dispara solo desde el frontend:
 * es el botón "Recordatorio" de una cita confirmada (envía por WhatsApp Cloud API si el taller lo tiene
 * conectado; si no, abre un enlace de WhatsApp para que el asesor lo envíe). Por eso el guion muestra el
 * clic y no promete un envío automático. Si el backend programa recordatorios automáticos, se puede
 * cambiar el caption del paso del recordatorio.
 *
 * POR CONFIRMAR: el texto de los mensajes de WhatsApp (el backend arma las plantillas
 * 'confirmacion' / 'recordatorio'; los de aquí son ilustrativos).
 *
 * Simplificaciones (lienzo 960×600): la agenda no muestra los contadores del encabezado ni la lista
 * "Por confirmar"; el modal omite el selector de días y fija el martes 3 de noviembre.
 *
 * DATOS: todos ficticios.
 */
import { M, FONT_TITLE } from '../theme';
import MockWindow from '../mocks/MockWindow';
import MockSidebar from '../mocks/MockSidebar';
import MockInput from '../mocks/MockInput';
import MockButton from '../mocks/MockButton';
import MockToast from '../mocks/MockToast';
import MockModal from '../mocks/MockModal';
import MockDropdown from '../mocks/MockDropdown';
import MockIcon from '../mocks/MockIcon';
import { WaPhone } from '../mocks/MockPhone';

const WORKSHOP = 'Taller Demo';
const CUSTOMER = { name: 'Carlos Ruiz', phone: '300 000 0000' };
const VEHICLE = { plate: 'ABC123', label: 'Mazda 3 2022' };
const DAY_LONG = 'martes 3 de noviembre';
const SLOTS = [
  { t: '8:00 a. m.', off: true }, { t: '9:00 a. m.' }, { t: '10:00 a. m.' }, { t: '11:00 a. m.' },
  { t: '2:00 p. m.' }, { t: '3:00 p. m.' }, { t: '4:00 p. m.' },
];
const SKY = '#0284C7';

/* ───────────── Piezas locales ───────────── */

function Pill({ tone, children }) {
  const tones = {
    sky: ['rgba(14,165,233,0.16)', '#7DD3FC'], slate: ['rgba(148,163,184,0.14)', '#CBD5E1'], violet: ['rgba(139,92,246,0.16)', '#C4B5FD'],
  };
  const [bg, fg] = tones[tone] || tones.slate;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 100, fontSize: 10.5, fontWeight: 600, background: bg, color: fg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function Calendar() {
  // noviembre de 2026: el 1 cae domingo; semana desde el lunes.
  const cells = [26, 27, 28, 29, 30, 31, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 1, 2, 3, 4, 5, 6];
  const dots = { 3: '#0EA5E9', 5: '#F59E0B', 10: '#0EA5E9', 12: '#10B981' };
  return (
    <div style={{ background: M.panel, border: `1px solid ${M.border}`, borderRadius: 14, padding: '10px 10px 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 8px', fontSize: 12.5, fontWeight: 600 }}>
        <MockIcon name="arrowLeft" size={13} color={M.muted} /> noviembre 2026 <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><MockIcon name="arrowLeft" size={13} color={M.muted} /></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 2, textAlign: 'center' }}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i} style={{ fontSize: 9.5, color: M.faint, fontWeight: 600 }}>{d}</span>)}
        {cells.map((n, i) => {
          const inMonth = (i >= 6 && i < 36);
          const sel = inMonth && n === 3;
          return (
            <span key={i} style={{ position: 'relative', height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                background: sel ? SKY : 'transparent', color: sel ? '#fff' : inMonth ? M.text : M.faint, fontWeight: sel ? 700 : 500,
              }}>{n}</span>
              {inMonth && dots[n] && <span style={{ position: 'absolute', bottom: 0, width: 4, height: 4, borderRadius: '50%', background: dots[n] }} />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function AppointmentCard({ time, name, confirmed = true, plate, vehicle, service, reminded, fresh, btnIds }) {
  const ids = btnIds || {};
  return (
    <div
      data-demo-id={ids.card}
      className={fresh ? 'pbd-anim pbd-fade' : undefined}
      style={{ position: 'relative', background: M.panel, border: `1px solid ${M.border}`, borderRadius: 14, overflow: 'hidden', padding: '11px 14px 11px 18px', display: 'flex', gap: 14 }}
    >
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: confirmed ? '#0EA5E9' : '#F59E0B' }} />
      <div style={{ width: 62, textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.15 }}>{time}</div>
        <div style={{ fontSize: 10, color: M.faint, marginTop: 2 }}>45 min</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
          <Pill tone="sky">● {confirmed ? 'Confirmada' : 'Por confirmar'}</Pill>
          <span style={{ fontSize: 10.5, color: M.faint }}>Taller</span>
          {reminded && (
            <span className="pbd-anim pbd-fade" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: M.muted }}>
              <MockIcon name="bell" size={11} /> Recordada
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5, fontSize: 11, color: M.muted }}>
          <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700, color: '#FDE68A', background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.35)', borderRadius: 4, padding: '0 6px' }}>{plate}</span>
          <span>{vehicle}</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: M.muted, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '5px 9px' }}>{service}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <MockButton small style={{ background: '#059669', border: '1px solid transparent', color: '#fff' }}><MockIcon name="wrench" size={11} color="#fff" /> Recibir · Crear OT</MockButton>
          <MockButton small variant="ghost"><MockIcon name="calendar" size={11} /> Reagendar</MockButton>
          <MockButton small variant="ghost" id={ids.reminder}><MockIcon name="message" size={11} /> Recordatorio</MockButton>
          <MockButton small variant="ghost" style={{ border: '1px solid transparent', color: '#F87171' }}><MockIcon name="x" size={11} color="#F87171" /> Cancelar</MockButton>
        </div>
      </div>
    </div>
  );
}

function AgendaView({ s }) {
  const count = s.created ? 2 : 1;
  return (
    <div style={{ padding: '14px 20px' }}>
      <div style={{ borderRadius: 16, background: `linear-gradient(120deg, #0369A1, ${SKY} 55%, #0891B2)`, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: '0.08em', color: '#BAE6FD', fontWeight: 700 }}>TALLER · AGENDA</div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 19, fontWeight: 700, color: '#fff' }}>Agenda de citas</div>
          <div style={{ fontSize: 11, color: '#E0F2FE' }}>Confirma, reagenda y recibe a tus clientes.</div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <MockButton id="btn-nueva-cita" small style={{ background: '#fff', color: '#075985', border: '1px solid transparent' }}><MockIcon name="calendar" size={11} color="#075985" /> Nueva cita</MockButton>
          <MockButton id="btn-link-agenda" small style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid transparent' }}><MockIcon name="link" size={11} color="#fff" /> Link de agenda</MockButton>
          <MockButton small style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid transparent' }}><MockIcon name="clock" size={11} color="#fff" /> Horarios</MockButton>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 16, alignItems: 'start' }}>
        <Calendar />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div>
            <div style={{ fontSize: 9.5, color: M.faint, letterSpacing: '0.06em', fontWeight: 700 }}>DÍA SELECCIONADO</div>
            <div style={{ fontSize: 15, fontWeight: 600, textTransform: 'capitalize' }}>{DAY_LONG}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ padding: '4px 11px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: '#fff', color: '#0F172A' }}>Todas · {count}</span>
            <span style={{ padding: '4px 11px', borderRadius: 100, fontSize: 11, fontWeight: 600, border: `1px solid ${M.border2}`, color: M.muted }}>Confirmadas · {count}</span>
          </div>
          <AppointmentCard time="8:00 a. m." name="María Londoño" plate="DEF456" vehicle="Renault Duster" service="Cambio de aceite y filtro" />
          {s.created && (
            <AppointmentCard
              fresh time="9:00 a. m." name={CUSTOMER.name} plate={VEHICLE.plate} vehicle={VEHICLE.label}
              service={s.motivo} reminded={s.reminded} btnIds={{ card: 'card-nueva', reminder: 'btn-recordatorio' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function NewApptBody({ s, typing }) {
  const filled = s.vehSel;
  return (
    <div>
      <div style={{ background: `linear-gradient(120deg, #0369A1, ${SKY})`, padding: '10px 16px', color: '#fff' }}>
        <div style={{ fontFamily: FONT_TITLE, fontWeight: 700, fontSize: 15 }}>Nueva cita</div>
        <div style={{ fontSize: 10.5, color: '#E0F2FE', textTransform: s.slot ? 'capitalize' : 'none' }}>
          {s.slot ? `${DAY_LONG} · ${s.slot}` : 'Cliente, horario y motivo.'}
        </div>
      </div>
      <div style={{ padding: '10px 16px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ fontSize: 9.5, color: M.faint, letterSpacing: '0.06em', fontWeight: 700 }}>CLIENTE Y VEHÍCULO</div>
        <div style={{ position: 'relative' }}>
          <MockInput
            id="veh-input" placeholder="Buscar por placa, cliente o teléfono…" value={s.vehQuery} typing={typing === 'vehQuery'}
            state={filled ? 'ok' : 'normal'} leading={<MockIcon name="search" size={13} color={M.faint} />}
          />
          <MockDropdown open={s.vehOpen}>
            <div data-demo-id="veh-option" style={{ padding: '8px 10px', background: M.blueBg, display: 'flex', alignItems: 'center', gap: 8 }}>
              <b style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>{VEHICLE.plate}</b>
              <span style={{ fontSize: 11, color: M.muted }}>{VEHICLE.label} · {CUSTOMER.name}</span>
            </div>
          </MockDropdown>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <MockInput placeholder="Nombre del cliente *" value={filled ? CUSTOMER.name : ''} />
          <MockInput placeholder="Celular WhatsApp *" value={filled ? CUSTOMER.phone : ''} />
          <MockInput placeholder="Placa" value={filled ? VEHICLE.plate : ''} />
          <MockInput placeholder="Marca / modelo" value={filled ? VEHICLE.label : ''} />
        </div>

        <div style={{ fontSize: 9.5, color: M.faint, letterSpacing: '0.06em', fontWeight: 700, marginTop: 2 }}>FECHA Y HORA · {DAY_LONG.toUpperCase()}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SLOTS.map((sl) => {
            const on = s.slot === sl.t;
            return (
              <span
                key={sl.t}
                data-demo-id={sl.t === '9:00 a. m.' ? 'slot-9' : undefined}
                style={{
                  padding: '6px 11px', borderRadius: 9, fontSize: 11.5, fontWeight: 600,
                  border: `1px solid ${on ? SKY : M.border2}`, background: on ? SKY : 'transparent',
                  color: sl.off ? M.faint : on ? '#fff' : M.text, textDecoration: sl.off ? 'line-through' : 'none',
                }}
              >
                {sl.t}
              </span>
            );
          })}
        </div>

        <MockInput id="motivo-input" placeholder="Motivo: cambio de aceite, revisión de frenos…" value={s.motivo} typing={typing === 'motivo'} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span data-demo-id="chk-notify" style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${s.notify ? SKY : M.faint}`, background: s.notify ? SKY : 'transparent' }}>
            {s.notify && <MockIcon name="check" size={10} color="#fff" strokeWidth={3} />}
          </span>
          <span style={{ fontSize: 12 }}>Dejarla confirmada y avisar por WhatsApp</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
          <MockButton variant="ghost" style={{ flex: 1 }}>Cancelar</MockButton>
          <MockButton id="btn-crear-cita" style={{ flex: 2, background: SKY }}><MockIcon name="calendar" size={13} color="#fff" /> Crear cita</MockButton>
        </div>
      </div>
    </div>
  );
}

function PhoneBody({ s }) {
  const all = [
    {
      text: `Hola ${CUSTOMER.name.split(' ')[0]}, tu cita en ${WORKSHOP} quedó confirmada para el ${DAY_LONG} a las 9:00 a. m. Te esperamos con tu Mazda 3.`,
      time: '10:20 a. m.',
      card: { title: 'Cita confirmada', sub: `${DAY_LONG} · 9:00 a. m.` },
    },
    {
      text: `Recordatorio: tienes cita en ${WORKSHOP} el ${DAY_LONG} a las 9:00 a. m. ¡Te esperamos!`,
      time: '2 nov, 4:00 p. m.',
      card: { title: 'Recordatorio de cita', sub: `${DAY_LONG} · 9:00 a. m.` },
    },
  ];
  return <WaPhone name={WORKSHOP} width={270} height={400} messages={all.slice(0, s.waMsgs)} />;
}

/* ───────────── Pantalla ───────────── */

export function MockAgenda({ state: s, typing }) {
  return (
    <MockWindow sidebar={<MockSidebar active="taller" activeChild="Agenda de citas" />}>
      <AgendaView s={s} />
      <MockToast show={s.toast}>{s.toastText}</MockToast>
      <MockModal open={s.newOpen} width={560}><NewApptBody s={s} typing={typing} /></MockModal>
      <MockModal open={s.phone} width={330}>
        <div style={{ padding: '10px 0 0' }}>
          <div style={{ textAlign: 'center', fontSize: 11, color: M.muted }}>Lo que recibe tu cliente en su WhatsApp</div>
          <PhoneBody s={s} />
        </div>
      </MockModal>
    </MockWindow>
  );
}

/* ───────────── Guion ───────────── */

const steps = [
  { do: 'caption', text: 'Agenda una cita en segundos' },
  { do: 'wait', ms: 500 },
  { do: 'click', on: 'btn-nueva-cita', set: { newOpen: true } },
  { do: 'type', into: 'veh-input', field: 'vehQuery', text: VEHICLE.plate, perChar: 70 },
  { do: 'set', patch: { vehOpen: true } },
  { do: 'click', on: 'veh-option', set: { vehOpen: false, vehSel: true, vehQuery: `${VEHICLE.plate} · ${VEHICLE.label}` } },

  { do: 'caption', text: 'Elige el horario libre y el motivo' },
  { do: 'click', on: 'slot-9', set: { slot: '9:00 a. m.' } },
  { do: 'type', into: 'motivo-input', field: 'motivo', text: 'Revisión de frenos', perChar: 35 },

  { do: 'caption', text: 'Marca avisar por WhatsApp y listo' },
  { do: 'click', on: 'chk-notify', set: { notify: true } },
  { do: 'click', on: 'btn-crear-cita', set: { newOpen: false, created: true, toast: true, toastText: 'Cita creada · aviso enviado por WhatsApp' } },
  { do: 'wait', ms: 700 },

  { do: 'caption', text: 'Tu cliente recibe la confirmación en su WhatsApp' },
  { do: 'set', patch: { toast: false, phone: true, waMsgs: 1 } },
  { do: 'wait', ms: 2200 },

  { do: 'caption', text: 'Y un recordatorio antes de la cita, con un clic' },
  { do: 'set', patch: { phone: false } },
  { do: 'wait', ms: 250 },
  { do: 'click', on: 'btn-recordatorio', set: { reminded: true, toast: true, toastText: 'Recordatorio enviado por WhatsApp' } },
  { do: 'wait', ms: 500 },
  { do: 'set', patch: { toast: false, phone: true, waMsgs: 2 } },
  { do: 'wait', ms: 2200 },
];

const tourAgendaCitas = {
  id: 'agenda-citas',
  title: 'Agenda de citas con aviso por WhatsApp',
  module: 'Taller · Agenda',
  audience: 'cliente',
  duration: 16,
  summary: 'Agendas la cita y tu cliente recibe la confirmación y el recordatorio en su WhatsApp, sin llamadas ni olvidos.',
  Screen: MockAgenda,
  camera: (s) => (s.phone ? { x: 480, y: 300, zoom: 0.6 } : null),
  initialState: {
    newOpen: false, vehQuery: '', vehOpen: false, vehSel: false, slot: null, motivo: '', notify: false,
    created: false, reminded: false, toast: false, toastText: '', phone: false, waMsgs: 1,
  },
  steps,
};

export default tourAgendaCitas;
