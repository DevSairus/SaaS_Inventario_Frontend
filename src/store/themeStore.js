import { create } from 'zustand';

// Dark mode desactivado — el store se mantiene como stub para no romper imports
// que ya usan useThemeStore en otros componentes.
const useThemeStore = create(() => ({
  dark: false,
  toggle: () => {},
}));

// Asegurar que la clase 'dark' nunca esté activa
document.documentElement.classList.remove('dark');
try { localStorage.removeItem('theme'); } catch {}

export default useThemeStore;
