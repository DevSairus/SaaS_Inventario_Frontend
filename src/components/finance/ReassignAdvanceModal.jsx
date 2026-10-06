// frontend/src/components/finance/ReassignAdvanceModal.jsx
//
// Reasignar todo o parte del saldo de un anticipo a otro cliente. Solo lo ve
// personal de contabilidad (admin/accountant); el backend lo vuelve a
// validar con checkRole. No mueve caja: el saldo pasa a un anticipo nuevo
// del cliente destino.
import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import customersApi from '../../api/customers';
import { customerAdvancesAPI } from '../../api/customerAdvances';
import NumericInput from '../inputs/NumericInput';
import { formatCurrency } from '../../utils/formatters';

const customerLabel = (c) =>
  c.business_name || c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();

const ReassignAdvanceModal = ({ advance, onClose, onSuccess }) => {
  const [customer, setCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef(null);

  const [amount, setAmount] = useState(advance.balance);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!customerSearch || customerSearch.length < 2) { setCustomerResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await customersApi.getAll({ search: customerSearch, limit: 10 });
        const list = res.data.data || res.data || [];
        setCustomerResults(list.filter((c) => c.id !== advance.customer_id));
      } catch {
        setCustomerResults([]);
      }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [customerSearch, advance.customer_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer?.id) { toast.error('Selecciona el cliente destino'); return; }
    const value = parseFloat(amount);
    if (!value || value <= 0) { toast.error('Ingresa un monto válido'); return; }
    if (value > parseFloat(advance.balance) + 0.01) { toast.error('El monto supera el saldo disponible'); return; }
    if (!reason.trim()) { toast.error('El motivo es obligatorio'); return; }

    setSaving(true);
    try {
      const res = await customerAdvancesAPI.reassign(advance.id, { customer_id: customer.id, amount: value, reason });
      toast.success(res.data?.message || 'Anticipo reasignado');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error reasignando el anticipo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-visible shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 rounded-t-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Reasignar anticipo {advance.advance_number}</h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Saldo disponible: <span className="font-medium text-gray-900">{formatCurrency(advance.balance)}</span>.
                El monto pasa a un anticipo nuevo del cliente destino; no mueve caja.
              </p>

              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">Cliente destino</label>
                  <div className="relative mt-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => { setCustomerSearch(e.target.value); setCustomer(null); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Buscar por nombre o documento..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {showDropdown && customerResults.length > 0 && !customer && (
                    <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-48 rounded-md py-1 text-sm overflow-auto border border-gray-200">
                      {customerResults.map((c) => (
                        <li
                          key={c.id}
                          onClick={() => { setCustomer(c); setCustomerSearch(customerLabel(c)); setShowDropdown(false); }}
                          className="cursor-pointer select-none px-3 py-2 hover:bg-blue-50"
                        >
                          <div className="font-medium text-gray-900">{customerLabel(c)}</div>
                          {c.tax_id && <div className="text-xs text-gray-500">{c.tax_id}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Monto a reasignar</label>
                  <NumericInput
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Motivo</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Ej: el anticipo lo pagó el cliente equivocado / la factura sale a nombre de la empresa"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2 rounded-b-lg">
              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
              >
                {saving ? 'Reasignando...' : 'Reasignar'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto"
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

export default ReassignAdvanceModal;
