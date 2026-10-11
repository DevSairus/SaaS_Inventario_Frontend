// frontend/src/components/returns/ReverseReturnModal.jsx
// Reversar una devolución aprobada (backend: services/returns/returnReversal.js).
// Deshace inventario, saldo, saldo a favor y asiento con movimientos nuevos.
// Si hubo dinero de por medio, se registra el movimiento inverso por caja o banco.
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { formatCurrency } from '../../utils/formatters';
import BankAccountSelect from '../accounting/BankAccountSelect';

const METHODS = ['Efectivo', 'Transferencia', 'Cheque'];

export default function ReverseReturnModal({ mode = 'customer', ret, onClose, onReversed }) {
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState(ret.refund_method || 'Efectivo');
  const [bankAccountId, setBankAccountId] = useState(null);
  const [saving, setSaving] = useState(false);
  const isCustomer = mode === 'customer';
  const refund = ret.settlement_type === 'refund' ? Number(ret.refund_amount || 0) : 0;
  const url = isCustomer ? `/sales/customer-returns/${ret.id}/reverse` : `/inventory/supplier-returns/${ret.id}/reverse`;

  const effects = isCustomer
    ? [
        'Los productos que volvieron al inventario vuelven a salir.',
        Number(ret.receivable_reduction || 0) > 0 && `La venta vuelve a deber ${formatCurrency(ret.receivable_reduction)}.`,
        ret.settlement_type === 'credit' && 'Se anula el saldo a favor del cliente (solo si no se ha usado).',
        'Se registra un asiento que reversa el de la devolución.',
      ]
    : [
        'Los productos devueltos vuelven a entrar al inventario.',
        Number(ret.payable_reduction || 0) > 0 && `La compra vuelve a deber ${formatCurrency(ret.payable_reduction)}.`,
        ret.settlement_type === 'credit' && 'El saldo a favor se desaplica de las compras donde se usó.',
        'Se registra un asiento que reversa el de la devolución.',
      ];

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post(url, {
        reason: reason.trim(),
        ...(refund > 0 ? { payment_method: method, bank_account_id: method !== 'Efectivo' ? bankAccountId : null } : {}),
      });
      toast.success('Devolución reversada');
      onReversed?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al reversar la devolución');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Reversar devolución {ret.return_number}</h3>
        <p className="text-sm text-gray-600 mb-3">Úsalo si la devolución se aprobó por error o finalmente no se hizo. Esto:</p>
        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1 mb-4">
          {effects.filter(Boolean).map((e) => <li key={e}>{e}</li>)}
        </ul>

        {refund > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 space-y-2">
            <p className="text-sm text-amber-900">
              {isCustomer
                ? `Se le había devuelto ${formatCurrency(refund)} al cliente: registra cómo los reintegra.`
                : `El proveedor había reintegrado ${formatCurrency(refund)}: registra cómo se le devuelven.`}
            </p>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="block w-full border border-gray-300 rounded-md py-2 px-3 text-sm bg-white">
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
            {method !== 'Efectivo' && <BankAccountSelect value={bankAccountId} onChange={setBankAccountId} />}
          </div>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo <span className="text-red-500">*</span></label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          placeholder="Por qué se reversa la devolución"
          className="w-full border border-gray-300 rounded-lg p-2 mb-4 text-sm" />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving || !reason.trim()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Reversando...' : 'Reversar devolución'}
          </button>
        </div>
      </div>
    </div>
  );
}
