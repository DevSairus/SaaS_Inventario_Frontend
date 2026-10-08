// frontend/src/components/accounting/BankAccountSelect.jsx
//
// Selector opcional de cuenta bancaria para cobros y pagos (ventas, cartera,
// proveedores, gastos): con una cuenta elegida, el asiento va a su subcuenta
// propia de Bancos (y el movimiento se puede conciliar contra el extracto de
// esa cuenta). Sin elegir, se usa la cuenta de Bancos por defecto. Si no hay
// cuentas bancarias creadas, no se muestra.
import { useEffect, useState } from 'react';
import { bankAccountsAPI } from '../../api/accounting';

// `compact`: sin etiqueta y más bajo, para filas (ej. cada medio de un pago mixto).
export default function BankAccountSelect({ value, onChange, className = '', compact = false }) {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    bankAccountsAPI.getOptions()
      .then((res) => { if (!cancelled) setAccounts(res?.data || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (accounts.length === 0) return null;

  return (
    <div className={className}>
      {!compact && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cuenta bancaria</label>}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label="Cuenta bancaria"
        className={`w-full border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2 dark:text-gray-100 ${compact ? 'px-2 py-1' : 'px-3 py-2'}`}
      >
        <option value="">Bancos (cuenta por defecto)</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.account_alias || a.bank_name} · {a.account_number}
          </option>
        ))}
      </select>
    </div>
  );
}
