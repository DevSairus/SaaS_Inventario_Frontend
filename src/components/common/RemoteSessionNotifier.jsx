import { useEffect, useState, useRef } from 'react';
import useAuthStore from '../../store/authStore';
import { getPendingRemoteSessions } from '../../api/support';
import { useRemoteSocket } from '../../hooks/useRemoteSocket';
import RemoteConsentModal from '../../pages/support/RemoteConsentModal';
import ScreenShareClient from '../../pages/support/ScreenShareClient';
import toast from 'react-hot-toast';

// Cuánto esperar con el socket caído antes de asumir que no va a volver
// solo (evita prender el poll de emergencia por un parpadeo normal de
// reconexión, que ya maneja socket.io por su cuenta).
const FALLBACK_THRESHOLD_MS = 45 * 1000;
// Frecuencia del poll de emergencia mientras el socket sigue caído — mucho
// más barato que los 8s de antes, pero sigue garantizando que el modal de
// consentimiento aparezca aunque el push por socket no pueda llegar (proxy
// corporativo, namespace caído, etc. — ver analisis-consumo-neon.md).
const FALLBACK_POLL_MS = 4 * 60 * 1000;

export default function RemoteSessionNotifier() {
  const { isAuthenticated, user } = useAuthStore();
  const { emit, on, isConnected } = useRemoteSocket();
  const [pendingSession, setPendingSession] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());
  const showingRef = useRef(false);
  const dismissedRef = useRef(dismissed);
  const activeSessionIdRef = useRef(activeSessionId);
  const fallbackIntervalRef = useRef(null);

  const isExcluded = user?.role === 'super_admin' || user?.role === 'support';

  useEffect(() => { dismissedRef.current = dismissed; }, [dismissed]);
  useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);

  const maybeShow = (session) => {
    if (!session || showingRef.current || activeSessionIdRef.current) return;
    if (dismissedRef.current.has(session.id)) return;
    showingRef.current = true;
    setPendingSession(session);
  };

  const checkPendingOnce = async () => {
    try {
      const data = await getPendingRemoteSessions();
      if (data.success && data.data.length > 0) {
        const session = data.data.find((s) => !dismissedRef.current.has(s.id));
        maybeShow(session);
      }
    } catch { /* silent */ }
  };

  // Antes: polling cada 8s a getPendingRemoteSessions para todo usuario
  // logueado, todo el día. Ahora el backend empuja 'session:pending' por
  // socket apenas el agente crea la sesión (ver remoteSupportSignaling.js +
  // remoteSession.controller.js). Solo queda un fetch único de catch-up al
  // autenticar, para cubrir el caso borde de una sesión creada mientras el
  // usuario no tenía ninguna pestaña abierta (y por lo tanto no pudo recibir
  // el push).
  useEffect(() => {
    if (!isAuthenticated || !user || isExcluded) return;
    checkPendingOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, isExcluded]);

  // Push en tiempo real: el agente crea la sesión → el backend emite
  // 'session:pending' al room del usuario destino.
  useEffect(() => {
    if (!isAuthenticated || !user || isExcluded) return;
    return on('session:pending', (session) => maybeShow(session));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, isExcluded, on]);

  // Red de seguridad: si el socket lleva caído más de FALLBACK_THRESHOLD_MS
  // (proxy corporativo bloqueando WS+polling, namespace caído del lado del
  // server, etc.), prende un poll de baja frecuencia que se apaga solo en
  // cuanto el socket reconecta. El resto del tiempo (socket conectado, que
  // es el caso normal) este efecto no hace nada.
  useEffect(() => {
    if (!isAuthenticated || !user || isExcluded) return;

    if (isConnected) {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      if (fallbackIntervalRef.current) return;
      checkPendingOnce();
      fallbackIntervalRef.current = setInterval(checkPendingOnce, FALLBACK_POLL_MS);
    }, FALLBACK_THRESHOLD_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isAuthenticated, user, isExcluded]);

  // Por si el componente se desmonta con el poll de emergencia activo.
  useEffect(() => {
    return () => {
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
    };
  }, []);

  // Si el agente cancela mientras el modal de consentimiento está visible,
  // el cliente se entera al instante.
  useEffect(() => {
    if (!pendingSession) return;
    const sid = pendingSession.id;
    emit('session:join', { sessionId: sid });
    const unsub = on('session:ended', ({ sessionId }) => {
      if (sessionId !== sid) return;
      setPendingSession((prev) => (prev?.id === sid ? null : prev));
      showingRef.current = false;
      toast('El agente canceló la solicitud de acceso remoto', { icon: 'ℹ️' });
    });
    return unsub;
  }, [pendingSession, emit, on]);

  const handleConsent = (consent) => {
    if (consent && pendingSession) {
      setActiveSessionId(pendingSession.id);
    }
    setDismissed((prev) => new Set([...prev, pendingSession.id]));
    setPendingSession(null);
    showingRef.current = false;
  };

  if (isExcluded) return null;

  return (
    <>
      {pendingSession && (
        <RemoteConsentModal session={pendingSession} onRespond={handleConsent} />
      )}
      {activeSessionId && (
        <ScreenShareClient
          sessionId={activeSessionId}
          onEnd={() => setActiveSessionId(null)}
        />
      )}
    </>
  );
}
