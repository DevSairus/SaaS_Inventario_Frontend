import { useEffect, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';

// Quitar /api del final si existe — socket.io usa el host base
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket = null;
let connectPromise = null;

function ensureSocket(token) {
  if (!token) return null;

  // Si ya existe y está conectado, devolverlo
  if (socket?.connected) return socket;

  // Si existe pero se desconectó, reconectar
  if (socket) {
    socket.connect();
    return socket;
  }

  // Crear nuevo
  socket = io(`${SOCKET_URL}/support-remote`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    forceNew: false,
  });

  socket.on('connect', () => console.log('[WS] Conectado a /support-remote'));
  socket.on('disconnect', (reason) => console.log('[WS] Desconectado:', reason));
  socket.on('connect_error', (err) => console.warn('[WS] Error conexión:', err.message));

  return socket;
}

export function useRemoteSocket() {
  const { token } = useAuthStore();
  // Estado reactivo de la conexión — lo usa RemoteSessionNotifier para
  // decidir cuándo prender el poll de emergencia (ver fallback más abajo
  // en ese componente): mientras el socket esté conectado, no hace falta.
  const [isConnected, setIsConnected] = useState(() => !!socket?.connected);

  useEffect(() => {
    if (token) ensureSocket(token);
    // No desconectar nunca — singleton
  }, [token]);

  useEffect(() => {
    const s = ensureSocket(token);
    if (!s) return;
    setIsConnected(s.connected);
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    s.on('connect', handleConnect);
    s.on('disconnect', handleDisconnect);
    return () => {
      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
    };
  }, [token]);

  const emit = useCallback((event, data) => {
    const s = ensureSocket(token);
    if (!s) return;
    if (s.connected) {
      s.emit(event, data);
    } else {
      s.once('connect', () => s.emit(event, data));
    }
  }, [token]);

  const on = useCallback((event, handler) => {
    const s = ensureSocket(token);
    if (!s) return () => {};
    s.on(event, handler);
    return () => s.off(event, handler);
  }, [token]);

  return { emit, on, socket: ensureSocket(token), isConnected };
}
