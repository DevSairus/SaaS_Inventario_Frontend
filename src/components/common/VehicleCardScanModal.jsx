import { useState, useCallback } from 'react';
import BarcodeScanner from './BarcodeScanner';
import { parseVehicleCard } from '../../utils/parseVehicleCard';
import { ScanLine, CheckCircle, AlertTriangle, X, RefreshCw, Car } from 'lucide-react';

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const FUEL_OPTIONS = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'diesel',   label: 'Diésel' },
  { value: 'gas',      label: 'Gas / GNV' },
  { value: 'hibrido',  label: 'Híbrido' },
  { value: 'electrico',label: 'Eléctrico' },
  { value: 'otro',     label: 'Otro' },
];

/**
 * VehicleCardScanModal
 *
 * Abre el escáner, parsea el código de la Tarjeta de Propiedad,
 * muestra los datos detectados y permite editar antes de confirmar.
 *
 * Props:
 *  onConfirm(data) — recibe { plate, brand, model, year, color,
 *                             engine_number, vin, fuel_type,
 *                             owner_doc_type, owner_doc, owner_name }
 *  onClose()
 *  showOwner — bool, si se debe mostrar la sección de propietario
 */
export default function VehicleCardScanModal({ onConfirm, onClose, showOwner = true }) {
  const [step, setStep]         = useState('scanning'); // scanning | result | error
  const [parsed, setParsed]     = useState(null);
  const [rawCode, setRawCode]   = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Campos editables después del parseo
  const [fields, setFields] = useState({
    plate: '', brand: '', model: '', year: '', color: '',
    fuel_type: 'gasolina', engine_number: '', vin: '',
    owner_doc_type: '', owner_doc: '', owner_name: '',
  });

  const handleDetect = useCallback((code) => {
    setRawCode(code);
    const result = parseVehicleCard(code);

    if (!result) {
      setErrorMsg(
        'No se pudo leer como Tarjeta de Propiedad. ' +
        'Asegúrate de escanear el código PDF417 (el rectangular, no el lineal).'
      );
      setStep('error');
      return;
    }

    setParsed(result);
    setFields({
      plate:          result.plate || '',
      brand:          result.brand || '',
      model:          result.model || '',
      year:           result.year || '',
      color:          result.color || '',
      fuel_type:      result.fuel_type || 'gasolina',
      engine_number:  result.engine_number || '',
      vin:            result.vin || '',
      owner_doc_type: result.owner_doc_type || '',
      owner_doc:      result.owner_doc || '',
      owner_name:     result.owner_name || '',
    });
    setStep('result');
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirm = () => {
    if (!fields.plate) return;
    onConfirm(fields);
  };

  const retry = () => {
    setStep('scanning');
    setParsed(null);
    setErrorMsg('');
  };

  // ── UI ──────────────────────────────────────────────────────────────

  if (step === 'scanning') {
    return (
      <BarcodeScanner
        onDetect={handleDetect}
        onClose={onClose}
        hint="Apunta al código PDF417 (rectangular grande) de la Tarjeta de Propiedad"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Car size={18} className="text-blue-600" />
            <span className="font-semibold text-gray-900">
              {step === 'result' ? 'Datos del vehículo' : 'Error de lectura'}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Error state */}
        {step === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 text-center">
            <div className="p-4 bg-red-50 rounded-full">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Código no reconocido</p>
              <p className="text-sm text-gray-500">{errorMsg}</p>
            </div>
            {rawCode && (
              <details className="w-full text-left">
                <summary className="text-xs text-gray-400 cursor-pointer">Ver código leído</summary>
                <p className="mt-1 text-xs text-gray-500 bg-gray-50 rounded p-2 break-all font-mono">{rawCode}</p>
              </details>
            )}
            <button
              onClick={retry}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
              <RefreshCw size={14} /> Intentar de nuevo
            </button>
          </div>
        )}

        {/* Result state */}
        {step === 'result' && (
          <>
            {/* Confidence badge */}
            <div className={`px-5 py-2 flex items-center gap-2 text-xs font-medium ${
              parsed?.confidence === 'high'
                ? 'bg-green-50 text-green-700'
                : parsed?.confidence === 'medium'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-orange-50 text-orange-700'
            }`}>
              <CheckCircle size={13} />
              {parsed?.confidence === 'high'
                ? 'Lectura completa — revisa y confirma'
                : parsed?.confidence === 'medium'
                  ? 'Lectura parcial — verifica los campos vacíos'
                  : 'Lectura incompleta — completa manualmente los campos'}
              <button onClick={retry} className="ml-auto flex items-center gap-1 opacity-60 hover:opacity-100">
                <RefreshCw size={11} /> Volver a escanear
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">

              {/* Placa + año (fila) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Placa *</label>
                  <input
                    name="plate"
                    value={fields.plate}
                    onChange={handleChange}
                    className={`${inputCls} font-mono uppercase`}
                    placeholder="ABC123"
                    maxLength={7}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Año modelo</label>
                  <input
                    name="year"
                    value={fields.year}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="2020"
                    maxLength={4}
                  />
                </div>
              </div>

              {/* Marca + Línea */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Marca</label>
                  <input
                    name="brand"
                    value={fields.brand}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="Chevrolet"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Línea / Modelo</label>
                  <input
                    name="model"
                    value={fields.model}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="Spark"
                  />
                </div>
              </div>

              {/* Color + Combustible */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                  <input
                    name="color"
                    value={fields.color}
                    onChange={handleChange}
                    className={inputCls}
                    placeholder="Blanco"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Combustible</label>
                  <select name="fuel_type" value={fields.fuel_type} onChange={handleChange} className={inputCls}>
                    {FUEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* N° Motor + VIN */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">N° Motor</label>
                  <input
                    name="engine_number"
                    value={fields.engine_number}
                    onChange={handleChange}
                    className={`${inputCls} font-mono`}
                    placeholder="Motor"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">VIN / Chasis</label>
                  <input
                    name="vin"
                    value={fields.vin}
                    onChange={handleChange}
                    className={`${inputCls} font-mono`}
                    placeholder="VIN"
                  />
                </div>
              </div>

              {/* Propietario (opcional) */}
              {showOwner && (fields.owner_name || fields.owner_doc) && (
                <div className="bg-blue-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                    <ScanLine size={11} /> Datos del propietario (referencia)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-blue-600 mb-0.5">Tipo doc.</label>
                      <input
                        name="owner_doc_type"
                        value={fields.owner_doc_type}
                        onChange={handleChange}
                        className="w-full border border-blue-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-600 mb-0.5">N° documento</label>
                      <input
                        name="owner_doc"
                        value={fields.owner_doc}
                        onChange={handleChange}
                        className="w-full border border-blue-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-600 mb-0.5">Nombre</label>
                      <input
                        name="owner_name"
                        value={fields.owner_name}
                        onChange={handleChange}
                        className="w-full border border-blue-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-500">
                    Estos datos son solo referencia. Usa el campo Cliente del formulario para asociar el propietario.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 py-4 flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!fields.plate}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition">
                <CheckCircle size={15} /> Aplicar al formulario
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}