// SessionMonitor deshabilitado - sin cierre de sesión automático por expiración
// import { useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import useAuthStore from '../../store/authStore';
// import toast from 'react-hot-toast';

/**
 * SessionMonitor deshabilitado.
 * El token tiene larga duración (365d) y no hay cierre automático de sesión.
 */
const SessionMonitor = () => {
  // Sin monitoreo de sesión - la sesión nunca se cierra automáticamente
  return null;
};

export default SessionMonitor;