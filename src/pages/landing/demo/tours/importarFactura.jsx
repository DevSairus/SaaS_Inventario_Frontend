/**
 * Tour 3 · Importar una factura de proveedor desde ZIP (~28 s)
 *
 * Referencia real (estructura y textos, NO datos):
 *   - Listado → pages/purchases/PurchasesPage.jsx ("Compras", botones Documentos DIAN / Importar Factura / Nueva Compra)
 *   - Modal   → components/purchases/InvoiceImportModal.jsx ("Importar Factura Electrónica": zona
 *               "Arrastra el archivo ZIP aquí", Proveedor, Factura, Ítems con selector
 *               "Sin vincular — elegir" / "Crear como producto nuevo", columna Margen %, Total,
 *               resumen "Factura Importada Exitosamente")
 *
 * Simplificaciones deliberadas (lienzo de 960×600):
 *   - Sin tarjetas de estadísticas completas, sin filtros ni paginación en el listado.
 *   - Sin envío, descuento, ni el margen general para productos nuevos del modal real.
 *   - El selector de producto vincula con un solo clic (en la app real se busca por nombre).
 *   - El precio de venta se calcula como costo × (1 + margen) (margen sobre el costo).
 *   - El modal se dibuja en tema oscuro (en la app real es claro).
 *   - La compra queda como BORRADOR; el demo no afirma que el inventario cambie en este paso.
 *
 * DATOS: todos ficticios (proveedor, NIT, factura, montos). Mismos productos que los
 * tours de OT, factura y pedidos.
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
import MockIcon from '../mocks/MockIcon';

const SUPPLIER = { name: 'IMPORTADORA DEMO S.A.S', nit: '900.000.000-2', email: 'pedidos@importadorademo.example' };
const INVOICE = { number: 'FV-1001', date: '2026-10-30', pay: 'Contado', due: '2026-10-30' };
const IVA = 0.19;

// Cantidades y precios de ejemplo (costo sin IVA).
const ITEMS = [
  { name: 'PASTILLAS DE FRENO DELANTERAS', sku: 'REP-PASTFRENO', qty: 6, price: 62000, match: 'Pastillas de freno' },
  { name: 'FILTRO ACEITE MOTOR', sku: 'REP-FILTROACEITE', qty: 4, price: 18000, match: 'Filtro de aceite' },
  { name: 'BUJIA IRIDIO', sku: 'BUJ-IRI-01', qty: 8, price: 14500, match: null },
  { name: 'LIQUIDO DE FRENOS DOT4', sku: 'LIQ-DOT4', qty: 5, price: 9800, match: 'Líquido de frenos', auto: true },
];

const fmt = (n) => `$${Number(Math.round(n)).toLocaleString('es-CO')}`;
const subtotalOf = (it) => it.qty * it.price;
const SUBTOTAL = ITEMS.reduce((a, it) => a + subtotalOf(it), 0);
const TAX = Math.round(SUBTOTAL * IVA);
const TOTAL = SUBTOTAL + TAX;

const Muted = ({ children, style }) => <span style={{ color: M.muted, ...style }}>{children}</span>;

/* ───────────── Listado de Compras ───────────── */

function ListView({ s }) {
  const base = [
    { n: 'PC-2026-0003', p: 'Lubricantes Demo S.A.', nit: '900.000.000-3', d: '25/10/2026', st: 'green', stl: 'Recibida', t: '$ 240.000' },
    { n: 'PC-2026-0002', p: 'Repuestos del Norte', nit: '900.000.000-1', d: '18/10/2026', st: 'gray', stl: 'Borrador', t: '$ 118.500' },
    { n: 'PC-2026-0001', p: 'Distribuidora Demo Ltda.', nit: '900.000.000-4', d: '09/10/2026', st: 'green', stl: 'Recibida', t: '$ 96.426' },
  ];
  const rows = [
    ...(s.imported ? [{ n: 'PC-2026-0004', p: SUPPLIER.name, nit: SUPPLIER.nit, d: '30/10/2026', st: 'gray', stl: 'Borrador', t: fmt(TOTAL).replace('$', '$ '), isNew: true }] : []),
    ...base,
  ];
  const stat = (label, value, icon, tone) => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: M.panel, border: `1px solid ${M.border}`, borderRadius: 12, padding: '9px 12px' }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, background: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MockIcon name={icon} size={15} color="#fff" />
      </span>
      <div style={{ lineHeight: 1.25 }}>
        <div style={{ fontSize: 10.5, color: M.muted }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
  return (
    <div style={{ padding: '14px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 21, fontWeight: 700 }}>Compras</div>
          <div style={{ fontSize: 11.5, color: M.muted }}>Gestión de órdenes de compra a proveedores</div>
        </div>
        <MockButton variant="soft">Documentos DIAN</MockButton>
        <MockButton id="btn-importar" variant="soft"><MockIcon name="download" size={12} /> Importar Factura</MockButton>
        <MockButton style={{ background: '#16A34A' }}><MockIcon name="plus" size={12} color="#fff" /> Nueva Compra</MockButton>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {stat('Total Compras', 3 + (s.imported ? 1 : 0), 'cart', '#3B82F6')}
        {stat('Borradores', 1 + (s.imported ? 1 : 0), 'clock', '#6B7280')}
        {stat('Recibidas', 2, 'box', '#10B981')}
      </div>
      <MockTable
        columns={[
          { key: 'n', label: 'N° Compra', width: 1.1 },
          { key: 'p', label: 'Proveedor', width: 2.2 },
          { key: 'd', label: 'Fecha', width: 0.9 },
          { key: 'e', label: 'Estado', width: 0.9 },
          { key: 't', label: 'Total', width: 1 },
        ]}
        rows={rows.map((r) => ({
          id: r.isNew ? 'new-row' : undefined,
          cells: {
            n: <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: '#6EE7B7', fontWeight: 600 }}>{r.n}</span>,
            p: <span><b style={{ fontWeight: 600 }}>{r.p}</b><br /><Muted style={{ fontSize: 10 }}>{r.nit}</Muted></span>,
            d: <Muted>{r.d}</Muted>,
            e: <MockBadge tone={r.st}>{r.stl}</MockBadge>,
            t: <b>{r.t}</b>,
          },
        }))}
      />
    </div>
  );
}

/* ───────────── Modal: Importar Factura Electrónica ───────────── */

function DropZone({ s }) {
  const hot = s.hover;
  const loading = s.phase === 'loading';
  return (
    <div style={{ padding: '18px 20px 20px' }}>
      <div
        data-demo-id="drop-zone"
        style={{
          height: 230, borderRadius: 12, boxSizing: 'border-box', textAlign: 'center',
          border: `2px dashed ${hot ? '#60A5FA' : M.border2}`, background: hot ? 'rgba(37,99,235,0.12)' : 'transparent',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        {loading ? (
          <>
            <MockIcon name="clock" size={30} color={M.blueSoft} />
            <div className="pbd-anim pbd-ring" style={{ fontSize: 14, fontWeight: 600 }}>Leyendo factura…</div>
            <Muted style={{ fontSize: 11 }}>factura-proveedor.zip</Muted>
          </>
        ) : hot ? (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '9px 14px', borderRadius: 9, background: M.panel2, border: `1px solid ${M.border2}` }}>
              <MockIcon name="file" size={18} color={M.blueSoft} />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>factura-proveedor.zip</span>
            </span>
            <div style={{ fontSize: 12, color: M.blueSoft, marginTop: 4 }}>Suelta aquí</div>
          </>
        ) : (
          <>
            <MockIcon name="download" size={34} color={M.faint} />
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>Arrastra el archivo ZIP aquí</div>
            <Muted style={{ fontSize: 11.5 }}>o haz clic para seleccionar</Muted>
            <MockButton small style={{ marginTop: 6 }}>Seleccionar Archivo ZIP</MockButton>
            <div style={{ fontSize: 10.5, color: M.faint, marginTop: 8 }}>El ZIP debe contener el XML de la factura electrónica</div>
          </>
        )}
      </div>
    </div>
  );
}

function LinkPill({ id, value, matchLabel, open }) {
  const on = !!value;
  const label = value === 'new' ? 'Crear producto nuevo' : on ? matchLabel : 'Sin vincular — elegir';
  const color = value === 'new' ? '#C4B5FD' : on ? '#6EE7B7' : M.muted;
  return (
    <span
      data-demo-id={id}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 7, fontSize: 10.5,
        color, background: on ? 'rgba(255,255,255,0.05)' : M.bg, border: `1px solid ${on ? 'rgba(255,255,255,0.18)' : M.border2}`,
        outline: open ? `1.5px solid ${M.blueSoft}` : 'none',
      }}
    >
      <MockIcon name={on ? 'check' : 'link'} size={10} color={color} /> {label}
    </span>
  );
}

function PreviewBody({ s, typing }) {
  const pending = ITEMS.filter((it, i) => !it.auto && !s[`link${i}`]).length;
  const grid = '3.1fr 0.5fr 0.9fr 0.55fr 1fr 1fr';
  const marginNum = Number(s.margin) || 0;
  const sale = ITEMS[2].price * (1 + marginNum / 100);
  return (
    <div style={{ padding: '12px 18px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr', gap: 10 }}>
        <div data-demo-id="prov-card" style={{ background: M.panel2, border: `1px solid ${M.border}`, borderRadius: 10, padding: '8px 12px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>Proveedor</div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{SUPPLIER.name}</div>
          <div style={{ fontSize: 10.5, color: M.muted, marginTop: 2 }}>NIT: <b style={{ color: M.text }}>{SUPPLIER.nit}</b></div>
          <div style={{ fontSize: 10.5, color: M.muted }}>Email: <b style={{ color: M.text }}>{SUPPLIER.email}</b></div>
        </div>
        <div style={{ background: 'rgba(59,130,246,0.10)', border: `1px solid ${M.border}`, borderRadius: 10, padding: '8px 12px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>Factura</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px', fontSize: 10.5, color: M.muted }}>
            <span>Número: <b style={{ color: M.text }}>{INVOICE.number}</b></span>
            <span>Fecha: <b style={{ color: M.text }}>{INVOICE.date}</b></span>
            <span>Pago: <b style={{ color: M.text }}>{INVOICE.pay}</b></span>
            <span>Vence: <b style={{ color: M.text }}>{INVOICE.due}</b></span>
            <span style={{ color: '#6EE7B7', fontWeight: 600 }}>✓ PDF incluido</span>
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>Ítems <Muted style={{ fontWeight: 400, fontSize: 11 }}>({ITEMS.length} de {ITEMS.length} seleccionados)</Muted></div>
        <div style={{ border: `1px solid ${M.border}`, borderRadius: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '7px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${M.border}`, borderRadius: '10px 10px 0 0', fontSize: 10, fontWeight: 700, color: M.faint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <span>Producto</span><span>Cant.</span><span>Precio</span><span>IVA %</span><span>Margen %</span><span style={{ textAlign: 'right' }}>Subtotal</span>
          </div>
          {ITEMS.map((it, i) => {
            const link = it.auto ? true : s[`link${i}`];
            const isNew = link === 'new';
            const ddHere = i === 2 && s.dd;
            return (
              <div
                key={it.sku}
                style={{ position: 'relative', display: 'grid', gridTemplateColumns: grid, gap: 8, padding: '6px 12px', alignItems: 'center', fontSize: 11.5, borderBottom: i === ITEMS.length - 1 ? 'none' : `1px solid ${M.border}` }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
                  <div style={{ marginTop: 3, position: 'relative' }}>
                    <LinkPill id={`link-${i}`} value={link} matchLabel={it.match} open={ddHere} />
                    {ddHere && (
                      <div className="pbd-anim pbd-fade" style={{ position: 'absolute', left: 0, top: '100%', marginTop: 3, zIndex: 30, width: 190, background: M.panel2, border: `1px solid ${M.border2}`, borderRadius: 8, boxShadow: '0 10px 26px rgba(0,0,0,0.55)', padding: 4 }}>
                        <div data-demo-id="opt-new" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, background: M.blueBg, fontSize: 11, color: '#C4B5FD', fontWeight: 600 }}>
                          <MockIcon name="plus" size={11} color="#C4B5FD" /> Crear como producto nuevo
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <span>{it.qty}</span>
                <span>{fmt(it.price)}</span>
                <span style={{ display: 'inline-block', width: 34, textAlign: 'center', padding: '2px 0', borderRadius: 5, border: `1px solid ${M.border2}`, background: M.bg }}>19</span>
                <div>
                  {isNew ? (
                    <>
                      <MockInput id="margin-input" value={s.margin} typing={typing === 'margin'} placeholder="General" />
                      {marginNum > 0 && <div data-demo-id="sale-price" style={{ fontSize: 9.5, color: '#6EE7B7', marginTop: 2 }}>Venta: {fmt(sale)}</div>}
                    </>
                  ) : (
                    <Muted style={{ fontSize: 10.5 }}>—</Muted>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b>{fmt(subtotalOf(it))}</b>
                  <div style={{ fontSize: 9.5, color: M.faint }}>+{fmt(subtotalOf(it) * IVA)} IVA</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, fontSize: 10.5, color: M.amber, minHeight: 28 }}>
          {pending > 0 && `${pending} ${pending === 1 ? 'ítem necesita' : 'ítems necesitan'} que confirmes con qué producto vincularlo (o crearlo nuevo) antes de importar.`}
        </div>
        <div data-demo-id="totals" style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '4px 10px', borderRadius: 8 }}>
          <span style={{ fontSize: 11, color: M.muted }}>Total:</span>
          <b style={{ fontSize: 17, fontFamily: FONT_TITLE, color: M.blueSoft }}>{fmt(TOTAL)}</b>
        </div>
        <MockButton id="btn-importar-factura" disabled={pending > 0} style={{ background: '#16A34A' }}>
          <MockIcon name="check" size={12} color="#fff" /> Importar Factura
        </MockButton>
      </div>
    </div>
  );
}

function DoneBody() {
  const row = { fontSize: 12, color: '#6EE7B7' };
  return (
    <div style={{ padding: '18px 20px 22px' }}>
      <div className="pbd-anim pbd-fade" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '18px 20px', borderRadius: 12, border: '2px solid #10B981', background: 'rgba(16,185,129,0.10)' }}>
        <span style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MockIcon name="check" size={24} color="#10B981" strokeWidth={3} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 17, fontWeight: 700, color: '#A7F3D0', marginBottom: 8 }}>Factura Importada Exitosamente</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
            <span style={row}>Proveedor: <b style={{ color: '#ECFDF5' }}>{SUPPLIER.name}</b></span>
            <span style={row}>Factura: <b style={{ color: '#ECFDF5' }}>{INVOICE.number}</b></span>
            <span style={row}>Items: <b style={{ color: '#ECFDF5' }}>{ITEMS.length}</b></span>
            <span style={row}>Nuevos productos: <b style={{ color: '#ECFDF5' }}>1</b></span>
            <span style={{ ...row, gridColumn: '1 / -1' }}>Total: <b style={{ color: '#ECFDF5', fontSize: 17 }}>{fmt(TOTAL)}</b></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportBody({ s, typing }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'linear-gradient(90deg, #2563EB, #9333EA)', padding: '12px 18px', color: '#fff' }}>
        <MockIcon name="file" size={18} color="#fff" />
        <span style={{ flex: 1, fontFamily: FONT_TITLE, fontSize: 16, fontWeight: 700 }}>Importar Factura Electrónica</span>
        <MockIcon name="x" size={16} color="#fff" />
      </div>
      {(s.phase === 'zone' || s.phase === 'loading') && <DropZone s={s} />}
      {s.phase === 'preview' && <PreviewBody s={s} typing={typing} />}
      {s.phase === 'done' && <DoneBody />}
    </div>
  );
}

/* ───────────── Pantalla ───────────── */

export function MockImportarFactura({ state: s, typing }) {
  return (
    <MockWindow sidebar={<MockSidebar active="inventario" activeChild="Compras" />}>
      <ListView s={s} />
      <MockToast show={s.toast}>{s.toastText}</MockToast>
      <MockModal open={s.modal} width={700}><ImportBody s={s} typing={typing} /></MockModal>
    </MockWindow>
  );
}

/* ───────────── Guion ───────────── */

const steps = [
  // 1 · Abrir la importación
  { do: 'caption', text: 'Olvida digitar facturas de compra' },
  { do: 'wait', ms: 400 },
  { do: 'click', on: 'btn-importar', set: { modal: true, phase: 'zone' } },
  { do: 'wait', ms: 450 },

  // 2 · Arrastrar el ZIP
  { do: 'caption', text: 'Arrastra el ZIP de la factura electrónica' },
  { do: 'set', patch: { hover: true } },
  { do: 'move', to: 'drop-zone' },
  { do: 'wait', ms: 600 },
  { do: 'click', on: 'drop-zone', set: { hover: false, phase: 'loading' } },
  { do: 'wait', ms: 1100 },

  // 3 · Lectura del XML
  { do: 'caption', text: 'Lee el XML y detecta proveedor e ítems' },
  { do: 'set', patch: { phase: 'preview' } },
  { do: 'wait', ms: 300 },
  { do: 'highlight', on: 'prov-card', ms: 1400 },

  // 4 · Vincular o crear
  { do: 'caption', text: 'Vincula con tu catálogo o crea productos nuevos' },
  { do: 'click', on: 'link-0', set: { link0: true } },
  { do: 'wait', ms: 250 },
  { do: 'click', on: 'link-1', set: { link1: true } },
  { do: 'wait', ms: 250 },
  { do: 'click', on: 'link-2', set: { dd: true } },
  { do: 'wait', ms: 350 },
  { do: 'click', on: 'opt-new', set: { dd: false, link2: 'new' } },
  { do: 'wait', ms: 400 },

  // 5 · Margen y precio de venta
  { do: 'caption', text: 'Define tu margen y el precio de venta se calcula' },
  { do: 'type', into: 'margin-input', field: 'margin', text: '35', perChar: 220 },
  { do: 'wait', ms: 1100 },

  // 6 · Totales e importar
  { do: 'caption', text: 'Revisa los totales' },
  { do: 'highlight', on: 'totals', ms: 1500 },
  { do: 'click', on: 'btn-importar-factura', set: { phase: 'done' } },
  { do: 'wait', ms: 600 },

  // 7 · Resultado
  { do: 'caption', text: 'Compra registrada, lista para confirmar' },
  { do: 'wait', ms: 1600 },
  { do: 'set', patch: { modal: false, imported: true, toast: true, toastText: 'Factura importada' } },
  { do: 'wait', ms: 600 },
  { do: 'set', patch: { toast: false } },
  { do: 'highlight', on: 'new-row', ms: 1500 },
  { do: 'wait', ms: 400 },
];

const tourImportarFactura = {
  id: 'importar-factura',
  title: 'Importar factura de proveedor',
  module: 'Compras',
  audience: 'negocio',
  duration: 28,
  summary: 'Sube el ZIP de la factura electrónica de tu proveedor y Pitbox arma la compra: proveedor, ítems, productos y totales.',
  Screen: MockImportarFactura,
  camera: (s) => (s.modal ? { x: 574, y: 317, zoom: 0.85 } : null),
  initialState: {
    modal: false, phase: 'zone', hover: false,
    link0: false, link1: false, link2: false, dd: false, margin: '',
    imported: false, toast: false, toastText: '',
  },
  steps,
};

export default tourImportarFactura;
