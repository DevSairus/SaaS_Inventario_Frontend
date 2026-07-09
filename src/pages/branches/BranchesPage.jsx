import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { branchesService } from '../../api/branches';
import { usersAPI } from '../../api/users';
import useBranchStore from '../../store/branchStore';
import toast from 'react-hot-toast';

const emptyForm = {
  code: '',
  name: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  is_main: false,
  create_warehouse: true,
  warehouse_code: '',
  warehouse_name: '',
};

const BranchesPage = () => {
  const { fetchBranches: refreshBranchStore } = useBranchStore();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState(null);

  // Modal de asignación de usuarios
  const [usersModalBranch, setUsersModalBranch] = useState(null);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await branchesService.getAll();
      setBranches(response.data || []);
    } catch (e) {
      toast.error('Error al cargar sedes: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const openCreate = () => {
    setEditingBranch(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      code: branch.code || '',
      name: branch.name || '',
      address: branch.address || '',
      city: branch.city || '',
      phone: branch.phone || '',
      email: branch.email || '',
      is_main: branch.is_main || false,
      create_warehouse: false,
      warehouse_code: '',
      warehouse_name: '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) return;
    setSaving(true);
    try {
      if (editingBranch) {
        await branchesService.update(editingBranch.id, {
          code: formData.code,
          name: formData.name,
          address: formData.address,
          city: formData.city,
          phone: formData.phone,
          email: formData.email,
          is_main: formData.is_main,
        });
        toast.success('Sede actualizada');
      } else {
        await branchesService.create(formData);
        toast.success('Sede creada exitosamente');
      }
      setShowModal(false);
      await fetchBranches();
      await refreshBranchStore();
    } catch (e) {
      toast.error('Error: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await branchesService.deactivate(id);
      toast.success('Sede desactivada');
      setDeactivateConfirm(null);
      await fetchBranches();
      await refreshBranchStore();
    } catch (e) {
      toast.error('Error: ' + (e.response?.data?.message || e.message));
      setDeactivateConfirm(null);
    }
  };

  // ── Asignación de usuarios ──────────────────────────────────────────
  const openUsersModal = async (branch) => {
    setUsersModalBranch(branch);
    setSelectedUserId('');
    setLoadingUsers(true);
    try {
      const [assignedRes, usersRes] = await Promise.all([
        branchesService.listUsers(branch.id),
        usersAPI.getAll({ limit: 200 }),
      ]);
      setAssignedUsers(assignedRes.data || []);
      setTenantUsers(usersRes.data?.users || []);
    } catch (e) {
      toast.error('Error al cargar usuarios de la sede');
    } finally {
      setLoadingUsers(false);
    }
  };

  const closeUsersModal = () => {
    setUsersModalBranch(null);
    setAssignedUsers([]);
    setTenantUsers([]);
  };

  const refreshAssignedUsers = async () => {
    if (!usersModalBranch) return;
    const assignedRes = await branchesService.listUsers(usersModalBranch.id);
    setAssignedUsers(assignedRes.data || []);
  };

  const handleAssignUser = async () => {
    if (!selectedUserId || !usersModalBranch) return;
    setAssigning(true);
    try {
      await branchesService.assignUser(usersModalBranch.id, selectedUserId, false);
      toast.success('Usuario asignado a la sede');
      setSelectedUserId('');
      await refreshAssignedUsers();
    } catch (e) {
      toast.error('Error: ' + (e.response?.data?.message || e.message));
    } finally {
      setAssigning(false);
    }
  };

  const handleSetDefault = async (userId) => {
    if (!usersModalBranch) return;
    try {
      await branchesService.assignUser(usersModalBranch.id, userId, true);
      toast.success('Sede por defecto actualizada');
      await refreshAssignedUsers();
    } catch (e) {
      toast.error('Error: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!usersModalBranch) return;
    try {
      await branchesService.removeUser(usersModalBranch.id, userId);
      toast.success('Usuario removido de la sede');
      await refreshAssignedUsers();
    } catch (e) {
      toast.error('Error: ' + (e.response?.data?.message || e.message));
    }
  };

  const assignedUserIds = new Set(assignedUsers.map(a => a.user_id));
  const availableUsersToAssign = tenantUsers.filter(u => !assignedUserIds.has(u.id));

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.code.toLowerCase().includes(search.toLowerCase()) ||
    (b.city || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sedes</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestión de sucursales, bodegas y usuarios por sede</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Sede
          </button>
        </div>

        {/* Búsqueda */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre, código o ciudad..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              />
            </div>
            <span className="text-sm text-gray-500">{filtered.length} sede{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M5 21V6a1 1 0 011-1h5a1 1 0 011 1v15M14 21V10a1 1 0 011-1h4a1 1 0 011 1v11" />
              </svg>
              <p className="text-gray-500 font-medium">No hay sedes{search ? ' que coincidan' : ''}</p>
              {!search && <p className="text-gray-400 text-sm mt-1">Crea la primera sede usando el botón de arriba</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ciudad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bodega</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-semibold text-pink-700 bg-pink-50 px-2 py-1 rounded">{b.code}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{b.name}</span>
                          {b.is_main && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Principal</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{b.city || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {b.warehouse ? `${b.warehouse.name} (${b.warehouse.code})` : (
                          <span className="text-amber-600 text-xs font-medium">Sin bodega asociada</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                          {b.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openUsersModal(b)}
                            title="Gestionar usuarios"
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEdit(b)}
                            title="Editar"
                            className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {b.is_active && !b.is_main && (
                            <button
                              onClick={() => setDeactivateConfirm(b.id)}
                              title="Desactivar"
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingBranch ? 'Editar Sede' : 'Nueva Sede'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Sede Norte"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="Ej: NORTE"
                    disabled={!!editingBranch}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Dirección completa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Ciudad"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Teléfono"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="sede@empresa.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_main: !prev.is_main }))}
                  className={`relative w-10 h-6 rounded-full transition-colors ${formData.is_main ? 'bg-pink-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.is_main ? 'translate-x-4' : ''}`}></span>
                </button>
                <span className="text-sm text-gray-700">Sede principal</span>
              </div>

              {!editingBranch && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, create_warehouse: !prev.create_warehouse }))}
                      className={`relative w-10 h-6 rounded-full transition-colors ${formData.create_warehouse ? 'bg-pink-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.create_warehouse ? 'translate-x-4' : ''}`}></span>
                    </button>
                    <span className="text-sm text-gray-700">Crear bodega automáticamente para esta sede</span>
                  </div>

                  {formData.create_warehouse && (
                    <div className="grid grid-cols-2 gap-4 pl-1">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Código bodega (opcional)</label>
                        <input
                          type="text"
                          value={formData.warehouse_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, warehouse_code: e.target.value.toUpperCase() }))}
                          placeholder={`BOD-${formData.code || '...'}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nombre bodega (opcional)</label>
                        <input
                          type="text"
                          value={formData.warehouse_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, warehouse_name: e.target.value }))}
                          placeholder={`Bodega ${formData.name || '...'}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.code}
                className="px-5 py-2 text-sm font-medium text-white bg-pink-600 rounded-lg hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Guardando...' : editingBranch ? 'Guardar cambios' : 'Crear sede'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación desactivar */}
      {deactivateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376a12 12 0 1021.593 0A12 12 0 002.697 16.126zM12 15.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Desactivar sede</h3>
                <p className="text-sm text-gray-500">Podrás reactivarla después editándola</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Los usuarios asignados a esta sede perderán acceso a ella. El historial de ventas
              y compras se conserva intacto.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeactivateConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeactivate(deactivateConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de asignación de usuarios */}
      {usersModalBranch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Usuarios de {usersModalBranch.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Solo los usuarios asignados podrán operar en esta sede</p>
              </div>
              <button onClick={closeUsersModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 border-b shrink-0 flex gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Selecciona un usuario para asignar...</option>
                {availableUsersToAssign.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name} — {u.email}</option>
                ))}
              </select>
              <button
                onClick={handleAssignUser}
                disabled={!selectedUserId || assigning}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                Asignar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
                </div>
              ) : assignedUsers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Ningún usuario asignado todavía</p>
              ) : (
                <div className="space-y-2">
                  {assignedUsers.map(a => (
                    <div key={a.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.user?.first_name} {a.user?.last_name}</p>
                        <p className="text-xs text-gray-500">{a.user?.email} · <span className="capitalize">{a.user?.role}</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.is_default ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">Por defecto</span>
                        ) : (
                          <button
                            onClick={() => handleSetDefault(a.user_id)}
                            className="text-xs px-2 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            Hacer por defecto
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveUser(a.user_id)}
                          title="Quitar de la sede"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t shrink-0 flex justify-end">
              <button
                onClick={closeUsersModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BranchesPage;
