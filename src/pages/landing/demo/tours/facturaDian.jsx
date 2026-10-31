/**
 * Tour 3 · Facturar electrónicamente y enviar (~20 s)
 *
 * Referencia real (estructura y textos, NO datos):
 *   - Formulario → pages/sales/SaleFormPage.jsx ("Nueva Venta", "Información General", "Productos")
 *   - Confirmar  → components/sales/ConfirmSaleWithPaymentModal.jsx (Tipo de documento: Remisión / Factura)
 *   - Detalle    → pages/sales/SaleDetailPage.jsx + components/dian/DianStatusBadge.jsx
 *                  (panel "Facturación Electrónica DIAN": Número DIAN, CUFE, Enviado, Aceptado)
 *
 * Va al FINAL de la historia (RUNT → OT → factura): mismo cliente (Carlos Ruiz) y mismos ítems
 * (pastillas de freno + mano de obra) que la orden de trabajo.
 *
 * Flujo mostrado: factura directa (se elige "Factura" al confirmar la venta). El botón
 * "Facturar electrónicamente" de la app real convierte una REMISIÓN ya existente en factura;
 * es otro camino y no se muestra aquí.
 *
 * Simplificaciones deliberadas (lienzo de 960×600):
 *   - Formulario sin placa/vehículo, kilometraje ni notas; sin botones "Combo" funcionales.
 *   - Detalle sin panel RADIAN, sin historial de pagos ni movimientos de inventario.
 *   - El modal de confirmar se dibuja en tema oscuro (en la app real es claro).
 *
 * DATOS: todos ficticios. Nada de las capturas de referencia (clientes, documentos, CUFE,
 * correos, direcciones, montos) se reproduce aquí. El CUFE es una cadena de relleno.
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
import MockCard from '../mocks/MockCard';

const DRAFT_NUMBER = 'BORRADOR-DEMO';
const DOC_NUMBER = 'DEM-FE-0001';
const SALE_DATE = '30/10/2026';
const SENT_AT = '30/10/2026, 10:00:10 a. m.';
const ACCEPTED_AT = '30/10/2026, 10:00:14 a. m.';
const CUSTOMER = { name: 'Carlos Ruiz', doc: '1.000.000.001', phone: '300 000 0000' }; // mismo cliente de los tours RUNT y OT
const CREATED_BY = 'Usuario Demo';
const WAREHOUSE = 'Bodega Principal';
const WORKSHOP = 'Taller Demo';
const FAKE_CUFE = 'ab12cd34ef56ab78'.repeat(6); // 96 caracteres de relleno, no es un CUFE real

const IVA_RATE = 0.19;
// Mismos ítems que ve el cliente al final del tour de la orden de trabajo (total $ 199.000).
const PRODUCTS = [
  { name: 'Pastillas de freno', sku: 'REP-PASTFRENO', qty: 1, price: 100000, iva: true },
  { name: 'Mano de obra — Frenos', sku: 'SRV-MO-FRENOS', qty: 1, price: 80000, iva: false },
];

const fmt = (n) => `$ ${Number(n).toLocaleString('es-CO')}`;
function totalsOf(count) {
  const items = PRODUCTS.slice(0, count);
  const subtotal = items.reduce((a, p) => a + p.qty * p.price, 0);
  const iva = Math.round(items.reduce((a, p) => a + (p.iva ? p.qty * p.price * IVA_RATE : 0), 0));
  return { subtotal, iva, total: subtotal + iva };
}

/* ───────────── Piezas locales ───────────── */

const Muted = ({ children, style }) => <span style={{ color: M.muted, ...style }}>{children}</span>;

function Field({ label, value, style }) {
  return (
    <div style={{ minWidth: 0, ...style }}>
      <div style={{ fontSize: 10, color: M.faint, marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: M.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

const tinyBtn = { padding: '5px 10px', fontSize: 11 };

/* ───────────── Formulario: Nueva Venta ───────────── */

function FormView({ s, typing }) {
  const rows = PRODUCTS.slice(0, s.items);
  const t = totalsOf(s.items);
  const canSave = s.cliente && s.items > 0;
  return (
    <div style={{ padding: '12px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ padding: 6, color: M.muted }}><MockIcon name="arrowLeft" size={16} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 19, fontWeight: 700 }}>Nueva Venta</div>
          <div style={{ fontSize: 11.5, color: M.muted }}>Crea una nueva venta: remisión o factura</div>
        </div>
        <MockButton variant="ghost" small>Cancelar</MockButton>
        <MockButton id="btn-guardar" small disabled={!canSave}><MockIcon name="save" size={12} color="#fff" /> Guardar</MockButton>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <MockCard icon="file" title="Información General">
          <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 2fr 1fr', gap: 12, alignItems: 'start' }}>
            <MockInput
              label="Fecha *" value={SALE_DATE}
              trailing={<MockIcon name="calendar" size={13} color={M.muted} />}
            />
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                <MockInput
                  id="cliente-input" label="Cliente *" placeholder="Buscar cliente por nombre, NIT o teléfono..."
                  value={s.clienteQuery} typing={typing === 'clienteQuery'} state={s.cliente ? 'ok' : 'normal'}
                  leading={<MockIcon name="search" size={13} color={M.faint} />}
                />
                <MockDropdown open={s.cliOpen}>
                  <div data-demo-id="cli-option" style={{ padding: '8px 10px', background: M.blueBg }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{CUSTOMER.name}</div>
                    <div style={{ fontSize: 11, color: M.blueSoft, marginTop: 2 }}>CC {CUSTOMER.doc} · {CUSTOMER.phone}</div>
                  </div>
                </MockDropdown>
              </div>
              <MockButton variant="soft" small style={{ width: 32, height: 32, boxSizing: 'border-box', marginTop: 17, padding: 0 }}>
                <MockIcon name="plus" size={13} />
              </MockButton>
            </div>
            <MockInput label="Bodega" value={WAREHOUSE} />
          </div>
        </MockCard>

        <MockCard
          icon="cart" title={`Productos (${s.items})`}
          right={(
            <div style={{ display: 'flex', gap: 6 }}>
              <MockButton id="btn-agregar" small style={tinyBtn}><MockIcon name="plus" size={11} color="#fff" /> Agregar Producto</MockButton>
              <MockButton small style={{ ...tinyBtn, background: '#4F46E5', border: '1px solid transparent', color: '#fff' }}>Línea Libre</MockButton>
              <MockButton small style={{ ...tinyBtn, background: '#059669', border: '1px solid transparent', color: '#fff' }}>Combo</MockButton>
              <MockButton small style={{ ...tinyBtn, background: '#16A34A', border: '1px solid transparent', color: '#fff' }}>Escanear</MockButton>
            </div>
          )}
        >
          {rows.length === 0 ? (
            <div style={{
              height: 150, border: `1.5px dashed ${M.border2}`, borderRadius: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <MockIcon name="cart" size={30} color={M.faint} />
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>No hay productos agregados</div>
              <Muted style={{ fontSize: 11.5 }}>Agrega productos para crear la venta</Muted>
            </div>
          ) : (
            <>
              <MockTable
                columns={[
                  { key: 'p', label: 'Producto', width: 2.6 },
                  { key: 'q', label: 'Cant.', width: 0.6 },
                  { key: 'u', label: 'Precio unit.', width: 1 },
                  { key: 'i', label: 'IVA', width: 0.6 },
                  { key: 't', label: 'Total', width: 1 },
                ]}
                rows={rows.map((p) => ({
                  cells: {
                    p: <span><b style={{ fontWeight: 600 }}>{p.name}</b> <Muted style={{ fontSize: 10.5 }}>· {p.sku}</Muted></span>,
                    q: p.qty, u: fmt(p.price), i: p.iva ? '19 %' : 'Exento', t: <b>{fmt(p.qty * p.price)}</b>,
                  },
                }))}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 8, fontSize: 12.5 }}>
                <Muted>Total con IVA</Muted><b style={{ color: M.blueSoft }}>{fmt(t.total)}</b>
              </div>
            </>
          )}
        </MockCard>
      </div>
    </div>
  );
}

/* ───────────── Detalle de la venta ───────────── */

const DIAN_STATUS = {
  pending:  { label: 'Pendiente', fg: '#FCD34D', bg: 'rgba(245,158,11,0.16)', icon: 'clock' },
  sending:  { label: 'Enviando',  fg: '#93C5FD', bg: 'rgba(59,130,246,0.18)', icon: 'send' },
  accepted: { label: 'Aceptado',  fg: '#6EE7B7', bg: 'rgba(16,185,129,0.16)', icon: 'check' },
};

function DianPanel({ status }) {
  const cfg = DIAN_STATUS[status];
  const sent = status === 'sending' || status === 'accepted';
  const done = status === 'accepted';
  const row = { display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11.5, lineHeight: '17px' };
  return (
    <div
      data-demo-id="dian-panel"
      className="pbd-anim pbd-fade"
      style={{ background: M.panel, border: `1px solid ${M.border}`, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: `1px solid ${M.border}` }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Facturación Electrónica DIAN</span>
        <span
          className={status === 'sending' ? 'pbd-anim pbd-ring' : undefined}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 10px', borderRadius: 100,
            fontSize: 10.5, fontWeight: 600, color: cfg.fg, background: cfg.bg,
          }}
        >
          <MockIcon name={cfg.icon} size={11} color={cfg.fg} strokeWidth={2.2} /> {cfg.label}
        </span>
      </div>
      <div style={{ padding: '7px 12px 9px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={row}><Muted>Número DIAN</Muted><b>{DOC_NUMBER}</b></div>
        {done && (
          <div style={row}>
            <Muted>CUFE</Muted>
            <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 9.5, color: M.muted, textAlign: 'right', wordBreak: 'break-all', maxWidth: 520 }}>
              {FAKE_CUFE}
            </span>
          </div>
        )}
        {sent && <div style={row}><Muted>Enviado</Muted><span>{SENT_AT}</span></div>}
        {done && <div style={row}><Muted>Aceptado</Muted><span style={{ color: '#6EE7B7' }}>{ACCEPTED_AT}</span></div>}
      </div>
    </div>
  );
}

function DetailView({ s }) {
  const draft = s.stage === 'draft';
  const t = totalsOf(PRODUCTS.length);
  return (
    <div style={{ padding: '12px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: M.muted, marginBottom: 6 }}>
        <MockIcon name="arrowLeft" size={13} /> Volver a Ventas
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{draft ? DRAFT_NUMBER : DOC_NUMBER}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
            {draft ? (
              <><MockBadge tone="gray">Borrador</MockBadge><MockBadge tone="amber">Pendiente</MockBadge></>
            ) : (
              <><MockBadge tone="green">Entregada</MockBadge><MockBadge tone="green">Pagado</MockBadge><Muted style={{ fontSize: 11.5 }}>Factura</Muted></>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {draft && (
            <>
              <MockButton small variant="soft">Editar</MockButton>
              <MockButton small id="btn-confirmar"><MockIcon name="check" size={11} color="#fff" /> Confirmar</MockButton>
              <MockButton small variant="ghost" style={{ color: '#FCA5A5', borderColor: 'rgba(239,68,68,0.45)' }}>Cancelar</MockButton>
            </>
          )}
          {!draft && <MockButton small variant="soft" style={{ padding: '5px 7px' }}><MockIcon name="dots" size={13} /></MockButton>}
          <MockButton small variant="soft"><MockIcon name="link" size={11} /> Copiar enlace</MockButton>
          <MockButton small id="btn-whatsapp" style={{ background: '#22C55E', border: '1px solid transparent', color: '#fff' }}>
            <MockIcon name="message" size={11} color="#fff" /> WhatsApp
          </MockButton>
        </div>
      </div>

      {s.dian !== 'none' && <DianPanel status={s.dian} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1.75fr 1fr', gap: 10, alignItems: 'start' }}>
        <MockCard title="Productos">
          <MockTable
            columns={[
              { key: 'p', label: 'Producto', width: 2.4 },
              { key: 'q', label: 'Cant.', width: 0.6 },
              { key: 'u', label: 'Precio unit.', width: 1 },
              { key: 'i', label: 'IVA', width: 0.6 },
              { key: 't', label: 'Total', width: 1 },
            ]}
            rows={PRODUCTS.map((p) => ({
              cells: {
                p: <span><b style={{ fontWeight: 600 }}>{p.name}</b><br /><Muted style={{ fontSize: 10 }}>{p.sku}</Muted></span>,
                q: p.qty.toFixed(2), u: fmt(p.price), i: p.iva ? '19 %' : 'Exento', t: <b>{fmt(p.qty * p.price)}</b>,
              },
            }))}
          />
          <div style={{ marginTop: 8, marginLeft: 'auto', width: 220, fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><Muted>Subtotal:</Muted><span>{fmt(t.subtotal)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><Muted>IVA:</Muted><span>{fmt(t.iva)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 5, borderTop: `1px solid ${M.border}` }}>
              <b style={{ fontSize: 13 }}>TOTAL:</b><b style={{ fontSize: 15, color: M.blueSoft }}>{fmt(t.total)}</b>
            </div>
            {!draft && (
              <div style={{ color: '#6EE7B7', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>Pagado:</span><span>{fmt(t.total)}</span>
              </div>
            )}
          </div>
        </MockCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MockCard title="Cliente" icon="user">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
              <Field label="Nombre" value={CUSTOMER.name} style={{ gridColumn: '1 / -1' }} />
              <Field label="NIT / Cédula" value={CUSTOMER.doc} />
              <Field label="Teléfono" value={CUSTOMER.phone} />
            </div>
          </MockCard>
          <MockCard title="Información de la Venta">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
              <Field label="Fecha de Venta" value={SALE_DATE} />
              <Field label="Método de Pago" value={draft ? '—' : 'Efectivo'} />
              <Field label="Creado por" value={CREATED_BY} style={{ gridColumn: '1 / -1' }} />
            </div>
          </MockCard>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Modal "Confirmar Venta" ───────────── */

function DocOption({ id, icon, label, desc, active, tone }) {
  const color = tone === 'green' ? '#6EE7B7' : '#93C5FD';
  return (
    <div
      data-demo-id={id}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 8px', borderRadius: 11, textAlign: 'center',
        border: `2px solid ${active ? (tone === 'green' ? '#10B981' : '#3B82F6') : M.border2}`,
        background: active ? (tone === 'green' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)') : 'transparent',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <MockIcon name={icon} size={20} color={color} />
      <span style={{ fontSize: 11.5, fontWeight: 700, color }}>{label}</span>
      <span style={{ fontSize: 9.5, color: M.faint, lineHeight: 1.25 }}>{desc}</span>
    </div>
  );
}

function ConfirmBody({ s }) {
  const t = totalsOf(PRODUCTS.length);
  return (
    <div>
      <div style={{ background: 'linear-gradient(90deg, #4F46E5, #9333EA)', padding: '12px 18px', fontFamily: FONT_TITLE, fontSize: 16, fontWeight: 700, color: '#fff' }}>
        Confirmar Venta
      </div>
      <div style={{ padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: M.muted, marginBottom: 6 }}>Tipo de documento</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <DocOption id="doc-remision" icon="clipboard" label="Remisión" desc="Entrega de mercancía. Sin efecto fiscal." active={s.docType === 'remision'} tone="blue" />
            <DocOption id="doc-factura" icon="file" label="Factura" desc="Documento fiscal válido ante la DIAN." active={s.docType === 'factura'} tone="green" />
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '8px 0', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: 11, color: M.muted }}>Total de la Venta</div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 24, fontWeight: 700 }}>{fmt(t.total)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: M.muted, marginBottom: 6 }}>Tipo de Pago</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {['Contado', 'Parcial', 'Crédito', 'Mixto'].map((l, i) => (
              <div key={l} style={{
                textAlign: 'center', padding: '6px 0', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                border: `1.5px solid ${i === 0 ? '#10B981' : M.border2}`,
                background: i === 0 ? 'rgba(16,185,129,0.12)' : 'transparent', color: i === 0 ? '#6EE7B7' : M.muted,
              }}>{l}</div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <MockButton variant="ghost" style={{ flex: 1 }}>Cancelar</MockButton>
          <MockButton id="btn-confirmar-venta" style={{ flex: 1.4, background: '#4F46E5' }}>✓ Confirmar Venta</MockButton>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Chat de WhatsApp (lo que recibe el cliente) ───────────── */

function ChatBody({ delivered }) {
  const t = totalsOf(PRODUCTS.length);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#202C33', padding: '10px 14px', color: '#E9EDEF' }}>
        <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#4B5B64', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MockIcon name="user" size={14} color="#E9EDEF" />
        </span>
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{CUSTOMER.name}</div>
          <div style={{ fontSize: 10, color: '#8696A0' }}>en línea</div>
        </div>
      </div>
      <div style={{ background: '#0B141A', padding: '16px 14px 18px', minHeight: 190, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
        <div className="pbd-anim pbd-fade" style={{ maxWidth: 250, background: '#005C4B', color: '#E9EDEF', borderRadius: '10px 2px 10px 10px', padding: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(0,0,0,0.22)', borderRadius: 7, padding: '9px 10px' }}>
            <span style={{ width: 28, height: 34, borderRadius: 4, background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.5, fontWeight: 800, color: '#fff' }}>PDF</span>
            <div style={{ lineHeight: 1.3, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600 }}>{DOC_NUMBER}.pdf</div>
              <div style={{ fontSize: 9.5, color: '#A7C4BC' }}>1 página · {fmt(t.total)}</div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, lineHeight: 1.4, padding: '6px 4px 2px' }}>
            Hola {CUSTOMER.name.split(' ')[0]}, te enviamos tu factura electrónica {DOC_NUMBER} de {WORKSHOP}. ¡Gracias por tu compra!
          </div>
          <div style={{ textAlign: 'right', fontSize: 9, color: '#A7C4BC', padding: '0 4px 1px' }}>
            10:00 a. m. <span style={{ color: delivered ? '#53BDEB' : '#A7C4BC' }}>{delivered ? '✓✓' : '✓'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Pantalla ───────────── */

export function MockFacturaDian({ state: s, typing }) {
  return (
    <MockWindow sidebar={<MockSidebar active="ventas" activeChild={s.view === 'form' ? 'Nueva Venta' : 'Historial Ventas'} />}>
      {s.view === 'form' && <FormView s={s} typing={typing} />}
      {s.view === 'detail' && <DetailView s={s} />}
      <MockToast show={s.toast}>{s.toastText}</MockToast>
      <MockModal open={s.confirm} width={400}><ConfirmBody s={s} /></MockModal>
      <MockModal open={s.chat} width={320}><ChatBody delivered={s.chatDelivered} /></MockModal>
    </MockWindow>
  );
}

/* ───────────── Guion ───────────── */

const steps = [
  // 1 · Cliente
  { do: 'caption', text: 'Registra la venta en segundos' },
  { do: 'wait', ms: 300 },
  { do: 'type', into: 'cliente-input', field: 'clienteQuery', text: 'Carl', perChar: 90 },
  { do: 'set', patch: { cliOpen: true } },
  { do: 'wait', ms: 350 },
  { do: 'click', on: 'cli-option', set: { cliOpen: false, cliente: true, clienteQuery: `${CUSTOMER.name} · CC ${CUSTOMER.doc}` } },
  { do: 'wait', ms: 200 },

  // 2 · Productos
  { do: 'caption', text: 'Agrega productos y servicios con un clic' },
  { do: 'click', on: 'btn-agregar', set: { items: 1 } },
  { do: 'wait', ms: 350 },
  { do: 'click', on: 'btn-agregar', set: { items: 2 } },
  { do: 'wait', ms: 450 },

  // 3 · Guardar
  { do: 'caption', text: 'Guarda y revisa antes de confirmar' },
  { do: 'click', on: 'btn-guardar', set: { view: 'detail', stage: 'draft', toast: true, toastText: 'Venta guardada como borrador' } },
  { do: 'wait', ms: 900 },
  { do: 'set', patch: { toast: false } },

  // 4 · Tipo de documento
  { do: 'caption', text: 'Al confirmar, eliges Factura' },
  { do: 'click', on: 'btn-confirmar', set: { confirm: true } },
  { do: 'wait', ms: 400 },
  { do: 'click', on: 'doc-factura', set: { docType: 'factura' } },
  { do: 'wait', ms: 450 },

  // 5 · Se envía a la DIAN
  { do: 'caption', text: 'Un clic y se envía a la DIAN en segundo plano' },
  { do: 'click', on: 'btn-confirmar-venta', set: { confirm: false, stage: 'confirmed', dian: 'pending' } },
  { do: 'wait', ms: 700 },
  { do: 'set', patch: { dian: 'sending' } },
  { do: 'wait', ms: 1200 },

  // 6 · Aceptada
  { do: 'caption', text: 'Validación DIAN integrada, sin exportar a otro sistema' },
  { do: 'set', patch: { dian: 'accepted', toast: true, toastText: 'Documento aceptado por la DIAN' } },
  { do: 'highlight', on: 'dian-panel', ms: 1500 },
  { do: 'set', patch: { toast: false } },

  // 7 · WhatsApp
  { do: 'caption', text: 'Envíala al cliente por WhatsApp' },
  { do: 'click', on: 'btn-whatsapp', set: { toast: true, toastText: 'Documento enviado por WhatsApp' } },
  { do: 'wait', ms: 500 },
  { do: 'set', patch: { toast: false, chat: true } },
  { do: 'wait', ms: 900 },

  // 8 · Recibida
  { do: 'caption', text: 'El cliente la recibe al instante' },
  { do: 'set', patch: { chatDelivered: true } },
  { do: 'wait', ms: 1800 },
];

const tourFacturaDian = {
  id: 'factura-dian',
  title: 'Facturar electrónicamente y enviar',
  module: 'Ventas · DIAN',
  audience: 'negocio',
  duration: 20,
  summary: 'De la venta a la factura aceptada por la DIAN y en el WhatsApp de tu cliente, sin salir de Pitbox.',
  Screen: MockFacturaDian,
  // Pantallas angostas: la cámara enfoca el panel DIAN y luego el chat del cliente.
  camera: (s) => {
    if (s.chat) return { x: 480, y: 300, zoom: 0.6 };
    if (s.dian !== 'none') return { x: 560, y: 230, zoom: 0.85 };
    return null;
  },
  initialState: {
    view: 'form',
    clienteQuery: '', cliOpen: false, cliente: false,
    items: 0,
    stage: 'draft', confirm: false, docType: 'remision',
    dian: 'none',
    toast: false, toastText: '',
    chat: false, chatDelivered: false,
  },
  steps,
};

export default tourFacturaDian;
