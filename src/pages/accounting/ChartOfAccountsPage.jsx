// frontend/src/pages/accounting/ChartOfAccountsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { chartOfAccountsAPI, ACCOUNT_TYPE_LABELS } from '../../api/accounting';
import Layout from '../../components/layout/Layout';
import LibroMayorModal from '../../components/accounting/LibroMayorModal';
import toast from 'react-hot-toast';
import {
  PlusIcon, PencilIcon, TrashIcon, ChevronRightIcon, ChevronDownIcon, BookOpenIcon,
} from '@heroicons/react/24/outline';

const TYPE_COLORS = {
  activo: 'bg-blue-100 text-blue-800',
  pasivo: 'bg-red-100 text-red-800',
  patrimonio: 'bg-purple-100 text-purple-800',
  ingreso: 'bg-green-100 text-green-800',
  gasto: 'bg-orange-100 text-orange-800',
  costo: 'bg-amber-100 text-amber-800',
};

function buildTree(accounts) {
  const byId = {};
  accounts.forEach((a) => (byId[a.id] = { ...a, children: [] }));
  const roots = [];
  accounts.forEach((a) => {
    if (a.parent_id && byId[a.parent_id]) byId[a.parent_id].children.push(byId[a.id]);
    else roots.push(byId[a.id]);
  });
  return roots;
}

const emptyForm = { code: '', name: '', account_type: 'activo', parent_id: '', accepts_entries: true };

const ChartOfAccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [ledgerAccount, setLedgerAccount] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await chartOfAccountsAPI.getAll();
      setAccounts(res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando el plan de cuentas');
    } finally {
      setLoading(false);
    }
  };

  const tree = useMemo(() => buildTree(accounts), [accounts]);

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return accounts.filter((a) => a.code.includes(q) || a.name.toLowerCase().includes(q));
  }, [accounts, search]);

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const openCreate = (parent = null) => {
    setEditing(null);
    setForm({ ...emptyForm, parent_id: parent?.id || '', account_type: parent?.account_type || 'activo' });
    setShowModal(true);
  };

  const openEdit = (account) => {
    setEditing(account);
    setForm({
      code: account.code, name: account.name, account_type: account.account_type,
      parent_id: account.parent_id || '', accepts_entries: account.accepts_entries,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editing) {
        await chartOfAccountsAPI.update(editing.id, { name: form.name, accepts_entries: form.accepts_entries });
        toast.success('Cuenta actualizada');
      } else {
        await chartOfAccountsAPI.create(form);
        toast.success('Cuenta creada');
      }
      setShowModal(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error guardando la cuenta');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (account) => {
    try {
      await chartOfAccountsAPI.update(account.id, { is_active: !account.is_active });
      load();
    } catch (error) {
      toast.error('Error al cambiar el estado de la cuenta');
    }
  };

  const handleDelete = async (account) => {
    if (!window.confirm(`¿Eliminar la cuenta ${account.code} - ${account.name}?`)) return;
    try {
      await chartOfAccountsAPI.delete(account.id);
      toast.success('Cuenta eliminada');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo eliminar la cuenta');
    }
  };

  const renderRow = (account, depth = 0) => {
    const hasChildren = account.children?.length > 0;
    const isOpen = expanded[account.id];
    return (
      <React.Fragment key={account.id}>
        <tr className={`hover:bg-gray-50 ${!account.is_active ? 'opacity-50' : ''}`}>
          <td className="px-4 py-2.5 text-sm">
            <div className="flex items-center gap-1" style={{ paddingLeft: depth * 20 }}>
              {hasChildren ? (
                <button onClick={() => toggle(account.id)} className="text-gray-400 hover:text-gray-700">
                  {isOpen ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
                </button>
              ) : <span className="w-3.5" />}
              <span className="font-mono text-gray-500">{account.code}</span>
            </div>
          </td>
          <td className="px-4 py-2.5 text-sm text-gray-900">{account.name}</td>
          <td className="px-4 py-2.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[account.account_type]}`}>
              {ACCOUNT_TYPE_LABELS[account.account_type]}
            </span>
          </td>
          <td className="px-4 py-2.5 text-sm text-gray-500">{account.accepts_entries ? 'Detalle' : 'Agrupadora'}</td>
          <td className="px-4 py-2.5 text-right">
            <div className="flex items-center justify-end gap-2">
              {account.accepts_entries && (
                <button onClick={() => setLedgerAccount(account)} className="text-gray-400 hover:text-indigo-600" title="Ver Libro Mayor">
                  <BookOpenIcon className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => openCreate(account)} className="text-gray-400 hover:text-indigo-600" title="Agregar subcuenta">
                <PlusIcon className="w-4 h-4" />
              </button>
              <button onClick={() => openEdit(account)} className="text-gray-400 hover:text-indigo-600" title="Editar">
                <PencilIcon className="w-4 h-4" />
              </button>
              <button onClick={() => handleToggleActive(account)} className="text-xs text-gray-500 hover:text-gray-800 underline">
                {account.is_active ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => handleDelete(account)} className="text-gray-400 hover:text-red-600" title="Eliminar">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
        {hasChildren && isOpen && account.children.map((c) => renderRow(c, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Plan de Cuentas</h1>
            <p className="text-sm text-gray-500 mt-1">PUC estándar colombiano — puedes agregar y editar cuentas</p>
          </div>
          <button
            onClick={() => openCreate()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <PlusIcon className="w-4 h-4" /> Nueva Cuenta
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <input
            type="text"
            placeholder="Buscar por código o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Código', 'Nombre', 'Tipo', 'Naturaleza', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>}
                {!loading && filteredAccounts && filteredAccounts.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin resultados</td></tr>
                )}
                {!loading && filteredAccounts && filteredAccounts.map((a) => renderRow(a, 0))}
                {!loading && !filteredAccounts && tree.map((a) => renderRow(a, 0))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <form onSubmit={handleSave}>
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{editing ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Código</label>
                  <input
                    type="text" value={form.code} disabled={!!editing} required
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                  <input
                    type="text" value={form.name} required
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                {!editing && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                    <select
                      value={form.account_type}
                      onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox" id="accepts_entries" checked={form.accepts_entries}
                    onChange={(e) => setForm((f) => ({ ...f, accepts_entries: e.target.checked }))}
                  />
                  <label htmlFor="accepts_entries" className="text-sm text-gray-700">
                    Recibe movimientos directos (cuenta de detalle)
                  </label>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ledgerAccount && <LibroMayorModal account={ledgerAccount} onClose={() => setLedgerAccount(null)} />}
    </Layout>
  );
};

export default ChartOfAccountsPage;
