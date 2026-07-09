import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function NoBranchAssignedPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h18M5 21V6a1 1 0 011-1h5a1 1 0 011 1v15M14 21V10a1 1 0 011-1h4a1 1 0 011 1v11M8 8h.01M8 11h.01M8 14h.01M8 17h.01" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Sin sede asignada</h1>
        <p className="text-sm text-gray-500 mb-1">
          Hola{user?.first_name ? `, ${user.first_name}` : ''}. Tu usuario todavía no tiene
          ninguna sede (sucursal) asignada.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Contacta a un administrador de tu empresa para que te asigne una sede desde
          la sección de administración de sedes. Una vez asignada, podrás ingresar con normalidad.
        </p>
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
