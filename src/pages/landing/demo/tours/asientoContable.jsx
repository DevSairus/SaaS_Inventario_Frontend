/**
 * Tour 4 · Asiento contable, automático y manual (~32 s)
 *
 * Referencia real (estructura y textos, NO datos):
 *   - Listado → pages/accounting/JournalEntriesPage.jsx ("Asientos Contables", filtros, botón
 *               "Asiento Manual", columnas N° / Fecha / Origen / Tercero / Descripción / Débito / Crédito)
 *   - Detalle → modal del asiento: encabezado con número y origen, líneas Cuenta / Tercero / Débito /
 *               Crédito, Total, estado (Borrador / Contabilizado) y botones Contabilizar / Anular / Reversar
 *   - Manual  → modal "Nuevo Asiento Manual": Fecha, Descripción, líneas con "Buscar cuenta por código
 *               o nombre...", "Tercero (opcional)...", indicador "✗ No cuadra" / "✓ Cuadra" y botón
 *               "Crear en Borrador" (deshabilitado hasta que cuadre)
 *
 * Simplificaciones deliberadas (lienzo de 960×600):
 *   - Listado con pocas filas y su paginación ("1–6 de 6 · Mostrar 10 por página"); la app real
 *     todavía no pagina, y aquí no se dibuja la lista larga ni el scroll horizontal.
 *   - Filtros reducidos a estado, origen y búsqueda.
 *   - Menú de Contabilidad con solo 4 de sus opciones.
 *   - El asiento de la venta no incluye el costo de ventas ni el inventario (solo ingreso e IVA).
 *   - Los modales se dibujan en tema oscuro (en la app real son claros).
 *
 * DATOS: todos ficticios. La venta es la misma del tour de factura (DEM-FE-0001, Carlos Ruiz,
 * $ 199.000 = $ 180.000 + $ 19.000 de IVA).
 *
 * ATENCIÓN (plan, sección 5): los códigos del PUC de las cuentas de ejemplo (130505, 413595,
 * 240801, 110505, 111005) deben validarse con el contador ANTES de publicar el demo.
 */
import { M, FONT_TITLE } from '../theme';
import MockWindow from '../mocks/MockWindow';
import MockSidebar from '../mocks/MockSidebar';
import MockInput from '../mocks/MockInput';
import MockButton from '../mocks/MockButton';
import MockBadge from '../mocks/MockBadge';
import MockToast from '../mocks/MockToast';
import MockModal from '../mocks/MockModal';
import MockIcon from '../mocks/MockIcon';

const fmt = (n) => `$ ${Number(n).toLocaleString('es-CO')}`;
const num = (t) => Number(String(t || '').replace(/\D/g, '')) || 0;
const Muted = ({ children, style }) => <span style={{ color: M.muted, ...style }}>{children}</span>;

const SALE = {
  number: 'AST-2026-00005', date: '2026-10-30', origin: 'Venta', docNumber: 'DEM-FE-0001',
  customer: { name: 'Carlos Ruiz', doc: '1.000.000.001' },
  description: 'Venta DEM-FE-0001',
  lines: [
    { acc: '130505 - Clientes Nacionales', note: 'Venta a crédito o contado por cobrar', debit: 199000, credit: 0, third: true },
    { acc: '413595 - Ingresos por ventas', note: 'Repuestos y mano de obra', debit: 0, credit: 180000 },
    { acc: '240801 - IVA por pagar', note: 'IVA generado 19 %', debit: 0, credit: 19000 },
  ],
};
const SALE_TOTAL = SALE.lines.reduce((a, l) => a + l.debit, 0);

const MANUAL = {
  number: 'AST-2026-00006', date: '2026-10-30', description: 'Consignación de efectivo a banco', amount: '120.000',
  acc0: '111005 - Bancos - Moneda Nacional', acc1: '110505 - Caja General',
};

// Filas de relleno del listado (ficticias).
const BASE_ROWS = [
  { n: 'AST-2026-00004', d: '2026-10-27', o: 'Compra', t: 'Repuestos del Norte', tag: 'Proveedor', desc: 'Compra PC-2026-0003', v: 240000, st: 'posted' },
  { n: 'AST-2026-00003', d: '2026-10-25', o: 'Gasto', t: null, desc: 'Gasto GAS-2026-00001 — Servicios', v: 85000, st: 'draft' },
  { n: 'AST-2026-00002', d: '2026-10-22', o: 'Recaudo de cartera', t: 'Ana Gómez', tag: 'Cliente', desc: 'Abono a venta REM-2026-0001', v: 120000, st: 'posted' },
  { n: 'AST-2026-00001', d: '2026-10-20', o: 'Venta', t: 'Luis Pérez', tag: 'Cliente', desc: 'Venta REM-2026-0001', v: 150000, st: 'posted' },
];

/* ───────────── Listado ───────────── */

const GRID = '1.3fr 1fr 1.1fr 1.55fr 1.9fr 0.95fr 0.95fr 1.1fr';
const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 };

function StatusBadge({ st }) {
  return st === 'posted' ? <MockBadge tone="green">Contabilizado</MockBadge> : <MockBadge tone="amber">Borrador</MockBadge>;
}

function Row({ r, last }) {
  return (
    <div
      data-demo-id={r.id}
      className={r.fresh ? 'pbd-anim pbd-fade' : undefined}
      style={{
        display: 'grid', gridTemplateColumns: GRID, gap: 6, padding: '0 10px', height: 40, alignItems: 'center',
        fontSize: 10.5, borderBottom: last ? 'none' : `1px solid ${M.border}`,
      }}
    >
      <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 9.5, color: M.muted }}>{r.n}</span>
      <span style={{ color: M.muted }}>{r.d}</span>
      <span style={{ ...ellipsis, fontSize: 10.5 }}>{r.o}</span>
      <span style={{ ...ellipsis, lineHeight: 1.25 }}>
        {r.t ? (
          <>
            <span style={{ ...ellipsis, display: 'block', fontSize: 10.5 }}>{r.t}</span>
            <span style={{ fontSize: 8.5, color: r.tag === 'Proveedor' ? '#FCD34D' : '#93C5FD' }}>{r.tag}</span>
          </>
        ) : <Muted>—</Muted>}
      </span>
      <span style={{ ...ellipsis }}>{r.desc}</span>
      <span>{fmt(r.v)}</span>
      <span>{fmt(r.v)}</span>
      <StatusBadge st={r.st} />
    </div>
  );
}

function ListView({ s }) {
  const rows = [
    ...(s.manualRow ? [{ id: 'row-manual', fresh: true, n: MANUAL.number, d: MANUAL.date, o: 'Manual', t: null, desc: MANUAL.description, v: num(MANUAL.amount), st: 'draft' }] : []),
    ...(s.sale ? [{ id: 'row-sale', fresh: s.saleFresh, n: SALE.number, d: SALE.date, o: SALE.origin, t: SALE.customer.name, tag: 'Cliente', desc: SALE.description, v: SALE_TOTAL, st: s.saleStatus }] : []),
    ...BASE_ROWS,
  ];
  const selectBox = (label) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 130, height: 28, padding: '0 10px', borderRadius: 7, border: `1px solid ${M.border2}`, background: M.bg, fontSize: 11, color: M.text }}>
      {label}<span style={{ color: M.faint, fontSize: 8 }}>▼</span>
    </div>
  );
  return (
    <div style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 21, fontWeight: 700 }}>Asientos Contables</div>
          <div style={{ fontSize: 11, color: M.muted }}>Ventas, compras y gastos generan asientos automáticos en borrador para tu revisión</div>
        </div>
        <MockButton id="btn-manual" style={{ background: '#4F46E5' }}><MockIcon name="plus" size={12} color="#fff" /> Asiento Manual</MockButton>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', marginBottom: 10, borderRadius: 10, border: `1px solid ${M.border}`, background: M.panel }}>
        {selectBox('Todos los estados')}
        {selectBox('Todos los orígenes')}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, height: 28, padding: '0 10px', borderRadius: 7, border: `1px solid ${M.border2}`, background: M.bg, fontSize: 11, color: M.faint }}>
          <MockIcon name="search" size={12} color={M.faint} /> N° o descripción...
        </div>
      </div>

      <div style={{ border: `1px solid ${M.border}`, borderRadius: 10, background: M.panel, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: GRID, gap: 6, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${M.border}`,
          fontSize: 9.5, fontWeight: 700, color: M.faint, textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          <span>N°</span><span>Fecha</span><span>Origen</span><span>Tercero</span><span>Descripción</span><span>Débito</span><span>Crédito</span><span>Estado</span>
        </div>
        {rows.map((r, i) => <Row key={r.n} r={r} last={i === rows.length - 1} />)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: `1px solid ${M.border}`, fontSize: 11, color: M.muted }}>
          <span>1–{rows.length} de {rows.length}</span>
          <span style={{ marginLeft: 6 }}>Mostrar</span>
          <span style={{ padding: '2px 10px', borderRadius: 6, border: `1px solid ${M.border2}`, background: M.bg, color: M.text }}>10 ▾</span>
          <span>por página</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Modal: detalle del asiento ───────────── */

function DetailBody({ s }) {
  const posted = s.saleStatus === 'posted';
  const btn = { small: true };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 18px 10px', borderBottom: `1px solid ${M.border}` }}>
        <div style={{ lineHeight: 1.35 }}>
          <div><b style={{ fontSize: 14 }}>{SALE.number}</b> <Muted style={{ fontSize: 10.5 }}>{SALE.origin}</Muted></div>
          <Muted style={{ fontSize: 10.5 }}>{SALE.date} — {SALE.description}</Muted>
          <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '3px 9px', borderRadius: 8, border: `1px solid ${M.border2}`, fontSize: 10.5 }}>
            <Muted>Tercero:</Muted><b>{SALE.customer.name}</b><Muted style={{ fontSize: 9.5 }}>{SALE.customer.doc}</Muted>
            <span style={{ fontSize: 8.5, fontWeight: 600, color: '#93C5FD', background: 'rgba(59,130,246,0.16)', padding: '1px 6px', borderRadius: 100 }}>Cliente</span>
          </div>
        </div>
        <MockIcon name="x" size={15} color={M.muted} />
      </div>

      <div style={{ padding: '10px 18px 4px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr', gap: 8, fontSize: 9.5, fontWeight: 700, color: M.faint, textTransform: 'uppercase', letterSpacing: '0.04em', paddingBottom: 6 }}>
          <span>Cuenta</span><span>Tercero</span><span style={{ textAlign: 'right' }}>Débito</span><span style={{ textAlign: 'right' }}>Crédito</span>
        </div>
        {SALE.lines.map((l) => (
          <div key={l.acc} style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr', gap: 8, alignItems: 'center', padding: '6px 0', borderTop: `1px solid ${M.border}`, fontSize: 11 }}>
            <div style={{ lineHeight: 1.3 }}>{l.acc}<br /><Muted style={{ fontSize: 9.5 }}>{l.note}</Muted></div>
            <span style={{ fontSize: 10.5 }}>{l.third ? SALE.customer.name : <Muted>—</Muted>}</span>
            <span style={{ textAlign: 'right' }}>{l.debit ? fmt(l.debit) : <Muted>—</Muted>}</span>
            <span style={{ textAlign: 'right' }}>{l.credit ? fmt(l.credit) : <Muted>—</Muted>}</span>
          </div>
        ))}
        <div data-demo-id="detail-total" style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr', gap: 8, padding: '7px 0 8px', borderTop: `1px solid ${M.border2}`, fontSize: 11.5, fontWeight: 700 }}>
          <span>Total</span><span />
          <span style={{ textAlign: 'right' }}>{fmt(SALE_TOTAL)}</span>
          <span style={{ textAlign: 'right' }}>{fmt(SALE_TOTAL)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px 14px', borderTop: `1px solid ${M.border}` }}>
        <StatusBadge st={s.saleStatus} />
        <div style={{ display: 'flex', gap: 6 }}>
          {posted ? (
            <MockButton {...btn} variant="ghost" style={{ color: '#FCD34D', borderColor: 'rgba(245,158,11,0.5)' }}>Reversar</MockButton>
          ) : (
            <MockButton id="btn-contabilizar" {...btn} style={{ background: '#16A34A' }}><MockIcon name="check" size={11} color="#fff" /> Contabilizar</MockButton>
          )}
          <MockButton {...btn} variant="ghost" style={{ color: '#FCA5A5', borderColor: 'rgba(239,68,68,0.45)' }}>Anular</MockButton>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Modal: Nuevo Asiento Manual ───────────── */

function ManualBody({ s, typing }) {
  const deb = num(s.deb0);
  const cre = num(s.cre1);
  const balanced = deb > 0 && deb === cre;
  const line = (n, accField, accVal, debField, debVal, creField, creVal) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.35fr 0.8fr 0.8fr 22px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
      <MockInput
        id={`f-acc${n}`} placeholder="Buscar cuenta por código o nombre..." value={accVal} typing={typing === accField}
        leading={<MockIcon name="search" size={12} color={M.faint} />}
      />
      <MockInput placeholder="Tercero (opcional)..." leading={<MockIcon name="search" size={12} color={M.faint} />} />
      <MockInput id={debField ? `f-${debField}` : undefined} placeholder="Débito" value={debVal} typing={!!debField && typing === debField} />
      <MockInput id={creField ? `f-${creField}` : undefined} placeholder="Crédito" value={creVal} typing={!!creField && typing === creField} />
      <MockIcon name="x" size={13} color={M.faint} />
    </div>
  );
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: `1px solid ${M.border}`, fontFamily: FONT_TITLE, fontSize: 15, fontWeight: 700 }}>
        Nuevo Asiento Manual <MockIcon name="x" size={15} color={M.muted} />
      </div>
      <div style={{ padding: '12px 18px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12, marginBottom: 10 }}>
          <MockInput label="Fecha" value="30/10/2026" trailing={<MockIcon name="calendar" size={13} color={M.muted} />} />
          <MockInput id="f-desc" label="Descripción" value={s.desc} typing={typing === 'desc'} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.35fr 0.8fr 0.8fr 22px', gap: 8, fontSize: 9.5, fontWeight: 700, color: M.faint, textTransform: 'uppercase', marginBottom: 5 }}>
          <span>Cuenta</span><span>Tercero</span><span>Débito</span><span>Crédito</span><span />
        </div>
        {line(0, 'acc0', s.acc0, 'deb0', s.deb0, null, '')}
        {line(1, 'acc1', s.acc1, null, '', 'cre1', s.cre1)}
        <div style={{ fontSize: 11, color: M.blueSoft, margin: '2px 0 10px' }}>+ Agregar línea</div>
        <div
          data-demo-id="balance"
          style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 11.5, transition: 'background 0.2s, color 0.2s',
            background: balanced ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)', color: balanced ? '#6EE7B7' : '#FCA5A5',
          }}
        >
          Débito: {fmt(deb)} — Crédito: {fmt(cre)} {balanced ? '✓ Cuadra' : '✗ No cuadra'}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14, padding: '10px 18px 14px', borderTop: `1px solid ${M.border}` }}>
        <span style={{ fontSize: 12, color: M.muted }}>Cancelar</span>
        <MockButton id="btn-crear" disabled={!balanced} style={{ background: '#4F46E5' }}>Crear en Borrador</MockButton>
      </div>
    </div>
  );
}

/* ───────────── Pantalla ───────────── */

export function MockAsientoContable({ state: s, typing }) {
  return (
    <MockWindow sidebar={<MockSidebar active="contabilidad" activeChild="Asientos Contables" />}>
      <ListView s={s} />
      <MockToast show={s.toast}>{s.toastText}</MockToast>
      <MockModal open={s.detail} width={560}><DetailBody s={s} /></MockModal>
      <MockModal open={s.manual} width={620}><ManualBody s={s} typing={typing} /></MockModal>
    </MockWindow>
  );
}

/* ───────────── Guion ───────────── */

const steps = [
  // 1 · La venta genera el asiento
  { do: 'caption', text: 'Facturas y ventas, y la contabilidad ya está al día' },
  { do: 'wait', ms: 500 },
  { do: 'set', patch: { toast: true, toastText: 'Venta DEM-FE-0001 facturada' } },
  { do: 'wait', ms: 900 },
  { do: 'set', patch: { toast: false, sale: true, saleFresh: true } },
  { do: 'wait', ms: 500 },

  // 2 · Aparece solo, en borrador
  { do: 'caption', text: 'El asiento se genera solo desde la operación' },
  { do: 'highlight', on: 'row-sale', ms: 1500 },

  // 3 · Partida doble
  { do: 'caption', text: 'Partida doble, siempre cuadrada' },
  { do: 'click', on: 'row-sale', set: { detail: true } },
  { do: 'wait', ms: 500 },
  { do: 'highlight', on: 'detail-total', ms: 1500 },

  // 4 · Contabilizar
  { do: 'caption', text: 'Un clic para contabilizar' },
  { do: 'click', on: 'btn-contabilizar', set: { saleStatus: 'posted', toast: true, toastText: 'Asiento contabilizado' } },
  { do: 'wait', ms: 1200 },
  { do: 'set', patch: { toast: false, detail: false, saleFresh: false } },
  { do: 'wait', ms: 400 },

  // 5 · Asiento manual
  { do: 'caption', text: '¿Un ajuste manual? También' },
  { do: 'click', on: 'btn-manual', set: { manual: true } },
  { do: 'wait', ms: 400 },
  { do: 'type', into: 'f-desc', field: 'desc', text: MANUAL.description, perChar: 45 },
  { do: 'wait', ms: 250 },

  // 6 · Se descuadra
  { do: 'caption', text: 'Te avisa si no cuadra' },
  { do: 'type', into: 'f-acc0', field: 'acc0', text: MANUAL.acc0, perChar: 40 },
  { do: 'type', into: 'f-deb0', field: 'deb0', text: MANUAL.amount, perChar: 130 },
  { do: 'type', into: 'f-acc1', field: 'acc1', text: MANUAL.acc1, perChar: 40 },
  { do: 'highlight', on: 'balance', ms: 1400 },

  // 7 · Cuadra y se guarda
  { do: 'caption', text: 'Solo se guarda cuando cuadra' },
  { do: 'type', into: 'f-cre1', field: 'cre1', text: MANUAL.amount, perChar: 130 },
  { do: 'wait', ms: 900 },
  { do: 'click', on: 'btn-crear', set: { manual: false, manualRow: true, toast: true, toastText: 'Asiento creado en borrador' } },
  { do: 'wait', ms: 1300 },
  { do: 'set', patch: { toast: false } },
  { do: 'highlight', on: 'row-manual', ms: 1400 },
];

const tourAsientoContable = {
  id: 'asiento-contable',
  title: 'Asiento contable',
  module: 'Contabilidad',
  duration: 32,
  summary: 'Cada venta, compra y gasto genera su asiento de partida doble; contabilízalo con un clic o crea ajustes manuales que te avisan si no cuadran.',
  Screen: MockAsientoContable,
  camera: (s) => (s.detail || s.manual ? { x: 574, y: 317, zoom: 0.85 } : null),
  initialState: {
    sale: false, saleFresh: false, saleStatus: 'draft',
    detail: false,
    manual: false, desc: '', acc0: '', deb0: '', acc1: '', cre1: '', manualRow: false,
    toast: false, toastText: '',
  },
  steps,
};

export default tourAsientoContable;
