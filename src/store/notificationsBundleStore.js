import { create } from 'zustand';
import { getNotificationsBundle } from '../api/notificationsBundle';

// Antes, cada campana del header (StockAlerts, PayableAlerts,
// AdvanceAlerts, CrmNotifications, QuoteNotificationsBell,
// AppointmentNotificationsBell) tenía su propio setInterval pidiendo lo
// suyo cada 90s-2min — 6 timers independientes por usuario logueado, todo
// el día (ver analisis-consumo-neon.md). Ahora hay un solo store con un
// solo timer de 30 min que trae todo de una vez desde /notifications/summary,
// y cada campana lee su sección de acá en vez de hacer fetch propio.
//
// El refresh "al abrir el dropdown" de cada campana se mantiene, pero sigue
// llamando a su endpoint dedicado (no a este bundle) — es una acción del
// usuario, no un timer, así que no aporta al problema de tráfico constante
// que motivó este cambio.
const POLL_INTERVAL_MS = 30 * 60 * 1000;

let pollHandle = null;
let starting = false;

const useNotificationsBundleStore = create((set, get) => ({
  data: {
    stock: null,
    payable: null,
    advance: null,
    crm: null,
    quotes: null,
    appointments: null,
  },
  loading: false,
  lastFetchedAt: null,

  fetchBundle: async () => {
    set({ loading: true });
    try {
      const res = await getNotificationsBundle();
      if (res?.success) {
        set({ data: { ...get().data, ...res.data }, lastFetchedAt: Date.now() });
      }
    } catch {
      // silencioso, igual que cada campana individual antes de este cambio
    } finally {
      set({ loading: false });
    }
  },

  // Llamar una vez desde Layout.jsx al montar. Idempotente: si ya hay un
  // timer corriendo (varias instancias de Layout, hot-reload, etc.) no
  // arranca uno nuevo.
  startPolling: () => {
    if (pollHandle || starting) return;
    starting = true;
    get().fetchBundle().finally(() => { starting = false; });
    pollHandle = setInterval(() => get().fetchBundle(), POLL_INTERVAL_MS);
  },

  stopPolling: () => {
    if (pollHandle) {
      clearInterval(pollHandle);
      pollHandle = null;
    }
  },
}));

export default useNotificationsBundleStore;
