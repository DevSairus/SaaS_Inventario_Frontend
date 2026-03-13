import { create } from 'zustand';

const getInitial = () => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};

const applyTheme = (dark) => {
  document.documentElement.classList.toggle('dark', dark);
};

const useThemeStore = create((set) => {
  const dark = getInitial();
  applyTheme(dark);
  return {
    dark,
    toggle: () =>
      set((s) => {
        const next = !s.dark;
        applyTheme(next);
        try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
        return { dark: next };
      }),
  };
});

export default useThemeStore;