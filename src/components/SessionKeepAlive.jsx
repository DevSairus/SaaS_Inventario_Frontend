import { Component } from 'react';
import { authAPI } from '../api/auth';

/**
 * Componente para mantener la sesión activa mientras el usuario está activo
 * 
 * Características:
 * - Detecta actividad del usuario (mouse, teclado, scroll, clicks)
 * - Refresca el token automáticamente antes de que expire
 * - Solo refresca si hay actividad reciente (últimos 5 minutos)
 * 
 * Uso:
 * import SessionKeepAlive from '../components/SessionKeepAlive';
 * 
 * function App() {
 *   return (
 *     <div>
 *       <SessionKeepAlive />
 *       ...resto de la app
 *     </div>
 *   );
 * }
 */
class SessionKeepAlive extends Component {
  constructor(props) {
    super(props);
    this.lastActivity = Date.now();
    this.refreshTimer = null;
    
    // Definir eventos aquí para evitar undefined en unmount
    this.events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];
  }

  componentDidMount() {
    // Solo activar si hay token en localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    // Agregar listeners para detectar actividad
    this.events.forEach(event => {
      document.addEventListener(event, this.updateActivity);
    });

    // Iniciar verificación periódica del token
    this.scheduleNextRefresh();
  }

  componentWillUnmount() {
    // Limpiar listeners y timer
    if (this.events) {
      this.events.forEach(event => {
        document.removeEventListener(event, this.updateActivity);
      });
    }

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }

  // Actualizar timestamp de última actividad
  updateActivity = () => {
    this.lastActivity = Date.now();
  }

  // Verificar si el usuario ha estado activo en los últimos 5 minutos
  isUserActive = () => {
    const fiveMinutes = 5 * 60 * 1000;
    return (Date.now() - this.lastActivity) < fiveMinutes;
  }

  // Función para refrescar el token
  refreshToken = async () => {
    // Solo refrescar si el usuario ha estado activo
    if (!this.isUserActive()) {
      console.log('Usuario inactivo, no se refresca el token');
      this.scheduleNextRefresh();
      return;
    }

    try {
      // Intentar refrescar el token
      const response = await authAPI.refreshToken();
      
      if (response.success && response.data?.token) {
        console.log('Token refrescado exitosamente');
        
        // Actualizar token en localStorage
        const newToken = response.data.token;
        localStorage.setItem('token', newToken);
        
        // Programar siguiente refresh
        this.scheduleNextRefresh();
      }
    } catch (error) {
      console.error('Error al refrescar token:', error);
      // No cerrar sesión por errores de refresh - simplemente reintentar luego
      this.scheduleNextRefresh();
    }
  }

  // Programar siguiente refresh (cada 10 minutos)
  scheduleNextRefresh = () => {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Verificar token cada 10 minutos
    const refreshInterval = 10 * 60 * 1000;
    this.refreshTimer = setTimeout(this.refreshToken, refreshInterval);
  }

  // Cerrar sesión
  logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  render() {
    // Este componente no renderiza nada
    return null;
  }
}

export default SessionKeepAlive;