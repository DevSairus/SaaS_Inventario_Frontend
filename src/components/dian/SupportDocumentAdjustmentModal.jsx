// frontend/src/components/dian/SupportDocumentAdjustmentModal.jsx
/**
 * Nota de Ajuste al Documento Soporte (tipo DIAN 95 — Fase 4). Solo se
 * habilita cuando el SupportDocument ya está `accepted` (ver
 * SupportDocumentPanel.jsx). A diferencia de CreditDebitNoteModal.jsx (que
 * trabaja sobre los SaleItem reales de una factura, con selección de
 * cantidades), acá se usa un único renglón libre (descripción + base
 * gravable + % IVA) — mismo criterio de "línea sintética" que ya usa el
 * Documento Soporte de gasto (dianService.js#sendSupportDocumentForExpense),
 * porque tanto Purchase como Expense pueden no tener ítems 1:1 fáciles de
 * mapear a un ajuste parcial.
 *
 * Props:
 *  isOpen, onClose
 *  supportDocumentId — requerido, id del SupportDocument a ajustar
 *  onSuccess()        — se dispara al crear la nota (para refrescar el panel)
 */
import { useState } from 'react';
import { X, Check, FileMinus, FilePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import NumericInput from '../inputs/NumericInput';
import { createSupportDocumentAdjustment } from '../../api/dian';

const TAX_RATES = [0, 5, 19];

const REASONS = {
  credit: [
    { value: 'error_valor', label: 'Error en el valor' },
    { value: 'devolucion', label: 'Devolución parcial' },
    { value: 'error_datos', label: 'Error en datos del documento' },
    { value: 'other', label: 'Otro motivo' },
  ],
  debit: [
    { value: 'valor_adicional', label: 'Valor adicional no facturado' },
    { value: 'error_valor', label: 'Corrección de valor (al alza)' },
    { value: 'other', label: 'Otro motivo' },
  ],
};

export default function SupportDocumentAdjustmentModal({ isOpen, onClose, supportDocumentId, onSuccess }) {
  const [adjustmentType, setAdjustmentType] = useState('credit');
  const [description, setDescription] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [reason, setReason] = useState(REASONS.credit[0].value);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isCredit = adjustmentType === 'credit';
  const reasons = isCredit ? REASONS.credit : REASONS.debit;
  const subtotalNum = parseFloat(subtotal) || 0;
  const taxAmount = subtotalNum * (taxRate / 100);
  const total = subtotalNum + taxAmount;
  const isValid = description.trim() && subtotalNum > 0 && reason;

  const handleTypeChange = (type) => {
    setAdjustmentType(type);
    setReason((type === 'credit' ? REASONS.credit : REASONS.debit)[0].value);
  };

  const handleClose = () => {
    setAdjustmentType('credit');
    setDescription('');
    setSubtotal('');
    setTaxRate(0);
    setReason(REASONS.credit[0].value);
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await createSupportDocumentAdjustment(supportDocumentId, {
        adjustment_type: adjustmentType,
        reason,
        items: [{
          description,
          quantity: 1,
          unit_price: subtotalNum,
          tax_percentage: taxRate,
        }],
      });
      toast.success('Nota de Ajuste creada. Envío a DIAN en proceso.');
      onSuccess?.();
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al crear la Nota de Ajuste');
    } finally {
      setLoading(false);
    }
  };

  const accentColor = isCredit ? 'red' : 'orange';
  const AccentIcon = isCredit ? FileMinus : FilePlus;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-graphite rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full bg-${accentColor}-100 dark:bg-${accentColor}-900/30 flex items-center justify-center`}>
              <AccentIcon className={`w-4 h-4 text-${accentColor}-600 dark:text-${accentColor}-300`} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Nota de Ajuste al Documento Soporte</h2>
              <p className="text-xs text-gray-500 dark:text-gray-500">Tipo DIAN 95</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tipo de ajuste</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleTypeChange('credit')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  isCredit
                    ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/40'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 dark:border-white/10 dark:text-gray-300'
                }`}>
                <FileMinus className="w-4 h-4" /> Crédito (a favor)
              </button>
              <button onClick={() => handleTypeChange('debit')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  !isCredit
                    ? 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/40'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 dark:border-white/10 dark:text-gray-300'
                }`}>
                <FilePlus className="w-4 h-4" /> Débito (cargo)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Descripción <span className="text-red-500">*</span>
            </label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Corrección de valor del servicio de arriendo de junio"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Base gravable <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-500 font-medium">$</span>
                <NumericInput value={subtotal} onChange={e => setSubtotal(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
                  placeholder="0" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">% IVA</label>
              <select value={taxRate} onChange={e => setTaxRate(Number(e.target.value))}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100">
                {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Motivo <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {reasons.map(r => (
                <button key={r.value} onClick={() => setReason(r.value)}
                  className={`text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                    reason === r.value
                      ? `border-${accentColor}-400 bg-${accentColor}-50 text-${accentColor}-700 font-medium dark:bg-${accentColor}-900/30 dark:text-${accentColor}-300 dark:border-${accentColor}-800/40`
                      : 'border-gray-200 hover:border-gray-300 text-gray-700 dark:border-white/10 dark:hover:border-white/20 dark:text-gray-300'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-graphite-2 rounded-xl p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Base gravable</span>
              <span className="dark:text-gray-100">{formatCurrency(subtotalNum)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">IVA ({taxRate}%)</span>
              <span className="dark:text-gray-100">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold border-t dark:border-white/10 pt-1">
              <span className="dark:text-gray-100">Total nota</span>
              <span className={`text-${accentColor}-600 dark:text-${accentColor}-400`}>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 dark:bg-graphite-2 dark:border-white/10 flex items-center justify-end gap-2">
          <button onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:border-white/10 dark:hover:bg-white/10 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={!isValid || loading}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-${accentColor}-600 hover:bg-${accentColor}-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors min-w-[140px] justify-center`}>
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Crear Nota
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
