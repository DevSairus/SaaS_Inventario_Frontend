// frontend/src/pages/accounting/ThirdPartySetupPage.jsx
//
// 3.2 — Clientes y proveedores recién creados que contabilidad debe revisar
// (régimen, responsabilidades fiscales, retenciones). Al revisarlos se marcan
// como configurados y salen de la lista.
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { thirdPartySetupAPI } from '../../api/accounting';
import Layout from '../../components/layout/Layout';

const KIND_LABEL = { customer: 'Cliente', supplier: 'Proveedor' };

const ThirdPartySetupPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await thirdPartySetupAPI.listPending();
      setRows(res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error cargando los terceros pendientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markDone = async (row) => {
    try {
      setBusyId(row.id);
      await thirdPartySetupAPI.markConfigured(row.kind, row.id);
      toast.success('Marcado como configurado');
      setRows((list) => list.filter((r) => !(r.id === row.id && r.kind === row.kind)));
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo marcar como configurado');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Terceros por configurar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Clientes y proveedores creados recientemente. Revise su régimen, responsabilidades fiscales y retenciones y márquelos como configurados.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Tipo', 'Nombre', 'NIT/CC', 'Creado', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No hay terceros pendientes de configurar</td></tr>
                )}
                {!loading && rows.map((r) => (
                  <tr key={`${r.kind}-${r.id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{KIND_LABEL[r.kind]}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.tax_id || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.created_at ? String(r.created_at).slice(0, 10) : '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => markDone(r)} disabled={busyId === r.id}
                        className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                      >
                        Marcar configurado
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ThirdPartySetupPage;
