/**
 * Tour · Cotización que el cliente aprueba desde su celular (~25 s) — audiencia: cliente
 *
 * Referencia real (capturas del 30/oct/2026; el detalle es SaleDetailPage.jsx en modo cotización):
 *   - Listado   → pages/sales/QuotesPage.jsx ("Cotizaciones", botones "Condiciones" y "Nueva cotización")
 *   - Formulario→ "Nueva Cotización" (Información General + Productos + totales)
 *   - Detalle   → "COT-2026-xxxx" (Editar, Registrar aprobación, Anular, Eliminar, Copiar enlace, WhatsApp)
 *   - Cliente   → pages/sales/QuotePublicPage.jsx ("Tu respuesta": ítems con interruptor, nombre y documento)
 *   - Convertir → modal "Convertir a Orden de Trabajo" (placa, marca, modelo, año, color, tipo)
 *
 * Verificado contra el código (pages/sales/SaleDetailPage.jsx): "Convertir a Orden de Trabajo" vive en
 * el menú "Más acciones" (⋮) del detalle; al responder el cliente el Historial muestra
 * "Cotización aprobada".
 *
 * POR CONFIRMAR antes de publicar: el texto del mensaje de WhatsApp (es ilustrativo).
 *
 * Simplificaciones (lienzo 960×600): formulario sin placa/tipo/kilometraje/notas; la página pública
 * se dibuja en formato celular (en la app es una página ancha).
 *
 * DATOS: todos ficticios. Las capturas traen nombres, teléfonos y correos reales de pruebas: aquí
 * no se reproduce ninguno. Los montos de los dos ítems sí coinciden con la captura (IVA 19 %).
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
import MockPhone, { PhoneField, WaPhone, pubCard, pubLabel } from '../mocks/MockPhone';

const NUMBER = 'DEM-COT-0016';
const TODAY = '30/10/2026';
const VALID_UNTIL = '14/11/2026';
const WORKSHOP = { name: 'Taller Demo', nit: 'NIT 900.000.000-0' };
const CUSTOMER = { name: 'Carlos Ruiz', phone: '300 000 0000', email: 'carlos.ruiz@ejemplo.com', doc: '1.000.000.001' };
const VEHICLE = { plate: 'ABC123', brand: 'MAZDA', model: '3', year: '2022', color: 'GRIS' };

const IVA = 0.19;
const ITEMS = [
  { name: 'Filtro de aceite', sku: 'DEM-FIL-001', price: 15000 },
  { name: 'Pastillas de freno delanteras', sku: 'DEM-FRE-001', price: 36800 },
].map((i) => ({ ...i, iva: Math.round(i.price * IVA), total: i.price + Math.round(i.price * IVA) }));

const fmt = (n) => `$ ${Number(n).toLocaleString('es-CO')}`;
function totalsOf(count) {
  const list = ITEMS.slice(0, count);
  const subtotal = list.reduce((a, i) => a + i.price, 0);
  const iva = list.reduce((a, i) => a + i.iva, 0);
  return { subtotal, iva, total: subtotal + iva };
}
const T = totalsOf(ITEMS.length); // 51.800 + 9.842 = 61.642

const back = <div style={{ padding: 6, color: M.muted }}><MockIcon name="arrowLeft" size={16} /></div>;

/* ───────────── Pantallas del backoffice ───────────── */

function ListView() {
  const rows = [
    { n: 'DEM-COT-0015', c: 'María Londoño', o: 'Venta', d: '29/10/2026', t: 148750, e: ['blue', 'Enviada'] },
    { n: 'DEM-COT-0014', c: 'Pedro Ospina', o: 'Venta', d: '29/10/2026', t: 96900, e: ['gray', 'Borrador'] },
    { n: 'DEM-COT-0013', c: 'Luisa Parra', o: 'Venta', d: '28/10/2026', t: 215000, e: ['blue', 'Enviada'] },
    { n: 'DEM-COT-0012', c: 'Andrea Gil', o: 'Taller', d: '27/10/2026', t: 74300, e: ['green', 'Aprobada'] },
    { n: 'DEM-COT-0011', c: 'Julián Mora', o: 'Venta', d: '27/10/2026', t: 58000, e: ['gray', 'Borrador'] },
  ];
  return (
    <div style={{ padding: '18px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 19, fontWeight: 700 }}>Cotizaciones</div>
          <div style={{ fontSize: 11.5, color: M.muted, marginTop: 2 }}>15 resultados</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <MockButton variant="ghost"><MockIcon name="clipboard" size={13} /> Condiciones</MockButton>
          <MockButton id="btn-nueva-cotizacion"><MockIcon name="plus" size={13} color="#fff" /> Nueva cotización</MockButton>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <MockInput placeholder="Buscar por cliente o placa..." leading={<MockIcon name="search" size={13} color={M.faint} />} />
      </div>
      <MockTable
        columns={[
          { key: 'n', label: '#', width: 1.2 }, { key: 'c', label: 'Cliente', width: 1.4 }, { key: 'o', label: 'Origen', width: 0.8 },
          { key: 'd', label: 'Fecha', width: 1 }, { key: 't', label: 'Total', width: 1 }, { key: 'e', label: 'Estado', width: 1 },
        ]}
        rows={rows.map((r) => ({
          cells: {
            n: <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11 }}>{r.n}</span>,
            c: <b>{r.c}</b>, o: <MockBadge tone="gray">{r.o}</MockBadge>, d: r.d, t: <b>{fmt(r.t)}</b>,
            e: <MockBadge tone={r.e[0]}>{r.e[1]}</MockBadge>,
          },
        }))}
      />
    </div>
  );
}

function FormView({ s, typing }) {
  const t = totalsOf(s.items);
  return (
    <div style={{ padding: '12px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {back}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_TITLE, fontSize: 19, fontWeight: 700 }}>Nueva Cotización</div>
          <div style={{ fontSize: 11, color: M.muted }}>Se guarda en Cotizaciones; pasa a Ventas solo cuando el cliente la aprueba y la conviertes</div>
        </div>
        <MockButton variant="ghost">Cancelar</MockButton>
        <MockButton id="btn-guardar" disabled={!s.cliente || s.items < 2}><MockIcon name="save" size={13} color="#fff" /> Guardar</MockButton>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <MockCard icon="file" title="Información General">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.6fr', gap: 12, alignItems: 'start' }}>
            <MockInput label="Fecha *" value={TODAY} trailing={<MockIcon name="calendar" size={13} color={M.muted} />} />
            <MockInput label="Válida hasta" placeholder="dd/mm/aaaa" trailing={<MockIcon name="calendar" size={13} color={M.muted} />} hint={'\u00a0'} />
            <div style={{ position: 'relative' }}>
              <MockInput
                id="cli-input" label="Cliente *" placeholder="Buscar cliente por nombre, NIT o teléfono..."
                value={s.cliQuery} typing={typing === 'cliQuery'} state={s.cliente ? 'ok' : 'normal'}
                leading={<MockIcon name="search" size={13} color={M.faint} />}
              />
              <MockDropdown open={s.cliOpen}>
                <div data-demo-id="cli-option" style={{ padding: '8px 10px', background: M.blueBg }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{CUSTOMER.name}</div>
                  <div style={{ fontSize: 10.5, color: M.blueSoft, marginTop: 1 }}>{CUSTOMER.phone}</div>
                </div>
              </MockDropdown>
            </div>
          </div>
        </MockCard>

        <MockCard
          icon="cart" title={`Productos (${s.items})`}
          right={(
            <div style={{ display: 'flex', gap: 6 }}>
              <MockButton id="btn-add-producto" small><MockIcon name="plus" size={11} color="#fff" /> Agregar Producto</MockButton>
              <MockButton small variant="soft">Línea Libre</MockButton>
              <MockButton small variant="green">Combo</MockButton>
              <MockButton small variant="green">Escanear</MockButton>
            </div>
          )}
        >
          <div style={{ minHeight: 112 }}>
            <MockTable
              columns={[
                { key: 'p', label: 'Producto', width: 2.4 }, { key: 'q', label: 'Cant.', width: 0.7 },
                { key: 'u', label: 'Precio unit.', width: 1 }, { key: 'v', label: 'IVA %', width: 0.7 }, { key: 't', label: 'Total', width: 1 },
              ]}
              rows={ITEMS.slice(0, s.items).map((i) => ({
                cells: {
                  p: <span><b>{i.name}</b> <span style={{ color: M.faint, fontSize: 10.5 }}>· {i.sku}</span></span>,
                  q: '1', u: fmt(i.price), v: '19', t: <b>{fmt(i.total)}</b>,
                },
              }))}
            />
          </div>
        </MockCard>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 28, alignItems: 'baseline', padding: '0 6px' }}>
          <span style={{ fontSize: 11.5, color: M.muted }}>Subtotal {fmt(t.subtotal)} · IVA {fmt(t.iva)}</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>TOTAL</span>
          <span style={{ fontFamily: FONT_TITLE, fontSize: 22, fontWeight: 700, color: M.blueSoft }}>{fmt(t.total)}</span>
        </div>
      </div>
    </div>
  );
}

function DetailView({ s }) {
  const approved = s.status === 'aprobada';
  return (
    <div style={{ padding: '14px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: M.muted, marginBottom: 8 }}>
        <MockIcon name="arrowLeft" size={14} /> Volver a Cotizaciones
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9.5, color: M.faint, letterSpacing: '0.06em' }}>COTIZACIÓN</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: FONT_TITLE, fontSize: 24, fontWeight: 700 }}>{NUMBER}</span>
            <MockBadge tone={approved ? 'green' : 'gray'}>{approved ? 'Aprobada' : 'Borrador'}</MockBadge>
          </div>
          <div style={{ fontSize: 11, color: M.muted, marginTop: 2 }}>Válida hasta {VALID_UNTIL}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', position: 'relative' }}>
        <MockButton small variant="soft"><MockIcon name="file" size={11} /> Editar</MockButton>
        {!approved && <MockButton small variant="soft"><MockIcon name="check" size={11} /> Registrar aprobación</MockButton>}
        <MockButton small style={{ background: '#DC2626', border: '1px solid transparent' }}><MockIcon name="x" size={11} color="#fff" /> Anular</MockButton>
        <MockButton small style={{ background: '#DC2626', border: '1px solid transparent' }}>Eliminar</MockButton>
        <div style={{ position: 'relative' }}>
          <MockButton id="btn-more" small variant="ghost" style={{ padding: '5px 8px' }}><MockIcon name="dots" size={12} /></MockButton>
          <MockDropdown open={s.menuOpen}>
            <div data-demo-id="menu-convertir" style={{ padding: '8px 12px', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', background: M.blueBg }}>
              Convertir a Orden de Trabajo
            </div>
          </MockDropdown>
        </div>
        <MockButton small variant="ghost"><MockIcon name="link" size={11} /> Copiar enlace</MockButton>
        <MockButton small id="btn-whatsapp" style={{ background: '#22C55E', border: '1px solid transparent', color: '#fff' }}>
          <MockIcon name="message" size={11} color="#fff" /> WhatsApp
        </MockButton>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 12, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MockCard title="Ítems cotizados">
            <MockTable
              columns={[{ key: 'p', label: 'Producto', width: 2.2 }, { key: 'q', label: 'Cant.', width: 0.6 }, { key: 'u', label: 'Precio unit.', width: 1 }, { key: 't', label: 'Total', width: 1 }]}
              rows={ITEMS.map((i) => ({ cells: { p: <b>{i.name}</b>, q: '1.00', u: fmt(i.price), t: <b>{fmt(i.total)}</b> } }))}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 18, marginTop: 10 }}>
              <span style={{ fontSize: 11, color: M.muted }}>Subtotal {fmt(T.subtotal)} · IVA {fmt(T.iva)}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>TOTAL COTIZADO</span>
              <span style={{ fontFamily: FONT_TITLE, fontSize: 20, fontWeight: 700, color: M.blueSoft }}>{fmt(T.total)}</span>
            </div>
          </MockCard>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MockCard icon="user" title="Cliente">
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{CUSTOMER.name}</div>
            <div style={{ fontSize: 11, color: M.muted, marginTop: 2 }}>{CUSTOMER.phone}</div>
            <div style={{ fontSize: 11, color: M.muted }}>{CUSTOMER.email}</div>
          </MockCard>
          <MockCard icon="clock" title="Historial">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: M.blue }} /> Cotización creada
            </div>
            {approved && (
              <div className="pbd-anim pbd-fade" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, marginTop: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: M.green }} /> Cotización aprobada
              </div>
            )}
          </MockCard>
        </div>
      </div>
    </div>
  );
}

function ConvertBody({ s, typing }) {
  const f = (label, value) => <MockInput label={label} value={value} state={value ? 'ok' : 'normal'} />;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderBottom: `1px solid ${M.border}` }}>
        <MockIcon name="wrench" size={14} color={M.blueSoft} />
        <span style={{ fontWeight: 600, fontSize: 13 }}>Convertir a Orden de Trabajo</span>
      </div>
      <div style={{ padding: '10px 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 10.5, color: M.muted, lineHeight: 1.4 }}>
          El cliente y las líneas de la cotización se copian automáticamente. Solo falta el vehículo para crear la orden.
        </div>
        <MockInput id="conv-placa" label="Placa *" placeholder="ABC123" value={s.placa} typing={typing === 'placa'} state={s.placa ? 'ok' : 'normal'} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {f('Marca', s.vehFilled ? VEHICLE.brand : '')}{f('Modelo/Línea', s.vehFilled ? VEHICLE.model : '')}
          {f('Año', s.vehFilled ? VEHICLE.year : '')}{f('Color', s.vehFilled ? VEHICLE.color : '')}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
          <MockButton variant="ghost" style={{ flex: 1 }}>Cancelar</MockButton>
          <MockButton id="btn-crear-ot" style={{ flex: 1.3 }}>Crear Orden de Trabajo</MockButton>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Celular del cliente ───────────── */

function Toggle({ on }) {
  return (
    <span style={{ width: 22, height: 12, borderRadius: 7, background: on ? '#3b82f6' : '#d1d5db', position: 'relative', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 1.5, left: on ? 11 : 1.5, width: 9, height: 9, borderRadius: '50%', background: '#fff' }} />
    </span>
  );
}

function QuotePage({ s, typing }) {
  const approved = s.pstage === 'approved';
  return (
    <>
      <div style={{ ...pubCard, padding: '9px 11px' }}>
        <div style={{ fontSize: 7.5, letterSpacing: 1.2, fontWeight: 700, color: '#3b82f6' }}>COTIZACIÓN</div>
        <div style={{ fontSize: 17, fontWeight: 800, margin: '2px 0' }}>{NUMBER}</div>
        <div style={{ fontSize: 8.5, color: '#6b7280' }}>Para <b style={{ color: '#374151' }}>{CUSTOMER.name}</b> · {TODAY}</div>
        <div
          style={{
            display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 100, fontSize: 8, fontWeight: 700,
            background: approved ? '#d1fae5' : '#dbeafe', color: approved ? '#059669' : '#2563eb',
          }}
        >
          ● {approved ? 'Aprobada' : 'Pendiente de tu respuesta'}
        </div>
      </div>

      {approved ? (
        <div className="pbd-anim pbd-fade" style={{ ...pubCard, background: '#e7f1ec', border: '1px solid #b7dcc7', fontSize: 9, color: '#047857', lineHeight: 1.4 }}>
          <b>Aprobada</b> por {CUSTOMER.name} el 30 de octubre de 2026. Gracias, nos pondremos en contacto contigo para continuar.
        </div>
      ) : (
        <div style={{ ...pubCard, fontSize: 8.5, color: '#4b5563' }}>⏳ Oferta válida hasta el <b>14 de noviembre de 2026</b> · quedan 15 días</div>
      )}

      <div style={pubCard}>
        <div style={pubLabel}>Detalle</div>
        {ITEMS.map((i) => (
          <div key={i.sku} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 6, fontSize: 9.5 }}>
            <div><div style={{ fontWeight: 600 }}>{i.name}</div><div style={{ fontSize: 7.5, color: '#9ca3af' }}>1 × {fmt(i.price)} · IVA 19%</div></div>
            <b>{fmt(i.total)}</b>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 7, paddingTop: 5, fontSize: 8.5, color: '#6b7280' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{fmt(T.subtotal)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>IVA 19%</span><span>{fmt(T.iva)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 11, fontWeight: 800, color: '#2563eb' }}>
            <span style={{ color: '#111827' }}>Total cotizado</span><span>{fmt(T.total)}</span>
          </div>
        </div>
      </div>

      {!approved && (
        <div style={{ ...pubCard, padding: 0, overflow: 'hidden' }}>
          <div style={{ background: '#f5f8ff', padding: '8px 11px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700 }}>Tu respuesta</div>
            <div style={{ fontSize: 8, color: '#6b7280' }}>Desmarca lo que no quieras incluir y aprueba el resto.</div>
          </div>
          <div data-demo-id="ptoggles" style={{ padding: '4px 11px' }}>
            {ITEMS.map((i) => (
              <div key={i.sku} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '6px 0', fontSize: 9 }}>
                <span style={{ fontWeight: 600 }}>{i.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><b>{fmt(i.total)}</b><Toggle on /></span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f9fafb', padding: '6px 11px', fontSize: 8.5, color: '#6b7280' }}>
            <span>2 de 2 ítems</span><b style={{ color: '#111827', fontSize: 11 }}>{fmt(T.total)}</b>
          </div>
          <div style={{ padding: '8px 11px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <PhoneField id="pname" label="Nombre completo" value={s.pname} typing={typing === 'pname'} />
            <PhoneField id="pdoc" label="Documento de identidad" value={s.pdoc} typing={typing === 'pdoc'} />
            <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
              <span style={{ flex: 1, textAlign: 'center', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 0', fontSize: 8.5, fontWeight: 600 }}>Rechazar</span>
              <span data-demo-id="btn-aprobar" style={{ flex: 1.7, textAlign: 'center', background: '#3b82f6', color: '#fff', borderRadius: 6, padding: '6px 0', fontSize: 8.5, fontWeight: 700 }}>
                Aprobar · {fmt(T.total)}
              </span>
            </div>
            <div style={{ fontSize: 7, color: '#9ca3af', textAlign: 'center' }}>Tu respuesta queda registrada con tu nombre, documento y fecha.</div>
          </div>
        </div>
      )}
    </>
  );
}

function PhoneBody({ s, typing }) {
  if (s.pstage === 'chat') {
    return (
      <WaPhone
        name={WORKSHOP.name} height={400}
        messages={[{
          text: `Hola ${CUSTOMER.name.split(' ')[0]}, te enviamos tu cotización. Puedes revisarla y aprobarla desde este enlace.`,
          time: '10:12 a. m.',
          card: { title: `Cotización ${NUMBER}`, sub: `${fmt(T.total)} · válida hasta ${VALID_UNTIL}`, link: 'pitbox.app/c/demo' },
        }]}
      />
    );
  }
  return (
    <MockPhone title={WORKSHOP.name} subtitle={WORKSHOP.nit} width={270} height={420} scroll={s.scroll} icon="wrench">
      <QuotePage s={s} typing={typing} />
    </MockPhone>
  );
}

/* ───────────── Pantalla ───────────── */

export function MockCotizacion({ state: s, typing }) {
  const activeChild = s.view === 'form' ? 'Nueva cotización' : 'Listado';
  return (
    <MockWindow sidebar={<MockSidebar active="cotizaciones" activeChild={activeChild} />}>
      {s.view === 'list' && <ListView />}
      {s.view === 'form' && <FormView s={s} typing={typing} />}
      {s.view === 'detail' && <DetailView s={s} />}
      <MockToast show={s.toast}>{s.toastText}</MockToast>
      <MockModal open={s.convOpen} width={400}><ConvertBody s={s} typing={typing} /></MockModal>
      <MockModal open={s.phone} width={330}>
        <div style={{ padding: '10px 0 0' }}>
          <div style={{ textAlign: 'center', fontSize: 11, color: M.muted }}>Lo que ve tu cliente en su celular</div>
          <PhoneBody s={s} typing={typing} />
        </div>
      </MockModal>
    </MockWindow>
  );
}

/* ───────────── Guion ───────────── */

const steps = [
  { do: 'caption', text: 'Arma la cotización en un minuto' },
  { do: 'wait', ms: 300 },
  { do: 'click', on: 'btn-nueva-cotizacion', set: { view: 'form' } },
  { do: 'click', on: 'cli-input', set: { cliOpen: true, cliQuery: 'Carlos' } },
  { do: 'click', on: 'cli-option', set: { cliOpen: false, cliente: true, cliQuery: CUSTOMER.name } },
  { do: 'click', on: 'btn-add-producto', set: { items: 1 } },
  { do: 'wait', ms: 250 },
  { do: 'click', on: 'btn-add-producto', set: { items: 2 } },
  { do: 'wait', ms: 400 },

  { do: 'caption', text: 'Guárdala y envíala por WhatsApp' },
  { do: 'click', on: 'btn-guardar', set: { view: 'detail', toast: true, toastText: 'Cotización guardada' } },
  { do: 'wait', ms: 700 },
  { do: 'set', patch: { toast: false } },
  { do: 'click', on: 'btn-whatsapp', set: { toast: true, toastText: 'Cotización enviada por WhatsApp' } },
  { do: 'wait', ms: 500 },
  { do: 'set', patch: { toast: false, phone: true, pstage: 'chat' } },
  { do: 'wait', ms: 1300 },

  { do: 'caption', text: 'Tu cliente la abre desde su celular' },
  { do: 'set', patch: { pstage: 'quote' } },
  { do: 'wait', ms: 1300 },
  { do: 'set', patch: { scroll: 255 } },
  { do: 'wait', ms: 750 },
  { do: 'highlight', on: 'ptoggles', ms: 1100 },

  { do: 'caption', text: 'Aprueba con su nombre y documento' },
  { do: 'type', into: 'pname', field: 'pname', text: CUSTOMER.name, perChar: 40 },
  { do: 'type', into: 'pdoc', field: 'pdoc', text: CUSTOMER.doc, perChar: 40 },
  { do: 'click', on: 'btn-aprobar', set: { pstage: 'approved', scroll: 0 } },
  { do: 'wait', ms: 1700 },

  { do: 'caption', text: 'Tú te enteras y la conviertes en orden de trabajo' },
  { do: 'set', patch: { phone: false, status: 'aprobada', toast: true, toastText: `Cotización aprobada por ${CUSTOMER.name}` } },
  { do: 'wait', ms: 1000 },
  { do: 'set', patch: { toast: false } },
  { do: 'click', on: 'btn-more', set: { menuOpen: true } },
  { do: 'click', on: 'menu-convertir', set: { menuOpen: false, convOpen: true } },
  { do: 'type', into: 'conv-placa', field: 'placa', text: VEHICLE.plate, perChar: 50 },
  { do: 'set', patch: { vehFilled: true } },
  { do: 'wait', ms: 450 },
  { do: 'click', on: 'btn-crear-ot', set: { convOpen: false, toast: true, toastText: 'Orden de trabajo creada' } },
  { do: 'wait', ms: 1400 },
];

const tourCotizacionAprobada = {
  id: 'cotizacion-aprobada',
  title: 'Cotización aprobada desde el celular',
  module: 'Cotizaciones',
  audience: 'cliente',
  duration: 25,
  summary: 'Cotizas, tu cliente aprueba desde su celular y tú la conviertes en orden de trabajo, sin llamadas ni papeles.',
  Screen: MockCotizacion,
  camera: (s) => (s.phone ? { x: 480, y: 300, zoom: 0.6 } : null),
  initialState: {
    view: 'list',
    cliQuery: '', cliOpen: false, cliente: false, items: 0,
    status: 'borrador', menuOpen: false,
    convOpen: false, placa: '', vehFilled: false,
    toast: false, toastText: '',
    phone: false, pstage: 'chat', scroll: 0, pname: '', pdoc: '',
  },
  steps,
};

export default tourCotizacionAprobada;
