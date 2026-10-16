// frontend/src/components/inventory/ApproveSupplierReturnModal.jsx
// Aprobar una devolución a proveedor. Lo devuelto reversa la parte de las
// retenciones practicadas y baja primero lo que se le debe al proveedor por
// esa compra; si ya se le había pagado, se elige si devuelve el dinero
// (caja/banco) o queda como saldo a favor para sus compras pendientes. Los
// montos vienen de la vista previa del backend (services/returns/returnSettlement.js).
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import useReturnSettlementPreview from '../../hooks/useReturnSettlementPreview';
import ReturnSettlementFields, { settlementPayload } from '../returns/ReturnSettlementFields';

export default function ApproveSupplierReturnModal({ supplierReturn, onClose, onApproved }) {
  const { preview, loading, error } = useReturnSettlementPreview('/inventory/supplier-returns/preview', {
    purchase_id: supplierReturn.purchase_id || supplierReturn.purchase?.id,
    amount: supplierReturn.total_amount,
    exclude_return_id: supplierReturn.id,
  });
  const [settlement, setSettlement] = useState('credit');
  const [method, setMethod] = useState('Efectivo');
  const [bankAccountId, setBankAccountId] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleApprove = async () => {
    setSaving(true);
    try {
      const res = await api.put(
        `/inventory/supplier-returns/${supplierReturn.id}/approve`,
        settlementPayload(preview, settlement, method, bankAccountId)
      );
      if (res.data?.support_adjustment_warning) toast(res.data.support_adjustment_warning, { icon: '⚠️', duration: 10000 });
      else toast.success('Devolución aprobada. Stock actualizado.');
      onApproved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aprobar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Aprobar Devolución {supplierReturn.return_number}</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
          Al aprobar se <strong>reduce el stock</strong> de los productos devueltos. Si fue un error, después podrás reversarla desde el detalle de la devolución.
          {preview?.needs_support_adjustment && ' La compra tiene Documento Soporte aceptado: se emitirá la Nota de Ajuste ante la DIAN.'}
        </div>

        <ReturnSettlementFields
          mode="supplier"
          total={supplierReturn.total_amount}
          preview={preview}
          loading={loading}
          error={error}
          settlement={settlement}
          onSettlementChange={setSettlement}
          method={method}
          onMethodChange={setMethod}
          bankAccountId={bankAccountId}
          onBankAccountChange={setBankAccountId}
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleApprove} disabled={saving || loading || !!error} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50">
            {saving ? 'Aprobando...' : 'Aprobar'}
          </button>
        </div>
      </div>
    </div>
  );
}
