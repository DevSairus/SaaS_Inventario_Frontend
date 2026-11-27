// frontend/src/components/workshop/VehicleBodyDiagram.jsx
// Diagrama de carrocería del peritaje. Carro: vista superior en SVG con cada
// panel clicable. Moto y pesado: cuadrícula de zonas (un dibujo genérico
// confunde más de lo que ayuda en esos casos).
// Cada zona se pinta según el daño más grave marcado y se bordea en naranja si
// la lectura de pintura supera el umbral de repintura (borde violeta).
import { BODY_ZONES, SEVERITIES, REPAINT_MICRONS } from '../../constants/inspection';

const SEV_ORDER = { leve: 1, moderado: 2, grave: 3 };

function zoneState(zone, marks, paint) {
  const zm = (marks || []).filter((m) => m.zone === zone);
  const worst = zm.reduce((w, m) => (SEV_ORDER[m.severity] > SEV_ORDER[w] ? m.severity : w), zm.length ? 'leve' : null);
  const microns = paint?.[zone];
  return { count: zm.length, worst, microns, repaint: microns > REPAINT_MICRONS };
}

// Vista superior, frente hacia arriba. [id, tipo, atributos]
const CAR_SHAPES = [
  ['bomper_del', 'rect', { x: 46, y: 8, width: 108, height: 18, rx: 8 }],
  ['guardabarro_di', 'rect', { x: 30, y: 30, width: 20, height: 78, rx: 6 }],
  ['guardabarro_dd', 'rect', { x: 150, y: 30, width: 20, height: 78, rx: 6 }],
  ['capo', 'rect', { x: 52, y: 30, width: 96, height: 78, rx: 6 }],
  ['panoramico', 'path', { d: 'M54 112 L146 112 L138 136 L62 136 Z' }],
  ['estribo_i', 'rect', { x: 14, y: 114, width: 12, height: 142, rx: 4 }],
  ['estribo_d', 'rect', { x: 174, y: 114, width: 12, height: 142, rx: 4 }],
  ['puerta_di', 'rect', { x: 28, y: 112, width: 24, height: 70, rx: 4 }],
  ['puerta_ti', 'rect', { x: 28, y: 186, width: 24, height: 70, rx: 4 }],
  ['puerta_dd', 'rect', { x: 148, y: 112, width: 24, height: 70, rx: 4 }],
  ['puerta_td', 'rect', { x: 148, y: 186, width: 24, height: 70, rx: 4 }],
  ['techo', 'rect', { x: 62, y: 140, width: 76, height: 104, rx: 6 }],
  ['vidrio_trasero', 'path', { d: 'M62 248 L138 248 L144 268 L56 268 Z' }],
  ['costado_ti', 'rect', { x: 30, y: 260, width: 20, height: 74, rx: 6 }],
  ['costado_td', 'rect', { x: 150, y: 260, width: 20, height: 74, rx: 6 }],
  ['baul', 'rect', { x: 52, y: 272, width: 96, height: 62, rx: 6 }],
  ['bomper_tras', 'rect', { x: 46, y: 338, width: 108, height: 18, rx: 8 }],
];

export default function VehicleBodyDiagram({ kind = 'car', marks = [], paint = {}, selected = null, onSelect, compact = false }) {
  const zones = BODY_ZONES[kind] || BODY_ZONES.car;
  const labels = Object.fromEntries(zones);

  const fillFor = (st) => (st.worst ? SEVERITIES[st.worst].color : '#ffffff');

  if (kind === 'car') {
    return (
      <div className={compact ? '' : 'flex flex-col items-center'}>
        <svg viewBox="0 0 200 364" className={compact ? 'w-full max-w-[180px]' : 'w-full max-w-[260px]'} role="img" aria-label="Diagrama de carrocería, vista superior">
          {/* silueta */}
          <rect x="24" y="4" width="152" height="356" rx="40" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1.5" />
          {CAR_SHAPES.map(([id, type, attrs]) => {
            const st = zoneState(id, marks, paint);
            const isSel = selected === id;
            const common = {
              fill: fillFor(st),
              fillOpacity: st.worst ? 0.85 : 1,
              stroke: isSel ? '#2563eb' : st.repaint ? '#7c3aed' : '#9ca3af',
              strokeWidth: isSel ? 3 : st.repaint ? 2.5 : 1,
              className: onSelect ? 'cursor-pointer transition hover:opacity-80' : '',
              onClick: onSelect ? () => onSelect(id) : undefined,
            };
            const title = `${labels[id]}${st.count ? ` · ${st.count} daño(s)` : ''}${st.microns ? ` · ${st.microns} µm` : ''}`;
            return type === 'rect'
              ? <rect key={id} {...common} {...attrs}><title>{title}</title></rect>
              : <path key={id} {...common} {...attrs}><title>{title}</title></path>;
          })}
          <text x="100" y="21" textAnchor="middle" fontSize="8" fill="#6b7280" pointerEvents="none">FRENTE</text>
        </svg>
        {!compact && <Legend />}
      </div>
    );
  }

  return (
    <div>
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-1.5`}>
        {zones.map(([id, label]) => {
          const st = zoneState(id, marks, paint);
          const isSel = selected === id;
          return (
            <button key={id} type="button" disabled={!onSelect} onClick={() => onSelect?.(id)}
              className={`text-left text-xs px-2.5 py-2 rounded-lg border transition ${isSel ? 'ring-2 ring-blue-500' : ''} ${st.repaint ? 'border-violet-500 border-2' : 'border-gray-200'} ${onSelect ? 'hover:bg-gray-50' : ''}`}
              style={st.worst ? { backgroundColor: `${SEVERITIES[st.worst].color}22` } : undefined}>
              <span className="flex items-center gap-1.5">
                {st.worst && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SEVERITIES[st.worst].color }} />}
                <span className="font-medium text-gray-800 truncate">{label}</span>
              </span>
              {(st.count > 0 || st.microns) && (
                <span className="block text-[11px] text-gray-500 mt-0.5">
                  {st.count > 0 && `${st.count} daño(s)`}{st.count > 0 && st.microns ? ' · ' : ''}{st.microns ? `${st.microns} µm` : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!compact && <Legend />}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3 text-[11px] text-gray-500">
      {Object.entries(SEVERITIES).map(([k, s]) => (
        <span key={k} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />{s.label}</span>
      ))}
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm border-2 border-violet-600" />Pintura &gt; {REPAINT_MICRONS} µm</span>
    </div>
  );
}
