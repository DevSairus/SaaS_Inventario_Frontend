// frontend/src/components/payroll/PayrollAdjustmentModal.jsx
//
// Crea una PayrollDocumentAdjustment (Nota de Ajuste — Reemplazar/Eliminar)
// sobre un PayrollDocument ya 'accepted' por la DIAN (con CUNE). Espeja
// createPayrollDocumentAdjustment en el backend: solo pide adjustment_type
// + reason (obligatorio); el resto (predecesor, liquidación, XML, envío) lo
// resuelve payrollAdjustmentService.js del lado del servidor de forma
// fire-and-forget — por eso el store refresca el documento después de
// crear, para reflejar pending -> sending -> accepted/rejected.
import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { usePayrollDocumentsStore } from '../../store/payrollDocumentsStore';
import { ADJUSTMENT_TYPES } from '../../constants/payroll';

const PayrollAdjustmentModal = ({ isOpen, payrollDocumentId, onClose }) => {
  const { createAdjustment, isLoading } = usePayrollDocumentsStore();

  const [adjustmentType, setAdjustmentType] = useState('replace');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAdjustmentType('replace');
      setReason('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('El motivo es obligatorio');
      return;
    }
    const result = await createAdjustment(payrollDocumentId, {
      adjustment_type: adjustmentType,
      reason: reason.trim(),
    });
    if (result) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Nota de Ajuste" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Tipo de ajuste <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ADJUSTMENT_TYPES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAdjustmentType(opt.value)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  adjustmentType === opt.value
                    ? opt.value === 'replace'
                      ? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40'
                      : 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/40'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 dark:border-white/10 dark:text-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {adjustmentType === 'replace'
              ? 'Vuelve a liquidar al empleado con las novedades vigentes del periodo (ej: se corrigió una novedad después de emitir).'
              : 'Elimina el documento soporte — la liquidación queda en ceros ante la DIAN.'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Motivo <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); if (error) setError(''); }}
            rows="3"
            placeholder="Ej: se corrigió el valor de las horas extra reportadas"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 ${
              error ? 'border-red-500' : 'border-gray-300 dark:border-white/10'
            }`}
          />
          {error && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{error}</p>}
        </div>

        <div className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
          El envío a la DIAN queda en proceso tras crear la nota — el estado pasa de "pendiente" a "enviando" y luego a
          "aceptado" o "rechazado"; refresque esta página en unos segundos para ver el resultado final.
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
            Crear Nota de Ajuste
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PayrollAdjustmentModal;
