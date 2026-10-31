/**
 * Tour · Registrar un vehículo con el RUNT (~21 s)
 *
 * Es el PRIMER recorrido del menú: primero se registra el vehículo, luego se abre la orden
 * de trabajo (tour OT) y al final se factura (tour factura). Los tres comparten datos:
 * Mazda 3 · ABC123 · Carlos Ruiz.
 *
 * Referencia real (estructura y textos, NO datos):
 *   - Listado + modal → pages/workshop/VehiclesPage.jsx ("Vehículos", "Nuevo vehículo",
 *                       botón "Consultar RUNT", "Propietario (cliente)", toast "Vehículo registrado")
 *   - Consulta        → components/workshop/RuntConsultaModal.jsx (aviso de privacidad, Placa,
 *                       Tipo doc., Número de documento, CAPTCHA, "Consultar RUNT", "Consultando...")
 *   - Al terminar la consulta la app llama onConfirm y rellena el formulario sin paso intermedio
 *     (toast "Datos RUNT cargados — incluye SOAT y Tecno."): por eso este tour NO tiene pantalla
 *     de "confirmar resultado" como decía el plan original.
 *
 * Simplificaciones deliberadas: el formulario omite VIN; el CAPTCHA es una imagen dibujada
 * (no es uno real) y no se reproduce ningún logo oficial. Todo el contenido es ficticio.
 */
import { M, FONT_TITLE } from '../theme';
import MockWindow from '../mocks/MockWindow';
import MockSidebar from '../mocks/MockSidebar';
import MockInput from '../mocks/MockInput';
import MockButton from '../mocks/MockButton';
import MockTable from '../mocks/MockTable';
import MockToast from '../mocks/MockToast';
import MockModal from '../mocks/MockModal';
import MockDropdown from '../mocks/MockDropdown';
import MockIcon from '../mocks/MockIcon';

const PLATE = 'ABC123';
const OWNER_DOC = '1000000001';
const CAPTCHA = 'K7mQ2';
const VEHICLE = {
  year: '2022', type: 'Automóvil', brand: 'Mazda', model: '3', color: 'Gris', fuel: 'Gasolina',
  engine: '2.0L', engineNumber: 'MOT-0000001',
  soatNumber: 'SOAT-000123', soatExpiry: '15/03/2027',
  tecnoNumber: 'RTM-000456', tecnoExpiry: '20/05/2027',
};
const OWNER = { name: 'Carlos Ruiz', phone: '300 000 0000' };
const SCROLL = 236; // desplazamiento del cuerpo del modal al "bajar" hasta SOAT / propietario

const Label = ({ children }) => <div style={{ fontSize: 11, fontWeight: 600, color: M.muted, marginBottom: 4 }}>{children}</div>;
const Chevron = () => <span style={{ color: M.faint, fontSize: 10 }}>▾</span>;

/* ───────────── Listado de vehículos ───────────── */

function ListView({ s }) {
  const rows = [
    ...(s.created ? [{
      id: 'row-nuevo',
      cells: {
        placa: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <b style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{PLATE}</b>
          <span style={{ fontSize: 9.5, color: M.faint, background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>{VEHICLE.fuel}</span>
        </span>,
        veh: <span><b style={{ fontWeight: 600 }}>{VEHICLE.brand} {VEHICLE.model}</b><br /><span style={{ fontSize: 10.5, color: M.faint }}>{VEHICLE.year} · {VEHICLE.color}</span></span>,
        prop: OWNER.name, km: '—',
      },
    }] : []),
    {
      cells: {
        placa: <b style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>DEF456</b>,
        veh: <span><b style={{ fontWeight: 600 }}>Renault Duster</b><br /><span style={{ fontSize: 10.5, color: M.faint }}>2021 · Blanco</span></span>,
        prop: 'María Londoño', km: '48.000 km',
      },
    },
    {
      cells: {
        placa: <b style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>GHJ321</b>,
        veh: <span><b style={{ fontWeight: 600 }}>Chevrolet Spark</b><br /><span style={{ fontSize: 10.5, color: M.faint }}>2019 · Rojo</span></span>,
        prop: 'Pedro Ospina', km: '—',
      },
    },
  ];
  return (
    <div style={{ padding: '18px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: M.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MockIcon name="car" size={17} color="#fff" />
          </span>
          <div>
            <div style={{ fontFamily: FONT_TITLE, fontSize: 19, fontWeight: 700 }}>Vehículos</div>
            <div style={{ fontSize: 11.5, color: M.muted }}>{rows.length} registrados</div>
          </div>
        </div>
        <MockButton id="btn-nuevo-vehiculo"><MockIcon name="plus" size={13} color="#fff" /> Nuevo vehículo</MockButton>
      </div>
      <div style={{ marginBottom: 12 }}>
        <MockInput placeholder="Buscar por placa, marca o modelo..." leading={<MockIcon name="search" size={13} color={M.faint} />} />
      </div>
      <MockTable
        columns={[
          { key: 'placa', label: 'Placa', width: 1.3 },
          { key: 'veh', label: 'Vehículo', width: 1.6 },
          { key: 'prop', label: 'Propietario', width: 1.3 },
          { key: 'km', label: 'Km', width: 0.8 },
        ]}
        rows={rows.map((r) => ({ id: r.id, cells: r.cells }))}
      />
    </div>
  );
}

/* ───────────── Modal "Nuevo vehículo" ───────────── */

function NewVehicleModal({ s, typing }) {
  const f = s.filled;
  const ok = (v) => (v ? 'ok' : 'normal');
  const docCard = (title, a, b, aVal, bVal) => (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 10px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: M.muted, marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MockInput label={a} value={aVal} state={ok(aVal)} />
        <MockInput label={b} value={bVal} state={ok(bVal)} />
      </div>
    </div>
  );
  return (
    <div style={{ width: 470 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: `1px solid ${M.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
          <MockIcon name="car" size={16} color={M.blueSoft} /> Nuevo vehículo
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MockButton id="btn-runt" variant="orange" small><MockIcon name="search" size={11} /> Consultar RUNT</MockButton>
          <MockIcon name="x" size={15} color={M.faint} />
        </div>
      </div>

      <div style={{ height: 360, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px 64px', display: 'flex', flexDirection: 'column', gap: 9, transform: `translateY(${s.scrolled ? -SCROLL : 0}px)` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MockInput label="Placa *" placeholder="ABC123" value={f ? PLATE : ''} state={ok(f)} mono />
            <MockInput label="Año modelo" placeholder="2020" value={f ? VEHICLE.year : ''} state={ok(f)} />
          </div>
          <MockInput label="Tipo de vehículo" value={VEHICLE.type} trailing={<Chevron />} />
          <div data-demo-id="veh-datos" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <MockInput label="Marca" placeholder="Chevrolet" value={f ? VEHICLE.brand : ''} state={ok(f)} />
              <MockInput label="Línea / Modelo" placeholder="Spark" value={f ? VEHICLE.model : ''} state={ok(f)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <MockInput label="Color" placeholder="Blanco" value={f ? VEHICLE.color : ''} state={ok(f)} />
              <MockInput label="Combustible" value={VEHICLE.fuel} trailing={<Chevron />} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <MockInput label="Cilindraje / Tipo motor" placeholder="Ej: 150cc, 1.6L" value={f ? VEHICLE.engine : ''} state={ok(f)} />
              <MockInput label="N° Motor" placeholder="Motor serial" value={f ? VEHICLE.engineNumber : ''} state={ok(f)} mono />
            </div>
          </div>
          <div data-demo-id="docs-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docCard('SOAT', 'N° póliza', 'Vencimiento', f ? VEHICLE.soatNumber : '', f ? VEHICLE.soatExpiry : '')}
            {docCard('Tecnomecánica', 'N° certificado', 'Vencimiento', f ? VEHICLE.tecnoNumber : '', f ? VEHICLE.tecnoExpiry : '')}
          </div>
          <div style={{ position: 'relative' }}>
            {s.owner ? (
              <>
                <Label>Propietario (cliente)</Label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderRadius: 8, background: M.blueBg, border: '1px solid rgba(96,165,250,0.35)' }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#93C5FD' }}>{OWNER.name}</div>
                    <div style={{ fontSize: 10.5, color: M.blueSoft }}>{OWNER.phone}</div>
                  </div>
                  <MockIcon name="x" size={12} color={M.blueSoft} />
                </div>
              </>
            ) : (
              <>
                <MockInput
                  id="owner-input" label="Propietario (cliente)" placeholder="Buscar cliente por nombre o teléfono..."
                  value={s.ownerQuery} typing={typing === 'ownerQuery'}
                />
                <MockDropdown open={s.ownerOpen}>
                  <div data-demo-id="owner-option" style={{ padding: '8px 10px', background: M.blueBg }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{OWNER.name}</div>
                    <div style={{ fontSize: 10.5, color: M.muted }}>{OWNER.phone}</div>
                  </div>
                </MockDropdown>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 18px', borderTop: `1px solid ${M.border}` }}>
        <MockButton variant="ghost">Cancelar</MockButton>
        <MockButton id="btn-crear-vehiculo" disabled={!s.filled}><MockIcon name="save" size={13} color="#fff" /> Crear vehículo</MockButton>
      </div>
    </div>
  );
}

/* ───────────── Modal "Consultar RUNT" ───────────── */

/* CAPTCHA de adorno: texto distorsionado sobre fondo claro (no es un CAPTCHA real). */
function FakeCaptcha() {
  return (
    <svg width="150" height="52" viewBox="0 0 150 52" aria-hidden="true" style={{ display: 'block', background: '#E5E7EB', borderRadius: 7 }}>
      <path d="M0 18 C30 5 60 40 150 14" stroke="#9CA3AF" strokeWidth="1.2" fill="none" />
      <path d="M0 40 C40 50 90 18 150 38" stroke="#9CA3AF" strokeWidth="1.2" fill="none" />
      {CAPTCHA.split('').map((ch, i) => (
        <text
          key={i} x={14 + i * 25} y={34 + (i % 2 ? -3 : 3)} fontSize={26 + (i % 3) * 2} fontWeight="800"
          fontFamily="Georgia, 'Times New Roman', serif" fill="#1F2937" transform={`rotate(${(i % 2 ? 7 : -8)} ${18 + i * 25} 28)`}
        >{ch}</text>
      ))}
    </svg>
  );
}

function RuntBody({ s, typing }) {
  return (
    <div style={{ width: 400 }}>
      <div style={{ background: '#111827', padding: '11px 18px', color: '#fff' }}>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>🔎 Consultar RUNT</div>
        {s.rPlaca && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Placa: <b style={{ color: '#fff', fontFamily: 'ui-monospace, Menlo, monospace' }}>{s.rPlaca}</b></div>}
      </div>
      <div style={{ padding: '14px 18px 4px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div
          data-demo-id="runt-privacy"
          style={{ padding: '7px 10px', borderRadius: 8, fontSize: 11, color: '#93C5FD', background: 'rgba(59,130,246,0.14)', border: '1px solid rgba(96,165,250,0.3)' }}
        >
          🔒 El documento del propietario <b>no se almacena</b> — solo se usa para esta consulta.
        </div>
        <MockInput
          id="runt-placa" label="Placa del vehículo *" placeholder="Ej: ABC123" mono
          value={s.rPlaca} typing={typing === 'rPlaca'} state={s.rPlaca ? 'ok' : 'normal'}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 104 }}><MockInput label="Tipo doc." value="Cédula" trailing={<Chevron />} /></div>
          <div style={{ flex: 1 }}>
            <MockInput
              id="runt-doc" label="Número de documento *" placeholder="Ej: 92549045"
              value={s.rDoc} typing={typing === 'rDoc'} state={s.rDoc ? 'ok' : 'normal'}
            />
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: M.muted }}>CAPTCHA *</span>
            <span style={{ fontSize: 11, color: M.blueSoft }}>↻ Nuevo captcha</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FakeCaptcha />
            <div style={{ flex: 1 }}>
              <MockInput
                id="runt-captcha" placeholder="Ej: HvV4P" mono
                value={s.rCaptcha} typing={typing === 'rCaptcha'} state={s.rCaptcha ? 'ok' : 'normal'}
              />
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: M.faint, marginTop: 4 }}>Escribe los caracteres que ves en la imagen</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '10px 18px 16px' }}>
        <MockButton variant="ghost" style={{ flex: 1 }}>Cancelar</MockButton>
        <MockButton id="btn-consultar" style={{ flex: 1, opacity: s.loading ? 0.8 : 1 }}>
          {s.loading ? '⟳ Consultando...' : <><MockIcon name="search" size={13} color="#fff" /> Consultar RUNT</>}
        </MockButton>
      </div>
    </div>
  );
}

/* ───────────── Pantalla ───────────── */

export function MockConsultaRunt({ state: s, typing }) {
  return (
    <MockWindow sidebar={<MockSidebar active="taller" activeChild="Vehículos" />}>
      <ListView s={s} />
      <MockToast show={s.toast}>{s.toastText}</MockToast>
      <MockModal open={s.modal} width={470}><NewVehicleModal s={s} typing={typing} /></MockModal>
      <MockModal open={s.runt} width={400}><RuntBody s={s} typing={typing} /></MockModal>
    </MockWindow>
  );
}

/* ───────────── Guion ───────────── */

const steps = [
  // 1 · Abrir el formulario y el RUNT
  { do: 'caption', text: '¿Vehículo nuevo? No lo digites a mano' },
  { do: 'wait', ms: 300 },
  { do: 'click', on: 'btn-nuevo-vehiculo', set: { modal: true } },
  { do: 'wait', ms: 400 },
  { do: 'click', on: 'btn-runt', set: { runt: true } },
  { do: 'wait', ms: 300 },

  // 2 · Placa
  { do: 'caption', text: 'Escribe la placa' },
  { do: 'type', into: 'runt-placa', field: 'rPlaca', text: PLATE, perChar: 90 },
  { do: 'wait', ms: 200 },

  // 3 · Documento del propietario
  { do: 'caption', text: 'Y el documento del propietario' },
  { do: 'type', into: 'runt-doc', field: 'rDoc', text: OWNER_DOC, perChar: 55 },
  { do: 'wait', ms: 200 },

  // 4 · Privacidad
  { do: 'caption', text: 'El documento no se almacena' },
  { do: 'highlight', on: 'runt-privacy', ms: 1500 },

  // 5 · Captcha y consulta
  { do: 'caption', text: 'Consulta oficial en segundos' },
  { do: 'type', into: 'runt-captcha', field: 'rCaptcha', text: CAPTCHA, perChar: 110 },
  { do: 'click', on: 'btn-consultar', set: { loading: true } },
  { do: 'wait', ms: 1100 },
  { do: 'set', patch: { runt: false, loading: false, filled: true, toast: true, toastText: 'Datos RUNT cargados — incluye SOAT y Tecno.' } },
  { do: 'wait', ms: 900 },
  { do: 'set', patch: { toast: false } },

  // 6 · Formulario lleno
  { do: 'caption', text: 'El formulario se llena solo, con SOAT y tecnomecánica' },
  { do: 'highlight', on: 'veh-datos', ms: 1300 },
  { do: 'set', patch: { scrolled: true } },
  { do: 'highlight', on: 'docs-card', ms: 1400 },

  // 7 · Propietario y guardar
  { do: 'caption', text: 'Asigna al propietario y guarda' },
  { do: 'type', into: 'owner-input', field: 'ownerQuery', text: 'Carl', perChar: 90 },
  { do: 'set', patch: { ownerOpen: true } },
  { do: 'wait', ms: 350 },
  { do: 'click', on: 'owner-option', set: { ownerOpen: false, owner: true } },
  { do: 'wait', ms: 300 },
  { do: 'click', on: 'btn-crear-vehiculo', set: { modal: false, created: true, toast: true, toastText: 'Vehículo registrado' } },
  { do: 'wait', ms: 300 },

  // 8 · Resultado
  { do: 'caption', text: 'Vehículo registrado sin digitar nada' },
  { do: 'highlight', on: 'row-nuevo', ms: 1600 },
  { do: 'set', patch: { toast: false } },
  { do: 'wait', ms: 600 },
];

const tourConsultaRunt = {
  id: 'consulta-runt',
  title: 'Registrar un vehículo con el RUNT',
  module: 'Taller',
  audience: 'negocio',
  duration: 21,
  summary: 'Un vehículo completo, con SOAT y tecnomecánica, registrado sin digitar nada.',
  Screen: MockConsultaRunt,
  initialState: {
    modal: false, runt: false, loading: false,
    rPlaca: '', rDoc: '', rCaptcha: '',
    filled: false, scrolled: false,
    ownerQuery: '', ownerOpen: false, owner: false,
    created: false, toast: false, toastText: '',
  },
  steps,
};

export default tourConsultaRunt;
