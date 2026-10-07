// frontend/src/components/payroll/PilaExcelTemplateModal.jsx
//
// Plantilla del Excel de la PILA: la empresa sube un Excel de muestra (el
// que su operador acepta), Pitbox reconoce qué campo va en cada columna y
// el usuario confirma o corrige antes de guardar. Desde entonces "Descargar
// Excel" usa ese formato. Sin plantilla propia se usa la estándar. Ver
// backend/src/services/payroll/pila/pilaExcel.service.js.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowUpTrayIcon, ArrowPathIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Modal from '../common/Modal';
import { payrollPilaAPI } from '../../api/payroll';

const SECTION_LABELS = { r1: 'Datos del aportante (registro 01)', r2: 'Cotizantes (registro 02)' };
const TYPE_LABELS = { number: 'número', text: 'texto', date: 'fecha', auto: 'vacía en la muestra' };

// 1 -> A, 27 -> AA
const colLetter = (n) => {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};

export default function PilaExcelTemplateModal({ isOpen, onClose }) {
  const [current, setCurrent] = useState(null);   // plantilla guardada (o estándar)
  const [draft, setDraft] = useState(null);       // plantilla aprendida, sin guardar
  const [fieldOptions, setFieldOptions] = useState({ r1: [], r2: [] });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(null);
    payrollPilaAPI.getExcelTemplate()
      .then((res) => { setCurrent(res.data); setFieldOptions(res.data.fieldOptions || { r1: [], r2: [] }); })
      .catch(() => toast.error('No se pudo cargar la plantilla'));
  }, [isOpen]);

  const learn = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await payrollPilaAPI.learnExcelTemplate(file);
      setDraft(res.data.template);
      if (res.data.fieldOptions) setFieldOptions(res.data.fieldOptions);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo leer el Excel');
    } finally {
      setBusy(false);
    }
  };

  const setField = (sectionIdx, colIdx, field) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i !== sectionIdx ? s : {
        ...s,
        // Un campo solo puede ir en una columna: si ya estaba en otra, se quita de allá.
        columns: s.columns.map((c, j) => (j === colIdx ? { ...c, field: field || null } : (field && c.field === field ? { ...c, field: null } : c))),
      })),
    }));
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await payrollPilaAPI.saveExcelTemplate(draft);
      toast.success('Plantilla guardada: "Descargar Excel" usará este formato');
      setCurrent(res.data);
      setDraft(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error guardando la plantilla');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      const res = await payrollPilaAPI.resetExcelTemplate();
      toast.success('Se usará la plantilla estándar');
      setCurrent(res.data);
      setDraft(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error restableciendo la plantilla');
    } finally {
      setBusy(false);
    }
  };

  const shown = draft || current?.template;
  const editable = !!draft;
  const labelOf = (kind, field) => fieldOptions[kind]?.find((o) => o.field === field)?.label || field;
  const unmappedCount = (shown?.sections || []).reduce((n, s) => n + s.columns.filter((c) => !c.field).length, 0);
  const r2 = shown?.sections?.find((s) => s.kind === 'r2');
  const hasDoc = r2?.columns.some((c) => c.field === 'documento');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Plantilla del Excel de la PILA" size="xl">
      <div className="space-y-4 text-sm">
        <p className="text-gray-600 dark:text-gray-300">
          Si su operador recibe la planilla en Excel con un formato propio, suba un archivo de muestra (por ejemplo, el que
          descargó el mes pasado). Pitbox reconoce cada columna; revise las que no reconozca y guarde. El archivo plano (.txt)
          no cambia: es el estándar para todos los operadores.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-gray-50 dark:bg-white/5 px-4 py-3">
          <div className="flex-1 text-gray-700 dark:text-gray-200">
            {draft
              ? <>Plantilla leída de <strong>{draft.source_name || 'la muestra'}</strong> — sin guardar todavía.</>
              : current?.is_default
                ? <>Se usa la <strong>plantilla estándar</strong> (aportante y cotizantes en una hoja, columnas en el orden de la norma).</>
                : <>Plantilla de la empresa: <strong>{current?.template?.source_name || 'personalizada'}</strong>.</>}
          </div>
          <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-white/5">
            {busy ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowUpTrayIcon className="h-4 w-4" />}
            Subir Excel de muestra
            <input type="file" accept=".xlsx" className="hidden" onChange={(e) => { learn(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>

        {editable && (unmappedCount > 0 || !hasDoc) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3 text-amber-800 dark:text-amber-300">
            <p className="flex items-center gap-1.5"><ExclamationTriangleIcon className="h-4 w-4" />
              {!hasDoc ? 'No se reconoció la columna del documento del cotizante: asígnela antes de guardar. ' : ''}
              {unmappedCount > 0 ? `${unmappedCount} columna(s) sin reconocer: elija su campo o déjelas vacías.` : ''}
            </p>
          </div>
        )}
        {editable && unmappedCount === 0 && hasDoc && (
          <p className="flex items-center gap-2 text-green-700 dark:text-green-400"><CheckCircleIcon className="h-5 w-5" /> Se reconocieron todas las columnas.</p>
        )}

        {(shown?.sections || []).map((s, si) => (
          <div key={s.kind} className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
            <div className="bg-gray-50 dark:bg-white/5 px-3 py-2 text-gray-700 dark:text-gray-200">
              <span className="font-medium">{SECTION_LABELS[s.kind]}</span>
              <span className="text-xs text-gray-500"> · hoja «{s.sheet}» · {s.labelRow ? `encabezados en la fila ${s.labelRow}, ` : 'sin fila de encabezados, '}datos desde la fila {s.dataStartRow}</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-white dark:bg-graphite text-gray-500">
                  <tr><th className="text-left px-3 py-1.5 w-12">Col.</th><th className="text-left px-3 py-1.5">Encabezado en el Excel</th><th className="text-left px-3 py-1.5">Campo de la PILA</th><th className="text-left px-3 py-1.5">Tipo</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {s.columns.map((c, ci) => (
                    <tr key={`${c.col}-${ci}`} className={!c.field ? 'bg-amber-50/60 dark:bg-amber-500/5' : ''}>
                      <td className="px-3 py-1.5 font-mono text-gray-500">{colLetter(c.col)}</td>
                      <td className="px-3 py-1.5 text-gray-700 dark:text-gray-200">{c.label}</td>
                      <td className="px-3 py-1.5">
                        {editable ? (
                          <select value={c.field || ''} onChange={(e) => setField(si, ci, e.target.value)}
                            className="w-full max-w-xs px-2 py-1 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded">
                            <option value="">— Dejar vacía —</option>
                            {(fieldOptions[s.kind] || []).map((o) => <option key={o.field} value={o.field}>{o.label}</option>)}
                          </select>
                        ) : (
                          <span className={c.field ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}>{c.field ? labelOf(s.kind, c.field) : 'vacía'}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">{TYPE_LABELS[c.type] || c.type}{c.scale === 100 ? ' (%)' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
          <div>
            {!current?.is_default && !draft && (
              <button type="button" onClick={reset} disabled={busy} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:underline disabled:opacity-50">
                Volver a la plantilla estándar
              </button>
            )}
            {draft && (
              <button type="button" onClick={() => setDraft(null)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:underline">Descartar muestra</button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">Cerrar</button>
            {draft && (
              <button type="button" onClick={save} disabled={busy || !hasDoc}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50">
                {busy && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                Guardar plantilla
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
