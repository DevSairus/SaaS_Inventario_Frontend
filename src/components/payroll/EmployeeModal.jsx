// frontend/src/components/payroll/EmployeeModal.jsx
//
// Modal de creación/edición de Employee — mismo patrón que SupplierModal.jsx
// (overlay fijo + tarjeta blanca con secciones), adaptado a los campos
// laborales/DIAN del Anexo Técnico de Nómina Electrónica. Requeridos por el
// backend (employees.controller.js#createEmployee): document_number,
// first_name, first_surname, hire_date — el resto tiene defaults de fábrica.
import React, { useState, useEffect } from 'react';
import { useEmployeesStore } from '../../store/employeesStore';
import useBranchStore from '../../store/branchStore';
import NumericInput from '../inputs/NumericInput';
import DivipolaCitySelect from '../common/DivipolaCitySelect';
import {
  DOCUMENT_TYPES,
  CONTRACT_TYPES,
  WORKER_TYPES,
  SALARY_TYPES,
  PAYMENT_METHODS,
  PAYMENT_FORMS,
  ACCOUNT_TYPES,
  PERIOD_TYPES,
} from '../../constants/payroll';

const emptyForm = {
  document_type: '13',
  document_number: '',
  first_name: '',
  other_names: '',
  first_surname: '',
  second_surname: '',
  email: '',
  phone: '',
  position: '',
  cost_center: '',
  branch_id: '',
  contract_type: '1',
  worker_type: '01',
  worker_subtype: '00',
  high_risk_pension: false,
  employee_code: '',
  salary_type: 'ordinario',
  base_salary: 0,
  payroll_periodicity: 'mensual',
  transport_allowance_eligible: true,
  hire_date: '',
  termination_date: '',
  contract_end_date: '',
  payment_method: 'transfer',
  payment_form: '1',
  bank_name: '',
  account_type: '',
  account_number: '',
  country: 'Colombia',
  state: '',
  city: '',
  city_code: '',
  address: '',
  work_country: 'CO',
  work_state: '',
  work_city: '',
  work_city_code: '',
  work_address: '',
  is_active: true,
  notes: '',
};

const EmployeeModal = ({ employee, onClose }) => {
  const { createEmployee, updateEmployee, isLoading } = useEmployeesStore();
  const { branches, fetchBranches } = useBranchStore();

  const [formData, setFormData] = useState(emptyForm);
  // El lugar de trabajo es NIE050-053 en el Anexo pero, si se deja vacío,
  // payrollService.js usa la dirección del Empleador como fallback (ver
  // comentario en Employee.js) — la mayoría de PyMEs no tienen un lugar de
  // trabajo distinto a la sede del empleador, así que por defecto se oculta
  // esa sección y solo se muestra si el usuario marca que es distinta.
  const [workDiffersFromResidence, setWorkDiffersFromResidence] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (employee) {
      setFormData({
        document_type: employee.document_type || '13',
        document_number: employee.document_number || '',
        first_name: employee.first_name || '',
        other_names: employee.other_names || '',
        first_surname: employee.first_surname || '',
        second_surname: employee.second_surname || '',
        email: employee.email || '',
        phone: employee.phone || '',
        position: employee.position || '',
        cost_center: employee.cost_center || '',
        branch_id: employee.branch_id || '',
        contract_type: employee.contract_type || '1',
        worker_type: employee.worker_type || '01',
        worker_subtype: employee.worker_subtype || '00',
        high_risk_pension: !!employee.high_risk_pension,
        employee_code: employee.employee_code || '',
        salary_type: employee.salary_type || 'ordinario',
        base_salary: employee.base_salary || 0,
        payroll_periodicity: employee.payroll_periodicity || 'mensual',
        transport_allowance_eligible: employee.transport_allowance_eligible !== undefined
          ? employee.transport_allowance_eligible
          : true,
        hire_date: employee.hire_date || '',
        termination_date: employee.termination_date || '',
        contract_end_date: employee.contract_end_date || '',
        payment_method: employee.payment_method || 'transfer',
        payment_form: employee.payment_form || '1',
        bank_name: employee.bank_name || '',
        account_type: employee.account_type || '',
        account_number: employee.account_number || '',
        country: employee.country || 'Colombia',
        state: employee.state || '',
        city: employee.city || '',
        city_code: employee.city_code || '',
        address: employee.address || '',
        work_country: employee.work_country || 'CO',
        work_state: employee.work_state || '',
        work_city: employee.work_city || '',
        work_city_code: employee.work_city_code || '',
        work_address: employee.work_address || '',
        is_active: employee.is_active !== undefined ? employee.is_active : true,
        notes: employee.notes || '',
      });
      setWorkDiffersFromResidence(!!(employee.work_city_code || employee.work_address));
    } else {
      setFormData(emptyForm);
      setWorkDiffersFromResidence(false);
    }
    setErrors({});
  }, [employee]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.document_number.trim()) newErrors.document_number = 'El número de documento es requerido';
    if (!formData.first_name.trim()) newErrors.first_name = 'El primer nombre es requerido';
    if (!formData.first_surname.trim()) newErrors.first_surname = 'El primer apellido es requerido';
    if (!formData.hire_date) newErrors.hire_date = 'La fecha de ingreso es requerida';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const dataToSend = {
      ...formData,
      base_salary: parseFloat(formData.base_salary) || 0,
      branch_id: formData.branch_id || null,
      account_type: formData.account_type || null,
      termination_date: formData.termination_date || null,
      // Solo tiene sentido para término fijo — si el usuario cambió de
      // tipo de contrato después de haberla puesto, se limpia en vez de
      // dejar una fecha de fin "fantasma" en un contrato indefinido/otro.
      contract_end_date: formData.contract_type === '2' ? (formData.contract_end_date || null) : null,
      // Si el usuario no marcó que el lugar de trabajo es distinto a la
      // residencia, se envían vacíos para que el backend/XML use el
      // fallback de la dirección del Empleador.
      work_state: workDiffersFromResidence ? formData.work_state : '',
      work_city: workDiffersFromResidence ? formData.work_city : '',
      work_city_code: workDiffersFromResidence ? formData.work_city_code : '',
      work_address: workDiffersFromResidence ? formData.work_address : '',
    };

    const result = employee
      ? await updateEmployee(employee.id, dataToSend)
      : await createEmployee(dataToSend);

    if (result) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-graphite rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-graphite border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
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

        <form onSubmit={handleSubmit} className="p-6">
          {/* Identificación */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Identificación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de documento
                </label>
                <select
                  name="document_type"
                  value={formData.document_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DOCUMENT_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número de documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="document_number"
                  value={formData.document_number}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 ${
                    errors.document_number ? 'border-red-500' : 'border-gray-300 dark:border-white/10'
                  }`}
                  placeholder="Ej: 1017123456"
                />
                {errors.document_number && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.document_number}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Primer nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 ${
                    errors.first_name ? 'border-red-500' : 'border-gray-300 dark:border-white/10'
                  }`}
                />
                {errors.first_name && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.first_name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Otros nombres</label>
                <input
                  type="text"
                  name="other_names"
                  value={formData.other_names}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Primer apellido <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_surname"
                  value={formData.first_surname}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 ${
                    errors.first_surname ? 'border-red-500' : 'border-gray-300 dark:border-white/10'
                  }`}
                />
                {errors.first_surname && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.first_surname}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Segundo apellido</label>
                <input
                  type="text"
                  name="second_surname"
                  value={formData.second_surname}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 ${
                    errors.email ? 'border-red-500' : 'border-gray-300 dark:border-white/10'
                  }`}
                  placeholder="empleado@correo.com"
                />
                {errors.email && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Datos laborales */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Datos laborales</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cargo</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Centro de costo</label>
                <input
                  type="text"
                  name="cost_center"
                  value={formData.cost_center}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sede</label>
                <select
                  name="branch_id"
                  value={formData.branch_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin sede específica</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de contrato</label>
                <select
                  name="contract_type"
                  value={formData.contract_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CONTRACT_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {formData.contract_type === '2' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha fin de contrato
                    <span className="block text-xs font-normal text-gray-400">Para alertas de vencimiento</span>
                  </label>
                  <input
                    type="date"
                    name="contract_end_date"
                    value={formData.contract_end_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de trabajador (DIAN)</label>
                <select
                  name="worker_type"
                  value={formData.worker_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {WORKER_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subtipo de trabajador
                  <span className="block text-xs font-normal text-gray-400">Código DIAN (tabla 5.5.4)</span>
                </label>
                <input
                  type="text"
                  name="worker_subtype"
                  value={formData.worker_subtype}
                  onChange={handleChange}
                  maxLength={5}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de salario</label>
                <select
                  name="salary_type"
                  value={formData.salary_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {SALARY_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salario base</label>
                <NumericInput
                  name="base_salary"
                  value={formData.base_salary}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Periodicidad de pago
                  <span className="block text-xs font-normal text-gray-400">Con qué periodo se le liquida</span>
                </label>
                <select
                  name="payroll_periodicity"
                  value={formData.payroll_periodicity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PERIOD_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código interno</label>
                <input
                  type="text"
                  name="employee_code"
                  value={formData.employee_code}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha de ingreso <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="hire_date"
                  value={formData.hire_date}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-graphite-2 dark:text-gray-100 ${
                    errors.hire_date ? 'border-red-500' : 'border-gray-300 dark:border-white/10'
                  }`}
                />
                {errors.hire_date && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.hire_date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de retiro</label>
                <input
                  type="date"
                  name="termination_date"
                  value={formData.termination_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="transport_allowance_eligible"
                  checked={formData.transport_allowance_eligible}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Elegible para auxilio de transporte</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="high_risk_pension"
                  checked={formData.high_risk_pension}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Alto riesgo de pensión
                  <span className="block text-xs text-gray-400">Actividades del Decreto 2090 de 2003</span>
                </span>
              </label>
            </div>
          </div>

          {/* Pago */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Pago</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de pago</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PAYMENT_METHODS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Forma de pago</label>
                <select
                  name="payment_form"
                  value={formData.payment_form}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PAYMENT_FORMS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.payment_method === 'transfer' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Banco</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de cuenta</label>
                  <select
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sin especificar</option>
                    {ACCOUNT_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número de cuenta</label>
                  <input
                    type="text"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Residencia */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Residencia</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">País</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <DivipolaCitySelect
              departmentCode={formData.city_code ? formData.city_code.substring(0, 2) : ''}
              cityCode={formData.city_code}
              onChange={({ cityCode, cityName, departmentName }) => {
                setFormData((prev) => ({
                  ...prev,
                  city_code: cityCode,
                  city: cityName || prev.city,
                  state: departmentName || prev.state,
                }));
              }}
            />
          </div>

          {/* Lugar de trabajo */}
          <div className="mb-6">
            <label className="flex items-start bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg p-3">
              <input
                type="checkbox"
                checked={workDiffersFromResidence}
                onChange={(e) => setWorkDiffersFromResidence(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 mt-0.5"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                El lugar de trabajo es distinto a la residencia
                <span className="block text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                  Si no se marca, el Documento Soporte de Nómina usa la dirección del empleador como
                  lugar de trabajo por defecto.
                </span>
              </span>
            </label>

            {workDiffersFromResidence && (
              <div className="mt-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección de trabajo</label>
                  <input
                    type="text"
                    name="work_address"
                    value={formData.work_address}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <DivipolaCitySelect
                  departmentCode={formData.work_city_code ? formData.work_city_code.substring(0, 2) : ''}
                  cityCode={formData.work_city_code}
                  onChange={({ cityCode, cityName, departmentName }) => {
                    setFormData((prev) => ({
                      ...prev,
                      work_city_code: cityCode,
                      work_city: cityName || prev.work_city,
                      work_state: departmentName || prev.work_state,
                    }));
                  }}
                />
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 dark:bg-graphite-2 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notas adicionales sobre el empleado"
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
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Empleado activo</span>
            </label>
          </div>

          {/* Buttons */}
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
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {employee ? 'Actualizar' : 'Crear'} Empleado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;