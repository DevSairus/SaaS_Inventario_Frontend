// frontend/src/pages/payroll/PayrollSettingsPage.jsx
//
// Configuración global de los porcentajes de recargo de horas extra —
// ver PayrollNovedadModal.jsx, que los usa para precargar el campo
// "Porcentaje" al crear una novedad de horas. Solo admin/super_admin
// (gateado también en el backend, ver payrollSettings.controller.js).
import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import NumericInput from '../../components/inputs/NumericInput';
import { usePayrollSettingsStore } from '../../store/payrollSettingsStore';
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

const PayrollSettingsPage = () => {
  const { settings, isLoading, fetchSettings, updateSettings } = usePayrollSettingsStore();
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  useEffect(() => {
    if (settings) {
      const initial = {};
      FIELD_GROUPS.forEach((g) => g.fields.forEach((f) => { initial[f.key] = String(settings[f.key] ?? ''); }));
      setFormValues(initial);
    }
  }, [settings]);

  const handleFieldChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {};
    Object.entries(formValues).forEach(([key, value]) => { payload[key] = Number(value); });
    await updateSettings(payload);
    setSaving(false);
  };

  return (
    <Layout>
      <div className="space-y-5 max-w-3xl">

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuración de Nómina</h1>
          <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-500">Porcentajes de recargo usados como valor por defecto al registrar novedades de horas</p>
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
      </div>
    </Layout>
  );
};

export default PayrollSettingsPage;
