// frontend/src/components/customers/CustomerFormModal.jsx
// Formulario completo de cliente (crear / editar), compartido entre el
// listado de Clientes y la ficha del cliente (/customers/:id) para que ambas
// pantallas editen exactamente los mismos campos (tipo de documento DIAN,
// ciudad DIVIPOLA, cupo de crédito, exención de retención, estado...).
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useCustomersStore from '../../store/customersStore';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Input from '../common/Input';
import DianLookupButton, { useDianLookupAvailability } from '../common/DianLookupButton';
import DivipolaCitySelect from '../common/DivipolaCitySelect';
import PhoneCountryCodeSelect, { DEFAULT_COUNTRY_CODE } from '../common/PhoneCountryCodeSelect';
import NumericInput from '../inputs/NumericInput';

// schemeID DIAN — mismos códigos que usa dianKitAdapter.js. El default por
// tipo de cliente se aplica al cambiar "Tipo de Cliente" (ver setCustomerType).
export const DOCUMENT_TYPE_OPTIONS = [
  { value: '13', label: 'Cédula de ciudadanía' },
  { value: '31', label: 'NIT' },
  { value: '22', label: 'Cédula de extranjería' },
  { value: '41', label: 'Pasaporte' },
  { value: '12', label: 'Tarjeta de identidad' },
  { value: '91', label: 'NUIP' },
];

const FORM_EMPTY = {
  customer_type: 'individual', full_name: '', business_name: '', tax_id: '',
  document_type: '13',
  email: '', phone: '', mobile: '', mobile_country_code: DEFAULT_COUNTRY_CODE, address: '',
  city: '', state: '', city_code: '',
  customer_category: '', notes: '', credit_limit: '',
  retention_config: {},
};

const customerToForm = (customer) => ({
  customer_type: customer.customer_type || 'individual',
  // Clientes antiguos pueden tener solo first_name/last_name (la ficha del
  // cliente ya aplicaba este respaldo).
  full_name: customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
  business_name: customer.business_name || '', tax_id: customer.tax_id || '',
  document_type: customer.document_type || (customer.customer_type === 'company' ? '31' : '13'),
  email: customer.email || '', phone: customer.phone || '', mobile: customer.mobile || '',
  mobile_country_code: customer.mobile_country_code || DEFAULT_COUNTRY_CODE,
  address: customer.address || '',
  city: customer.city || '', state: customer.state || '', city_code: customer.city_code || '',
  customer_category: customer.customer_category || '', notes: customer.notes || '',
  is_active: customer.is_active ?? true,
  credit_limit: parseFloat(customer.credit_limit) > 0 ? customer.credit_limit : '',
  // Se preserva tal cual (incluye tasas por-cliente que aún no tienen UI,
  // como reteica_rate); esta pantalla solo edita is_exento.
  retention_config: customer.retention_config || {},
});

/**
 * Props:
 *  - isOpen, onClose
 *  - customer: cliente a editar, o null para crear uno nuevo
 *  - onSaved(savedCustomer): se llama tras guardar con éxito (el modal ya
 *    llamó onClose antes)
 */
export default function CustomerFormModal({ isOpen, onClose, customer = null, onSaved }) {
  const { loading, createCustomer, updateCustomer } = useCustomersStore();
  const [formData, setFormData] = useState(FORM_EMPTY);
  const dianLookupAvailable = useDianLookupAvailability();
  const editingCustomer = customer;

  // Reinicia el formulario cada vez que se abre (o cambia el cliente).
  useEffect(() => {
    if (!isOpen) return;
    setFormData(customer ? customerToForm(customer) : FORM_EMPTY);
  }, [isOpen, customer]);

  // La DIAN solo devuelve nombre y correo de recepción de facturas: el
  // correo no pisa uno que el usuario ya haya escrito.
  const handleDianResult = (data) => {
    setFormData(prev => ({
      ...prev,
      customer_type: data.customer_type || prev.customer_type,
      document_type: data.document_type || prev.document_type,
      tax_id:        data.tax_id        || prev.tax_id,
      full_name:     data.full_name     || prev.full_name,
      business_name: data.business_name || prev.business_name,
      email:         prev.email || data.email || '',
    }));
    toast.success('Datos DIAN cargados. Completa teléfono, dirección y ciudad.');
  };

  // Al cambiar el tipo de cliente, ajusta el tipo de identificación por
  // defecto (empresa → NIT, persona → cédula) — el usuario puede corregirlo.
  const handleCustomerTypeChange = (e) => {
    const customer_type = e.target.value;
    setFormData(prev => ({
      ...prev,
      customer_type,
      document_type: customer_type === 'company' ? '31' : '13',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Cupo vacío = crédito sin tope (el backend solo valida si credit_limit > 0)
      const payload = { ...formData, credit_limit: parseFloat(formData.credit_limit) > 0 ? parseFloat(formData.credit_limit) : 0 };
      let saved;
      if (editingCustomer) { saved = await updateCustomer(editingCustomer.id, payload); toast.success('Cliente actualizado exitosamente'); }
      else { saved = await createCustomer(payload); toast.success('Cliente creado exitosamente'); }
      onClose();
      onSaved?.(saved);
    } catch (err) { toast.error('Error guardando cliente: ' + (err.response?.data?.message || err.message)); }
  };

  const set = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Tipo de Cliente *</label>
            <select value={formData.customer_type} onChange={handleCustomerTypeChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100" required>
              <option value="individual">Persona Natural</option>
              <option value="company">Empresa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Categoría</label>
            <select value={formData.customer_category} onChange={set('customer_category')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100">
              <option value="">Seleccionar...</option>
              <option value="retail">Minorista</option>
              <option value="wholesale">Mayorista</option>
              <option value="vip">VIP</option>
              <option value="regular">Regular</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              {formData.customer_type === 'company' ? 'NIT' : 'Cédula / Documento'}
            </label>
            <div className="flex items-start gap-2">
              <input type="text" value={formData.tax_id} onChange={set('tax_id')}
                placeholder={formData.customer_type === 'company' ? 'Ej: 900072256 o 900072256-1' : 'Ej: 92549045'}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600" />
              {!editingCustomer && dianLookupAvailable && (
                <DianLookupButton documentType={formData.document_type} number={formData.tax_id} onResult={handleDianResult} />
              )}
            </div>
            {editingCustomer && dianLookupAvailable && <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">La consulta DIAN solo está disponible al crear un cliente nuevo.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Tipo de Identificación (DIAN) *</label>
            <select value={formData.document_type} onChange={set('document_type')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100" required>
              {DOCUMENT_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">Usado al facturar electrónicamente a este cliente.</p>
          </div>
        </div>

        <Input label="Nombre Completo *" value={formData.full_name} onChange={set('full_name')} required />

        {formData.customer_type === 'company' && (
          <Input label="Razón Social" value={formData.business_name} onChange={set('business_name')} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Email" type="email" value={formData.email} onChange={set('email')} />
          <Input label="Teléfono" type="tel" value={formData.phone} onChange={set('phone')} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Celular</label>
            <div className="flex gap-2">
              <PhoneCountryCodeSelect value={formData.mobile_country_code} onChange={set('mobile_country_code')} />
              <input type="tel" value={formData.mobile} onChange={set('mobile')}
                placeholder="Ej: 3001234567"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600" />
            </div>
            <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">Se usa para WhatsApp — el indicativo es obligatorio para enviar por Meta.</p>
          </div>
          <Input label="Dirección" value={formData.address} onChange={set('address')} />
        </div>

        <DivipolaCitySelect
          required
          departmentCode={formData.city_code ? formData.city_code.substring(0, 2) : ''}
          cityCode={formData.city_code || ''}
          onChange={({ cityCode, cityName, departmentName }) => {
            setFormData(prev => ({ ...prev, city_code: cityCode, city: cityName, state: departmentName }));
          }}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Cupo de crédito</label>
          <NumericInput value={formData.credit_limit} onChange={set('credit_limit')} placeholder="Sin tope"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600" />
          <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">Saldo máximo que puede deber en ventas a crédito. Vacío = sin tope.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Notas</label>
          <textarea value={formData.notes} onChange={set('notes')} rows="3"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-600"
            placeholder="Notas adicionales sobre el cliente..." />
        </div>

        {editingCustomer && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 dark:bg-graphite-2 dark:border-white/10">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Estado del cliente</p>
              <p className="text-xs text-gray-500 mt-0.5 dark:text-gray-500">
                {formData.is_active ? 'El cliente está activo y puede realizar compras.' : 'El cliente está inactivo.'}
              </p>
            </div>
            <button type="button" onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${formData.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-white/10'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 dark:bg-graphite-2 dark:border-white/10">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Exento de retención</p>
            <p className="text-xs text-gray-500 mt-0.5 dark:text-gray-500">
              Si está activo, este cliente no te aplicará ReteFuente, ReteIVA ni ReteICA al pagarte.
            </p>
          </div>
          <button type="button"
            onClick={() => setFormData(prev => ({ ...prev, retention_config: { ...prev.retention_config, is_exento: !prev.retention_config?.is_exento } }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${formData.retention_config?.is_exento ? 'bg-purple-600' : 'bg-gray-300 dark:bg-white/10'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.retention_config?.is_exento ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t dark:border-white/10">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Guardando...' : editingCustomer ? 'Actualizar' : 'Crear Cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
