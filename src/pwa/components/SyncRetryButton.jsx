import { flush, retryErrors } from '../offlineQueue/syncManager';

// Fuerza un intento de sincronización manual (además del automático por
// online/visibilitychange/polling en syncManager.js).
function SyncRetryButton({ className = '' }) {
  const handleClick = async () => {
    await retryErrors();
    await flush();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`text-xs font-medium text-primary-600 underline whitespace-nowrap ${className}`}
    >
      Reintentar
    </button>
  );
}

export default SyncRetryButton;
