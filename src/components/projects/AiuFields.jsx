import useTenantStore from '../../store/tenantStore';

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800';
const KEYS = [['aiu_admin_pct', 'Administración (A)', 'admin_pct'], ['aiu_unforeseen_pct', 'Imprevistos (I)', 'unforeseen_pct'], ['aiu_profit_pct', 'Utilidad (U)', 'profit_pct']];

/** Defaults de AIU del tenant (Ajustes → Impuestos). */
export function useAiuDefaults() {
  const taxConfig = useTenantStore((s) => s.taxConfig);
  return { enabled: false, admin_pct: 10, unforeseen_pct: 5, profit_pct: 5, iva_rate: 19, ...(taxConfig?.aiu || {}) };
}

/**
 * AIU del proyecto o de un corte (Fase 4, req. 1.6).
 * value: { aiu_enabled, aiu_admin_pct, aiu_unforeseen_pct, aiu_profit_pct }
 * fallback: porcentajes a precargar al activarlo (los del proyecto en un corte).
 * Un concepto en 0 no aplica; la Utilidad debe ser mayor que 0 (base del IVA).
 */
export default function AiuFields({ value, onChange, fallback = null, hint = null, disabled = false }) {
  const defaults = useAiuDefaults();
  // Sin AIU en la empresa y sin AIU ya guardado: no se muestra.
  if (!defaults.enabled && !value.aiu_enabled) return null;
  const base = fallback || defaults;

  const toggle = (on) => onChange({
    ...value,
    aiu_enabled: on,
    ...(on ? Object.fromEntries(KEYS.map(([k, , d]) => [k, value[k] === '' || value[k] === null || value[k] === undefined ? base[d] : value[k]])) : {}),
  });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={Boolean(value.aiu_enabled)} onChange={(e) => toggle(e.target.checked)} disabled={disabled} />
        Facturar con AIU
      </label>
      {value.aiu_enabled && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {KEYS.map(([k, label]) => (
              <div key={k}>
                <label className="block text-xs text-gray-500 mb-1">{label} %</label>
                <input
                  type="number" min={k === 'aiu_profit_pct' ? '0.01' : '0'} max="100" step="0.01"
                  value={value[k] ?? ''} disabled={disabled}
                  onChange={(e) => onChange({ ...value, [k]: e.target.value })}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {hint || 'Un concepto en 0 % no aplica.'} El IVA ({Number(defaults.iva_rate)} %) va solo sobre la Utilidad, que debe ser mayor que 0.
          </p>
        </>
      )}
    </div>
  );
}

/** Valores del formulario a partir de un registro con columnas aiu_*. */
export const aiuFormOf = (row) => ({
  aiu_enabled: Boolean(row?.aiu_enabled),
  aiu_admin_pct: row?.aiu_admin_pct ?? '',
  aiu_unforeseen_pct: row?.aiu_unforeseen_pct ?? '',
  aiu_profit_pct: row?.aiu_profit_pct ?? '',
});

/** Cuerpo para el API. */
export const aiuPayload = (v) => (v.aiu_enabled ? {
  aiu_enabled: true,
  aiu_admin_pct: Number(v.aiu_admin_pct) || 0,
  aiu_unforeseen_pct: Number(v.aiu_unforeseen_pct) || 0,
  aiu_profit_pct: Number(v.aiu_profit_pct) || 0,
} : { aiu_enabled: false });
