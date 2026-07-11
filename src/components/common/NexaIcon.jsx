// frontend/src/components/common/NexaIcon.jsx
// Icono de marca de NEXA (00 - Documentación/nexa-icon.svg) — inline para que
// escale con CSS sin depender de una carga de red aparte.
export default function NexaIcon({ size = 24, rounded = true, className = '' }) {
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
      <rect x="0" y="0" width="512" height="512" rx={rounded ? 96 : 0} fill="#111116" />
      <rect x="0.5" y="0.5" width="511" height="511" rx={rounded ? 95.5 : 0} fill="none" stroke="#2A2B30" strokeWidth="1" />
      <text x="256" y="330" textAnchor="middle" fontSize="240" fontWeight="500" fill="#E5E7EA" fontFamily="Arial, sans-serif">N</text>
      <path d="M354 168 C360 208 362 210 402 216 C362 222 360 224 354 264 C348 224 346 222 306 216 C346 210 348 208 354 168 Z" fill="#8B5CF6" />
    </svg>
  );
}
