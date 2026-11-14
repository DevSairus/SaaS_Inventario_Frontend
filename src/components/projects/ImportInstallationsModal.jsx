import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Download, Upload, XCircle } from 'lucide-react';
import Modal from '../common/Modal';
import { importMaintenanceInstallations } from '../../api/projects';
import { downloadMaintenanceTemplate, parseMaintenanceWorkbook } from '../../utils/excelExport';

/**
 * Importa desde Excel las instalaciones anteriores a Pitbox con su plan de
 * mantenimiento (Fase 4, req. 1.3). Primero revisa todas las filas; solo
 * crea si no hay errores.
 */
export default function ImportInstallationsModal({ isOpen, onClose, onDone }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState(null);
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setRows(null); setCheck(null); if (fileRef.current) fileRef.current.value = ''; };
  const close = () => { reset(); onClose(); };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const parsed = await parseMaintenanceWorkbook(file);
      if (!parsed.length) { toast.error('El archivo no tiene filas'); return; }
      setRows(parsed);
      setCheck((await importMaintenanceInstallations({ rows: parsed, dry_run: true })).data);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'No se pudo leer el archivo');
      reset();
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await importMaintenanceInstallations({ rows, dry_run: false });
      toast.success(r.message, { duration: 6000 });
      onDone?.();
      close();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo importar');
    } finally {
      setBusy(false);
    }
  };

  const s = check?.summary;
  return (
    <Modal isOpen={isOpen} onClose={close} title="Importar instalaciones desde Excel" size="xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Para los sistemas que instalaste antes de usar Pitbox: una fila por instalación, con su plan de mantenimiento.
          Los clientes deben existir en Pitbox (se buscan por NIT o cédula). Primero se revisa el archivo; nada se crea hasta que confirmes.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => downloadMaintenanceTemplate()} className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"><Download className="w-4 h-4" /> Descargar plantilla</button>
          <label className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer">
            <Upload className="w-4 h-4" /> {busy && !check ? 'Revisando…' : 'Subir archivo .xlsx'}
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={onFile} disabled={busy} />
          </label>
        </div>

        {s && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2"><p className="text-xs text-gray-500">Filas</p><p className="font-bold">{s.rows}</p></div>
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 px-3 py-2"><p className="text-xs text-green-800">Correctas</p><p className="font-bold text-green-900 dark:text-green-200">{s.valid}</p></div>
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 px-3 py-2"><p className="text-xs text-red-800">Con errores</p><p className="font-bold text-red-900 dark:text-red-200">{s.invalid}</p></div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2"><p className="text-xs text-gray-500">Se crean</p><p className="font-bold">{s.new_installations} instalación(es) · {s.plans} plan(es)</p></div>
            </div>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[45vh]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                  <tr className="text-left text-xs text-gray-500 uppercase"><th className="px-3 py-2">Fila</th><th className="px-3 py-2">Resultado</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {check.results.map((r) => (
                    <tr key={r.row}>
                      <td className="px-3 py-1.5 align-top">{r.row}</td>
                      <td className="px-3 py-1.5">
                        {r.ok ? (
                          <span className="flex items-start gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                            <span>{r.customer} · {r.installation} <span className="text-xs text-gray-500">({r.action}){r.plan ? ` · ${r.plan}` : ' · sin plan'}</span></span>
                          </span>
                        ) : (
                          <span className="flex items-start gap-1.5 text-red-700 dark:text-red-300"><XCircle className="w-4 h-4 shrink-0 mt-0.5" />{r.errors.join(' · ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={close} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">Cerrar</button>
          {s && (
            <button type="button" onClick={confirm} disabled={busy || s.invalid > 0 || s.valid === 0} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
              {s.invalid > 0 ? 'Corrige las filas con error y vuelve a subir' : busy ? 'Importando…' : `Importar ${s.valid} fila(s)`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
