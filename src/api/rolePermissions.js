import axios from './axios';

/**
 * Roles y permisos de la empresa (backend/src/routes/rolePermissions.routes.js).
 * Distinto de los permisos globales que administra el superadmin.
 */
export const getRolePermissionsMatrix = async () => {
  const response = await axios.get('/role-permissions');
  return response.data;
};

// changes: [{ role, key, allowed }]
export const saveRolePermissions = async (changes) => {
  const response = await axios.put('/role-permissions', { changes });
  return response.data;
};

export const resetRolePermissions = async (role) => {
  const response = await axios.post('/role-permissions/reset', role ? { role } : {});
  return response.data;
};
