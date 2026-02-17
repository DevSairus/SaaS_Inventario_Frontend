// frontend/src/components/auth/SessionMonitor.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

/**
 * Componente que monitorea la validez de la sesión del usuario
 * 
 * Características:
 * - Verifica periódicamente si el token sigue siendo válido
 * - Detecta cuando el token expira
 * - Cierra sesión automáticamente si es necesario
 * - Muestra notificación antes de cerrar sesión
 */
const SessionMonitor = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    // Solo monitorear si hay un usuario autenticado
    if (!user) return;

    const checkSession = () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // No hay token, cerrar sesión
        handleSessionExpired();
        return;
      }

      try {
        // Decodificar el token JWT para verificar expiración
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiration = payload.exp * 1000; // Convertir a milisegundos
        const now = Date.now();
        
        // Si el token expira en menos de 5 minutos, mostrar advertencia
        const fiveMinutes = 5 * 60 * 1000;
        if (expiration - now < fiveMinutes && expiration - now > 0) {
          toast('Tu sesión está por expirar. Guarda tu trabajo.', {
            icon: '⏰',
            duration: 4000,
            position: 'top-center',
          });
        }
        
        // Si el token ya expiró, cerrar sesión
        if (now >= expiration) {
          handleSessionExpired();
        }
      } catch (error) {
        console.error('Error verificando token:', error);
        // Si hay error decodificando el token, es inválido
        handleSessionExpired();
      }
    };

    const handleSessionExpired = () => {
      toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', {
        duration: 3000,
        position: 'top-center',
      });
      
      logout();
      
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    };

    // Verificar cada 60 segundos
    const interval = setInterval(checkSession, 60000);
    
    // Verificar inmediatamente al montar
    checkSession();

    // Limpiar intervalo al desmontar
    return () => clearInterval(interval);
  }, [user, navigate, logout]);

  // Este componente no renderiza nada
  return null;
};

export default SessionMonitor;