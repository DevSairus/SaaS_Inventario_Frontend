// frontend/src/components/finance/RegisterAdvanceModal.jsx
//
// Modal reutilizable para "Recibir un anticipo" (caso de uso §3.1 del plan).
// Se usa tanto desde CustomerAdvancesPage.jsx (cliente se busca) como desde
// CustomerDetailPage.jsx (cliente ya viene fijo -- presetCustomer).
import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import customersApi from '../../api/customers';
import { customerAdvancesAPI } from '../../api/customerAdvances';
import NumericInput from '../inputs/NumericInput';

const METHODS = ['Efectivo', 'Transferencia', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Cheque'];

const RegisterAdvanceModal = ({ isOpen, onClose, onSuccess, presetCustomer = null }) => {
  const [customer, setCustomer] = useState(presetCustomer);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef(null);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Efectivo');
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNote, setReferenceNote] = useState('');
  const [triggersIva, setTriggersIva] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCustomer(presetCustomer);
      setCustomerSearch(presetCustomer ? (presetCustomer.name || '') : '');
      setAmount('');
      setMethod('Efectivo');
      setReceivedDate(new Date().toISOString().slice(0, 10));
      setReferenceNote('');
      setTriggersIva(false);
    }
  }, [isOpen, presetCustomer]);

  useEffect(() => {
    if (presetCustomer) return; // cliente fijo, no buscar
    if (!customerSearch || customerSearch.length < 2) { setCustomerResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await customersApi.getAll({ search: customerSearch, limit: 10 });
        setCustomerResults(res.data.data || res.data || []);
      } catch {
        setCustomerResults([]);
      }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [customerSearch, presetCustomer]);

  const customerLabel = (c) =>
    c.business_name || c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer?.id) {
      toast.error('Selecciona el cliente');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    setSaving(true);
    try {
      await customerAdvancesAPI.create({
        customer_id: customer.id,
        amount: parseFloat(amount),
        method,
        received_date: receivedDate,
        reference_note: referenceNote || undefined,
        triggers_iva: triggersIva,
      });
      toast.success('Anticipo registrado exitosamente');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error registrando el anticipo');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Registrar Anticipo</h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Cliente */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">Cliente</label>
                  {presetCustomer ? (
                    <div className="mt-1 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700">
                      {presetCustomer.name}
                    </div>
                  ) : (
                    <>
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
                              onClick={() => {
                                setCustomer(c);
                                setCustomerSearch(customerLabel(c));
                                setShowDropdown(false);
                              }}
                              className="cursor-pointer select-none px-3 py-2 hover:bg-blue-50"
                            >
                              <div className="font-medium text-gray-900">{customerLabel(c)}</div>
                              {c.tax_id && <div className="text-xs text-gray-500">{c.tax_id}</div>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>

                {/* Monto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monto recibido</label>
                  <NumericInput
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Método</label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {METHODS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha recibido</label>
                    <input
                      type="date"
                      value={receivedDate}
                      onChange={(e) => setReceivedDate(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Nota de referencia (opcional)</label>
                  <textarea
                    value={referenceNote}
                    onChange={(e) => setReferenceNote(e.target.value)}
                    rows={2}
                    placeholder='Ej. "Separado para moto Pulsar NS200"'
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <label className="flex items-start gap-2 text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                  <input
                    type="checkbox"
                    checked={triggersIva}
                    onChange={(e) => setTriggersIva(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span>
                    Es un anticipo para un <strong>servicio</strong> (no un bien/producto).
                    <span className="block text-xs text-amber-700 mt-0.5">
                      Puede causar IVA desde hoy — confírmalo con tu contador.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {saving ? 'Guardando...' : 'Registrar Anticipo'}
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

export default RegisterAdvanceModal;
