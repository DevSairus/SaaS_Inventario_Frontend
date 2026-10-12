// frontend/src/components/labels/VehicleLabelPreview.jsx
// Vista previa del sticker QR del vehículo con el perfil de impresión: mismo
// HTML/CSS que se imprime (components/workshop/vehicleLabel.js), escalado a
// pantalla sobre el contorno real de la etiqueta. Si el perfil rota, se
// muestra girado como saldrá.
import { useMemo } from 'react';
import { normalizeProfile } from '../../utils/labelPrinting';
import { vehicleLabelCss, vehicleLabelHtml, vehicleMetricsForProfile } from '../workshop/vehicleLabel';

const MM_PX = 3.78; // px CSS por mm

export default function VehicleLabelPreview({ profile: rawProfile, data, opts, mono, maxWidthPx = 280 }) {
  const profile = useMemo(() => normalizeProfile(rawProfile), [rawProfile]);
  const metrics = vehicleMetricsForProfile(profile);
  const accent = data?.workshop?.primary_color || '#1e40af';
  const isMono = mono ?? !profile.color;
  const scale = Math.min(1.5, maxWidthPx / (profile.label_w_mm * MM_PX));
  const boxW = profile.label_w_mm * MM_PX * scale;
  const boxH = profile.label_h_mm * MM_PX * scale;

  const innerStyle = profile.rotate
    ? { position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `scale(${scale}) translateX(${profile.label_w_mm}mm) rotate(90deg)` }
    : { position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `scale(${scale})` };

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ width: boxW, height: boxH, position: 'relative', overflow: 'hidden', boxShadow: '0 0 0 1px #9ca3af', background: '#fff' }}>
        <style>{vehicleLabelCss(metrics, isMono, accent)}</style>
        <div style={innerStyle} dangerouslySetInnerHTML={{ __html: vehicleLabelHtml(data, metrics, opts) }} />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {profile.label_w_mm} × {profile.label_h_mm} mm · {isMono ? 'Térmica (B/N)' : 'Color'}
      </p>
      {metrics.qr < 18 && (
        <p className="text-xs text-amber-700 dark:text-amber-400 text-center max-w-xs">
          El QR queda de {metrics.qr} mm: puede costar leerlo a través del vidrio. Para el parabrisas conviene 58 × 40 mm o más.
        </p>
      )}
    </div>
  );
}
