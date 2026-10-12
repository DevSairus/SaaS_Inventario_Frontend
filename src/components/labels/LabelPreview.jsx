// frontend/src/components/labels/LabelPreview.jsx
// Vista previa de una etiqueta tal como sale de la impresora: el mismo dibujo
// que se imprime (utils/labelPrinting.js#renderLabelCanvas), escalado a
// pantalla, sobre el contorno real de la etiqueta en mm.
import { useMemo } from 'react';
import { renderLabelCanvas, normalizeProfile } from '../../utils/labelPrinting';

const PX_PER_MM = 4;

export default function LabelPreview({ profile: rawProfile, data, overrides, maxWidthPx = 320 }) {
  const profile = useMemo(() => normalizeProfile(rawProfile), [rawProfile]);
  const built = useMemo(() => {
    try {
      return renderLabelCanvas(profile, data, overrides);
    } catch {
      return null;
    }
  }, [profile, data, overrides]);

  const scale = Math.min(PX_PER_MM, maxWidthPx / Math.max(profile.label_w_mm, 1));
  const w = profile.label_w_mm * scale;
  const h = profile.label_h_mm * scale;
  const imgW = built ? (built.canvas.width / built.dpm) * scale : 0;
  const imgH = built ? (built.canvas.height / built.dpm) * scale : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        style={{ width: w, height: h, position: 'relative', background: '#fff', borderRadius: 4, boxShadow: '0 0 0 1px #9ca3af' }}
      >
        {built && (
          <img
            src={built.canvas.toDataURL('image/png')}
            alt="Vista previa de la etiqueta"
            style={{ position: 'absolute', width: imgW, height: imgH, left: (w - imgW) / 2, top: (h - imgH) / 2, imageRendering: 'pixelated' }}
          />
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {profile.label_w_mm} × {profile.label_h_mm} mm · {profile.dpi} dpi
      </p>
      {built?.overflow && (
        <p className="text-xs text-red-600 dark:text-red-400 text-center max-w-xs">
          El código no cabe en el ancho de la etiqueta: reduce el margen interno, quita la zona de silencio o usa una etiqueta más ancha.
        </p>
      )}
    </div>
  );
}
