// Nombre visible de cada rol (mismo texto que el Sidebar).
export const ROLE_LABELS = {
  super_admin: 'Super Admin', admin: 'Administrador', manager: 'Gerente', accountant: 'Contador',
  seller: 'Vendedor', warehouse_keeper: 'Bodeguero', inventory_lead: 'Líder de inventarios',
  technician: 'Técnico', user: 'Usuario', viewer: 'Visualizador',
};

export const roleLabel = (role) => ROLE_LABELS[role] || role || '';
