// frontend/src/components/workshop/VehicleLabelPrintModal.jsx
// Sticker QR permanente del vehículo -> portal público (/portal/vehiculo/:token).
// Mismo flujo que BarcodePrintModal (productos): el taller elige el tamaño de
// su rollo/etiqueta y se imprime desde el navegador en cualquier impresora
// (térmica de etiquetas, láser/inyección, o PDF para mandar a imprenta).
// El próximo servicio NO va impreso: el sticker es uno solo por vehículo y
// quedaría desactualizado; el cliente lo consulta al escanear.
import { useEffect, useState } from 'react';
import { X, Printer, QrCode, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { vehiclesApi } from '../../api/workshop';

// Mismos tamaños que las etiquetas de código de barras de productos.
// band = alto de la franja superior; qr = lado del QR (>= 19 mm, escaneable
// con el celular a unos 15 cm a través del vidrio); tab = pestaña
// "ESCANÉAME" bajo el QR (en 58x30 no cabe y el llamado va en el texto).
const LABEL_SIZES = [
  { id: '58x30',  label: '58 × 30 mm',  w: 58,  h: 30, band: 6.5, qr: 19.5, tab: false, pad: 1.6, plate: 12, shop: 6.5, small: 5,   cta: 5.2 },
  { id: '58x40',  label: '58 × 40 mm',  w: 58,  h: 40, band: 7.5, qr: 22,   tab: true,  pad: 1.8, plate: 13, shop: 7,   small: 5.5, cta: 5.5 },
  { id: '80x50',  label: '80 × 50 mm',  w: 80,  h: 50, band: 9,   qr: 29,   tab: true,  pad: 2.2, plate: 19, shop: 9,   small: 7,   cta: 7 },
  { id: '100x60', label: '100 × 60 mm', w: 100, h: 60, band: 11,  qr: 36,   tab: true,  pad: 2.6, plate: 24, shop: 11,  small: 8.5, cta: 8.5 },
];

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Flecha hacia el QR (a la izquierda) -- SVG en línea, negro sólido.
const ARROW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// CSS de la etiqueta -- el mismo string se usa en la vista previa y en la
// ventana de impresión, para que lo que se ve sea lo que sale.
//
// Pensado para que funcione en térmica: solo negro sólido y blanco (nada de
// grises ni degradados, que a 203 dpi salen tramados). La "profundidad" sale
// de bloques invertidos (franja y pestaña en negro con texto blanco) y de la
// jerarquía tipográfica. En modo color, franja/pestaña toman el color del
// taller y la placa va amarilla como una placa particular colombiana.
// print-color-adjust: exact es obligatorio -- sin eso el navegador no
// imprime los fondos y la franja sale en blanco.
function labelCss(size, mono, accent) {
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

function labelHtml(data, size, opts) {
  const { vehicle, workshop, qr_data_url } = data;
  const vehicleDesc = [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ');
  const shopName = opts.showShop && workshop.name ? workshop.name : 'Hoja de vida del vehículo';
  // En 58x30 no hay pestaña bajo el QR: el "Escanéame" va como título del llamado.
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

export default function VehicleLabelPrintModal({ isOpen, onClose, vehicleId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState(LABEL_SIZES[1]);
  const [quantity, setQuantity] = useState(1);
  const [mono, setMono] = useState(true);
  const [opts, setOpts] = useState({ showLogo: true, showShop: true, showPhone: true, showVehicle: true });

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    vehiclesApi.getLabel(vehicleId)
      .then(r => setData(r.data.data))
      .catch(() => { toast.error('No se pudo preparar el sticker'); onClose(); })
      .finally(() => setLoading(false));
  }, [isOpen, vehicleId]);

  if (!isOpen) return null;

  const accent = data?.workshop?.primary_color || '#1e40af';

  const handlePrint = () => {
    if (!data) return;
    const labels = Array.from({ length: quantity }).map(() => labelHtml(data, size, opts)).join('');
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return toast.error('El navegador bloqueó la ventana de impresión');
    win.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Sticker – ${esc(data.vehicle.plate)}</title>
          <style>
            * { margin:0; padding:0; }
            body { background:#f3f4f6; font-family:Arial, sans-serif; padding:12px; }
            .no-print { text-align:center; margin-bottom:12px; }
            .sheet { display:flex; flex-direction:column; align-items:center; gap:3mm; }
            .sheet .vl-label { outline:0.4pt dashed #bbb; }
            ${labelCss(size, mono, accent)}
            /* Una etiqueta por página del tamaño exacto -- así sale 1:1 en
               impresoras de etiquetas configuradas con ese tamaño de papel. */
            @page { size:${size.w}mm ${size.h}mm; margin:0; }
            @media print {
              body { background:#fff; padding:0; }
              .no-print { display:none !important; }
              .sheet { display:block; }
              .sheet .vl-label { outline:none; page-break-after:always; break-after:page; }
              .sheet .vl-label:last-child { page-break-after:auto; break-after:auto; }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button onclick="window.print()" style="padding:8px 24px;background:#2563eb;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:600;">
              🖨️ Imprimir ${quantity} sticker${quantity > 1 ? 's' : ''}
            </button>
            <button onclick="window.close()" style="margin-left:8px;padding:8px 16px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:6px;font-size:14px;cursor:pointer;">
              Cerrar
            </button>
          </div>
          <div class="sheet">${labels}</div>
        </body>
      </html>`);
    win.document.close();
  };

  const toggles = [
    { key: 'showLogo',    label: 'Logo del taller' },
    { key: 'showShop',    label: 'Nombre del taller' },
    { key: 'showPhone',   label: 'Teléfono' },
    { key: 'showVehicle', label: 'Marca / modelo / año' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-graphite rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
              <QrCode size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Imprimir sticker QR</h2>
              <p className="text-xs text-gray-500">{data?.vehicle?.plate || '...'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="overflow-y-auto flex-1 p-5">
          {loading || !data ? (
            <div className="py-16 text-center text-sm text-gray-400">Preparando sticker...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Opciones */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Tamaño de etiqueta</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LABEL_SIZES.map(s => (
                      <button key={s.id} onClick={() => setSize(s)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition ${
                          size.id === s.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 shadow-sm'
                            : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Impresora</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[[true, 'Térmica (B/N)'], [false, 'Color']].map(([val, lbl]) => (
                      <button key={lbl} onClick={() => setMono(val)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition ${
                          mono === val
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 shadow-sm'
                            : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Contenido</label>
                  <div className="space-y-2 bg-gray-50 dark:bg-graphite-2 rounded-xl p-3">
                    {toggles.map(t => (
                      <label key={t.key} className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" checked={opts[t.key]}
                          onChange={e => setOpts(o => ({ ...o, [t.key]: e.target.checked }))}
                          className="w-4 h-4 rounded accent-blue-600" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t.label}</span>
                      </label>
                    ))}
                    <p className="text-[11px] text-gray-400 pt-1">La placa y el QR siempre van.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Cantidad</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold text-lg">−</button>
                    <span className="w-10 text-center text-sm font-medium text-gray-800 dark:text-gray-200">{quantity}</span>
                    <button onClick={() => setQuantity(q => Math.min(10, q + 1))}
                      className="w-9 h-9 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 font-bold text-lg">+</button>
                  </div>
                </div>
              </div>

              {/* Vista previa */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Vista previa</label>
                <div className="bg-gray-100 dark:bg-graphite-2 rounded-xl p-4 flex items-center justify-center min-h-[200px] overflow-hidden">
                  {/* Escalado para que 100 mm quepa en la columna; proporciones reales */}
                  <div style={{ transform: `scale(${Math.min(1.5, 250 / (size.w * 3.78))})`, transformOrigin: 'center' }}>
                    <style>{labelCss(size, mono, accent)}</style>
                    <div style={{ boxShadow: '0 0 0 1px #d1d5db' }}
                      dangerouslySetInnerHTML={{ __html: labelHtml(data, size, opts) }} />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-2 break-all">QR → {data.portal_url}</p>

                <div className="flex gap-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 mt-3">
                  <Info size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed space-y-1">
                    <p>Configura en la impresora el tamaño de papel <strong>{size.label}</strong> y escala al 100 %.</p>
                    <p>Para el parabrisas usa etiqueta de <strong>poliéster o vinilo</strong>: el papel térmico directo se borra con el sol.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-graphite-2 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-graphite hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handlePrint} disabled={!data}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40">
            <Printer size={16} /> Imprimir {quantity} sticker{quantity !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
