import { useEffect, useState } from 'react';
import { authAPI } from '../api/auth';
import useAuthStore from '../store/authStore';

const ROLES_ADMIN = ['admin', 'super_admin'];

/**
 * Resuelve "quién hace la venta/cotización": por defecto el usuario que
 * inició sesión (su cédula, ver User.cedula) -- ese dato no viaja en la
 * sesión guardada (login solo devuelve id/email/nombre/rol), así que hace
 * falta un fetch a /auth/profile la primera vez que se necesita. Un admin
 * puede además elegir a otra persona (autocomplete) porque suele registrar
 * ventas/cotizaciones en nombre del equipo.
 */
export default function useUsuarioTecnico() {
  const usuarioSesion = useAuthStore((s) => s.user);
  const [documentoPropio, setDocumentoPropio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    authAPI
      .getProfile()
      .then((res) => {
        if (!activo) return;
        // authAPI.getProfile() ya desenvuelve la respuesta de axios --
        // res es { success, data: user } (ver getProfile, auth.controller.js).
        setDocumentoPropio(res.data?.cedula || null);
      })
      .catch(() => {
        if (activo) setDocumentoPropio(null);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => { activo = false; };
  }, []);

  const esAdmin = ROLES_ADMIN.includes(usuarioSesion?.role);

  return { documentoPropio, esAdmin, loading };
}
