import axios from 'axios';
import toast from 'react-hot-toast';
import {
  getStoredToken,
  setStoredToken,
  clearAuthStorage,
  STORAGE_KEYS,
} from '../utils/authStorage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ================================
// ABORT CONTROLLER REGISTRY
// Permite cancelar requests activos por clave (ej: "products-list")
// ================================
const _controllers = new Map();

export function cancelRequest(key) {
  const ctrl = _controllers.get(key);
  if (ctrl) { ctrl.abort(); _controllers.delete(key); }
}

export function getSignal(key) {
  cancelRequest(key);
  const ctrl = new AbortController();
  _controllers.set(key, ctrl);
  return ctrl.signal;
}

// ================================
// REQUEST INTERCEPTOR
// ================================
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ================================
// RESPONSE INTERCEPTOR: refresh token on 401
// ================================
// Evita bucles infinitos y múltiples refresh simultáneos
let isRefreshing = false;
let pendingQueue = [];

function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

function redirectToLogin() {
  clearAuthStorage();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config || {};
    const url = originalRequest.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');

    if (status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      if (isRefreshing) {
        // Esperar a que termine el refresh en curso y reintentar
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest._retry = true;
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await api.post('/auth/refresh');
        const newToken = refreshResponse?.data?.data?.token || refreshResponse?.data?.token;

        if (!newToken) {
          throw new Error('No se pudo renovar la sesión');
        }

        setStoredToken(newToken);
        processQueue(null, newToken);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        toast.error('Tu sesión expiró. Por favor inicia sesión nuevamente.');
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 403 && !originalRequest.skipGlobalForbidden) {
      toast.error('No tienes permisos para realizar esta acción.');
    }

    // Retry automático para errores de red / servidor (NO para 4xx)
    const isNetworkError = !error.response && error.code !== 'ERR_CANCELED';
    const isServerError  = status >= 500;
    const retryCount     = originalRequest._retryCount || 0;
    const maxRetries     = 2;
    const isIdempotent   = ['GET', 'HEAD'].includes(originalRequest.method?.toUpperCase());

    if ((isNetworkError || isServerError) && isIdempotent && retryCount < maxRetries) {
      originalRequest._retryCount = retryCount + 1;
      const delay = 800 * Math.pow(2, retryCount); // 800ms, 1600ms
      await new Promise(r => setTimeout(r, delay));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

// Exportar constantes para compatibilidad
export { STORAGE_KEYS };
export default api;
