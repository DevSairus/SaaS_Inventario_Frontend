// Todo lo de Meta (WhatsApp y formularios de anuncios) vive en
// Configuración → Meta y WhatsApp. Esta ruta queda como aviso y como destino
// del callback OAuth (metaIntegration.controller.js redirige aquí).
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Facebook } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import useAuthStore from '../../store/authStore';

export default function MetaIntegrationSettingsPage() {
  const { search } = useLocation();
  const isAdmin = ['admin', 'super_admin'].includes(useAuthStore((s) => s.user?.role));

  if (new URLSearchParams(search).has('connected')) {
    return <Navigate to={`/settings/whatsapp${search}`} replace />;
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 flex justify-center">
        <div className="w-full sm:[max-width:28rem] bg-white border border-gray-100 rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] p-6 text-center space-y-4">
          <div className="mx-auto w-11 h-11 flex items-center justify-center rounded-xl bg-[#1877F2]">
            <Facebook className="w-5 h-5 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-gray-900">La integración con Meta se movió</h1>
            <p className="text-sm text-gray-500">
              WhatsApp y los formularios de anuncios ahora se configuran juntos en Meta y WhatsApp.
            </p>
          </div>
          {isAdmin ? (
            <Link to="/settings/whatsapp"
              className="inline-flex justify-center w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600 hover:opacity-90 shadow-sm shadow-rose-500/30">
              Ir a Meta y WhatsApp
            </Link>
          ) : (
            <p className="text-xs text-gray-500">Pídele a un administrador que lo configure.</p>
          )}
          <Link to="/support/tickets" className="block text-xs text-gray-500 hover:text-gray-700 hover:underline">
            ¿Necesitas ayuda? Contactar a Pitbox
          </Link>
        </div>
      </div>
    </Layout>
  );
}
