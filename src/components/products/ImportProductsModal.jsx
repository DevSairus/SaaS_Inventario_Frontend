import { useState } from 'react';
import { downloadProductsTemplate } from '../../utils/excelExport';
import { productsAPI } from '../../api/products';
import toast from 'react-hot-toast';

function ImportProductsModal({ isOpen, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validation, setValidation] = useState(null);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Validation, 3: Resultado

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidation(null);
      setResult(null);
      setStep(1);
    }
  };

  const handleValidate = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const response = await productsAPI.bulkImport(file, true);
      setValidation(response.data);
      setStep(2);
    } catch (error) {
      toast.error('Error al validar el archivo: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const response = await productsAPI.bulkImport(file, false);
      setResult(response.data);
      setStep(3);
      onImported?.(response.data);
    } catch (error) {
      toast.error('Error al importar productos: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setValidation(null);
    setResult(null);
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-blue-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Importar Productos desde Excel
              </h3>
              <button
                onClick={handleClose}
                className="text-white hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {/* Step 1: Upload */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 Instrucciones:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Descarga la plantilla de Excel (.xlsx)</li>
                    <li>Completa los datos de los productos</li>
                    <li>Si tienes productos sustitutos, indica sus códigos en "Equivalente(s)"</li>
                    <li>Guarda el archivo (mantén el formato .xlsx)</li>
                    <li>Sube el archivo aquí</li>
                  </ol>
                </div>

                {/* Botón para descargar plantilla */}
                <button
                  onClick={downloadProductsTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar Plantilla de Excel
                </button>

                {/* Upload area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">
                      {file ? file.name : 'Haz clic para seleccionar un archivo Excel'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      XLSX o XLS
                    </p>
                  </label>
                </div>

                {file && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-green-800 font-medium">{file.name}</span>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Validation Results (dry run del backend) */}
            {step === 2 && validation && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{validation.total_registros}</p>
                    <p className="text-xs text-blue-800">Total</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{validation.para_crear}</p>
                    <p className="text-xs text-green-800">Para crear</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{validation.invalidos}</p>
                    <p className="text-xs text-red-800">Con errores</p>
                  </div>
                </div>

                {validation.omitidos_duplicados > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    ⏭️ {validation.omitidos_duplicados} código(s) ya existen en el sistema y se omitirán.
                  </div>
                )}

                {validation.grupos_equivalencia_estimados > 0 && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800">
                    🔗 Se detectaron {validation.grupos_equivalencia_estimados} grupo(s) de equivalencia
                    ({validation.enlaces_equivalencia_estimados} productos enlazados en total).
                  </div>
                )}

                {validation.codigos_equivalencia_no_encontrados?.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-orange-900 mb-1">
                      ⚠️ Códigos en "Equivalente(s)" que no se encontraron (ni en el archivo ni en el sistema):
                    </p>
                    <p className="text-xs text-orange-700">
                      {validation.codigos_equivalencia_no_encontrados.join(', ')}
                    </p>
                  </div>
                )}

                {validation.errores.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <h4 className="font-semibold text-red-900 mb-2">❌ Errores encontrados:</h4>
                    <div className="space-y-2">
                      {validation.errores.map((error, index) => (
                        <div key={index} className="bg-white rounded p-2 border border-red-200">
                          <p className="text-sm font-medium text-red-900">
                            Fila {error.row} - {error.sku}
                          </p>
                          <ul className="text-xs text-red-700 mt-1 list-disc list-inside">
                            {error.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    {validation.errores_truncados && (
                      <p className="text-xs text-red-600 mt-2">Se muestran solo los primeros errores.</p>
                    )}
                  </div>
                )}

                {validation.para_crear > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-900 font-medium">
                      ✅ {validation.para_crear} producto(s) listos para importar
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Resultado de la importación real */}
            {step === 3 && result && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{result.creados}</p>
                    <p className="text-xs text-green-800">Creados</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{result.omitidos_duplicados}</p>
                    <p className="text-xs text-yellow-800">Omitidos</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{result.con_errores}</p>
                    <p className="text-xs text-red-800">Con errores</p>
                  </div>
                </div>

                {(result.grupos_equivalencia_creados > 0 || result.grupos_equivalencia_reusados > 0) && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800">
                    🔗 {result.grupos_equivalencia_creados} grupo(s) de equivalencia nuevos y {result.grupos_equivalencia_reusados} reutilizados —
                    {' '}{result.enlaces_equivalencia_creados} producto(s) enlazados en total.
                  </div>
                )}

                {result.codigos_equivalencia_no_encontrados?.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-orange-900 mb-1">
                      ⚠️ Códigos de "Equivalente(s)" no encontrados:
                    </p>
                    <p className="text-xs text-orange-700">
                      {result.codigos_equivalencia_no_encontrados.join(', ')}
                    </p>
                  </div>
                )}

                {result.errores.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <h4 className="font-semibold text-red-900 mb-2">❌ Filas con errores:</h4>
                    <div className="space-y-2">
                      {result.errores.map((error, index) => (
                        <div key={index} className="bg-white rounded p-2 border border-red-200">
                          <p className="text-sm font-medium text-red-900">
                            Fila {error.row} - {error.sku}
                          </p>
                          <ul className="text-xs text-red-700 mt-1 list-disc list-inside">
                            {error.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    {result.errores_truncados && (
                      <p className="text-xs text-red-600 mt-2">Se muestran solo los primeros errores.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              {step === 3 ? 'Cerrar' : 'Cancelar'}
            </button>

            <div className="flex gap-2">
              {step === 1 && file && (
                <button
                  onClick={handleValidate}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? 'Validando...' : 'Validar Archivo'}
                </button>
              )}

              {step === 2 && validation && validation.para_crear > 0 && (
                <button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isProcessing ? 'Importando...' : `Importar ${validation.para_crear} Productos`}
                </button>
              )}

              {step === 2 && validation && validation.para_crear === 0 && (
                <button
                  onClick={() => {
                    setFile(null);
                    setValidation(null);
                    setStep(1);
                  }}
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

export default ImportProductsModal;
