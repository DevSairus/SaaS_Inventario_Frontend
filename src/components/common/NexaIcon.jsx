// frontend/src/components/common/NexaIcon.jsx
// Icono de marca de NEXA (00 - Documentación/nexa-icon.svg) — inline para que
// escale con CSS sin depender de una carga de red aparte.
// Fondo alineado al gray-900 del Sidebar (en vez del negro original) para que
// se integre con el resto de la identidad visual de Pitbox.
export default function NexaIcon({ size = 24, rounded = true, animated = false, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="NEXA"
      role="img"
    >
      <style>{`
        .nexa-spark { transform-box: fill-box; transform-origin: center; }
        .nexa-spark--animated { animation: nexa-spark-pulse 2.4s ease-in-out infinite; }
        @keyframes nexa-spark-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nexa-spark--animated { animation: none; }
        }
      `}</style>
      <rect x="0" y="0" width="512" height="512" rx={rounded ? 96 : 0} fill="#111827" />
      <rect x="0.5" y="0.5" width="511" height="511" rx={rounded ? 95.5 : 0} fill="none" stroke="#232B3A" strokeWidth="1" />
      <text x="256" y="330" textAnchor="middle" fontSize="240" fontWeight="500" fill="#E5E7EA" fontFamily="Arial, sans-serif">N</text>
      <path
        className={`nexa-spark ${animated ? 'nexa-spark--animated' : ''}`}
        d="M354 168 C360 208 362 210 402 216 C362 222 360 224 354 264 C348 224 346 222 306 216 C346 210 348 208 354 168 Z"
        fill="#8B5CF6"
      />
    </svg>
  );
}
