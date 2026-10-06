// frontend/src/components/sales/RegisterRetentionsModal.jsx
//
// Registra las retenciones que el cliente le practicó a la venta (según su
// certificado o el pago neto recibido). Abonan a la venta sin mover caja y
// quedan en 1355 (la ReteICA se cruza después en la causación del ICA).
import { useState } from 'react';
import toast from 'react-hot-toast';
import NumericInput from '../inputs/NumericInput';
import { formatCurrency } from '../../utils/formatters';
import salesApi from '../../api/sales';

const FIELDS = [
  { key: 'retefuente', label: 'ReteFuente', rateKey: 'retefuente_rate', unit: '%' },
  { key: 'reteiva', label: 'ReteIVA', rateKey: 'reteiva_rate', unit: '%' },
  { key: 'reteica', label: 'ReteICA', rateKey: 'reteica_rate', unit: '‰' },
];

const RegisterRetentionsModal = ({ sale, onClose, onSaved }) => {
  const pending = parseFloat(sale.total_amount || 0) - parseFloat(sale.paid_amount || 0);
  const [values, setValues] = useState(() => Object.fromEntries(FIELDS.map((f) => [f.key, parseFloat(sale[`${f.key}_amount`] || 0) || ''])));
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const total = FIELDS.reduce((s, f) => s + (parseFloat(values[f.key]) || 0), 0);

  const save = async () => {
    if (total <= 0) { toast.error('Indique al menos una retención'); return; }
    if (total > pending + 0.01) { toast.error('Las retenciones superan el saldo pendiente'); return; }
    setSaving(true);
    try {
      await salesApi.registerRetentions(sale.id, {
        retefuente: parseFloat(values.retefuente) || 0,
        reteiva: parseFloat(values.reteiva) || 0,
        reteica: parseFloat(values.reteica) || 0,
        date,
      });
      toast.success('Retenciones registradas');
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error registrando retenciones');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Retenciones del cliente</h2>
          <p className="text-sm text-gray-500 mt-1">
            Lo que el cliente retuvo al pagar. Se descuenta del saldo pendiente ({formatCurrency(pending)}) sin mover caja.
          </p>
        </div>
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-sm text-gray-700">
              {f.label}
              {Number(sale[f.rateKey]) > 0 && <span className="text-xs text-gray-400 ml-1">(calculada {Number(sale[f.rateKey])}{f.unit})</span>}
            </span>
            <NumericInput
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </label>
        ))}
        <label className="block">
          <span className="text-sm text-gray-700">Fecha</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 text-sm" />
        </label>
        <div className="flex justify-between text-sm font-medium border-t border-gray-100 pt-3">
          <span>Total retenciones</span><span>{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 text-sm">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50">
            {saving ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterRetentionsModal;
