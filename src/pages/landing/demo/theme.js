/**
 * Paleta y medidas del demo interactivo.
 *
 * `C`  replica la paleta del landing (LandingPage.jsx) para el marco del reproductor.
 * `M`  es la paleta de la mini-interfaz, en tema oscuro (decisión 8.6 del plan),
 *      tomada de los colores del modo oscuro de la app real (#0D0D0D / #17181C).
 *
 * Todo el contenido que se dibuja con estos colores es de ejemplo.
 */
export const C = {
  ink: '#0B0C10',
  inkD: '#000000',
  graphite: '#15171D',
  graphite2: '#1B1D24',
  accent: '#CF3A0B',
  accentL: '#F0572B',
  signal: '#22C55E',
  signalL: '#4ADE80',
  caution: '#E2A83B',
  white: '#FFFFFF',
};

export const M = {
  bg: '#0D0D0D',
  chrome: '#0A0A0B',
  panel: '#17181C',
  panel2: '#1F2127',
  border: 'rgba(255,255,255,0.10)',
  border2: 'rgba(255,255,255,0.16)',
  text: '#E8E9EC',
  muted: '#9CA3AF',
  faint: '#6B7280',
  blue: '#2563EB',
  blueSoft: '#60A5FA',
  blueBg: 'rgba(37,99,235,0.16)',
  amber: '#F59E0B',
  green: '#10B981',
  orange: '#F97316',
  red: '#EF4444',
};

export const FONT_BODY = "'Inter', system-ui, sans-serif";
export const FONT_TITLE = "'Space Grotesk', sans-serif";

/* Lienzo fijo: la mini-interfaz se dibuja siempre a este tamaño y se escala. */
export const CANVAS_W = 960;
export const CANVAS_H = 600;
