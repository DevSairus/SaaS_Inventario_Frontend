// Detección de entorno para la PWA "Taller" — instalable solo en mobile.

// UA sniffing + pointer/touch: cubre Android/iPhone/iPad clásicos, y también
// iPadOS reciente, que reporta un User-Agent de escritorio (Macintosh) pero
// expone puntero "coarse" y soporte multitouch.
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isKnownMobileUA = /Android|iPhone|iPod|iPad|Mobile/i.test(ua);
  const isCoarsePointer =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)')?.matches;
  const isIPadOsDesktopUA = navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua);
  return isKnownMobileUA || isIPadOsDesktopUA || Boolean(isCoarsePointer);
}

// Detecta si la app corre ya instalada (standalone), tanto en Android/Chrome
// (display-mode: standalone) como en iOS Safari (navigator.standalone).
export function isRunningAsInstalledPwa() {
  if (typeof window === 'undefined') return false;
  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const iosStandalone = typeof navigator !== 'undefined' && navigator.standalone === true;
  return Boolean(standaloneMedia || iosStandalone);
}
