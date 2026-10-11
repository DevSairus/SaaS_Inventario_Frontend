// frontend/src/components/sales/ApproveCustomerReturnModal.jsx
// Aprobar una devolución de cliente. Lo devuelto baja primero lo que debe el
// cliente; si pagó de más, se elige devolverle el dinero (caja/banco) o
// dejarlo como saldo a favor. Los montos vienen de la vista previa del
// backend (services/returns/returnSettlement.js), los mismos que se registran.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { customerReturnsApi } from '../../api/customerReturns';
import useReturnSettlementPreview from '../../hooks/useReturnSettlementPreview';
import ReturnSettlementFields, { settlementPayload } from '../returns/ReturnSettlementFields';

export default function ApproveCustomerReturnModal({ customerReturn, onClose, onApproved }) {
  const { preview, loading, error } = useReturnSettlementPreview('/sales/customer-returns/preview', {
    sale_id: customerReturn.sale_id || customerReturn.sale?.id,
    amount: customerReturn.total_amount,
    exclude_return_id: customerReturn.id,
  });
  const hasCustomer = preview ? preview.has_customer : !!(customerReturn.sale?.customer_id || customerReturn.customer_id);
  const [settlement, setSettlement] = useState(hasCustomer ? 'credit' : 'refund');
  const [method, setMethod] = useState('Efectivo');
  const [bankAccountId, setBankAccountId] = useState(null);
  const [saving, setSaving] = useState(false);
  const effectiveSettlement = !hasCustomer ? 'refund' : settlement;

  const handleApprove = async () => {
    setSaving(true);
    try {
      const res = await customerReturnsApi.approve(customerReturn.id, settlementPayload(preview, effectiveSettlement, method, bankAccountId));
      // Si la nota crédito electrónica no se pudo crear, la devolución igual
      // queda aprobada: se avisa para reintentar desde el detalle.
      if (res?.credit_note_warning) toast(res.credit_note_warning, { icon: '⚠️', duration: 10000 });
      else toast.success(res?.message || 'Devolución aprobada');
      if (res?.commission_warning) toast(res.commission_warning, { icon: 'ℹ️', duration: 10000 });
      onApproved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aprobar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-3">Aprobar Devolución {customerReturn.return_number}</h3>
        <p className="text-sm text-gray-600 mb-4">
          Los productos con destino Inventario vuelven al stock.
          {preview?.needs_credit_note && ' Como la venta es una factura electrónica aceptada, se emitirá la nota crédito ante la DIAN por lo devuelto.'}
        </p>

        <ReturnSettlementFields
          mode="customer"
          total={customerReturn.total_amount}
          preview={preview}
          loading={loading}
          error={error}
          canCredit={hasCustomer}
          settlement={effectiveSettlement}
          onSettlementChange={setSettlement}
          method={method}
          onMethodChange={setMethod}
          bankAccountId={bankAccountId}
          onBankAccountChange={setBankAccountId}
        />

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleApprove}
            disabled={saving || loading || !!error}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Aprobando...' : 'Aprobar'}
          </button>
        </div>
      </div>
    </div>
  );
}
