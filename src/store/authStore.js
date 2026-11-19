import { create } from 'zustand';
import { authAPI } from '../api/auth';
import useNotificationsBundleStore from './notificationsBundleStore';
import {
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearAuthStorage,
  isTokenExpired,
  getImpersonatorSession,
  setImpersonatorSession,
  clearImpersonatorSession,
  decodeJwtPayload,
  setStoredBranchId,
} from '../utils/authStorage';
import offlineDb from '../pwa/offlineQueue/db';

// Otra pestaña cambió de empresa: esta recarga para no seguir mostrando (ni
// guardando) datos de la empresa anterior con el token de la nueva.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== 'token' || !e.oldValue || !e.newValue) return;
    const before = decodeJwtPayload(e.oldValue)?.tenant_id;
    const after = decodeJwtPayload(e.newValue)?.tenant_id;
    if (before && after && before !== after) window.location.reload();
  });
}

function loadInitialSession() {
  const token = getStoredToken();
  const user = getStoredUser();
  const validToken = token && !isTokenExpired(token);
  if (!validToken) {
    // Si el token está vencido, limpiamos para evitar estado inconsistente
    if (token) clearAuthStorage();
    return { token: null, user: null, isAuthenticated: false };
  }
  return { token, user, isAuthenticated: true };
}

const initialSession = loadInitialSession();

const useAuthStore = create((set) => ({
  user: initialSession.user,
  token: initialSession.token,
  isAuthenticated: initialSession.isAuthenticated,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(email, password);

      // Trabaja en varias empresas: la página de login muestra la lista y
      // llama a selectCompany con la elegida.
      if (response.success && response.data?.requires_tenant_selection) {
        set({ isLoading: false, error: null });
        return {
          success: false,
          selection: { token: response.data.selection_token, companies: response.data.companies || [] },
        };
      }

      if (response.success) {
        const { token, user } = response.data;

        setStoredToken(token);
        setStoredUser(user);

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        return { success: true, user };
      }
      set({ isLoading: false });
      return { success: false, error: response.message || 'Error al iniciar sesión' };
    } catch (error) {
      // El rate limiter de login responde en `error`, no en `message`.
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Error al iniciar sesión';
      set({
        error: errorMessage,
        isLoading: false,
      });
      return { success: false, error: errorMessage };
    }
  },

  // Login en dos pasos: la empresa elegida de la lista que devolvió login().
  selectCompany: async (selectionToken, userId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.selectTenant(selectionToken, userId);
      const { token, user } = response.data;
      setStoredBranchId(null);
      setStoredToken(token);
      setStoredUser(user);
      set({ user, token, isAuthenticated: true, isLoading: false, error: null });
      return { success: true, user };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'No se pudo entrar a la empresa';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage, expired: error.response?.data?.code === 'SELECTION_EXPIRED' };
    }
  },

  // Cambia de empresa sin cerrar sesión. Navegación dura a /dashboard: así
  // ningún store, caché ni socket conserva datos de la empresa anterior (igual
  // que la impersonación de soporte).
  switchCompany: async (tenantId) => {
    // La cola sin conexión de Taller no sabe de qué empresa es cada cambio:
    // si queda algo pendiente, se sincronizaría en la empresa equivocada.
    const pending = await offlineDb.mutationQueue
      .where('status').anyOf('pending', 'error', 'conflict').count()
      .catch(() => 0);
    if (pending > 0) {
      return {
        success: false,
        error: `Hay ${pending} cambio(s) de Taller sin sincronizar en esta empresa. Conéctate y espera a que se sincronicen antes de cambiar de empresa.`,
      };
    }
    try {
      const response = await authAPI.switchTenant(tenantId);
      const { token, user } = response.data;
      useNotificationsBundleStore.getState().stopPolling();
      setStoredBranchId(null); // la sede activa era de la otra empresa
      setStoredToken(token);
      setStoredUser(user);
      window.location.href = '/dashboard';
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'No se pudo cambiar de empresa' };
    }
  },

  logout: () => {
    useNotificationsBundleStore.getState().stopPolling();
    clearAuthStorage();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  setSession: ({ token, user }) => {
    if (token) setStoredToken(token);
    if (user) setStoredUser(user);
    set({
      token: token ?? null,
      user: user ?? null,
      isAuthenticated: !!token,
    });
  },

  // Guarda la sesión actual (superadmin) aparte y adopta la del usuario
  // impersonado — ver frontend/src/pages/superadmin/TenantUsers.jsx.
  startImpersonation: ({ token, user }) => {
    const current = { token: getStoredToken(), user: getStoredUser() };
    if (current.token && current.user) {
      setImpersonatorSession(current.token, current.user);
    }
    set({ token, user, isAuthenticated: !!token });
    setStoredToken(token);
    setStoredUser(user);
  },

  // Restaura la sesión del superadmin guardada por startImpersonation.
  // Retorna false si no había nada guardado o si ya expiró (el caller debe
  // mandar a /login en ese caso).
  endImpersonation: () => {
    const impersonator = getImpersonatorSession();
    clearImpersonatorSession();
    if (!impersonator || isTokenExpired(impersonator.token)) {
      clearAuthStorage();
      set({ token: null, user: null, isAuthenticated: false });
      return false;
    }
    setStoredToken(impersonator.token);
    setStoredUser(impersonator.user);
    set({ token: impersonator.token, user: impersonator.user, isAuthenticated: true });
    return true;
  },

  isImpersonating: () => {
    const token = getStoredToken();
    if (!token) return false;
    const payload = decodeJwtPayload(token);
    return Boolean(payload?.impersonated_by);
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
