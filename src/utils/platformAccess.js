// Alcance del usuario de plataforma logueado (super_admin / support).
// Mismo criterio que backend/src/middleware/platformScope.js -- acá es solo
// para mostrar/ocultar menús; el backend vuelve a validar cada request.
//   isOwner     -> administra usuarios de plataforma.
//   restricted  -> solo ve sus empresas asignadas y nada global.
// Sesiones previas al rol owner no traen los campos: se tratan como antes
// (sin restricción, no owner) hasta que el layout refresca el perfil.
export function getPlatformAccess(user) {
  const isOwner = user?.role === 'super_admin' && user?.is_owner === true;
  const restricted = !isOwner && user?.all_tenants_access === false;
  return { isOwner, restricted };
}

// Pantalla de inicio de un usuario de plataforma: el rol support solo tiene
// acceso al panel de soporte (no al dashboard de superadmin). null = no es
// usuario de plataforma.
export function getPlatformHome(user) {
  if (user?.role === 'support') return '/superadmin/support/tickets';
  if (user?.role === 'super_admin') return '/superadmin/dashboard';
  return null;
}
