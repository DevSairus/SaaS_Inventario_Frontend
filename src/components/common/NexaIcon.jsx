// frontend/src/components/common/NexaIcon.jsx
// Icono/mascota de NEXA — imagen suministrada en 00 - Documentación/Nexa.webp
// (copiada a /assets/nexa/nexa.webp para servirse como estática del frontend).
// `animated` agrega un halo circular de pulso alrededor del ícono, usado en
// el botón flotante del chat para invitar a usarlo.
// `className` controla la forma/radio del ícono (igual que antes con el SVG
// inline) — se aplica directo a la imagen, así el llamador decide si quiere
// esquinas redondeadas, circular, etc.
const NEXA_IMG = '/assets/nexa/nexa.webp';

export default function NexaIcon({ size = 24, animated = false, className = '' }) {
  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {animated && (
        <>
          <span
            className="absolute inset-0 rounded-full bg-[#CF3A0B]/40 animate-ping"
            style={{ animationDuration: '2.2s' }}
            aria-hidden="true"
          />
          <span
            className="absolute -inset-1 rounded-full bg-[#CF3A0B]/20"
            aria-hidden="true"
          />
        </>
      )}
      <img
        src={NEXA_IMG}
        alt="NEXA"
        width={size}
        height={size}
        className={`relative z-10 object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    </span>
  );
}
