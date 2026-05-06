import { Component } from 'react';
import { authAPI } from '../api/auth';
import { getStoredToken, setStoredToken } from '../utils/authStorage';

/**
 * Mantiene la sesión activa mientras el usuario está activo.
 *
 * - Detecta actividad (mouse, teclado, scroll, clicks)
 * - Refresca el token automáticamente si hubo actividad en los últimos 5 min
 * - Se coordina con el interceptor 401 de axios.js (que también intenta refresh)
 */
class SessionKeepAlive extends Component {
  constructor(props) {
    super(props);
    this.lastActivity = Date.now();
    this.refreshTimer = null;

    this.events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];
  }

  componentDidMount() {
    const token = getStoredToken();
    if (!token) return;

    this.events.forEach((event) => {
      document.addEventListener(event, this.updateActivity, { passive: true });
    });

    this.scheduleNextRefresh();
  }

  componentWillUnmount() {
    if (this.events) {
      this.events.forEach((event) => {
        document.removeEventListener(event, this.updateActivity);
      });
    }
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }

  updateActivity = () => {
    this.lastActivity = Date.now();
  };

  isUserActive = () => {
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - this.lastActivity < fiveMinutes;
  };

  refreshToken = async () => {
    if (!this.isUserActive()) {
      this.scheduleNextRefresh();
      return;
    }
    if (!getStoredToken()) {
      // Sesión cerrada en otra pestaña; no seguimos reintentando
      return;
    }

    try {
      const response = await authAPI.refreshToken();
      const newToken = response?.data?.token || response?.token;
      if (response?.success && newToken) {
        setStoredToken(newToken);
      }
    } catch {
      // Los errores de refresh los maneja el interceptor de axios (401 → login)
    } finally {
      this.scheduleNextRefresh();
    }
  };

  scheduleNextRefresh = () => {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const refreshInterval = 10 * 60 * 1000; // 10 min
    this.refreshTimer = setTimeout(this.refreshToken, refreshInterval);
  };

  render() {
    return null;
  }
}

export default SessionKeepAlive;
