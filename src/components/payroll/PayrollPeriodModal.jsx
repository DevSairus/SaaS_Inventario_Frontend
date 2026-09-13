// frontend/src/components/payroll/PayrollPeriodModal.jsx
//
// Modal de creación/edición de PayrollPeriod. Requeridos por el backend
// (payrollPeriods.controller.js): start_date, end_date (end >= start).
// branch_id/payment_date/notes son opcionales. El status SIEMPRE nace
// 'abierto' y solo cambia por el endpoint dedicado (PayrollPeriodsPage /
// PayrollPeriodDetailPage), nunca desde este modal — por eso ni se muestra
// aquí, igual criterio que updatePayrollPeriod() en el backend, que borra
// `status` del body si viniera.
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import { usePayrollPeriodsStore } from '../../store/payrollPeriodsStore';
import useBranchStore from '../../store/branchStore';
import { payrollPeriodsAPI } from '../../api/payroll';
import { PERIOD_TYPES } from '../../constants/payroll';
import { SparklesIcon } from '@heroicons/react/24/outline';

const emptyForm = {
  branch_id: '',
  period_type: 'mensual',
  start_date: '',
  end_date: '',
  payment_date: '',
  notes: '',
};

const PayrollPeriodModal = ({ isOpen, period, onClose }) => {
  const { createPeriod, updatePeriod, isLoading } = usePayrollPeriodsStore();
  const { branches, fetchBranches, loaded: branchesLoaded } = useBranchStore();

  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  // Si el usuario ya tocó las fechas a mano, no se le pisan con una nueva
  // sugerencia automática al cambiar sede/tipo — solo se vuelve a sugerir
  // si lo pide explícitamente con el botón.
  const [datesTouched, setDatesTouched] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const applySuggestion = useCallback(async ({ force = false } = {}) => {
    if (period) return; // solo tiene sentido al crear, no al editar
    if (datesTouched && !force) return;
    setSuggesting(true);
    try {
      const response = await payrollPeriodsAPI.suggestNext({
        branch_id: formData.branch_id || undefined,
        period_type: formData.period_type,
      });
      setFormData((prev) => ({
        ...prev,
        start_date: response.data.start_date,
        end_date: response.data.end_date,
        payment_date: response.data.payment_date,
      }));
    } catch {
      // Silencioso — es solo una sugerencia, el usuario puede seguir
      // digitando las fechas a mano si esto falla.
    } finally {
      setSuggesting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, datesTouched, formData.branch_id, formData.period_type]);

  useEffect(() => {
    if (!branchesLoaded) fetchBranches();
  }, [branchesLoaded]);

  useEffect(() => {
    if (period) {
      setFormData({
        branch_id: period.branch_id || '',
        period_type: period.period_type || 'mensual',
        start_date: (period.start_date || '').slice(0, 10),
        end_date: (period.end_date || '').slice(0, 10),
        payment_date: (period.payment_date || '').slice(0, 10),
        notes: period.notes || '',
      });
      setDatesTouched(true); // en edición nunca se autosugiere por encima
    } else {
      setFormData(emptyForm);
      setDatesTouched(false);
    }
    setErrors({});
  }, [period, isOpen]);

  // Autosugerir al abrir en modo creación, y de nuevo cada vez que cambie
  // sede o tipo de periodo — mientras el usuario no haya tocado las fechas.
  useEffect(() => {
    if (isOpen && !period) applySuggestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, period, formData.branch_id, formData.period_type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (['start_date', 'end_date', 'payment_date'].includes(name)) setDatesTouched(true);
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.start_date) newErrors.start_date = 'La fecha de inicio es requerida';
    if (!formData.end_date) newErrors.end_date = 'La fecha de fin es requerida';
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      newErrors.end_date = 'No puede ser anterior a la fecha de inicio';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const dataToSend = {
      branch_id: formData.branch_id || null,
      period_type: formData.period_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      payment_date: formData.payment_date || null,
      notes: formData.notes.trim() || null,
    };

    const result = period
      ? await updatePeriod(period.id, dataToSend)
      : await createPeriod(dataToSend);

    if (result) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={period ? 'Editar Periodo' : 'Nuevo Periodo de Nómina'} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {period && period.status !== 'abierto' && (
          <div className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
            Este periodo está en estado <strong>{period.status}</strong>. El backend solo permite editar
            periodos en estado "abierto" — el envío se rechazará si ya avanzó.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sede</label>
            <select
              name="branch_id"
              value={formData.branch_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas / sin sede específica</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de periodo</label>
            <select
              name="period_type"
              value={formData.period_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PERIOD_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha inicio <span className="text-red-500">*</span>
              </label>
              {!period && (
                <button
                  type="button"
                  onClick={() => applySuggestion({ force: true })}
                  disabled={suggesting}
                  title="Volver a sugerir fechas según el último periodo"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  <SparklesIcon className={`h-3.5 w-3.5 ${suggesting ? 'animate-pulse' : ''}`} />
                  Sugerir
                </button>
              )}
            </div>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 ${
                errors.start_date ? 'border-red-500' : 'border-gray-300 dark:border-white/10'
              }`}
            />
            {errors.start_date && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.start_date}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha fin <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 ${
                errors.end_date ? 'border-red-500' : 'border-gray-300 dark:border-white/10'
              }`}
            />
            {errors.end_date && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.end_date}</p>}
          </div>
        </div>

        {!period && !datesTouched && (formData.start_date || formData.end_date) && (
          <p className="text-xs text-blue-500 -mt-3">
            Fechas sugeridas automáticamente a partir del último periodo — puedes ajustarlas antes de crear.
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fecha de pago
            <span className="block text-xs font-normal text-gray-400">Opcional — fecha en que se paga la nómina de este periodo</span>
          </label>
          <input
            type="date"
            name="payment_date"
            value={formData.payment_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            {period ? 'Actualizar' : 'Crear'} Periodo
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PayrollPeriodModal;
