import { useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket = null;

function ensureSocket(token) {
  if (!token) return null;
  if (socket?.connected) return socket;
  if (socket) { socket.connect(); return socket; }

  socket = io(`${SOCKET_URL}/tickets`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('[TicketsWS] Conectado'));
  socket.on('disconnect', (r) => console.log('[TicketsWS] Desconectado:', r));
  socket.on('connect_error', (e) => console.warn('[TicketsWS] Error:', e.message));

  // Escuchar notificaciones de tickets
  socket.on('ticket:new-message', (data) => {
    console.log('[TicketsWS] new-message received:', data);
    if (data.is_internal_note) return;
    toast(`💬 Nuevo mensaje en ticket: ${data.message?.substring(0, 60) || '...'}`, {
      duration: 5000,
    });
  });

  socket.on('ticket:status-changed', (data) => {
    console.log('[TicketsWS] status-changed received:', data);
    const labels = {
      open: 'Abierto',
      in_progress: 'En progreso',
      waiting_customer: 'Esperando cliente',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    };
    toast(`📋 Ticket cambió a: ${labels[data.newStatus] || data.newStatus}`, {
      duration: 5000,
    });
  });

  return socket;
}

export function useTicketNotifications() {
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token) ensureSocket(token);
  }, [token, isAuthenticated]);

  const subscribeTicket = useCallback((ticketId) => {
    const s = ensureSocket(token);
    if (s?.connected) s.emit('ticket:subscribe', { ticketId });
  }, [token]);

  const unsubscribeTicket = useCallback((ticketId) => {
    const s = ensureSocket(token);
    if (s?.connected) s.emit('ticket:unsubscribe', { ticketId });
  }, [token]);

  const on = useCallback((event, handler) => {
    const s = ensureSocket(token);
    if (!s) return () => {};
    s.on(event, handler);
    return () => s.off(event, handler);
  }, [token]);

  return { subscribeTicket, unsubscribeTicket, on };
}
