// frontend/src/hooks/useWorkshopBoard.js
// Estado de la pantalla de taller, compartido por el TV y la vista interna:
// carga el tablero, lo refresca con cada aviso del socket (y cada minuto por
// si se cae la conexión), resalta la OT que cambió, arma el texto del último
// cambio y hace sonar el aviso si el sonido está activo.
import { useCallback, useEffect, useRef, useState } from 'react';
import useWorkshopBoardSocket from './useWorkshopBoardSocket';
import { playBoardSound, soundFor } from '../utils/boardSounds';
import { STATUS_META } from '../components/workshop/board/WorkshopBoardView';

const POLL_MS = 60 * 1000;
const HIGHLIGHT_MS = 8 * 1000;
const BANNER_MS = 10 * 1000;

const KIND_TEXT = {
  created: () => 'Nueva OT',
  technician: () => 'Cambio de técnico',
  bay: (card) => (card?.bay_id ? 'Entró a bahía' : 'Salió de bahía'),
  quote: () => 'El cliente respondió la cotización',
};

function findCard(data, id) {
  if (!data || !id) return null;
  for (const b of data.bays) if (b.order?.id === id) return { ...b.order, bayName: b.name };
  return data.unassigned.find((c) => c.id === id) || null;
}

export default function useWorkshopBoard({ load, socket, soundOn }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [highlightIds, setHighlightIds] = useState(() => new Set());
  const [banner, setBanner] = useState(null);
  const loadRef = useRef(load);
  loadRef.current = load;
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const timer = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const d = await loadRef.current();
      setData(d);
      setError(null);
      return d;
    } catch (e) {
      setError(e);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [refresh, socket.displayToken, socket.branchId]);

  const onEvent = useCallback((e) => {
    // Varios avisos seguidos (p. ej. cambiar técnico y estado) → un solo refresco.
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const d = await refresh();
      if (!e?.work_order_id || e.kind === 'refresh') return;
      const sound = soundFor(e);
      if (sound && soundRef.current) playBoardSound(sound);
      setHighlightIds((prev) => new Set(prev).add(e.work_order_id));
      setTimeout(() => setHighlightIds((prev) => { const n = new Set(prev); n.delete(e.work_order_id); return n; }), HIGHLIGHT_MS);
      const card = findCard(d, e.work_order_id);
      const what = e.kind === 'status'
        ? `→ ${STATUS_META[e.status]?.label || e.status}`
        : (KIND_TEXT[e.kind]?.(card) || '');
      setBanner({
        id: Date.now(),
        plate: card?.plate || null,
        order: e.order_number,
        text: what,
        where: card?.bayName || null,
      });
    }, 300);
  }, [refresh]);

  useEffect(() => {
    if (!banner) return undefined;
    const t = setTimeout(() => setBanner(null), BANNER_MS);
    return () => clearTimeout(t);
  }, [banner]);

  const [revoked, setRevoked] = useState(false);
  const connected = useWorkshopBoardSocket({
    ...socket,
    onEvent,
    onReconnect: refresh,
    onRevoked: () => setRevoked(true),
  });

  return { data, error, now, highlightIds, banner, connected, revoked, refresh };
}
