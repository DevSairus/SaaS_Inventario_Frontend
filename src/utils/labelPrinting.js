// frontend/src/utils/labelPrinting.js
//
// Motor de impresión de etiquetas con código de barras, adaptable a cualquier
// impresora y papel mediante PERFILES (backend: labelPrinting.controller.js).
//
// Claves para que salga bien en impresoras genéricas:
//  - El tamaño de página se fija con @page al tamaño exacto del papel (rollo:
//    una fila de etiquetas; hoja: Carta/A4) y márgenes 0 -- antes se dejaba
//    "auto" y el navegador escalaba o desplazaba las etiquetas.
//  - Cada etiqueta se dibuja como imagen a la resolución real de la impresora
//    (dpi): el módulo de las barras es un número ENTERO de puntos y la imagen
//    se convierte a blanco y negro puro, sin grises ni suavizado (lectura
//    confiable con escáner).
//  - Desplazamiento X/Y para calibrar impresoras que corren el papel, rotación
//    para las que alimentan la etiqueta de lado, y una página de prueba de
//    alineación con los bordes de cada etiqueta.

import JsBarcode from 'jsbarcode';

export const BARCODE_FORMATS = [
  { value: 'CODE128', label: 'Code 128 (recomendado, acepta letras)' },
  { value: 'EAN13', label: 'EAN-13 (13 dígitos, comercio)' },
  { value: 'CODE39', label: 'Code 39' },
];

export const DPI_OPTIONS = [
  { value: 203, label: '203 dpi (8 puntos/mm) — la mayoría de térmicas' },
  { value: 300, label: '300 dpi (12 puntos/mm)' },
  { value: 600, label: '600 dpi (24 puntos/mm) — láser/tinta' },
];

export const DEFAULT_PROFILE = {
  id: 'default',
  name: 'Etiqueta 50 × 30 mm',
  media: 'roll',
  label_w_mm: 50,
  label_h_mm: 30,
  columns: 1,
  col_gap_mm: 0,
  row_gap_mm: 3,
  page_w_mm: 216,
  page_h_mm: 279,
  margin_top_mm: 10,
  margin_left_mm: 5,
  dpi: 203,
  offset_x_mm: 0,
  offset_y_mm: 0,
  padding_mm: 1,
  rotate: false,
  fill_row: true,
  quiet_zone: false,
  barcode_format: 'CODE128',
  show_name: true,
  show_sku: false,
  show_barcode_text: true,
  show_price: false,
  font_scale: 1,
  color: false,
};

// Plantillas para crear un perfil rápido (luego se ajusta y calibra).
export const PRESETS = [
  { key: 'roll-33x25x3', name: 'Rollo 33 × 25 mm — 3 columnas', media: 'roll', label_w_mm: 33, label_h_mm: 25, columns: 3, col_gap_mm: 3, row_gap_mm: 3 },
  { key: 'roll-50x30', name: 'Rollo 50 × 30 mm', media: 'roll', label_w_mm: 50, label_h_mm: 30, columns: 1, col_gap_mm: 0, row_gap_mm: 3 },
  { key: 'roll-58x40', name: 'Rollo 58 × 40 mm', media: 'roll', label_w_mm: 58, label_h_mm: 40, columns: 1, col_gap_mm: 0, row_gap_mm: 3 },
  { key: 'roll-100x50', name: 'Rollo 100 × 50 mm', media: 'roll', label_w_mm: 100, label_h_mm: 50, columns: 1, col_gap_mm: 0, row_gap_mm: 3 },
  { key: 'roll-40x25x2', name: 'Rollo 40 × 25 mm — 2 columnas', media: 'roll', label_w_mm: 40, label_h_mm: 25, columns: 2, col_gap_mm: 2, row_gap_mm: 3 },
  { key: 'sheet-letter-3x10', name: 'Hoja Carta — 3 × 10 (66,7 × 25,4 mm)', media: 'sheet', page_w_mm: 215.9, page_h_mm: 279.4, label_w_mm: 66.7, label_h_mm: 25.4, columns: 3, col_gap_mm: 3.2, row_gap_mm: 0, margin_top_mm: 12.7, margin_left_mm: 4.8, dpi: 600 },
  { key: 'sheet-a4-3x8', name: 'Hoja A4 — 3 × 8 (70 × 37 mm)', media: 'sheet', page_w_mm: 210, page_h_mm: 297, label_w_mm: 70, label_h_mm: 37, columns: 3, col_gap_mm: 0, row_gap_mm: 0, margin_top_mm: 0.5, margin_left_mm: 0, dpi: 600 },
];

export const newProfileFromPreset = (presetKey) => {
  const preset = PRESETS.find((p) => p.key === presetKey) || {};
  const { key: _key, ...fields } = preset;
  return {
    ...DEFAULT_PROFILE,
    ...fields,
    id: `perfil-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: fields.name || 'Nuevo perfil',
  };
};

// ── Perfil del equipo (cada estación puede tener otra impresora) ──
// Tipos de etiqueta: cada uno con su perfil por equipo y su predeterminado
// del tenant (los stickers de vehículo suelen ir en otra impresora o papel).
export const LABEL_KINDS = {
  product: { label: 'Etiquetas de productos', defaultKey: 'default_profile_id' },
  vehicle: { label: 'Stickers QR de vehículos', defaultKey: 'default_vehicle_profile_id' },
};
const deviceKey = (tenantId, kind) => `pitbox_label_profile_${tenantId || 'default'}${kind === 'vehicle' ? '_vehicle' : ''}`;
export function getDeviceProfileId(tenantId, kind = 'product') {
  try { return localStorage.getItem(deviceKey(tenantId, kind)); } catch { return null; }
}
export function setDeviceProfileId(tenantId, profileId, kind = 'product') {
  try { localStorage.setItem(deviceKey(tenantId, kind), profileId); } catch { /* sin almacenamiento */ }
}
/** Perfil efectivo: el del equipo, si existe; si no, el predeterminado del tenant para ese tipo. */
export function pickProfile(config, tenantId, kind = 'product', fallback = DEFAULT_PROFILE) {
  const profiles = config?.profiles || [];
  if (!profiles.length) return fallback;
  const deviceId = getDeviceProfileId(tenantId, kind);
  const defaultKey = LABEL_KINDS[kind]?.defaultKey || 'default_profile_id';
  return profiles.find((p) => p.id === deviceId)
    || profiles.find((p) => p.id === config[defaultKey])
    || profiles[0];
}

// ── Geometría ──
const round2 = (n) => Math.round(n * 100) / 100;

// Rangos válidos (mismos que el backend, labelPrinting.controller.js).
const NUMERIC_RANGES = {
  label_w_mm: [10, 300], label_h_mm: [10, 300], columns: [1, 6], col_gap_mm: [0, 30], row_gap_mm: [0, 30],
  page_w_mm: [50, 500], page_h_mm: [50, 500], margin_top_mm: [0, 60], margin_left_mm: [0, 60],
  offset_x_mm: [-50, 50], offset_y_mm: [-50, 50], padding_mm: [0, 15], font_scale: [0.6, 2],
};
/**
 * Perfil con números válidos: mientras se edita un campo puede quedar vacío o
 * fuera de rango; la vista previa y la impresión usan siempre esta versión.
 */
export function normalizeProfile(profile) {
  const p = { ...DEFAULT_PROFILE, ...(profile || {}) };
  for (const [field, [min, max]] of Object.entries(NUMERIC_RANGES)) {
    const n = Number(p[field]);
    p[field] = Number.isFinite(n) && p[field] !== '' ? Math.min(Math.max(n, min), max) : DEFAULT_PROFILE[field];
  }
  p.columns = Math.round(p.columns);
  if (![203, 300, 600].includes(Number(p.dpi))) p.dpi = 203;
  return p;
}

/** Tamaño de la página que se manda a la impresora (mm). */
export function pageSize(rawProfile) {
  const profile = normalizeProfile(rawProfile);
  if (profile.media === 'sheet') return { w: profile.page_w_mm, h: profile.page_h_mm };
  return {
    w: round2(profile.columns * profile.label_w_mm + (profile.columns - 1) * profile.col_gap_mm),
    h: round2(profile.label_h_mm + profile.row_gap_mm),
  };
}

/** Etiquetas por página (rollo: una fila; hoja: la cuadrícula que quepa). */
export function labelsPerPage(rawProfile) {
  const profile = normalizeProfile(rawProfile);
  if (profile.media !== 'sheet') return profile.columns;
  const usableH = profile.page_h_mm - profile.margin_top_mm + profile.row_gap_mm;
  const rows = Math.max(1, Math.floor(usableH / (profile.label_h_mm + profile.row_gap_mm)));
  return rows * profile.columns;
}

/** Posición (mm) de la etiqueta n dentro de su página. */
function labelPosition(profile, indexInPage) {
  const col = indexInPage % profile.columns;
  const row = Math.floor(indexInPage / profile.columns);
  const baseX = profile.media === 'sheet' ? profile.margin_left_mm : 0;
  const baseY = profile.media === 'sheet' ? profile.margin_top_mm : 0;
  return {
    x: round2(baseX + col * (profile.label_w_mm + profile.col_gap_mm)),
    y: round2(baseY + row * (profile.label_h_mm + profile.row_gap_mm)),
  };
}

// ── Código de barras ──
const EAN13_RE = /^\d{12,13}$/;
const CODE39_RE = /^[0-9A-Z \-.$/+%]+$/;
/** Formato que realmente se usará: si el valor no es válido para el elegido, Code 128. */
export function effectiveFormat(format, value) {
  const v = String(value || '');
  if (format === 'EAN13' && EAN13_RE.test(v)) return 'EAN13';
  if (format === 'CODE39' && CODE39_RE.test(v)) return 'CODE39';
  return 'CODE128';
}

function wrapText(ctx, text, maxW, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const t = line ? `${line} ${word}` : word;
    if (ctx.measureText(t).width <= maxW || !line) line = t;
    else { lines.push(line); line = word; }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  // Última línea recortada con "…" si no cabe.
  const last = lines.length - 1;
  if (last >= 0) {
    while (ctx.measureText(lines[last]).width > maxW && lines[last].length > 1) {
      lines[last] = `${lines[last].slice(0, -2)}…`;
    }
  }
  return lines.slice(0, maxLines);
}

const formatPrice = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0));

/**
 * Dibuja UNA etiqueta a la resolución de la impresora.
 * @param {object} profile
 * @param {object} data - { name, sku, barcode, price }
 * @param {object} [overrides] - campos de contenido que pisan los del perfil
 * @returns {{ canvas, dpm, overflow }} overflow: el código no cupo a 1 punto por módulo
 */
export function renderLabelCanvas(profile, data, overrides = {}) {
  const p = normalizeProfile({ ...profile, ...overrides });
  const dpm = p.dpi / 25.4; // puntos por mm
  const wMm = (p.rotate ? p.label_h_mm : p.label_w_mm) - 2 * p.padding_mm;
  const hMm = (p.rotate ? p.label_w_mm : p.label_h_mm) - 2 * p.padding_mm;
  const cw = Math.max(16, Math.floor(wMm * dpm));
  const ch = Math.max(16, Math.floor(hMm * dpm));

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Tamaños de letra proporcionales al alto útil, ajustables por perfil.
  const base = Math.min(Math.max(hMm * 0.11, 1.6), 4) * p.font_scale;
  const nameFont = Math.round(base * dpm);
  const smallFont = Math.round(base * 0.85 * dpm);
  const gapPx = Math.round(0.6 * dpm);

  ctx.font = `bold ${nameFont}px Arial, sans-serif`;
  const nameLines = p.show_name && data.name ? wrapText(ctx, data.name, cw, hMm >= 22 ? 2 : 1) : [];
  const nameH = nameLines.length * Math.round(nameFont * 1.1);

  const footer = [p.show_sku && data.sku ? data.sku : null, p.show_price && data.price != null ? formatPrice(data.price) : null]
    .filter(Boolean).join('   ');
  const footerH = footer ? Math.round(smallFont * 1.15) : 0;

  const textH = p.show_barcode_text ? Math.round(smallFont * 1.1) + 2 : 0;
  const barH = Math.max(Math.round(4 * dpm), ch - nameH - footerH - textH - (nameH ? gapPx : 0) - (footerH ? gapPx : 0));

  // El módulo más ancho (puntos enteros) que quepa: barras nítidas.
  let bc = null;
  let overflow = false;
  if (data.barcode) {
    const format = effectiveFormat(p.barcode_format, data.barcode);
    for (let m = 6; m >= 1; m -= 1) {
      const t = document.createElement('canvas');
      try {
        JsBarcode(t, String(data.barcode), {
          format,
          width: m,
          height: barH,
          displayValue: p.show_barcode_text,
          fontSize: smallFont,
          font: 'Arial',
          fontOptions: 'bold',
          textMargin: 2,
          margin: 0,
          marginLeft: p.quiet_zone ? 10 * m : 0,
          marginRight: p.quiet_zone ? 10 * m : 0,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch {
        continue;
      }
      bc = t;
      if (t.width <= cw) break;
    }
    overflow = !!bc && bc.width > cw;
  }

  const blockH = nameH + (nameH ? gapPx : 0) + (bc ? bc.height : 0) + (footerH ? gapPx + footerH : 0);
  let y = Math.max(0, Math.floor((ch - blockH) / 2));
  if (nameLines.length) {
    ctx.font = `bold ${nameFont}px Arial, sans-serif`;
    nameLines.forEach((line, i) => ctx.fillText(line, cw / 2, y + i * Math.round(nameFont * 1.1)));
    y += nameH + gapPx;
  }
  if (bc) {
    ctx.drawImage(bc, Math.floor((cw - Math.min(bc.width, cw)) / 2), y, Math.min(bc.width, cw), bc.height);
    y += bc.height;
  }
  if (footer) {
    ctx.font = `bold ${smallFont}px Arial, sans-serif`;
    ctx.fillText(footer, cw / 2, y + gapPx);
  }

  // Blanco y negro puro (sin grises): las térmicas no tienen tramas.
  const img = ctx.getImageData(0, 0, cw, ch);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (d[i] + d[i + 1] + d[i + 2]) / 3 < 170 ? 0 : 255;
    d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  if (p.rotate) {
    const r = document.createElement('canvas');
    r.width = ch;
    r.height = cw;
    const rc = r.getContext('2d');
    rc.translate(ch, 0);
    rc.rotate(Math.PI / 2);
    rc.drawImage(out, 0, 0);
    return { canvas: r, dpm, overflow };
  }
  return { canvas: out, dpm, overflow };
}

/**
 * Documento HTML listo para imprimir.
 * @param {object} profile
 * @param {Array<{canvas,dpm}|{html}|null>} labels - una entrada por etiqueta (null = posición vacía).
 *   `{ canvas, dpm }`: imagen ya dibujada a la resolución de la impresora (productos).
 *   `{ html }`: diseño HTML/CSS que ocupa la etiqueta completa (stickers de vehículo).
 * @param {object} [opts] - { test: página de alineación, skip: posiciones ya usadas en la
 *   primera hoja, css: estilos extra para las etiquetas HTML }
 */
export function buildPrintDocument(rawProfile, labels, { test = false, skip = 0, css = '' } = {}) {
  const profile = normalizeProfile(rawProfile);
  const page = pageSize(profile);
  const perPage = labelsPerPage(profile);
  const slots = test
    ? Array.from({ length: perPage }, () => 'test')
    : [...Array.from({ length: profile.media === 'sheet' ? Math.max(0, Math.min(skip, perPage - 1)) : 0 }, () => null), ...labels];
  const pages = [];
  for (let i = 0; i < slots.length; i += perPage) pages.push(slots.slice(i, i + perPage));

  const offset = (profile.offset_x_mm || profile.offset_y_mm)
    ? `transform: translate(${profile.offset_x_mm}mm, ${profile.offset_y_mm}mm);` : '';

  const pagesHtml = pages.map((slotsInPage) => {
    const labelsHtml = slotsInPage.map((slot, idx) => {
      const pos = labelPosition(profile, idx);
      const box = `left:${pos.x}mm;top:${pos.y}mm;width:${profile.label_w_mm}mm;height:${profile.label_h_mm}mm;`;
      if (slot === 'test') {
        return `<div class="l test" style="${box}">C${(idx % profile.columns) + 1}<br>${profile.label_w_mm}×${profile.label_h_mm}</div>`;
      }
      if (!slot) return '';
      if (slot.html) {
        // Rotado: el diseño se arma con ancho y alto intercambiados y se gira.
        const inner = profile.rotate
          ? `<div class="h rot" style="width:${profile.label_h_mm}mm;height:${profile.label_w_mm}mm;">${slot.html}</div>`
          : `<div class="h">${slot.html}</div>`;
        return `<div class="l" style="${box}">${inner}</div>`;
      }
      const wMm = round2(slot.canvas.width / slot.dpm);
      const hMm = round2(slot.canvas.height / slot.dpm);
      return `<div class="l" style="${box}"><img src="${slot.canvas.toDataURL('image/png')}" style="width:${wMm}mm;height:${hMm}mm;left:${round2((profile.label_w_mm - wMm) / 2)}mm;top:${round2((profile.label_h_mm - hMm) / 2)}mm;"></div>`;
    }).join('');
    return `<div class="page${test ? ' test-page' : ''}"><div class="inner" style="${offset}">${labelsHtml}</div></div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title> </title><style>
    @page { size: ${page.w}mm ${page.h}mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #fff; }
    .page { position: relative; width: ${page.w}mm; height: ${page.h}mm; overflow: hidden; break-after: page; page-break-after: always; }
    .page:last-child { break-after: auto; page-break-after: auto; }
    .inner { position: absolute; inset: 0; }
    .l { position: absolute; overflow: hidden; }
    .l img { position: absolute; image-rendering: pixelated; image-rendering: crisp-edges; }
    .test-page { box-shadow: inset 0 0 0 0.4mm #000; }
    .l.test { border: 0.3mm dashed #000; display: flex; align-items: center; justify-content: center; text-align: center;
              font: 700 8pt/1.1 Arial, sans-serif; }
    .l .h { position: absolute; inset: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .l .h.rot { inset: auto; left: 0; top: 0; transform-origin: 0 0; transform: translateX(${profile.label_w_mm}mm) rotate(90deg); }
    ${css}
  </style></head><body>${pagesHtml}</body></html>`;
}

/** Imprime un documento en un iframe oculto (sin abrir ventanas). */
export function printDocument(html) {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    const images = [...doc.images];
    Promise.all(images.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()))).then(() => {
      const win = iframe.contentWindow;
      const cleanup = () => { setTimeout(() => { iframe.remove(); resolve(); }, 500); };
      win.addEventListener('afterprint', cleanup, { once: true });
      win.focus();
      win.print();
      // Navegadores que no emiten afterprint en iframes.
      setTimeout(cleanup, 60000);
    });
  });
}

/**
 * Imprime `quantity` etiquetas de un producto con el perfil dado.
 * @returns {{ overflow: boolean }}
 */
export async function printProductLabels(rawProfile, data, { quantity = 1, skip = 0, overrides = {} } = {}) {
  const profile = normalizeProfile(rawProfile);
  const built = renderLabelCanvas(profile, data, overrides);
  let count = Math.max(1, Math.round(quantity));
  // Rollo con varias columnas: completar la última fila para no dejar
  // etiquetas en blanco en el rollo.
  if (profile.media !== 'sheet' && profile.fill_row && profile.columns > 1) {
    count = Math.ceil(count / profile.columns) * profile.columns;
  }
  const labels = Array.from({ length: count }, () => built);
  await printDocument(buildPrintDocument(profile, labels, { skip }));
  return { overflow: built.overflow, printed: count };
}

/**
 * Imprime `quantity` etiquetas con diseño HTML (p. ej. stickers de vehículo).
 * @param {object} profile
 * @param {string} html - una etiqueta
 * @param {string} css - estilos del diseño
 */
export async function printHtmlLabels(rawProfile, html, css, { quantity = 1, skip = 0 } = {}) {
  const profile = normalizeProfile(rawProfile);
  let count = Math.max(1, Math.round(quantity));
  if (profile.media !== 'sheet' && profile.fill_row && profile.columns > 1) {
    count = Math.ceil(count / profile.columns) * profile.columns;
  }
  const labels = Array.from({ length: count }, () => ({ html }));
  await printDocument(buildPrintDocument(profile, labels, { skip, css }));
  return { printed: count };
}

/** Página de prueba de alineación (bordes de página y de cada etiqueta). */
export async function printAlignmentTest(profile) {
  await printDocument(buildPrintDocument(profile, [], { test: true }));
}

/** Datos de ejemplo para vistas previas y pruebas. */
export const SAMPLE_LABEL_DATA = { name: 'Filtro de aceite PH3600', sku: 'FIL-3600', barcode: '7701234567890', price: 28500 };
