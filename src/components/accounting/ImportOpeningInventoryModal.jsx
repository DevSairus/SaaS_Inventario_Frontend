// frontend/src/components/accounting/ImportOpeningInventoryModal.jsx
//
// Carga de saldo inicial de inventario (stock físico existente + costo).
// A diferencia de cartera/CxP, esto NO es un loop de creación por fila: se
// pide una única fecha de corte y se manda TODO el lote en una sola llamada
// (POST /accounting/opening-balances/inventory), que genera un solo asiento
// contable por el valor total.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { parseImportedFile, downloadOpeningInventoryTemplate, validateImportedOpeningInventory } from '../../utils/excelExport';
import { openingBalancesAPI } from '../../api/accounting';

function ImportOpeningInventoryModal({ isOpen, onClose, products, onImported }) {
  const [file, setFile] = useState(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [step, setStep] = useState(1);

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
      const result = validateImportedOpeningInventory(data, products);
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
    try {
      const items = validationResult.validRows.map((r) => ({
        product_id: r.product_id,
        warehouse_id: r.warehouse_id,
        quantity: r.quantity,
        unit_cost: r.unit_cost,
      }));
      const response = await openingBalancesAPI.createInventory({ items, entry_date: entryDate });
      setImportResult({ totalValue: response.data.totalValue, itemsLoaded: response.data.itemsLoaded });
      setStep(3);
      if (onImported) onImported();
    } catch (error) {
      toast.error('Error al importar inventario: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsProcessing(false);
    }
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
              <h3 className="text-lg font-semibold text-white">Saldo Inicial de Inventario</h3>
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
                    <li>Descarga la plantilla, complétala con SKU/cantidad/costo</li>
                    <li>Los productos deben existir ya en Pitbox y tener bodega asignada</li>
                    <li>Indica la fecha de corte (una sola, para todo el lote)</li>
                    <li>Sube el archivo — se generará un solo asiento contable con el valor total</li>
                  </ol>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de corte del inventario*</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <button
                  onClick={downloadOpeningInventoryTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all"
                >
                  Descargar Plantilla de Excel
                </button>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" id="opening-inventory-file-upload" />
                  <label htmlFor="opening-inventory-file-upload" className="cursor-pointer">
                    <p className="mt-2 text-sm text-gray-600">{file ? file.name : 'Haz clic para seleccionar un archivo Excel'}</p>
                    <p className="text-xs text-gray-500 mt-1">XLSX o XLS</p>
                  </label>
                </div>
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
                      ✅ {validationResult.validRows.length} producto(s) listos — valor total a cargar: $
                      {validationResult.validRows.reduce((sum, r) => sum + r.quantity * r.unit_cost, 0).toLocaleString('es-CO')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && importResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center space-y-1">
                <p className="text-2xl font-bold text-green-600">{importResult.itemsLoaded} producto(s)</p>
                <p className="text-sm text-green-800">
                  cargados — valor total: ${Number(importResult.totalValue).toLocaleString('es-CO')}, ya contabilizado en el asiento de apertura
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-between">
            <button onClick={handleClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
              {step === 3 ? 'Cerrar' : 'Cancelar'}
            </button>

            <div className="flex gap-2">
              {step === 1 && file && (
                <button onClick={handleValidate} disabled={isProcessing || !entryDate} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isProcessing ? 'Validando...' : 'Validar Archivo'}
                </button>
              )}

              {step === 2 && validationResult && validationResult.validRows.length > 0 && (
                <button onClick={handleImport} disabled={isProcessing} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {isProcessing ? 'Importando...' : `Cargar ${validationResult.validRows.length} producto(s)`}
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

export default ImportOpeningInventoryModal;
