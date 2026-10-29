// frontend/src/utils/posPrinting.js
//
// Impresión de tirillas en impresora POS (58/80 mm) desde el navegador.
//
// El backend devuelve la tirilla como bloques neutros (services/pos/
// posTicket.service.js); aquí se convierten a HTML del ancho del papel y se
// imprimen en un iframe oculto. El largo de la página se ajusta al contenido,
// así el rollo se corta justo al final del documento.
//
// La configuración es por equipo (localStorage): cada computador sabe si
// tiene impresora POS, de qué ancho, y qué imprime solo. Con Chrome abierto en
// modo --kiosk-printing la impresión sale directa a la impresora
// predeterminada, sin cuadro de diálogo (ver Ajustes → Impresión POS).
import { posTicketsAPI } from '../api/posTickets';

// Página del ancho del rollo y contenido centrado en el área imprimible.
export const PAPER_WIDTHS = {
  80: { label: '80 mm', width: 80, printable: 72, qr: 34, logo: 22, scale: 1 },
  58: { label: '58 mm', width: 58, printable: 48, qr: 28, logo: 16, scale: 0.86 },
};

export const FONT_SIZES = { normal: { label: 'Normal', factor: 1 }, large: { label: 'Grande', factor: 1.15 } };

export const DEFAULT_POS_SETTINGS = {
  enabled: false,
  paper: 80,
  font: 'normal',
  copies: 1,
  print_logo: true,
  top_mm: 2,
  feed_mm: 8,
  auto_sale: true,
  auto_receipt: true,
  auto_cash_session: true,
};

const settingsKey = (tenantId) => `pitbox_pos_printer_${tenantId || 'default'}`;

export function getPosSettings(tenantId) {
  try {
    const raw = localStorage.getItem(settingsKey(tenantId));
    return { ...DEFAULT_POS_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULT_POS_SETTINGS };
  }
}

export function savePosSettings(tenantId, settings) {
  try { localStorage.setItem(settingsKey(tenantId), JSON.stringify({ ...DEFAULT_POS_SETTINGS, ...settings })); } catch { /* sin almacenamiento */ }
}

const escapeHtml = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Tamaños en pt para papel de 80 mm; el de 58 mm se escala.
const SIZES = { sm: 8, md: 9.5, lg: 12, xl: 15 };

function blockHtml(b, paper) {
  switch (b.t) {
    case 'logo':
      return `<div class="c"><img class="logo" src="${escapeHtml(b.url)}" alt=""></div>`;
    case 'text':
      return `<div class="${b.align === 'center' ? 'c' : b.align === 'right' ? 'r' : ''} ${b.bold ? 'b' : ''} s-${b.size || 'md'}">${escapeHtml(b.text)}</div>`;
    case 'kv':
      return `<div class="kv ${b.bold ? 'b' : ''} s-${b.size || 'md'}"><span class="k">${escapeHtml(b.k)}</span><span class="v">${escapeHtml(b.v)}</span></div>`;
    case 'item':
      return `<div class="item"><div class="b s-md">${escapeHtml(b.name)}</div>`
        + `<div class="kv s-sm"><span class="k">${escapeHtml(b.detail)}</span><span class="v b">${escapeHtml(b.total)}</span></div></div>`;
    case 'sep':
      return '<div class="sep"></div>';
    case 'qr':
      return b.image ? `<div class="c qr"><img src="${b.image}" alt="QR" style="width:${paper.qr}mm;height:${paper.qr}mm"></div>` : '';
    case 'sign':
      return `<div class="sign">${(b.labels || []).map((l) => `<div><div class="line"></div><div class="c s-sm">${escapeHtml(l)}</div></div>`).join('')}</div>`;
    default:
      return '';
  }
}

/** HTML completo de una o varias tirillas (una por copia). */
export function renderTicketHtml(ticket, rawSettings = {}) {
  const settings = { ...DEFAULT_POS_SETTINGS, ...rawSettings };
  const paper = PAPER_WIDTHS[settings.paper] || PAPER_WIDTHS[80];
  const factor = paper.scale * (FONT_SIZES[settings.font] || FONT_SIZES.normal).factor;
  const blocks = (ticket.blocks || []).filter((b) => b.t !== 'logo' || settings.print_logo);
  const body = blocks.map((b) => blockHtml(b, paper)).join('');
  const copies = Math.min(Math.max(parseInt(settings.copies, 10) || 1, 1), 5);
  const pages = Array.from({ length: copies }, (_, i) => `<section class="ticket${i ? ' next' : ''}">${body}</section>`).join('');
  const width = paper.printable;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(ticket.title || 'Tirilla')}</title><style>
    @page { size: ${paper.width}mm 297mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { font-family: Arial, Helvetica, sans-serif; line-height: 1.25; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .ticket { width: ${width}mm; margin: 0 auto; padding: ${settings.top_mm}mm 0 ${settings.feed_mm}mm; }
    .ticket.next { break-before: page; page-break-before: always; }
    ${Object.entries(SIZES).map(([k, pt]) => `.s-${k} { font-size: ${(pt * factor).toFixed(2)}pt; }`).join('\n')}
    .b { font-weight: 700; }
    .c { text-align: center; }
    .r { text-align: right; }
    .kv { display: flex; justify-content: space-between; gap: 2mm; }
    .kv .k { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
    .kv .v { flex: 0 0 auto; text-align: right; white-space: nowrap; }
    .item { margin: 0.8mm 0; }
    .sep { border-top: 1px dashed #000; margin: 1.6mm 0; }
    .logo { max-width: 70%; max-height: ${paper.logo}mm; filter: grayscale(1) contrast(1.4); margin-bottom: 1mm; }
    .qr { margin: 1.5mm 0; }
    .qr img { image-rendering: pixelated; }
    div { overflow-wrap: anywhere; }
    .sign { display: flex; gap: 6mm; margin-top: 12mm; }
    .sign > div { flex: 1; }
    .sign .line { border-top: 1px solid #000; margin-bottom: 1mm; }
  </style></head><body>${pages}</body></html>`;
}

/**
 * Imprime HTML de tirilla en un iframe oculto. Antes de imprimir mide el alto
 * real y fija el tamaño de página a ese largo (más el avance del papel).
 */
export function printTicketHtml(html, rawSettings = {}) {
  const settings = { ...DEFAULT_POS_SETTINGS, ...rawSettings };
  const paper = PAPER_WIDTHS[settings.paper] || PAPER_WIDTHS[80];
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    // Con el ancho real del papel para que el alto medido sea el impreso.
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${paper.width}mm;height:10px;border:0;visibility:hidden;`;
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    const images = [...doc.images];
    // Un logo que no carga (CORS, sin internet) no debe frenar la impresión.
    const ready = images.map((img) => new Promise((ok) => {
      if (img.complete) return ok();
      img.addEventListener('load', ok, { once: true });
      img.addEventListener('error', () => { img.remove(); ok(); }, { once: true });
      setTimeout(ok, 4000);
    }));
    Promise.all(ready).then(() => {
      const sections = [...doc.querySelectorAll('.ticket')];
      const tallestPx = Math.max(...sections.map((s) => s.getBoundingClientRect().height), 100);
      const heightMm = Math.ceil(tallestPx * 25.4 / 96) + 2;
      const style = doc.createElement('style');
      style.textContent = `@page { size: ${paper.width}mm ${heightMm}mm; margin: 0; }`;
      doc.head.appendChild(style);
      const win = iframe.contentWindow;
      // print() vuelve cuando el trabajo ya se envió (o se cerró el cuadro de
      // impresión), así que se resuelve de una vez: no hay que esperar
      // afterprint, que no todos los navegadores emiten en iframes. El iframe
      // se quita después, sin cortar un trabajo en curso.
      let removed = false;
      const cleanup = () => { if (!removed) { removed = true; setTimeout(() => iframe.remove(), 1000); } };
      win.addEventListener('afterprint', cleanup, { once: true });
      win.focus();
      win.print();
      resolve();
      setTimeout(cleanup, 60000);
    });
  });
}

export async function printTicket(ticket, settings) {
  await printTicketHtml(renderTicketHtml(ticket, settings), settings);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const FETCHERS = {
  sale: (id) => posTicketsAPI.sale(id),
  receipt: (id) => posTicketsAPI.receipt(id),
  payment: (id) => posTicketsAPI.payment(id),
  cash_session: (id) => posTicketsAPI.cashSession(id),
};
const AUTO_FLAGS = { sale: 'auto_sale', receipt: 'auto_receipt', payment: 'auto_receipt', cash_session: 'auto_cash_session' };

/**
 * Pide la tirilla al backend y la imprime con la configuración de este equipo.
 *
 * @param {'sale'|'receipt'|'payment'|'cash_session'} kind
 * @param {string} id  id de la venta, del recibo, del pago (payment_id) o de la caja
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {boolean} [opts.auto]  impresión automática: solo si el equipo tiene la
 *   impresora POS activa y ese tipo de documento marcado para imprimir solo.
 * @param {boolean} [opts.waitForDian]  factura recién confirmada: espera unos
 *   segundos a que la DIAN la valide para que salga con CUFE y QR.
 * @returns {Promise<boolean>} true si se mandó a imprimir.
 */
export async function printPosDocument(kind, id, { tenantId, auto = false, waitForDian = false } = {}) {
  const settings = getPosSettings(tenantId);
  if (auto && !(settings.enabled && settings[AUTO_FLAGS[kind]])) return false;

  let ticket = null;
  const attempts = waitForDian ? 6 : (kind === 'payment' ? 3 : 1);
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await FETCHERS[kind](id);
      ticket = res.data?.data;
    } catch (err) {
      // El recibo de un pago recién registrado puede tardar un instante.
      if (kind === 'payment' && err.response?.status === 404 && i < attempts - 1) { await wait(1500); continue; }
      throw err;
    }
    if (!(waitForDian && ticket?.dian_pending) || i === attempts - 1) break;
    await wait(2500);
  }
  if (!ticket) return false;
  await printTicket(ticket, settings);
  return true;
}

/** Tirilla de ejemplo para la página de configuración. */
export const SAMPLE_TICKET = {
  title: 'Prueba de impresión',
  blocks: [
    { t: 'text', text: 'TALLER DE EJEMPLO S.A.S.', align: 'center', bold: true, size: 'lg' },
    { t: 'text', text: 'NIT 900.123.456-7', align: 'center', size: 'sm' },
    { t: 'text', text: 'Calle 10 # 20-30 · Tel. 300 123 4567', align: 'center', size: 'sm' },
    { t: 'sep' },
    { t: 'text', text: 'PRUEBA DE IMPRESIÓN', align: 'center', bold: true, size: 'md' },
    { t: 'text', text: new Date().toLocaleString('es-CO'), align: 'center', size: 'sm' },
    { t: 'sep' },
    { t: 'item', name: 'Filtro de aceite PH3600', detail: '1 x $28.500  IVA 19%', total: '$28.500' },
    { t: 'item', name: 'Cambio de aceite (mano de obra)', detail: '1 x $35.000  IVA 19%', total: '$35.000' },
    { t: 'sep' },
    { t: 'kv', k: 'Subtotal', v: '$53.361' },
    { t: 'kv', k: 'IVA 19%', v: '$10.139' },
    { t: 'kv', k: 'TOTAL', v: '$63.500', bold: true, size: 'lg' },
    { t: 'sep' },
    { t: 'text', text: 'Si ves completas las dos marcas de abajo, la impresora está bien configurada.', align: 'center', size: 'sm' },
    { t: 'kv', k: '<< IZQUIERDA', v: 'DERECHA >>', bold: true },
  ],
};
