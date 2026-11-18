// frontend/src/hooks/useWorkshopBoardSocket.js
// Avisos en vivo de la pantalla de taller (namespace /workshop-board).
//   - displayToken: el TV (sin login) — el servidor lo mete en la sala de su sede.
//   - token + branchId: la vista interna — se suscribe a la sede elegida.
// onEvent recibe { kind, work_order_id, order_number, status }; onRevoked se
// llama si regeneran o revocan el enlace del TV.
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

export default function useWorkshopBoardSocket({ displayToken, token, branchId, onEvent, onRevoked, onReconnect }) {
  const [connected, setConnected] = useState(false);
  const handlers = useRef({ onEvent, onRevoked, onReconnect });
  handlers.current = { onEvent, onRevoked, onReconnect };

  useEffect(() => {
    if (!displayToken && !(token && branchId)) return undefined;
    const socket = io(`${SOCKET_URL}/workshop-board`, {
      auth: displayToken ? { displayToken } : { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
    });
    let everConnected = false;
    socket.on('connect', () => {
      setConnected(true);
      if (!displayToken) socket.emit('board:subscribe', { branchId });
      // Al reconectar pudo haberse perdido algún aviso: refrescar.
      if (everConnected) handlers.current.onReconnect?.();
      everConnected = true;
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('board:changed', (e) => handlers.current.onEvent?.(e));
    if (displayToken) socket.on('board:revoked', () => handlers.current.onRevoked?.());
    return () => { socket.close(); };
  }, [displayToken, token, branchId]);

  return connected;
}
