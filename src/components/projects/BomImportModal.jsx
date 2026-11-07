import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, HelpCircle, Upload, XCircle } from 'lucide-react';
import Modal from '../common/Modal';
import ProductSearchInput from '../common/ProductSearchInput';
import { previewProjectBom, saveProjectBom } from '../../api/projects';
import { formatCurrency } from '../../utils/formatters';
import { downloadProjectBomTemplate } from '../../utils/excelExport';
import { qty } from './projectConstants';

const MATCH = {
  matched: { label: 'Emparejado', cls: 'bg-green-100 text-green-800', Icon: CheckCircle2 },
  manual: { label: 'Elegido', cls: 'bg-blue-100 text-blue-800', Icon: CheckCircle2 },
  ambiguous: { label: 'Revisar', cls: 'bg-amber-100 text-amber-800', Icon: HelpCircle },
  unmatched: { label: 'No está en el catálogo', cls: 'bg-red-100 text-red-700', Icon: XCircle },
};

// Número de una celda → texto que el lector del backend no confunda: "1.234"
// (tres decimales) lo tomaría como mil doscientos treinta y cuatro.
const numberText = (n) => {
  const s = String(n);
  return /^-?\d{1,3}\.\d{3}$/.test(s) ? `${s}0` : s;
};

// .xlsx → mismo texto con tabuladores que se obtiene al copiar desde Excel.
async function xlsxToText(file) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return '';
  const lines = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells = [];
    for (let c = 1; c <= row.cellCount; c++) {
      const v = row.getCell(c).value;
      const raw = v === null || v === undefined ? ''
        : typeof v === 'object' ? (v.result ?? v.text ?? (v.richText ? v.richText.map((r) => r.text).join('') : '')) : v;
      const text = typeof raw === 'number' ? numberText(raw) : raw;
      cells.push(String(text).replace(/[\t\r\n]+/g, ' ').trim());
    }
    lines.push(cells.join('\t'));
  });
  return lines.join('\n');
}

function ProductPicker({ onSelect, onCancel }) {
  const [text, setText] = useState('');
  return (
    <div className="mt-1 max-w-xs">
      <ProductSearchInput value={text} onChange={setText} onSelect={onSelect} onClear={onCancel} autoFocus />
    </div>
  );
}

/**
 * "Cuadro fácil": pegar la lista de materiales desde Excel (o subir el
 * .xlsx), revisar el emparejamiento con el catálogo y guardar.
 */
export default function BomImportModal({ isOpen, onClose, project, hasLines, locked, onSaved }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState(locked ? 'append' : 'replace');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(null);
  const fileRef = useRef(null);

  const reset = () => { setText(''); setPreview(null); setRows([]); setPicking(null); setMode(locked ? 'append' : 'replace'); };
  const close = () => { reset(); onClose(); };

  const analyze = async (source = text) => {
    if (!source.trim()) { toast('Pega las filas copiadas desde Excel'); return; }
    setBusy(true);
    try {
      const res = await previewProjectBom(project.id, source);
      setPreview(res.data);
      setRows(res.data.rows.map((r) => ({ ...r, chosen: r.product_id ? { id: r.product_id, name: r.product?.name, sku: r.product?.sku } : null })));
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo leer la lista');
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const t = await xlsxToText(file);
      setText(t);
      await analyze(t);
    } catch {
      toast.error('No se pudo leer el archivo. Usa un .xlsx o copia y pega las filas.');
    }
  };

  const choose = (idx, product, status = 'manual') => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, chosen: product ? { id: product.id, name: product.name, sku: product.sku } : null, match_status: product ? status : r.match_status } : r)));
    setPicking(null);
  };

  const acceptSuggestions = () => {
    setRows((prev) => prev.map((r) => {
      if (r.chosen || r.match_status !== 'ambiguous' || !r.candidates?.length) return r;
      const c = r.candidates.find((x) => x.id === r.suggested_product_id) || r.candidates[0];
      return { ...r, chosen: { id: c.id, name: c.name, sku: c.sku }, match_status: 'manual' };
    }));
  };

  const pendingReview = rows.filter((r) => !r.chosen && r.match_status === 'ambiguous').length;
  const withoutProduct = rows.filter((r) => !r.chosen).length;

  const save = async () => {
    if (!rows.length) return;
    if (withoutProduct && !window.confirm(`${withoutProduct} línea(s) quedan sin producto del catálogo. Se guardan como texto (no se pueden reservar ni pedir hasta enlazarlas). ¿Continuar?`)) return;
    setBusy(true);
    try {
      const res = await saveProjectBom(project.id, {
        mode,
        update_budget: true,
        rows: rows.map((r) => ({
          input_code: r.input_code,
          input_description: r.input_description,
          unit: r.unit,
          quantity: r.quantity,
          unit_cost: r.unit_cost,
          product_id: r.chosen?.id || null,
          match_status: r.chosen ? (r.match_status === 'matched' ? 'matched' : 'manual') : r.match_status,
        })),
      });
      toast.success(res.message || 'Lista guardada');
      reset();
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo guardar la lista');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="Cargar lista de materiales" size="xl">
      {!preview ? (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <p className="font-medium text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4" /> Copia las filas en Excel y pégalas aquí</p>
            <p>Columnas recomendadas, con su encabezado: <strong>Código · Descripción · Cantidad · Unidad · Costo unitario</strong>. El orden no importa si incluyes el encabezado; el costo es opcional (si falta se usa el costo promedio del producto).</p>
            <p className="mt-1">Se busca cada línea por código (SKU, código de barras o código del proveedor) y, si no aparece, por nombre parecido.</p>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder={'Código\tDescripción\tCantidad\tUnidad\tCosto unitario\nPAN-550\tPanel solar 550 W\t24\tUND\t650000\n...'}
            className="w-full font-mono text-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-800"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={onFile} />
              <button onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <Upload className="w-4 h-4" /> Subir archivo .xlsx
              </button>
              <button onClick={() => downloadProjectBomTemplate(project.code)} className="ml-2 inline-flex items-center gap-2 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 rounded-lg">
                <Download className="w-4 h-4" /> Descargar plantilla
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={close} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button onClick={() => analyze()} disabled={busy || !text.trim()} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
                {busy ? 'Analizando...' : 'Analizar'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">{preview.summary.lines} líneas</span>
            <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-800">{preview.summary.matched} emparejadas</span>
            {preview.summary.ambiguous > 0 && <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">{preview.summary.ambiguous} por revisar</span>}
            {preview.summary.unmatched > 0 && <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700">{preview.summary.unmatched} sin emparejar</span>}
            {preview.summary.errors > 0 && <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">{preview.summary.errors} con error</span>}
          </div>

          {preview.errors.length > 0 && (
            <div className="text-sm bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2 max-h-28 overflow-y-auto">
              <p className="font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Líneas que no se cargarán:</p>
              <ul className="list-disc ml-5">
                {preview.errors.map((e, i) => <li key={i}>Línea {e.line_no}: {e.message}</li>)}
              </ul>
            </div>
          )}

          {pendingReview > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
              <span>{pendingReview} línea(s) tienen un producto parecido sugerido. Revísalas o acéptalas todas.</span>
              <button onClick={acceptSuggestions} className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700">Aceptar sugerencias</button>
            </div>
          )}

          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[50vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Del Excel</th>
                  <th className="px-3 py-2">Producto del catálogo</th>
                  <th className="px-3 py-2 text-right">Cantidad</th>
                  <th className="px-3 py-2 text-right">Disponible</th>
                  <th className="px-3 py-2 text-right hidden md:table-cell">Costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((r, idx) => {
                  const m = MATCH[r.chosen && r.match_status === 'ambiguous' ? 'manual' : r.match_status] || MATCH.unmatched;
                  const available = r.chosen?.id === r.product?.id ? r.product?.available
                    : r.candidates?.find((c) => c.id === r.chosen?.id)?.available;
                  return (
                    <tr key={idx} className="align-top">
                      <td className="px-3 py-2 text-gray-400">{r.line_no}</td>
                      <td className="px-3 py-2">
                        {r.input_code && <p className="font-mono text-xs text-gray-500">{r.input_code}</p>}
                        <p className="text-gray-800 dark:text-gray-200">{r.input_description || '—'}</p>
                      </td>
                      <td className="px-3 py-2 min-w-[260px]">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${m.cls}`}><m.Icon className="w-3 h-3" /> {m.label}</span>
                        {r.chosen ? (
                          <p className="mt-1 text-gray-900 dark:text-gray-100">{r.chosen.name} <span className="text-xs text-gray-500">{r.chosen.sku}</span></p>
                        ) : r.candidates?.length > 0 ? (
                          <select
                            className="mt-1 w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white dark:bg-gray-800"
                            value=""
                            onChange={(e) => choose(idx, r.candidates.find((c) => c.id === e.target.value))}
                          >
                            <option value="">Elegir entre los parecidos...</option>
                            {r.candidates.map((c) => (
                              <option key={c.id} value={c.id}>{c.name} ({c.sku}){c.available !== null && c.available !== undefined ? ` · disp. ${qty(c.available)}` : ''}</option>
                            ))}
                          </select>
                        ) : null}
                        {picking === idx ? (
                          <ProductPicker onSelect={(p) => choose(idx, p)} onCancel={() => setPicking(null)} />
                        ) : (
                          <div className="mt-1 flex gap-3 text-xs">
                            <button onClick={() => setPicking(idx)} className="text-orange-600 hover:underline">{r.chosen ? 'Cambiar' : 'Buscar producto'}</button>
                            {r.chosen && <button onClick={() => choose(idx, null)} className="text-gray-500 hover:underline">Quitar</button>}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{qty(r.quantity)} {r.unit && <span className="text-xs text-gray-500">{r.unit}</span>}</td>
                      <td className={`px-3 py-2 text-right whitespace-nowrap ${available !== undefined && available !== null && available < r.quantity ? 'text-red-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                        {available !== undefined && available !== null ? qty(available) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right hidden md:table-cell text-gray-600">{r.unit_cost !== null && r.unit_cost !== undefined ? formatCurrency(r.unit_cost) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {hasLines ? (
              <div className="flex flex-wrap gap-4 text-sm">
                <label className={`flex items-center gap-2 ${locked ? 'opacity-50' : ''}`} title={locked ? 'La lista actual ya tiene despachos o pedidos' : ''}>
                  <input type="radio" checked={mode === 'replace'} disabled={locked} onChange={() => setMode('replace')} /> Reemplazar la lista actual
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={mode === 'append'} onChange={() => setMode('append')} /> Agregar al final
                </label>
              </div>
            ) : <span />}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setPreview(null); setRows([]); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Volver a pegar</button>
              <button onClick={save} disabled={busy || !rows.length} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60">
                {busy ? 'Guardando...' : `Guardar ${rows.length} línea(s)`}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">Al guardar, el presupuesto de materiales del proyecto se actualiza con el costo estimado de esta lista.</p>
        </div>
      )}
    </Modal>
  );
}
