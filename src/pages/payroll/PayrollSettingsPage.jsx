// frontend/src/pages/payroll/PayrollSettingsPage.jsx
//
// Configuración global de nómina — solo admin/super_admin (gateado también
// en el backend, ver payrollSettings.controller.js):
//  - Porcentajes de recargo de horas extra (ver PayrollNovedadModal.jsx,
//    que los usa para precargar el campo "Porcentaje").
//  - Cómo se contabiliza la nómina (ver payrollAccountingService.js): lo
//    decide el encargado/contador; aquí solo se ofrecen las opciones.
import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import NumericInput from '../../components/inputs/NumericInput';
import FundSupplierSelect from '../../components/payroll/FundSupplierSelect';
import { usePayrollSettingsStore } from '../../store/payrollSettingsStore';
import CesantiasAnnualPanel from '../../components/payroll/CesantiasAnnualPanel';
import { InformationCircleIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';

const FIELD_GROUPS = [
  {
    title: 'Horas extra y recargo nocturno ordinarios',
    fields: [
      { key: 'heds_percentage', label: 'Extra diurna (HED)', hint: 'Trabajada entre 6:00 a.m. y 9:00 p.m., día hábil' },
      { key: 'hens_percentage', label: 'Extra nocturna (HEN)', hint: 'Trabajada entre 9:00 p.m. y 6:00 a.m., día hábil' },
      { key: 'hrns_percentage', label: 'Recargo nocturno (sin ser extra)', hint: 'Jornada ordinaria nocturna' },
    ],
  },
  {
    title: 'Dominicales y festivos',
    fields: [
      { key: 'hrddfs_percentage', label: 'Recargo diurno dominical/festivo (sin ser extra)', hint: 'Jornada ordinaria en domingo o festivo' },
      { key: 'heddfs_percentage', label: 'Extra diurna dominical/festiva', hint: 'Extra + recargo dominical, diurna' },
      { key: 'hendfs_percentage', label: 'Extra nocturna dominical/festiva', hint: 'Extra + recargo dominical, nocturna' },
      { key: 'hrndfs_percentage', label: 'Recargo nocturno dominical/festivo (sin ser extra)', hint: 'Jornada ordinaria nocturna en domingo o festivo' },
    ],
  },
];

// Opciones de contabilización — el valor por defecto es el primero.
const ACCOUNTING_OPTIONS = [
  {
    key: 'accounting_voucher_mode',
    label: 'Comprobante de aportes y provisiones',
    options: [
      { value: 'single', label: 'En el mismo comprobante de la nómina', hint: 'Un solo comprobante por periodo con dos bloques: devengados/deducciones por empleado, y aportes/provisiones por fondo.' },
      { value: 'split', label: 'En un comprobante aparte', hint: 'Recomendado si paga quincenal o semanal: deja los aportes en su propio comprobante para cuadrarlos con la PILA.' },
    ],
  },
  {
    key: 'cesantias_accrual_mode',
    label: 'Cesantías e intereses',
    note: 'Se pagan una vez al año (intereses al empleado a más tardar el 31 de enero, cesantías al fondo a más tardar el 14 de febrero) y nunca hacen parte del pago mensual. Lo que se elige aquí es cuándo se registra el gasto.',
    options: [
      { value: 'monthly', label: 'Provisión en cada periodo', hint: 'Gasto y pasivo se van acumulando cada periodo; los resultados mensuales reflejan el costo real.' },
      { value: 'year_end', label: 'Un solo asiento al 31 de diciembre', hint: 'Se causan en bloque al cierre del año con el botón de abajo; los informes mensuales no incluyen ese gasto.' },
    ],
  },
  {
    key: 'prima_accrual_mode',
    label: 'Prima de servicios',
    options: [
      { value: 'monthly', label: 'Provisión en cada periodo', hint: 'Al pagarla (junio/diciembre) se cancela contra lo provisionado.' },
      { value: 'on_payment', label: 'Gasto cuando se paga', hint: 'Sin provisión: el pago de junio/diciembre va directo al gasto.' },
    ],
  },
  {
    key: 'vacaciones_accrual_mode',
    label: 'Vacaciones',
    options: [
      { value: 'monthly', label: 'Provisión en cada periodo', hint: 'Al disfrutarlas o compensarlas se cancelan contra lo provisionado.' },
      { value: 'on_payment', label: 'Gasto cuando se pagan', hint: 'Sin provisión: se registran como gasto al disfrutarlas o compensarlas.' },
    ],
  },
];

const COMPANY_FUNDS = [
  { key: 'arl_supplier_id', label: 'ARL (riesgos laborales)' },
  { key: 'ccf_supplier_id', label: 'Caja de compensación familiar' },
  { key: 'sena_supplier_id', label: 'SENA' },
  { key: 'icbf_supplier_id', label: 'ICBF' },
];

const ACCOUNTING_KEYS = [...ACCOUNTING_OPTIONS.map((o) => o.key), ...COMPANY_FUNDS.map((f) => f.key), 'employer_exonerated_114_1'];

const PayrollSettingsPage = () => {
  const { settings, isLoading, fetchSettings, updateSettings } = usePayrollSettingsStore();
  const [formValues, setFormValues] = useState({});
  const [accountingValues, setAccountingValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  useEffect(() => {
    if (settings) {
      const initial = {};
      FIELD_GROUPS.forEach((g) => g.fields.forEach((f) => { initial[f.key] = String(settings[f.key] ?? ''); }));
      setFormValues(initial);
      const accounting = {};
      ACCOUNTING_KEYS.forEach((key) => { accounting[key] = settings[key] ?? ''; });
      ACCOUNTING_OPTIONS.forEach((o) => { if (!accounting[o.key]) accounting[o.key] = o.options[0].value; });
      accounting.employer_exonerated_114_1 = !!settings.employer_exonerated_114_1;
      setAccountingValues(accounting);
    }
  }, [settings]);

  const handleAccountingChange = (key, value) => {
    setAccountingValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleFieldChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {};
    Object.entries(formValues).forEach(([key, value]) => { payload[key] = Number(value); });
    ACCOUNTING_KEYS.forEach((key) => { payload[key] = accountingValues[key] === '' ? null : accountingValues[key]; });
    await updateSettings(payload);
    setSaving(false);
  };

  return (
    <Layout>
      <div className="space-y-5 max-w-3xl">

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuración de Nómina</h1>
          <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">Porcentajes de recargo y forma de contabilizar la nómina</p>
        </div>

        <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl p-4 text-sm">
          <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p>
              Estos porcentajes cambian por ley — la Ley 2466 de 2025 está subiendo el recargo dominical/festivo por
              etapas (90% desde julio de 2026, con un siguiente incremento a 100% previsto para julio de 2027).
            </p>
            <p className="mt-1">
              Ajústelos aquí cuando cambien; solo se usan para precargar el formulario de novedades — cada novedad
              sigue permitiendo un valor distinto para un caso puntual.
            </p>
          </div>
        </div>

        {isLoading && !settings ? (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
            <ArrowPathIcon className="h-6 w-6 animate-spin" />
            <span className="text-sm">Cargando configuración...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {FIELD_GROUPS.map((group) => (
              <div key={group.title} className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{group.title}</h2>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {group.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {field.label}
                        <span className="block text-xs font-normal text-gray-400">{field.hint}</span>
                      </label>
                      <div className="relative w-40">
                        <NumericInput
                          name={field.key}
                          value={formValues[field.key] ?? ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          decimals={2}
                          className="w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Contabilidad de nómina */}
            <div className="bg-white dark:bg-graphite shadow rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contabilidad de nómina</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Cómo se registran los comprobantes de nómina. Defínalo con su contador: el sistema solo ofrece las opciones.
                </p>
              </div>
              <div className="p-4 space-y-5">
                {ACCOUNTING_OPTIONS.map((group) => (
                  <fieldset key={group.key}>
                    <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">{group.label}</legend>
                    {group.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{group.note}</p>}
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.options.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                            accountingValues[group.key] === opt.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500/60'
                              : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <input
                            type="radio"
                            name={group.key}
                            value={opt.value}
                            checked={accountingValues[group.key] === opt.value}
                            onChange={() => handleAccountingChange(group.key, opt.value)}
                            className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {opt.label}
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.hint}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={!!accountingValues.employer_exonerated_114_1}
                    onChange={(e) => handleAccountingChange('employer_exonerated_114_1', e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Exonerado de aportes (Art. 114-1 E.T.)
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      No se calcula salud (8.5%), SENA ni ICBF a cargo del empleador por los trabajadores que devenguen menos de 10 SMLMV.
                    </span>
                  </span>
                </label>

                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Fondos de la empresa</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Regístrelos como proveedores; son el tercero de los aportes en el comprobante. EPS, pensión y cesantías se asignan en la ficha de cada empleado.
                  </p>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {COMPANY_FUNDS.map((fund) => (
                      <div key={fund.key}>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{fund.label}</label>
                        <FundSupplierSelect
                          name={fund.key}
                          value={accountingValues[fund.key]}
                          onChange={(e) => handleAccountingChange(fund.key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                Guardar configuración
              </button>
            </div>
          </form>
        )}

        {settings && (
          <CesantiasAnnualPanel mode={settings.cesantias_accrual_mode} />
        )}
      </div>
    </Layout>
  );
};

export default PayrollSettingsPage;
