// frontend/src/components/workshop/vehicleLabel.js
// Diseño del sticker QR del vehículo (portal público /portal/vehiculo/:token).
// Lo usan el modal de impresión (VehicleLabelPrintModal) y la vista previa de
// Ajustes → Impresión de etiquetas. La geometría de página (columnas, hoja,
// desplazamiento, rotación) la pone el perfil de impresión
// (utils/labelPrinting.js); aquí solo se dibuja UNA etiqueta.
//
// Pensado para que funcione en térmica: solo negro sólido y blanco (nada de
// grises ni degradados, que a 203 dpi salen tramados). La "profundidad" sale
// de bloques invertidos (franja y pestaña en negro con texto blanco) y de la
// jerarquía tipográfica. En modo color, franja/pestaña toman el color del
// taller y la placa va amarilla como una placa particular colombiana.

// Medidas afinadas a mano para los tamaños clásicos (se respetan tal cual).
// band = alto de la franja superior; qr = lado del QR (>= 19 mm, escaneable
// con el celular a unos 15 cm a través del vidrio); tab = pestaña
// "ESCANÉAME" bajo el QR (en 58x30 no cabe y el llamado va en el texto).
const TUNED = {
  '58x30':  { band: 6.5, qr: 19.5, tab: false, pad: 1.6, plate: 12, shop: 6.5, small: 5,   cta: 5.2 },
  '58x40':  { band: 7.5, qr: 22,   tab: true,  pad: 1.8, plate: 13, shop: 7,   small: 5.5, cta: 5.5 },
  '80x50':  { band: 9,   qr: 29,   tab: true,  pad: 2.2, plate: 19, shop: 9,   small: 7,   cta: 7 },
  '100x60': { band: 11,  qr: 36,   tab: true,  pad: 2.6, plate: 24, shop: 11,  small: 8.5, cta: 8.5 },
};

const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Medidas del diseño para una etiqueta de w × h mm (contenido; si el perfil
 * rota, se llama con ancho y alto intercambiados). Fuera de los tamaños
 * clásicos, fórmulas ajustadas a esos cuatro.
 */
export function vehicleLabelMetrics(w, h) {
  const key = `${Math.round(w)}x${Math.round(h)}`;
  if (TUNED[key] && Math.abs(w - Math.round(w)) < 0.01 && Math.abs(h - Math.round(h)) < 0.01) {
    return { w, h, ...TUNED[key] };
  }
  const band = r1(Math.min(Math.max(2 + 0.15 * h, 5), 14));
  const pad = r1(Math.min(Math.max(0.6 + 0.033 * h, 1.2), 3.2));
  const tab = h >= 36;
  const tabH = tab ? r1(Math.max(2.5, 0.075 * h)) : 0;
  const qr = r1(Math.max(12, Math.min((h - band - 2 * pad - tabH) * 0.9, w * 0.42)));
  const info = w - qr - 3 * pad;
  const plate = r1(Math.max(7, Math.min(info * 0.4, h * 0.42)));
  const shop = r1(Math.max(5, band * 0.95));
  const small = r1(Math.max(4.2, band * 0.77));
  return { w, h, band, qr, tab, pad, plate, shop, small, cta: small };
}

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Flecha hacia el QR (a la izquierda) -- SVG en línea, negro sólido.
const ARROW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// CSS de la etiqueta -- el mismo string se usa en la vista previa y en la
// impresión, para que lo que se ve sea lo que sale. print-color-adjust:
// exact es obligatorio: sin eso el navegador no imprime los fondos y la
// franja sale en blanco.
export function vehicleLabelCss(size, mono, accent) {
  const ink = mono ? '#000' : accent;
  const plateBg = mono ? '#fff' : '#FFD100';
  const u = (n) => `${n}mm`;
  return `
    .vl-label { width:${u(size.w)}; height:${u(size.h)}; box-sizing:border-box; display:flex; flex-direction:column;
      background:#fff; color:#000; font-family:Arial, Helvetica, sans-serif; overflow:hidden;
      -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .vl-label * { box-sizing:border-box; }

    .vl-band { height:${u(size.band)}; flex-shrink:0; background:${ink}; color:#fff; display:flex; align-items:center;
      gap:${u(size.pad * 0.8)}; padding:0 ${u(size.pad + 0.6)}; }
    .vl-logo-chip { height:${u(size.band - 1.6)}; max-width:${u(size.band * 2.6)}; background:#fff; border-radius:${u(0.8)};
      padding:${u(0.4)} ${u(0.8)}; display:flex; align-items:center; flex-shrink:0; }
    .vl-logo { height:100%; width:auto; max-width:100%; object-fit:contain; display:block; ${mono ? 'filter:grayscale(1) contrast(1.8);' : ''} }
    .vl-band-text { min-width:0; flex:1; display:flex; flex-direction:column; justify-content:center; line-height:1.08; }
    .vl-shop { font-weight:800; font-size:${size.shop}pt; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; letter-spacing:0.1pt; }
    .vl-phone { font-size:${size.small}pt; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

    .vl-body { flex:1; min-height:0; display:flex; align-items:center; gap:${u(size.pad + 0.6)}; padding:${u(size.pad)} ${u(size.pad + 0.6)}; }
    .vl-qr-col { flex-shrink:0; width:${u(size.qr)}; display:flex; flex-direction:column; align-items:stretch; }
    .vl-qr { width:${u(size.qr)}; height:${u(size.qr)}; display:block; image-rendering:pixelated;
      border:${u(0.45)} solid #000; border-radius:${u(1)} ${u(1)} ${size.tab ? '0 0' : `${u(1)} ${u(1)}`}; padding:${u(0.3)}; background:#fff; }
    .vl-tab { background:${ink}; color:#fff; text-align:center; font-weight:900; font-size:${size.small}pt; letter-spacing:0.8pt;
      padding:${u(0.45)} 0 ${u(0.55)}; border-radius:0 0 ${u(1)} ${u(1)}; line-height:1.1; }

    .vl-info { flex:1; min-width:0; display:flex; flex-direction:column; justify-content:center; gap:${u(size.pad * 0.55)}; }
    .vl-plate { background:${plateBg}; border:${u(0.6)} solid #000; border-radius:${u(1.3)}; text-align:center;
      padding:${u(0.5)} ${u(0.8)} ${u(0.3)}; box-shadow:inset 0 0 0 ${u(0.35)} ${plateBg}, inset 0 0 0 ${u(0.6)} #000; }
    .vl-plate-num { display:block; font-family:'Arial Black', 'Arial Bold', Arial, sans-serif; font-weight:900; font-size:${size.plate}pt;
      line-height:1.05; letter-spacing:0.9pt; white-space:nowrap; }
    .vl-vehicle { font-size:${size.small}pt; font-weight:700; text-align:center; text-transform:uppercase; letter-spacing:0.3pt;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .vl-cta { display:flex; align-items:center; gap:${u(0.8)}; border-top:${u(0.3)} solid #000; padding-top:${u(size.pad * 0.55)}; }
    .vl-cta svg { width:${size.cta * 1.9}pt; height:${size.cta * 1.9}pt; flex-shrink:0; color:${ink}; }
    .vl-cta-text { font-size:${size.cta}pt; line-height:1.15; }
    .vl-cta-text b { display:block; font-weight:900; text-transform:uppercase; letter-spacing:0.2pt; color:${ink}; }
  `;
}

export function vehicleLabelHtml(data, size, opts) {
  const { vehicle, workshop, qr_data_url } = data;
  const vehicleDesc = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ');
  const shopName = opts.showShop && workshop.name ? workshop.name : 'Hoja de vida del vehículo';
  // Sin pestaña bajo el QR: el "Escanéame" va como título del llamado.
  const ctaTitle = size.tab ? 'Próximo servicio' : 'Escanéame';
  const ctaText = size.tab ? 'e historial de tu vehículo' : 'Próximo servicio e historial';
  return `
    <div class="vl-label">
      <div class="vl-band">
        ${opts.showLogo && workshop.logo_url ? `<div class="vl-logo-chip"><img class="vl-logo" src="${esc(workshop.logo_url)}" alt="" /></div>` : ''}
        <div class="vl-band-text">
          <div class="vl-shop">${esc(shopName)}</div>
          ${opts.showPhone && workshop.phone ? `<div class="vl-phone">${esc(workshop.phone)}</div>` : ''}
        </div>
      </div>
      <div class="vl-body">
        <div class="vl-qr-col">
          <img class="vl-qr" src="${qr_data_url}" alt="QR" />
          ${size.tab ? '<div class="vl-tab">ESCANÉAME</div>' : ''}
        </div>
        <div class="vl-info">
          <div class="vl-plate"><span class="vl-plate-num">${esc(String(vehicle.plate || '').toUpperCase())}</span></div>
          ${opts.showVehicle && vehicleDesc ? `<div class="vl-vehicle">${esc(vehicleDesc)}</div>` : ''}
          <div class="vl-cta">${ARROW_SVG}<div class="vl-cta-text"><b>${ctaTitle}</b>${ctaText}</div></div>
        </div>
      </div>
    </div>`;
}

/** Medidas para el perfil (rotado: el diseño se arma con ancho y alto intercambiados). */
export function vehicleMetricsForProfile(profile) {
  return profile.rotate
    ? vehicleLabelMetrics(profile.label_h_mm, profile.label_w_mm)
    : vehicleLabelMetrics(profile.label_w_mm, profile.label_h_mm);
}

export const DEFAULT_VEHICLE_OPTIONS = { showLogo: true, showShop: true, showPhone: true, showVehicle: true };

// QR de muestra (solo para la vista previa de Ajustes): patrón con los tres
// cuadros de posición, no es un QR real.
let sampleQr = null;
function sampleQrDataUrl() {
  if (sampleQr) return sampleQr;
  const n = 25;
  const c = document.createElement('canvas');
  c.width = n; c.height = n;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, n, n);
  ctx.fillStyle = '#000';
  let seed = 7;
  for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) {
    seed = (seed * 9301 + 49297) % 233280;
    if (seed / 233280 > 0.55) ctx.fillRect(x, y, 1, 1);
  }
  const finder = (x, y) => {
    ctx.fillStyle = '#000'; ctx.fillRect(x, y, 7, 7);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 1, y + 1, 5, 5);
    ctx.fillStyle = '#000'; ctx.fillRect(x + 2, y + 2, 3, 3);
  };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  sampleQr = c.toDataURL('image/png');
  return sampleQr;
}

export function sampleVehicleLabelData() {
  return {
    vehicle: { plate: 'ABC123', brand: 'Chevrolet', model: 'Spark GT', year: 2019 },
    workshop: { name: 'Mi Taller', phone: '300 123 4567', logo_url: null, primary_color: '#1e40af' },
    qr_data_url: sampleQrDataUrl(),
  };
}
