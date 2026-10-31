/**
 * Tour 5 · Pedidos a proveedor (~30 s)
 *
 * Referencia real (estructura y textos, NO datos):
 *   - Alertas   → pages/stock-alerts/StockAlertsPage.jsx ("Alertas de Stock", botón "Agregar a pedido",
 *                 botón "Pedidos a proveedores")
 *   - Modal     → components/order-lists/AddToOrderListModal.jsx ("Agregar a pedido": Proveedor,
 *                 Cantidad a pedir, Nota (opcional))
 *   - Detalle   → pages/order-lists/OrderListDetailPage.jsx (estado Abierto → Pedido realizado,
 *                 botones PDF / Correo / WhatsApp / Crear compra / Marcar como pedido / Descartar,
 *                 "Observaciones para el proveedor", "Envíos al proveedor", modal de WhatsApp)
 *   - PDF       → el PDF real del pedido (sin precios). Este mock lo dibuja con el LOGO de la empresa.
 *
 * Simplificaciones deliberadas (lienzo de 960×600):
 *   - Alertas de Stock sin pestañas ni filtros; la tabla solo trae las columnas necesarias.
 *   - Detalle sin el formulario "Producto del catálogo / Línea libre" (agregar líneas a mano).
 *   - El botón "Crear compra" se muestra siempre, como en la app real (solo se resalta al final).
 *   - Los modales se dibujan en tema oscuro (en la app real son claros). El PDF se dibuja en
 *     papel blanco, igual que el real.
 *
 * LOGO: es UNA sola imagen (LOGO_SRC, un SVG inventado, no es el logo de ninguna empresa real).
 * Para usar otra, basta con cambiar LOGO_SRC por la ruta de un PNG/SVG.
 *
 * DATOS: todos ficticios (proveedor, NIT, teléfonos, dirección, correos).
 */
import { C, M, FONT_TITLE } from '../theme';
import MockWindow from '../mocks/MockWindow';
import MockSidebar from '../mocks/MockSidebar';
import MockInput from '../mocks/MockInput';
import MockButton from '../mocks/MockButton';
import MockBadge from '../mocks/MockBadge';
import MockTable from '../mocks/MockTable';
import MockToast from '../mocks/MockToast';
import MockModal from '../mocks/MockModal';
import MockIcon from '../mocks/MockIcon';
import MockCard from '../mocks/MockCard';

const LIST_NUMBER = 'PED-000001';
const DATE = '30/10/2026';
const SENT_AT = '30/10/2026, 10:02 a. m.';
const CREATED_BY = 'Usuario Demo';
const COMPANY = { name: 'Taller Demo', nit: 'NIT 900.000.000-0', phone: '300 000 0000', address: 'Dirección de ejemplo', email: 'info@tallerdemo.example' };
const SUPPLIER = { name: 'Repuestos del Norte', nit: '900.000.000-1', phone: '573000000000' };

// Mismos productos y SKU que los tours de la orden de trabajo y la factura.
const PRODUCTS = [
  { name: 'Pastillas de freno', sku: 'REP-PASTFRENO', stock: 2, min: 6, qty: '6' },
  { name: 'Filtro de aceite', sku: 'REP-FILTROACEITE', stock: 1, min: 5, qty: '4' },
  { name: 'Bujías', sku: 'REP-BUJIAS', stock: 0, min: 8, qty: '8' },
];

// ── EL LOGO (una imagen). SVG inventado: tablero circular sobre fondo grafito. ──
const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
  + '<rect width="64" height="64" rx="14" fill="#15171D"/>'
  + '<circle cx="32" cy="34" r="17" fill="none" stroke="#CF3A0B" stroke-width="6"/>'
  + '<path d="M32 34 L43 22" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>'
  + '<circle cx="32" cy="34" r="4" fill="#FFFFFF"/></svg>';
const LOGO_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`;

/* ───────────── Piezas locales ───────────── */

const Muted = ({ children, style }) => <span style={{ color: M.muted, ...style }}>{children}</span>;

const redBtn = { color: '#FCA5A5', borderColor: 'rgba(239,68,68,0.45)' };
const indigoBtn = { background: 'rgba(99,102,241,0.16)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.5)' };
const greenSolid = { background: '#16A34A', border: '1px solid transparent', color: '#fff' };

/* ───────────── Alertas de Stock ───────────── */

function AlertsView({ s }) {
  const rows = PRODUCTS.map((p, i) => ({
    id: `row-${i}`,
    cells: {
      p: <span><b style={{ fontWeight: 600 }}>{p.name}</b><br /><Muted style={{ fontSize: 10 }}>{p.sku}</Muted></span>,
      st: <b style={{ color: p.stock === 0 ? '#FCA5A5' : '#FCD34D' }}>{p.stock}</b>,
      mn: p.min,
      e: p.stock === 0 ? <MockBadge tone="red">Agotado</MockBadge> : <MockBadge tone="amber">Stock bajo</MockBadge>,
      o: i < s.added
        ? <MockBadge tone="orange">En pedido: {p.qty} · {SUPPLIER.name}</MockBadge>
        : <Muted style={{ fontSize: 11 }}>—</Muted>,
      a: (
        <span
          data-demo-id={`add-${i}`}
          title="Agregar a pedido"
          style={{ display: 'inline-flex', padding: 5, borderRadius: 7, background: 'rgba(249,115,22,0.14)' }}
        >
          <MockIcon name="clipboard" size={14} color="#FDBA74" />
        </span>
      ),
    },
  }));
  return (
    <div style={{ padding: '14px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 21, fontWeight: 700 }}>Alertas de Stock</div>
          <div style={{ fontSize: 11.5, color: M.muted }}>Gestión de alertas de inventario</div>
        </div>
        <MockButton id="btn-pedidos" variant="soft">
          <MockIcon name="clipboard" size={13} /> Pedidos a proveedores
          {s.added > 0 && (
            <span style={{
              minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box', borderRadius: 100,
              background: C.accent, color: '#fff', fontSize: 10.5, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{s.added}</span>
          )}
        </MockButton>
        <MockButton variant="soft">Verificar Stock</MockButton>
      </div>
      <MockTable
        columns={[
          { key: 'p', label: 'Producto', width: 2.2 },
          { key: 'st', label: 'Stock', width: 0.6 },
          { key: 'mn', label: 'Mínimo', width: 0.7 },
          { key: 'e', label: 'Estado', width: 1 },
          { key: 'o', label: 'En pedido', width: 2.2 },
          { key: 'a', label: '', width: 0.5 },
        ]}
        rows={rows}
      />
    </div>
  );
}

/* ───────────── Modal "Agregar a pedido" ───────────── */

function AddBody({ s, typing }) {
  const p = PRODUCTS[s.modalProduct] || PRODUCTS[0];
  return (
    <div>
      <div style={{ padding: '13px 18px', borderBottom: `1px solid ${M.border}`, fontFamily: FONT_TITLE, fontSize: 16, fontWeight: 700 }}>
        Agregar a pedido
      </div>
      <div style={{ padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
          <Muted style={{ fontSize: 11 }}>SKU {p.sku} · Stock {p.stock} · Mín {p.min}</Muted>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: M.muted, marginBottom: 6 }}>Proveedor</div>
          <div
            data-demo-id="sup-option"
            style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 9,
              border: `1.5px solid ${s.supplier ? '#F97316' : M.border2}`,
              background: s.supplier ? 'rgba(249,115,22,0.10)' : 'transparent', transition: 'border-color 0.2s, background 0.2s',
            }}
          >
            <span style={{
              width: 14, height: 14, borderRadius: '50%', boxSizing: 'border-box', flexShrink: 0,
              border: `2px solid ${s.supplier ? '#F97316' : M.faint}`, background: s.supplier ? '#F97316' : 'transparent',
              boxShadow: s.supplier ? `inset 0 0 0 2px ${M.panel}` : 'none',
            }} />
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{SUPPLIER.name} - {SUPPLIER.nit}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
          <MockInput id="qty-input" label="Cantidad a pedir" value={s.qty} typing={typing === 'qty'} />
          <MockInput label="Nota (opcional)" placeholder="Ej: urgente, referencia exacta, color..." />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
          <MockButton variant="ghost" style={{ flex: 1 }}>Cancelar</MockButton>
          <MockButton id="btn-agregar-pedido" style={{ flex: 1, background: '#EA580C' }}>
            <MockIcon name="clipboard" size={12} color="#fff" /> Agregar
          </MockButton>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Detalle del pedido ───────────── */

function DetailView({ s, typing }) {
  const ordered = s.status === 'ordered';
  const lines = PRODUCTS.slice(0, 2);
  return (
    <div style={{ padding: '12px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: M.muted, marginBottom: 6 }}>
        <MockIcon name="arrowLeft" size={13} /> Pedidos a proveedores
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 21, fontWeight: 700, lineHeight: 1.1 }}>{SUPPLIER.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
            <b style={{ fontSize: 12 }}>{LIST_NUMBER}</b>
            {ordered ? <MockBadge tone="green">Pedido realizado</MockBadge> : <MockBadge tone="orange">Abierto</MockBadge>}
          </div>
          <div style={{ fontSize: 10.5, color: M.muted, marginTop: 5 }}>
            Abierto por <b style={{ color: M.text }}>{CREATED_BY}</b> el {DATE}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <MockButton id="btn-pdf" small variant="soft"><MockIcon name="download" size={11} /> PDF</MockButton>
            <MockButton small variant="soft"><MockIcon name="send" size={11} /> Correo</MockButton>
            <MockButton id="btn-whatsapp" small variant="soft"><MockIcon name="message" size={11} /> WhatsApp</MockButton>
            <MockButton id="btn-compra" small variant="soft" style={indigoBtn}><MockIcon name="cart" size={11} color="#A5B4FC" /> Crear compra</MockButton>
          </div>
          {!ordered && (
            <div style={{ display: 'flex', gap: 6 }}>
              <MockButton id="btn-pedido" small style={greenSolid}><MockIcon name="check" size={11} color="#fff" /> Marcar como pedido</MockButton>
              <MockButton small variant="ghost" style={redBtn}><MockIcon name="x" size={11} color="#FCA5A5" /> Descartar</MockButton>
            </div>
          )}
        </div>
      </div>

      <MockTable
        columns={[
          { key: 'p', label: 'Producto', width: 2.4 },
          { key: 's', label: 'Stock', width: 1 },
          { key: 'q', label: 'Cantidad', width: 0.8 },
          { key: 'a', label: 'Anotado por', width: 1.6 },
        ]}
        rows={lines.map((p) => ({
          cells: {
            p: <span><b style={{ fontWeight: 600 }}>{p.name}</b><br /><Muted style={{ fontSize: 10 }}>SKU {p.sku}</Muted></span>,
            s: <span>{p.stock} <Muted style={{ fontSize: 10.5 }}>/ mín {p.min}</Muted></span>,
            q: <span style={{ display: 'inline-block', minWidth: 44, textAlign: 'right', padding: '3px 8px', borderRadius: 6, border: `1px solid ${M.border2}`, background: M.bg }}>{p.qty}</span>,
            a: <span style={{ fontSize: 11 }}>{CREATED_BY}<br /><Muted style={{ fontSize: 10 }}>{DATE}</Muted></span>,
          },
        }))}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10, marginTop: 10 }}>
        <MockCard title="Observaciones para el proveedor">
          <MockInput
            id="notes-input" multiline height={66} value={s.notes} typing={typing === 'notes'}
            placeholder="Ej: entregar en la sede norte, confirmar antes de despachar..."
          />
          <div style={{ fontSize: 10, color: M.faint, marginTop: 5 }}>Salen en el PDF, el correo y el WhatsApp, igual que las notas de cada línea.</div>
        </MockCard>
        <MockCard title="Envíos al proveedor">
          {s.sent ? (
            <div className="pbd-anim pbd-fade" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5, lineHeight: 1.4 }}>
              <MockIcon name="check" size={13} color="#6EE7B7" strokeWidth={2.4} />
              <span><b style={{ fontWeight: 600 }}>WhatsApp</b> · PDF adjunto<br /><Muted style={{ fontSize: 10.5 }}>{SENT_AT} · {CREATED_BY}</Muted></span>
            </div>
          ) : (
            <Muted style={{ fontSize: 11.5 }}>Aún no se ha enviado.</Muted>
          )}
        </MockCard>
      </div>
    </div>
  );
}

/* ───────────── Vista previa del PDF (con el logo) ───────────── */

function PdfBody({ s }) {
  const box = { border: '1px solid #D8DCE3', borderRadius: 7, background: '#F8FAFC' };
  const lines = PRODUCTS.slice(0, 2);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: `1px solid ${M.border}` }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Pedido {LIST_NUMBER}.pdf</span>
        <span data-demo-id="pdf-close" style={{ display: 'inline-flex', padding: 3 }}><MockIcon name="x" size={15} color={M.muted} /></span>
      </div>
      <div style={{ background: '#3B3E46', padding: '14px 0', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 400, background: '#fff', color: '#111827', borderTop: '5px solid #8B0000', padding: '14px 16px 18px', boxShadow: '0 6px 22px rgba(0,0,0,0.4)' }}>
          {/* Encabezado: logo + empresa | PEDIDO */}
          <div style={{ ...box, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              data-demo-id="pdf-logo" src={LOGO_SRC} alt="Logo de la empresa" width={42} height={42}
              style={{ display: 'block', width: 42, height: 42, borderRadius: 9, flexShrink: 0 }}
            />
            <div style={{ flex: 1, lineHeight: 1.35, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{COMPANY.name}</div>
              <div style={{ fontSize: 8.5, color: '#6B7280' }}>{COMPANY.nit} · {COMPANY.phone}</div>
              <div style={{ fontSize: 8.5, color: '#6B7280' }}>{COMPANY.address}</div>
              <div style={{ fontSize: 8.5, color: '#6B7280' }}>{COMPANY.email}</div>
            </div>
            <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#8B0000' }}>PEDIDO</div>
              <div style={{ fontSize: 11.5, fontWeight: 700 }}>{LIST_NUMBER}</div>
              <div style={{ fontSize: 8.5, color: '#6B7280' }}>Fecha: {DATE}</div>
            </div>
          </div>

          {/* Proveedor */}
          <div style={{ ...box, background: '#fff', padding: '8px 12px', marginTop: 9 }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, color: '#6B7280', letterSpacing: '0.04em' }}>PROVEEDOR</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 2 }}>{SUPPLIER.name.toUpperCase()}</div>
            <div style={{ fontSize: 8.5, color: '#374151', marginTop: 1 }}>NIT/CC: {SUPPLIER.nit}</div>
          </div>

          {/* Líneas (sin precios) */}
          <div style={{ marginTop: 10, fontSize: 9 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '16px 1.1fr 2fr 38px 48px', gap: 6, background: '#374151', color: '#fff', fontSize: 7.5, fontWeight: 700, padding: '5px 6px' }}>
              <span>#</span><span>CÓDIGO</span><span>DESCRIPCIÓN</span><span>UNIDAD</span><span style={{ textAlign: 'right' }}>CANTIDAD</span>
            </div>
            {lines.map((p, i) => (
              <div key={p.sku} style={{ display: 'grid', gridTemplateColumns: '16px 1.1fr 2fr 38px 48px', gap: 6, padding: '5px 6px', borderBottom: '1px solid #E5E7EB' }}>
                <span>{i + 1}</span><span style={{ fontSize: 8, color: '#1F2937' }}>{p.sku}</span><span>{p.name}</span><span>Und</span>
                <b style={{ textAlign: 'right' }}>{p.qty}</b>
              </div>
            ))}
          </div>

          {s.notes && (
            <div style={{ marginTop: 9, fontSize: 8.5, color: '#374151' }}><b>Observaciones:</b> {s.notes}</div>
          )}
          <div style={{ marginTop: 9, fontSize: 8, color: '#6B7280' }}>Por favor confirme disponibilidad, precios y tiempo de entrega de los ítems solicitados.</div>
          <div style={{ marginTop: 20, width: 150, borderTop: '1px solid #374151', paddingTop: 3, fontSize: 8.5, lineHeight: 1.35 }}>
            Solicitado por: {CREATED_BY}<br />{COMPANY.name}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Modal de WhatsApp ───────────── */

function WhatsappBody({ s, typing }) {
  return (
    <div>
      <div style={{ padding: '13px 18px', borderBottom: `1px solid ${M.border}`, fontFamily: FONT_TITLE, fontSize: 15.5, fontWeight: 700, lineHeight: 1.3 }}>
        Enviar pedido {LIST_NUMBER} por WhatsApp
      </div>
      <div style={{ padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <MockInput
          id="wa-phone" label="Celular del proveedor" value={s.phone} typing={typing === 'phone'} mono
        />
        <div style={{ fontSize: 10, color: M.faint, marginTop: -3 }}>Con indicativo del país, sin espacios.</div>
        <MockButton id="btn-wa-send" style={{ background: '#16A34A', width: '100%', boxSizing: 'border-box' }}>Enviar el PDF por WhatsApp</MockButton>
        <MockButton variant="soft" style={{ width: '100%', boxSizing: 'border-box' }}>Abrir WhatsApp con el enlace al PDF</MockButton>
        <MockButton variant="soft" style={{ width: '100%', boxSizing: 'border-box' }}>Compartir el archivo PDF</MockButton>
        <div style={{ fontSize: 9.5, color: M.faint, lineHeight: 1.4 }}>
          El PDF directo sale desde el WhatsApp de la empresa. El enlace abre tu WhatsApp con un mensaje corto y el enlace al PDF del pedido (sin precios).
        </div>
      </div>
    </div>
  );
}

/* ───────────── Chat de WhatsApp (lo que recibe el proveedor) ───────────── */

function ChatBody({ delivered }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#202C33', padding: '10px 14px', color: '#E9EDEF' }}>
        <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#4B5B64', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MockIcon name="user" size={14} color="#E9EDEF" />
        </span>
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{SUPPLIER.name}</div>
          <div style={{ fontSize: 10, color: '#8696A0' }}>en línea</div>
        </div>
      </div>
      <div style={{ background: '#0B141A', padding: '16px 14px 18px', minHeight: 190, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
        <div className="pbd-anim pbd-fade" style={{ maxWidth: 260, background: '#005C4B', color: '#E9EDEF', borderRadius: '10px 2px 10px 10px', padding: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(0,0,0,0.22)', borderRadius: 7, padding: '9px 10px' }}>
            <span style={{ width: 28, height: 34, borderRadius: 4, background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.5, fontWeight: 800, color: '#fff' }}>PDF</span>
            <div style={{ lineHeight: 1.3, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600 }}>Pedido-{LIST_NUMBER}.pdf</div>
              <div style={{ fontSize: 9.5, color: '#A7C4BC' }}>1 página · sin precios</div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, lineHeight: 1.4, padding: '6px 4px 2px' }}>
            Hola, te enviamos el pedido {LIST_NUMBER} de {COMPANY.name}. Por favor confirma disponibilidad y tiempo de entrega.
          </div>
          <div style={{ textAlign: 'right', fontSize: 9, color: '#A7C4BC', padding: '0 4px 1px' }}>
            10:02 a. m. <span style={{ color: delivered ? '#53BDEB' : '#A7C4BC' }}>{delivered ? '✓✓' : '✓'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Pantalla ───────────── */

export function MockPedidosProveedor({ state: s, typing }) {
  const alerts = s.view === 'alerts';
  return (
    <MockWindow sidebar={<MockSidebar active="inventario" activeChild={alerts ? 'Alertas de Stock' : 'Pedidos a proveedores'} />}>
      {alerts ? <AlertsView s={s} /> : <DetailView s={s} typing={typing} />}
      <MockToast show={s.toast}>{s.toastText}</MockToast>
      <MockModal open={s.addModal} width={420}><AddBody s={s} typing={typing} /></MockModal>
      <MockModal open={s.pdf} width={460}><PdfBody s={s} /></MockModal>
      <MockModal open={s.wa} width={400}><WhatsappBody s={s} typing={typing} /></MockModal>
      <MockModal open={s.chat} width={320}><ChatBody delivered={s.chatDelivered} /></MockModal>
    </MockWindow>
  );
}

/* ───────────── Guion ───────────── */

const steps = [
  // 1 · Anotar desde la alerta de stock
  { do: 'caption', text: 'Anota lo que falta, justo cuando lo notas' },
  { do: 'wait', ms: 400 },
  { do: 'click', on: 'add-0', set: { addModal: true, modalProduct: 0, supplier: false, qty: '' } },
  { do: 'wait', ms: 350 },

  // 2 · Proveedor y cantidad
  { do: 'caption', text: 'Cada proveedor tiene su propia lista' },
  { do: 'click', on: 'sup-option', set: { supplier: true } },
  { do: 'type', into: 'qty-input', field: 'qty', text: PRODUCTS[0].qty, perChar: 150 },
  { do: 'wait', ms: 250 },
  { do: 'click', on: 'btn-agregar-pedido', set: { addModal: false, added: 1, toast: true, toastText: 'Agregado al pedido' } },
  { do: 'wait', ms: 800 },
  { do: 'set', patch: { toast: false } },

  // 3 · Segundo producto: el contador sube
  { do: 'caption', text: 'Las listas se arman solas durante el día' },
  { do: 'click', on: 'add-1', set: { addModal: true, modalProduct: 1, supplier: false, qty: '' } },
  { do: 'wait', ms: 300 },
  { do: 'click', on: 'sup-option', set: { supplier: true } },
  { do: 'type', into: 'qty-input', field: 'qty', text: PRODUCTS[1].qty, perChar: 150 },
  { do: 'wait', ms: 250 },
  { do: 'click', on: 'btn-agregar-pedido', set: { addModal: false, added: 2, toast: true, toastText: 'Agregado al pedido' } },
  { do: 'wait', ms: 500 },
  { do: 'set', patch: { toast: false } },
  { do: 'highlight', on: 'btn-pedidos', ms: 1200 },

  // 4 · Abrir la lista y escribir una observación
  { do: 'caption', text: 'Revisa y agrega notas para el proveedor' },
  { do: 'click', on: 'btn-pedidos', set: { view: 'detail' } },
  { do: 'wait', ms: 600 },
  { do: 'type', into: 'notes-input', field: 'notes', text: 'Entregar en la sede norte antes del viernes', perChar: 55 },
  { do: 'wait', ms: 400 },

  // 5 · El PDF, con el logo de la empresa
  { do: 'caption', text: 'El PDF sale con el logo de tu empresa' },
  { do: 'click', on: 'btn-pdf', set: { pdf: true } },
  { do: 'wait', ms: 500 },
  { do: 'highlight', on: 'pdf-logo', ms: 1500 },
  { do: 'wait', ms: 600 },
  { do: 'click', on: 'pdf-close', set: { pdf: false } },
  { do: 'wait', ms: 250 },

  // 6 · WhatsApp
  { do: 'caption', text: 'Envíalo por WhatsApp o correo, en PDF' },
  { do: 'click', on: 'btn-whatsapp', set: { wa: true, phone: '' } },
  { do: 'wait', ms: 350 },
  { do: 'type', into: 'wa-phone', field: 'phone', text: SUPPLIER.phone, perChar: 55 },
  { do: 'wait', ms: 300 },
  { do: 'click', on: 'btn-wa-send', set: { wa: false, sent: true, toast: true, toastText: 'PDF enviado por WhatsApp' } },
  { do: 'wait', ms: 600 },
  { do: 'set', patch: { toast: false, chat: true } },
  { do: 'wait', ms: 700 },

  // 7 · Sin precios
  { do: 'caption', text: 'El pedido sale sin precios' },
  { do: 'set', patch: { chatDelivered: true } },
  { do: 'wait', ms: 1800 },
  { do: 'set', patch: { chat: false } },

  // 8 · Marcar como pedido → crear compra
  { do: 'caption', text: 'Y cuando llegue, conviértelo en compra' },
  { do: 'click', on: 'btn-pedido', set: { status: 'ordered', toast: true, toastText: 'Pedido realizado' } },
  { do: 'wait', ms: 700 },
  { do: 'set', patch: { toast: false } },
  { do: 'highlight', on: 'btn-compra', ms: 1500 },
  { do: 'wait', ms: 600 },
];

const tourPedidosProveedor = {
  id: 'pedidos-proveedor',
  title: 'Pedidos a proveedor',
  module: 'Inventario',
  audience: 'negocio',
  duration: 30,
  summary: 'Anota lo que falta durante el día, envía el pedido en PDF con tu logo y, cuando llegue, conviértelo en compra.',
  Screen: MockPedidosProveedor,
  // Pantallas angostas: la cámara sigue los modales (centrados en el área de contenido).
  camera: (s) => {
    if (s.chat || s.wa || s.addModal) return { x: 574, y: 317, zoom: 0.8 };
    if (s.pdf) return { x: 574, y: 250, zoom: 0.85 };
    return null;
  },
  initialState: {
    view: 'alerts',
    added: 0, addModal: false, modalProduct: 0, supplier: false, qty: '',
    notes: '', status: 'open', sent: false,
    pdf: false, wa: false, phone: '', chat: false, chatDelivered: false,
    toast: false, toastText: '',
  },
  steps,
};

export default tourPedidosProveedor;
