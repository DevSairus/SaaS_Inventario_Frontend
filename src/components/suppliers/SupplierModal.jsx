import React, { useState, useEffect } from 'react';
import { useSuppliersStore } from '../../store/suppliersStore';
import toast from 'react-hot-toast';
import NumericInput from '../inputs/NumericInput';
import DivipolaCitySelect from '../common/DivipolaCitySelect';
import SupplierRetentionsEditor from './SupplierRetentionsEditor';
import useRetentionCatalog from '../../hooks/useRetentionCatalog';
import { FUND_TYPE_LABELS, resetFundSuppliersCache } from '../payroll/FundSupplierSelect';

const DOCUMENT_TYPE_OPTIONS = [
  { value: '13', label: 'Cédula de ciudadanía' },
  { value: '31', label: 'NIT' },
  { value: '22', label: 'Cédula de extranjería' },
  { value: '41', label: 'Pasaporte' },
  { value: '12', label: 'Tarjeta de identidad' },
  { value: '91', label: 'NUIP' },
];

const SupplierModal = ({ supplier, onClose }) => {
  const { createSupplier, updateSupplier, isLoading } = useSuppliersStore();

  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    tax_id: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    country: 'Colombia',
    postal_code: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    payment_terms: '',
    credit_limit: 0,
    website: '',
    notes: '',
    is_active: true,
    retention_config: {},
    // Clasificación fiscal (Documento Soporte DIAN)
    person_type: '',
    tax_regime: '',
    fiscal_responsibilities: '',
    is_obligated_to_invoice: true,
    city_code: '',
    document_type: '',
    payroll_fund_types: [],
  });

  const [errors, setErrors] = useState({});
  const { concepts: retentionConcepts } = useRetentionCatalog();

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        business_name: supplier.business_name || '',
        tax_id: supplier.tax_id || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        mobile: supplier.mobile || '',
        address: supplier.address || '',
        city: supplier.city || '',
        state: supplier.state || '',
        country: supplier.country || 'Colombia',
        postal_code: supplier.postal_code || '',
        contact_name: supplier.contact_name || '',
        contact_phone: supplier.contact_phone || '',
        contact_email: supplier.contact_email || '',
        payment_terms: supplier.payment_terms || '',
        credit_limit: supplier.credit_limit || 0,
        website: supplier.website || '',
        notes: supplier.notes || '',
        is_active: supplier.is_active !== undefined ? supplier.is_active : true,
        retention_config: supplier.retention_config || {},
        person_type: supplier.person_type || '',
        tax_regime: supplier.tax_regime || '',
        fiscal_responsibilities: Array.isArray(supplier.fiscal_responsibilities)
          ? supplier.fiscal_responsibilities.join(', ')
          : (supplier.fiscal_responsibilities || ''),
        is_obligated_to_invoice: supplier.is_obligated_to_invoice !== undefined
          ? supplier.is_obligated_to_invoice
          : true,
        city_code: supplier.city_code || '',
        document_type: supplier.document_type || '',
        payroll_fund_types: Array.isArray(supplier.payroll_fund_types) ? supplier.payroll_fund_types : [],
      });
    }
  }, [supplier]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (formData.contact_email && !/\S+@\S+\.\S+/.test(formData.contact_email)) {
      newErrors.contact_email = 'Email de contacto inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const dataToSend = {
      ...formData,
      credit_limit: parseFloat(formData.credit_limit) || 0,
      person_type: formData.person_type || null,
      tax_regime: formData.tax_regime || null,
      fiscal_responsibilities: formData.fiscal_responsibilities
        ? formData.fiscal_responsibilities.split(',').map(s => s.trim()).filter(Boolean)
        : [],
    };

    const success = supplier
      ? await updateSupplier(supplier.id, dataToSend)
      : await createSupplier(dataToSend);

    if (success) {
      resetFundSuppliersCache();
      toast.success(supplier ? 'Proveedor actualizado exitosamente' : 'Proveedor creado exitosamente');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-graphite rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-graphite border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            {supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Información General */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Nombre del proveedor"
                />
                {errors.name && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón Social
                </label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Razón social"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIT/RUT
                </label>
                <input
                  type="text"
                  name="tax_id"
                  value={formData.tax_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="NIT o RUT"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="email@ejemplo.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Teléfono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Móvil
                </label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Móvil"
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Dirección</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dirección completa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ciudad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento/Estado
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Departamento o Estado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  País
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="País"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código Postal
                </label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Código postal"
                />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Información de Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de Contacto
                </label>
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre del contacto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Teléfono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de Contacto
                </label>
                <input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.contact_email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="email@ejemplo.com"
                />
                {errors.contact_email && <p className="text-red-500 text-sm mt-1">{errors.contact_email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sitio Web
                </label>
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://ejemplo.com"
                />
              </div>
            </div>
          </div>

          {/* Clasificación Fiscal (Documento Soporte DIAN) — sin esto el
              sistema no sabe automáticamente cuándo una compra a este
              proveedor requiere Documento Soporte en vez de esperar una
              factura de él (Resolución DIAN 000167 de 2021). */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Clasificación Fiscal (DIAN)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Persona
                </label>
                <select
                  name="person_type"
                  value={formData.person_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin especificar</option>
                  <option value="natural">Persona Natural</option>
                  <option value="juridica">Persona Jurídica</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Régimen Tributario
                </label>
                <select
                  name="tax_regime"
                  value={formData.tax_regime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin especificar</option>
                  <option value="comun">Régimen Común</option>
                  <option value="simple">Régimen Simple</option>
                  <option value="no_responsable">No Responsable de IVA</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsabilidades Fiscales DIAN
                </label>
                <input
                  type="text"
                  value={formData.fiscal_responsibilities}
                  onChange={(e) => setFormData(prev => ({ ...prev, fiscal_responsibilities: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: R-99-PN (separadas por coma si hay más de una)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Identificación
                </label>
                <select
                  name="document_type"
                  value={formData.document_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin especificar</option>
                  {DOCUMENT_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ciudad DIVIPOLA — sin esto el Documento Soporte cae en el
                fallback hardcodeado de Bogotá D.C./Cundinamarca (ver
                LEEME.md Fase 2, mismo bug ya corregido para Customer). */}
            <div className="mt-4">
              <DivipolaCitySelect
                departmentCode={formData.city_code ? formData.city_code.substring(0, 2) : ''}
                cityCode={formData.city_code}
                onChange={({ cityCode, cityName, departmentName }) => {
                  setFormData(prev => ({
                    ...prev,
                    city_code: cityCode,
                    city: cityName || prev.city,
                    state: departmentName || prev.state,
                  }));
                }}
              />
              <p className="text-xs text-gray-400 mt-1">
                Necesaria para emitir Documento Soporte a este proveedor — independiente del campo
                "Ciudad" de texto libre en Dirección.
              </p>
            </div>

            <label className="flex items-start mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <input
                type="checkbox"
                checked={!formData.is_obligated_to_invoice}
                onChange={(e) => setFormData(prev => ({ ...prev, is_obligated_to_invoice: !e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5"
              />
              <span className="ml-2 text-sm text-gray-700">
                Este proveedor NO está obligado a facturar
                <span className="block text-xs text-gray-500 mt-0.5">
                  Márcalo si es una persona natural del régimen simplificado histórico, informal, o
                  cualquier proveedor sin resolución de facturación propia. Las compras a este proveedor
                  van a requerir que emitas un Documento Soporte en vez de esperar su factura.
                </span>
              </span>
            </label>

            {/* Entidad de nómina: solo los proveedores marcados aparecen en los
                selectores de EPS, pensión, ARL, etc. de Nómina. */}
            <div className="mt-4 border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700">Entidad de nómina</p>
              <p className="text-xs text-gray-500 mb-2">Marca qué tipo de entidad es, para que aparezca al configurar empleados y la nómina.</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {Object.entries(FUND_TYPE_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.payroll_fund_types.includes(key)}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        payroll_fund_types: e.target.checked
                          ? [...prev.payroll_fund_types, key]
                          : prev.payroll_fund_types.filter(t => t !== key),
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Términos Comerciales */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Términos Comerciales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Términos de Pago
                </label>
                <input
                  type="text"
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 30 días, Contado, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Límite de Crédito
                </label>
                <NumericInput
                  name="credit_limit"
                  value={formData.credit_limit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notas adicionales sobre el proveedor"
            />
          </div>

          {/* Estado */}
          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="ml-2 text-sm text-gray-700">Proveedor Activo</span>
            </label>
          </div>

          {/* Perfil tributario para retenciones (ver retentionEngine.service.js
              en el backend). La TARIFA de ReteFuente no se configura aquí: sale
              del concepto del producto/servicio comprado. Aquí solo van los
              atributos del proveedor que deciden si aplica y con qué tarifa. */}
          <div className="mb-6 space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Perfil tributario (retenciones)</h3>
            {(() => {
              const rc = formData.retention_config || {};
              const setRc = (field, value) => setFormData(prev => ({ ...prev, retention_config: { ...prev.retention_config, [field]: value } }));
              const Check = ({ field, title, hint, disabled }) => (
                <label className={`flex items-start ${disabled ? 'opacity-50' : ''}`}>
                  <input type="checkbox" disabled={disabled} checked={!!rc[field]} onChange={(e) => setRc(field, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5" />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {title}
                    <span className="block text-xs text-gray-400">{hint}</span>
                  </span>
                </label>
              );
              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Check field="is_autoretenedor" title="Autorretenedor de renta"
                      hint="La retención en la fuente por renta queda en $0 (él mismo se retiene). ReteIVA y ReteICA sí aplican." disabled={rc.is_exento} />
                    <Check field="is_gran_contribuyente" title="Gran contribuyente"
                      hint="No se le practica ReteIVA." disabled={rc.is_exento} />
                    {formData.person_type === 'natural' && (
                      <label className={`flex items-start ${rc.is_exento ? 'opacity-50' : ''}`}>
                        <input type="checkbox" disabled={rc.is_exento} checked={rc.is_declarante !== false}
                          onChange={(e) => setRc('is_declarante', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5" />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Declarante de renta
                          <span className="block text-xs text-gray-400">Las personas naturales no declarantes tienen tarifas de ReteFuente mayores (ej. compras 3.5% en vez de 2.5%).</span>
                        </span>
                      </label>
                    )}
                    <Check field="is_exento" title="Exento de toda retención" hint="No se le practica ninguna retención (casos especiales)." />
                  </div>

                  <p className="text-xs text-gray-500 bg-gray-50 dark:bg-white/5 rounded-lg p-2">
                    Estos datos aparecen en el RUT del proveedor. El tipo de persona y el régimen se toman de la Clasificación
                    Fiscal de arriba. Con esto, cada compra calcula sola sus retenciones.
                  </p>

                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-600 dark:text-gray-400">Opciones avanzadas (para tu contador)</summary>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Concepto de ReteFuente por defecto</label>
                      <select value={rc.default_concept_id || ''} onChange={(e) => setRc('default_concept_id', e.target.value || null)} disabled={rc.is_exento}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm dark:bg-graphite-2 dark:text-gray-100">
                        <option value="">Según el producto (recomendado)</option>
                        {retentionConcepts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Solo se usa si el producto y su categoría no tienen concepto. Útil para proveedores de un solo tipo (ej. honorarios).</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">ReteICA (tarifa municipal)</h4>
                    <SupplierRetentionsEditor
                      retentions={(rc.retentions || []).filter((r) => r.code === '06')}
                      disabled={!!rc.is_exento}
                      onChange={(list) => setRc('retentions', list)}
                    />
                  </div>
                  </details>
                </>
              );
            })()}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isLoading}
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {supplier ? 'Actualizar' : 'Crear'} Proveedor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierModal;