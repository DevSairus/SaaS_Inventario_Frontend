// frontend/src/components/common/ImportThirdPartiesModal.jsx
//
// Importar clientes o proveedores desde Excel: descargar la plantilla, subir
// el archivo, validar (dry run) y luego importar. Mismo flujo que la carga de
// productos. Backend: services/importers/thirdPartyImport.service.js.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';
import api from '../../api/axios';

const CONFIG = {
  customers: { base: '/customers', title: 'Importar clientes', singular: 'cliente', plural: 'clientes', file: 'Plantilla_Clientes_Pitbox.xlsx' },
  suppliers: { base: '/inventory/suppliers', title: 'Importar proveedores', singular: 'proveedor', plural: 'proveedores', file: 'Plantilla_Proveedores_Pitbox.xlsx' },
};

export default function ImportThirdPartiesModal({ entity, isOpen, onClose, onImported }) {
  const cfg = CONFIG[entity];
  const [file, setFile] = useState(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [validation, setValidation] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');

  const reset = () => { setFile(null); setValidation(null); setResult(null); setUpdateExisting(false); };
  const close = () => { reset(); onClose(); };

  const downloadTemplate = async () => {
    setBusy('template');
    try {
      const res = await api.get(`${cfg.base}/import/template`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = cfg.file; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo descargar la plantilla');
    } finally {
      setBusy('');
    }
  };

  const send = async (dryRun) => {
    const form = new FormData();
    form.append('archivo', file);
    const res = await api.post(`${cfg.base}/import`, form, {
      params: { dry_run: dryRun ? 'true' : 'false', update_existing: updateExisting ? 'true' : 'false' },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
    });
    return res.data.data;
  };

  const validate = async () => {
    setBusy('validate');
    try {
      setValidation(await send(true));
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo validar el archivo');
    } finally {
      setBusy('');
    }
  };

  const doImport = async () => {
    setBusy('import');
    try {
      const data = await send(false);
      setResult(data);
      onImported?.(data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo importar');
    } finally {
      setBusy('');
    }
  };

  const v = result || validation;
  const willChange = validation ? validation.a_crear + validation.a_actualizar : 0;

  return (
    <Modal isOpen={isOpen} onClose={close} title={cfg.title} size="lg">
      <div className="space-y-5 text-sm">
        {!result && (
          <>
            <ol className="list-decimal ml-5 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Descarga la plantilla y llena la hoja de {cfg.plural}, un {cfg.singular} por fila (la hoja Instrucciones explica cada columna).</li>
              <li>Las columnas con * son obligatorias: tipo y número de documento y nombre. El número de documento evita duplicados.</li>
              <li>La ciudad puede ir por código DANE o por nombre (hoja Municipios).</li>
              <li>Sube el archivo y valídalo: verás qué se crea y qué filas tienen errores antes de importar.</li>
            </ol>

            <button type="button" onClick={downloadTemplate} disabled={busy === 'template'} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-60">
              <ArrowDownTrayIcon className="h-5 w-5" /> {busy === 'template' ? 'Generando…' : 'Descargar plantilla'}
            </button>

            <div className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-lg p-4">
              <input type="file" accept=".xlsx,.xls" onChange={(e) => { setFile(e.target.files?.[0] || null); setValidation(null); }} className="block w-full text-sm" />
              <label className="flex items-start gap-2 mt-3 text-gray-700 dark:text-gray-300">
                <input type="checkbox" className="mt-0.5" checked={updateExisting} onChange={(e) => { setUpdateExisting(e.target.checked); setValidation(null); }} />
                <span>
                  Actualizar los {cfg.plural} que ya existen (mismo número de documento) con las celdas que vengan llenas.
                  <span className="block text-xs text-gray-500">Si no se marca, los que ya existen se omiten sin cambios.</span>
                </span>
              </label>
            </div>
          </>
        )}

        {v && (
          <div className="space-y-3">
            {result ? (
              <p className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                <CheckCircleIcon className="h-6 w-6" /> Importación terminada
              </p>
            ) : (
              <p className="font-medium text-gray-900 dark:text-gray-100">Resultado de la validación (todavía no se ha guardado nada)</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ['Filas leídas', v.total_registros, 'bg-gray-50 dark:bg-graphite-2'],
                [result ? 'Creados' : 'Se crearán', result ? v.creados : v.a_crear, 'bg-green-50 dark:bg-green-900/20'],
                [updateExisting ? (result ? 'Actualizados' : 'Se actualizarán') : 'Ya existen (se omiten)', updateExisting ? (result ? v.actualizados : v.a_actualizar) : v.omitidos_existentes, 'bg-blue-50 dark:bg-blue-900/20'],
                ['Con errores (no se cargan)', v.con_errores, v.con_errores ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-graphite-2'],
              ].map(([label, value, cls]) => (
                <div key={label} className={`rounded-lg p-3 ${cls}`}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
                </div>
              ))}
            </div>
            {v.columnas_ignoradas?.length > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-300">Columnas que no se reconocieron y no se cargan: {v.columnas_ignoradas.join(', ')}</p>
            )}
            {v.errores?.length > 0 && (
              <div>
                <p className="flex items-center gap-1 font-medium text-red-700 dark:text-red-400 mb-1"><ExclamationTriangleIcon className="h-4 w-4" /> Filas con errores — corrígelas en el Excel y vuelve a subirlo</p>
                <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-graphite-2 sticky top-0">
                      <tr><th className="px-2 py-1 text-left">Fila</th><th className="px-2 py-1 text-left">Documento / nombre</th><th className="px-2 py-1 text-left">Problema</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                      {v.errores.map((e) => (
                        <tr key={e.fila}>
                          <td className="px-2 py-1 align-top">{e.fila}</td>
                          <td className="px-2 py-1 align-top">{[e.documento, e.nombre].filter(Boolean).join(' · ') || '—'}</td>
                          <td className="px-2 py-1 text-red-700 dark:text-red-400">{e.errores.join('. ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {v.errores_truncados && <p className="text-xs text-gray-500 mt-1">Se muestran las primeras 300 filas con error.</p>}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-white/10">
          <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          {!result && (
            validation && willChange > 0 ? (
              <button type="button" onClick={doImport} disabled={Boolean(busy)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60">
                <ArrowUpTrayIcon className="h-5 w-5" /> {busy === 'import' ? 'Importando…' : `Importar ${willChange} ${willChange === 1 ? cfg.singular : cfg.plural}`}
              </button>
            ) : (
              <button type="button" onClick={validate} disabled={!file || Boolean(busy)} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                {busy === 'validate' ? 'Validando…' : validation ? 'Validar de nuevo' : 'Validar archivo'}
              </button>
            )
          )}
        </div>
      </div>
    </Modal>
  );
}
