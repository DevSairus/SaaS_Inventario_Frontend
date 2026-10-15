// Usuarios de plataforma (super_admin / support) -- solo el owner.
// Ver backend/src/routes/superadmin/platformUsers.routes.js.
import React, { useEffect, useMemo, useState } from 'react';
import { Crown, UserPlus, Pencil, Key, Power, Building2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '../../api/superadmin';
import useAuthStore from '../../store/authStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'super_admin',
  is_owner: false,
  all_tenants_access: true,
  tenant_ids: [],
};

const errorMessage = (err, fallback) => err.response?.data?.error || err.response?.data?.message || fallback;

const PlatformUsers = () => {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, user: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [tenantSearch, setTenantSearch] = useState('');
  const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null, password: '' });

  const tenantName = useMemo(
    () => Object.fromEntries(tenants.map((t) => [t.id, t.company_name || t.business_name])),
    [tenants]
  );

  const load = async () => {
    try {
      const [u, t] = await Promise.all([superAdminAPI.getPlatformUsers(), superAdminAPI.getPlatformTenantOptions()]);
      setUsers(u.users || []);
      setTenants(t.tenants || []);
    } catch (err) {
      toast.error(errorMessage(err, 'Error al cargar los usuarios de plataforma'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setTenantSearch('');
    setModal({ open: true, user: null });
  };

  const openEdit = (user) => {
    setForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: '',
      role: user.role,
      is_owner: user.is_owner,
      all_tenants_access: user.all_tenants_access,
      tenant_ids: user.tenant_ids || [],
    });
    setTenantSearch('');
    setModal({ open: true, user });
  };

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const toggleTenant = (id) => {
    setForm((f) => ({
      ...f,
      tenant_ids: f.tenant_ids.includes(id) ? f.tenant_ids.filter((x) => x !== id) : [...f.tenant_ids, id],
    }));
  };

  const isOwnerForm = form.role === 'super_admin' && form.is_owner;
  const restrictedForm = !isOwnerForm && !form.all_tenants_access;

  const handleSave = async (e) => {
    e.preventDefault();
    if (restrictedForm && form.tenant_ids.length === 0) {
      toast.error('Selecciona al menos una empresa o activa el acceso a todas');
      return;
    }
    const payload = { ...form, is_owner: isOwnerForm };
    if (modal.user) delete payload.password;
    setSaving(true);
    try {
      if (modal.user) {
        await superAdminAPI.updatePlatformUser(modal.user.id, payload);
        toast.success('Usuario actualizado');
      } else {
        await superAdminAPI.createPlatformUser(payload);
        toast.success('Usuario creado');
      }
      setModal({ open: false, user: null });
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Error al guardar el usuario'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (user) => {
    try {
      await superAdminAPI.togglePlatformUserStatus(user.id);
      toast.success(user.is_active ? 'Usuario desactivado' : 'Usuario activado');
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Error al cambiar el estado'));
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await superAdminAPI.resetPlatformUserPassword(passwordDialog.user.id, passwordDialog.password);
      toast.success('Contraseña actualizada');
      setPasswordDialog({ open: false, user: null, password: '' });
    } catch (err) {
      toast.error(errorMessage(err, 'Error al cambiar la contraseña'));
    } finally {
      setSaving(false);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const q = tenantSearch.trim().toLowerCase();
    return !q || `${t.company_name || ''} ${t.business_name || ''}`.toLowerCase().includes(q);
  });

  if (loading) return <Loading fullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" /> Usuarios de plataforma
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Superadmins y soporte, y las empresas que puede ver cada uno.
          </p>
        </div>
        <Button icon={UserPlus} onClick={openCreate}>Nuevo usuario</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Empresas visibles</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {users.map((u) => {
                const isMe = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="text-sm">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {u.first_name} {u.last_name} {isMe && <span className="text-xs text-gray-400">(tú)</span>}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_owner ? (
                        <Badge color="yellow" size="sm"><Crown className="w-3 h-3 mr-1" />Owner</Badge>
                      ) : (
                        <Badge color={u.role === 'support' ? 'blue' : 'purple'} size="sm">
                          {u.role === 'support' ? 'Soporte' : 'Super Admin'}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {u.all_tenants_access ? (
                        <span>Todas</span>
                      ) : u.tenant_ids.length === 0 ? (
                        <span className="text-red-600 dark:text-red-400">Ninguna</span>
                      ) : (
                        <span title={u.tenant_ids.map((id) => tenantName[id] || id).join('\n')}>
                          {u.tenant_ids.length === 1 ? tenantName[u.tenant_ids[0]] || '1 empresa' : `${u.tenant_ids.length} empresas`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={u.is_active ? 'green' : 'gray'} size="sm">{u.is_active ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(u)} title="Editar" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setPasswordDialog({ open: true, user: u, password: '' })} title="Cambiar contraseña" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">
                          <Key className="w-4 h-4" />
                        </button>
                        {!isMe && (
                          <button onClick={() => handleToggle(u)} title={u.is_active ? 'Desactivar' : 'Activar'} className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 ${u.is_active ? 'text-red-500' : 'text-green-600'}`}>
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, user: null })}
        title={modal.user ? 'Editar usuario de plataforma' : 'Nuevo usuario de plataforma'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre *</label>
              <input className="input" value={form.first_name} onChange={set('first_name')} required />
            </div>
            <div>
              <label className="label">Apellido *</label>
              <input className="input" value={form.last_name} onChange={set('last_name')} required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" value={form.email} onChange={set('email')} required />
            </div>
            {!modal.user && (
              <div>
                <label className="label">Contraseña *</label>
                <input type="password" className="input" value={form.password} onChange={set('password')} minLength={8} required />
              </div>
            )}
            <div>
              <label className="label">Rol</label>
              <select className="input" value={form.role} onChange={set('role')}>
                <option value="super_admin">Super Admin</option>
                <option value="support">Soporte</option>
              </select>
            </div>
          </div>

          {form.role === 'super_admin' && (
            <label className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10">
              <input type="checkbox" className="mt-1" checked={form.is_owner} onChange={set('is_owner')} />
              <span>
                <span className="font-medium text-gray-900 dark:text-gray-100">Owner</span>
                <span className="block text-sm text-gray-600 dark:text-gray-400">
                  Ve todas las empresas y administra a los usuarios de plataforma.
                </span>
              </span>
            </label>
          )}

          {!isOwnerForm && (
            <div className="space-y-3">
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" checked={form.all_tenants_access} onChange={set('all_tenants_access')} />
                <span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Acceso a todas las empresas</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">
                    Si lo desactivas, conserva todas las funciones (planes, integraciones, permisos...)
                    pero solo ve y opera las empresas seleccionadas. Las empresas que cree se le asignan solas.
                  </span>
                </span>
              </label>

              {restrictedForm && (
                <div className="border rounded-lg dark:border-white/10">
                  <div className="flex items-center gap-2 p-2 border-b dark:border-white/10">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      className="flex-1 bg-transparent text-sm outline-none"
                      placeholder="Buscar empresa..."
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                    />
                    <span className="text-xs text-gray-500">{form.tenant_ids.length} seleccionada(s)</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                    {filteredTenants.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-white/5 text-sm cursor-pointer">
                        <input type="checkbox" checked={form.tenant_ids.includes(t.id)} onChange={() => toggleTenant(t.id)} />
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-800 dark:text-gray-200">{t.company_name || t.business_name}</span>
                        {!t.is_active && <Badge color="gray" size="sm">Inactiva</Badge>}
                      </label>
                    ))}
                    {filteredTenants.length === 0 && <p className="text-sm text-gray-500 px-2 py-1">Sin resultados</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal({ open: false, user: null })}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={passwordDialog.open}
        onClose={() => setPasswordDialog({ open: false, user: null, password: '' })}
        title="Cambiar contraseña"
        size="sm"
      >
        <form onSubmit={handlePassword} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{passwordDialog.user?.email}</p>
          <input
            type="password"
            className="input"
            placeholder="Nueva contraseña (mínimo 8 caracteres)"
            minLength={8}
            required
            value={passwordDialog.password}
            onChange={(e) => setPasswordDialog((d) => ({ ...d, password: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPasswordDialog({ open: false, user: null, password: '' })}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PlatformUsers;
