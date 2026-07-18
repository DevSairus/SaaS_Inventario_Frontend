// frontend/src/components/accounting/ImportOpeningBalanceRowsModal.jsx
//
// Modal genérico de 3 pasos (subir -> validar -> importar) para cartera y
// CxP, mismo patrón que ImportProductsModal.jsx. Se parametriza con las
// funciones de plantilla/validación/creación específicas de cada tipo — ver
// AccountsReceivablePage.jsx / AccountsPayablePage.jsx para el uso concreto.
//
// A diferencia de la importación de productos (que solo omite duplicados),
// aquí cada fila crea un asiento contable real: los errores del API se
// reportan uno por uno en el resumen final, nunca se tragan en silencio.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { parseImportedFile } from '../../utils/excelExport';

function ImportOpeningBalanceRowsModal({
  isOpen,
  onClose,
  title,
  downloadTemplate,
  validate,
  createFn,
  buildPayload,
  rowLabel,
  onImported,
}) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Validación, 3: Resultado

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationResult(null);
      setImportResult(null);
      setStep(1);
    }
  };

  const handleValidate = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const data = await parseImportedFile(file);
      const result = await validate(data);
      setValidationResult(result);
      setStep(2);
    } catch (error) {
      toast.error('Error al procesar el archivo: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.validRows.length === 0) return;
    setIsProcessing(true);

    let successCount = 0;
    const failedRows = [];
    for (const row of validationResult.validRows) {
      try {
        await createFn(buildPayload(row));
        successCount++;
      } catch (error) {
        failedRows.push({
          label: rowLabel(row),
          message: error.response?.data?.message || error.message || 'Error desconocido',
        });
      }
    }

    setImportResult({ successCount, failedRows, total: validationResult.validRows.length });
    setStep(3);
    setIsProcessing(false);
    if (successCount > 0 && onImported) onImported();
  };

  const handleClose = () => {
    setFile(null);
    setValidationResult(null);
    setImportResult(null);
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button onClick={handleClose} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-6 py-4">
            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 Instrucciones:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Descarga la plantilla de Excel (.xlsx)</li>
                    <li>Completa los datos — cada fila debe corresponder a un registro que ya exista en Pitbox</li>
                    <li>Guarda el archivo (mantén el formato .xlsx)</li>
                    <li>Sube el archivo aquí</li>
                  </ol>
                </div>

                <button
                  onClick={downloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar Plantilla de Excel
                </button>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" id="opening-balance-file-upload" />
                  <label htmlFor="opening-balance-file-upload" className="cursor-pointer">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">{file ? file.name : 'Haz clic para seleccionar un archivo Excel'}</p>
                    <p className="text-xs text-gray-500 mt-1">XLSX o XLS</p>
                  </label>
                </div>

                {file && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm text-green-800 font-medium">{file.name}</span>
                    <button onClick={() => setFile(null)} className="text-red-500 hover:text-red-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 2 && validationResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{validationResult.summary.total}</p>
                    <p className="text-xs text-blue-800">Total</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{validationResult.summary.valid}</p>
                    <p className="text-xs text-green-800">Válidos</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{validationResult.summary.invalid}</p>
                    <p className="text-xs text-red-800">Rechazados</p>
                  </div>
                </div>

                {validationResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <h4 className="font-semibold text-red-900 mb-2">❌ Filas rechazadas:</h4>
                    <div className="space-y-2">
                      {validationResult.errors.map((error, index) => (
                        <div key={index} className="bg-white rounded p-2 border border-red-200">
                          <p className="text-sm font-medium text-red-900">Fila {error.row} — {error.identifier}</p>
                          <ul className="text-xs text-red-700 mt-1 list-disc list-inside">
                            {error.errors.map((err, i) => <li key={i}>{err}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {validationResult.validRows.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-900 font-medium">
                      ✅ {validationResult.validRows.length} fila(s) lista(s) para importar
                      {validationResult.errors.length > 0 ? ' (las rechazadas no se van a importar)' : ''}
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && importResult && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{importResult.successCount} / {importResult.total}</p>
                  <p className="text-sm text-green-800">saldos iniciales cargados y contabilizados</p>
                </div>
                {importResult.failedRows.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <h4 className="font-semibold text-red-900 mb-2">❌ No se pudieron cargar:</h4>
                    <div className="space-y-2">
                      {importResult.failedRows.map((f, i) => (
                        <div key={i} className="bg-white rounded p-2 border border-red-200">
                          <p className="text-sm font-medium text-red-900">{f.label}</p>
                          <p className="text-xs text-red-700">{f.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-between">
            <button onClick={handleClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
              {step === 3 ? 'Cerrar' : 'Cancelar'}
            </button>

            <div className="flex gap-2">
              {step === 1 && file && (
                <button onClick={handleValidate} disabled={isProcessing} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isProcessing ? 'Validando...' : 'Validar Archivo'}
                </button>
              )}

              {step === 2 && validationResult && validationResult.validRows.length > 0 && (
                <button onClick={handleImport} disabled={isProcessing} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {isProcessing ? 'Importando...' : `Importar ${validationResult.validRows.length} fila(s)`}
                </button>
              )}

              {step === 2 && validationResult && validationResult.validRows.length === 0 && (
                <button
                  onClick={() => { setFile(null); setValidationResult(null); setStep(1); }}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Corregir y Volver a Subir
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportOpeningBalanceRowsModal;
