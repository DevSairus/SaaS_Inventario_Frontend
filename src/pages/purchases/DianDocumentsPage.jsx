// frontend/src/pages/purchases/DianDocumentsPage.jsx
//
// Documentos recibidos DIAN: se sube el Excel de "Documentos" del portal
// DIAN (cada descarga trae TODO el periodo; el registro no duplica por
// CUFE), se concilian contra las compras ya registradas y se cargan las
// pendientes — una por una revisando productos (mismo modal del ZIP) o en
// lote con mapeo automático. Para cargar hace falta el XML de cada factura,
// que se obtiene de la DIAN con su CUFE (GetXmlByDocumentKey).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowUpTrayIcon, ArrowLeftIcon, EyeIcon, ArrowDownTrayIcon, NoSymbolIcon, ArrowUturnLeftIcon,
  CheckCircleIcon, DocumentTextIcon,
} from '@heroicons/react/24/outline';
import Layout from '../../components/layout/Layout';
import InvoiceImportModal from '../../components/purchases/InvoiceImportModal';
import DianInvoiceViewModal from '../../components/purchases/DianInvoiceViewModal';
import { dianDocumentsAPI } from '../../api/dianDocuments';
import { formatCurrency } from '../../utils/formatters';

const STATUS_TABS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'loaded', label: 'Cargadas' },
  { id: 'discarded', label: 'Descartadas' },
  { id: 'all', label: 'Todas' },
];

const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  loaded: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  discarded: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
};
const STATUS_LABEL = { pending: 'Pendiente', loaded: 'Cargada', discarded: 'Descartada' };

const fmtDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
};

export default function DianDocumentsPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [status, setStatus] = useState('pending');
  const [type, setType] = useState('invoice');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, loaded: 0, discarded: 0 });
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(null); // 'fetch' | 'load' | 'discard'
  const [progress, setProgress] = useState(null);
  const [batchResult, setBatchResult] = useState(null);

  const [viewId, setViewId] = useState(null);
  const [importQueue, setImportQueue] = useState([]); // ids para revisar uno por uno

  const load = async () => {
    setLoading(true);
    try {
      const res = await dianDocumentsAPI.list({
        status, type, search: search || undefined, from: range.from || undefined, to: range.to || undefined, page, limit: 100,
      });
      setRows(res.data);
      setCounts(res.counts);
      setPagination(res.pagination);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error cargando documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setSelected(new Set()); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status, type, page]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setSummary(null);
    try {
      const res = await dianDocumentsAPI.upload(file);
      setSummary(res.data);
      toast.success('Excel procesado');
      setStatus('pending');
      setPage(1);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error procesando el Excel');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const selectable = useMemo(() => rows.filter((r) => r.status !== 'loaded'), [rows]);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));
  const toggle = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.id)));
  const selectedRows = rows.filter((r) => selected.has(r.id));
  const selectedTotal = selectedRows.reduce((s, r) => s + Number(r.total || 0), 0);

  // Descarga el XML de cada seleccionada sin XML, de a una (la DIAN no
  // tolera bien ráfagas), mostrando avance.
  const fetchSelectedXml = async () => {
    const targets = selectedRows.filter((r) => !r.has_xml && r.is_invoice);
    if (targets.length === 0) { toast('Las seleccionadas ya tienen detalle'); return; }
    setBusy('fetch');
    let ok = 0; let fail = 0; let lastError = '';
    for (let i = 0; i < targets.length; i += 1) {
      setProgress(`Consultando DIAN ${i + 1} de ${targets.length}...`);
      try { await dianDocumentsAPI.fetchXml(targets[i].id); ok += 1; } catch (e) { fail += 1; lastError = e.response?.data?.message || e.message; }
    }
    setProgress(null);
    setBusy(null);
    if (ok) toast.success(`Detalle obtenido: ${ok}`);
    if (fail) toast.error(`Sin detalle: ${fail}${lastError ? ` — ${lastError}` : ''}`, { duration: 7000 });
    await load();
  };

  const loadSelectedAuto = async () => {
    const ids = selectedRows.filter((r) => r.status === 'pending' && r.is_invoice).map((r) => r.id);
    if (ids.length === 0) { toast('Selecciona facturas pendientes'); return; }
    if (!window.confirm(
      `Se cargarán ${ids.length} factura(s) como compra en borrador con asociación AUTOMÁTICA de productos `
      + '(por código del proveedor, SKU o nombre; si no hay coincidencia se crea el producto). '
      + 'Las que no tengan detalle se consultan primero en la DIAN.\n\n¿Continuar?'
    )) return;
    setBusy('load');
    setProgress(`Cargando ${ids.length} factura(s)...`);
    try {
      const res = await dianDocumentsAPI.loadBatch(ids);
      setBatchResult(res.data);
      const { loaded, linked, failed } = res.data;
      toast.success(`Cargadas: ${loaded} · Vinculadas: ${linked}${failed ? ` · Con error: ${failed}` : ''}`);
      setSelected(new Set());
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error en la carga masiva');
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const reviewSelected = () => {
    const ids = selectedRows.filter((r) => r.status === 'pending' && r.is_invoice && r.has_xml).map((r) => r.id);
    const missing = selectedRows.filter((r) => r.status === 'pending' && r.is_invoice && !r.has_xml).length;
    if (missing) toast(`${missing} seleccionada(s) sin detalle: obtén primero el detalle desde la DIAN`);
    if (ids.length) setImportQueue(ids);
  };

  const setStatusSelected = async (newStatus) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    let reason;
    if (newStatus === 'discarded') {
      reason = window.prompt('Motivo (opcional): ej. "Registrada como gasto", "No corresponde"', '') ?? null;
      if (reason === null) return;
    }
    setBusy('discard');
    try {
      await dianDocumentsAPI.setStatus(ids, newStatus, reason || undefined);
      setSelected(new Set());
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error actualizando');
    } finally {
      setBusy(null);
    }
  };


  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/purchases')} className="mt-1 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Documentos recibidos DIAN</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Sube el Excel de documentos del portal DIAN: se registran sin duplicar y se marcan las que ya están en Pitbox.
              </p>
            </div>
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
            >
              <ArrowUpTrayIcon className="h-4 w-4" /> {uploading ? 'Procesando...' : 'Subir Excel DIAN'}
            </button>
          </div>
        </div>

        {/* Resumen de la última carga */}
        {summary && (
          <div className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Resultado de la carga del Excel</div>
              <button onClick={() => setSummary(null)} className="text-xs text-gray-400 hover:text-gray-600">Cerrar</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div><div className="text-xs text-gray-500">Recibidos en el archivo</div><div className="font-semibold">{summary.received}</div></div>
              <div><div className="text-xs text-gray-500">Nuevos registrados</div><div className="font-semibold text-blue-600">{summary.new}</div></div>
              <div><div className="text-xs text-gray-500">Ya registrados antes</div><div className="font-semibold">{summary.already_registered}</div></div>
              <div><div className="text-xs text-gray-500">Ya cargados como compra</div><div className="font-semibold text-emerald-600">{summary.already_loaded}</div></div>
              <div><div className="text-xs text-gray-500">Pendientes por cargar</div><div className="font-semibold text-amber-600">{summary.pending}</div></div>
            </div>
            <div className="mt-2 text-xs text-gray-500 space-y-0.5">
              {summary.emitted_skipped > 0 && <div>{summary.emitted_skipped} documento(s) emitidos por tu empresa se omitieron (ya están en ventas/documentos soporte).</div>}
              {summary.newly_linked > 0 && <div>{summary.newly_linked} se vincularon automáticamente con compras que ya existían.</div>}
              {summary.foreign_receiver > 0 && <div className="text-amber-700 dark:text-amber-400">⚠ {summary.foreign_receiver} documento(s) tienen un NIT receptor distinto al de tu empresa. Verifica que el archivo sea el correcto.</div>}
              {summary.header_missing?.length > 0 && <div className="text-amber-700 dark:text-amber-400">⚠ Columnas no encontradas: {summary.header_missing.join(', ')}</div>}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10">
          <div className="border-b border-gray-200 dark:border-white/10 flex gap-4 px-4 overflow-x-auto">
            {STATUS_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setStatus(t.id); setPage(1); }}
                className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap ${status === t.id ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {t.label}{t.id !== 'all' && <span className="ml-1.5 text-xs text-gray-400">{counts[t.id] ?? 0}</span>}
              </button>
            ))}
          </div>
          <div className="p-3 flex flex-wrap items-end gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load(); } }}
              placeholder="Proveedor, NIT, folio o CUFE"
              className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-white/10 rounded-lg dark:bg-graphite-2"
            />
            <div>
              <label className="block text-xs text-gray-500">Desde</label>
              <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className="px-2 py-1.5 text-sm border border-gray-300 dark:border-white/10 rounded-lg dark:bg-graphite-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Hasta</label>
              <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="px-2 py-1.5 text-sm border border-gray-300 dark:border-white/10 rounded-lg dark:bg-graphite-2" />
            </div>
            <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="px-2 py-2 text-sm border border-gray-300 dark:border-white/10 rounded-lg dark:bg-graphite-2">
              <option value="invoice">Solo facturas</option>
              <option value="all">Todos (incl. notas y eventos)</option>
            </select>
            <button onClick={() => { setPage(1); load(); }} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">Filtrar</button>
          </div>
        </div>

        {/* Acciones sobre la selección */}
        {selected.size > 0 && (
          <div className="sticky top-2 z-20 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-4 py-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-emerald-900 dark:text-emerald-200 mr-2">
              {selected.size} seleccionada(s) · {formatCurrency(selectedTotal)}
            </span>
            <button disabled={!!busy} onClick={fetchSelectedXml} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-blue-300 text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50 dark:bg-transparent dark:text-blue-300">
              <ArrowDownTrayIcon className="w-4 h-4" /> Obtener detalle DIAN
            </button>
            <button disabled={!!busy} onClick={reviewSelected} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-emerald-400 text-emerald-800 bg-white hover:bg-emerald-50 disabled:opacity-50 dark:bg-transparent dark:text-emerald-300">
              <DocumentTextIcon className="w-4 h-4" /> Revisar y cargar una a una
            </button>
            <button disabled={!!busy} onClick={loadSelectedAuto} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
              <CheckCircleIcon className="w-4 h-4" /> Cargar automático
            </button>
            {status !== 'discarded' ? (
              <button disabled={!!busy} onClick={() => setStatusSelected('discarded')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 dark:bg-transparent dark:text-gray-300">
                <NoSymbolIcon className="w-4 h-4" /> Descartar
              </button>
            ) : (
              <button disabled={!!busy} onClick={() => setStatusSelected('pending')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 dark:bg-transparent dark:text-gray-300">
                <ArrowUturnLeftIcon className="w-4 h-4" /> Volver a pendiente
              </button>
            )}
            {progress && <span className="text-xs text-gray-600 dark:text-gray-300 ml-2">{progress}</span>}
          </div>
        )}

        {/* Resultado de la carga masiva */}
        {batchResult && (
          <div className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Carga masiva: {batchResult.loaded} cargada(s), {batchResult.linked} vinculada(s), {batchResult.failed} con error
              </div>
              <button onClick={() => setBatchResult(null)} className="text-xs text-gray-400 hover:text-gray-600">Cerrar</button>
            </div>
            <ul className="text-xs space-y-0.5 max-h-48 overflow-y-auto">
              {batchResult.results.map((r) => (
                <li key={r.id} className={r.ok ? 'text-emerald-700 dark:text-emerald-400' : (r.skipped ? 'text-gray-500' : 'text-red-600')}>
                  {r.document_number} · {r.issuer_name}: {r.ok ? (r.message || `Compra ${r.purchase_number} (${r.items} ítems, ${r.new_products} productos nuevos)`) : r.message}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mt-2">Las compras quedan en borrador: revísalas y confírmalas desde Compras.</p>
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white dark:bg-graphite rounded-xl border border-gray-200 dark:border-white/10 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-white/10 text-sm">
            <thead className="bg-gray-50 dark:bg-graphite-2">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="px-3 py-2 w-8"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300" /></th>
                <th className="px-3 py-2 text-left">Emisión</th>
                <th className="px-3 py-2 text-left">Número</th>
                <th className="px-3 py-2 text-left">Proveedor</th>
                <th className="px-3 py-2 text-right">IVA</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-center">Detalle</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {loading && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Cargando...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-10 text-center text-gray-400">
                  {counts.pending + counts.loaded + counts.discarded === 0
                    ? 'Aún no has subido el Excel de documentos de la DIAN.'
                    : 'No hay documentos con este filtro.'}
                </td></tr>
              )}
              {!loading && rows.map((r) => (
                <tr key={r.id} className={selected.has(r.id) ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}>
                  <td className="px-3 py-2">
                    <input type="checkbox" disabled={r.status === 'loaded'} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="rounded border-gray-300 disabled:opacity-30" />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">{fmtDate(r.issue_date)}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-gray-800 dark:text-gray-200">
                    {r.document_number || '—'}
                    {!r.is_invoice && <span className="ml-1 text-[10px] font-sans text-gray-400">{r.document_type}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-gray-900 dark:text-gray-100">{r.issuer_name}</div>
                    <div className="text-xs text-gray-400">NIT {r.issuer_nit}{!r.supplier_id && r.status === 'pending' ? ' · proveedor nuevo' : ''}</div>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{formatCurrency(r.iva)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap font-medium">{formatCurrency(r.total)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    {r.purchase && (
                      <button onClick={() => navigate(`/purchases/${r.purchase.id}`)} className="block text-xs text-blue-600 hover:underline mt-0.5">
                        Compra {r.purchase.purchase_number}
                      </button>
                    )}
                    {r.status === 'discarded' && r.discard_reason && <div className="text-xs text-gray-400">{r.discard_reason}</div>}
                    {r.times_seen > 1 && <div className="text-[10px] text-gray-400">Visto en {r.times_seen} cargas</div>}
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    {r.has_xml
                      ? <span className="text-emerald-600">✓ XML</span>
                      : (r.xml_fetch_error ? <span className="text-amber-600" title={r.xml_fetch_error}>Sin XML</span> : <span className="text-gray-400">—</span>)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setViewId(r.id)} title="Ver factura" className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-white/10 text-sm">
              <span className="text-gray-500">{pagination.total} documento(s)</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded border border-gray-300 dark:border-white/10 disabled:opacity-40">Anterior</button>
                <span className="px-2 py-1 text-gray-500">{page} / {pagination.pages}</span>
                <button disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded border border-gray-300 dark:border-white/10 disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {viewId && (
        <DianInvoiceViewModal
          documentId={viewId}
          onClose={() => setViewId(null)}
          onChanged={load}
          onLoad={(doc) => { setViewId(null); setImportQueue([doc.id]); }}
        />
      )}

      {importQueue.length > 0 && (
        <InvoiceImportModal
          key={importQueue[0]}
          isOpen
          dianDocumentId={importQueue[0]}
          onClose={() => { setImportQueue((q) => q.slice(1)); load(); }}
          // El modal llama onSuccess y luego onClose: la cola avanza solo en onClose.
          onSuccess={() => load()}
        />
      )}
    </Layout>
  );
}
