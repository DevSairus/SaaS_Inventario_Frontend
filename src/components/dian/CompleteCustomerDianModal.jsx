// frontend/src/components/dian/CompleteCustomerDianModal.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import DivipolaCitySelect from '../common/DivipolaCitySelect';
import customersApi from '../../api/customers';

const DOCUMENT_TYPE_OPTIONS = [
  { value: '13', label: 'Cédula de ciudadanía' },
  { value: '31', label: 'NIT' },
  { value: '22', label: 'Cédula de extranjería' },
  { value: '41', label: 'Pasaporte' },
  { value: '12', label: 'Tarjeta de identidad' },
  { value: '91', label: 'NUIP' },
];

/**
 * Se abre cuando el backend responde 422 con code: 'DIAN_CUSTOMER_INCOMPLETE'
 * (sales.controller.js#confirm, dian.controller.js#sendInvoice/sendCreditNote/
 * sendDebitNote, workOrders.controller.js#generateSale) -- el cliente no
 * traía ciudad DIVIPOLA o tipo de identificación y no se puede facturar sin
 * eso (ver services/dian/customerDianReadiness.js). Solo pide esos dos
 * campos, no el formulario completo del cliente, para no interrumpir más de
 * lo necesario un flujo que ya estaba a mitad de facturar.
 *
 * Props:
 *  open          — boolean
 *  customerId    — id del cliente a completar
 *  missingFields — array de keys ('customer_city_code' | 'customer_document_type'),
 *                  solo para decidir qué resaltar; igual se muestran ambos campos
 *  onClose       — cierra sin guardar
 *  onCompleted(customer) — cliente ya actualizado; quien abrió el modal
 *                  decide si reintentar la acción que lo disparó
 */
export default function CompleteCustomerDianModal({
  open,
  customerId,
  missingFields = [],
  onClose,
  onCompleted,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [documentType, setDocumentType] = useState('13');
  const [cityCode, setCityCode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  useEffect(() => {
    if (!open || !customerId) return;
    let mounted = true;
    setLoading(true);
    customersApi.getById(customerId)
      .then(res => {
        if (!mounted) return;
        const c = res.data?.data || {};
        setCustomerName(c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.business_name || 'Cliente');
        setDocumentType(c.document_type || '13');
        setCityCode(c.city_code || '');
        setCity(c.city || '');
        setState(c.state || '');
      })
      .catch(() => { if (mounted) toast.error('No se pudo cargar el cliente'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [open, customerId]);

  const handleSave = async () => {
    if (!cityCode) return toast.error('Selecciona la ciudad del cliente');
    if (!documentType) return toast.error('Selecciona el tipo de identificación');
    setSaving(true);
    try {
      const res = await customersApi.update(customerId, {
        document_type: documentType,
        city_code: cityCode,
        city,
        state,
      });
      toast.success('Datos del cliente actualizados');
      onCompleted?.(res.data?.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar el cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Completar datos DIAN del cliente" size="sm">
      {loading ? (
        <p className="text-sm text-gray-500">Cargando cliente...</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Para facturar electrónicamente a <strong>{customerName}</strong> hace falta
            {missingFields.includes('customer_document_type') && !missingFields.includes('customer_city_code')
              ? ' el tipo de identificación.'
              : missingFields.includes('customer_city_code') && !missingFields.includes('customer_document_type')
              ? ' la ciudad.'
              : ' el tipo de identificación y la ciudad.'}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo de identificación<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select
              value={documentType}
              onChange={e => setDocumentType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:bg-graphite-2 dark:border-white/10 dark:text-gray-100"
            >
              {DOCUMENT_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <DivipolaCitySelect
            required
            departmentCode={cityCode ? cityCode.substring(0, 2) : ''}
            cityCode={cityCode}
            onChange={({ cityCode: cc, cityName, departmentName }) => {
              setCityCode(cc); setCity(cityName); setState(departmentName);
            }}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar y reintentar'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
