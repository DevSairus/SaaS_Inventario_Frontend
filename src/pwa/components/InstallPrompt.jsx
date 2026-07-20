import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Share, X } from 'lucide-react';
import { useWorkshopPwaEligible } from '../useWorkshopPwaEligible';
import { isRunningAsInstalledPwa } from '../pwaEnv';

const DISMISS_KEY = 'workshop-install-dismissed';

function isIosSafari() {
  const ua = navigator.userAgent || '';
  const isIos = /iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua));
  return isIos;
}

// Aviso propio de "Instalar app", visible dentro de la UI en vez de depender
// de que el usuario encuentre la opción en el menú del navegador.
// - Chrome/Edge/Samsung Internet (Chromium): captura `beforeinstallprompt`
//   y ofrece un botón que dispara el prompt nativo directamente.
// - Safari/iOS: ese evento NO existe ahí — se muestran instrucciones
//   manuales (Compartir → Agregar a inicio), es la única vía posible.
// - Firefox para Android tampoco dispara `beforeinstallprompt` (soporte
//   incompleto de instalación de PWA) — en ese caso no se muestra nada,
//   ya que no hay una acción real que ofrecer.
function InstallPrompt() {
  const eligible = useWorkshopPwaEligible();
  const location = useLocation();
  const onWorkshopPage = location.pathname.startsWith('/workshop/');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === '1'
  );

  useEffect(() => {
    if (!eligible) return;
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [eligible]);

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, '1');
  };

  if (!eligible || !onWorkshopPage || dismissed || isRunningAsInstalledPwa()) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (deferredPrompt) {
    return (
      <div className="fixed bottom-20 inset-x-4 z-50 bg-gray-900 text-white rounded-xl shadow-lg p-3 flex items-center gap-3">
        <span className="flex-1 text-sm">Instala la app de Taller en este dispositivo</span>
        <button onClick={handleInstall} className="flex items-center gap-1.5 bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap">
          <Download className="w-4 h-4" /> Instalar
        </button>
        <button onClick={dismiss} aria-label="Cerrar" className="text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (isIosSafari()) {
    return (
      <div className="fixed bottom-20 inset-x-4 z-50 bg-gray-900 text-white rounded-xl shadow-lg p-3 flex items-center gap-3">
        <Share className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-sm">Para instalar: toca Compartir y elige "Agregar a inicio"</span>
        <button onClick={dismiss} aria-label="Cerrar" className="text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}

export default InstallPrompt;
