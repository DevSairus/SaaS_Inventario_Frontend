import { useEffect, useState, useRef } from 'react';
import useAuthStore from '../../store/authStore';
import { getPendingRemoteSessions } from '../../api/support';
import { useRemoteSocket } from '../../hooks/useRemoteSocket';
import RemoteConsentModal from '../../pages/support/RemoteConsentModal';
import ScreenShareClient from '../../pages/support/ScreenShareClient';
import toast from 'react-hot-toast';

export default function RemoteSessionNotifier() {
  const { isAuthenticated, user } = useAuthStore();
  const { emit, on } = useRemoteSocket();
  const [pendingSession, setPendingSession] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());
  const showingRef = useRef(false);

  const isExcluded = user?.role === 'super_admin' || user?.role === 'support';

  useEffect(() => {
    if (!isAuthenticated || !user || isExcluded) return;

    const checkPending = async () => {
      try {
        if (showingRef.current || activeSessionId) return;

        const data = await getPendingRemoteSessions();
        if (data.success && data.data.length > 0) {
          const session = data.data.find((s) => !dismissed.has(s.id));
          if (session) {
            showingRef.current = true;
            setPendingSession(session);
          }
        }
      } catch { /* silent */ }
    };

    checkPending();
    const interval = setInterval(checkPending, 8000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, dismissed, activeSessionId]);

  // Si el agente cancela mientras el modal de consentimiento está visible,
  // el cliente se entera al instante (antes dependía del próximo poll a 8s).
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
