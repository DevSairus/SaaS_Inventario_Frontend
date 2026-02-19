import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ================================
// REQUEST INTERCEPTOR
// ================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ================================
// RESPONSE INTERCEPTOR
// ================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    /**
     * 🔒 ERRORES 401 (Token inválido/expirado)
     * 
     * Auto-logout deshabilitado para evitar pérdida de datos durante operaciones largas.
     * El token tiene duración de 365 días, por lo que no debería expirar en uso normal.
     * Solo se registra el error en consola para diagnóstico.
     */
    if (status === 401) {
      const isLoginAttempt = url.includes('/auth/login') || url.includes('/auth/register');
      if (!isLoginAttempt) {
        console.warn('⚠️ Error 401 - Token inválido o expirado. Auto-logout deshabilitado.');
      }
    }

    /**
     * 🚫 ERROR 403 (Sin permisos)
     * No hacer logout, solo rechazar la promesa
     * El componente puede manejar este error mostrando un mensaje
     */
    if (status === 403) {
      console.warn('⚠️ No tienes permisos para acceder a este recurso');
    }

    return Promise.reject(error);
  }
);

export default api;