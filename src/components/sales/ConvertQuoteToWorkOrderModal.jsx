// frontend/src/components/sales/ConvertQuoteToWorkOrderModal.jsx
//
// El único dato que le falta a una cotización para convertirse en OT es el
// vehículo (Sale no tiene vehicle_id real, solo placa/marca/modelo en texto
// libre) — todo lo demás (cliente, líneas, diagnóstico si lo había) se copia
// automáticamente en el backend. Por eso este modal es deliberadamente corto:
// una placa, y listo.
import { useEffect, useState } from 'react';
import { X, Wrench } from 'lucide-react';
import salesApi from '../../api/sales';
import toast from 'react-hot-toast';

const VEHICLE_TYPES = [
  { value: 'automovil', label: 'Automóvil' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'motocicleta', label: 'Motocicleta' },
  { value: 'camion', label: 'Camión' },
  { value: 'otro', label: 'Otro' },
];

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400';

export default function ConvertQuoteToWorkOrderModal({ isOpen, onClose, sale, onSuccess }) {
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [vehicleType, setVehicleType] = useState('automovil');
  const [converting, setConverting] = useState(false);
  const [stockAlternatives, setStockAlternatives] = useState([]);

  // Precargar con lo que ya traía la cotización (placa/marca/modelo del
  // formulario de venta), una sola vez al abrir el modal para esta venta.
  useEffect(() => {
    if (!isOpen || !sale) return;
    setPlate(sale.vehicle_plate || '');
    setBrand(sale.vehicle_brand || '');
    setModel(sale.vehicle_model || '');
    setVehicleType(sale.vehicle_type || 'automovil');
  }, [isOpen, sale?.id]);

  if (!isOpen || !sale) return null;


  const handleClose = () => {
    if (converting) return;
    onClose();
  };

  const handleConvert = async () => {
    if (!plate.trim()) {
      toast.error('La placa del vehículo es requerida');
      return;
    }
    setConverting(true);
    setStockAlternatives([]);
    try {
      const res = await salesApi.convertToWorkOrder(sale.id, {
        vehicle: { plate: plate.trim(), brand, model, year: year || null, color, vehicle_type: vehicleType },
      });
      toast.success(res.data.message || 'Orden de trabajo creada');
      onSuccess?.(res.data.data);
    } catch (e) {
      const data = e?.response?.data || {};
      const msg = data.message || 'No se pudo convertir la cotización';
      if (data.alternatives && data.alternatives.length > 0) {
        setStockAlternatives(data.alternatives);
        toast.error(`${msg} — hay ${data.alternatives.length} equivalente(s) disponible(s)`);
      } else {
        toast.error(msg);
      }
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wrench size={17} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">Convertir a Orden de Trabajo</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">
            El cliente, las líneas de la cotización{sale.vehicle_type ? ' y el diagnóstico marcado' : ''} se
            copian automáticamente. Solo falta el vehículo para crear la orden.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Placa *</label>
            <input
              type="text"
              value={plate}
              onChange={e => setPlate(e.target.value.toUpperCase())}
              placeholder="ABC-123"
              maxLength={20}
              className={`${inputCls} uppercase`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marca</label>
              <input type="text" value={brand} onChange={e => setBrand(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modelo/Línea</label>
              <input type="text" value={model} onChange={e => setModel(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
              <input type="number" value={year} onChange={e => setYear(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
              <input type="text" value={color} onChange={e => setColor(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de vehículo</label>
            <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className={inputCls}>
              {VEHICLE_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>

          {/* Alternativas de equivalencia cuando la conversión falló por stock */}
          {stockAlternatives.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-amber-800">
                  Equivalentes con stock ({stockAlternatives.length})
                </p>
                <button onClick={() => setStockAlternatives([])} className="text-amber-600 hover:text-amber-800 text-xs">✕ Cerrar</button>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Edita la línea en la cotización con uno de estos productos y vuelve a intentar convertir.
              </p>
              <div className="space-y-1.5">
                {stockAlternatives.map(alt => (
                  <div key={alt.product_id} className="flex items-center justify-between p-2 bg-white border border-amber-200 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-900">{alt.name}</p>
                      <p className="text-xs text-gray-500">{alt.sku} · Stock: <span className="text-green-600 font-medium">{alt.available_stock}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={handleClose} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleConvert}
            disabled={converting}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
          >
            {converting ? 'Convirtiendo...' : 'Crear Orden de Trabajo'}
          </button>
        </div>
      </div>
    </div>
  );
}
