// frontend/src/components/payroll/PayrollConceptModal.jsx
//
// Modal de creación/edición de PayrollConcept (catálogo de devengados/
// deducciones). Requeridos por el backend (payrollConcepts.controller.js):
// code, name, concept_type. dian_category es texto libre en el modelo
// (sin `validate: isIn`) — se ofrece como <select> con
// CONCEPT_DIAN_CATEGORIES más una opción "Otra" que habilita un input
// libre, para no perder esa libertad del campo.
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { usePayrollConceptsStore } from '../../store/payrollConceptsStore';
import NumericInput from '../inputs/NumericInput';
import { CONCEPT_TYPES, CALCULATION_TYPES, CONCEPT_DIAN_CATEGORIES, NOVEDAD_CATEGORIES } from '../../constants/payroll';

// auto_apply solo es válido para categorías DIAN de "valor simple" (mismo
// criterio que validateAutoApply() en el backend) — se deriva de
// NOVEDAD_CATEGORIES (espejo real de DIAN_CATEGORY_MAP) en vez de la lista
// CONCEPT_DIAN_CATEGORIES de este modal, que es más corta/informativa y
// no necesariamente coincide con las categorías reales del Anexo.
const AUTO_APPLY_CATEGORIES = NOVEDAD_CATEGORIES.filter((c) => ['single', 'simpleList'].includes(c.kind));
const AUTO_APPLY_CATEGORY_VALUES = new Set(AUTO_APPLY_CATEGORIES.map((c) => c.value));

const emptyForm = {
  code: '',
  name: '',
  concept_type: 'devengado',
  dian_category: 'Otros',
  dian_code: '',
  calculation_type: 'manual',
  default_value: 0,
  auto_apply: false,
  sort_order: 0,
  is_active: true,
  notes: '',
};

const PayrollConceptModal = ({ isOpen, concept, onClose }) => {
  const { createConcept, updateConcept, isLoading } = usePayrollConceptsStore();

  const [formData, setFormData] = useState(emptyForm);
  // Si dian_category no está en la lista corta (viene de un concepto ya
  // guardado con un valor libre), se muestra el input de texto en vez del
  // <select> para no pisar silenciosamente ese valor con "Otros".
  const [customCategory, setCustomCategory] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (concept) {
      const known = CONCEPT_DIAN_CATEGORIES.some((c) => c.value === concept.dian_category);
      setFormData({
        code: concept.code || '',
        name: concept.name || '',
        concept_type: concept.concept_type || 'devengado',
        dian_category: concept.dian_category || 'Otros',
        dian_code: concept.dian_code || '',
        calculation_type: concept.calculation_type || 'manual',
        default_value: concept.default_value || 0,
        auto_apply: concept.auto_apply || false,
        sort_order: concept.sort_order || 0,
        is_active: concept.is_active !== undefined ? concept.is_active : true,
        notes: concept.notes || '',
      });
      setCustomCategory(!known && !!concept.dian_category);
    } else {
      setFormData(emptyForm);
      setCustomCategory(false);
    }
    setErrors({});
  }, [concept, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const autoApplyEligible = ['fixed', 'percentage'].includes(formData.calculation_type);

  // Si el usuario ya había marcado auto_apply y luego cambia el tipo de
  // cálculo a "manual"/"fórmula", se desmarca solo — mejor que dejar que
  // el backend lo rechace con un 400 al guardar.
  useEffect(() => {
    if (formData.auto_apply && !autoApplyEligible) {
      setFormData((prev) => ({ ...prev, auto_apply: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.calculation_type]);

  const handleAutoApplyToggle = (e) => {
    const checked = e.target.checked;
    setFormData((prev) => ({
      ...prev,
      auto_apply: checked,
      // Si la categoría actual no es de valor simple, se preselecciona la
      // primera válida — así el usuario no tiene que adivinar cuál código
      // de categoría califica antes de poder marcar la casilla.
      dian_category: checked && !AUTO_APPLY_CATEGORY_VALUES.has(prev.dian_category)
        ? AUTO_APPLY_CATEGORIES[0].value
        : prev.dian_category,
    }));
  };

  const handleCategorySelect = (e) => {
    const { value } = e.target;
    if (value === '__custom__') {
      setCustomCategory(true);
      setFormData((prev) => ({ ...prev, dian_category: '' }));
    } else {
      setCustomCategory(false);
      setFormData((prev) => ({ ...prev, dian_category: value }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.code.trim()) newErrors.code = 'El código es requerido';
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.concept_type) newErrors.concept_type = 'El tipo es requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const dataToSend = {
      ...formData,
      code: formData.code.trim(),
      name: formData.name.trim(),
      dian_category: formData.dian_category.trim() || 'Otros',
      dian_code: formData.dian_code.trim() || null,
      default_value: parseFloat(formData.default_value) || 0,
      sort_order: parseInt(formData.sort_order, 10) || 0,
      notes: formData.notes.trim() || null,
    };

    const result = concept
      ? await updateConcept(concept.id, dataToSend)
      : await createConcept(dataToSend);

    if (result) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={concept ? 'Editar Concepto' : 'Nuevo Concepto'} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 ${
                errors.code ? 'border-red-500' : 'border-gray-300 dark:border-white/10'
              }`}
              placeholder="Ej: AUX-ALIM"
            />
            {errors.code && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.code}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-white/10'
              }`}
              placeholder="Ej: Auxilio de alimentación"
            />
            {errors.name && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.name}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Tipo <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CONCEPT_TYPES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, concept_type: opt.value }))}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  formData.concept_type === opt.value
                    ? opt.value === 'devengado'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/40'
                      : 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/40'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 dark:border-white/10 dark:text-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Categoría DIAN
              <span className="block text-xs font-normal text-gray-400">Clasificación del Anexo Técnico, informativa</span>
            </label>
            {formData.auto_apply ? (
              <div className="px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-graphite-2">
                {NOVEDAD_CATEGORIES.find((c) => c.value === formData.dian_category)?.label || formData.dian_category}
                <span className="block text-xs mt-0.5">Se edita más abajo, junto con la automatización.</span>
              </div>
            ) : !customCategory ? (
              <select
                value={formData.dian_category}
                onChange={handleCategorySelect}
                className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CONCEPT_DIAN_CATEGORIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
                <option value="__custom__">Otra categoría...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  name="dian_category"
                  value={formData.dian_category}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: BonoEPCTVs"
                />
                <button
                  type="button"
                  onClick={() => { setCustomCategory(false); setFormData((prev) => ({ ...prev, dian_category: 'Otros' })); }}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Volver a lista
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código DIAN (opcional)
              <span className="block text-xs font-normal text-gray-400">Código específico del Anexo, si aplica</span>
            </label>
            <input
              type="text"
              name="dian_code"
              value={formData.dian_code}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de cálculo</label>
            <select
              name="calculation_type"
              value={formData.calculation_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CALCULATION_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {formData.calculation_type === 'percentage' ? 'Porcentaje por defecto (%)' : 'Valor por defecto'}
            </label>
            <NumericInput
              name="default_value"
              value={formData.default_value}
              onChange={handleChange}
              decimals={formData.calculation_type === 'percentage' ? 2 : 0}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        </div>

        <div className={`rounded-lg border p-3 ${autoApplyEligible ? 'border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-graphite-2'}`}>
          <label className={`flex items-start gap-2 ${autoApplyEligible ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
            <input
              type="checkbox"
              name="auto_apply"
              checked={formData.auto_apply}
              onChange={handleAutoApplyToggle}
              disabled={!autoApplyEligible}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Aplicar automáticamente a todos los empleados de cada periodo
              <span className="block text-xs font-normal text-gray-400 mt-0.5">
                {autoApplyEligible
                  ? 'No hará falta capturar una novedad manual — se suma solo al liquidar.'
                  : 'Cambie el tipo de cálculo a "Fijo" o "Porcentaje" para poder automatizarlo.'}
              </span>
            </span>
          </label>

          {formData.auto_apply && (
            <div className="mt-3 pl-6">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Categoría DIAN (para automatización)</label>
              <select
                name="dian_category"
                value={formData.dian_category}
                onChange={(e) => { setCustomCategory(false); handleChange(e); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg text-sm"
              >
                {AUTO_APPLY_CATEGORIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Solo categorías de valor simple — horas extra, vacaciones y licencias necesitan datos (fechas, horas)
                que un cálculo automático no puede inventar solos, esas se quedan como novedad manual.
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Orden de despliegue
            <span className="block text-xs font-normal text-gray-400">Controla el orden en la liquidación — menor va primero</span>
          </label>
          <input
            type="number"
            name="sort_order"
            value={formData.sort_order}
            onChange={handleChange}
            className="w-32 px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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

        <label className="flex items-center">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Concepto activo</span>
        </label>

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
            {concept ? 'Actualizar' : 'Crear'} Concepto
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PayrollConceptModal;