// frontend/src/pages/accounting/AccountMappingsPage.jsx
import React, { useState, useEffect } from 'react';
import { accountMappingsAPI, chartOfAccountsAPI } from '../../api/accounting';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';

const EVENT_GROUPS = [
  {
    title: 'Ventas',
    events: [
      { key: 'sale_cash_account', label: 'Cobro en efectivo' },
      { key: 'sale_bank_account', label: 'Cobro por banco/tarjeta' },
      { key: 'sale_receivable', label: 'Venta a crédito (cartera)' },
      { key: 'sale_revenue_product', label: 'Ingreso por venta de mercancía' },
      { key: 'sale_revenue_service', label: 'Ingreso por servicios (taller)' },
      { key: 'sale_tax_iva', label: 'IVA generado en la venta' },
      { key: 'sale_cogs_product', label: 'Costo de mercancía vendida' },
      { key: 'sale_cogs_service', label: 'Costo de servicios (taller)' },
    ],
  },
  {
    title: 'Compras',
    events: [
      { key: 'purchase_inventory', label: 'Ingreso a inventario' },
      { key: 'purchase_payable', label: 'Compra a crédito (proveedores)' },
      { key: 'purchase_cash_account', label: 'Compra de contado' },
      { key: 'purchase_iva_descontable', label: 'IVA descontable de la compra' },
    ],
  },
  {
    title: 'Gastos — pago',
    events: [
      { key: 'expense_payable', label: 'Gasto pendiente de pago' },
      { key: 'expense_cash_account', label: 'Gasto pagado en efectivo' },
      { key: 'expense_bank_account', label: 'Gasto pagado por banco' },
    ],
  },
  {
    title: 'Gastos — por categoría',
    events: [
      { key: 'expense_category:arriendo', label: 'Arriendo' },
      { key: 'expense_category:servicios_publicos', label: 'Servicios Públicos' },
      { key: 'expense_category:nomina', label: 'Nómina' },
      { key: 'expense_category:mantenimiento', label: 'Mantenimiento' },
      { key: 'expense_category:transporte', label: 'Transporte' },
      { key: 'expense_category:impuestos', label: 'Impuestos' },
      { key: 'expense_category:marketing', label: 'Marketing' },
      { key: 'expense_category:insumos_oficina', label: 'Insumos de Oficina' },
      { key: 'expense_category:seguros', label: 'Seguros' },
      { key: 'expense_category:honorarios', label: 'Honorarios' },
      { key: 'expense_category:otro', label: 'Otro' },
    ],
  },
];

const AccountMappingsPage = () => {
  const [mappings, setMappings] = useState({});
  const [customMappings, setCustomMappings] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [historyFor, setHistoryFor] = useState(null); // { key, label } | null
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState({ label: '', category: '', account_id: '' });
  const [creating, setCreating] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [mapRes, accRes] = await Promise.all([accountMappingsAPI.getAll(), chartOfAccountsAPI.getAll()]);
      const map = {};
      (mapRes.data || []).forEach((m) => { map[m.event_type] = m.account_id; });
      setMappings(map);
      setCustomMappings((mapRes.data || []).filter((m) => m.is_custom));
      setAccounts((accRes.data || []).filter((a) => a.accepts_entries));
    } catch (error) {
      toast.error('Error cargando los mapeos contables');
    } finally {
      setLoading(false);
    }
  };

  const slugify = (text) =>
    text.trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newType.label.trim() || !newType.account_id) {
      toast.error('El nombre y la cuenta son obligatorios');
      return;
    }
    const event_type = `custom_${slugify(newType.label)}`;
    try {
      setCreating(true);
      await accountMappingsAPI.create({
        event_type,
        label: newType.label.trim(),
        category: newType.category.trim() || undefined,
        account_id: newType.account_id,
      });
      toast.success('Tipo de asiento agregado');
      setNewType({ label: '', category: '', account_id: '' });
      setShowAddForm(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al agregar el tipo');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (eventType) => {
    if (!window.confirm('¿Eliminar este tipo de asiento personalizado?')) return;
    try {
      setDeletingKey(eventType);
      await accountMappingsAPI.remove(eventType);
      toast.success('Tipo de asiento eliminado');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar el tipo');
    } finally {
      setDeletingKey(null);
    }
  };

  const handleChange = async (eventType, accountId) => {
    setMappings((m) => ({ ...m, [eventType]: accountId }));
    if (!accountId) return;
    try {
      setSavingKey(eventType);
      await accountMappingsAPI.upsert(eventType, accountId);
      toast.success('Mapeo actualizado');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al actualizar el mapeo');
      load();
    } finally {
      setSavingKey(null);
    }
  };

  const openHistory = async (ev) => {
    setHistoryFor(ev);
    setHistoryLoading(true);
    try {
      const res = await accountMappingsAPI.auditHistory(ev.key);
      setHistory(res.data || []);
    } catch (error) {
      toast.error('Error cargando el historial de este mapeo');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Mapeo de Cuentas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define a qué cuenta contable va cada evento del sistema. Los asientos automáticos de ventas, compras y gastos usan esta configuración.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : (
          <div className="space-y-6">
            {EVENT_GROUPS.map((group) => (
              <div key={group.title} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700">{group.title}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {group.events.map((ev) => (
                    <div key={ev.key} className="px-4 py-3 flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-700">{ev.label}</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={mappings[ev.key] || ''}
                          onChange={(e) => handleChange(ev.key, e.target.value)}
                          disabled={savingKey === ev.key}
                          className="w-72 px-2 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                        >
                          <option value="">Sin asignar</option>
                          {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                        <button
                          onClick={() => openHistory(ev)}
                          title="Ver historial de cambios"
                          className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                        >
                          Historial
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Tipos personalizados</h3>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  + Agregar tipo
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {customMappings.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-400 text-center">
                    Aún no hay tipos de asiento personalizados. Agrega uno si necesitas detallar un evento contable que no está en las listas de arriba.
                  </div>
                ) : (
                  customMappings.map((m) => (
                    <div key={m.event_type} className="px-4 py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm text-gray-700">{m.label || m.event_type}</div>
                        <div className="text-xs text-gray-400">{m.category || 'Personalizado'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={mappings[m.event_type] || ''}
                          onChange={(e) => handleChange(m.event_type, e.target.value)}
                          disabled={savingKey === m.event_type}
                          className="w-72 px-2 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                        >
                          <option value="">Sin asignar</option>
                          {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                        <button
                          onClick={() => openHistory({ key: m.event_type, label: m.label || m.event_type })}
                          title="Ver historial de cambios"
                          className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                        >
                          Historial
                        </button>
                        <button
                          onClick={() => handleDelete(m.event_type)}
                          disabled={deletingKey === m.event_type}
                          title="Eliminar este tipo"
                          className="text-xs px-2 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <form onSubmit={handleCreate}>
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">Agregar tipo de asiento</h2>
                  <button type="button" onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">Cerrar</button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={newType.label}
                      onChange={(e) => setNewType((s) => ({ ...s, label: e.target.value }))}
                      placeholder="Ej: Comisiones por venta de repuestos"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Categoría (opcional)</label>
                    <input
                      type="text"
                      value={newType.category}
                      onChange={(e) => setNewType((s) => ({ ...s, category: e.target.value }))}
                      placeholder="Ej: Comisiones"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Cuenta contable *</label>
                    <select
                      value={newType.account_id}
                      onChange={(e) => setNewType((s) => ({ ...s, account_id: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Selecciona una cuenta</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {creating ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {historyFor && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Historial — {historyFor.label}</h2>
                <button onClick={() => { setHistoryFor(null); setHistory([]); }} className="text-gray-400 hover:text-gray-600 text-sm">Cerrar</button>
              </div>
              <div className="overflow-y-auto p-5">
                {historyLoading ? (
                  <div className="text-center text-gray-400 py-8">Cargando…</div>
                ) : history.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">Sin cambios registrados todavía para este evento.</div>
                ) : (
                  <ul className="space-y-3">
                    {history.map((h) => (
                      <li key={h.id} className="border-l-2 border-indigo-200 pl-3">
                        <div className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString('es-CO')}</div>
                        <div className="text-sm text-gray-700">
                          {h.previous_account ? (
                            <>
                              <span className="text-gray-500">{h.previous_account.code} - {h.previous_account.name}</span>
                              <span className="mx-1.5 text-gray-300">→</span>
                              <span className="font-medium">{h.new_account.code} - {h.new_account.name}</span>
                            </>
                          ) : (
                            <>Configuración inicial: <span className="font-medium">{h.new_account.code} - {h.new_account.name}</span></>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {h.changed_by_user ? `${h.changed_by_user.first_name || ''} ${h.changed_by_user.last_name || ''}`.trim() || h.changed_by_user.email : 'Usuario desconocido'}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AccountMappingsPage;
