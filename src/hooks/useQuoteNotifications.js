import { useEffect } from 'react';
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

  socket = io(`${SOCKET_URL}/quotes`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('[QuotesWS] Conectado'));
  socket.on('disconnect', (r) => console.log('[QuotesWS] Desconectado:', r));
  socket.on('connect_error', (e) => console.warn('[QuotesWS] Error:', e.message));

  socket.on('quote:approved', (data) => {
    console.log('[QuotesWS] quote:approved received:', data);
    const labels = { aprobada: '✅ Cotización aprobada', rechazada: '❌ Cotización rechazada', parcial: '⚠️ Cotización aprobada parcialmente' };
    const label = labels[data.status] || 'Cotización respondida';
    toast(`${label} — OT ${data.order_number || ''} (${data.approved_by_name || 'cliente'})`, {
      duration: 6000,
    });
  });

  return socket;
}

export function useQuoteNotifications() {
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token) ensureSocket(token);
  }, [token, isAuthenticated]);
}
