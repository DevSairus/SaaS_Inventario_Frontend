import axios from 'axios';
import toast from 'react-hot-toast';
import {
  getStoredToken,
  setStoredToken,
  clearAuthStorage,
  getStoredBranchId,
  setStoredBranchId,
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

    const branchId = getStoredBranchId();
    if (branchId) {
      config.headers['x-branch-id'] = branchId;
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

// Suscripción vencida/suspendida/cancelada (o tenant desactivado): el
// backend ya bloquea el login para estos casos (auth.controller.js), pero
// una sesión YA ABIERTA sigue con JWT válido hasta por 24h -- si el estado
// cambia mientras el usuario sigue adentro, cada endpoint de tenant
// (tenantMiddleware) empieza a devolver este mismo código en simultáneo
// (el dashboard dispara varios GET en paralelo), así que sin esta guarda
// se dispararían N toasts y N redirecciones idénticas de una sola vez.
const SUBSCRIPTION_BLOCKED_CODES = new Set([
  'TRIAL_EXPIRED',
  'SUBSCRIPTION_SUSPENDED',
  'SUBSCRIPTION_CANCELLED',
  'TENANT_INACTIVE',
]);
let subscriptionBlockHandled = false;

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

    const errorCode = error.response?.data?.code;

    if (status === 403 && errorCode === 'NO_BRANCH_ASSIGNED') {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/sin-sede')) {
        window.location.href = '/sin-sede';
      }
      return Promise.reject(error);
    }

    if (status === 409 && errorCode === 'NO_BRANCHES_CONFIGURED') {
      // El tenant (admin) no tiene ninguna Branch activa -- branchMiddleware
      // rechaza CUALQUIER endpoint que dependa de sede antes de llegar al
      // controller. Sin esto, el admin ve un 409 "conflicto" pelado en la
      // pantalla que estaba usando (ej. horarios de citas) sin entender que
      // el problema es que le falta crear una sede.
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/branches')) {
        toast.error('Tu empresa no tiene sedes configuradas. Crea una sede para continuar.', { duration: 8000 });
        window.location.href = '/branches';
      }
      return Promise.reject(error);
    }

    if (status === 403 && errorCode === 'BRANCH_NOT_ALLOWED') {
      // La sede activa guardada localmente ya no es válida para este usuario:
      // se limpia para forzar la resolución automática de una sede permitida.
      setStoredBranchId(null);
      toast.error('No tienes acceso a la sede seleccionada. Se reinició tu sede activa.');
      return Promise.reject(error);
    }

    // Va ANTES del 403 genérico de abajo -- SUBSCRIPTION_CANCELLED/
    // TENANT_INACTIVE viajan con status 403 y si no, caerían en el mensaje
    // genérico de "no tienes permisos", que es engañoso: el problema no es
    // de permisos, es que la cuenta ya no tiene acceso.
    if ((status === 402 || status === 403) && SUBSCRIPTION_BLOCKED_CODES.has(errorCode)) {
      if (!subscriptionBlockHandled) {
        subscriptionBlockHandled = true;
        const mensaje = error.response?.data?.message || 'Tu cuenta no tiene acceso activo. Contacta a soporte.';
        toast.error(mensaje, { duration: 10000 });
        redirectToLogin();
      }
      return Promise.reject(error);
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
