// frontend/src/components/accounting/BankAccountSelect.jsx
//
// Selector de cuenta bancaria para cobros y pagos que no son en efectivo
// (transferencia, tarjeta de crédito o débito, cheque) en ventas, cartera,
// proveedores y gastos: con una cuenta elegida, el asiento va a su subcuenta
// propia de Bancos (y el movimiento se puede conciliar contra el extracto de
// esa cuenta). Sin elegir, se usa la cuenta de Bancos por defecto.
//
// Antes, si la empresa no tenía cuentas bancarias creadas o la consulta
// fallaba, el selector desaparecía sin aviso y parecía que el medio de pago
// no dejaba elegir banco. Ahora siempre se muestra y explica por qué no hay
// opciones y dónde se crean.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bankAccountsAPI } from '../../api/accounting';
import useTenantStore from '../../store/tenantStore';
import useAuthStore from '../../store/authStore';

// Etiqueta según el medio de pago.
const labelFor = (method) => {
  const m = String(method || '').toLowerCase();
  if (/credit|crédito|credito|debit|débito|debito|tarjeta|card/.test(m)) return 'Cuenta bancaria de la tarjeta (donde se abona o se carga)';
  if (/check|cheque/.test(m)) return 'Cuenta bancaria del cheque';
  return 'Cuenta bancaria';
};

// `compact`: sin etiqueta y más bajo, para filas (ej. cada medio de un pago mixto).
// `method`: medio de pago, solo para la etiqueta.
export default function BankAccountSelect({ value, onChange, className = '', compact = false, method = null }) {
  const [accounts, setAccounts] = useState(null); // null = cargando
  const [failed, setFailed] = useState(false);
  const enabledModules = useTenantStore((s) => s.enabledModules);
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    let cancelled = false;
    bankAccountsAPI.getOptions()
      .then((res) => { if (!cancelled) setAccounts(res?.data || []); })
      .catch(() => { if (!cancelled) { setFailed(true); setAccounts([]); } });
    return () => { cancelled = true; };
  }, []);

  const label = labelFor(method);

  if (accounts === null) {
    return compact ? null : <p className={`text-xs text-gray-400 ${className}`}>Cargando cuentas bancarias…</p>;
  }

  if (accounts.length === 0) {
    const hasAccounting = Array.isArray(enabledModules) && enabledModules.includes('accounting');
    const canCreate = hasAccounting && ['admin', 'super_admin', 'manager', 'accountant'].includes(role);
    let hint;
    if (failed) hint = 'No se pudieron cargar las cuentas bancarias. El pago se registra sin banco específico.';
    else if (canCreate) {
      hint = <>No hay cuentas bancarias creadas: el pago se registra en Bancos por defecto. Créalas en{' '}
        <Link to="/accounting/bank-accounts" className="underline">Contabilidad → Cuentas bancarias</Link> para elegir el banco.</>;
    } else if (hasAccounting) hint = 'No hay cuentas bancarias creadas. Pídele al administrador o al contador que las cree en Contabilidad → Cuentas bancarias.';
    else hint = 'Para elegir el banco hay que crear las cuentas bancarias, y eso requiere el módulo de Contabilidad. Por ahora el pago se registra sin banco específico.';
    return (
      <div className={className}>
        {!compact && <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</p>}
        <p className="text-xs rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 px-3 py-2">{hint}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {!compact && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label={label}
        className={`w-full border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2 dark:text-gray-100 ${compact ? 'px-2 py-1' : 'px-3 py-2'}`}
      >
        <option value="">Bancos (cuenta por defecto)</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.account_alias || a.bank_name} · {a.account_number}{a.currency && a.currency !== 'COP' ? ` · ${a.currency}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
