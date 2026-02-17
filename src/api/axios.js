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
     * 🔒 AUTO-LOGOUT EN ERRORES 401 (Token inválido/expirado)
     * 
     * Casos que causan 401:
     * - Token expirado
     * - Token inválido
     * - Token no proporcionado
     * - Servidor reiniciado (tokens anteriores invalidados)
     * 
     * Excepciones (NO hacer logout):
     * - Endpoint de login (evitar loop)
     * - Ya estamos en la página de login
     */
    if (status === 401) {
      // No hacer logout si estamos intentando hacer login
      const isLoginAttempt = url.includes('/auth/login') || url.includes('/auth/register');
      const isAlreadyInLogin = window.location.pathname === '/login';
      
      if (!isLoginAttempt && !isAlreadyInLogin) {
        // Limpiar datos de sesión
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Mostrar notificación al usuario
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', {
          duration: 3000,
          position: 'top-center',
        });
        
        // Redirigir al login después de un breve delay para que el usuario vea el mensaje
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
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