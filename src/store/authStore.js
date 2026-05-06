import { create } from 'zustand';
import { authAPI } from '../api/auth';
import {
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearAuthStorage,
  isTokenExpired,
} from '../utils/authStorage';

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
      const errorMessage = error.response?.data?.message || 'Error al iniciar sesión';
      set({
        error: errorMessage,
        isLoading: false,
      });
      return { success: false, error: errorMessage };
    }
  },

  logout: () => {
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

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
