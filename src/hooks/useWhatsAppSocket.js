// hooks/useWhatsAppSocket.js
import { useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket = null;

function ensureSocket(token) {
  if (!token) return null;
  if (socket?.connected) return socket;
  if (socket) {
    socket.connect();
    return socket;
  }

  socket = io(`${SOCKET_URL}/whatsapp`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('[WaWS] Conectado'));
  socket.on('disconnect', (r) => console.log('[WaWS] Desconectado:', r));
  socket.on('connect_error', (e) => console.warn('[WaWS] Error:', e.message));

  return socket;
}

export function useWhatsAppSocket() {
  const { token, isAuthenticated } = useAuthStore();
  const handlersRef = useRef(new Map());

  useEffect(() => {
    if (isAuthenticated && token) ensureSocket(token);
  }, [token, isAuthenticated]);

  const subscribeConversation = useCallback((conversationId) => {
    const s = ensureSocket(token);
    if (s?.connected) s.emit('wa:subscribe', { conversationId });
  }, [token]);

  const unsubscribeConversation = useCallback((conversationId) => {
    const s = ensureSocket(token);
    if (s?.connected) s.emit('wa:unsubscribe', { conversationId });
  }, [token]);

  const on = useCallback((event, handler) => {
    const s = ensureSocket(token);
    if (!s) return () => {};
    s.on(event, handler);
    handlersRef.current.set(handler, event);
    return () => {
      s.off(event, handler);
      handlersRef.current.delete(handler);
    };
  }, [token]);

  return { subscribeConversation, unsubscribeConversation, on };
}
