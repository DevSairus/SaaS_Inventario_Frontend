// frontend/src/pages/accounting/BankAccountsPage.jsx
//
// Cuentas Bancarias — Fase 3 del plan de Contabilidad Pitbox: listado y alta
// (crea automáticamente la subcuenta PUC dedicada, hija de 111005).
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { bankAccountsAPI } from '../../api/accounting';
import Layout from '../../components/layout/Layout';
import { PlusIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

const emptyForm = { bank_name: '', account_number: '', account_alias: '', bank_tax_id: '' };

const BankAccountsPage = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bankAccountsAPI.getAll();
      setAccounts(res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando las cuentas bancarias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.bank_name.trim()) return toast.error('El nombre del banco es obligatorio');
    if (!form.account_number.trim()) return toast.error('El número (o últimos dígitos) de la cuenta es obligatorio');

    try {
      setSaving(true);
      const res = await bankAccountsAPI.create(form);
      toast.success(res.message || 'Cuenta bancaria creada');
      setShowModal(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creando la cuenta bancaria');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Cuentas Bancarias</h1>
            <p className="text-sm text-gray-500 mt-1">Conciliación contra el extracto real del banco</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <PlusIcon className="w-4 h-4" /> Nueva Cuenta Bancaria
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Banco', 'Cuenta', 'Alias', 'Cuenta PUC', 'Estado', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>}
                {!loading && accounts.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin cuentas bancarias registradas</td></tr>
                )}
                {!loading && accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.bank_name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.account_number}</td>
                    <td className="px-4 py-3 text-gray-600">{a.account_alias || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {a.chart_of_account ? `${a.chart_of_account.code} — ${a.chart_of_account.name}` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                        {a.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/accounting/bank-accounts/${a.id}/reconciliation`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                      >
                        <ArrowsRightLeftIcon className="w-4 h-4" /> Conciliar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSave}>
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Nueva Cuenta Bancaria</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
                  <input name="bank_name" value={form.bank_name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Ej. Bancolombia" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Número de cuenta (o últimos dígitos)</label>
                  <input name="account_number" value={form.account_number} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Ej. ****4521" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Alias (opcional)</label>
                  <input name="account_alias" value={form.account_alias} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Ej. Cuenta nómina" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">NIT del banco (opcional)</label>
                  <input name="bank_tax_id" value={form.bank_tax_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Ej. 890903938" />
                  <p className="text-xs text-gray-400 mt-1">Necesario para generar el Formato 1012 de Exógena (reporta al banco como tercero).</p>
                </div>
                <p className="text-xs text-gray-400">
                  Al guardar se crea automáticamente una subcuenta contable dedicada (hija de 111005 — Bancos) para esta cuenta.
                </p>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BankAccountsPage;
