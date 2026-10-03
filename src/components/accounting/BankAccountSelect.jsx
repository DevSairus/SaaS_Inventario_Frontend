// frontend/src/components/accounting/BankAccountSelect.jsx
//
// Selector opcional de cuenta bancaria para pagos (a proveedores, etc.): con
// una cuenta elegida, el asiento del pago va a su subcuenta propia de Bancos
// (y el movimiento se puede conciliar contra el extracto de esa cuenta). Sin
// elegir, se usa la cuenta de Bancos por defecto. Si el usuario no tiene
// acceso a contabilidad o no hay cuentas, no se muestra.
import { useEffect, useState } from 'react';
import { bankAccountsAPI } from '../../api/accounting';

export default function BankAccountSelect({ value, onChange, className = '' }) {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    bankAccountsAPI.getAll({ is_active: true })
      .then((res) => { if (!cancelled) setAccounts((res?.data || []).filter((a) => a.is_active !== false)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (accounts.length === 0) return null;

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cuenta bancaria</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2 dark:text-gray-100"
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
