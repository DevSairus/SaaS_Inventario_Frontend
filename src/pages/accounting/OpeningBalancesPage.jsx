// frontend/src/pages/accounting/OpeningBalancesPage.jsx
// Carga de saldos iniciales al arrancar con Pitbox: cartera, cuentas por
// pagar, caja/bancos (cuentas contables) e inventario. Cada carga genera su
// propio asiento balanceado contra la "cuenta puente" (opening_balance_suspense),
// que se cierra al final trasladando el neto a la cuenta de patrimonio elegida.
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { openingBalancesAPI, chartOfAccountsAPI } from '../../api/accounting';
import customersApi from '../../api/customers';
import { suppliersAPI } from '../../api/suppliers';
import { productsAPI } from '../../api/products';
import {
  downloadOpeningReceivableTemplate,
  validateImportedOpeningReceivableRows,
  downloadOpeningPayableTemplate,
  validateImportedOpeningPayableRows,
} from '../../utils/excelExport';
import ImportOpeningBalanceRowsModal from '../../components/accounting/ImportOpeningBalanceRowsModal';
import ImportOpeningInventoryModal from '../../components/accounting/ImportOpeningInventoryModal';
import Layout from '../../components/layout/Layout';

const TABS = [
  { key: 'receivable', label: 'Cartera' },
  { key: 'payable', label: 'Cuentas por Pagar' },
  { key: 'account', label: 'Caja / Bancos' },
  { key: 'inventory', label: 'Inventario' },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0);

// Lista simple de saldos ya cargados (cartera/CxP), con acción de anular —
// compartida entre las pestañas Cartera y CxP.
const BalancesList = ({ rows, loading, onVoid, nameKey }) => {
  if (loading) return <div className="text-center py-6 text-gray-400 text-sm">Cargando...</div>;
  if (!rows || rows.length === 0) return <div className="text-center py-6 text-gray-400 text-sm">Sin saldos iniciales cargados todavía</div>;
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg mt-4">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Nombre', 'Referencia', 'Fecha', 'Monto', 'Pagado', 'Estado', ''].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 text-gray-700">{r[nameKey] ? `${r[nameKey].first_name || ''} ${r[nameKey].last_name || r[nameKey].name || ''}`.trim() : '—'}</td>
              <td className="px-3 py-2 text-gray-600">{r.reference || '—'}</td>
              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.issue_date}</td>
              <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{formatCurrency(r.total_amount)}</td>
              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatCurrency(r.paid_amount)}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'voided' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>
                  {r.status === 'voided' ? 'Anulado' : 'Activo'}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                {r.status !== 'voided' && (
                  <button onClick={() => onVoid(r)} className="text-xs font-medium text-red-600 hover:text-red-800">Anular</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const OpeningBalancesPage = () => {
  const [activeTab, setActiveTab] = useState('receivable');

  const [bridgeStatus, setBridgeStatus] = useState(null);
  const [loadingBridge, setLoadingBridge] = useState(true);
  const [showCloseBridge, setShowCloseBridge] = useState(false);
  const [equityAccounts, setEquityAccounts] = useState([]);
  const [closeBridgeTarget, setCloseBridgeTarget] = useState('');
  const [closingBridge, setClosingBridge] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [receivableRows, setReceivableRows] = useState([]);
  const [payableRows, setPayableRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const [showReceivableModal, setShowReceivableModal] = useState(false);
  const [showPayableModal, setShowPayableModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  // Formulario de Caja/Bancos (cuenta contable genérica, sin Excel)
  const [accounts, setAccounts] = useState([]);
  const [accountForm, setAccountForm] = useState({ account_id: '', amount: '', side: 'debit', entry_date: new Date().toISOString().slice(0, 10), description: '' });
  const [savingAccount, setSavingAccount] = useState(false);

  const loadBridgeStatus = useCallback(async () => {
    try {
      setLoadingBridge(true);
      const res = await openingBalancesAPI.getBridgeStatus();
      setBridgeStatus(res.data);
    } catch (error) {
      toast.error('Error consultando el estado de la cuenta puente');
    } finally {
      setLoadingBridge(false);
    }
  }, []);

  const loadRows = useCallback(async (type) => {
    try {
      setLoadingRows(true);
      const res = await openingBalancesAPI.list({ type });
      if (type === 'receivable') setReceivableRows(res.data || []);
      else setPayableRows(res.data || []);
    } catch (error) {
      toast.error('Error cargando los saldos iniciales');
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => { loadBridgeStatus(); }, [loadBridgeStatus]);

  useEffect(() => {
    if (activeTab === 'receivable' && customers.length === 0) {
      customersApi.getAll({ limit: 1000 }).then((res) => setCustomers(res.data?.data || res.data?.customers || res.data || [])).catch(() => {});
      loadRows('receivable');
    }
    if (activeTab === 'payable' && suppliers.length === 0) {
      suppliersAPI.getAll({ limit: 1000 }).then((res) => setSuppliers(res.data || [])).catch(() => {});
      loadRows('payable');
    }
    if (activeTab === 'inventory' && products.length === 0) {
      productsAPI.getAll({ limit: 1000 }).then((res) => setProducts(res.data || [])).catch(() => {});
    }
    if (activeTab === 'account' && accounts.length === 0) {
      chartOfAccountsAPI.getAll().then((res) => setAccounts((res.data || []).filter((a) => a.accepts_entries))).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const openCloseBridge = async () => {
    if (equityAccounts.length === 0) {
      try {
        const res = await chartOfAccountsAPI.getAll();
        setEquityAccounts((res.data || []).filter((a) => a.accepts_entries && a.account_type === 'patrimonio'));
      } catch (error) {
        toast.error('Error cargando las cuentas de patrimonio');
        return;
      }
    }
    setShowCloseBridge(true);
  };

  const handleCloseBridge = async () => {
    if (!closeBridgeTarget) {
      toast.error('Selecciona la cuenta de patrimonio destino');
      return;
    }
    try {
      setClosingBridge(true);
      await openingBalancesAPI.closeBridge({ target_account_id: closeBridgeTarget });
      toast.success('Cuenta puente cerrada');
      setShowCloseBridge(false);
      setCloseBridgeTarget('');
      loadBridgeStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cerrando la cuenta puente');
    } finally {
      setClosingBridge(false);
    }
  };

  const handleVoid = async (row) => {
    const reason = window.prompt('Motivo de la anulación (opcional):') || '';
    try {
      await openingBalancesAPI.voidOpeningBalance(row.id, reason);
      toast.success('Saldo inicial anulado');
      loadRows(row.type);
      loadBridgeStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error anulando el saldo inicial');
    }
  };

  const handleSaveAccount = async () => {
    const amount = parseFloat(accountForm.amount);
    if (!accountForm.account_id) return toast.error('Selecciona una cuenta contable');
    if (!(amount > 0)) return toast.error('El monto debe ser mayor a 0');
    try {
      setSavingAccount(true);
      await openingBalancesAPI.createAccount({
        account_id: accountForm.account_id,
        amount,
        side: accountForm.side,
        entry_date: accountForm.entry_date,
        description: accountForm.description || null,
      });
      toast.success('Saldo inicial de cuenta cargado');
      setAccountForm({ account_id: '', amount: '', side: 'debit', entry_date: new Date().toISOString().slice(0, 10), description: '' });
      loadBridgeStatus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando el saldo inicial');
    } finally {
      setSavingAccount(false);
    }
  };

  const bridgeBalanced = bridgeStatus && Math.abs(bridgeStatus.balance) < 0.01;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Saldos Iniciales</h1>
          <p className="text-sm text-gray-500 mt-1">
            Carga la deuda de clientes/proveedores, saldos de caja/bancos e inventario existentes antes de empezar a usar Pitbox
          </p>
        </div>

        {/* Estado de la cuenta puente */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {loadingBridge ? (
            <div className="text-sm text-gray-400">Consultando estado...</div>
          ) : bridgeStatus ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Cuenta puente de saldos iniciales</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Débitos: {formatCurrency(bridgeStatus.total_debit)} · Créditos: {formatCurrency(bridgeStatus.total_credit)}
                </p>
                <p className={`text-sm mt-1 font-medium ${bridgeBalanced ? 'text-green-700' : 'text-amber-700'}`}>
                  {bridgeBalanced ? 'Balanceada (nada pendiente de cerrar)' : `Saldo pendiente: ${formatCurrency(bridgeStatus.balance)}`}
                </p>
              </div>
              {!bridgeBalanced && (
                <button onClick={openCloseBridge} className="px-4 py-2 text-sm font-medium text-white bg-purple-700 rounded-lg hover:bg-purple-800">
                  Cerrar cuenta puente
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* Pestañas */}
        <div className="border-b border-gray-200 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'receivable' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Deuda de clientes previa a Pitbox — se empareja por NIT/Cédula.</p>
              <button onClick={() => setShowReceivableModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Importar Saldos
              </button>
            </div>
            <BalancesList rows={receivableRows} loading={loadingRows} onVoid={handleVoid} nameKey="customer" />
          </div>
        )}

        {activeTab === 'payable' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Deuda con proveedores previa a Pitbox — se empareja por NIT.</p>
              <button onClick={() => setShowPayableModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Importar Saldos
              </button>
            </div>
            <BalancesList rows={payableRows} loading={loadingRows} onVoid={handleVoid} nameKey="supplier" />
          </div>
        )}

        {activeTab === 'account' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-lg space-y-3">
            <p className="text-sm text-gray-600 mb-2">
              Saldo inicial de una cuenta contable (caja, bancos, activos fijos, patrimonio existente, etc.) — una a la vez.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta contable</label>
              <select
                value={accountForm.account_id}
                onChange={(e) => setAccountForm((f) => ({ ...f, account_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Selecciona una cuenta...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <input
                  type="number" min="0" step="0.01"
                  value={accountForm.amount}
                  onChange={(e) => setAccountForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lado</label>
                <select
                  value={accountForm.side}
                  onChange={(e) => setAccountForm((f) => ({ ...f, side: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="debit">Saldo deudor (ej: caja, bancos, activos)</option>
                  <option value="credit">Saldo acreedor (ej: pasivo existente)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={accountForm.entry_date}
                onChange={(e) => setAccountForm((f) => ({ ...f, entry_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
              <input
                type="text"
                value={accountForm.description}
                onChange={(e) => setAccountForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <button
              onClick={handleSaveAccount}
              disabled={savingAccount}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {savingAccount ? 'Guardando...' : 'Cargar saldo inicial'}
            </button>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Existencias físicas previas a Pitbox, con su costo — se empareja por SKU.</p>
              <button onClick={() => setShowInventoryModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Importar Inventario
              </button>
            </div>
          </div>
        )}

        {/* Modales de importación */}
        <ImportOpeningBalanceRowsModal
          isOpen={showReceivableModal}
          onClose={() => setShowReceivableModal(false)}
          title="Saldos Iniciales de Cartera"
          downloadTemplate={downloadOpeningReceivableTemplate}
          validate={(data) => validateImportedOpeningReceivableRows(data, customers)}
          createFn={openingBalancesAPI.createReceivable}
          buildPayload={(row) => row}
          rowLabel={(row) => row.reference || row.customer_id}
          onImported={() => { loadRows('receivable'); loadBridgeStatus(); }}
        />
        <ImportOpeningBalanceRowsModal
          isOpen={showPayableModal}
          onClose={() => setShowPayableModal(false)}
          title="Saldos Iniciales de Cuentas por Pagar"
          downloadTemplate={downloadOpeningPayableTemplate}
          validate={(data) => validateImportedOpeningPayableRows(data, suppliers)}
          createFn={openingBalancesAPI.createPayable}
          buildPayload={(row) => row}
          rowLabel={(row) => row.reference || row.supplier_id}
          onImported={() => { loadRows('payable'); loadBridgeStatus(); }}
        />
        <ImportOpeningInventoryModal
          isOpen={showInventoryModal}
          onClose={() => setShowInventoryModal(false)}
          products={products}
          onImported={() => loadBridgeStatus()}
        />

        {/* Modal: cerrar cuenta puente */}
        {showCloseBridge && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Cerrar cuenta puente</h3>
              <p className="text-xs text-gray-500 mb-4">
                Traslada el saldo neto ({bridgeStatus ? formatCurrency(bridgeStatus.balance) : ''}) a la cuenta de patrimonio que elijas.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta de patrimonio destino</label>
              <select
                value={closeBridgeTarget}
                onChange={(e) => setCloseBridgeTarget(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4"
              >
                <option value="">Selecciona una cuenta...</option>
                {equityAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCloseBridge(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                  Cancelar
                </button>
                <button
                  onClick={handleCloseBridge}
                  disabled={closingBridge}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-700 rounded-lg hover:bg-purple-800 disabled:opacity-50"
                >
                  {closingBridge ? 'Cerrando...' : 'Cerrar cuenta puente'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OpeningBalancesPage;
