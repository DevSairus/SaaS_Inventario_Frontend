import { LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { authAPI } from '../../api/auth';

// Barra fija visible mientras un superadmin está "como" un usuario de un
// tenant (soporte/seguimiento) — ver TenantUsers.jsx (inicia) y este mismo
// componente (termina). Se monta a nivel raíz en App.jsx.
function ImpersonationBanner() {
  const { user, isAuthenticated } = useAuthStore();
  const isImpersonating = useAuthStore((s) => s.isImpersonating);

  if (!isAuthenticated || !isImpersonating()) return null;

  const handleExit = async () => {
    try {
      await authAPI.endImpersonation();
    } catch {
      /* best-effort: la auditoría puede fallar sin bloquear la salida */
    }
    const restored = useAuthStore.getState().endImpersonation();
    window.location.href = restored ? '/superadmin/dashboard' : '/login';
  };

  return (
    <div className="sticky top-0 z-[9999] flex items-center justify-center gap-3 bg-amber-500 text-white text-sm font-medium px-4 py-1.5">
      <span>Modo soporte — sesión como {user?.email}</span>
      <button
        onClick={handleExit}
        className="inline-flex items-center gap-1 underline hover:no-underline"
      >
        <LogOut className="w-3.5 h-3.5" />
        Salir
      </button>
    </div>
  );
}

export default ImpersonationBanner;
