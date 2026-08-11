import { useEffect } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket = null;
// Mismo patrón que useQuoteNotifications.js: socket singleton de módulo +
// suscripción, así AppointmentNotificationsBell puede refrescar su bandeja
// al instante sin abrir su propia conexión.
const listeners = new Set();

function ensureSocket(token) {
  if (!token) return null;
  if (socket?.connected) return socket;
  if (socket) { socket.connect(); return socket; }

  socket = io(`${SOCKET_URL}/appointments`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('[AppointmentsWS] Conectado'));
  socket.on('disconnect', (r) => console.log('[AppointmentsWS] Desconectado:', r));
  socket.on('connect_error', (e) => console.warn('[AppointmentsWS] Error:', e.message));

  socket.on('appointment:new', (data) => {
    console.log('[AppointmentsWS] appointment:new received:', data);
    toast(`📅 Nueva solicitud de cita — ${data.customer_name || 'cliente'}`, { duration: 6000 });
    listeners.forEach(cb => { try { cb(data); } catch { /* no romper a los demás suscriptores */ } });
  });

  return socket;
}

export function useAppointmentNotifications() {
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token) ensureSocket(token);
  }, [token, isAuthenticated]);
}

// Se suscribe al evento 'appointment:new' del socket ya conectado por
// useAppointmentNotifications (Layout lo monta siempre). Devuelve función
// para desuscribirse.
export function subscribeNewAppointment(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
