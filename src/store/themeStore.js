import { create } from 'zustand';

// Modo oscuro (MVP): aplica al shell general (sidebar, barras, marco de
// contenido) vía la clase 'dark' en <html> + Tailwind darkMode:'class'.
// Las páginas internas se irán oscureciendo de forma incremental — por ahora
// siguen usando su fondo claro habitual.
const getInitialDark = () => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
  } catch {}
  return false;
};

const applyDarkClass = (dark) => {
  document.documentElement.classList.toggle('dark', dark);
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
};

const initialDark = getInitialDark();
applyDarkClass(initialDark);

const useThemeStore = create((set, get) => ({
  dark: initialDark,
  toggle: () => {
    const next = !get().dark;
    applyDarkClass(next);
    set({ dark: next });
  },
}));

export default useThemeStore;
