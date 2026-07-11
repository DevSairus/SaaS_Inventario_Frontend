// frontend/src/pages/accounting/JournalEntriesPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { journalEntriesAPI, chartOfAccountsAPI, SOURCE_TYPE_LABELS } from '../../api/accounting';
import useBranchStore from '../../store/branchStore';
import Layout from '../../components/layout/Layout';
import toast from 'react-hot-toast';
import { PlusIcon, XMarkIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';

const STATUS_STYLES = {
  draft: 'bg-yellow-100 text-yellow-800',
  posted: 'bg-green-100 text-green-800',
  voided: 'bg-gray-200 text-gray-600',
};
const STATUS_LABELS = { draft: 'Borrador', posted: 'Contabilizado', voided: 'Anulado' };

const toLocalDateString = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0);

const emptyLine = () => ({ account_id: '', debit: '', credit: '', description: '' });

const JournalEntriesPage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', source_type: '', from: '', to: '', branch_id: '' });
  const { branches, fetchBranches } = useBranchStore();
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [entryForm, setEntryForm] = useState({ entry_date: toLocalDateString(new Date()), description: '', lines: [emptyLine(), emptyLine()] });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [filters]);
  useEffect(() => { fetchBranches(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await journalEntriesAPI.getAll(params);
      setEntries(res.data || []);
    } catch (error) {
      toast.error('Error cargando los asientos');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id) => {
    try {
      const res = await journalEntriesAPI.getById(id);
      setSelected(res.data);
    } catch {
      toast.error('Error cargando el asiento');
    }
  };

  const handlePost = async (id) => {
    try {
      await journalEntriesAPI.post(id);
      toast.success('Asiento contabilizado');
      setSelected(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al contabilizar');
    }
  };

  const handleVoid = async (id) => {
    const reason = window.prompt('Motivo de la anulación:');
    if (reason === null) return;
    try {
      await journalEntriesAPI.void(id, reason);
      toast.success('Asiento anulado');
      setSelected(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al anular');
    }
  };

  const openCreate = async () => {
    try {
      const res = await chartOfAccountsAPI.getAll();
      setAccounts((res.data || []).filter((a) => a.accepts_entries));
      setEntryForm({ entry_date: toLocalDateString(new Date()), description: '', lines: [emptyLine(), emptyLine()] });
      setShowCreate(true);
    } catch {
      toast.error('Error cargando el plan de cuentas');
    }
  };

  const updateLine = (idx, field, value) => {
    setEntryForm((f) => {
      const lines = [...f.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      return { ...f, lines };
    });
  };

  const addLine = () => setEntryForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }));
  const removeLine = (idx) => setEntryForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));

  const { totalDebit, totalCredit } = useMemo(() => {
    return entryForm.lines.reduce(
      (acc, l) => ({ totalDebit: acc.totalDebit + Number(l.debit || 0), totalCredit: acc.totalCredit + Number(l.credit || 0) }),
      { totalDebit: 0, totalCredit: 0 }
    );
  }, [entryForm.lines]);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleCreateEntry = async (e) => {
    e.preventDefault();
    if (!balanced) { toast.error('El asiento no cuadra: débito debe ser igual a crédito'); return; }
    try {
      setSaving(true);
      await journalEntriesAPI.create({
        entry_date: entryForm.entry_date,
        description: entryForm.description,
        lines: entryForm.lines
          .filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0))
          .map((l) => ({ account_id: l.account_id, debit: Number(l.debit || 0), credit: Number(l.credit || 0), description: l.description })),
      });
      toast.success('Asiento manual creado en borrador');
      setShowCreate(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear el asiento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Asientos Contables</h1>
            <p className="text-sm text-gray-500 mt-1">Ventas, compras y gastos generan asientos automáticos en borrador para tu revisión</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            <PlusIcon className="w-4 h-4" /> Asiento Manual
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="posted">Contabilizado</option>
            <option value="voided">Anulado</option>
          </select>
          <select value={filters.source_type} onChange={(e) => setFilters((f) => ({ ...f, source_type: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
            <option value="">Todos los orígenes</option>
            {Object.entries(SOURCE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
          <span className="text-gray-400 text-sm">a</span>
          <input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
          {branches.length > 1 && (
            <select value={filters.branch_id} onChange={(e) => setFilters((f) => ({ ...f, branch_id: e.target.value }))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Todas las sedes</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['N°', 'Fecha', 'Origen', 'Descripción', 'Débito', 'Crédito', 'Estado', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>}
                {!loading && entries.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin asientos</td></tr>}
                {!loading && entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(entry.id)}>
                    <td className="px-4 py-2.5 text-sm font-mono text-gray-600">{entry.entry_number}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{entry.entry_date}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{SOURCE_TYPE_LABELS[entry.source_type] || entry.source_type}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600 max-w-xs truncate">{entry.description}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900">{formatCurrency(entry.total_debit)}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900">{formatCurrency(entry.total_credit)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[entry.status]}`}>{STATUS_LABELS[entry.status]}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {entry.status === 'draft' && (
                        <button onClick={(e) => { e.stopPropagation(); handlePost(entry.id); }} className="text-xs text-indigo-600 hover:underline font-medium">
                          Contabilizar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detalle */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{selected.entry_number}</h3>
                <p className="text-xs text-gray-500">{selected.entry_date} — {selected.description}</p>
              </div>
              <button onClick={() => setSelected(null)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-5 py-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left py-1.5">Cuenta</th>
                    <th className="text-right py-1.5">Débito</th>
                    <th className="text-right py-1.5">Crédito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selected.lines?.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2">
                        <div className="text-gray-900">{l.account?.code} - {l.account?.name}</div>
                        {l.description && <div className="text-xs text-gray-400">{l.description}</div>}
                      </td>
                      <td className="py-2 text-right">{Number(l.debit) > 0 ? formatCurrency(l.debit) : '—'}</td>
                      <td className="py-2 text-right">{Number(l.credit) > 0 ? formatCurrency(l.credit) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold border-t border-gray-200">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right">{formatCurrency(selected.total_debit)}</td>
                    <td className="py-2 text-right">{formatCurrency(selected.total_credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
              <div className="flex gap-2">
                {selected.status === 'draft' && (
                  <button onClick={() => handlePost(selected.id)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700">
                    <CheckIcon className="w-4 h-4" /> Contabilizar
                  </button>
                )}
                {selected.status !== 'voided' && (
                  <button onClick={() => handleVoid(selected.id)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    <TrashIcon className="w-4 h-4" /> Anular
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crear asiento manual */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateEntry}>
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Nuevo Asiento Manual</h3>
                <button type="button" onClick={() => setShowCreate(false)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                    <input type="date" required value={entryForm.entry_date} onChange={(e) => setEntryForm((f) => ({ ...f, entry_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                    <input type="text" value={entryForm.description} onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>

                <div className="space-y-2">
                  {entryForm.lines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select value={line.account_id} onChange={(e) => updateLine(idx, 'account_id', e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm">
                        <option value="">Seleccionar cuenta...</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                      </select>
                      <input type="number" step="0.01" placeholder="Débito" value={line.debit} onChange={(e) => updateLine(idx, 'debit', e.target.value)} className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                      <input type="number" step="0.01" placeholder="Crédito" value={line.credit} onChange={(e) => updateLine(idx, 'credit', e.target.value)} className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                      <button type="button" onClick={() => removeLine(idx)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={addLine} className="text-sm text-indigo-600 hover:underline">+ Agregar línea</button>
                </div>

                <div className={`text-sm px-3 py-2 rounded-lg ${balanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  Débito: {formatCurrency(totalDebit)} — Crédito: {formatCurrency(totalCredit)} {balanced ? '✓ Cuadra' : '✗ No cuadra'}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving || !balanced} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Crear en Borrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default JournalEntriesPage;
