// frontend/src/components/dian/AdHocSellerModal.jsx
/**
 * Se abre cuando se intenta generar un Documento Soporte para un gasto que
 * no tiene supplier_id (decisión del usuario en Documento-Soporte-Plan-v2.md
 * §5, pregunta 4: "se puede capturar adhoc, pero podría crearlo con esos
 * datos"). Captura el mismo set de campos que exige
 * supplierDianReadiness/buildSellerFromAdHoc (dianKitAdapter.js) — sin
 * tax_id/person_type/city_code el backend rechaza el envío con
 * DIAN_SUPPLIER_INCOMPLETE.
 *
 * Dos caminos al guardar:
 *  - "Crear proveedor con estos datos" marcado → crea el Supplier, lo
 *    vincula al gasto (expense.supplier_id) y notifica onSupplierCreated;
 *    quien abrió el modal reintenta el envío ya sin datos ad-hoc.
 *  - Sin marcar → onSubmitAdHoc(seller) con los datos sueltos, para un
 *    envío puntual sin crear ficha de proveedor.
 *
 * Props:
 *  open, expenseId, onClose
 *  onSubmitAdHoc(seller)
 *  onSupplierCreated(supplier)
 *  submitting — bool, deshabilita los botones mientras el padre envía
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import DivipolaCitySelect from '../common/DivipolaCitySelect';
import { suppliersAPI } from '../../api/suppliers';
import { expensesAPI } from '../../api/expenses';

const DOCUMENT_TYPE_OPTIONS = [
  { value: '13', label: 'Cédula de ciudadanía' },
  { value: '31', label: 'NIT' },
  { value: '22', label: 'Cédula de extranjería' },
  { value: '41', label: 'Pasaporte' },
  { value: '12', label: 'Tarjeta de identidad' },
  { value: '91', label: 'NUIP' },
];

export default function AdHocSellerModal({
  open,
  expenseId,
  onClose,
  onSubmitAdHoc,
  onSupplierCreated,
  submitting = false,
}) {
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [personType, setPersonType] = useState('natural');
  const [documentType, setDocumentType] = useState('13');
  const [cityCode, setCityCode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [createSupplier, setCreateSupplier] = useState(false);
  const [saving, setSaving] = useState(false);

  const busy = submitting || saving;

  const validate = () => {
    if (!name.trim()) return 'El nombre del vendedor es obligatorio';
    if (!taxId.trim()) return 'El número de identificación es obligatorio';
    if (!cityCode) return 'Selecciona la ciudad del vendedor';
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) return toast.error(error);

    const seller = {
      name: name.trim(),
      tax_id: taxId.trim(),
      person_type: personType,
      document_type: documentType,
      city_code: cityCode,
      city,
      state,
      address: address || undefined,
      email: email || undefined,
    };

    if (!createSupplier) {
      onSubmitAdHoc(seller);
      return;
    }

    setSaving(true);
    try {
      const supplierRes = await suppliersAPI.create({
        name: seller.name,
        tax_id: seller.tax_id,
        person_type: seller.person_type,
        document_type: seller.document_type,
        city_code: seller.city_code,
        city: seller.city,
        state: seller.state,
        address: seller.address || '',
        email: seller.email || '',
        country: 'Colombia',
        is_obligated_to_invoice: false,
      });
      const supplier = supplierRes.data;
      await expensesAPI.update(expenseId, { supplier_id: supplier.id });
      toast.success('Proveedor creado y vinculado al gasto');
      onSupplierCreated(supplier);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo crear el proveedor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Datos del vendedor" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Este gasto no tiene un proveedor registrado. Captura los datos del vendedor
          para generar el Documento Soporte.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre / Razón social<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Nombre del vendedor"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Identificación<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Cédula o NIT"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de persona</label>
            <select
              value={personType}
              onChange={e => setPersonType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="natural">Natural</option>
              <option value="juridica">Jurídica</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de identificación</label>
          <select
            value={documentType}
            onChange={e => setDocumentType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Opcional"
            />
          </div>
        </div>

        <label className="flex items-start bg-blue-50 border border-blue-200 rounded-lg p-3">
          <input
            type="checkbox"
            checked={createSupplier}
            onChange={e => setCreateSupplier(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5"
          />
          <span className="ml-2 text-sm text-gray-700">
            Crear proveedor con estos datos
            <span className="block text-xs text-gray-500 mt-0.5">
              Se guarda como proveedor no obligado a facturar y queda vinculado a este gasto,
              para no capturarlo de nuevo la próxima vez.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={busy}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={busy}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? 'Procesando...' : createSupplier ? 'Crear y generar' : 'Generar Documento Soporte'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
