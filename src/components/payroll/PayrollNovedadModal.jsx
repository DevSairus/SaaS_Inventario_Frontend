// frontend/src/components/payroll/PayrollNovedadModal.jsx
//
// Captura una PayrollNovedad para un empleado dentro de un periodo abierto
// o liquidado (mismas reglas que valida payrollNovedades.controller.js).
// SIN JSON: cada categoría DIAN muestra campos reales (horas, valor,
// fecha, texto) según NOVEDAD_FIELD_SCHEMAS / VACACIONES_LICENCIAS_SCHEMAS
// (constants/payroll.js) — el componente arma el payload que espera
// payrollXmlBuilder.js a partir de esos campos, el usuario nunca ve una
// llave ni una llave-valor cruda.
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { usePayrollNovedadesStore } from '../../store/payrollNovedadesStore';
import { usePayrollConceptsStore } from '../../store/payrollConceptsStore';
import { usePayrollSettingsStore } from '../../store/payrollSettingsStore';
import NumericInput from '../inputs/NumericInput';
import {
  NOVEDAD_CATEGORIES,
  NOVEDAD_CATEGORIES_BY_VALUE,
  NOVEDAD_FIELD_SCHEMAS,
  VACACIONES_LICENCIAS_SCHEMAS,
  NOVEDAD_REPLACES_PREVIOUS,
  HORAS_PERCENTAGE_SETTING_KEY,
} from '../../constants/payroll';

const emptyForm = {
  employee_id: '',
  mode: 'category', // 'category' | 'unpaid_days'
  dian_category: '',
  subtype: '', // solo para Vacaciones/Licencias
  payroll_concept_id: '',
  notes: '',
  unpaid_days: '',
};

// Campo "Valor" único para categorías kind='single'/'simpleList' — ambas se
// resuelven en el backend como un número plano (ver aplicarNovedades() /
// simpleValueListXml() en el backend), así que no necesitan más que esto.
const SINGLE_VALUE_FIELD = { name: 'valor', label: 'Valor', type: 'money', required: true };

const PayrollNovedadModal = ({ isOpen, employees, defaultEmployeeId, payrollPeriodId, onClose, onSuccess }) => {
  const { createNovedad, isLoading } = usePayrollNovedadesStore();
  const { concepts, fetchConcepts } = usePayrollConceptsStore();
  const { settings: payrollSettings, fetchSettings } = usePayrollSettingsStore();

  const [formData, setFormData] = useState(emptyForm);
  const [fieldValues, setFieldValues] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && !concepts.length) fetchConcepts();
    if (isOpen) fetchSettings(); // ya viene cacheado si se pidió antes en esta sesión
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...emptyForm, employee_id: defaultEmployeeId || '' });
      setFieldValues({});
      setErrors({});
    }
  }, [isOpen, defaultEmployeeId]);

  const category = NOVEDAD_CATEGORIES_BY_VALUE[formData.dian_category];
  const schema = NOVEDAD_FIELD_SCHEMAS[formData.dian_category]; // array de campos, o undefined
  const vlSchema = VACACIONES_LICENCIAS_SCHEMAS[formData.dian_category]; // { subtypes: [...] }, o undefined
  const subtypeDef = vlSchema?.subtypes.find((s) => s.value === formData.subtype);
  const activeFields = vlSchema ? (subtypeDef?.fields || []) : (schema || [SINGLE_VALUE_FIELD]);
  const replacesPrevious = NOVEDAD_REPLACES_PREVIOUS.has(formData.dian_category);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'dian_category') {
      setErrors({});
      // Vacaciones/Licencias siempre necesitan un subtipo elegido — se
      // preselecciona el primero para que el formulario no aparezca vacío.
      const nextVl = VACACIONES_LICENCIAS_SCHEMAS[value];
      setFormData((prev) => ({ ...prev, dian_category: value, subtype: nextVl ? nextVl.subtypes[0].value : '' }));

      // Si es una categoría de horas con porcentaje configurado, se
      // precarga (editable) — así el usuario no tiene que saber de memoria
      // el 25%/75%/etc. de la legislación vigente.
      const settingKey = HORAS_PERCENTAGE_SETTING_KEY[value];
      const configuredPct = settingKey && payrollSettings?.[settingKey];
      setFieldValues(configuredPct !== undefined && configuredPct !== null ? { porcentaje: String(configuredPct) } : {});
      return;
    }
    if (name === 'subtype') setFieldValues({});
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleFieldChange = (fieldName, value) => {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) setErrors((prev) => ({ ...prev, [fieldName]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.employee_id) newErrors.employee_id = 'Seleccione un empleado';
    if (!payrollPeriodId) newErrors.employee_id = newErrors.employee_id || 'Falta el periodo — cierre y vuelva a intentar';

    if (formData.mode === 'unpaid_days') {
      if (!(Number(formData.unpaid_days) > 0)) newErrors.unpaid_days = 'Debe ser mayor a 0';
    } else {
      if (!formData.dian_category) newErrors.dian_category = 'Seleccione una categoría';
      if (vlSchema && !formData.subtype) newErrors.subtype = 'Seleccione un subtipo';

      let anyFilled = false;
      let anyRequiredMissing = false;
      for (const field of activeFields) {
        const raw = fieldValues[field.name];
        const filled = raw !== undefined && raw !== '' && raw !== null;
        if (filled) anyFilled = true;
        if (field.required && !filled) anyRequiredMissing = true;
      }
      if (formData.dian_category) {
        if (anyRequiredMissing) newErrors.fields = 'Complete los campos obligatorios';
        // Grupos donde TODOS los campos son opcionales (ej: Bonificaciones
        // salarial/no salarial) igual necesitan al menos uno diligenciado,
        // o la novedad quedaría vacía.
        else if (!activeFields.some((f) => f.required) && !anyFilled) {
          newErrors.fields = 'Complete al menos un campo';
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = () => {
    // Arma { [name]: valor } con los tipos correctos — EXACTAMENTE las
    // claves que espera payrollXmlBuilder.js, sin que el usuario tenga que
    // saberlo.
    const obj = {};
    for (const field of activeFields) {
      const raw = fieldValues[field.name];
      if (raw === undefined || raw === '' || raw === null) continue;
      obj[field.name] = (field.type === 'number' || field.type === 'money') ? Number(raw) : raw;
    }
    return obj;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const dataToSend = {
      employee_id: formData.employee_id,
      payroll_period_id: payrollPeriodId,
      payroll_concept_id: formData.payroll_concept_id || null,
      notes: formData.notes.trim() || null,
    };

    if (formData.mode === 'unpaid_days') {
      dataToSend.unpaid_days = parseFloat(formData.unpaid_days) || 0;
    } else {
      dataToSend.dian_category = formData.dian_category;
      if (formData.dian_category === 'Vacaciones' || formData.dian_category === 'Licencias') {
        // Vacaciones/Licencias esperan { [subtipo]: [ {...} ] } — un
        // arreglo porque el backend las va concatenando (merge:true) si
        // hay varias novedades de la misma categoría en el periodo.
        dataToSend.payload = { [formData.subtype]: [buildPayload()] };
      } else if (!schema) {
        // kind 'single' / 'simpleList': un número plano, no un objeto.
        const raw = fieldValues.valor;
        dataToSend.payload = raw === undefined || raw === '' ? null : Number(raw);
      } else {
        dataToSend.payload = buildPayload();
      }
    }

    const result = await createNovedad(dataToSend);
    if (result) {
      onSuccess?.();
      onClose();
    }
  };

  const renderField = (field) => {
    const value = fieldValues[field.name] ?? '';
    const commonLabel = (
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
    );

    if (field.type === 'select') {
      return (
        <div key={field.name}>
          {commonLabel}
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
          >
            <option value="">Seleccionar...</option>
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === 'date') {
      return (
        <div key={field.name}>
          {commonLabel}
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
          />
        </div>
      );
    }

    if (field.type === 'time') {
      return (
        <div key={field.name}>
          {commonLabel}
          <input
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
          />
        </div>
      );
    }

    if (field.type === 'text') {
      return (
        <div key={field.name}>
          {commonLabel}
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
          />
        </div>
      );
    }

    // 'number' | 'money'
    const decimals = field.type === 'money' ? 2 : (field.step === '1' ? 0 : 2);
    return (
      <div key={field.name}>
        {commonLabel}
        <div className="relative">
          {field.type === 'money' && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
          )}
          <NumericInput
            name={field.name}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            decimals={decimals}
            className={`w-full px-3 py-2 ${field.type === 'money' ? 'pl-6' : ''} border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm`}
            placeholder="0"
          />
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Novedad" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Empleado <span className="text-red-500">*</span>
          </label>
          <select
            name="employee_id"
            value={formData.employee_id}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 ${
              errors.employee_id ? 'border-red-500' : 'border-gray-300 dark:border-white/10'
            }`}
          >
            <option value="">Seleccionar...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {[emp.first_name, emp.first_surname].filter(Boolean).join(' ')}
              </option>
            ))}
          </select>
          {errors.employee_id && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.employee_id}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tipo de novedad</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, mode: 'category' }))}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                formData.mode === 'category'
                  ? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700 dark:border-white/10 dark:text-gray-300'
              }`}
            >
              Horas, licencias, bonos...
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, mode: 'unpaid_days' }))}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                formData.mode === 'unpaid_days'
                  ? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700 dark:border-white/10 dark:text-gray-300'
              }`}
            >
              Días no remunerados
            </button>
          </div>
        </div>

        {formData.mode === 'unpaid_days' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Días no remunerados <span className="text-red-500">*</span>
            </label>
            <NumericInput
              name="unpaid_days"
              value={formData.unpaid_days}
              onChange={handleChange}
              decimals={2}
              className={`w-40 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 ${
                errors.unpaid_days ? 'border-red-500' : 'border-gray-300 dark:border-white/10'
              }`}
              placeholder="0"
            />
            {errors.unpaid_days && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.unpaid_days}</p>}
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                name="dian_category"
                value={formData.dian_category}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 ${
                  errors.dian_category ? 'border-red-500' : 'border-gray-300 dark:border-white/10'
                }`}
              >
                <option value="">Seleccionar...</option>
                <optgroup label="Devengados">
                  {NOVEDAD_CATEGORIES.filter((c) => c.bucket === 'devengado').map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Deducciones">
                  {NOVEDAD_CATEGORIES.filter((c) => c.bucket === 'deduccion').map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
              </select>
              {errors.dian_category && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.dian_category}</p>}
            </div>

            {replacesPrevious && (
              <div className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
                Si ya existe una novedad de "{category?.label}" en este periodo, esta la reemplaza — no se suman.
              </div>
            )}

            {vlSchema && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subtipo <span className="text-red-500">*</span>
                </label>
                <select
                  name="subtype"
                  value={formData.subtype}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg"
                >
                  {vlSchema.subtypes.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.dian_category && activeFields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-graphite-2 rounded-lg">
                {activeFields.map(renderField)}
              </div>
            )}
            {HORAS_PERCENTAGE_SETTING_KEY[formData.dian_category] && (
              <p className="text-xs text-gray-400 -mt-2">
                Porcentaje precargado desde la configuración de nómina — ajústalo si este caso puntual es distinto.
              </p>
            )}
            {errors.fields && <p className="text-red-500 dark:text-red-400 text-sm -mt-2">{errors.fields}</p>}
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Concepto de nómina asociado
            <span className="block text-xs font-normal text-gray-400">Opcional — vincula esta novedad a un concepto del catálogo</span>
          </label>
          <select
            name="payroll_concept_id"
            value={formData.payroll_concept_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Sin concepto asociado</option>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="2"
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            Crear Novedad
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PayrollNovedadModal;
