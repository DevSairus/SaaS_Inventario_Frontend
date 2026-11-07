import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, Landmark, Plus, Settings2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/common/Modal';
import { usePermissions } from '../../store/tenantPermissionsStore';
import {
  getPayables, getBankFormats, getPaymentBatches, createPaymentBatch, getBankAccountOptions, saveBankTemplate, deleteBankTemplate,
} from '../../api/paymentBatches';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const BATCH_STATUS = {
  draft: { label: 'Borrador', cls: 'bg-gray-100 text-gray-700' },
  pending_approval: { label: 'Por aprobar', cls: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Aprobado', cls: 'bg-indigo-100 text-indigo-800' },
  exported: { label: 'Archivo generado', cls: 'bg-sky-100 text-sky-800' },
  paid: { label: 'Pagado', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Anulado', cls: 'bg-red-100 text-red-700' },
};
const TABS = [['open', 'Abiertos', 'draft,pending_approval,approved,exported'], ['paid', 'Pagados', 'paid'], ['cancelled', 'Anulados', 'cancelled']];
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800';
const today = () => new Date().toLocaleDateString('en-CA');

function NewBatchModal({ isOpen, onClose, onCreated, formats }) {
  const [payables, setPayables] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState({}); // key -> amount (string)
  const [form, setForm] = useState({ bank_account_id: '', payment_date: today(), format_key: 'bancolombia_pab', debit_account_type: 'savings', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelected({});
    setPayables(null);
    getPayables().then((r) => setPayables(r.data || [])).catch((e) => toast.error(e.response?.data?.message || 'Error al cargar las cuentas por pagar'));
    getBankAccountOptions().then((r) => {
      setAccounts(r.data || []);
      setForm((f) => ({ ...f, bank_account_id: f.bank_account_id || r.data?.[0]?.id || '' }));
    }).catch(() => {});
  }, [isOpen]);

  const keyOf = (p) => `${p.document_type}:${p.document_id}`;
  const toggle = (p) => setSelected((s) => {
    const k = keyOf(p);
    const copy = { ...s };
    if (k in copy) delete copy[k]; else copy[k] = String(p.available);
    return copy;
  });
  const chosen = (payables || []).filter((p) => keyOf(p) in selected);
  const total = chosen.reduce((sum, p) => sum + (Number(selected[keyOf(p)]) || 0), 0);
  const withoutBank = chosen.filter((p) => !p.bank_ready);

  const save = async () => {
    if (!form.bank_account_id) { toast('Elige la cuenta desde la que se paga'); return; }
    if (!chosen.length) { toast('Elige al menos un documento'); return; }
    setSaving(true);
    try {
      const res = await createPaymentBatch({ ...form, items: chosen.map((p) => ({ document_type: p.document_type, document_id: p.document_id, amount: Number(selected[keyOf(p)]) })) });
      toast.success(res.message);
      onCreated(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo crear el lote');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo lote de pagos" size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Se paga desde</label>
            <select value={form.bank_account_id} onChange={(e) => setForm((f) => ({ ...f, bank_account_id: e.target.value }))} className={inputCls}>
              {accounts.length === 0 && <option value="">No hay cuentas bancarias (créalas en Contabilidad → Bancos)</option>}
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_alias || a.bank_name} · {a.account_number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de esa cuenta</label>
            <select value={form.debit_account_type} onChange={(e) => setForm((f) => ({ ...f, debit_account_type: e.target.value }))} className={inputCls}>
              <option value="savings">Ahorros</option>
              <option value="checking">Corriente</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha de pago</label>
            <input type="date" value={form.payment_date} onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Formato del archivo</label>
            <select value={form.format_key} onChange={(e) => setForm((f) => ({ ...f, format_key: e.target.value }))} className={inputCls}>
              {formats.map((f) => <option key={f.key} value={f.key}>{f.label}{f.preset ? '' : ' (propio)'}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Notas</label>
            <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} placeholder="Ej. Pagos semana 45" />
          </div>
        </div>

        {payables === null ? (
          <p className="text-sm text-gray-500">Cargando cuentas por pagar...</p>
        ) : payables.length === 0 ? (
          <p className="text-sm text-gray-500">No hay compras ni gastos con saldo por pagar.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[45vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-3 py-2" />
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2">Proveedor</th>
                  <th className="px-3 py-2">Vence</th>
                  <th className="px-3 py-2 text-right">Disponible</th>
                  <th className="px-3 py-2 text-right">A pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {payables.map((p) => {
                  const k = keyOf(p);
                  const on = k in selected;
                  const overdue = p.due_date && p.due_date < today();
                  const payable = p.available > 0 && Boolean(p.supplier_id);
                  return (
                    <tr key={k} className={payable ? '' : 'opacity-50'}>
                      <td className="px-3 py-2"><input type="checkbox" checked={on} disabled={!payable} onChange={() => toggle(p)} /></td>
                      <td className="px-3 py-2">
                        {p.document_number}
                        <span className="block text-xs text-gray-500">{p.document_type === 'purchase' ? 'Compra' : 'Gasto'}{p.project ? ` · ${p.project}` : ''}{p.in_open_batches > 0 ? ` · ${formatCurrency(p.in_open_batches)} en otro lote` : ''}</span>
                      </td>
                      <td className="px-3 py-2">
                        {p.supplier_name || '—'}
                        {!p.supplier_id
                          ? <span className="block text-xs text-gray-500">Sin proveedor: no se paga por archivo</span>
                          : !p.bank_ready && <span className="block text-xs text-amber-700">Sin datos bancarios completos</span>}
                      </td>
                      <td className={`px-3 py-2 whitespace-nowrap ${overdue ? 'text-red-600 font-medium' : ''}`}>{p.due_date ? formatDate(p.due_date) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(p.available)}</td>
                      <td className="px-3 py-2 text-right">
                        {on && (
                          <input type="number" min="0" step="any" max={p.available} value={selected[k]}
                            onChange={(e) => setSelected((s) => ({ ...s, [k]: e.target.value }))}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-right bg-white dark:bg-gray-800" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {withoutBank.length > 0 && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            {withoutBank.length} proveedor(es) elegidos no tienen banco, tipo y número de cuenta en su ficha: el archivo no se podrá generar hasta completarlos.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">{chosen.length} documento(s) · Total <strong className="tabular-nums">{formatCurrency(total)}</strong></p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button onClick={save} disabled={saving || !chosen.length} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">{saving ? 'Creando...' : 'Crear lote'}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const FORMAT_OPTIONS = { '': 'Tal cual', upper: 'Mayúsculas', decimal_dot: 'Decimal con punto', decimal_comma: 'Decimal con coma', integer: 'Sin decimales', cents: 'En centavos', yyyymmdd: 'AAAAMMDD', ddmmyyyy: 'DDMMAAAA', 'dd/mm/yyyy': 'DD/MM/AAAA' };

// Formatos propios: columnas separadas por delimitador, en el orden del banco.
function TemplatesModal({ isOpen, onClose, formats, fields, onChanged }) {
  const custom = formats.filter((f) => !f.preset);
  const blank = { name: '', bank_name: '', delimiter: ',', extension: 'csv', include_header: true, savings_code: '', checking_code: '', columns: [] };
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await saveBankTemplate(edit, edit.id);
      toast.success(res.message);
      setEdit(null);
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };
  const move = (i, d) => setEdit((e) => {
    const cols = [...e.columns];
    const j = i + d;
    if (j < 0 || j >= cols.length) return e;
    [cols[i], cols[j]] = [cols[j], cols[i]];
    return { ...e, columns: cols };
  });

  return (
    <Modal isOpen={isOpen} onClose={() => { setEdit(null); onClose(); }} title="Formatos de archivo del banco" size="lg">
      {!edit ? (
        <div className="space-y-4">
          <div className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
            Los formatos de Bancolombia, Davivienda, BBVA y Banco de Bogotá vienen listos, pero se armaron con la estructura general de cada banco, no con su manual oficial:
            antes del primer pago real valídalos con el manual vigente de tu banco y haz una prueba con un pago pequeño. Si tu banco pide otro orden de columnas, crea aquí un formato propio.
          </div>
          {custom.length === 0 ? <p className="text-sm text-gray-500">Aún no hay formatos propios.</p> : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
              {custom.map((f) => (
                <li key={f.key} className="px-3 py-2 flex items-center justify-between gap-2 text-sm">
                  <span>{f.label}{f.bank ? ` · ${f.bank}` : ''}</span>
                  <span className="flex gap-3">
                    <button onClick={() => setEdit({ ...blank, ...f.template })} className="text-orange-600 hover:underline">Editar</button>
                    <button onClick={async () => { if (window.confirm(`¿Eliminar "${f.label}"?`)) { await deleteBankTemplate(f.template.id); onChanged(); } }} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setEdit({ ...blank, columns: [{ source: 'beneficiary_tax_id' }, { source: 'beneficiary_name', format: 'upper' }, { source: 'beneficiary_bank_code' }, { source: 'beneficiary_account_type' }, { source: 'beneficiary_account' }, { source: 'amount', format: 'decimal_dot' }, { source: 'reference' }] })}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            <Plus className="w-4 h-4" /> Nuevo formato
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Nombre</label><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={inputCls} /></div>
            <div><label className="block text-sm font-medium mb-1">Banco</label><input value={edit.bank_name || ''} onChange={(e) => setEdit({ ...edit, bank_name: e.target.value })} className={inputCls} /></div>
            <div>
              <label className="block text-sm font-medium mb-1">Separador</label>
              <select value={edit.delimiter} onChange={(e) => setEdit({ ...edit, delimiter: e.target.value })} className={inputCls}>
                <option value=",">Coma (,)</option><option value=";">Punto y coma (;)</option><option value="|">Barra (|)</option><option value={'\t'}>Tabulador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Archivo</label>
              <select value={edit.extension} onChange={(e) => setEdit({ ...edit, extension: e.target.value })} className={inputCls}><option value="csv">.csv</option><option value="txt">.txt</option></select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Código para ahorros</label><input value={edit.savings_code || ''} onChange={(e) => setEdit({ ...edit, savings_code: e.target.value })} className={inputCls} placeholder="Ej. 37 o AH" /></div>
            <div><label className="block text-sm font-medium mb-1">Código para corriente</label><input value={edit.checking_code || ''} onChange={(e) => setEdit({ ...edit, checking_code: e.target.value })} className={inputCls} placeholder="Ej. 27 o CC" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.include_header} onChange={(e) => setEdit({ ...edit, include_header: e.target.checked })} /> Primera fila con los nombres de las columnas</label>
          <div>
            <p className="text-sm font-medium mb-1">Columnas, en orden</p>
            <div className="space-y-1.5">
              {edit.columns.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                  <select value={c.source} onChange={(e) => setEdit({ ...edit, columns: edit.columns.map((x, j) => (j === i ? { ...x, source: e.target.value } : x)) })} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm bg-white dark:bg-gray-800">
                    {Object.entries(fields).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    <option value="const">Valor fijo</option>
                  </select>
                  {c.source === 'const' && <input value={c.value || ''} onChange={(e) => setEdit({ ...edit, columns: edit.columns.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} className="w-28 px-2 py-1.5 border border-gray-300 rounded text-sm" placeholder="Valor" />}
                  <select value={c.format || ''} onChange={(e) => setEdit({ ...edit, columns: edit.columns.map((x, j) => (j === i ? { ...x, format: e.target.value || undefined } : x)) })} className="w-40 px-2 py-1.5 border border-gray-300 rounded text-sm bg-white dark:bg-gray-800">
                    {Object.entries(FORMAT_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button onClick={() => move(i, -1)} className="text-gray-400 hover:text-gray-700"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => move(i, 1)} className="text-gray-400 hover:text-gray-700"><ArrowDown className="w-4 h-4" /></button>
                  <button onClick={() => setEdit({ ...edit, columns: edit.columns.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setEdit({ ...edit, columns: [...edit.columns, { source: 'reference' }] })} className="mt-2 text-sm text-orange-600 hover:underline">+ Agregar columna</button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEdit(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">Volver</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">Guardar formato</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/**
 * Tesorería → Pagos programados: lotes de pago a proveedores.
 */
export default function PaymentBatchesPage() {
  const navigate = useNavigate();
  const can = usePermissions();
  const canSchedule = can('payments.schedule');
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.find(([k]) => k === searchParams.get('tab')) || TABS[0];
  const [batches, setBatches] = useState(null);
  const [formats, setFormats] = useState([]);
  const [fields, setFields] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const load = useCallback(() => {
    getPaymentBatches({ status: tab[2] }).then((r) => setBatches(r.data || [])).catch((e) => toast.error(e.response?.data?.message || 'Error al cargar los lotes'));
  }, [tab]);
  const loadFormats = () => getBankFormats().then((r) => { setFormats(r.data.formats || []); setFields(r.data.fields || {}); }).catch(() => {});

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadFormats(); }, []);

  const formatLabel = useMemo(() => Object.fromEntries(formats.map((f) => [f.key, f.label])), [formats]);

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Pagos programados</h1>
            <p className="text-sm text-gray-500 mt-0.5">Arma un lote con lo que hay que pagar, que lo apruebe otra persona y genera el archivo para el portal del banco.</p>
          </div>
          {canSchedule && (
            <div className="flex gap-2">
              <button onClick={() => setShowTemplates(true)} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50"><Settings2 className="w-4 h-4" /> Formatos del banco</button>
              <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"><Plus className="w-4 h-4" /> Nuevo lote</button>
            </div>
          )}
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700 flex gap-1">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setSearchParams(key === 'open' ? {} : { tab: key })}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab[0] === key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{label}</button>
          ))}
        </div>

        {batches === null ? (
          <div className="p-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>
        ) : batches.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">
            <Landmark className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No hay lotes {tab[1].toLowerCase()}.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-2">Lote</th><th className="px-4 py-2">Fecha de pago</th><th className="px-4 py-2">Cuenta</th>
                  <th className="px-4 py-2 hidden md:table-cell">Formato</th><th className="px-4 py-2">Estado</th><th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {batches.map((b) => (
                  <tr key={b.id} onClick={() => navigate(`/payment-batches/${b.id}`)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-2 font-medium">{b.batch_number}<span className="block text-xs text-gray-500">{b.items_count} pago(s)</span></td>
                    <td className="px-4 py-2">{formatDate(b.payment_date)}</td>
                    <td className="px-4 py-2">{b.bankAccount ? `${b.bankAccount.account_alias || b.bankAccount.bank_name} · ${b.bankAccount.account_number}` : '—'}</td>
                    <td className="px-4 py-2 hidden md:table-cell text-gray-600">{formatLabel[b.format_key] || b.format_key}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BATCH_STATUS[b.status]?.cls}`}>{BATCH_STATUS[b.status]?.label}</span></td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(b.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewBatchModal isOpen={showNew} onClose={() => setShowNew(false)} formats={formats} onCreated={(b) => { setShowNew(false); navigate(`/payment-batches/${b.id}`); }} />
      <TemplatesModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} formats={formats} fields={fields} onChanged={loadFormats} />
    </Layout>
  );
}
