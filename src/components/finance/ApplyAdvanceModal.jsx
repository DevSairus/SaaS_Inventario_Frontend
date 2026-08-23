// frontend/src/components/finance/ApplyAdvanceModal.jsx
//
// "Aplicar un anticipo (o varios) a una factura" (§3.3 / §5 del plan).
// El backend ya devuelve los anticipos disponibles del cliente ordenados
// FIFO (el más viejo primero) -- acá se sugiere gastarlos en ese orden
// hasta cubrir el saldo pendiente, pero el usuario puede editar cada monto
// o desmarcar un anticipo antes de confirmar (nunca aplicación automática
// y silenciosa, según la decisión de negocio #3 del plan).
import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { customerAdvancesAPI } from '../../api/customerAdvances';
import { formatCurrency } from '../../utils/formatters';
import NumericInput from '../inputs/NumericInput';

const ApplyAdvanceModal = ({ isOpen, onClose, onSuccess, sale }) => {
  const [loading, setLoading] = useState(true);
  const [advances, setAdvances] = useState([]);
  const [selected, setSelected] = useState({}); // { advance_id: amountString }
  const [saving, setSaving] = useState(false);

  const balance = sale ? parseFloat(sale.balance ?? (sale.total_amount - (sale.paid_amount || 0))) : 0;

  useEffect(() => {
    if (isOpen && sale?.customer_id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sale?.customer_id]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await customerAdvancesAPI.getAvailableForCustomer(sale.customer_id);
      const list = res.data.data || [];
      setAdvances(list);

      // Sugerencia FIFO: llenar en orden hasta cubrir el saldo pendiente.
      let remaining = balance;
      const initial = {};
      for (const adv of list) {
        if (remaining <= 0) break;
        const toApply = Math.min(parseFloat(adv.balance), remaining);
        if (toApply > 0) {
          initial[adv.id] = String(toApply);
          remaining -= toApply;
        }
      }
      setSelected(initial);
    } catch {
      toast.error('Error cargando anticipos disponibles');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdvance = (advance, checked) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (checked) next[advance.id] = prev[advance.id] || String(Math.min(parseFloat(advance.balance), remainingAfter(advance.id)));
      else delete next[advance.id];
      return next;
    });
  };

  const updateAmount = (advanceId, value) => {
    setSelected((prev) => ({ ...prev, [advanceId]: value }));
  };

  const remainingAfter = (excludeId) =>
    Math.max(balance - totalSelected(excludeId), 0);

  const totalSelected = (excludeId) =>
    Object.entries(selected).reduce((sum, [id, amt]) => sum + (id === excludeId ? 0 : parseFloat(amt || 0)), 0);

  const total = Object.values(selected).reduce((sum, amt) => sum + parseFloat(amt || 0), 0);
  const covers = Math.abs(total - balance) < 1;
  const overBalance = total > balance + 0.01;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const applications = Object.entries(selected)
      .map(([advance_id, amount]) => ({ advance_id, amount: parseFloat(amount) }))
      .filter((a) => a.amount > 0);

    if (applications.length === 0) {
      toast.error('Selecciona al menos un anticipo');
      return;
    }
    if (overBalance) {
      toast.error('El total a aplicar supera el saldo pendiente de la factura');
      return;
    }

    setSaving(true);
    try {
      await customerAdvancesAPI.applyToSale(sale.id, applications);
      toast.success('Anticipo(s) aplicado(s) exitosamente');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error aplicando el anticipo');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !sale) return null;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Aplicar Anticipo — {sale.sale_number}
                </h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Cliente: <strong>{sale.customer_name}</strong> · Saldo pendiente:{' '}
                <span className="font-bold text-red-600">{formatCurrency(balance)}</span>
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" /> Cargando anticipos disponibles...
                </div>
              ) : advances.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  Este cliente no tiene anticipos disponibles.
                </div>
              ) : (
                <div className="space-y-2">
                  {advances.map((adv) => {
                    const isChecked = selected[adv.id] !== undefined;
                    return (
                      <div
                        key={adv.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${isChecked ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleAdvance(adv, e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{adv.advance_number}</div>
                          <div className="text-xs text-gray-500">
                            Recibido {new Date(adv.received_date).toLocaleDateString('es-CO')} · Disponible {formatCurrency(adv.balance)}
                          </div>
                          {adv.reference_note && (
                            <div className="text-xs text-gray-400 italic truncate">{adv.reference_note}</div>
                          )}
                        </div>
                        <div className="w-32 flex-shrink-0">
                          <NumericInput
                            value={selected[adv.id] || ''}
                            onChange={(e) => updateAmount(adv.id, e.target.value)}
                            disabled={!isChecked}
                            className="w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm text-right focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 border-2 text-sm font-semibold mt-3 ${
                    covers ? 'bg-green-50 border-green-300 text-green-800'
                      : overBalance ? 'bg-red-50 border-red-300 text-red-800'
                      : 'bg-amber-50 border-amber-300 text-amber-800'
                  }`}>
                    <span>{covers ? 'Cubre el saldo pendiente' : overBalance ? 'Supera el saldo pendiente' : 'Total a aplicar'}</span>
                    <span>{formatCurrency(total)} / {formatCurrency(balance)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={saving || loading || overBalance || total <= 0}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {saving ? 'Aplicando...' : 'Aplicar Anticipo'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplyAdvanceModal;
