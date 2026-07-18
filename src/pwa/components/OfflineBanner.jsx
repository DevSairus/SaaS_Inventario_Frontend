import { useEffect, useState } from 'react';

// Bandera fija de "sin conexión" para la PWA "Taller" instalada.
function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="bg-amber-500 text-white text-xs font-medium text-center py-1.5 px-3">
      Sin conexión — los cambios se guardarán y sincronizarán al recuperar señal
    </div>
  );
}

export default OfflineBanner;
