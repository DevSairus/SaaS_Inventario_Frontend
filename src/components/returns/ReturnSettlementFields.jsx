// frontend/src/components/returns/ReturnSettlementFields.jsx
// Resumen de la liquidación de una devolución (vista previa del backend,
// useReturnSettlementPreview) y, si hay excedente, la elección de qué hacer
// con ese dinero. Lo comparten aprobar devolución de cliente, anular venta y
// aprobar devolución a proveedor.
import { formatCurrency } from '../../utils/formatters';
import BankAccountSelect from '../accounting/BankAccountSelect';

const CUSTOMER_METHODS = ['Efectivo', 'Transferencia', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Cheque'];
const SUPPLIER_METHODS = ['Efectivo', 'Transferencia', 'Cheque'];

const TEXT = {
  customer: {
    reduction: 'Se descuenta de lo que debe el cliente',
    retention: 'Reversa retenciones que practicó el cliente',
    moneyBack: 'Dinero a favor del cliente',
    question: (v) => `¿Qué se hace con ${v} a favor del cliente?`,
    credit: ['Dejar como saldo a favor', 'Se crea un anticipo del cliente que puede aplicar a otra factura. No sale dinero de la caja.'],
    creditDisabled: 'La venta no tiene cliente asignado.',
    refund: ['Devolver el dinero', 'Sale de la caja abierta o de una cuenta bancaria y queda en el cuadre.'],
    methodLabel: 'Medio de devolución',
  },
  supplier: {
    reduction: 'Se descuenta de lo que se le debe al proveedor',
    retention: 'Reversa retenciones practicadas (ya no se deben a la DIAN)',
    moneyBack: 'Ya pagado al proveedor',
    question: (v) => `¿Qué pasa con ${v} ya pagados?`,
    credit: ['Saldo a favor con el proveedor', 'Se descuenta de sus compras pendientes de pago; si no hay, queda para aplicarlo después desde Cuentas por Pagar.'],
    creditDisabled: '',
    refund: ['El proveedor devuelve el dinero', 'Entra a la caja abierta o a una cuenta bancaria y queda en el cuadre.'],
    methodLabel: 'Medio del reintegro',
  },
};

export default function ReturnSettlementFields({
  mode = 'customer',
  total,
  preview,
  loading,
  error,
  canCredit = true,
  settlement,
  onSettlementChange,
  method,
  onMethodChange,
  bankAccountId,
  onBankAccountChange,
}) {
  const t = TEXT[mode];
  const methods = mode === 'supplier' ? SUPPLIER_METHODS : CUSTOMER_METHODS;

  if (loading) return <p className="text-sm text-gray-500 mb-4">Calculando liquidación...</p>;
  if (error) return <p className="text-sm text-red-600 mb-4">{error}</p>;
  if (!preview) return null;

  const row = (label, value) => (
    <div className="flex justify-between gap-3">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium whitespace-nowrap">{formatCurrency(value)}</span>
    </div>
  );

  const option = (value, [title, help], disabled = false, disabledHelp = '') => (
    <label className={`flex items-start gap-2 p-3 border rounded-lg ${disabled ? 'opacity-50' : 'cursor-pointer'} ${settlement === value ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
      <input type="radio" name={`settlement-${mode}`} className="mt-1" checked={settlement === value} disabled={disabled}
        onChange={() => onSettlementChange(value)} />
      <span className="text-sm">
        <span className="font-medium text-gray-900">{title}</span>
        <span className="block text-gray-500">{disabled && disabledHelp ? disabledHelp : help}</span>
      </span>
    </label>
  );

  return (
    <>
      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 mb-4">
        {row('Total devuelto', total)}
        {preview.reduction > 0 && row(t.reduction, preview.reduction)}
        {preview.retention_reversal_total > 0 && row(t.retention, preview.retention_reversal_total)}
        {preview.money_back > 0 && row(t.moneyBack, preview.money_back)}
      </div>

      {preview.money_back > 0 && (
        <div className="space-y-3 mb-4">
          <p className="text-sm font-medium text-gray-700">{t.question(formatCurrency(preview.money_back))}</p>
          {option('credit', t.credit, !canCredit, t.creditDisabled)}
          {option('refund', t.refund)}
          {settlement === 'refund' && (
            <div className="space-y-2 pl-1">
              <label className="block text-sm font-medium text-gray-700">{t.methodLabel}</label>
              <select value={method} onChange={(e) => onMethodChange(e.target.value)}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 text-sm">
                {methods.map((m) => <option key={m}>{m}</option>)}
              </select>
              {method !== 'Efectivo' && <BankAccountSelect value={bankAccountId} onChange={onBankAccountChange} />}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Payload de liquidación para el backend (solo si hay excedente). */
export function settlementPayload(preview, settlement, method, bankAccountId) {
  if (!(preview?.money_back > 0)) return {};
  return {
    settlement_type: settlement,
    ...(settlement === 'refund'
      ? { payment_method: method, bank_account_id: method !== 'Efectivo' ? bankAccountId : null }
      : {}),
  };
}
