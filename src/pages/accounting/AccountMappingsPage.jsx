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
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [mapRes, accRes] = await Promise.all([accountMappingsAPI.getAll(), chartOfAccountsAPI.getAll()]);
      const map = {};
      (mapRes.data || []).forEach((m) => { map[m.event_type] = m.account_id; });
      setMappings(map);
      setAccounts((accRes.data || []).filter((a) => a.accepts_entries));
    } catch (error) {
      toast.error('Error cargando los mapeos contables');
    } finally {
      setLoading(false);
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
                      <select
                        value={mappings[ev.key] || ''}
                        onChange={(e) => handleChange(ev.key, e.target.value)}
                        disabled={savingKey === ev.key}
                        className="w-72 px-2 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                      >
                        <option value="">Sin asignar</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AccountMappingsPage;
